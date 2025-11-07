import { useEffect, useState, useRef, useCallback } from 'react';
import { PerformanceMetrics, DataPoint } from '@/types/dashboard';
import { WebGPUIntegration } from '@/lib/webgpu/webgpuIntegration';
import { useMemoryManagement } from './useMemoryManagement';
import { enhancedLeakDetector } from '@/lib/memory/enhancedLeakDetector';
import { memoryMonitor } from '@/lib/memory/memoryMonitor';

export interface ExtendedPerformanceMetrics extends PerformanceMetrics {
  gpuMemoryUsage: number;
  computeTime: number;
  renderTimeGPU: number;
  webgpuEnabled: boolean;
  rendererType: 'webgpu' | 'canvas';
}

export function usePerformanceMonitor(webgpuIntegration?: WebGPUIntegration) {
  const [metrics, setMetrics] = useState<ExtendedPerformanceMetrics>({
    fps: 0,
    memoryUsage: 0,
    renderTime: 0,
    dataProcessingTime: 0,
    interactionLatency: 0,
    gpuMemoryUsage: 0,
    computeTime: 0,
    renderTimeGPU: 0,
    webgpuEnabled: false,
    rendererType: 'canvas'
  });

  // Memory management integration
  const memory = useMemoryManagement('PerformanceMonitor', {
    registerLeakDetection: true,
    enableMonitoring: true,
    cacheComputations: true
  });

  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(0);
  const renderTimesRef = useRef<number[]>([]);
  const gpuMetricsRef = useRef<{
    gpuSupported?: boolean;
    memoryStats?: {
      totalPooledSize?: number;
      pooledBuffers?: number;
    };
    computeMetrics?: {
      computeTime?: number;
    };
    rendererMetrics?: {
      gpuMemoryUsage?: number;
    };
  } | null>(null);

  // Register this hook with enhanced leak detector
  useEffect(() => {
    enhancedLeakDetector.registerObject(frameCountRef, 'PerformanceCounterRef', 256);
    enhancedLeakDetector.registerObject(renderTimesRef, 'RenderTimeArrayRef', 1024);
    enhancedLeakDetector.registerObject(gpuMetricsRef, 'GPUMetricsRef', 512);
    
    // Start memory monitoring
    memoryMonitor.startMonitoring();
    
    // Update access for leak detection
    enhancedLeakDetector.updateAccess(frameCountRef);
    enhancedLeakDetector.updateAccess(renderTimesRef);
    enhancedLeakDetector.updateAccess(gpuMetricsRef);
    
    return () => {
      memoryMonitor.stopMonitoring();
    };
  }, []);

  // Update GPU metrics periodically
  useEffect(() => {
    if (!webgpuIntegration) return;

    const updateGPUMetrics = () => {
      const gpuMetrics = webgpuIntegration.getPerformanceMetrics();
      gpuMetricsRef.current = gpuMetrics;
      
      // Update memory access for leak detection
      enhancedLeakDetector.updateAccess(gpuMetrics);
      enhancedLeakDetector.updateAccess(metrics);
      memory.updateMemoryAccess();
    };

    updateGPUMetrics();
    const gpuInterval = setInterval(updateGPUMetrics, 2000); // Update every 2 seconds

    return () => {
      clearInterval(gpuInterval);
    };
  }, [webgpuIntegration, memory, metrics]);

  useEffect(() => {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'measure') {
          renderTimesRef.current.push(entry.duration);
          if (renderTimesRef.current.length > 60) {
            renderTimesRef.current.shift();
          }
        }
      }
    });

    observer.observe({ entryTypes: ['measure'] });

    const fpsInterval = setInterval(() => {
      const now = performance.now();
      const delta = now - lastTimeRef.current;
      const fps = Math.round((frameCountRef.current * 1000) / delta);

      // Calculate average render time
      const avgRenderTime = renderTimesRef.current.length > 0
        ? renderTimesRef.current.reduce((a, b) => a + b, 0) / renderTimesRef.current.length
        : 0;

      // Memory usage (if available)
      const perfMemory = (performance as unknown as { memory?: { usedJSHeapSize?: number } }).memory;
      const memoryUsage = perfMemory?.usedJSHeapSize
        ? perfMemory.usedJSHeapSize / 1024 / 1024
        : 0;

      // GPU metrics
      const gpuMetrics = gpuMetricsRef.current;
      const gpuMemoryUsage = gpuMetrics?.memoryStats?.totalPooledSize || 0;
      const computeTime = gpuMetrics?.computeMetrics?.computeTime || 0;
      const renderTimeGPU = gpuMetrics?.rendererMetrics?.gpuMemoryUsage || 0;
      const webgpuEnabled = gpuMetrics?.gpuSupported || false;
      const rendererType = gpuMetrics?.gpuSupported ? 'webgpu' : 'canvas';

      // Get comprehensive memory statistics from memoryMonitor
      const memoryStats = memoryMonitor.getStats();
      const enhancedMemoryUsage = Math.max(memoryUsage, memoryStats.memoryUsage / 1024 / 1024 || 0);

      setMetrics({
        fps,
        memoryUsage: enhancedMemoryUsage,
        renderTime: avgRenderTime,
        dataProcessingTime: computeTime, // Use GPU compute time as data processing time
        interactionLatency: 0, // To be measured on interactions
        gpuMemoryUsage,
        computeTime,
        renderTimeGPU,
        webgpuEnabled,
        rendererType: rendererType as 'webgpu' | 'canvas'
      });

      frameCountRef.current = 0;
      lastTimeRef.current = now;
    }, 1000);

    return () => {
      observer.disconnect();
      clearInterval(fpsInterval);
    };
  }, []);

  const measureRenderTime = useCallback((name: string, fn: () => void) => {
    performance.mark(`${name}-start`);
    fn();
    performance.mark(`${name}-end`);
    performance.measure(name, `${name}-start`, `${name}-end`);
  }, []);

  const measureInteractionLatency = useCallback((startTime: number) => {
    const latency = performance.now() - startTime;
    setMetrics(prev => ({ ...prev, interactionLatency: latency }));
  }, []);

  const startInteractionMeasurement = useCallback(() => {
    return performance.now();
  }, []);

  return {
    metrics,
    measureRenderTime,
    measureInteractionLatency,
    startInteractionMeasurement
  };
}

