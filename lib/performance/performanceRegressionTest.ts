import { ExtendedPerformanceMetrics } from '@/hooks/usePerformanceMonitor';

export interface RegressionTestConfig {
  baselineMetrics: ExtendedPerformanceMetrics;
  tolerancePercent: number;
  testDuration: number; // seconds
  sampleInterval: number; // milliseconds
  criticalThresholds: {
    fps: number;
    memoryUsage: number;
    renderTime: number;
  };
}

export interface BenchmarkResult {
  dataPoints: number;
  renderTime: number;
  memoryUsage: number;
  fps: number;
  totalTime: number;
  iterations?: number;
  rendererType: 'webgpu' | 'canvas';
  operation?: string;
}

export interface RegressionTestResult {
  passed: boolean;
  violations: RegressionViolation[];
  summary: {
    averageFPS: number;
    peakMemoryUsage: number;
    averageRenderTime: number;
    stabilityScore: number;
  };
  benchmarkResults: BenchmarkResult[];
  timestamp: number;
}

export interface RegressionViolation {
  type: 'fps' | 'memory' | 'render_time' | 'stability';
  severity: 'critical' | 'warning' | 'info';
  message: string;
  actualValue: number;
  expectedValue: number;
  deviation: number;
  timestamp: number;
}

export class PerformanceRegressionTest {
  private config: RegressionTestConfig;
  private metricsHistory: ExtendedPerformanceMetrics[] = [];
  private isRunning = false;
  private startTime = 0;

  constructor(config: RegressionTestConfig) {
    this.config = config;
  }

  async runTest(
    metricsCallback: () => ExtendedPerformanceMetrics,
    benchmarkCallback?: () => Promise<BenchmarkResult[]>
  ): Promise<RegressionTestResult> {
    if (this.isRunning) {
      throw new Error('Regression test already running');
    }

    this.isRunning = true;
    this.startTime = Date.now();
    this.metricsHistory = [];

    try {
      // Collect metrics over test duration
      const endTime = this.startTime + (this.config.testDuration * 1000);
      const samples: ExtendedPerformanceMetrics[] = [];

      while (Date.now() < endTime) {
        const metrics = metricsCallback();
        samples.push(metrics);
        this.metricsHistory.push(metrics);
        await this.delay(this.config.sampleInterval);
      }

      // Run benchmarks if provided
      let benchmarkResults: BenchmarkResult[] = [];
      if (benchmarkCallback) {
        benchmarkResults = await benchmarkCallback();
      }

      // Analyze results
      const result = this.analyzeResults(samples, benchmarkResults);
      return result;

    } finally {
      this.isRunning = false;
    }
  }

  private analyzeResults(
    samples: ExtendedPerformanceMetrics[],
    benchmarkResults?: BenchmarkResult[]
  ): RegressionTestResult {
    const violations: RegressionViolation[] = [];

    // Calculate summary statistics
    const fpsValues = samples.map(s => s.fps);
    const memoryValues = samples.map(s => s.memoryUsage);
    const renderTimeValues = samples.map(s => s.renderTime);

    const averageFPS = fpsValues.reduce((a, b) => a + b, 0) / fpsValues.length;
    const peakMemoryUsage = Math.max(...memoryValues);
    const averageRenderTime = renderTimeValues.reduce((a, b) => a + b, 0) / renderTimeValues.length;

    // Calculate stability (coefficient of variation)
    const fpsStdDev = this.calculateStandardDeviation(fpsValues);
    const stabilityScore = (fpsStdDev / averageFPS) * 100; // Lower is better

    // Check FPS regression
    const fpsDeviation = ((this.config.baselineMetrics.fps - averageFPS) / this.config.baselineMetrics.fps) * 100;
    if (Math.abs(fpsDeviation) > this.config.tolerancePercent) {
      const severity = averageFPS < this.config.criticalThresholds.fps ? 'critical' : 'warning';
      violations.push({
        type: 'fps',
        severity,
        message: `FPS ${fpsDeviation > 0 ? 'decreased' : 'increased'} by ${Math.abs(fpsDeviation).toFixed(1)}%`,
        actualValue: averageFPS,
        expectedValue: this.config.baselineMetrics.fps,
        deviation: fpsDeviation,
        timestamp: Date.now()
      });
    }

    // Check memory regression
    const memoryDeviation = ((peakMemoryUsage - this.config.baselineMetrics.memoryUsage) / this.config.baselineMetrics.memoryUsage) * 100;
    if (memoryDeviation > this.config.tolerancePercent) {
      const severity = peakMemoryUsage > this.config.criticalThresholds.memoryUsage ? 'critical' : 'warning';
      violations.push({
        type: 'memory',
        severity,
        message: `Memory usage increased by ${memoryDeviation.toFixed(1)}%`,
        actualValue: peakMemoryUsage,
        expectedValue: this.config.baselineMetrics.memoryUsage,
        deviation: memoryDeviation,
        timestamp: Date.now()
      });
    }

    // Check render time regression
    const renderTimeDeviation = ((averageRenderTime - this.config.baselineMetrics.renderTime) / this.config.baselineMetrics.renderTime) * 100;
    if (renderTimeDeviation > this.config.tolerancePercent) {
      const severity = averageRenderTime > this.config.criticalThresholds.renderTime ? 'critical' : 'warning';
      violations.push({
        type: 'render_time',
        severity,
        message: `Render time ${renderTimeDeviation > 0 ? 'increased' : 'decreased'} by ${Math.abs(renderTimeDeviation).toFixed(1)}%`,
        actualValue: averageRenderTime,
        expectedValue: this.config.baselineMetrics.renderTime,
        deviation: renderTimeDeviation,
        timestamp: Date.now()
      });
    }

    // Check stability
    if (stabilityScore > 10) { // More than 10% variation
      violations.push({
        type: 'stability',
        severity: stabilityScore > 20 ? 'critical' : 'warning',
        message: `Performance instability detected (${stabilityScore.toFixed(1)}% variation)`,
        actualValue: stabilityScore,
        expectedValue: 5, // Expected < 5% variation
        deviation: stabilityScore - 5,
        timestamp: Date.now()
      });
    }

    const passed = violations.filter(v => v.severity === 'critical').length === 0;

    return {
      passed,
      violations,
      summary: {
        averageFPS,
        peakMemoryUsage,
        averageRenderTime,
        stabilityScore
      },
      benchmarkResults,
      timestamp: Date.now()
    };
  }

