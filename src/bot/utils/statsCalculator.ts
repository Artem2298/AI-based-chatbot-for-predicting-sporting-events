import { MatchWithScore } from '@/types/match.types';

export interface TeamStats {
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  avgGoalsFor: string;
  avgGoalsAgainst: string;
  form: string; // "W-L-D-W-L"
}

export function calculateTeamStats(
  matches: MatchWithScore[],
  teamName: string
): TeamStats {
  let wins = 0;
  let draws = 0;
  let losses = 0;
  let goalsFor = 0;
  let goalsAgainst = 0;
  const formArray: string[] = [];

  matches.forEach((match) => {
    const isHome = match.homeTeam === teamName;
    const teamScore = isHome ? match.score.home! : match.score.away!;
    const opponentScore = isHome ? match.score.away! : match.score.home!;

    goalsFor += teamScore;
    goalsAgainst += opponentScore;

    if (teamScore > opponentScore) {
      wins++;
      formArray.push('W');
    } else if (teamScore < opponentScore) {
      losses++;
      formArray.push('L');
    } else {
      draws++;
      formArray.push('D');
    }
  });

  return {
    wins,
    draws,
    losses,
    goalsFor,
    goalsAgainst,
    avgGoalsFor: (goalsFor / matches.length).toFixed(1),
    avgGoalsAgainst: (goalsAgainst / matches.length).toFixed(1),
    form: formArray.join('-'),
  };
}

export function filterHomeMatches(
  matches: MatchWithScore[],
  teamName: string
): MatchWithScore[] {
  return matches.filter((match) => match.homeTeam === teamName);
}

export function filterAwayMatches(
  matches: MatchWithScore[],
  teamName: string
): MatchWithScore[] {
  return matches.filter((match) => match.awayTeam === teamName);
}
