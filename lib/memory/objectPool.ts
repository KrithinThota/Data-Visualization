export class ObjectPool<T> {
  private pool: T[] = [];
  private factory: () => T;
  private reset: (obj: T) => void;
  private maxSize: number;
  private activeObjects: Set<T> = new Set();

  constructor(
    factory: () => T,
    reset: (obj: T) => void,
    maxSize = 1000
  ) {
    this.factory = factory;
    this.reset = reset;
    this.maxSize = maxSize;
  }

  acquire(): T {
    let obj: T;

    if (this.pool.length > 0) {
      obj = this.pool.pop()!;
    } else {
      obj = this.factory();
    }

    this.activeObjects.add(obj);
    return obj;
  }

  release(obj: T): void {
    if (!this.activeObjects.has(obj)) {
      console.warn('Attempting to release object not in active pool');
      return;
    }

    this.activeObjects.delete(obj);
    this.reset(obj);

    if (this.pool.length < this.maxSize) {
      this.pool.push(obj);
    }
  }

  getStats(): {
    available: number;
    active: number;
    total: number;
    utilization: number;
  } {
    const total = this.pool.length + this.activeObjects.size;
    const utilization = total > 0 ? (this.activeObjects.size / total) * 100 : 0;

    return {
      available: this.pool.length,
      active: this.activeObjects.size,
      total,
      utilization
    };
  }

  clear(): void {
    this.pool.length = 0;
    this.activeObjects.clear();
  }

  // Force cleanup of all objects
  forceCleanup(): void {
    this.pool.length = 0;
    // Note: active objects are not cleared here as they might still be in use
  }
}

// Specialized pool for Canvas contexts
export class CanvasContextPool extends ObjectPool<CanvasRenderingContext2D> {
  constructor(maxSize = 50) {
    super(
      () => {
        const canvas = document.createElement('canvas');
        canvas.width = 800;
        canvas.height = 600;
        const ctx = canvas.getContext('2d')!;
        return ctx;
      },
      (ctx) => {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.restore();
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
      },
      maxSize
    );
  }
}

// Specialized pool for Float32Arrays
export class Float32ArrayPool extends ObjectPool<Float32Array> {
  constructor(maxSize = 100) {
    super(
      () => new Float32Array(1024), // Default size
      (array) => {
        array.fill(0);
      },
      maxSize
    );
  }

  override acquire(size?: number): Float32Array {
    const array = super.acquire();
    if (size && array.length !== size) {
      // If size doesn't match, create new one
      this.release(array);
      return new Float32Array(size);
    }
    return array;
  }
}

// Specialized pool for Uint8Arrays (for image data)
export class Uint8ArrayPool extends ObjectPool<Uint8Array> {
  constructor(maxSize = 50) {
    super(
      () => new Uint8Array(800 * 600 * 4), // Default RGBA image size
      (array) => {
        array.fill(0);
      },
      maxSize
    );
  }

  override acquire(size?: number): Uint8Array {
    const array = super.acquire();
    if (size && array.length !== size) {
      this.release(array);
      return new Uint8Array(size);
    }
    return array;
  }
}

// Global pool instances
export const canvasContextPool = new CanvasContextPool();
export const float32ArrayPool = new Float32ArrayPool();
export const uint8ArrayPool = new Uint8ArrayPool();