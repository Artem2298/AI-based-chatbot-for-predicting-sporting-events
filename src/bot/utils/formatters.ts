import { Match, MatchWithScore } from '@/types/match.types';

// Форматировать дату
export function formatDate(date: Date): string {
  return date.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

// Форматировать время
export function formatTime(date: Date): string {
  return date.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Форматировать список матчей с датами
export function formatMatchesList(
  matches: Match[],
  startIndex: number = 0
): string {
  const matchesByDate = new Map<string, Array<Match & { index: number }>>();

  matches.forEach((match, idx) => {
    const dateKey = formatDate(match.date);

    if (!matchesByDate.has(dateKey)) {
      matchesByDate.set(dateKey, []);
    }

    matchesByDate.get(dateKey)!.push({
      ...match,
      index: startIndex + idx,
    });
  });

  let message = '';

  for (const [date, dayMatches] of matchesByDate) {
    message += `📅 **${date}**\n`;

    dayMatches.forEach((match) => {
      const time = formatTime(match.date);
      message += `${match.index + 1}. ${match.homeTeam} vs ${match.awayTeam} (${time})\n`;
    });

    message += '\n';
  }

  return message;
}

// Форматировать результат матча
export function formatMatchResult(match: MatchWithScore): string {
  const { homeTeam, awayTeam, score } = match;

  if (score.home === null || score.away === null) {
    return `${homeTeam} vs ${awayTeam}`;
  }

  return `${homeTeam} ${score.home}-${score.away} ${awayTeam}`;
}

// Эмодзи результата (победа/ничья/поражение)
export function getResultEmoji(
  match: MatchWithScore,
  teamName: string
): string {
  const isHome = match.homeTeam === teamName;
  const teamScore = isHome ? match.score.home! : match.score.away!;
  const opponentScore = isHome ? match.score.away! : match.score.home!;

  if (teamScore > opponentScore) return '✅';
  if (teamScore < opponentScore) return '❌';
  return '🟰';
}
