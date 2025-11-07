import { WebGPUIntegration } from '@/lib/webgpu/webgpuIntegration';

export interface GPUMetrics {
  supported: boolean;
  initialized: boolean;
  memoryUsage: number; // bytes
  memoryLimit: number; // bytes
  bufferCount: number;
  textureCount: number;
  shaderCount: number;
  computeTime: number; // milliseconds
  renderTime: number; // milliseconds
  pipelineCount: number;
  commandEncoderCount: number;
  adapterInfo: {
    name: string;
    vendor: string;
    device: string;
    description: string;
  } | undefined;
  deviceLimits: {
    maxBufferSize: number;
    maxTextureDimension2D: number;
    maxTextureDimension3D: number;
    maxBindGroups: number;
    maxComputeWorkgroupsPerDimension: number;
  } | undefined;
}

export interface GPUPerformanceReport {
  timestamp: number;
  metrics: GPUMetrics;
  utilization: {
    memoryPercent: number;
    computeEfficiency: number;
    renderEfficiency: number;
  };
  recommendations: string[];
  warnings: string[];
}

export class GPUMonitor {
  private webgpuIntegration: WebGPUIntegration | null = null;
  private metricsHistory: GPUMetrics[] = [];
  private readonly maxHistorySize = 100;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private listeners: Set<(report: GPUPerformanceReport) => void> = new Set();

  constructor(webgpuIntegration?: WebGPUIntegration) {
    this.webgpuIntegration = webgpuIntegration || null;
  }

  setWebGPUIntegration(integration: WebGPUIntegration): void {
    this.webgpuIntegration = integration;
  }

  startMonitoring(intervalMs: number = 2000): void {
    if (this.monitoringInterval) {
      this.stopMonitoring();
    }

    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
    }, intervalMs);
  }

  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  private async collectMetrics(): Promise<void> {
    if (!this.webgpuIntegration) {
      this.recordMetrics({
        supported: false,
        initialized: false,
        memoryUsage: 0,
        memoryLimit: 0,
        bufferCount: 0,
        textureCount: 0,
        shaderCount: 0,
        computeTime: 0,
        renderTime: 0,
        pipelineCount: 0,
        commandEncoderCount: 0,
        adapterInfo: undefined,
        deviceLimits: undefined
      });
      return;
    }

    try {
      const performanceMetrics = this.webgpuIntegration.getPerformanceMetrics();

      const metrics: GPUMetrics = {
        supported: performanceMetrics.gpuSupported,
        initialized: this.webgpuIntegration.isWebGPUSupported(),
        memoryUsage: performanceMetrics.memoryStats?.totalPooledSize || 0,
        memoryLimit: performanceMetrics.memoryStats?.maxMemory || 0,
        bufferCount: performanceMetrics.memoryStats?.pooledBuffers || 0,
        textureCount: performanceMetrics.memoryStats?.textureCount || 0,
        shaderCount: performanceMetrics.memoryStats?.shaderCount || 0,
        computeTime: performanceMetrics.computeMetrics?.computeTime || 0,
        renderTime: performanceMetrics.rendererMetrics?.gpuMemoryUsage || 0,
        pipelineCount: performanceMetrics.memoryStats?.pipelineCount || 0,
        commandEncoderCount: performanceMetrics.memoryStats?.commandEncoderCount || 0,
        adapterInfo: undefined,
        deviceLimits: undefined
      };

      this.recordMetrics(metrics);
    } catch (error) {
      console.warn('Failed to collect GPU metrics:', error);
      this.recordMetrics({
        supported: false,
        initialized: false,
        memoryUsage: 0,
        memoryLimit: 0,
        bufferCount: 0,
        textureCount: 0,
        shaderCount: 0,
        computeTime: 0,
        renderTime: 0,
        pipelineCount: 0,
        commandEncoderCount: 0,
        adapterInfo: undefined,
        deviceLimits: undefined
      });
    }
  }

  private recordMetrics(metrics: GPUMetrics): void {
    this.metricsHistory.push(metrics);

    if (this.metricsHistory.length > this.maxHistorySize) {
      this.metricsHistory.shift();
    }

    const report = this.generateReport(metrics);
    this.listeners.forEach(listener => listener(report));
  }

  private generateReport(metrics: GPUMetrics): GPUPerformanceReport {
    const utilization = this.calculateUtilization(metrics);
    const recommendations = this.generateRecommendations(metrics, utilization);
    const warnings = this.generateWarnings(metrics, utilization);

    return {
      timestamp: Date.now(),
      metrics,
      utilization,
      recommendations,
      warnings
    };
  }

  private calculateUtilization(metrics: GPUMetrics): GPUPerformanceReport['utilization'] {
    const memoryPercent = metrics.memoryLimit > 0 ? (metrics.memoryUsage / metrics.memoryLimit) * 100 : 0;

    // Calculate efficiency based on resource usage patterns
    const computeEfficiency = this.calculateEfficiency('compute', metrics);
    const renderEfficiency = this.calculateEfficiency('render', metrics);

    return {
      memoryPercent,
      computeEfficiency,
      renderEfficiency
    };
  }

  private calculateEfficiency(type: 'compute' | 'render', metrics: GPUMetrics): number {
    if (this.metricsHistory.length < 5) return 0;

    const recent = this.metricsHistory.slice(-5);
    const timeValues = recent.map(m => type === 'compute' ? m.computeTime : m.renderTime);
    const resourceValues = recent.map(m => type === 'compute' ? m.bufferCount : m.textureCount);

    // Simple efficiency calculation: time per resource
    const avgTime = timeValues.reduce((a, b) => a + b, 0) / timeValues.length;
    const avgResources = resourceValues.reduce((a, b) => a + b, 0) / resourceValues.length;

    return avgResources > 0 ? Math.min(100, (avgTime / avgResources) * 10) : 0;
  }

  private generateRecommendations(metrics: GPUMetrics, utilization: GPUPerformanceReport['utilization']): string[] {
    const recommendations: string[] = [];

    if (utilization.memoryPercent > 80) {
      recommendations.push('High GPU memory usage - consider buffer pooling optimization');
    }

    if (metrics.bufferCount > 50) {
      recommendations.push('High buffer count - implement buffer reuse strategy');
    }

    if (metrics.textureCount > 20) {
      recommendations.push('High texture count - optimize texture atlas usage');
    }

    if (utilization.computeEfficiency < 30) {
      recommendations.push('Low compute efficiency - review compute shader workload distribution');
    }

    if (metrics.pipelineCount > 10) {
      recommendations.push('High pipeline count - cache and reuse render pipelines');
    }

    if (!metrics.supported) {
      recommendations.push('WebGPU not supported - consider fallback to Canvas/WebGL');
    }

    return recommendations;
  }

  private generateWarnings(metrics: GPUMetrics, utilization: GPUPerformanceReport['utilization']): string[] {
    const warnings: string[] = [];

    if (utilization.memoryPercent > 95) {
      warnings.push('Critical GPU memory usage - risk of out-of-memory errors');
    }

    if (metrics.computeTime > 50) {
      warnings.push('High compute time - may impact rendering performance');
    }

    if (metrics.renderTime > 16.67) {
      warnings.push('Render time exceeds frame budget - potential dropped frames');
    }

    return warnings;
  }

  getCurrentMetrics(): GPUMetrics | null {
    return this.metricsHistory.length > 0 ? this.metricsHistory[this.metricsHistory.length - 1] : null;
  }

  getMetricsHistory(): GPUMetrics[] {
    return [...this.metricsHistory];
  }

  getPerformanceReport(): GPUPerformanceReport | null {
    const current = this.getCurrentMetrics();
    return current ? this.generateReport(current) : null;
  }

  getAverageMetrics(samples: number = 10): Partial<GPUMetrics> | null {
    if (this.metricsHistory.length < samples) return null;

    const recent = this.metricsHistory.slice(-samples);

    return {
      memoryUsage: recent.reduce((sum, m) => sum + m.memoryUsage, 0) / samples,
      bufferCount: recent.reduce((sum, m) => sum + m.bufferCount, 0) / samples,
      textureCount: recent.reduce((sum, m) => sum + m.textureCount, 0) / samples,
      computeTime: recent.reduce((sum, m) => sum + m.computeTime, 0) / samples,
      renderTime: recent.reduce((sum, m) => sum + m.renderTime, 0) / samples
    };
  }

  addListener(callback: (report: GPUPerformanceReport) => void): void {
    this.listeners.add(callback);
  }

  removeListener(callback: (report: GPUPerformanceReport) => void): void {
    this.listeners.delete(callback);
  }

  clearHistory(): void {
    this.metricsHistory = [];
  }

  exportMetrics(): {
    history: GPUMetrics[];
    current: GPUMetrics | null;
    report: GPUPerformanceReport | null;
  } {
    return {
      history: this.getMetricsHistory(),
      current: this.getCurrentMetrics(),
      report: this.getPerformanceReport()
    };
  }
}

