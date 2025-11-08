import { DataPoint, ChartConfig } from '@/types/dashboard';
import { WebGPURenderer } from './webgpuRenderer';
import { ComputeProcessor } from './computeProcessor';
import { GPUMemoryManager, DirectGPUMemory } from './gpuMemoryManager';

declare global {
  interface Navigator {
    gpu?: GPU;
  }
}

/**
 * WebGPU Integration Layer
 * Provides unified interface for WebGPU rendering and compute operations
 * with automatic fallback to Canvas 2D when WebGPU is not available
 */
export class WebGPUIntegration {
  private renderer: WebGPURenderer | null = null;
  private computeProcessor: ComputeProcessor | null = null;
  private memoryManager: GPUMemoryManager | null = null;
  private directMemory: DirectGPUMemory | null = null;
  private initialized = false;
  private webgpuSupported = false;

  /**
   * Initialize WebGPU integration
   */
  async initialize(canvas: HTMLCanvasElement): Promise<boolean> {
    try {
      // Check WebGPU support
      this.webgpuSupported = WebGPURenderer.isSupported() && ComputeProcessor.isSupported();

      if (!this.webgpuSupported) {
        console.log('WebGPU not supported, using Canvas 2D fallback');
        return false;
      }

      // Initialize WebGPU renderer
      this.renderer = new WebGPURenderer(canvas);
      const rendererInitialized = await this.renderer.initialize();

      if (!rendererInitialized) {
        console.warn('WebGPU renderer initialization failed, falling back to Canvas 2D');
        return false;
      }

      // Initialize compute processor
      this.computeProcessor = new ComputeProcessor();
      const computeInitialized = await this.computeProcessor.initialize();

      if (!computeInitialized) {
        console.warn('WebGPU compute processor initialization failed');
      }

      // Initialize memory management
      this.memoryManager = new GPUMemoryManager();
      await this.memoryManager.initialize(this.renderer['device']!);

      // Initialize direct memory access
      this.directMemory = DirectGPUMemory.getInstance();
      await this.directMemory.initialize(this.renderer['device']!);

      this.initialized = true;
      console.log('WebGPU integration initialized successfully');
      return true;

    } catch (error) {
      console.error('WebGPU integration initialization failed:', error);
      return false;
    }
  }

  /**
   * Render chart data using WebGPU or fallback
   */
  async renderChart(data: DataPoint[], config: ChartConfig): Promise<void> {
    if (!this.initialized || !this.renderer) {
      throw new Error('WebGPU integration not initialized');
    }

    await this.renderer.renderLineChart(data, config);
  }

  /**
   * Process data using GPU compute shaders
   */
  async processData(
    operation: 'aggregate' | 'filter' | 'movingAverage',
    data: DataPoint[],
    params: Record<string, unknown>
  ): Promise<unknown> {
    if (!this.initialized || !this.computeProcessor) {
      throw new Error('WebGPU compute not available');
    }

    switch (operation) {
      case 'aggregate':
        return this.computeProcessor.aggregateData(data, params.bucketSize as number);

      case 'filter':
        return this.computeProcessor.filterData(data, params.minValue as number, params.maxValue as number);

      case 'movingAverage':
        return this.computeProcessor.movingAverage(data, params.windowSize as number);

      default:
        throw new Error(`Unknown compute operation: ${operation}`);
    }
  }

  /**
   * Allocate GPU memory for data
   */
  allocateGPUMemory(data: DataPoint[]): GPUBuffer {
    if (!this.directMemory) {
      throw new Error('Direct GPU memory access not initialized');
    }

    return this.directMemory.allocateDataMemory(data);
  }

  /**
   * Transfer data to GPU memory
   */
  async transferToGPU(data: ArrayBuffer, buffer: GPUBuffer, offset: number = 0): Promise<void> {
    if (!this.memoryManager) {
      throw new Error('GPU memory manager not initialized');
    }

    await this.memoryManager.transferToGPU(data, buffer, offset);
  }

  /**
   * Transfer data from GPU memory
   */
  async transferFromGPU(buffer: GPUBuffer, size: number, offset: number = 0): Promise<ArrayBuffer> {
    if (!this.memoryManager) {
      throw new Error('GPU memory manager not initialized');
    }

    return this.memoryManager.readFromGPU(buffer, size, offset);
  }

