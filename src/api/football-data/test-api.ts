// src/api/football-data/test-api.ts
import { FootballDataClient } from './footballApi';
import { COMPETITION_CODES } from './constants';
import axios from 'axios';

async function testFootballDataAPI() {
  console.log('🧪 Testing Football-Data API...\n');

  const client = new FootballDataClient();

  try {
    // Тест 1: Получить предстоящие матчи АПЛ
    console.log('📋 Test 1: Getting upcoming Premier League matches...');
    const plMatches = await client.getUpcomingMatches(
      COMPETITION_CODES.PREMIER_LEAGUE
    );

    console.log(`   ✅ Found ${plMatches.resultSet.count} matches`);
    console.log(`   Competition: ${plMatches.competition.name}`);
    console.log(`   First match: ${plMatches.resultSet.first}`);
    console.log(`   Last match: ${plMatches.resultSet.last}\n`);

    // Показываем первые 3 матча
    if (plMatches.matches.length > 0) {
      console.log('   📅 Next 3 matches:');
      plMatches.matches.slice(0, 3).forEach((match, index) => {
        const date = new Date(match.utcDate).toLocaleDateString('ru-RU', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
        console.log(
          `   ${index + 1}. ${match.homeTeam.name} vs ${match.awayTeam.name}`
        );
        console.log(`      Date: ${date}`);
        console.log(`      Match ID: ${match.id}\n`);
      });
    }

    // Тест 2: Получить информацию о первом матче
    if (plMatches.matches.length > 0) {
      const firstMatch = plMatches.matches[0];
      console.log(`📋 Test 2: Getting details for match ${firstMatch.id}...`);

      const matchDetails = await client.getMatch(firstMatch.id);
      console.log(`   ✅ Match details received`);
      console.log(`   Home: ${matchDetails.homeTeam.name}`);
      console.log(`   Away: ${matchDetails.awayTeam.name}`);
      console.log(`   Status: ${matchDetails.status}\n`);

      // Тест 3: Получить последние матчи домашней команды
      console.log(
        `📋 Test 3: Getting last matches for ${matchDetails.homeTeam.name}...`
      );
      const teamMatches = await client.getTeamMatches(
        matchDetails.homeTeam.id,
        5
      );
      console.log(
        `   ✅ Found ${teamMatches.resultSet.count} finished matches`
      );
      console.log(`   Last 5 matches:`);

      teamMatches.matches.slice(0, 5).forEach((match, index) => {
        const isHome = match.homeTeam.id === matchDetails.homeTeam.id;
        const opponent = isHome ? match.awayTeam.name : match.homeTeam.name;
        const score = `${match.score.fullTime.home}-${match.score.fullTime.away}`;
        const result = match.score.winner
          ? match.score.winner === (isHome ? 'HOME_TEAM' : 'AWAY_TEAM')
            ? 'W'
            : 'L'
          : 'D';

        console.log(`   ${index + 1}. vs ${opponent} - ${score} (${result})`);
      });
    }

    // Тест 4: Проверить все доступные лиги
    console.log('\n📋 Test 4: Checking available competitions...');
    const competitions = await client.getCompetitions();
    console.log(`   ✅ Total competitions available: ${competitions.count}`);

    console.log('\n✅ All tests passed! API is working correctly! 🎉');
  } catch (error) {
    console.error('\n❌ API Test failed:', error);

    if (axios.isAxiosError(error)) {
      if (error.response?.status === 403) {
        console.error(
          '\n⚠️  Authentication failed. Please check your API key in .env file'
        );
      } else if (error.response?.status === 429) {
        console.error('\n⚠️  Rate limit exceeded. Try again later.');
      }
    }
  }
}

// Запускаем тесты
testFootballDataAPI();
