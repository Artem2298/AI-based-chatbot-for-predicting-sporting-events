import { DetailedMatchStats } from '@/types/prediction.types';
import { createLogger } from '@/utils/logger';

const log = createLogger('stats');

// export interface SimpleStats {
//   total: number;
//   average: number;
//   matches: number;
// }

// export interface CardsStats {
//   totalYellow: number;
//   totalRed: number;
//   totalCards: number;
//   avgYellow: number;
//   avgRed: number;
//   avgTotal: number;
//   matches: number;
// }

export class StatsCalculator {
  calculateGeneralStats(matches: DetailedMatchStats[]) {
    const wins = matches.filter((m) => m.result === 'W').length;
    const draws = matches.filter((m) => m.result === 'D').length;
    const losses = matches.filter((m) => m.result === 'L').length;

    const goalsFor = matches.reduce((sum, m) => sum + m.goalsScored, 0);
    const goalsAgainst = matches.reduce((sum, m) => sum + m.goalsConceded, 0);

    return {
      wins,
      draws,
      losses,
      goalsFor,
      goalsAgainst,
      goalDifference: goalsFor - goalsAgainst,
      avgGoalsFor: (goalsFor / matches.length).toFixed(2),
      avgGoalsAgainst: (goalsAgainst / matches.length).toFixed(2),
    };
  }

  // calculateSimpleStats(
  //   matches: DetailedMatchStats[],
  //   field: 'corners' | 'offsides' | 'yellowCards' | 'redCards'
  // ): SimpleStats | null {
  //   const matchesWithField = matches.filter((m) => m[field] !== undefined);

  //   if (matchesWithField.length === 0) {
  //     return null;
  //   }

  //   const total = matchesWithField.reduce(
  //     (sum, m) => sum + ((m[field] as number) || 0),
  //     0
  //   );

  //   return {
  //     total,
  //     average: parseFloat((total / matchesWithField.length).toFixed(2)),
  //     matches: matchesWithField.length,
  //   };
  // }

  // calculateCornersStats(matches: DetailedMatchStats[]): SimpleStats | null {
  //   return this.calculateSimpleStats(matches, 'corners');
  // }

  // calculateOffsidesStats(matches: DetailedMatchStats[]): SimpleStats | null {
  //   return this.calculateSimpleStats(matches, 'offsides');
  // }

  calculateGoalsStats(matches: DetailedMatchStats[]) {
    if (matches.length === 0) return null;

    const general = this.calculateGeneralStats(matches);
    const totalGoals = matches.map((m) => m.goalsScored + m.goalsConceded);
    const over2_5 = totalGoals.filter((g) => g > 2.5).length;
    const btts = matches.filter(
      (m) => m.goalsScored > 0 && m.goalsConceded > 0
    ).length;

    return {
      averageTotal: (
        totalGoals.reduce((a, b) => a + b, 0) / matches.length
      ).toFixed(2),
      over2_5_percentage: Math.round((over2_5 / matches.length) * 100),
      btts_percentage: Math.round((btts / matches.length) * 100),
      goalsScoredAvg: general.avgGoalsFor,
      goalsConcededAvg: general.avgGoalsAgainst,
      matches: matches.length,
      recentMatches: matches.map((m) => ({
        result: m.result,
        score: `${m.goalsScored}-${m.goalsConceded}`,
        total: m.goalsScored + m.goalsConceded,
        opponent: m.opponent,
      })),
    };
  }

  // calculateCardsStats(matches: DetailedMatchStats[]): CardsStats | null {
  //   const yellowStats = this.calculateSimpleStats(matches, 'yellowCards');
  //   const redStats = this.calculateSimpleStats(matches, 'redCards');

  //   if (!yellowStats || !redStats) {
  //     return null;
  //   }

  //   return {
  //     totalYellow: yellowStats.total,
  //     totalRed: redStats.total,
  //     totalCards: yellowStats.total + redStats.total,
  //     avgYellow: yellowStats.average,
  //     avgRed: redStats.average,
  //     avgTotal: parseFloat((yellowStats.average + redStats.average).toFixed(2)),
  //     matches: yellowStats.matches,
  //   };
  // }
}
