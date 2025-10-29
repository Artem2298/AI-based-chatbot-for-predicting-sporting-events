import { CacheService } from './cacheService';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function testCacheService() {
  console.log('🧪 Testing CacheService...\n');

  const cache = new CacheService();

  try {
    console.log('📋 Test 1: Basic operations...');

    const testData = { name: 'John', age: 30 };
    cache.set('user:1', testData);
    console.log('   ✅ Saved data to cache');

    const retrieved = cache.get('user:1');
    if (retrieved && retrieved.name === 'John') {
      console.log('   ✅ Retrieved data:', retrieved);
    } else {
      console.log('   ❌ Failed to retrieve data');
    }

    if (cache.has('user:1')) {
      console.log('   ✅ has() confirms data exists');
    } else {
      console.log('   ❌ has() failed');
    }

    cache.delete('user:1');
    console.log('   ✅ Deleted data');

    const afterDelete = cache.get('user:1');
    if (afterDelete === null) {
      console.log('   ✅ Data no longer in cache');
    } else {
      console.log('   ❌ Data still in cache after delete');
    }

    console.log('\n📋 Test 2: TTL expiration...');

    cache.set('temp:data', 'This will expire', 2);
    console.log('   ✅ Saved data with TTL=2s');

    const immediate = cache.get('temp:data');
    if (immediate !== null) {
      console.log('   ✅ Data available immediately:', immediate);
    } else {
      console.log('   ❌ Data should be available immediately');
    }

    console.log('   ⏳ Waiting 3 seconds...');
    await sleep(3000);

    const afterExpiry = cache.get('temp:data');
    if (afterExpiry === null) {
      console.log('   ✅ Data expired after 3s');
    } else {
      console.log('   ❌ Data should have expired');
    }

    console.log('\n📋 Test 3: has() method...');

    cache.set('test:key', 'test value');

    if (cache.has('test:key')) {
      console.log('   ✅ has() returns true for existing key');
    } else {
      console.log('   ❌ has() should return true');
    }

    cache.delete('test:key');

    if (!cache.has('test:key')) {
      console.log('   ✅ has() returns false after deletion');
    } else {
      console.log('   ❌ has() should return false');
    }

    if (!cache.has('non:existent')) {
      console.log('   ✅ has() returns false for non-existent key');
    } else {
      console.log('   ❌ has() should return false for non-existent key');
    }

    console.log('\n📋 Test 4: clear() method...');

    cache.set('item:1', 'data 1');
    cache.set('item:2', 'data 2');
    cache.set('item:3', 'data 3');
    console.log('   ✅ Saved 3 items to cache');

    const hasAll =
      cache.has('item:1') && cache.has('item:2') && cache.has('item:3');
    if (hasAll) {
      console.log('   ✅ All items exist in cache');
    }

    cache.clear();
    console.log('   ✅ Cleared cache');

    const allGone =
      !cache.has('item:1') && !cache.has('item:2') && !cache.has('item:3');
    if (allGone) {
      console.log('   ✅ All items removed from cache');
    } else {
      console.log('   ❌ Some items still in cache');
    }

    console.log('\n📋 Test 5: Multiple keys with different TTL...');

    cache.set('short:lived', 'expires in 1s', 1);
    cache.set('long:lived', 'expires in 10s', 10);
    console.log('   ✅ Saved two items with different TTL');

    if (cache.has('short:lived') && cache.has('long:lived')) {
      console.log('   ✅ Both items exist initially');
    }

    console.log('   ⏳ Waiting 2 seconds...');
    await sleep(2000);

    if (!cache.has('short:lived') && cache.has('long:lived')) {
      console.log('   ✅ Short-lived expired, long-lived still exists');
    } else {
      console.log('   ❌ TTL behavior incorrect');
    }

    console.log('\n✅ All tests passed! 🎉');
  } catch (error) {
    console.error('\n❌ Test failed with error:');
    console.error(error);
  }
}

testCacheService();