/**
 * Hook for monitoring WebGPU-specific performance
 */
export function useWebGPUMonitor(webgpuIntegration?: WebGPUIntegration) {
  const [gpuMetrics, setGpuMetrics] = useState({
    supported: false,
    initialized: false,
    memoryUsage: 0,
    computeTime: 0,
    renderTime: 0,
    bufferCount: 0,
    shaderCompilationTime: 0
  });

  // Memory management for WebGPU monitor
  const memory = useMemoryManagement('WebGPUMonitor', {
    registerLeakDetection: true,
    enableObjectPooling: true,
    enableSharedBuffers: true
  });

  // Register with leak detector and memory monitor
  useEffect(() => {
    enhancedLeakDetector.registerObject(memory, 'WebGPUMonitorMemory', 1024);
    memoryMonitor.startMonitoring();
    
    return () => {
      memoryMonitor.stopMonitoring();
    };
  }, []);

  useEffect(() => {
    if (!webgpuIntegration) {
      return; // Early return, state will be set by default values
    }

    const updateMetrics = () => {
      const metrics = webgpuIntegration.getPerformanceMetrics();
      
      setGpuMetrics({
        supported: metrics.gpuSupported,
        initialized: webgpuIntegration.isWebGPUSupported(),
        memoryUsage: metrics.memoryStats?.totalPooledSize || 0,
        computeTime: metrics.computeMetrics?.computeTime || 0,
        renderTime: metrics.rendererMetrics?.gpuMemoryUsage || 0,
        bufferCount: metrics.memoryStats?.pooledBuffers || 0,
        shaderCompilationTime: 0 // Would need to track shader compilation
      });

      // Update memory access for leak detection and monitoring
      enhancedLeakDetector.updateAccess(memory);
      enhancedLeakDetector.updateAccess(metrics);
      memory.updateMemoryAccess();
    };

    updateMetrics();
    const interval = setInterval(updateMetrics, 1000);

    return () => clearInterval(interval);
  }, [webgpuIntegration, memory]);

  return {
    ...gpuMetrics,
    memoryStats: memory.getMemoryStats()
  };
}

/**
 * Performance benchmark utility for WebGPU
 */
export class WebGPUPerformanceBenchmark {
  private webgpuIntegration: WebGPUIntegration;
  private results: BenchmarkResult[] = [];

  constructor(webgpuIntegration: WebGPUIntegration) {
    this.webgpuIntegration = webgpuIntegration;
  }

  async runRenderBenchmark(dataPoints: number, iterations: number = 10): Promise<BenchmarkResult> {
    const data = this.generateTestData(dataPoints);
    const config = {
      id: 'benchmark',
      type: 'line' as const,
      dataKey: 'value',
      color: '#ff0000',
      visible: true
    };

    const times: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await this.webgpuIntegration.renderChart(data, config);
      const end = performance.now();
      times.push(end - start);
    }

    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const fps = 1000 / avgTime;