// GPU Memory Pool Monitor
export class GPUMemoryPoolMonitor {
  private pools: Map<string, {
    allocated: number;
    peak: number;
    allocations: number;
    deallocations: number;
  }> = new Map();

  trackAllocation(poolName: string, size: number): void {
    if (!this.pools.has(poolName)) {
      this.pools.set(poolName, {
        allocated: 0,
        peak: 0,
        allocations: 0,
        deallocations: 0
      });
    }

    const pool = this.pools.get(poolName)!;
    pool.allocated += size;
    pool.allocations++;
    pool.peak = Math.max(pool.peak, pool.allocated);
  }

  trackDeallocation(poolName: string, size: number): void {
    const pool = this.pools.get(poolName);
    if (pool) {
      pool.allocated = Math.max(0, pool.allocated - size);
      pool.deallocations++;
    }
  }

  getPoolStats(poolName?: string): any {
    if (poolName) {
      return this.pools.get(poolName) || null;
    }

    const allPools: Record<string, any> = {};
    for (const [name, stats] of this.pools) {
      allPools[name] = { ...stats };
    }
    return allPools;
  }

  getTotalAllocated(): number {
    return Array.from(this.pools.values()).reduce((sum, pool) => sum + pool.allocated, 0);
  }

  getTotalPeak(): number {
    return Array.from(this.pools.values()).reduce((sum, pool) => sum + pool.peak, 0);
  }

  reset(): void {
    this.pools.clear();
  }
}

// Singleton instances
export const gpuMonitor = new GPUMonitor();
export const gpuMemoryPoolMonitor = new GPUMemoryPoolMonitor();