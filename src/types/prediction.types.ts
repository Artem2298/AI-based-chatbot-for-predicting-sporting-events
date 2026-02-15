export interface DetailedMatchStats {
  result: 'W' | 'D' | 'L';
  goalsScored: number;
  goalsConceded: number;
  opponent: string;
  wasHome: boolean;
  
  corners?: number;
  yellowCards?: number;
  redCards?: number;
  offsides?: number;
  shotsOnTarget?: number;
  shotsOffTarget?: number;
  possession?: number;
}

export type PredictionType = 'outcome' | 'corners' | 'cards' | 'offsides' | 'total' | 'btts';

export interface BasePrediction {
  type: PredictionType;
  confidence: number;
  reasoning: string;
}

export interface MatchOutcomePrediction extends BasePrediction {
  type: 'outcome';
  homeWin: number;
  draw: number;
  awayWin: number;
  recommendation: '1' | 'X' | '2';
}

export interface CornersPrediction extends BasePrediction {
  type: 'corners';
  totalOver9_5: number;
  totalUnder9_5: number;
  homeTeamOver5_5: number;
  awayTeamOver4_5: number;
  expectedTotal: number;
  expectedHome: number;
  expectedAway: number;
  recommendation: string;
}

export interface CardsPrediction extends BasePrediction {
  type: 'cards';
  totalOver3_5: number;
  totalUnder3_5: number;
  homeTeamOver1_5: number;
  awayTeamOver1_5: number;
  expectedYellow: number;
  expectedRed: number;
  expectedTotal: number;
  recommendation: string;
}

export interface OffsidesPrediction extends BasePrediction {
  type: 'offsides';
  totalOver3_5: number;
  totalUnder3_5: number;
  homeTeamOver1_5: number;
  awayTeamOver1_5: number;
  expectedTotal: number;
  expectedHome: number;
  expectedAway: number;
  recommendation: string;
}

export interface TotalGoalsPrediction extends BasePrediction {
  type: 'total';
  totalOver2_5: number;
  totalUnder2_5: number;
  expectedTotalGoals: number;
  expectedHomeGoals: number;
  expectedAwayGoals: number;
  recommendation: string;
}

export interface BttsPrediction extends BasePrediction {
  type: 'btts';
  bothTeamsToScoreYes: number;
  bothTeamsToScoreNo: number;
  expectedHomeGoals: number;
  expectedAwayGoals: number;
  recommendation: string;
}

export type Prediction =
  | MatchOutcomePrediction
  | CornersPrediction
  | CardsPrediction
  | OffsidesPrediction
  | TotalGoalsPrediction
  | BttsPrediction;

export interface PredictionData {
  matchId: number;
  homeTeam: {
    name: string;
    lastMatches: DetailedMatchStats[];
    position?: number;
    points?: number;
  };
  awayTeam: {
    name: string;
    lastMatches: DetailedMatchStats[];
    position?: number;
    points?: number;
  };
}