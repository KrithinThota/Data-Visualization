import { ExtendedPerformanceMetrics } from '@/hooks/usePerformanceMonitor';
import { PerformanceAlert } from './performanceAlerts';
import { MemoryLeakReport } from './memoryLeakDetector';
import { GPUPerformanceReport } from './gpuMonitor';

export interface PerformanceHistoryEntry {
  timestamp: number;
  metrics: ExtendedPerformanceMetrics;
  alerts?: PerformanceAlert[];
  memoryLeaks?: MemoryLeakReport[];
  gpuReports?: GPUPerformanceReport[];
  context?: {
    userAction?: string;
    dataPoints?: number;
    rendererType?: string;
    config?: Record<string, unknown>;
  };
}

export interface PerformanceAnalysis {
  period: {
    start: number;
    end: number;
    duration: number;
  };
  summary: {
    averageFPS: number;
    minFPS: number;
    maxFPS: number;
    fpsStability: number;
    averageMemoryUsage: number;
    peakMemoryUsage: number;
    totalAlerts: number;
    criticalAlerts: number;
    memoryLeaks: number;
  };
  trends: {
    fps: 'improving' | 'degrading' | 'stable';
    memory: 'increasing' | 'decreasing' | 'stable';
    stability: 'improving' | 'degrading' | 'stable';
  };
  insights: string[];
  recommendations: string[];
}

export class PerformanceHistoryTracker {
  private history: PerformanceHistoryEntry[] = [];
  private readonly maxHistorySize = 10000; // ~10k entries
  private readonly retentionPeriod = 24 * 60 * 60 * 1000; // 24 hours

  addEntry(entry: PerformanceHistoryEntry): void {
    this.history.push(entry);

    // Maintain size limit
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }

