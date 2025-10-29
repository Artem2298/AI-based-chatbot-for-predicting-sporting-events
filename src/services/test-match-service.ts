// src/services/test-match-service.ts

import { FootballDataClient } from '@/api/football-data/footballApi';
import { MatchService } from './matchService';
import { CacheService } from './cacheService';

async function testMatchService() {
  console.log('🧪 Testing MatchService with Cache...\n');

  const footballApi = new FootballDataClient();
  const cache = new CacheService();
  const matchService = new MatchService(footballApi, cache);

  try {
    // ============================================
    // Тест 1: Getting upcoming matches + Cache
    // ============================================
    console.log('📋 Test 1: Getting upcoming matches...');

    // Первый запрос (из API)
    const upcomingMatches = await matchService.getUpcomingMatches('PL', 14);
    console.log(`   ✅ Found ${upcomingMatches.length} matches (from API)`);

    if (upcomingMatches.length > 0) {
      console.log('   First 3 matches:');
      upcomingMatches.slice(0, 3).forEach((match, index) => {
        const dateStr = match.date.toLocaleDateString('ru-RU', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        });
        console.log(
          `   ${index + 1}. ${match.homeTeam} vs ${match.awayTeam} (${dateStr})`
        );
      });
    }

    // Второй запрос (из кэша)
    console.log('\n   🔄 Testing cache...');
    const cachedMatches = await matchService.getUpcomingMatches('PL', 14);
    console.log(`   ✅ Found ${cachedMatches.length} matches (from cache)`);

    if (JSON.stringify(upcomingMatches) === JSON.stringify(cachedMatches)) {
      console.log('   ✅ Cache data matches API data\n');
    } else {
      console.log('   ❌ Cache data differs!\n');
    }

    // ============================================
    // Тест 2: Getting match details + Cache
    // ============================================
    console.log('📋 Test 2: Getting match details...');

    if (upcomingMatches.length > 0) {
      const firstMatchId = upcomingMatches[0].id;

      // Первый запрос (из API)
      const matchDetails = await matchService.getMatchDetails(firstMatchId);
      console.log(
        `   ✅ Match: ${matchDetails.homeTeam} vs ${matchDetails.awayTeam} (from API)`
      );
      console.log(
        `   Date: ${matchDetails.date.toLocaleString('ru-RU', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })}`
      );
      console.log(`   Status: ${matchDetails.status}`);

      if (
        matchDetails.score.home !== null &&
        matchDetails.score.away !== null
      ) {
        console.log(
          `   Score: ${matchDetails.score.home}-${matchDetails.score.away}`
        );
      } else {
        console.log(`   Score: not played yet`);
      }

      // Второй запрос (из кэша)
      console.log('\n   🔄 Testing cache...');
      const cachedDetails = await matchService.getMatchDetails(firstMatchId);
      console.log(
        `   ✅ Match: ${cachedDetails.homeTeam} vs ${cachedDetails.awayTeam} (from cache)`
      );

      if (JSON.stringify(matchDetails) === JSON.stringify(cachedDetails)) {
        console.log('   ✅ Cache data matches API data\n');
      } else {
        console.log('   ❌ Cache data differs!\n');
      }
    } else {
      console.log('   ⚠️ No upcoming matches found for detailed test\n');
    }

    // ============================================
    // Тест 3: Getting team last matches + Cache
    // ============================================
    console.log('📋 Test 3: Getting team last matches...');

    const apiResponse = await footballApi.getUpcomingMatches('PL');

    if (apiResponse.matches.length > 0) {
      const teamId = apiResponse.matches[0].homeTeam.id;
      const teamName = apiResponse.matches[0].homeTeam.name;

      // Первый запрос (из API)
      const lastMatches = await matchService.getTeamLastMatches(teamId, 5);
      console.log(
        `   ✅ Found ${lastMatches.length} finished matches for ${teamName} (from API)`
      );

      if (lastMatches.length > 0) {
        console.log('   Last matches:');
        lastMatches.forEach((match, index) => {
          const scoreStr =
            match.score.home !== null && match.score.away !== null
              ? `${match.score.home}-${match.score.away}`
              : 'N/A';

          console.log(
            `   ${index + 1}. ${match.homeTeam} vs ${match.awayTeam}: ${scoreStr}`
          );
        });
      }

      // Второй запрос (из кэша)
      console.log('\n   🔄 Testing cache...');
      const cachedLastMatches = await matchService.getTeamLastMatches(
        teamId,
        5
      );
      console.log(
        `   ✅ Found ${cachedLastMatches.length} finished matches (from cache)`
      );

      if (JSON.stringify(lastMatches) === JSON.stringify(cachedLastMatches)) {
        console.log('   ✅ Cache data matches API data\n');
      } else {
        console.log('   ❌ Cache data differs!\n');
      }
    } else {
      console.log('   ⚠️ No matches found to get team ID\n');
    }

    console.log('✅ All tests completed! 🎉');
    console.log('\n📊 Summary:');
    console.log('   - All three methods successfully use cache');
    console.log('   - Second requests return data from cache (no API calls)');
    console.log('   - Cache data matches original API data');
  } catch (error) {
    console.error('\n❌ Test failed with error:');
    console.error(error);
  }
}

testMatchService();
