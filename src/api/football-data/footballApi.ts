import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { config } from '@/config';
import {
  FootballDataResponse,
  FootballDataMatch,
  TeamMatchesResponse,
} from './types';
import { StandingsResponse } from '@/types/standings.types';
import { createLogger } from '@/utils/logger';

const log = createLogger('football-api');

/** Network error codes that are safe to retry */
const RETRYABLE_NETWORK_CODES = new Set([
  'ENOTFOUND',
  'ECONNRESET',
  'ETIMEDOUT',
  'ECONNREFUSED',
  'ECONNABORTED',
  'ERR_NETWORK',
]);

/** HTTP status codes that are safe to retry */
const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 2000;

interface RetryConfig extends InternalAxiosRequestConfig {
  __retryCount?: number;
}

export class FootballDataClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: config.footballApi.baseUrl,
      headers: {
        'X-Auth-Token': config.footballApi.apiKey,
      },
      timeout: 10000,
    });

    this.client.interceptors.request.use((cfg) => {
      log.debug({ method: cfg.method?.toUpperCase(), url: cfg.url }, 'API request');
      return cfg;
    });

    this.client.interceptors.response.use(
      (response) => {
        log.debug(
          { status: response.status, url: response.config.url },
          'API response'
        );
        return response;
      },
      async (error: AxiosError) => {
        const cfg = error.config as RetryConfig | undefined;
        if (!cfg) throw error;

        const retryCount = cfg.__retryCount || 0;
        const isRetryable =
          RETRYABLE_NETWORK_CODES.has(error.code || '') ||
          RETRYABLE_STATUS_CODES.has(error.response?.status || 0);

        if (isRetryable && retryCount < MAX_RETRIES) {
          cfg.__retryCount = retryCount + 1;

          // Use Retry-After header for 429, otherwise exponential backoff
          let delay = BASE_DELAY_MS * Math.pow(2, retryCount);
          if (error.response?.status === 429) {
            const retryAfter = error.response.headers['retry-after'];
            if (retryAfter) {
              delay = parseInt(retryAfter, 10) * 1000 || delay;
            }
          }

          log.warn(
            { attempt: cfg.__retryCount, maxRetries: MAX_RETRIES, url: cfg.url, error: error.message, delayMs: delay },
            'API retry'
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          return this.client.request(cfg);
        }

        log.error(
          { url: cfg.url, message: error.message, status: error.response?.status, data: error.response?.data },
          'API error'
        );
        throw error;
      }
    );
  }

  async getUpcomingMatches(
    competitionCode: string,
    dateFrom?: string,
    dateTo?: string
  ): Promise<FootballDataResponse> {
    const today = new Date().toISOString().split('T')[0];
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    const response = await this.client.get<FootballDataResponse>(
      `/competitions/${competitionCode}/matches`,
      {
        params: {
          status: 'SCHEDULED',
          dateFrom: dateFrom || today,
          dateTo: dateTo || nextWeek,
        },
      }
    );

    return response.data;
  }

  async getMatch(matchId: number): Promise<FootballDataMatch> {
    const response = await this.client.get<FootballDataMatch>(
      `/matches/${matchId}`
    );
    return response.data;
  }

  async getTeamMatches(
    teamId: number,
    limit: number = 10,
    competitionId?: number
  ): Promise<TeamMatchesResponse> {
    const params: Record<string, string | number> = {
      status: 'FINISHED',
      limit: limit,
    };
    if (competitionId) {
      params.competitions = competitionId;
    }

    const response = await this.client.get<TeamMatchesResponse>(
      `/teams/${teamId}/matches`,
      { params }
    );

    return response.data;
  }

  async getCompetitions() {
    const response = await this.client.get('/competitions');
    return response.data;
  }

  async getHeadToHead(
    matchId: number,
    limit: number = 10
  ): Promise<{
    matches: FootballDataMatch[];
  }> {
    const endpoint = `/matches/${matchId}/head2head`;
    const params = new URLSearchParams({
      limit: limit.toString(),
    });

    const response = await this.client.get(`${endpoint}?${params}`);
    return response.data;
  }

  async getStandings(
    competitionCode: string,
    season?: number
  ): Promise<StandingsResponse> {
    const endpoint = `/competitions/${competitionCode}/standings`;
    const params = new URLSearchParams();

    if (season) {
      params.append('season', season.toString());
    }

    const response = await this.client.get(
      `${endpoint}${params.toString() ? '?' + params : ''}`
    );
    return response.data;
  }
}
