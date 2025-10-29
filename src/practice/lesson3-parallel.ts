// src/practice/lesson3-errors.ts

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Функция которая ИНОГДА падает
async function unreliableAPI(id: number): Promise<string> {
  await delay(1000);

  // 50% шанс ошибки
  if (Math.random() > 0.5) {
    throw new Error(`API call failed for ID ${id}`);
  }
  return `Data for ${id}`;
}

// ============================================
// ЗАДАНИЕ 3.1: Базовая обработка ошибок
// ============================================
// Создай функцию которая вызывает unreliableAPI и обрабатывает ошибку

async function fetchDataSafely(id: number): Promise<string> {
  try {
    return await unreliableAPI(id);
  } catch (error) {
    console.error(error);
    return 'Error ID: ' + id;
  }
}

// Тест
// async function test3_1() {
//   const result1 = await fetchDataSafely(1);
//   console.log('Результат 1:', result1);

//   const result2 = await fetchDataSafely(2);
//   console.log('Результат 2:', result2);
// }
// test3_1();

// ============================================
// ЗАДАНИЕ 3.2: Retry механизм (повтор при ошибке)
// ============================================
// Создай функцию которая пытается выполнить операцию N раз

async function fetchWithRetry(
  id: number,
  maxAttempts: number = 3
): Promise<string> {
  for (let i: number = 0; i < maxAttempts; i++) {
    try {
      return await unreliableAPI(id);
    } catch (error) {
      if (i == maxAttempts) {
        throw error;
      }
      console.log('This try was bad, one more time');
      await delay(1000);
    }
  }
  throw new Error('All attemps failed');
}

// Тест
// async function test3_2() {
//   try {
//     const result = await fetchWithRetry(1);
//     console.log('Успех:', result);
//   } catch (error) {
//     console.error('Все попытки неудачны:', error);
//   }
// }
// test3_2();

// ============================================
// ЗАДАНИЕ 3.3: Обработка типов ошибок
// ============================================

class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkError';
  }
}

class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

async function processData(data: string): Promise<string> {
  await delay(500);

  if (!data) {
    throw new ValidationError('Data is empty');
  }

  if (Math.random() > 0.7) {
    throw new NetworkError('Network timeout');
  }

  return `Processed: ${data}`;
}

// Создай функцию которая обрабатывает разные типы ошибок по-разному
async function handleDifferentErrors(data: string): Promise<string> {
  try {
    return await processData(data);
  } catch (error) {
    if (error instanceof ValidationError) {
      return 'Validation failed: используем default';
    }
    if (error instanceof NetworkError) {
      return 'Network failed: повторите позже';
    }
    return 'Unknown error';
  }
}

// Тест
async function test3_3() {
  console.log(await handleDifferentErrors('test'));
  console.log(await handleDifferentErrors(''));
}
test3_3();

// ============================================
// ЗАДАНИЕ 3.4: Promise.all с обработкой ошибок
// ============================================

// Создай функцию которая получает данные от 3 API,
// но если один упал - остальные все равно должны выполниться

async function fetchMultipleWithErrors(
  ids: number[]
): Promise<Array<string | null>> {
  // ТВОЙ КОД:
  // Используй Promise.all + safePromise из примера выше
  // Или Promise.allSettled
}

// Тест
// async function test3_4() {
//   const results = await fetchMultipleWithErrors([1, 2, 3, 4, 5]);
//   console.log('Результаты:', results);
//   // Некоторые будут null (если упали), но все выполнятся
// }
// test3_4();

// ============================================
// ЗАДАНИЕ 3.5: Finally блок
// ============================================

let isLoading = false;

async function fetchWithLoading(id: number): Promise<string> {
  // ТВОЙ КОД:
  // 1. Установи isLoading = true
  // 2. try { вызови unreliableAPI }
  // 3. catch { обработай ошибку }
  // 4. finally { установи isLoading = false }
  //    (важно: finally выполнится ВСЕГДА, даже при ошибке!)
}

// Тест
// async function test3_5() {
//   console.log('Loading:', isLoading);  // false
//
//   fetchWithLoading(1);  // Не ждем (без await)
//
//   await delay(100);
//   console.log('Loading:', isLoading);  // true (идет загрузка)
//
//   await delay(1000);
//   console.log('Loading:', isLoading);  // false (загрузка завершена)
// }
// test3_5();

// ============================================
// ЗАДАНИЕ 3.6: Реальный пример - Football API
// ============================================

async function getMatchData(matchId: number): Promise<{ id: number }> {
  await delay(1000);
  if (Math.random() > 0.6) {
    throw new Error('Match not found');
  }
  return { id: matchId };
}

async function getTeamStats(teamId: number): Promise<{ wins: number }> {
  await delay(800);
  if (Math.random() > 0.6) {
    throw new Error('Stats unavailable');
  }
  return { wins: 10 };
}

// Создай функцию которая получает данные о матче
// Если данные о матче не удалось получить - вернуть null
// Если статистика команды не удалась - использовать пустую статистику
async function getFullMatchInfo(matchId: number): Promise<{
  match: { id: number } | null;
  homeStats: { wins: number };
  awayStats: { wins: number };
} | null> {
  // ТВОЙ КОД:
  // 1. try { получи match }
  // 2. если match не получен - return null
  // 3. Параллельно получи статистику обеих команд (Promise.all)
  // 4. Используй try/catch для каждой статистики
  // 5. Если статистика не получена - используй { wins: 0 }
}

// Тест
// async function test3_6() {
//   const info = await getFullMatchInfo(123);
//   console.log('Match info:', info);
// }
// test3_6();