  private calculateStandardDeviation(values: number[]): number {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squareDiffs = values.map(value => Math.pow(value - mean, 2));
    const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / squareDiffs.length;
    return Math.sqrt(avgSquareDiff);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getMetricsHistory(): ExtendedPerformanceMetrics[] {
    return [...this.metricsHistory];
  }

  isTestRunning(): boolean {
    return this.isRunning;
  }

  stopTest(): void {
    this.isRunning = false;
  }
}

export class PerformanceRegressionTestSuite {
  private tests: Map<string, PerformanceRegressionTest> = new Map();
  private results: Map<string, RegressionTestResult[]> = new Map();

  addTest(name: string, config: RegressionTestConfig): void {
    this.tests.set(name, new PerformanceRegressionTest(config));
  }

  async runTestSuite(
    testName: string,
    metricsCallback: () => ExtendedPerformanceMetrics,
    benchmarkCallback?: () => Promise<BenchmarkResult[]>
  ): Promise<RegressionTestResult> {
    const test = this.tests.get(testName);
    if (!test) {
      throw new Error(`Test '${testName}' not found`);
    }

    const result = await test.runTest(metricsCallback, benchmarkCallback);

    // Store result
    if (!this.results.has(testName)) {
      this.results.set(testName, []);
    }
    this.results.get(testName)!.push(result);

    return result;
  }

  async runAllTests(
    metricsCallback: () => ExtendedPerformanceMetrics,
    benchmarkCallback?: () => Promise<BenchmarkResult[]>
  ): Promise<Map<string, RegressionTestResult>> {
    const results = new Map<string, RegressionTestResult>();

    for (const [testName] of this.tests) {
      try {
        const result = await this.runTestSuite(testName, metricsCallback, benchmarkCallback);
        results.set(testName, result);
      } catch (error) {
        console.error(`Failed to run test '${testName}':`, error);
      }
    }

    return results;
  }

  getTestResults(testName?: string): RegressionTestResult[] {
    if (testName) {
      return this.results.get(testName) || [];
    }

    const allResults: RegressionTestResult[] = [];
    for (const results of this.results.values()) {
      allResults.push(...results);
    }
    return allResults.sort((a, b) => b.timestamp - a.timestamp);
  }

  getTestSummary(): { totalTests: number; passedTests: number; failedTests: number; averageStability: number } {
    const allResults = this.getTestResults();
    const passedTests = allResults.filter(r => r.passed).length;
    const failedTests = allResults.length - passedTests;
    const averageStability = allResults.length > 0
      ? allResults.reduce((sum, r) => sum + r.summary.stabilityScore, 0) / allResults.length
      : 0;

    return {
      totalTests: allResults.length,
      passedTests,
      failedTests,
      averageStability
    };
  }

  clearResults(): void {
    this.results.clear();
  }

  exportResults(): string {
    const summary = this.getTestSummary();
    const results = this.getTestResults();

    return JSON.stringify({
      summary,
      results: results.map(r => ({
        ...r,
        violations: r.violations.map(v => ({
          ...v,
          timestamp: new Date(v.timestamp).toISOString()
        }))
      })),
      exportTimestamp: new Date().toISOString()
    }, null, 2);
  }
}

// Default test configurations
export const DEFAULT_REGRESSION_CONFIGS = {
  standard: {
    baselineMetrics: {
      fps: 60,
      memoryUsage: 50,
      renderTime: 8,
      dataProcessingTime: 2,
      interactionLatency: 5,
      gpuMemoryUsage: 0,
      computeTime: 1,
      renderTimeGPU: 0,
      webgpuEnabled: false,
      rendererType: 'canvas' as const
    },
    tolerancePercent: 10,
    testDuration: 30,
    sampleInterval: 1000,
    criticalThresholds: {
      fps: 30,
      memoryUsage: 100,
      renderTime: 16.67
    }
  },

  performance: {
    baselineMetrics: {
      fps: 55,
      memoryUsage: 75,
      renderTime: 12,
      dataProcessingTime: 3,
      interactionLatency: 8,
      gpuMemoryUsage: 128 * 1024 * 1024, // 128MB
      computeTime: 2,
      renderTimeGPU: 5,
      webgpuEnabled: true,
      rendererType: 'webgpu' as const
    },
    tolerancePercent: 15,
    testDuration: 60,
    sampleInterval: 500,
    criticalThresholds: {
      fps: 45,
      memoryUsage: 150,
      renderTime: 22
    }
  }
};