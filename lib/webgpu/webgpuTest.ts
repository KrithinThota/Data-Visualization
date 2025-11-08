import { DataPoint, ChartConfig } from '@/types/dashboard';
import { WebGPUIntegration } from './webgpuIntegration';
import { WebGPUPerformanceBenchmark } from '@/hooks/usePerformanceMonitor';

/**
 * WebGPU Pipeline Test Suite
 * Comprehensive testing for WebGPU rendering and compute functionality
 */
export class WebGPUTestSuite {
  private webgpuIntegration: WebGPUIntegration;
  private canvas: HTMLCanvasElement;
  private testResults: TestResult[] = [];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.webgpuIntegration = new WebGPUIntegration();
  }

  /**
   * Run all WebGPU tests
   */
  async runAllTests(): Promise<TestSuiteResult> {
    console.log('Starting WebGPU test suite...');

    const results: TestSuiteResult = {
      initialization: await this.testInitialization(),
      basicRendering: await this.testBasicRendering(),
      computeShaders: await this.testComputeShaders(),
      memoryManagement: await this.testMemoryManagement(),
      performance: await this.testPerformance(),
      fallback: await this.testFallbackBehavior(),
      stressTest: await this.testStressTest()
    };

    console.log('WebGPU test suite completed');
    return results;
  }

  /**
   * Test WebGPU initialization
   */
  private async testInitialization(): Promise<TestResult> {
    const result: TestResult = {
      name: 'WebGPU Initialization',
      passed: false,
      duration: 0,
      error: null
    };

    const start = performance.now();

    try {
      const initialized = await this.webgpuIntegration.initialize(this.canvas);
      result.passed = initialized;
      result.duration = performance.now() - start;

      if (!initialized) {
        result.error = 'WebGPU initialization failed or fell back to Canvas 2D';
      }
    } catch (error) {
      result.error = error instanceof Error ? error.message : 'Unknown error';
      result.duration = performance.now() - start;
    }

    this.testResults.push(result);
    return result;
  }

  /**
   * Test basic rendering functionality
   */
  private async testBasicRendering(): Promise<TestResult> {
    const result: TestResult = {
      name: 'Basic Rendering',
      passed: false,
      duration: 0,
      error: null
    };

    const start = performance.now();

    try {
      const testData = this.generateTestData(100);
      const config: ChartConfig = {
        id: 'test-chart',
        type: 'line',
        dataKey: 'value',
        color: '#ff0000',
        visible: true
      };

      await this.webgpuIntegration.renderChart(testData, config);
      result.passed = true;
      result.duration = performance.now() - start;
    } catch (error) {
      result.error = error instanceof Error ? error.message : 'Unknown error';
      result.duration = performance.now() - start;
    }

    this.testResults.push(result);
    return result;
  }

  /**
   * Test compute shader functionality
   */
  private async testComputeShaders(): Promise<TestResult> {
    const result: TestResult = {
      name: 'Compute Shaders',
      passed: false,
      duration: 0,
      error: null
    };

    const start = performance.now();

    try {
      const testData = this.generateTestData(1000);

      // Test data aggregation
      const aggregated = await this.webgpuIntegration.processData('aggregate', testData, { bucketSize: 1000 });
      if (!Array.isArray(aggregated) || aggregated.length === 0) {
        throw new Error('Aggregation failed');
      }

      // Test data filtering
      const filtered = await this.webgpuIntegration.processData('filter', testData, { minValue: 25, maxValue: 75 });
      if (!Array.isArray(filtered)) {
        throw new Error('Filtering failed');
      }

      // Test moving average
      const smoothed = await this.webgpuIntegration.processData('movingAverage', testData, { windowSize: 5 });
      if (!Array.isArray(smoothed) || smoothed.length !== testData.length) {
        throw new Error('Moving average failed');
      }

      result.passed = true;
      result.duration = performance.now() - start;
    } catch (error) {
      result.error = error instanceof Error ? error.message : 'Unknown error';
      result.duration = performance.now() - start;
    }

    this.testResults.push(result);
    return result;
  }

  /**
   * Test memory management
   */
  private async testMemoryManagement(): Promise<TestResult> {
    const result: TestResult = {
      name: 'Memory Management',
      passed: false,
      duration: 0,
      error: null
    };

    const start = performance.now();

    try {
      const testData = this.generateTestData(500);

      // Test buffer allocation
      const buffer = this.webgpuIntegration.allocateGPUMemory(testData);
      if (!buffer) {
        throw new Error('Buffer allocation failed');
      }

      // Test data transfer
      const dataArray = new Float32Array(testData.length * 3);
      testData.forEach((point, i) => {
        dataArray[i * 3] = point.timestamp;
        dataArray[i * 3 + 1] = point.value;
        dataArray[i * 3 + 2] = point.category.charCodeAt(0) || 0;
      });

      await this.webgpuIntegration.transferToGPU(dataArray.buffer, buffer);

      // Test data retrieval
      const retrieved = await this.webgpuIntegration.transferFromGPU(buffer, dataArray.byteLength);
      if (retrieved.byteLength !== dataArray.byteLength) {
        throw new Error('Data transfer roundtrip failed');
      }

      result.passed = true;
      result.duration = performance.now() - start;
    } catch (error) {
      result.error = error instanceof Error ? error.message : 'Unknown error';
      result.duration = performance.now() - start;
    }

    this.testResults.push(result);
    return result;
  }

  /**
   * Test performance benchmarks
   */
  private async testPerformance(): Promise<TestResult> {
    const result: TestResult = {
      name: 'Performance Benchmarks',
      passed: false,
      duration: 0,
      error: null
    };

    const start = performance.now();

    try {
      const benchmark = new WebGPUPerformanceBenchmark(this.webgpuIntegration);

      // Test rendering performance
      const renderResult = await benchmark.runRenderBenchmark(1000, 5);
      if (renderResult.fps <= 0) {
        throw new Error('Rendering performance test failed');
      }

      // Test compute performance
      const computeResult = await benchmark.runComputeBenchmark('aggregate', 1000, 3);
      if (computeResult.renderTime <= 0) {
        throw new Error('Compute performance test failed');
      }

      // Generate performance report
      const report = benchmark.generateReport();
      result.metadata = { renderResult, computeResult, report };

      result.passed = true;
      result.duration = performance.now() - start;
    } catch (error) {
      result.error = error instanceof Error ? error.message : 'Unknown error';
      result.duration = performance.now() - start;
    }

    this.testResults.push(result);
    return result;
  }

  /**
   * Test fallback behavior
   */
  private async testFallbackBehavior(): Promise<TestResult> {
    const result: TestResult = {
      name: 'Fallback Behavior',
      passed: false,
      duration: 0,
      error: null
    };

    const start = performance.now();

    try {
      // Test should work regardless of WebGPU support
      const testData = this.generateTestData(50);
      const config: ChartConfig = {
        id: 'fallback-test',
        type: 'line',
        dataKey: 'value',
        color: '#00ff00',
        visible: true
      };

      await this.webgpuIntegration.renderChart(testData, config);

      // Check if we're using WebGPU or fallback
      const metrics = this.webgpuIntegration.getPerformanceMetrics();
      result.metadata = { usingWebGPU: metrics.gpuSupported };

      result.passed = true;
      result.duration = performance.now() - start;
    } catch (error) {
      result.error = error instanceof Error ? error.message : 'Unknown error';
      result.duration = performance.now() - start;
    }

    this.testResults.push(result);
    return result;
  }

  /**
   * Stress test with large datasets
   */
  private async testStressTest(): Promise<TestResult> {
    const result: TestResult = {
      name: 'Stress Test',
      passed: false,
      duration: 0,
      error: null
    };

    const start = performance.now();

    try {
      // Test with larger dataset
      const largeData = this.generateTestData(10000);
      const config: ChartConfig = {
        id: 'stress-test',
        type: 'line',
        dataKey: 'value',
        color: '#0000ff',
        visible: true
      };

      // Test rendering
      await this.webgpuIntegration.renderChart(largeData, config);

      // Test compute operations on large dataset
      const aggregated = await this.webgpuIntegration.processData('aggregate', largeData, { bucketSize: 1000 });
      if (!Array.isArray(aggregated)) {
        throw new Error('Large dataset aggregation failed');
      }

      result.metadata = { dataPoints: largeData.length, aggregatedBuckets: aggregated.length };
      result.passed = true;
      result.duration = performance.now() - start;
    } catch (error) {
      result.error = error instanceof Error ? error.message : 'Unknown error';
      result.duration = performance.now() - start;
    }

    this.testResults.push(result);
    return result;
  }

  /**
   * Generate test data for testing
   */
  private generateTestData(count: number): DataPoint[] {
    const data: DataPoint[] = [];
    const now = Date.now();

    for (let i = 0; i < count; i++) {
      data.push({
        timestamp: now + (i * 100),
        value: Math.sin(i / 10) * 50 + Math.random() * 10 + 50, // Values between 0-100
        category: ['A', 'B', 'C'][Math.floor(Math.random() * 3)],
        metadata: { source: 'test' }
      });
    }

    return data;
  }

  /**
   * Get test results
   */
  getTestResults(): TestResult[] {
    return [...this.testResults];
  }

  /**
   * Generate test report
   */
  generateReport(): TestReport {
    const passed = this.testResults.filter(r => r.passed).length;
    const failed = this.testResults.filter(r => !r.passed).length;
    const totalTime = this.testResults.reduce((sum, r) => sum + r.duration, 0);

    return {
      summary: {
        totalTests: this.testResults.length,
        passed,
        failed,
        successRate: (passed / this.testResults.length) * 100,
        totalTime
      },
      results: this.testResults,
      webgpuSupported: this.webgpuIntegration.isWebGPUSupported(),
      recommendations: this.generateRecommendations()
    };
  }

  /**
   * Generate recommendations based on test results
   */
  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    const failedTests = this.testResults.filter(r => !r.passed);

    if (failedTests.length > 0) {
      recommendations.push(`${failedTests.length} tests failed. Check error messages for details.`);
    }

    const webgpuSupported = this.webgpuIntegration.isWebGPUSupported();
    if (!webgpuSupported) {
      recommendations.push('WebGPU not supported. Application will use Canvas 2D fallback.');
      recommendations.push('Consider checking browser compatibility for WebGPU features.');
    }

    const performanceTest = this.testResults.find(r => r.name === 'Performance Benchmarks');
    if (performanceTest && performanceTest.metadata) {
      const renderResult = performanceTest.metadata.renderResult;
      if (renderResult.fps < 30) {
        recommendations.push(`Low rendering performance (${renderResult.fps} FPS). Consider optimizing shaders or reducing data density.`);
      }
    }

    return recommendations;
  }

  /**
   * Cleanup test resources
   */
  destroy(): void {
    this.webgpuIntegration.destroy();
    this.testResults = [];
  }
}

