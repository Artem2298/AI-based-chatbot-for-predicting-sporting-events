import { DetailedMatchStats } from '@/types/prediction.types';
import { createLogger } from '@/utils/logger';

const log = createLogger('stats');

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
}
