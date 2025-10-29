import axios, { AxiosInstance, AxiosError } from 'axios';
import { config } from '@/config';
import {
  FootballDataResponse,
  FootballDataMatch,
  TeamMatchesResponse,
} from './types';

export class FootballDataClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: config.footballApi.baseUrl,
      headers: {
        'X-Auth-Token': config.footballApi.apiKey,
      },
      timeout: 10000, // 10 секунд
    });

    // Логирование запросов (полезно для дебага)
    this.client.interceptors.request.use((config) => {
      console.log(
        `📡 API Request: ${config.method?.toUpperCase()} ${config.url}`
      );
      return config;
    });

    // Обработка ошибок
    this.client.interceptors.response.use(
      (response) => {
        console.log(
          `✅ API Response: ${response.status} ${response.config.url}`
        );
        return response;
      },
      (error: AxiosError) => {
        console.error(`❌ API Error: ${error.message}`);
        if (error.response) {
          console.error(`   Status: ${error.response.status}`);
          console.error(`   Data:`, error.response.data);
        }
        throw error;
      }
    );
  }

  /**
   * Получить предстоящие матчи лиги
   * @param competitionCode - Код лиги (PL, PD, BL1, etc.)
   * @param dateFrom - С какой даты (опционально)
   * @param dateTo - До какой даты (опционально)
   */
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

  /**
   * Получить информацию о конкретном матче
   * @param matchId - ID матча
   */
  async getMatch(matchId: number): Promise<FootballDataMatch> {
    const response = await this.client.get<FootballDataMatch>(
      `/matches/${matchId}`
    );
    return response.data;
  }

  /**
   * Получить последние матчи команды
   * @param teamId - ID команды
   * @param limit - Количество матчей (по умолчанию 10)
   */
  async getTeamMatches(
    teamId: number,
    limit: number = 10
  ): Promise<TeamMatchesResponse> {
    const response = await this.client.get<TeamMatchesResponse>(
      `/teams/${teamId}/matches`,
      {
        params: {
          status: 'FINISHED',
          limit: limit,
        },
      }
    );

    return response.data;
  }

  /**
   * Получить турнирную таблицу
   * @param competitionCode - Код лиги
   */
  async getStandings(competitionCode: string) {
    const response = await this.client.get(
      `/competitions/${competitionCode}/standings`
    );
    return response.data;
  }

  /**
   * Получить все доступные лиги
   */
  async getCompetitions() {
    const response = await this.client.get('/competitions');
    return response.data;
  }
}
