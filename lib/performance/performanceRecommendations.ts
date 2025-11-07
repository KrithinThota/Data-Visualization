import { ExtendedPerformanceMetrics } from '@/hooks/usePerformanceMonitor';

export interface PerformanceRecommendation {
  id: string;
  type: 'critical' | 'warning' | 'info' | 'optimization';
  category: 'fps' | 'memory' | 'rendering' | 'gpu' | 'data' | 'general';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  action: {
    type: 'config' | 'code' | 'data' | 'manual' | 'info';
    description: string;
    code?: string;
    config?: Record<string, unknown>;
  };
  priority: number;
  conditions: RecommendationCondition[];
  autoApply?: boolean;
}

export interface RecommendationCondition {
  metric: keyof ExtendedPerformanceMetrics;
  operator: '>' | '<' | '>=' | '<=' | '===' | '!==';
  value: number;
  duration?: number; // seconds
}

export class PerformanceRecommendationsEngine {
  private recommendations: PerformanceRecommendation[] = [];
  private activeRecommendations: Set<string> = new Set();
  private metricsHistory: ExtendedPerformanceMetrics[] = [];
  private readonly historySize = 60; // 60 seconds

  constructor() {
    this.initializeRecommendations();
  }

  private initializeRecommendations() {
    this.recommendations = [
      // FPS Critical Issues
      {
        id: 'fps-critical-low',
        type: 'critical',
        category: 'fps',
        title: 'Critical FPS Drop',
        description: 'Frame rate has dropped below 20 FPS, severely impacting user experience',
        impact: 'high',
        action: {
          type: 'config',
          description: 'Enable emergency LOD mode and reduce data points',
          config: { lodLevel: 'pixel', maxDataPoints: 1000 }
        },
        priority: 100,
        conditions: [
          { metric: 'fps', operator: '<', value: 20, duration: 5 }
        ]
      },

      // FPS Performance Issues
      {
        id: 'fps-low-performance',
        type: 'warning',
        category: 'fps',
        title: 'Low Frame Rate',
        description: 'Frame rate below 30 FPS may cause stuttering',
        impact: 'medium',
        action: {
          type: 'config',
          description: 'Enable adaptive quality and increase LOD level',
          config: { adaptiveQuality: true, lodLevel: 'aggregated' }
        },
        priority: 80,
        conditions: [
          { metric: 'fps', operator: '<', value: 30, duration: 10 }
        ]
      },

      // Memory Issues
      {
        id: 'memory-high-usage',
        type: 'warning',
        category: 'memory',
        title: 'High Memory Usage',
        description: 'Memory usage above 100MB may cause performance issues',
        impact: 'high',
        action: {
          type: 'data',
          description: 'Implement data windowing to reduce memory footprint',
          config: { dataWindowSize: 5000, enableGarbageCollection: true }
        },
        priority: 90,
        conditions: [
          { metric: 'memoryUsage', operator: '>', value: 100, duration: 30 }
        ]
      },

      // GPU Memory Issues
      {
        id: 'gpu-memory-high',
        type: 'warning',
        category: 'gpu',
        title: 'High GPU Memory Usage',
        description: 'GPU memory usage is elevated, may impact rendering performance',
        impact: 'medium',
        action: {
          type: 'config',
          description: 'Optimize GPU buffer allocation and enable buffer pooling',
          config: { gpuBufferPooling: true, maxGPUBuffers: 10 }
        },
        priority: 70,
        conditions: [
          { metric: 'gpuMemoryUsage', operator: '>', value: 256 * 1024 * 1024, duration: 15 } // 256MB
        ]
      },

      // WebGPU Optimization
      {
        id: 'webgpu-not-enabled',
        type: 'optimization',
        category: 'gpu',
        title: 'WebGPU Not Enabled',
        description: 'WebGPU is available but not enabled, missing performance optimizations',
        impact: 'medium',
        action: {
          type: 'config',
          description: 'Enable WebGPU renderer for better performance',
          config: { enableWebGPU: true, fallbackToCanvas: true }
        },
        priority: 60,
        conditions: [
          { metric: 'webgpuEnabled', operator: '===', value: 0 },
          { metric: 'fps', operator: '<', value: 50, duration: 20 }
        ]
      },

      // Render Time Optimization
      {
        id: 'render-time-high',
        type: 'warning',
        category: 'rendering',
        title: 'High Render Time',
        description: 'Render time exceeds frame budget, causing dropped frames',
        impact: 'medium',
        action: {
          type: 'config',
          description: 'Enable dirty region updates and reduce render frequency',
          config: { dirtyRegionUpdates: true, maxRenderFrequency: 30 }
        },
        priority: 75,
        conditions: [
          { metric: 'renderTime', operator: '>', value: 16.67, duration: 10 } // > 1 frame at 60fps
        ]
      },

      // Data Processing Optimization
      {
        id: 'data-processing-slow',
        type: 'optimization',
        category: 'data',
        title: 'Slow Data Processing',
        description: 'Data processing time is high, consider WebAssembly or WebGPU acceleration',
        impact: 'medium',
        action: {
          type: 'config',
          description: 'Enable WebAssembly SIMD processing for data operations',
          config: { enableWASMSIMD: true, dataProcessingThreads: 4 }
        },
        priority: 65,
        conditions: [
          { metric: 'dataProcessingTime', operator: '>', value: 10, duration: 15 }
        ]
      },

      // Memory Leak Detection
      {
        id: 'memory-leak-suspected',
        type: 'critical',
        category: 'memory',
        title: 'Memory Leak Suspected',
        description: 'Memory usage continuously increasing over time',
        impact: 'high',
        action: {
          type: 'manual',
          description: 'Check for unsubscribed event listeners and uncleared timers/intervals'
        },
        priority: 95,
        conditions: [
          { metric: 'memoryUsage', operator: '>', value: 50, duration: 300 } // 5 minutes
        ]
      },

      // Performance Recovery
      {
        id: 'performance-recovery',
        type: 'info',
        category: 'general',
        title: 'Performance Recovered',
        description: 'Performance metrics have returned to acceptable levels',
        impact: 'low',
        action: {
          type: 'info',
          description: 'Monitor to ensure stability is maintained'
        },
        priority: 10,
        conditions: [
          { metric: 'fps', operator: '>=', value: 50, duration: 30 }
        ]
      }
    ];
  }

