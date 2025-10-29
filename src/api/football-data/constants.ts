export const COMPETITION_CODES = {
  PREMIER_LEAGUE: 'PL',
  LA_LIGA: 'PD',
  BUNDESLIGA: 'BL1',
  SERIE_A: 'SA',
  LIGUE_1: 'FL1',
  CHAMPIONS_LEAGUE: 'CL',
  EREDIVISIE: 'DED',
} as const;

export const COMPETITION_NAMES: Record<string, string> = {
  PL: 'Premier League',
  PD: 'La Liga',
  BL1: 'Bundesliga',
  SA: 'Serie A',
  FL1: 'Ligue 1',
  CL: 'Champions League',
  DED: 'Eredivisie',
};

export enum MatchStatus {
  SCHEDULED = 'SCHEDULED',
  TIMED = 'TIMED',
  IN_PLAY = 'IN_PLAY',
  PAUSED = 'PAUSED',
  FINISHED = 'FINISHED',
  SUSPENDED = 'SUSPENDED',
  POSTPONED = 'POSTPONED',
  CANCELLED = 'CANCELLED',
  AWARDED = 'AWARDED',
}
