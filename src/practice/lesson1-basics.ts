// src/practice/lesson1-basics.ts

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function greet(): Promise<void> {
  console.log('Hi');
  await delay(1000);
  console.log('How are u?');
}

greet();

async function getUserName(): Promise<string> {
  await delay(2000);
  return 'John Doe';
}

async function test1_2() {
  const name = await getUserName();
  console.log('Имя пользователя:', name);
}
test1_2();

async function fetchUserAge(userId: number): Promise<number> {
  await delay(1000);
  return userId * 5;
}

async function test1_3() {
  const age = await fetchUserAge(5);
  console.log('Возраст:', age);
}
test1_3();

async function getUserInfo(): Promise<string> {
  const name = await getUserName();
  const age = await fetchUserAge(5);
  return `Пользователь: ${name}, Возраст: ${age}`;
}

async function test1_4() {
  const info = await getUserInfo();
  console.log(info);
}
test1_4();

async function countdown(): Promise<void> {
  console.log('3\n');
  await delay(1000);
  console.log('2\n');
  await delay(1000);
  console.log('1\n');
  await delay(1000);
  console.log('!!!GOGOGOGO!!!');
}

countdown();
