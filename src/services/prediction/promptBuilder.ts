import { PredictionData } from '@/types/prediction.types';
import { StatsCalculator } from './statsCalculator';
import { loadPrompt } from '@/utils/promptLoader';

const LANGUAGES: Record<string, string> = {
  ru: 'Russian',
  uk: 'Ukrainian',
  en: 'English',
  cs: 'Czech',
  sk: 'Slovak',
  pl: 'Polish',
};

export class PromptBuilder {
  constructor(private stats: StatsCalculator) {}

  getLanguageName(lang?: string): string {
    return LANGUAGES[lang || 'en'] || 'English';
  }

  private formatStandings(data: PredictionData): string {
    const lines: string[] = [];
    if (data.homeTeam.position != null) {
      lines.push(
        `${data.homeTeam.name}: #${data.homeTeam.position} (${data.homeTeam.points} pts)`
      );
    }
    if (data.awayTeam.position != null) {
      lines.push(
        `${data.awayTeam.name}: #${data.awayTeam.position} (${data.awayTeam.points} pts)`
      );
    }
    return lines.length > 0 ? lines.join('\n') : 'Not available';
  }

  async buildOutcomePredictionPrompt(
    data: PredictionData,
    lang?: string
  ): Promise<string> {
    const { homeTeam, awayTeam } = data;

    const homeStats = this.stats.calculateGeneralStats(homeTeam.lastMatches);
    const awayStats = this.stats.calculateGeneralStats(awayTeam.lastMatches);

    const analysisData = {
      match: {
        homeTeam: homeTeam.name,
        awayTeam: awayTeam.name,
        venue: 'home',
      },
      homeTeamStats: {
        name: homeTeam.name,
        recentForm: homeTeam.lastMatches.map((m) => m.result).join('-'),
        lastMatches: homeTeam.lastMatches,
        summary: {
          wins: homeStats.wins,
          draws: homeStats.draws,
          losses: homeStats.losses,
          goalsScored: homeStats.goalsFor,
          goalsConceded: homeStats.goalsAgainst,
          goalDifference: homeStats.goalDifference,
          avgGoalsScored: parseFloat(homeStats.avgGoalsFor),
          avgGoalsConceded: parseFloat(homeStats.avgGoalsAgainst),
        },
      },
      awayTeamStats: {
        name: awayTeam.name,
        recentForm: awayTeam.lastMatches.map((m) => m.result).join('-'),
        lastMatches: awayTeam.lastMatches,
        summary: {
          wins: awayStats.wins,
          draws: awayStats.draws,
          losses: awayStats.losses,
          goalsScored: awayStats.goalsFor,
          goalsConceded: awayStats.goalsAgainst,
          goalDifference: awayStats.goalDifference,
          avgGoalsScored: parseFloat(awayStats.avgGoalsFor),
          avgGoalsConceded: parseFloat(awayStats.avgGoalsAgainst),
        },
      },
    };

    return await loadPrompt('outcome', {
      MATCH_DATA: JSON.stringify(analysisData, null, 2),
      HOME_TEAM: homeTeam.name,
      STANDINGS: this.formatStandings(data),
      LANGUAGE: this.getLanguageName(lang),
    });
  }

  async buildTotalPredictionPrompt(
    data: PredictionData,
    lang?: string
  ): Promise<string> {
    const { homeTeam, awayTeam } = data;
    const homeStats = this.stats.calculateGoalsStats(homeTeam.lastMatches);
    const awayStats = this.stats.calculateGoalsStats(awayTeam.lastMatches);

    const analysisData = {
      match: {
        homeTeam: homeTeam.name,
        awayTeam: awayTeam.name,
        venue: 'home',
      },
      homeTeamGoals: {
        name: homeTeam.name,
        stats: homeStats,
      },
      awayTeamGoals: {
        name: awayTeam.name,
        stats: awayStats,
      },
    };

    return await loadPrompt('total', {
      MATCH_DATA: JSON.stringify(analysisData, null, 2),
      HOME_TEAM: homeTeam.name,
      AWAY_TEAM: awayTeam.name,
      STANDINGS: this.formatStandings(data),
      LANGUAGE: this.getLanguageName(lang),
    });
  }

  async buildBttsPredictionPrompt(
    data: PredictionData,
    lang?: string
  ): Promise<string> {
    const { homeTeam, awayTeam } = data;
    const homeStats = this.stats.calculateGoalsStats(homeTeam.lastMatches);
    const awayStats = this.stats.calculateGoalsStats(awayTeam.lastMatches);

    const analysisData = {
      match: {
        homeTeam: homeTeam.name,
        awayTeam: awayTeam.name,
        venue: 'home',
      },
      homeTeamGoals: {
        name: homeTeam.name,
        stats: homeStats,
      },
      awayTeamGoals: {
        name: awayTeam.name,
        stats: awayStats,
      },
    };

    return await loadPrompt('btts', {
      MATCH_DATA: JSON.stringify(analysisData, null, 2),
      HOME_TEAM: homeTeam.name,
      AWAY_TEAM: awayTeam.name,
      STANDINGS: this.formatStandings(data),
      LANGUAGE: this.getLanguageName(lang),
    });
  }
}