    // Clean old entries
    this.cleanOldEntries();
  }

  addMetrics(
    metrics: ExtendedPerformanceMetrics,
    context?: PerformanceHistoryEntry['context']
  ): void {
    this.addEntry({
      timestamp: Date.now(),
      metrics,
      context
    });
  }

  addAlert(alert: PerformanceAlert): void {
    // Find the most recent entry or create a new one
    const recentEntry = this.history[this.history.length - 1];
    const now = Date.now();

    if (recentEntry && (now - recentEntry.timestamp) < 1000) { // Within 1 second
      if (!recentEntry.alerts) recentEntry.alerts = [];
      recentEntry.alerts.push(alert);
    } else {
      this.addEntry({
        timestamp: now,
        metrics: {} as ExtendedPerformanceMetrics, // Placeholder
        alerts: [alert]
      });
    }
  }

  addMemoryLeakReport(report: MemoryLeakReport): void {
    const recentEntry = this.history[this.history.length - 1];
    const now = Date.now();

    if (recentEntry && (now - recentEntry.timestamp) < 1000) {
      if (!recentEntry.memoryLeaks) recentEntry.memoryLeaks = [];
      recentEntry.memoryLeaks.push(report);
    } else {
      this.addEntry({
        timestamp: now,
        metrics: {} as ExtendedPerformanceMetrics,
        memoryLeaks: [report]
      });
    }
  }

  addGPUReport(report: GPUPerformanceReport): void {
    const recentEntry = this.history[this.history.length - 1];
    const now = Date.now();

    if (recentEntry && (now - recentEntry.timestamp) < 1000) {
      if (!recentEntry.gpuReports) recentEntry.gpuReports = [];
      recentEntry.gpuReports.push(report);
    } else {
      this.addEntry({
        timestamp: now,
        metrics: {} as ExtendedPerformanceMetrics,
        gpuReports: [report]
      });
    }
  }

  private cleanOldEntries(): void {
    const cutoff = Date.now() - this.retentionPeriod;
    this.history = this.history.filter(entry => entry.timestamp > cutoff);
  }

  getHistory(
    startTime?: number,
    endTime?: number,
    limit?: number
  ): PerformanceHistoryEntry[] {
    let filtered = this.history;

    if (startTime) {
      filtered = filtered.filter(entry => entry.timestamp >= startTime);
    }

    if (endTime) {
      filtered = filtered.filter(entry => entry.timestamp <= endTime);
    }

    if (limit) {
      filtered = filtered.slice(-limit);
    }

    return filtered;
  }

  getRecentHistory(minutes: number): PerformanceHistoryEntry[] {
    const cutoff = Date.now() - (minutes * 60 * 1000);
    return this.getHistory(cutoff);
  }

  analyzePerformance(
    startTime?: number,
    endTime?: number
  ): PerformanceAnalysis {
    const entries = this.getHistory(startTime, endTime);
    if (entries.length === 0) {
      throw new Error('No performance data available for analysis');
    }

    const start = entries[0].timestamp;
    const end = entries[entries.length - 1].timestamp;
    const duration = end - start;

    // Extract metrics
    const fpsValues: number[] = [];
    const memoryValues: number[] = [];
    let totalAlerts = 0;
    let criticalAlerts = 0;
    let memoryLeaks = 0;

    for (const entry of entries) {
      if (entry.metrics.fps > 0) fpsValues.push(entry.metrics.fps);
      if (entry.metrics.memoryUsage > 0) memoryValues.push(entry.metrics.memoryUsage);

      if (entry.alerts) {
        totalAlerts += entry.alerts.length;
        criticalAlerts += entry.alerts.filter(a => a.type === 'critical').length;
      }

      if (entry.memoryLeaks) {
        memoryLeaks += entry.memoryLeaks.length;
      }
    }

    // Calculate summary statistics
    const averageFPS = fpsValues.length > 0 ? fpsValues.reduce((a, b) => a + b, 0) / fpsValues.length : 0;
    const minFPS = fpsValues.length > 0 ? Math.min(...fpsValues) : 0;
    const maxFPS = fpsValues.length > 0 ? Math.max(...fpsValues) : 0;
    const fpsStability = fpsValues.length > 0 ? this.calculateStability(fpsValues) : 0;

    const averageMemoryUsage = memoryValues.length > 0 ? memoryValues.reduce((a, b) => a + b, 0) / memoryValues.length : 0;
    const peakMemoryUsage = memoryValues.length > 0 ? Math.max(...memoryValues) : 0;

    // Analyze trends
    const trends = this.analyzeTrends(entries);

    // Generate insights and recommendations
    const insights = this.generateInsights({
      averageFPS,
      minFPS,
      maxFPS,
      fpsStability,
      averageMemoryUsage,
      peakMemoryUsage,
      totalAlerts,
      criticalAlerts,
      memoryLeaks
    }, trends);

    const recommendations = this.generateRecommendations({
      averageFPS,
      minFPS,
      maxFPS,
      fpsStability,
      averageMemoryUsage,
      peakMemoryUsage,
      totalAlerts,
      criticalAlerts,
      memoryLeaks
    }, trends);

    return {
      period: { start, end, duration },
      summary: {
        averageFPS,
        minFPS,
        maxFPS,
        fpsStability,
        averageMemoryUsage,
        peakMemoryUsage,
        totalAlerts,
        criticalAlerts,
        memoryLeaks
      },
      trends,
      insights,
      recommendations
    };
  }

  private calculateStability(values: number[]): number {
    if (values.length < 2) return 0;

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    // Return coefficient of variation (lower is more stable)
    return stdDev / mean;
  }

  private analyzeTrends(entries: PerformanceHistoryEntry[]): PerformanceAnalysis['trends'] {
    if (entries.length < 10) {
      return { fps: 'stable', memory: 'stable', stability: 'stable' };
    }

    const mid = Math.floor(entries.length / 2);
    const firstHalf = entries.slice(0, mid);
    const secondHalf = entries.slice(mid);

    // FPS trend
    const firstHalfFPS = firstHalf
      .filter(e => e.metrics.fps > 0)
      .map(e => e.metrics.fps);
    const secondHalfFPS = secondHalf
      .filter(e => e.metrics.fps > 0)
      .map(e => e.metrics.fps);

    const fpsTrend = this.calculateTrend(
      firstHalfFPS.reduce((a, b) => a + b, 0) / firstHalfFPS.length,
      secondHalfFPS.reduce((a, b) => a + b, 0) / secondHalfFPS.length
    );

    // Memory trend
    const firstHalfMemory = firstHalf
      .filter(e => e.metrics.memoryUsage > 0)
      .map(e => e.metrics.memoryUsage);
    const secondHalfMemory = secondHalf
      .filter(e => e.metrics.memoryUsage > 0)
      .map(e => e.metrics.memoryUsage);

    const memoryTrend = this.calculateTrend(
      firstHalfMemory.reduce((a, b) => a + b, 0) / firstHalfMemory.length,
      secondHalfMemory.reduce((a, b) => a + b, 0) / secondHalfMemory.length
    );

    // Stability trend (based on FPS variation)
    const firstHalfStability = this.calculateStability(firstHalfFPS);
    const secondHalfStability = this.calculateStability(secondHalfFPS);
    const stabilityTrend = this.calculateTrend(firstHalfStability, secondHalfStability, true); // Lower is better

    return {
      fps: fpsTrend,
      memory: memoryTrend,
      stability: stabilityTrend
    };
  }

  private calculateTrend(first: number, second: number, invert = false): 'improving' | 'degrading' | 'stable' {
    const diff = second - first;
    const threshold = Math.abs(first) * 0.05; // 5% change

    if (invert) {
      // For inverted metrics (like stability), lower values are better
      return Math.abs(diff) < threshold ? 'stable' : (diff < 0 ? 'improving' : 'degrading');
    } else {
      return Math.abs(diff) < threshold ? 'stable' : (diff > 0 ? 'improving' : 'degrading');
    }
  }

  private generateInsights(
    summary: PerformanceAnalysis['summary'],
    trends: PerformanceAnalysis['trends']
  ): string[] {
    const insights: string[] = [];

    if (summary.averageFPS >= 55) {
      insights.push('Excellent frame rate performance maintained');
    } else if (summary.averageFPS >= 30) {
      insights.push('Good frame rate performance with room for optimization');
    } else {
      insights.push('Frame rate performance needs attention');
    }

    if (summary.fpsStability < 0.1) {
      insights.push('Very stable frame rate performance');
    } else if (summary.fpsStability > 0.3) {
      insights.push('Frame rate shows significant variation');
    }

    if (trends.fps === 'improving') {
      insights.push('Frame rate performance is trending upward');
    } else if (trends.fps === 'degrading') {
      insights.push('Frame rate performance is declining over time');
    }

    if (summary.memoryLeaks > 0) {
      insights.push(`${summary.memoryLeaks} memory leak(s) detected during monitoring period`);
    }

    if (summary.criticalAlerts > 0) {
      insights.push(`${summary.criticalAlerts} critical performance alerts triggered`);
    }

    return insights;
  }

  private generateRecommendations(
    summary: PerformanceAnalysis['summary'],
    trends: PerformanceAnalysis['trends']
  ): string[] {
    const recommendations: string[] = [];

    if (summary.averageFPS < 30) {
      recommendations.push('Implement level-of-detail (LOD) rendering for better performance');
      recommendations.push('Consider reducing data point density or implementing virtual scrolling');
    }

    if (summary.fpsStability > 0.2) {
      recommendations.push('Investigate and resolve frame rate instability causes');
      recommendations.push('Consider implementing frame rate limiting or stabilization techniques');
    }

    if (trends.memory === 'increasing') {
      recommendations.push('Monitor memory usage trends and implement cleanup strategies');
      recommendations.push('Check for potential memory leaks in data processing');
    }

    if (summary.memoryLeaks > 0) {
      recommendations.push('Address detected memory leaks immediately');
      recommendations.push('Implement proper cleanup in component unmount handlers');
    }

    if (summary.criticalAlerts > 5) {
      recommendations.push('Review and optimize critical performance bottlenecks');
      recommendations.push('Consider implementing performance budgets and alerts');
    }

    if (trends.fps === 'degrading') {
      recommendations.push('Investigate causes of declining performance over time');
      recommendations.push('Monitor for memory leaks or resource exhaustion');
    }

    return recommendations;
  }

  exportHistory(startTime?: number, endTime?: number): string {
    const history = this.getHistory(startTime, endTime);

    return JSON.stringify({
      history,
      metadata: {
        totalEntries: history.length,
        dateRange: {
          start: history[0]?.timestamp,
          end: history[history.length - 1]?.timestamp
        },
        exportTimestamp: new Date().toISOString()
      }
    }, null, 2);
  }

  importHistory(data: string): void {
    try {
      const parsed = JSON.parse(data);
      if (parsed.history && Array.isArray(parsed.history)) {
        // Merge with existing history, avoiding duplicates
        const existingTimestamps = new Set(this.history.map(h => h.timestamp));
        const newEntries = parsed.history.filter((h: PerformanceHistoryEntry) =>
          !existingTimestamps.has(h.timestamp)
        );

        this.history.push(...newEntries);
        this.history.sort((a, b) => a.timestamp - b.timestamp);
        this.cleanOldEntries();
      }
    } catch (error) {
      throw new Error(`Failed to import performance history: ${error}`);
    }
  }

  clearHistory(): void {
    this.history = [];
  }

  getStats(): {
    totalEntries: number;
    dateRange: { start: number; end: number } | null;
    averageEntryRate: number; // entries per minute
  } {
    if (this.history.length === 0) {
      return { totalEntries: 0, dateRange: null, averageEntryRate: 0 };
    }

    const start = this.history[0].timestamp;
    const end = this.history[this.history.length - 1].timestamp;
    const durationMinutes = (end - start) / (1000 * 60);
    const averageEntryRate = durationMinutes > 0 ? this.history.length / durationMinutes : 0;

    return {
      totalEntries: this.history.length,
      dateRange: { start, end },
      averageEntryRate
    };
  }
}

// Singleton instance
export const performanceHistoryTracker = new PerformanceHistoryTracker();