    const result: BenchmarkResult = {
      dataPoints,
      renderTime: avgTime,
      memoryUsage: 0, // Would need to measure
      fps,
      totalTime: times.reduce((a, b) => a + b, 0),
      iterations,
      rendererType: this.webgpuIntegration.isWebGPUSupported() ? 'webgpu' : 'canvas'
    };

    this.results.push(result);
    return result;
  }

  async runComputeBenchmark(operation: string, dataPoints: number, iterations: number = 5): Promise<BenchmarkResult> {
    const data = this.generateTestData(dataPoints);
    const params = operation === 'aggregate' ? { bucketSize: 1000 } :
                   operation === 'filter' ? { minValue: 25, maxValue: 75 } :
                   { windowSize: 10 };

    const times: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await this.webgpuIntegration.processData(operation as 'filter' | 'aggregate' | 'movingAverage', data, params);
      const end = performance.now();
      times.push(end - start);
    }

    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;

    const result: BenchmarkResult = {
      dataPoints,
      renderTime: avgTime, // Using renderTime field for compute time
      memoryUsage: 0,
      fps: 0, // Not applicable for compute
      totalTime: times.reduce((a, b) => a + b, 0),
      iterations,
      rendererType: this.webgpuIntegration.isWebGPUSupported() ? 'webgpu' : 'canvas',
      operation
    };

    this.results.push(result);
    return result;
  }

  private generateTestData(count: number): DataPoint[] {
    const data: DataPoint[] = [];
    const now = Date.now();

    for (let i = 0; i < count; i++) {
      data.push({
        timestamp: now + (i * 100),
        value: Math.sin(i / 10) * 50 + Math.random() * 10,
        category: ['A', 'B', 'C'][Math.floor(Math.random() * 3)],
        metadata: { source: 'benchmark' }
      });
    }

    return data;
  }

  getResults(): BenchmarkResult[] {
    return [...this.results];
  }

  clearResults(): void {
    this.results = [];
  }

  generateReport(): PerformanceReport {
    const webgpuResults = this.results.filter(r => r.rendererType === 'webgpu');
    const canvasResults = this.results.filter(r => r.rendererType === 'canvas');

    return {
      webgpu: this.calculateStats(webgpuResults),
      canvas: this.calculateStats(canvasResults),
      comparison: this.compareResults(webgpuResults, canvasResults)
    };
  }

  private calculateStats(results: BenchmarkResult[]): BenchmarkStats {
    if (results.length === 0) {
      return { avgRenderTime: 0, avgFPS: 0, minTime: 0, maxTime: 0, stdDev: 0 };
    }

    const times = results.map(r => r.renderTime);
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const avgFPS = results.filter(r => r.fps > 0).map(r => r.fps).reduce((a, b) => a + b, 0) /
                   results.filter(r => r.fps > 0).length || 0;

    const variance = times.reduce((sum, time) => sum + Math.pow(time - avgTime, 2), 0) / times.length;
    const stdDev = Math.sqrt(variance);

    return {
      avgRenderTime: avgTime,
      avgFPS: avgFPS,
      minTime: Math.min(...times),
      maxTime: Math.max(...times),
      stdDev
    };
  }

  private compareResults(webgpu: BenchmarkResult[], canvas: BenchmarkResult[]): PerformanceComparison {
    const webgpuStats = this.calculateStats(webgpu);
    const canvasStats = this.calculateStats(canvas);

    return {
      speedup: canvasStats.avgRenderTime > 0 ? webgpuStats.avgRenderTime / canvasStats.avgRenderTime : 0,
      fpsImprovement: webgpuStats.avgFPS - canvasStats.avgFPS,
      memoryEfficiency: 0, // Would need memory measurements
      consistency: Math.abs(webgpuStats.stdDev - canvasStats.stdDev)
    };
  }
}

interface BenchmarkResult {
  dataPoints: number;
  renderTime: number;
  memoryUsage: number;
  fps: number;
  totalTime: number;
  iterations?: number;
  rendererType: 'webgpu' | 'canvas';
  operation?: string;
}

interface BenchmarkStats {
  avgRenderTime: number;
  avgFPS: number;
  minTime: number;
  maxTime: number;
  stdDev: number;
}

interface PerformanceComparison {
  speedup: number;
  fpsImprovement: number;
  memoryEfficiency: number;
  consistency: number;
}

interface PerformanceReport {
  webgpu: BenchmarkStats;
  canvas: BenchmarkStats;
  comparison: PerformanceComparison;
}

// Re-export for convenience
export type { PerformanceMetrics } from '@/types/dashboard';