import { ExtendedPerformanceMetrics } from '@/hooks/usePerformanceMonitor';
import { WebGPUIntegration } from '@/lib/webgpu/webgpuIntegration';
import { DataPoint } from '@/types/dashboard';

export interface BenchmarkConfig {
  name: string;
  description: string;
  dataPoints: number[];
  duration: number; // seconds
  iterations: number;
  warmupIterations: number;
  rendererType: 'canvas' | 'webgpu' | 'both';
  metrics: ('fps' | 'memory' | 'renderTime' | 'dataProcessing' | 'gpu')[];
}

export interface BenchmarkResult {
  config: BenchmarkConfig;
  timestamp: number;
  results: {
    canvas?: RendererBenchmarkResult;
    webgpu?: RendererBenchmarkResult;
  };
  comparison?: BenchmarkComparison;
  recommendations: string[];
}

export interface RendererBenchmarkResult {
  averageFPS: number;
  minFPS: number;
  maxFPS: number;
  fpsStability: number; // coefficient of variation
  averageMemoryUsage: number;
  peakMemoryUsage: number;
  averageRenderTime: number;
  averageDataProcessingTime: number;
  gpuMemoryUsage?: number;
  gpuComputeTime?: number;
  frameDrops: number;
  totalFrames: number;
  samples: ExtendedPerformanceMetrics[];
}

export interface BenchmarkComparison {
  speedup: number; // webgpu vs canvas
  memoryEfficiency: number; // webgpu vs canvas
  stability: number; // webgpu vs canvas
  recommendations: string[];
}

export class PerformanceBenchmarkingSuite {
  private webgpuIntegration?: WebGPUIntegration;
  private results: BenchmarkResult[] = [];

  constructor(webgpuIntegration?: WebGPUIntegration) {
    this.webgpuIntegration = webgpuIntegration;
  }

  async runBenchmark(
    config: BenchmarkConfig,
    renderCallback: (data: DataPoint[], renderer: 'canvas' | 'webgpu') => Promise<void>,
    dataGenerator: (count: number) => DataPoint[]
  ): Promise<BenchmarkResult> {
    console.log(`Starting benchmark: ${config.name}`);

    const result: BenchmarkResult = {
      config,
      timestamp: Date.now(),
      results: {},
      recommendations: []
    };

    // Run benchmarks for each renderer type
    if (config.rendererType === 'canvas' || config.rendererType === 'both') {
      result.results.canvas = await this.runRendererBenchmark(
        config,
        'canvas',
        renderCallback,
        dataGenerator
      );
    }

    if (config.rendererType === 'webgpu' || config.rendererType === 'both') {
      if (this.webgpuIntegration?.isWebGPUSupported()) {
        result.results.webgpu = await this.runRendererBenchmark(
          config,
          'webgpu',
          renderCallback,
          dataGenerator
        );
      }
    }

    // Generate comparison if both renderers were tested
    if (result.results.canvas && result.results.webgpu) {
      result.comparison = this.compareResults(result.results.canvas, result.results.webgpu);
    }

    // Generate recommendations
    result.recommendations = this.generateRecommendations(result);

    this.results.push(result);
    return result;
  }

