/**
 * Memory Management Utilities
 * Prevents memory leaks and manages data size limits
 */

import { DataPoint } from './types';

/**
 * Data manager with automatic size limiting and cleanup
 */
export class DataManager {
  private data = new Map<string, DataPoint[]>();
  private maxSize: number;
  private maxAge: number;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(maxSize: number = 50000, maxAge: number = 3600000) {
    this.maxSize = maxSize;
    this.maxAge = maxAge; // 1 hour default
    this.startCleanupTimer();
  }

  /**
   * Add data with automatic size limiting
   */
  addData(key: string, points: DataPoint[]): void {
    let currentData = this.data.get(key) || [];
    currentData = [...currentData, ...points];

    // Enforce size limit
    if (currentData.length > this.maxSize) {
      currentData = currentData.slice(-this.maxSize);
    }

    this.data.set(key, currentData);
  }

  /**
   * Set data directly (replaces existing)
   */
  setData(key: string, points: DataPoint[]): void {
    let data = points;
    
    if (data.length > this.maxSize) {
      data = data.slice(-this.maxSize);
    }
    
    this.data.set(key, data);
  }

  /**
   * Get data for a key
   */
  getData(key: string): DataPoint[] {
    return this.data.get(key) || [];
  }

  /**
   * Remove old data points based on timestamp
   */
  removeOldData(key: string, threshold: number): void {
    const currentData = this.data.get(key);
    if (!currentData) return;

    const filtered = currentData.filter(point => point.timestamp >= threshold);
    this.data.set(key, filtered);
  }

  /**
   * Clean up all old data
   */
  private cleanup(): void {
    const threshold = Date.now() - this.maxAge;
    
    for (const [key, points] of this.data.entries()) {
      const filtered = points.filter(point => point.timestamp >= threshold);
      if (filtered.length === 0) {
        this.data.delete(key);
      } else {
        this.data.set(key, filtered);
      }
    }
  }

  /**
   * Start automatic cleanup timer
   */
  private startCleanupTimer(): void {
    if (typeof window === 'undefined') return;

    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000); // Clean up every minute
  }

  /**
   * Stop cleanup timer
   */
  private stopCleanupTimer(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.data.clear();
  }

  /**
   * Get memory usage statistics
   */
  getStats() {
    let totalPoints = 0;
    let oldestTimestamp = Date.now();
    
    for (const points of this.data.values()) {
      totalPoints += points.length;
      if (points.length > 0) {
        oldestTimestamp = Math.min(oldestTimestamp, points[0].timestamp);
      }
    }

    const estimatedMemory = totalPoints * 64; // Rough estimate: 64 bytes per data point

    return {
      keysCount: this.data.size,
      totalPoints,
      estimatedMemoryBytes: estimatedMemory,
      estimatedMemoryMB: (estimatedMemory / 1024 / 1024).toFixed(2),
      oldestDataAge: Date.now() - oldestTimestamp
    };
  }

  /**
   * Destroy manager and cleanup
   */
  destroy(): void {
    this.stopCleanupTimer();
    this.clear();
  }
}

/**
 * Weak reference cache for temporary data
 */
export class WeakCache<K extends object, V> {
  private cache = new WeakMap<K, V>();
  
  set(key: K, value: V): void {
    this.cache.set(key, value);
  }
  
  get(key: K): V | undefined {
    return this.cache.get(key);
  }
  
  has(key: K): boolean {
    return this.cache.has(key);
  }
  
  delete(key: K): boolean {
    return this.cache.delete(key);
  }
}

/**
 * LRU Cache with size limit
 */
export class LRUCache<K, V> {
  private cache = new Map<K, { value: V; timestamp: number }>();
  private maxSize: number;

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
  }

  set(key: K, value: V): void {
    // Remove oldest if at capacity
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      let oldestKey: K | null = null;
      let oldestTime = Infinity;

      for (const [k, v] of this.cache.entries()) {
        if (v.timestamp < oldestTime) {
          oldestTime = v.timestamp;
          oldestKey = k;
        }
      }

      if (oldestKey !== null) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, { value, timestamp: Date.now() });
  }

  get(key: K): V | undefined {
    const entry = this.cache.get(key);
    if (entry) {
      // Update timestamp (LRU)
      entry.timestamp = Date.now();
      return entry.value;
    }
    return undefined;
  }

  has(key: K): boolean {
    return this.cache.has(key);
  }

  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }
}

