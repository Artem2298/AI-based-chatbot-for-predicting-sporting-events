import { FootballDataMatch } from '@/api/football-data/types';

export interface Match {
  id: number;
  homeTeam: string;
  homeTeamId: number;
  awayTeam: string;
  awayTeamId: number;
  date: Date;
  status: string;
  competition: string;
  competitionCode: string;
}

export interface MatchWithScore extends Match {
  score: {
    home: number | null;
    away: number | null;
  };
  homeTeamId: number;
  awayTeamId: number;
}

export function mapToMatch(apiMatch: FootballDataMatch): Match {
  return {
    id: apiMatch.id,
    homeTeam: apiMatch.homeTeam.name,
    homeTeamId: apiMatch.homeTeam.id,
    awayTeam: apiMatch.awayTeam.name,
    awayTeamId: apiMatch.awayTeam.id,
    date: new Date(apiMatch.utcDate),
    status: apiMatch.status,
    competition: apiMatch.competition.name,
    competitionCode: apiMatch.competition.code,
  };
}
