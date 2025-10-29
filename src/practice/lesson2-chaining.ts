// src/practice/lesson2-parallel.ts

import { match } from 'assert';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchUser(userId: number): Promise<string> {
  await delay(2000);
  return `User${userId}`;
}

async function fetchUserAge(userId: number): Promise<number> {
  await delay(1500);
  return userId * 10;
}

async function fetchUserCity(userId: number): Promise<string> {
  await delay(1000);
  return userId === 1 ? 'Prague' : 'Berlin';
}

// Функция 1: ПОСЛЕДОВАТЕЛЬНО (одно за другим)
async function getUserDataSequential(userId: number): Promise<{
  name: string;
  age: number;
  city: string;
}> {
  console.time('time2');
  const name = await fetchUser(userId);
  const age = await fetchUserAge(userId);
  const city = await fetchUserCity(userId);
  console.timeEnd('time2');
  return { name, age, city };
}

// getUserDataSequential(1).then((result) => {
//   console.log(result);
// });

async function getUserDataParallel(userId: number): Promise<{
  name: string;
  age: number;
  city: string;
}> {
  console.time('time');
  const [name, age, city] = await Promise.all([
    fetchUser(userId),
    fetchUserAge(userId),
    fetchUserCity(userId),
  ]);
  console.timeEnd('time');
  return { name, age, city };
}

// async function test() {
//   console.log('---Sequential---');
//   const seq = await getUserDataSequential(1);
//   console.log(seq);

//   console.log('---`Paralel`---');
//   const paral = await getUserDataParallel(2);
//   console.log(paral);
// }
// test();

// ============================================
// ЗАДАНИЕ 2.2: Получение данных нескольких пользователей
// ============================================
// Создай функцию которая получает данные о ТРЕХ пользователях ПАРАЛЛЕЛЬНО

async function getMultipleUsers(userIds: number[]): Promise<string[]> {
  const promiseArr = userIds.map((id) => fetchUser(id));
  return await Promise.all(promiseArr);
}

// Тест
// async function test2_2() {
//   const names = await getMultipleUsers([1, 2, 3]);
//   console.log('Пользователи:', names);
// }
// test2_2();

// ============================================
// ЗАДАНИЕ 2.3: Promise.all с разными типами
// ============================================
// Создай функцию которая параллельно:
// 1. Получает название команды (строка)
// 2. Получает количество игроков (число)
// 3. Получает флаг "активна ли команда" (boolean)

async function getTeamName(): Promise<string> {
  await delay(1000);
  return 'FC Barcelona';
}

async function getPlayerCount(): Promise<number> {
  await delay(1500);
  return 25;
}

async function isTeamActive(): Promise<boolean> {
  await delay(800);
  return true;
}

async function getTeamInfo(): Promise<{
  name: string;
  players: number;
  active: boolean;
}> {
  console.time('test3');
  const [name, players, active] = await Promise.all([
    getTeamName(),
    getPlayerCount(),
    isTeamActive(),
  ]);
  console.timeEnd('test3');
  return { name, players, active };
}

// Тест
// async function test2_3() {
//   const info = await getTeamInfo();
//   console.log('Команда:', info);
//   // Должно выполниться за ~1500ms (самый долгий запрос)
// }
// test2_3();

// ============================================
// ЗАДАНИЕ 2.4: Реальный пример - загрузка матча
// ============================================
// Симулируем получение данных о футбольном матче

async function getMatchDetails(
  matchId: number
): Promise<{ id: number; date: string }> {
  await delay(1000);
  return { id: matchId, date: '2025-10-26' };
}

async function getHomeTeamStats(
  teamId: number
): Promise<{ wins: number; losses: number }> {
  await delay(1500);
  return { wins: 15, losses: 5 };
}

async function getAwayTeamStats(
  teamId: number
): Promise<{ wins: number; losses: number }> {
  await delay(1500);
  return { wins: 12, losses: 8 };
}

async function getWeather(date: string): Promise<string> {
  await delay(500);
  return 'Sunny';
}

// Создай функцию которая получает ВСЕ данные о матче параллельно
async function getFullMatchData(matchId: number): Promise<{
  match: { id: number; date: string };
  homeStats: { wins: number; losses: number };
  awayStats: { wins: number; losses: number };
  weather: string;
}> {
  const [match, homeStats, awayStats, weather] = await Promise.all([
    getMatchDetails(matchId),
    getHomeTeamStats(2),
    getAwayTeamStats(3),
    getWeather('2025-10-26'),
  ]);
  return { match, homeStats, awayStats, weather };
}

// Тест
// async function test2_4() {
//   console.time('Full match data');
//   const data = await getFullMatchData(123);
//   console.timeEnd('Full match data');
//   console.log('Данные матча:', data);
//   // Должно выполниться за ~1500ms (не 4500ms!)
// }
// test2_4();

// ============================================
// ЗАДАНИЕ 2.5: Продвинутое - комбинация
// ============================================
// Иногда нужно делать часть последовательно, часть параллельно

async function getMatchPrediction(matchId: number): Promise<string> {
  const match = await getMatchDetails(matchId);

  const [homeStat, awayStat, weather] = await Promise.all([
    getHomeTeamStats(2),
    getAwayTeamStats(3),
    getWeather(match.date),
  ]);
  if (homeStat.wins > awayStat.wins) {
    return (
      'The probobality home Team winning more, but the wether will be ' +
      weather +
      " so it's 50/50"
    );
  }
  return (
    'The probobality away Team winning more, but the wether will be ' +
    weather +
    " so it's 50/50"
  );

  // Шаг 1: Получи данные о матче (должен быть первым)
  // Шаг 2: ПАРАЛЛЕЛЬНО получи статистику обеих команд
  // Шаг 3: На основе статистики верни прогноз (строку)
  // ТВОЙ КОД:
  // 1. const match = await getMatchDetails(matchId);
  // 2. const [homeStats, awayStats] = await Promise.all([...])
  // 3. return строку с прогнозом
}

// Тест
async function test2_5() {
  const prediction = await getMatchPrediction(123);
  console.log('Прогноз:', prediction);
}
test2_5();
