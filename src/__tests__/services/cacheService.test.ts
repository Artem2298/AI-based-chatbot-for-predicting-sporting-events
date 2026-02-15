import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CacheService } from '../../services/cacheService';

describe('CacheService', () => {
  let cacheService: CacheService;

  beforeEach(() => {
    cacheService = new CacheService();
    vi.useFakeTimers();
  });

  it('should store and retrieve data', () => {
    cacheService.set('test', { foo: 'bar' });
    expect(cacheService.get('test')).toEqual({ foo: 'bar' });
  });

  it('should return null for non-existent key', () => {
    expect(cacheService.get('non-existent')).toBeNull();
  });

  it('should expire items after TTL', () => {
    cacheService.set('short', 'data', 1); // 1 second TTL
    
    // Advance time by 2 seconds
    vi.advanceTimersByTime(2000);
    
    expect(cacheService.get('short')).toBeNull();
  });

  it('should delete items', () => {
    cacheService.set('key', 'value');
    cacheService.delete('key');
    expect(cacheService.get('key')).toBeNull();
  });

  it('should clear all items', () => {
    cacheService.set('a', 1);
    cacheService.set('b', 2);
    cacheService.clear();
    expect(cacheService.get('a')).toBeNull();
    expect(cacheService.get('b')).toBeNull();
  });

  it('should check if key exists using has()', () => {
    cacheService.set('exists', true);
    expect(cacheService.has('exists')).toBe(true);
    expect(cacheService.has('none')).toBe(false);
  });
});
