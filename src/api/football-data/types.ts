export interface TeamStatistics {
  corner_kicks?: number;
  free_kicks?: number;
  goal_kicks?: number;
  offsides?: number;
  fouls?: number;
  ball_possession?: number;
  saves?: number;
  throw_ins?: number;
  shots?: number;
  shots_on_goal?: number;
  shots_off_goal?: number;
  yellow_cards?: number;
  yellow_red_cards?: number;
  red_cards?: number;
}

export interface Player {
  id: number;
  name: string;
  position: string;
  shirtNumber: number;
}

export interface Coach {
  id: number;
  name: string;
  nationality: string;
}

export interface ExtendedTeam {
  id: number;
  name: string;
  shortName: string;
  tla: string;
  crest: string;
  coach?: Coach;
  leagueRank?: number | null;
  formation?: string | null;
  lineup?: Player[];
  bench?: Player[];
  statistics?: TeamStatistics;
}

export interface FootballDataResponse {
  filters: {
    season: string;
    status: string[];
  };
  resultSet: {
    count: number;
    first: string;
    last: string;
    played: number;
  };
  competition: {
    id: number;
    name: string;
    code: string;
    type: string;
    emblem: string;
  };
  matches: FootballDataMatch[];
}

export interface FootballDataMatch {
  area: {
    id: number;
    name: string;
    code: string;
    flag: string;
  };
  competition: {
    id: number;
    name: string;
    code: string;
    type: string;
    emblem: string;
  };
  season: {
    id: number;
    startDate: string;
    endDate: string;
    currentMatchday: number;
    winner: null;
  };
  id: number;
  utcDate: string;
  status: string;
  matchday: number;
  stage: string;
  group: null | string;
  lastUpdated: string;

  homeTeam: ExtendedTeam;
  awayTeam: ExtendedTeam;

  score: {
    winner: null | string;
    duration: string;
    fullTime: {
      home: number | null;
      away: number | null;
    };
    halfTime: {
      home: number | null;
      away: number | null;
    };
  };
  odds: {
    msg: string;
  };
  referees: Referee[];
}

export interface Referee {
  id: number;
  name: string;
  type: string;
  nationality: string;
}

export interface TeamMatchesResponse {
  filters: unknown;
  resultSet: {
    count: number;
    first: string;
    last: string;
    played: number;
  };
  matches: FootballDataMatch[];
}