  /**
   * Stream data to GPU for real-time updates
   */
  streamDataToGPU(buffer: GPUBuffer, data: DataPoint[], startIndex: number = 0): void {
    if (!this.memoryManager) {
      throw new Error('GPU memory manager not initialized');
    }

    this.memoryManager.uploadStreamingData(buffer, data, startIndex);
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): {
    gpuSupported: boolean;
    rendererMetrics: { gpuMemoryUsage?: number } | null;
    computeMetrics: { computeTime?: number } | null;
    memoryStats: { totalPooledSize?: number; pooledBuffers?: number } | null;
  } {
    return {
      gpuSupported: this.webgpuSupported,
      rendererMetrics: this.renderer?.getPerformanceMetrics() || null,
      computeMetrics: this.computeProcessor?.getPerformanceMetrics() || null,
      memoryStats: this.memoryManager?.getMemoryStats() || null
    };
  }

  /**
   * Check if WebGPU is supported and initialized
   */
  isWebGPUSupported(): boolean {
    return this.webgpuSupported && this.initialized;
  }

  /**
   * Get renderer instance for direct access
   */
  getRenderer(): WebGPURenderer | null {
    return this.renderer;
  }

  /**
   * Get compute processor instance
   */
  getComputeProcessor(): ComputeProcessor | null {
    return this.computeProcessor;
  }

  /**
   * Get memory manager instance
   */
  getMemoryManager(): GPUMemoryManager | null {
    return this.memoryManager;
  }

  /**
   * Cleanup all WebGPU resources
   */
  destroy(): void {
    if (this.renderer) {
      this.renderer.destroy();
      this.renderer = null;
    }

    if (this.computeProcessor) {
      this.computeProcessor.destroy();
      this.computeProcessor = null;
    }

    if (this.memoryManager) {
      this.memoryManager.destroy();
      this.memoryManager = null;
    }

    this.directMemory = null;
    this.initialized = false;
    this.webgpuSupported = false;
  }
}

/**
 * WebGPU Feature Detection and Fallback Manager
 */
export class WebGPUFeatureDetector {
  private static instance: WebGPUFeatureDetector;
  private features: Map<string, boolean> = new Map();

  static getInstance(): WebGPUFeatureDetector {
    if (!WebGPUFeatureDetector.instance) {
      WebGPUFeatureDetector.instance = new WebGPUFeatureDetector();
    }
    return WebGPUFeatureDetector.instance;
  }

  /**
   * Detect WebGPU support and capabilities
   */
  async detectFeatures(): Promise<WebGPUCapabilities> {
    const capabilities: WebGPUCapabilities = {
      webgpu: false,
      computeShaders: false,
      renderPipelines: false,
      sharedMemory: false,
      highPerformanceGPU: false,
      fallbackRequired: true
    };

    try {
      // Basic WebGPU support
      capabilities.webgpu = 'gpu' in navigator;

      if (!capabilities.webgpu) {
        this.features.set('webgpu', false);
        return capabilities;
      }

      // Request adapter to check capabilities
      const adapter = await navigator.gpu!.requestAdapter({
        powerPreference: 'high-performance'
      });

      if (!adapter) {
        this.features.set('webgpu', false);
        return capabilities;
      }

      // Check compute shader support
      capabilities.computeShaders = adapter.features.has('shader-f16') ||
                                    adapter.features.has('timestamp-query') ||
                                    true; // Assume basic compute support

      // Check render pipeline support
      capabilities.renderPipelines = true; // Basic WebGPU includes render pipelines

      // Check shared memory support
      capabilities.sharedMemory = 'SharedArrayBuffer' in window;

      // Check for high-performance GPU
      capabilities.highPerformanceGPU = true; // Simplified check

      // Determine if fallback is required
      capabilities.fallbackRequired = !capabilities.computeShaders ||
                                     !capabilities.renderPipelines;

      // Cache results
      this.features.set('webgpu', capabilities.webgpu);
      this.features.set('computeShaders', capabilities.computeShaders);
      this.features.set('renderPipelines', capabilities.renderPipelines);
      this.features.set('sharedMemory', capabilities.sharedMemory);
      this.features.set('highPerformanceGPU', capabilities.highPerformanceGPU);

      return capabilities;

    } catch (error) {
      console.error('WebGPU feature detection failed:', error);
      return capabilities;
    }
  }

  /**
   * Check if specific feature is supported
   */
  isFeatureSupported(feature: string): boolean {
    return this.features.get(feature) || false;
  }

