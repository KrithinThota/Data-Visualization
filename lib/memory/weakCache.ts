export class WeakCache<K extends object, V> {
  private cache = new WeakMap<K, { value: V; timestamp: number; accessCount: number }>();
  private ttl: number;
  private maxSize: number;
  private accessCounts = new Map<K, number>();

  constructor(ttlMs = 300000, maxSize = 1000) { // 5 minutes default TTL
    this.ttl = ttlMs;
    this.maxSize = maxSize;
  }

  set(key: K, value: V): void {
    const now = Date.now();

    // Check if we're approaching max size and clean up if needed
    if (this.accessCounts.size >= this.maxSize) {
      this.evictLeastRecentlyUsed();
    }

    this.cache.set(key, { value, timestamp: now, accessCount: 0 });
    this.accessCounts.set(key, 0);
  }

  get(key: K): V | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    const now = Date.now();

    // Check if entry has expired
    if (now - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      this.accessCounts.delete(key);
      return undefined;
    }

    // Update access count
    entry.accessCount++;
    this.accessCounts.set(key, entry.accessCount);

    return entry.value;
  }

  has(key: K): boolean {
    return this.get(key) !== undefined;
  }

  delete(key: K): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.accessCounts.delete(key);
    }
    return deleted;
  }

  clear(): void {
    this.cache = new WeakMap();
    this.accessCounts.clear();
  }

  getStats(): {
    size: number;
    hitRate: number;
    totalAccesses: number;
    totalHits: number;
  } {
    const totalAccesses = Array.from(this.accessCounts.values()).reduce((sum, count) => sum + count, 0);
    let totalHits = 0;

    // Calculate hits from cache entries (can't iterate WeakMap directly)
    for (const [key, count] of this.accessCounts) {
      // count is intentionally not used here as we get the actual access count from the entry
      void count; // Explicitly mark as intentionally unused
      const entry = this.cache.get(key);
      if (entry) {
        totalHits += entry.accessCount;
      }
    }

    return {
      size: this.accessCounts.size,
      hitRate: totalAccesses > 0 ? (totalHits / totalAccesses) * 100 : 0,
      totalAccesses,
      totalHits
    };
  }

  private evictLeastRecentlyUsed(): void {
    if (this.accessCounts.size === 0) return;

    // Find the key with the lowest access count
    let minAccessCount = Infinity;
    let lruKey: K | null = null;

    for (const [key, count] of this.accessCounts) {
      if (count < minAccessCount) {
        minAccessCount = count;
        lruKey = key;
      }
    }

    if (lruKey) {
      this.delete(lruKey);
    }
  }

  // Cleanup expired entries
  cleanup(): void {
    const now = Date.now();
    const keysToDelete: K[] = [];

    // We can't iterate WeakMap directly, so we use accessCounts as proxy
    for (const [key] of this.accessCounts) {
      const entry = this.cache.get(key);
      if (entry && now - entry.timestamp > this.ttl) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.delete(key));

    // Force garbage collection hint (if available)
    if (typeof global !== 'undefined' && global.gc) {
      global.gc();
    }
  }

  // Set new TTL for all existing entries
  setTTL(ttlMs: number): void {
    this.ttl = ttlMs;
  }
}

// Specialized cache for computation results
export class ComputationCache extends WeakCache<object, unknown> {
  constructor(ttlMs = 600000) { // 10 minutes for computations
    super(ttlMs, 500); // Smaller max size for computations
  }

  // Cache computation with automatic key generation
  memoize<T extends unknown[], R>(
    fn: (...args: T) => R,
    keyFn?: (...args: T) => object
  ): (...args: T) => R {
    return (...args: T): R => {
      const key = keyFn ? keyFn(...args) : { args, fn: fn.toString() };

      const cached = this.get(key);
      if (cached !== undefined) {
        return cached as R;
      }

      const result = fn(...args);
      this.set(key, result);
      return result;
    };
  }
}

// Specialized cache for data transformations
export class DataCache extends WeakCache<object, unknown> {
  constructor(ttlMs = 300000) { // 5 minutes for data
    super(ttlMs, 200); // Medium size for data
  }

  // Cache data processing results
  cacheDataProcessing<T>(
    data: T,
    processor: (data: T) => unknown,
    key?: string
  ): unknown {
    const cacheKey = key ? { key } : data as object;

    const cached = this.get(cacheKey);
    if (cached !== undefined) {
      return cached;
    }

    const result = processor(data);
    this.set(cacheKey, result);
    return result;
  }
}

// Global cache instances
export const computationCache = new ComputationCache();
export const dataCache = new DataCache();

// Utility function to create cache keys from multiple objects
export function createCacheKey(...objects: unknown[]): object {
  return { compositeKey: objects.map(obj => JSON.stringify(obj)).join('|') };
}

// Periodic cleanup
setInterval(() => {
  computationCache.cleanup();
  dataCache.cleanup();
}, 60000); // Clean up every minute