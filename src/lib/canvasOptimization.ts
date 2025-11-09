/**
 * Canvas Rendering Optimization Manager
 * Implements RAF throttling, dirty region tracking, and efficient render scheduling
 */

export interface DirtyRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RenderTask {
  id: string;
  priority: number;
  execute: () => void;
  regions?: DirtyRegion[];
}

/**
 * Manages canvas rendering with RAF throttling and dirty region optimization
 */
export class CanvasRenderManager {
  private rafId: number | null = null;
  private isDirty: boolean = false;
  private dirtyRegions: DirtyRegion[] = [];
  private renderTasks: Map<string, RenderTask> = new Map();
  private isRendering: boolean = false;
  private lastRenderTime: number = 0;
  private targetFPS: number = 60;
  private frameTime: number = 1000 / this.targetFPS;

  constructor(targetFPS: number = 60) {
    this.targetFPS = targetFPS;
    this.frameTime = 1000 / targetFPS;
  }

  /**
   * Mark canvas as dirty and schedule a render
   */
  markDirty(region?: DirtyRegion): void {
    this.isDirty = true;
    
    if (region) {
      // Merge overlapping regions to reduce render calls
      this.addDirtyRegion(region);
    }
    
    this.scheduleRender();
  }

  /**
   * Add a dirty region with overlap detection
   */
  private addDirtyRegion(newRegion: DirtyRegion): void {
    // Check if region overlaps with existing regions
    let merged = false;
    
    for (let i = 0; i < this.dirtyRegions.length; i++) {
      const existing = this.dirtyRegions[i];
      
      if (this.regionsOverlap(existing, newRegion)) {
        // Merge regions
        this.dirtyRegions[i] = this.mergeRegions(existing, newRegion);
        merged = true;
        break;
      }
    }
    
    if (!merged) {
      this.dirtyRegions.push(newRegion);
    }
  }

  /**
   * Check if two regions overlap
   */
  private regionsOverlap(r1: DirtyRegion, r2: DirtyRegion): boolean {
    return !(
      r1.x + r1.width < r2.x ||
      r2.x + r2.width < r1.x ||
      r1.y + r1.height < r2.y ||
      r2.y + r2.height < r1.y
    );
  }

  /**
   * Merge two overlapping regions into one
   */
  private mergeRegions(r1: DirtyRegion, r2: DirtyRegion): DirtyRegion {
    const minX = Math.min(r1.x, r2.x);
    const minY = Math.min(r1.y, r2.y);
    const maxX = Math.max(r1.x + r1.width, r2.x + r2.width);
    const maxY = Math.max(r1.y + r1.height, r2.y + r2.height);
    
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  }

  /**
   * Schedule a render using RAF with throttling
   */
  private scheduleRender(): void {
    if (this.rafId !== null || this.isRendering) {
      return; // Already scheduled or rendering
    }

    const now = performance.now();
    const timeSinceLastRender = now - this.lastRenderTime;

    if (timeSinceLastRender < this.frameTime) {
      // Throttle: schedule for next frame
      const delay = this.frameTime - timeSinceLastRender;
      setTimeout(() => {
        this.rafId = requestAnimationFrame(this.render.bind(this));
      }, delay);
    } else {
      // Immediate render
      this.rafId = requestAnimationFrame(this.render.bind(this));
    }
  }

  /**
   * Execute render tasks
   */
  private render(): void {
    if (!this.isDirty) {
      this.rafId = null;
      return;
    }

    this.isRendering = true;
    this.lastRenderTime = performance.now();

    try {
      // Execute render tasks in priority order
      const tasks = Array.from(this.renderTasks.values())
        .sort((a, b) => b.priority - a.priority);

      for (const task of tasks) {
        task.execute();
      }

      // Clear dirty state
      this.isDirty = false;
      this.dirtyRegions = [];
    } finally {
      this.isRendering = false;
      this.rafId = null;
    }
  }

  /**
   * Register a render task
   */
  registerTask(task: RenderTask): void {
    this.renderTasks.set(task.id, task);
  }

  /**
   * Unregister a render task
   */
  unregisterTask(id: string): void {
    this.renderTasks.delete(id);
  }

  /**
   * Get current dirty regions
   */
  getDirtyRegions(): DirtyRegion[] {
    return [...this.dirtyRegions];
  }

  /**
   * Force immediate render
   */
  forceRender(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.render();
  }

  /**
   * Cancel scheduled render
   */
  cancelRender(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.isDirty = false;
    this.dirtyRegions = [];
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.cancelRender();
    this.renderTasks.clear();
  }

  /**
   * Get performance stats
   */
  getStats() {
    return {
      isDirty: this.isDirty,
      dirtyRegionsCount: this.dirtyRegions.length,
      tasksCount: this.renderTasks.size,
      lastRenderTime: this.lastRenderTime,
      targetFPS: this.targetFPS
    };
  }
}

/**
 * Singleton render manager instance
 */
let globalRenderManager: CanvasRenderManager | null = null;

export function getGlobalRenderManager(): CanvasRenderManager {
  if (!globalRenderManager) {
    globalRenderManager = new CanvasRenderManager(60);
  }
  return globalRenderManager;
}

/**
 * Batch multiple canvas updates into a single render
 */
export function batchCanvasUpdates(updates: Array<() => void>): void {
  const manager = getGlobalRenderManager();
  
  // Execute all updates
  updates.forEach(update => update());
  
  // Schedule single render
  manager.markDirty();
}

/**
 * Create an optimized canvas context with performance flags
 */
export function createOptimizedContext(
  canvas: HTMLCanvasElement,
  type: '2d' = '2d'
): CanvasRenderingContext2D {
  const ctx = canvas.getContext(type, {
    alpha: false,
    desynchronized: true, // Better performance, allows async rendering
    willReadFrequently: false // We're not reading pixels frequently
  }) as CanvasRenderingContext2D;

  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  // Set optimal rendering properties
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  return ctx;
}

/**
 * Optimize canvas for high DPI displays
 */
export function optimizeCanvasForDPI(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): void {
  const dpr = window.devicePixelRatio || 1;
  
  // Set actual size in memory (scaled for DPI)
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  
  // Set display size (CSS pixels)
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  
  // Scale context to match DPI
  ctx.scale(dpr, dpr);
}