  /**
   * Get all detected features
   */
  getAllFeatures(): Record<string, boolean> {
    return Object.fromEntries(this.features);
  }

  /**
   * Clear cached feature detection results
   */
  clearCache(): void {
    this.features.clear();
  }
}

/**
 * WebGPU capabilities interface
 */
export interface WebGPUCapabilities {
  webgpu: boolean;
  computeShaders: boolean;
  renderPipelines: boolean;
  sharedMemory: boolean;
  highPerformanceGPU: boolean;
  fallbackRequired: boolean;
}

/**
 * Hybrid Renderer that automatically chooses between WebGPU and Canvas 2D
 */
export class HybridRenderer {
  private webgpuIntegration: WebGPUIntegration | null = null;
  private canvasRenderer: CanvasRenderer | null = null;
  private canvas: HTMLCanvasElement;
  private usingWebGPU = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  /**
   * Initialize with automatic fallback detection
   */
  async initialize(): Promise<void> {
    const detector = WebGPUFeatureDetector.getInstance();
    const capabilities = await detector.detectFeatures();

    if (capabilities.webgpu && !capabilities.fallbackRequired) {
      // Try WebGPU first
      this.webgpuIntegration = new WebGPUIntegration();
      const webgpuInitialized = await this.webgpuIntegration.initialize(this.canvas);

      if (webgpuInitialized) {
        this.usingWebGPU = true;
        console.log('Using WebGPU renderer');
        return;
      }
    }

    // Fallback to Canvas 2D
    this.canvasRenderer = new CanvasRenderer(this.canvas);
    this.usingWebGPU = false;
    console.log('Using Canvas 2D renderer (fallback)');
  }

  /**
   * Render chart with automatic renderer selection
   */
  async renderChart(data: DataPoint[], config: ChartConfig): Promise<void> {
    if (this.usingWebGPU && this.webgpuIntegration) {
      await this.webgpuIntegration.renderChart(data, config);
    } else if (this.canvasRenderer) {
      this.canvasRenderer.renderChart(data, config);
    } else {
      throw new Error('No renderer available');
    }
  }

  /**
   * Process data with GPU acceleration if available
   */
  async processData(
    operation: 'aggregate' | 'filter' | 'movingAverage',
    data: DataPoint[],
    params: Record<string, unknown>
  ): Promise<unknown> {
    if (this.usingWebGPU && this.webgpuIntegration) {
      try {
        return await this.webgpuIntegration.processData(operation, data, params);
      } catch (error) {
        console.warn('WebGPU processing failed, falling back to CPU:', error);
      }
    }

    // CPU fallback processing
    return this.cpuFallbackProcessing(operation, data, params);
  }

  /**
   * CPU-based fallback data processing
   */
  private cpuFallbackProcessing(
    operation: 'aggregate' | 'filter' | 'movingAverage',
    data: DataPoint[],
    params: Record<string, unknown>
  ): unknown {
    switch (operation) {
      case 'aggregate':
        return this.aggregateDataCPU(data, params.bucketSize as number);

      case 'filter':
        return this.filterDataCPU(data, params.minValue as number, params.maxValue as number);

      case 'movingAverage':
        return this.movingAverageCPU(data, params.windowSize as number);

      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  }

  private aggregateDataCPU(data: DataPoint[], bucketSize: number): Record<string, unknown>[] {
    const buckets = new Map<number, { min: number; max: number; sum: number; count: number }>();

    data.forEach(point => {
      const bucket = Math.floor(point.timestamp / bucketSize);
      if (!buckets.has(bucket)) {
        buckets.set(bucket, { min: point.value, max: point.value, sum: point.value, count: 1 });
      } else {
        const bucketData = buckets.get(bucket)!;
        bucketData.min = Math.min(bucketData.min, point.value);
        bucketData.max = Math.max(bucketData.max, point.value);
        bucketData.sum += point.value;
        bucketData.count++;
      }
    });

    return Array.from(buckets.entries()).map(([timestamp, data]) => ({
      timestamp: timestamp * bucketSize,
      min: data.min,
      max: data.max,
      avg: data.sum / data.count,
      count: data.count
    }));
  }

  private filterDataCPU(data: DataPoint[], minValue: number, maxValue: number): DataPoint[] {
    return data.filter(point => point.value >= minValue && point.value <= maxValue);
  }

  private movingAverageCPU(data: DataPoint[], windowSize: number): DataPoint[] {
    const result: DataPoint[] = [];

    for (let i = 0; i < data.length; i++) {
      const start = Math.max(0, i - windowSize / 2);
      const end = Math.min(data.length - 1, i + windowSize / 2);
      const window = data.slice(start, end + 1);
      const avg = window.reduce((sum, p) => sum + p.value, 0) / window.length;

      result.push({
        ...data[i],
        value: avg
      });
    }

    return result;
  }

  /**
   * Get current renderer type
   */
  getRendererType(): 'webgpu' | 'canvas' {
    return this.usingWebGPU ? 'webgpu' : 'canvas';
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): Record<string, unknown> {
    if (this.usingWebGPU && this.webgpuIntegration) {
      return this.webgpuIntegration.getPerformanceMetrics();
    }

    return {
      gpuSupported: false,
      rendererType: 'canvas',
      memoryUsage: 0
    };
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.webgpuIntegration) {
      this.webgpuIntegration.destroy();
      this.webgpuIntegration = null;
    }

    this.canvasRenderer = null;
    this.usingWebGPU = false;
  }
}

