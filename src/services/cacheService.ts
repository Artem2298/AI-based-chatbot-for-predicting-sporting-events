interface CacheItem {
  data: any;
  expiry: number;
}

export class CacheService {
  private cache: Map<string, CacheItem>;

  constructor() {
    this.cache = new Map();
  }

  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) {
      console.log('We dont have a key in this cashe');
      return null;
    }
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      console.log(`🗑️ Cache expired for key: ${key}`);
      return null;
    }
    return item.data;
  }

  set(key: string, data: any, ttl: number = 600): void {
    const expiry = Date.now() + ttl * 1000;

    const item: CacheItem = { data, expiry };
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
