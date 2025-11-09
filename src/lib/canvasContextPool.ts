/**
 * Canvas Context Pool
 * Manages and reuses canvas contexts to prevent memory leaks and improve performance
 */

interface ContextPoolEntry {
  ctx: CanvasRenderingContext2D;
  lastUsed: number;
  canvas: HTMLCanvasElement;
}

/**
 * Pool of reusable canvas contexts
 */
export class CanvasContextPool {
  private pool = new WeakMap<HTMLCanvasElement, ContextPoolEntry>();
  private contextList: ContextPoolEntry[] = [];
  private maxAge = 5 * 60 * 1000; // 5 minutes
  private cleanupInterval: NodeJS.Timeout | null = null;
  private maxPoolSize = 20;

  constructor(maxPoolSize: number = 20) {
    this.maxPoolSize = maxPoolSize;
    this.startCleanupTimer();
  }

  /**
   * Get or create an optimized context for a canvas
   */
  getContext(
    canvas: HTMLCanvasElement,
    type: '2d' = '2d'
  ): CanvasRenderingContext2D {
    // Check if we already have a context for this canvas
    const existing = this.pool.get(canvas);
    
    if (existing) {
      existing.lastUsed = Date.now();
      return existing.ctx;
    }

    // Create new optimized context
    const ctx = canvas.getContext(type, {
      alpha: false,
      desynchronized: true,
      willReadFrequently: false
    }) as CanvasRenderingContext2D;

    if (!ctx) {
      throw new Error('Failed to create canvas context');
    }

    // Optimize context settings
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Store in pool
    const entry: ContextPoolEntry = {
      ctx,
      canvas,
      lastUsed: Date.now()
    };

    this.pool.set(canvas, entry);
    this.contextList.push(entry);

    // Enforce pool size limit
    this.enforcePoolSize();

    return ctx;
  }

  /**
   * Mark a context as recently used
   */
  touch(canvas: HTMLCanvasElement): void {
    const entry = this.pool.get(canvas);
    if (entry) {
      entry.lastUsed = Date.now();
    }
  }

  /**
   * Remove a context from the pool
   */
  remove(canvas: HTMLCanvasElement): void {
    const entry = this.pool.get(canvas);
    if (entry) {
      this.pool.delete(canvas);
      const index = this.contextList.indexOf(entry);
      if (index > -1) {
        this.contextList.splice(index, 1);
      }
    }
  }

  /**
   * Enforce maximum pool size
   */
  private enforcePoolSize(): void {
    if (this.contextList.length <= this.maxPoolSize) {
      return;
    }

    // Sort by last used time (oldest first)
    this.contextList.sort((a, b) => a.lastUsed - b.lastUsed);

    // Remove oldest entries
    const toRemove = this.contextList.length - this.maxPoolSize;
    for (let i = 0; i < toRemove; i++) {
      const entry = this.contextList[i];
      this.pool.delete(entry.canvas);
    }

    this.contextList = this.contextList.slice(toRemove);
  }

  /**
   * Clean up old contexts
   */
  private cleanup(): void {
    const now = Date.now();
    const threshold = now - this.maxAge;

    this.contextList = this.contextList.filter(entry => {
      if (entry.lastUsed < threshold) {
        this.pool.delete(entry.canvas);
        return false;
      }
      return true;
    });
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
   * Get pool statistics
   */
  getStats() {
    return {
      poolSize: this.contextList.length,
      maxPoolSize: this.maxPoolSize,
      oldestContext: this.contextList.length > 0 
        ? Date.now() - Math.min(...this.contextList.map(e => e.lastUsed))
        : 0
    };
  }

  /**
   * Clear entire pool
   */
  clear(): void {
    this.contextList = [];
    // WeakMap will be garbage collected automatically
  }

  /**
   * Destroy pool and cleanup
   */
  destroy(): void {
    this.stopCleanupTimer();
    this.clear();
  }
}

/**
 * Global context pool instance
 */
let globalContextPool: CanvasContextPool | null = null;

export function getGlobalContextPool(): CanvasContextPool {
  if (!globalContextPool) {
    globalContextPool = new CanvasContextPool();
  }
  return globalContextPool;
}

/**
 * Get optimized context from global pool
 */
export function getOptimizedContext(
  canvas: HTMLCanvasElement
): CanvasRenderingContext2D {
  return getGlobalContextPool().getContext(canvas);
}

/**
 * Reset global context pool (useful for testing)
 */
export function resetGlobalContextPool(): void {
  if (globalContextPool) {
    globalContextPool.destroy();
    globalContextPool = null;
  }
}