import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { DbService, db } from '../../services/dbService';
import { MatchService } from '../../services/matchService';
import { PredictionService } from '../../services/predictionService';
import { GeminiClient } from '../../api/ai/geminiClient';
import { FootballDataClient } from '../../api/football-data/footballApi';
import { CacheService } from '../../services/cacheService';

describe('Database Integration & Prediction Cache', () => {
  let matchService: MatchService;
  let predictionService: PredictionService;
  const testTelegramId = 888888888;
  const testMatchId = 538036; // Aston Villa vs Brighton
  let testUserId: number;

  beforeAll(async () => {
    await DbService.connect();
    const footballApi = new FootballDataClient();
    const cache = new CacheService();
    const geminiApi = new GeminiClient();
    matchService = new MatchService(footballApi, cache);
    predictionService = new PredictionService(matchService, geminiApi);

    // Ensure test user exists
    const user = await db.user.upsert({
      where: { telegramId: BigInt(testTelegramId) },
      update: {},
      create: {
        telegramId: BigInt(testTelegramId),
        username: 'integration_test_user',
        locale: 'ru'
      }
    });
    testUserId = user.id;

    // Cleanup before tests
    await db.userPrediction.deleteMany({
      where: { prediction: { matchId: testMatchId } }
    });
    await db.prediction.deleteMany({ where: { matchId: testMatchId } });
  });

  afterAll(async () => {
    // Optional: cleanup after all tests
    await db.userPrediction.deleteMany({
      where: { prediction: { matchId: testMatchId } }
    });
    await db.prediction.deleteMany({ where: { matchId: testMatchId } });
    await DbService.disconnect();
  });

  it('should generate a fresh prediction and save to global cache', async () => {
    const prediction = await predictionService.generatePrediction(testMatchId, 'outcome', 'ru', testUserId);
    
    expect(prediction).toBeDefined();
    expect(prediction.type).toBe('outcome');
    
    const stored = await db.prediction.findUnique({
      where: {
        matchId_type_locale: {
          matchId: testMatchId,
          type: 'outcome',
          locale: 'ru'
        }
      }
    });
    expect(stored).not.toBeNull();
    expect(stored?.locale).toBe('ru');
  });

  it('should use cache (cache hit) for the same match/type/locale', async () => {
    const start = Date.now();
    const prediction = await predictionService.generatePrediction(testMatchId, 'outcome', 'ru', testUserId);
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(1000); // AI generation takes seconds, cache takes ms
    expect(prediction).toBeDefined();
  });

  it('should generate a separate prediction for a different locale', async () => {
    const predictionEn = await predictionService.generatePrediction(testMatchId, 'outcome', 'en', testUserId);
    
    expect(predictionEn).toBeDefined();
    
    const count = await db.prediction.count({
      where: { matchId: testMatchId, type: 'outcome' }
    });
    expect(count).toBe(2); // One for 'ru', one for 'en'
  });

  it('should track user views in UserPrediction table', async () => {
    const views = await db.userPrediction.count({
      where: { userId: testUserId }
    });
    // TEST 1 (RU) + TEST 2 (RU Cache) + TEST 3 (EN) = 3 views
    expect(views).toBe(3);
  });
});