/**
 * Batch processor to reduce update frequency
 */
export class BatchProcessor<T> {
  private batch: T[] = [];
  private batchSize: number;
  private flushInterval: number;
  private timeoutId: NodeJS.Timeout | null = null;
  private onFlush: (items: T[]) => void;

  constructor(
    onFlush: (items: T[]) => void,
    batchSize: number = 100,
    flushInterval: number = 100
  ) {
    this.onFlush = onFlush;
    this.batchSize = batchSize;
    this.flushInterval = flushInterval;
  }

  add(item: T): void {
    this.batch.push(item);

    // Flush if batch is full
    if (this.batch.length >= this.batchSize) {
      this.flush();
      return;
    }

    // Schedule flush if not already scheduled
    if (this.timeoutId === null) {
      this.scheduleFlush();
    }
  }

  private scheduleFlush(): void {
    this.timeoutId = setTimeout(() => {
      this.flush();
    }, this.flushInterval);
  }

  flush(): void {
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }

    if (this.batch.length === 0) return;

    const items = [...this.batch];
    this.batch = [];
    this.onFlush(items);
  }

  destroy(): void {
    this.flush();
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }
}

/**
 * Memory monitor to track usage
 */
export class MemoryMonitor {
  private samples: number[] = [];
  private maxSamples = 100;

  /**
   * Take a memory sample
   */
  sample(): number {
    if (typeof performance === 'undefined' || !(performance as any).memory) {
      return 0;
    }

    const memory = (performance as any).memory;
    const usedMB = memory.usedJSHeapSize / 1024 / 1024;
    
    this.samples.push(usedMB);
    if (this.samples.length > this.maxSamples) {
      this.samples.shift();
    }

    return usedMB;
  }

  /**
   * Get current memory usage
   */
  getCurrentUsage(): number {
    return this.samples[this.samples.length - 1] || 0;
  }

  /**
   * Get average memory usage
   */
  getAverageUsage(): number {
    if (this.samples.length === 0) return 0;
    return this.samples.reduce((sum, val) => sum + val, 0) / this.samples.length;
  }

  /**
   * Get peak memory usage
   */
  getPeakUsage(): number {
    return Math.max(...this.samples, 0);
  }

  /**
   * Get memory growth rate (MB per hour)
   */
  getGrowthRate(): number {
    if (this.samples.length < 2) return 0;
    
    const first = this.samples[0];
    const last = this.samples[this.samples.length - 1];
    const growth = last - first;
    
    // Estimate hourly growth based on sample period
    const samplesPerHour = 3600000 / 60000; // Assuming 1 sample per minute
    const estimatedHourlyGrowth = (growth / this.samples.length) * samplesPerHour;
    
    return estimatedHourlyGrowth;
  }

  /**
   * Clear samples
   */
  clear(): void {
    this.samples = [];
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      current: this.getCurrentUsage(),
      average: this.getAverageUsage(),
      peak: this.getPeakUsage(),
      growthRate: this.getGrowthRate(),
      sampleCount: this.samples.length
    };
  }
}

/**
 * Utility to suggest garbage collection (hint only)
 */
export function suggestGarbageCollection(): void {
  if (typeof window !== 'undefined' && (window as any).gc) {
    try {
      (window as any).gc();
    } catch (e) {
      // GC not available, that's okay
    }
  }
}

/**
 * Create a cleanup function that combines multiple cleanup tasks
 */
export function createCleanupFunction(...cleanupFns: Array<() => void>): () => void {
  return () => {
    cleanupFns.forEach(fn => {
      try {
        fn();
      } catch (error) {
        console.error('Cleanup function error:', error);
      }
    });
  };
}