import { MatchStatus } from '@/api/football-data/constants';
import { FootballDataMatch } from '@/api/football-data/types';

export interface Match {
  id: number;
  homeTeam: string;
  homeTeamId: number; // ← Добавь
  awayTeam: string;
  awayTeamId: number; // ← Добавь
  date: Date;
  status: string;
  competition: string;
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
    homeTeamId: apiMatch.homeTeam.id, // ← Добавь
    awayTeam: apiMatch.awayTeam.name,
    awayTeamId: apiMatch.awayTeam.id, // ← Добавь
    date: new Date(apiMatch.utcDate),
    status: apiMatch.status,
    competition: apiMatch.competition.name,
  };
}
