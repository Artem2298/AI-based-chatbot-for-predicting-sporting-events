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
    winner: null | any;
  };
  id: number;
  utcDate: string;
  status: string;
  matchday: number;
  stage: string;
  group: null | string;
  lastUpdated: string;
  homeTeam: {
    id: number;
    name: string;
    shortName: string;
    tla: string;
    crest: string;
  };
  awayTeam: {
    id: number;
    name: string;
    shortName: string;
    tla: string;
    crest: string;
  };
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
  referees: any[];
}

// ========================================
// Team Statistics Response
// ========================================

export interface TeamMatchesResponse {
  filters: any;
  resultSet: {
    count: number;
    first: string;
    last: string;
    played: number;
  };
  matches: FootballDataMatch[];
}