/**
 * Canvas 2D fallback renderer
 */
class CanvasRenderer {
  private ctx: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
  }

  renderChart(data: DataPoint[], config: ChartConfig): void {
    console.log('🎨 CanvasRenderer: Rendering', config.type, 'chart with', data.length, 'points');
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);

    if (data.length < 2) {
      console.log('⚠️ CanvasRenderer: Not enough data points to render');
      return;
    }

    // Simple chart rendering based on type
    this.ctx.strokeStyle = config.color;
    this.ctx.lineWidth = 2;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    const values = data.map(p => p.value);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const width = this.ctx.canvas.width;
    const height = this.ctx.canvas.height;

    console.log('📊 CanvasRenderer: Value range', minVal, 'to', maxVal, 'canvas size', width, 'x', height);

    switch (config.type) {
      case 'line':
        this.renderLineChart(data, minVal, maxVal, width, height);
        break;
      case 'bar':
        this.renderBarChart(data, minVal, maxVal, width, height);
        break;
      case 'scatter':
        this.renderScatterChart(data, minVal, maxVal, width, height);
        break;
      case 'heatmap':
        this.renderHeatmapChart(data, minVal, maxVal, width, height);
        break;
      default:
        this.renderLineChart(data, minVal, maxVal, width, height);
    }

    console.log('✅ CanvasRenderer: Chart rendering completed');
  }

  private renderLineChart(data: DataPoint[], minVal: number, maxVal: number, width: number, height: number): void {
    this.ctx.beginPath();
    data.forEach((point, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - ((point.value - minVal) / (maxVal - minVal)) * height;

      if (index === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }
    });
    this.ctx.stroke();
  }

  private renderBarChart(data: DataPoint[], minVal: number, maxVal: number, width: number, height: number): void {
    const barWidth = width / data.length - 1;
    data.forEach((point, index) => {
      const barHeight = ((point.value - minVal) / (maxVal - minVal)) * height;
      const x = index * (barWidth + 1);
      const y = height - barHeight;

      this.ctx.fillStyle = this.ctx.strokeStyle;
      this.ctx.fillRect(x, y, barWidth, barHeight);
    });
  }

  private renderScatterChart(data: DataPoint[], minVal: number, maxVal: number, width: number, height: number): void {
    this.ctx.fillStyle = this.ctx.strokeStyle;
    data.forEach((point, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - ((point.value - minVal) / (maxVal - minVal)) * height;

      this.ctx.beginPath();
      this.ctx.arc(x, y, 3, 0, Math.PI * 2);
      this.ctx.fill();
    });
  }

  private renderHeatmapChart(data: DataPoint[], minVal: number, maxVal: number, width: number, height: number): void {
    if (!data.length) return;

    const cellWidth = width / Math.sqrt(data.length);
    const cellHeight = height / Math.sqrt(data.length);

    data.forEach((point, index) => {
      const x = (index % Math.sqrt(data.length)) * cellWidth;
      const y = Math.floor(index / Math.sqrt(data.length)) * cellHeight;

      const intensity = (point.value - minVal) / (maxVal - minVal);
      const hue = (1 - intensity) * 240; // Blue to red
      this.ctx.fillStyle = `hsl(${hue}, 70%, 50%)`;
      this.ctx.fillRect(x, y, cellWidth, cellHeight);
    });
  }
}