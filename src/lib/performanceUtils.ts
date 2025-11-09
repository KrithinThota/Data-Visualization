import { PerformanceMetrics } from './types';

export class PerformanceMonitor {
  private frameCount = 0;
  private lastTime = performance.now();
  private fps = 0;
  private renderTimes: number[] = [];
  private maxRenderTimes = 60;
  
  startFrame(): void {
    this.lastTime = performance.now();
  }
  
  endFrame(): PerformanceMetrics {
    const currentTime = performance.now();
    const frameTime = currentTime - this.lastTime;

    // Track render times
    this.renderTimes.push(frameTime);
    if (this.renderTimes.length > this.maxRenderTimes) {
      this.renderTimes.shift();
    }

    // Calculate FPS more accurately
    this.frameCount++;
    if (this.frameCount % 10 === 0) { // Update FPS more frequently
      const avgFrameTime = this.renderTimes.reduce((a, b) => a + b, 0) / this.renderTimes.length;
      this.fps = Math.round(1000 / avgFrameTime);
    }

    // Get memory usage if available
    const memoryUsage = this.getMemoryUsage();

    return {
      fps: this.fps,
      memoryUsage,
      renderTime: frameTime,
      dataProcessingTime: 0, // Will be set by caller
      dataPointsCount: 0 // Will be set by caller
    };
  }
  
  private getMemoryUsage(): number {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return memory.usedJSHeapSize / 1024 / 1024; // Convert to MB
    }
    return 0;
  }
  
  getAverageRenderTime(): number {
    if (this.renderTimes.length === 0) return 0;
    return this.renderTimes.reduce((a, b) => a + b, 0) / this.renderTimes.length;
  }
  
  reset(): void {
    this.frameCount = 0;
    this.renderTimes = [];
    this.fps = 0;
  }
}

export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

export function requestAnimationFrameThrottle(callback: FrameRequestCallback): () => void {
  let ticking = false;

  return () => {
    if (!ticking) {
      requestAnimationFrame((timestamp) => {
        callback(timestamp);
        ticking = false;
      });
      ticking = true;
    }
  };
}

export function measurePerformance<T>(
  name: string,
  fn: () => T
): { result: T; duration: number } {
  const start = performance.now();
  const result = fn();
  const end = performance.now();
  
  console.log(`${name}: ${end - start}ms`);
  
  return { result, duration: end - start };
}

export function createVirtualizedList<T>(
  items: T[],
  containerHeight: number,
  itemHeight: number,
  renderItem: (item: T, index: number) => React.ReactNode
): {
  visibleItems: { item: T; index: number; top: number }[];
  totalHeight: number;
  scrollTop: number;
  setScrollTop: (scrollTop: number) => void;
} {
  const visibleCount = Math.ceil(containerHeight / itemHeight) + 1;
  const totalHeight = items.length * itemHeight;
  
  let scrollTop = 0;
  
  const getVisibleItems = () => {
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(startIndex + visibleCount, items.length);
    
    return Array.from({ length: endIndex - startIndex }, (_, i) => {
      const index = startIndex + i;
      return {
        item: items[index],
        index,
        top: index * itemHeight
      };
    });
  };
  
  return {
    get visibleItems() {
      return getVisibleItems();
    },
    totalHeight,
    get scrollTop() {
      return scrollTop;
    },
    setScrollTop: (newScrollTop: number) => {
      scrollTop = Math.max(0, Math.min(newScrollTop, totalHeight - containerHeight));
    }
  };
}

export function optimizeCanvasRendering(canvas: HTMLCanvasElement): void {
  // Enable hardware acceleration hints
  canvas.style.willChange = 'transform';
  canvas.style.transform = 'translateZ(0)';
  
  // Set canvas rendering hints
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
  }
}

export function createOffscreenCanvas(
  width: number,
  height: number
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

export function debounceWithLeading<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  let lastCallTime = 0;
  
  return (...args: Parameters<T>) => {
    const now = Date.now();
    const timeSinceLastCall = now - lastCallTime;
    
    if (timeSinceLastCall >= wait) {
      func(...args);
      lastCallTime = now;
    } else {
      if (timeout) {
        clearTimeout(timeout);
      }
      timeout = setTimeout(() => {
        func(...args);
        lastCallTime = Date.now();
      }, wait - timeSinceLastCall);
    }
  };
}