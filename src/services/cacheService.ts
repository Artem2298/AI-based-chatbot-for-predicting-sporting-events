import { createLogger } from '@/utils/logger';

const log = createLogger('cache');

interface CacheItem<T = unknown> {
  data: T;
  expiry: number;
}

export class CacheService {
  private cache: Map<string, CacheItem>;

  constructor() {
    this.cache = new Map();
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) {
      return null;
    }
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      log.debug({ key }, 'cache expired');
      return null;
    }
    return item.data as T;
  }

  set<T>(key: string, data: T, ttl: number = 600): void {
    const expiry = Date.now() + ttl * 1000;

    const item: CacheItem<T> = { data, expiry };
    this.cache.set(key, item);
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }
}