  updateMetrics(metrics: ExtendedPerformanceMetrics): PerformanceRecommendation[] {
    // Add to history
    this.metricsHistory.push(metrics);
    if (this.metricsHistory.length > this.historySize) {
      this.metricsHistory.shift();
    }

    const newRecommendations: PerformanceRecommendation[] = [];
    const currentRecommendations = new Set<string>();

    // Check each recommendation against current metrics and history
    for (const recommendation of this.recommendations) {
      if (this.checkRecommendation(recommendation)) {
        currentRecommendations.add(recommendation.id);

        if (!this.activeRecommendations.has(recommendation.id)) {
          newRecommendations.push(recommendation);
        }
      }
    }

    // Remove recommendations that no longer apply
    for (const activeId of this.activeRecommendations) {
      if (!currentRecommendations.has(activeId)) {
        this.activeRecommendations.delete(activeId);
      }
    }

    // Add new recommendations
    for (const rec of newRecommendations) {
      this.activeRecommendations.add(rec.id);
    }

    return newRecommendations;
  }

  private checkRecommendation(recommendation: PerformanceRecommendation): boolean {
    for (const condition of recommendation.conditions) {
      if (!this.checkCondition(condition)) {
        return false;
      }
    }
    return true;
  }

  private checkCondition(condition: RecommendationCondition): boolean {
    const { metric, operator, value, duration = 1 } = condition;

    if (this.metricsHistory.length < duration) {
      return false;
    }

    const recentMetrics = this.metricsHistory.slice(-duration);
    const currentValue = recentMetrics[recentMetrics.length - 1][metric] as number;

    // For boolean metrics, convert to number
    const numericValue = typeof currentValue === 'boolean' ? (currentValue ? 1 : 0) : currentValue;

    switch (operator) {
      case '>': return numericValue > value;
      case '<': return numericValue < value;
      case '>=': return numericValue >= value;
      case '<=': return numericValue <= value;
      case '===': return numericValue === value;
      case '!==': return numericValue !== value;
      default: return false;
    }
  }

  getActiveRecommendations(): PerformanceRecommendation[] {
    return this.recommendations.filter(rec => this.activeRecommendations.has(rec.id));
  }

  getRecommendationsByCategory(category: PerformanceRecommendation['category']): PerformanceRecommendation[] {
    return this.getActiveRecommendations().filter(rec => rec.category === category);
  }

  getRecommendationsByPriority(minPriority: number = 0): PerformanceRecommendation[] {
    return this.getActiveRecommendations()
      .filter(rec => rec.priority >= minPriority)
      .sort((a, b) => b.priority - a.priority);
  }

  applyRecommendation(recommendationId: string): boolean {
    const recommendation = this.recommendations.find(r => r.id === recommendationId);
    if (!recommendation || !recommendation.autoApply) {
      return false;
    }

    // Here you would implement the actual application logic
    // For now, just mark as applied
    console.log(`Applying recommendation: ${recommendation.title}`);
    return true;
  }

  clearRecommendation(recommendationId: string): void {
    this.activeRecommendations.delete(recommendationId);
  }

  getMetricsHistory(): ExtendedPerformanceMetrics[] {
    return [...this.metricsHistory];
  }

  reset(): void {
    this.activeRecommendations.clear();
    this.metricsHistory = [];
  }
}

// Singleton instance
export const performanceRecommendationsEngine = new PerformanceRecommendationsEngine();