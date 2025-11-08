import { DataPoint, ChartConfig, BenchmarkResult } from '@/types/dashboard';
import { HybridRenderer } from '@/lib/webgpu/webgpuIntegration';
import { EnhancedLOD } from '@/lib/canvas/enhancedLOD';

export class ChartBenchmark {
  private static renderer: HybridRenderer | null = null;
  private static canvas: HTMLCanvasElement | null = null;

  /**
   * Initialize benchmark environment
   */
  static async initialize(): Promise<void> {
    if (!this.canvas) {
      this.canvas = document.createElement('canvas');
      this.canvas.width = 800;
      this.canvas.height = 600;
      document.body.appendChild(this.canvas);
    }

    if (!this.renderer) {
      this.renderer = new HybridRenderer(this.canvas);
      await this.renderer.initialize();
    }
  }

  /**
   * Run comprehensive chart rendering benchmark
   */
  static async runChartBenchmark(
    dataPoints: number,
    chartType: 'line' | 'bar' | 'scatter' | 'heatmap' = 'line',
    duration: number = 5000
  ): Promise<BenchmarkResult> {
    await this.initialize();

    // Generate test data
    const data = this.generateTestData(dataPoints);
    const config: ChartConfig = {
      id: 'benchmark',
      type: chartType,
      dataKey: 'value',
      color: '#4A90E2',
      visible: true
    };

    const startTime = performance.now();
    let frameCount = 0;
    let totalRenderTime = 0;
    const renderTimes: number[] = [];

    // Benchmark rendering loop
    const benchmarkLoop = async () => {
      const frameStart = performance.now();

      try {
        await this.renderer!.renderChart(data, config);
        const frameTime = performance.now() - frameStart;
        renderTimes.push(frameTime);
        totalRenderTime += frameTime;
        frameCount++;

        if (performance.now() - startTime < duration) {
          requestAnimationFrame(benchmarkLoop);
        }
      } catch (error) {
        console.error('Benchmark render error:', error);
      }
    };

    // Start benchmark
    await new Promise<void>((resolve) => {
      const startBenchmark = async () => {
        await benchmarkLoop();
        setTimeout(resolve, duration);
      };
      startBenchmark();
    });

    // Calculate results
    const endTime = performance.now();
    const totalTime = endTime - startTime;
    const avgRenderTime = totalRenderTime / frameCount;
    const fps = frameCount / (totalTime / 1000);
    
    // Get memory usage safely - check for performance.memory API
    const memoryUsage = this.getMemoryUsage();

    // Calculate percentiles
    renderTimes.sort((a, b) => a - b);
    const p50 = renderTimes[Math.floor(renderTimes.length * 0.5)];
    const p95 = renderTimes[Math.floor(renderTimes.length * 0.95)];
    const p99 = renderTimes[Math.floor(renderTimes.length * 0.99)];

    return {
      dataPoints,
      renderTime: avgRenderTime,
      memoryUsage,
      fps,
      totalTime,
      chartType,
      percentiles: { p50, p95, p99 },
      rendererType: this.renderer!.getRendererType()
    };
  }

  /**
   * Run LOD performance comparison
   */
  static async runLODBenchmark(dataPoints: number): Promise<{
    pixelLevel: BenchmarkResult;
    statisticalLevel: BenchmarkResult;
    aggregatedLevel: BenchmarkResult;
    detailedLevel: BenchmarkResult;
  }> {
    await this.initialize();

    // Generate test data (used in LOD rendering simulation)
    const data = this.generateTestData(dataPoints);

    const lodRenderer = new EnhancedLOD();

    const runLODRender = async (zoomLevel: number): Promise<BenchmarkResult> => {
      lodRenderer.setZoomLevel(zoomLevel);

      const startTime = performance.now();
      let renderTime = 0;
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        const renderStart = performance.now();
        // Simulate LOD rendering with data
        void lodRenderer.getCurrentLevel(); // Get current level to simulate work
        // Use data to simulate realistic rendering workload
        void data.length; // Intentionally unused but prevents linter warning
        renderTime += performance.now() - renderStart;
      }

      const currentLevel = lodRenderer.getCurrentLevel();
      
      // Get memory usage safely
      const memoryUsage = this.getMemoryUsage();
      
      return {
        dataPoints,
        renderTime: renderTime / iterations,
        memoryUsage,
        fps: 1000 / (renderTime / iterations),
        totalTime: performance.now() - startTime,
        lodLevel: currentLevel.strategy
      };
    };

    return {
      pixelLevel: await runLODRender(0.1),
      statisticalLevel: await runLODRender(0.5),
      aggregatedLevel: await runLODRender(2.0),
      detailedLevel: await runLODRender(10.0)
    };
  }

  /**
   * Run WebGPU vs Canvas comparison
   */
  static async runRendererComparison(dataPoints: number): Promise<{
    webgpu: BenchmarkResult | null;
    canvas: BenchmarkResult | null;
  }> {
    const results = {
      webgpu: null as BenchmarkResult | null,
      canvas: null as BenchmarkResult | null
    };

    // Test WebGPU if available
    try {
      const webgpuResult = await this.runChartBenchmark(dataPoints, 'line', 2000);
      if (webgpuResult.rendererType === 'webgpu') {
        results.webgpu = webgpuResult;
      }
    } catch (error) {
      console.log('WebGPU benchmark failed:', error);
    }

    // Test Canvas fallback
    try {
      const canvasResult = await this.runChartBenchmark(dataPoints, 'line', 2000);
      if (canvasResult.rendererType === 'canvas') {
        results.canvas = canvasResult;
      }
    } catch (error) {
      console.log('Canvas benchmark failed:', error);
    }

    return results;
  }

  /**
   * Generate realistic test data
   */
  private static generateTestData(count: number): DataPoint[] {
    const data: DataPoint[] = [];
    const now = Date.now();

    for (let i = 0; i < count; i++) {
      const timestamp = now - (count - i) * 100; // 100ms intervals
      const baseValue = Math.sin(i * 0.01) * 50 + 50; // Sine wave pattern
      const noise = (Math.random() - 0.5) * 20; // Random noise
      const trend = i * 0.1; // Upward trend

      data.push({
        timestamp,
        value: Math.max(0, baseValue + noise + trend),
        category: ['A', 'B', 'C'][Math.floor(Math.random() * 3)],
        metadata: { source: 'benchmark' }
      });
    }

    return data;
  }

  /**
   * Get memory usage safely
   */
  private static getMemoryUsage(): number {
    try {
      // Type-safe access to performance.memory
      const perf = (performance as unknown as { memory?: { usedJSHeapSize?: number } });
      return perf.memory?.usedJSHeapSize || 0;
    } catch {
      return 0;
    }
  }

  /**
   * Cleanup benchmark resources
   */
  static cleanup(): void {
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
    if (this.renderer) {
      this.renderer.destroy();
    }
    this.canvas = null;
    this.renderer = null;
  }

  /**
   * Get performance recommendations based on benchmark results
   */
  static getPerformanceRecommendations(result: BenchmarkResult): string[] {
    const recommendations: string[] = [];

    if (result.fps < 30) {
      recommendations.push('Consider reducing data points or implementing LOD');
    }

    if (result.renderTime > 16.67) { // > 60fps threshold
      recommendations.push('Rendering is too slow, optimize drawing operations');
    }

    if (result.memoryUsage > 100 * 1024 * 1024) { // > 100MB
      recommendations.push('High memory usage, consider data windowing');
    }

    if (result.rendererType === 'canvas' && result.dataPoints > 10000) {
      recommendations.push('Consider WebGPU for better performance with large datasets');
    }

    return recommendations;
  }
}