  private async runRendererBenchmark(
    config: BenchmarkConfig,
    renderer: 'canvas' | 'webgpu',
    renderCallback: (data: DataPoint[], renderer: 'canvas' | 'webgpu') => Promise<void>,
    dataGenerator: (count: number) => DataPoint[]
  ): Promise<RendererBenchmarkResult> {
    const samples: ExtendedPerformanceMetrics[] = [];
    let frameDrops = 0;
    let totalFrames = 0;

    // Warmup phase
    for (let i = 0; i < config.warmupIterations; i++) {
      const data = dataGenerator(config.dataPoints[0]);
      await renderCallback(data, renderer);
      await this.delay(16); // ~60fps
    }

    // Benchmark phase
    const startTime = performance.now();
    const endTime = startTime + (config.duration * 1000);

    for (const dataPointCount of config.dataPoints) {
      for (let iteration = 0; iteration < config.iterations; iteration++) {
        const iterationStart = performance.now();

        // Generate test data
        const data = dataGenerator(dataPointCount);

        // Measure rendering
        const renderStart = performance.now();
        await renderCallback(data, renderer);
        const renderEnd = performance.now();

        // Collect metrics
        const metrics = this.collectMetrics(renderer);
        metrics.renderTime = renderEnd - renderStart;

        samples.push(metrics);
        totalFrames++;

        // Check for frame drops (assuming 60fps target)
        const frameTime = performance.now() - iterationStart;
        if (frameTime > 16.67) { // More than one frame at 60fps
          frameDrops++;
        }

        // Wait for next frame
        const remainingTime = 16.67 - (performance.now() - iterationStart);
        if (remainingTime > 0) {
          await this.delay(remainingTime);
        }

        // Check if we've exceeded the benchmark duration
        if (performance.now() >= endTime) break;
      }
      if (performance.now() >= endTime) break;
    }

    // Calculate statistics
    const fpsValues = samples.map(s => s.fps);
    const memoryValues = samples.map(s => s.memoryUsage);
    const renderTimeValues = samples.map(s => s.renderTime);
    const dataProcessingValues = samples.map(s => s.dataProcessingTime);

    return {
      averageFPS: fpsValues.reduce((a, b) => a + b, 0) / fpsValues.length,
      minFPS: Math.min(...fpsValues),
      maxFPS: Math.max(...fpsValues),
      fpsStability: this.calculateCoefficientOfVariation(fpsValues),
      averageMemoryUsage: memoryValues.reduce((a, b) => a + b, 0) / memoryValues.length,
      peakMemoryUsage: Math.max(...memoryValues),
      averageRenderTime: renderTimeValues.reduce((a, b) => a + b, 0) / renderTimeValues.length,
      averageDataProcessingTime: dataProcessingValues.reduce((a, b) => a + b, 0) / dataProcessingValues.length,
      gpuMemoryUsage: samples[0]?.gpuMemoryUsage,
      gpuComputeTime: samples[0]?.computeTime,
      frameDrops,
      totalFrames,
      samples
    };
  }

  private collectMetrics(renderer: 'canvas' | 'webgpu'): ExtendedPerformanceMetrics {
    const baseMetrics: ExtendedPerformanceMetrics = {
      fps: 0, // Will be calculated from frame timing
      memoryUsage: (performance as any).memory?.usedJSHeapSize / 1024 / 1024 || 0,
      renderTime: 0, // Set by caller
      dataProcessingTime: 0,
      interactionLatency: 0,
      gpuMemoryUsage: 0,
      computeTime: 0,
      renderTimeGPU: 0,
      webgpuEnabled: renderer === 'webgpu',
      rendererType: renderer
    };

    if (renderer === 'webgpu' && this.webgpuIntegration) {
      const gpuMetrics = this.webgpuIntegration.getPerformanceMetrics();
      baseMetrics.gpuMemoryUsage = gpuMetrics.memoryStats?.totalPooledSize || 0;
      baseMetrics.computeTime = gpuMetrics.computeMetrics?.computeTime || 0;
      baseMetrics.renderTimeGPU = gpuMetrics.rendererMetrics?.gpuMemoryUsage || 0;
    }

    return baseMetrics;
  }

  private compareResults(canvas: RendererBenchmarkResult, webgpu: RendererBenchmarkResult): BenchmarkComparison {
    const speedup = webgpu.averageFPS / canvas.averageFPS;
    const memoryEfficiency = canvas.averageMemoryUsage / webgpu.averageMemoryUsage;
    const stability = canvas.fpsStability / webgpu.fpsStability; // Lower stability number is better

    const recommendations: string[] = [];

    if (speedup > 1.5) {
      recommendations.push('WebGPU provides significant performance improvement');
    } else if (speedup < 1.1) {
      recommendations.push('Performance difference minimal, consider Canvas for compatibility');
    }

    if (memoryEfficiency > 1.2) {
      recommendations.push('WebGPU more memory efficient');
    }

    if (stability > 1.5) {
      recommendations.push('WebGPU provides better frame rate stability');
    }

    return {
      speedup,
      memoryEfficiency,
      stability,
      recommendations
    };
  }