/**
 * Individual test result
 */
export interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  error: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: any;
}

/**
 * Test suite result
 */
export interface TestSuiteResult {
  initialization: TestResult;
  basicRendering: TestResult;
  computeShaders: TestResult;
  memoryManagement: TestResult;
  performance: TestResult;
  fallback: TestResult;
  stressTest: TestResult;
}

/**
 * Complete test report
 */
export interface TestReport {
  summary: {
    totalTests: number;
    passed: number;
    failed: number;
    successRate: number;
    totalTime: number;
  };
  results: TestResult[];
  webgpuSupported: boolean;
  recommendations: string[];
}

/**
 * WebGPU Pipeline Validator
 * Validates that the WebGPU pipeline is working correctly
 */
export class WebGPUPipelineValidator {
  private webgpuIntegration: WebGPUIntegration;

  constructor(webgpuIntegration: WebGPUIntegration) {
    this.webgpuIntegration = webgpuIntegration;
  }

  /**
   * Validate the entire WebGPU pipeline
   */
  async validatePipeline(): Promise<ValidationResult> {
    const result: ValidationResult = {
      valid: true,
      checks: [],
      errors: []
    };

    // Check WebGPU support
    const supported = this.webgpuIntegration.isWebGPUSupported();
    result.checks.push({
      name: 'WebGPU Support',
      passed: supported,
      message: supported ? 'WebGPU is supported and initialized' : 'WebGPU not supported, using fallback'
    });

    if (!supported) {
      result.valid = false;
      result.errors.push('WebGPU not supported');
      return result;
    }

    // Validate rendering pipeline
    try {
      const testData = this.generateValidationData();
      const config: ChartConfig = {
        id: 'validation',
        type: 'line',
        dataKey: 'value',
        color: '#ff0000',
        visible: true
      };

      await this.webgpuIntegration.renderChart(testData, config);
      result.checks.push({
        name: 'Rendering Pipeline',
        passed: true,
        message: 'Rendering pipeline working correctly'
      });
    } catch (error) {
      result.checks.push({
        name: 'Rendering Pipeline',
        passed: false,
        message: `Rendering failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
      result.valid = false;
      result.errors.push('Rendering pipeline validation failed');
    }

    // Validate compute pipeline
    try {
      const testData = this.generateValidationData();
      const aggregated = await this.webgpuIntegration.processData('aggregate', testData, { bucketSize: 1000 });

      if (Array.isArray(aggregated) && aggregated.length > 0) {
        result.checks.push({
          name: 'Compute Pipeline',
          passed: true,
          message: 'Compute pipeline working correctly'
        });
      } else {
        throw new Error('Invalid aggregation result');
      }
    } catch (error) {
      result.checks.push({
        name: 'Compute Pipeline',
        passed: false,
        message: `Compute pipeline failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
      result.valid = false;
      result.errors.push('Compute pipeline validation failed');
    }

    // Validate memory management
    try {
      const testData = this.generateValidationData();
      const buffer = this.webgpuIntegration.allocateGPUMemory(testData);

      if (buffer) {
        result.checks.push({
          name: 'Memory Management',
          passed: true,
          message: 'Memory management working correctly'
        });
      } else {
        throw new Error('Buffer allocation failed');
      }
    } catch (error) {
      result.checks.push({
        name: 'Memory Management',
        passed: false,
        message: `Memory management failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
      result.valid = false;
      result.errors.push('Memory management validation failed');
    }

    return result;
  }

  /**
   * Generate validation test data
   */
  private generateValidationData(): DataPoint[] {
    return [
      { timestamp: Date.now(), value: 10, category: 'A', metadata: {} },
      { timestamp: Date.now() + 1000, value: 20, category: 'B', metadata: {} },
      { timestamp: Date.now() + 2000, value: 30, category: 'C', metadata: {} },
      { timestamp: Date.now() + 3000, value: 25, category: 'A', metadata: {} },
      { timestamp: Date.now() + 4000, value: 35, category: 'B', metadata: {} }
    ];
  }
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  checks: ValidationCheck[];
  errors: string[];
}

/**
 * Individual validation check
 */
export interface ValidationCheck {
  name: string;
  passed: boolean;
  message: string;
}