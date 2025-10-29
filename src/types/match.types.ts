import { MatchStatus } from '@/api/football-data/constants';
import { FootballDataMatch } from '@/api/football-data/types';

export interface Match {
  id: number;
  homeTeam: string;
  awayTeam: string;
  date: Date;
  status: MatchStatus;
}

export interface MatchWithScore extends Match {
  score: {
    home: number | null;
    away: number | null;
  };
}

export function mapToMatch(apiMatch: FootballDataMatch): Match {
  return {
    id: apiMatch.id,
    homeTeam: apiMatch.homeTeam.name,
    awayTeam: apiMatch.awayTeam.name,
    date: new Date(apiMatch.utcDate),
    status: apiMatch.status as MatchStatus,
  };
}