  private generateRecommendations(result: BenchmarkResult): string[] {
    const recommendations: string[] = [];

    if (result.results.canvas) {
      const canvas = result.results.canvas;
      if (canvas.averageFPS < 30) {
        recommendations.push('Canvas rendering too slow for smooth experience');
      }
      if (canvas.fpsStability > 0.2) {
        recommendations.push('Canvas frame rate unstable, consider LOD optimization');
      }
    }

    if (result.results.webgpu) {
      const webgpu = result.results.webgpu;
      if (webgpu.averageFPS < 50) {
        recommendations.push('WebGPU performance suboptimal, check GPU drivers');
      }
    }

    if (result.comparison) {
      if (result.comparison.speedup > 2) {
        recommendations.push('Strong recommendation for WebGPU implementation');
      } else if (result.comparison.speedup < 1.2) {
        recommendations.push('Consider hybrid approach or Canvas fallback');
      }
    }

    return recommendations;
  }

  private calculateCoefficientOfVariation(values: number[]): number {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    return stdDev / mean;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getResults(): BenchmarkResult[] {
    return [...this.results];
  }

  getLatestResult(): BenchmarkResult | null {
    return this.results.length > 0 ? this.results[this.results.length - 1] : null;
  }

  clearResults(): void {
    this.results = [];
  }

  exportResults(): string {
    return JSON.stringify({
      results: this.results,
      summary: this.generateSummary(),
      exportTimestamp: new Date().toISOString()
    }, null, 2);
  }

  private generateSummary(): any {
    if (this.results.length === 0) return null;

    const latest = this.results[this.results.length - 1];
    const summary = {
      totalBenchmarks: this.results.length,
      latestBenchmark: {
        name: latest.config.name,
        timestamp: new Date(latest.timestamp).toISOString(),
        canvas: latest.results.canvas ? {
          averageFPS: latest.results.canvas.averageFPS,
          stability: (1 - latest.results.canvas.fpsStability) * 100
        } : null,
        webgpu: latest.results.webgpu ? {
          averageFPS: latest.results.webgpu.averageFPS,
          stability: (1 - latest.results.webgpu.fpsStability) * 100
        } : null,
        comparison: latest.comparison ? {
          speedup: latest.comparison.speedup,
          recommendation: latest.comparison.speedup > 1.5 ? 'WebGPU' : 'Canvas'
        } : null
      }
    };

    return summary;
  }
}

// Predefined benchmark configurations
export const STANDARD_BENCHMARKS = {
  lightLoad: {
    name: 'Light Load Test',
    description: 'Performance with small dataset (1K points)',
    dataPoints: [1000],
    duration: 10,
    iterations: 3,
    warmupIterations: 5,
    rendererType: 'both' as const,
    metrics: ['fps', 'memory', 'renderTime'] as const
  },

  mediumLoad: {
    name: 'Medium Load Test',
    description: 'Performance with medium dataset (10K points)',
    dataPoints: [10000],
    duration: 15,
    iterations: 3,
    warmupIterations: 5,
    rendererType: 'both' as const,
    metrics: ['fps', 'memory', 'renderTime', 'dataProcessing'] as const
  },

  heavyLoad: {
    name: 'Heavy Load Test',
    description: 'Performance with large dataset (50K points)',
    dataPoints: [50000],
    duration: 20,
    iterations: 2,
    warmupIterations: 3,
    rendererType: 'both' as const,
    metrics: ['fps', 'memory', 'renderTime', 'dataProcessing', 'gpu'] as const
  },

  scalingTest: {
    name: 'Scaling Test',
    description: 'Performance scaling across different data sizes',
    dataPoints: [1000, 5000, 10000, 25000, 50000],
    duration: 30,
    iterations: 2,
    warmupIterations: 3,
    rendererType: 'both' as const,
    metrics: ['fps', 'memory', 'renderTime', 'dataProcessing', 'gpu'] as const
  },

  stressTest: {
    name: 'Stress Test',
    description: 'Maximum performance test with 100K points',
    dataPoints: [100000],
    duration: 30,
    iterations: 1,
    warmupIterations: 2,
    rendererType: 'both' as const,
    metrics: ['fps', 'memory', 'renderTime', 'dataProcessing', 'gpu'] as const
  }
};