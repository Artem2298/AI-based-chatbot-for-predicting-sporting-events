import { PredictionData } from '@/types/prediction.types';
import { StatsCalculator /*SimpleStats, CardsStats*/ } from './statsCalculator';
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

  // async buildCornersPredictionPrompt(
  //   data: PredictionData,
  //   homeCorners: SimpleStats,
  //   awayCorners: SimpleStats,
  //   lang?: string
  // ): Promise<string> {
  //   const { homeTeam, awayTeam } = data;

  //   const analysisData = {
  //     match: {
  //       homeTeam: homeTeam.name,
  //       awayTeam: awayTeam.name,
  //       venue: 'home',
  //     },
  //     homeTeamCorners: {
  //       name: homeTeam.name,
  //       lastMatches: homeTeam.lastMatches.map((m) => ({
  //         opponent: m.opponent,
  //         wasHome: m.wasHome,
  //         corners: m.corners,
  //         result: m.result,
  //       })),
  //       statistics: {
  //         totalCorners: homeCorners.total,
  //         averageCorners: homeCorners.average,
  //         matchesAnalyzed: homeCorners.matches,
  //       },
  //     },
  //     awayTeamCorners: {
  //       name: awayTeam.name,
  //       lastMatches: awayTeam.lastMatches.map((m) => ({
  //         opponent: m.opponent,
  //         wasHome: m.wasHome,
  //         corners: m.corners,
  //         result: m.result,
  //       })),
  //       statistics: {
  //         totalCorners: awayCorners.total,
  //         averageCorners: awayCorners.average,
  //         matchesAnalyzed: awayCorners.matches,
  //       },
  //     },
  //   };

  //   return await loadPrompt('corners', {
  //     MATCH_DATA: JSON.stringify(analysisData, null, 2),
  //     STANDINGS: this.formatStandings(data),
  //     LANGUAGE: this.getLanguageName(lang),
  //   });
  // }

  // async buildCardsPredictionPrompt(
  //   data: PredictionData,
  //   homeCards: CardsStats,
  //   awayCards: CardsStats,
  //   lang?: string
  // ): Promise<string> {
  //   const { homeTeam, awayTeam } = data;

  //   const analysisData = {
  //     match: {
  //       homeTeam: homeTeam.name,
  //       awayTeam: awayTeam.name,
  //       venue: 'home',
  //     },
  //     homeTeamCards: {
  //       name: homeTeam.name,
  //       lastMatches: homeTeam.lastMatches.map((m) => ({
  //         opponent: m.opponent,
  //         wasHome: m.wasHome,
  //         yellowCards: m.yellowCards,
  //         redCards: m.redCards,
  //         result: m.result,
  //       })),
  //       statistics: {
  //         totalYellow: homeCards.totalYellow,
  //         totalRed: homeCards.totalRed,
  //         totalCards: homeCards.totalCards,
  //         avgYellow: homeCards.avgYellow,
  //         avgRed: homeCards.avgRed,
  //         avgTotal: homeCards.avgTotal,
  //         matchesAnalyzed: homeCards.matches,
  //       },
  //     },
  //     awayTeamCards: {
  //       name: awayTeam.name,
  //       lastMatches: awayTeam.lastMatches.map((m) => ({
  //         opponent: m.opponent,
  //         wasHome: m.wasHome,
  //         yellowCards: m.yellowCards,
  //         redCards: m.redCards,
  //         result: m.result,
  //       })),
  //       statistics: {
  //         totalYellow: awayCards.totalYellow,
  //         totalRed: awayCards.totalRed,
  //         totalCards: awayCards.totalCards,
  //         avgYellow: awayCards.avgYellow,
  //         avgRed: awayCards.avgRed,
  //         avgTotal: awayCards.avgTotal,
  //         matchesAnalyzed: awayCards.matches,
  //       },
  //     },
  //   };

  //   return await loadPrompt('cards', {
  //     MATCH_DATA: JSON.stringify(analysisData, null, 2),
  //     STANDINGS: this.formatStandings(data),
  //     LANGUAGE: this.getLanguageName(lang),
  //   });
  // }

  // async buildOffsidesPredictionPrompt(
  //   data: PredictionData,
  //   homeOffsides: SimpleStats,
  //   awayOffsides: SimpleStats,
  //   lang?: string
  // ): Promise<string> {
  //   const { homeTeam, awayTeam } = data;

  //   const analysisData = {
  //     match: {
  //       homeTeam: homeTeam.name,
  //       awayTeam: awayTeam.name,
  //       venue: 'home',
  //     },
  //     homeTeamOffsides: {
  //       name: homeTeam.name,
  //       lastMatches: homeTeam.lastMatches.map((m) => ({
  //         opponent: m.opponent,
  //         wasHome: m.wasHome,
  //         offsides: m.offsides,
  //         result: m.result,
  //       })),
  //       statistics: {
  //         totalOffsides: homeOffsides.total,
  //         averageOffsides: homeOffsides.average,
  //         matchesAnalyzed: homeOffsides.matches,
  //       },
  //     },
  //     awayTeamOffsides: {
  //       name: awayTeam.name,
  //       lastMatches: awayTeam.lastMatches.map((m) => ({
  //         opponent: m.opponent,
  //         wasHome: m.wasHome,
  //         offsides: m.offsides,
  //         result: m.result,
  //       })),
  //       statistics: {
  //         totalOffsides: awayOffsides.total,
  //         averageOffsides: awayOffsides.average,
  //         matchesAnalyzed: awayOffsides.matches,
  //       },
  //     },
  //   };

  //   return await loadPrompt('offsides', {
  //     MATCH_DATA: JSON.stringify(analysisData, null, 2),
  //     STANDINGS: this.formatStandings(data),
  //     LANGUAGE: this.getLanguageName(lang),
  //   });
  // }

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
