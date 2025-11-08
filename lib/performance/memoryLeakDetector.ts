import { ExtendedPerformanceMetrics } from '@/hooks/usePerformanceMonitor';

export interface MemoryLeakReport {
  id: string;
  type: 'leak' | 'growth' | 'spike';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  memoryIncrease: number; // MB
  growthRate: number; // MB/minute
  confidence: number; // 0-1
  timestamp: number;
  recommendations: string[];
}

export interface MemorySnapshot {
  timestamp: number;
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  gpuMemoryUsage: number;
  bufferCount: number;
}

export class MemoryLeakDetector {
  private snapshots: MemorySnapshot[] = [];
  private reports: MemoryLeakReport[] = [];
  private readonly maxSnapshots = 300; // 5 minutes at 1 second intervals
  private readonly maxReports = 1000; // Store up to 1000 reports
  private readonly leakThresholdMB = 10; // MB increase over time
  private readonly spikeThresholdMB = 50; // MB sudden increase
  private readonly growthRateThreshold = 1; // MB/minute

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private leakDetectionInterval: any = null;
  private listeners: Set<(report: MemoryLeakReport) => void> = new Set();

  startMonitoring(intervalMs: number = 1000): void {
    if (this.leakDetectionInterval) {
      this.stopMonitoring();
    }

    this.leakDetectionInterval = setInterval(() => {
      this.takeSnapshot();
      this.analyzeForLeaks();
    }, intervalMs);
  }

  stopMonitoring(): void {
    if (this.leakDetectionInterval) {
      clearInterval(this.leakDetectionInterval);
      this.leakDetectionInterval = null;
    }
  }

  private getMemoryUsage(): { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } {
    try {
      // Type-safe access to performance.memory
      const perf = (performance as unknown as { memory?: { usedJSHeapSize?: number; totalJSHeapSize?: number; jsHeapSizeLimit?: number } });
      const memory = perf.memory || {};
      return {
        usedJSHeapSize: memory.usedJSHeapSize || 0,
        totalJSHeapSize: memory.totalJSHeapSize || 0,
        jsHeapSizeLimit: memory.jsHeapSizeLimit || 0
      };
    } catch {
      return { usedJSHeapSize: 0, totalJSHeapSize: 0, jsHeapSizeLimit: 0 };
    }
  }

  takeSnapshot(metrics?: ExtendedPerformanceMetrics): void {
    const memory = this.getMemoryUsage();
    
    const snapshot: MemorySnapshot = {
      timestamp: Date.now(),
      usedJSHeapSize: metrics?.memoryUsage || memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
      gpuMemoryUsage: metrics?.gpuMemoryUsage || 0,
      bufferCount: this.extractBufferCount(metrics)
    };

    this.snapshots.push(snapshot);

    // Keep only recent snapshots
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots.shift();
    }
  }

  private extractBufferCount(metrics?: ExtendedPerformanceMetrics): number {
    // Try to extract buffer count from metrics if available
    if (!metrics) return 0;
    
    // Type-safe extraction without using 'any'
    const metricKeys = Object.keys(metrics);
    for (const key of metricKeys) {
      if (key.toLowerCase().includes('buffer') || key.toLowerCase().includes('count')) {
        // Use unknown as intermediate type for safe casting
        const value = (metrics as unknown as Record<string, unknown>)[key];
        if (typeof value === 'number' && value >= 0) {
          return value;
        }
      }
    }
    return 0;
  }

  analyzeForLeaks(): MemoryLeakReport[] {
    if (this.snapshots.length < 10) return []; // Need minimum data

    const reports: MemoryLeakReport[] = [];

    // Analyze memory growth over time
    const growthReport = this.analyzeMemoryGrowth();
    if (growthReport) reports.push(growthReport);

    // Analyze memory spikes
    const spikeReports = this.analyzeMemorySpikes();
    reports.push(...spikeReports);

    // Analyze periodic patterns
    const patternReport = this.analyzeMemoryPatterns();
    if (patternReport) reports.push(patternReport);

    // Notify listeners of new reports
    reports.forEach(report => {
      this.listeners.forEach(listener => listener(report));
      // Also store the report for later retrieval
      this.storeReport(report);
    });

    return reports;
  }

  private analyzeMemoryGrowth(): MemoryLeakReport | null {
    if (this.snapshots.length < 60) return null; // Need at least 1 minute of data

    const recent = this.snapshots.slice(-60); // Last minute
    const older = this.snapshots.slice(-120, -60); // Previous minute

    if (older.length === 0) return null;

    const recentAvg = recent.reduce((sum, s) => sum + s.usedJSHeapSize, 0) / recent.length;
    const olderAvg = older.reduce((sum, s) => sum + s.usedJSHeapSize, 0) / older.length;

    const increase = recentAvg - olderAvg;
    const growthRate = increase; // MB per minute

    if (increase > this.leakThresholdMB && growthRate > this.growthRateThreshold) {
      const confidence = Math.min(1, increase / (this.leakThresholdMB * 2));

      return {
        id: `memory-growth-${Date.now()}`,
        type: 'growth',
        severity: increase > 50 ? 'critical' : increase > 25 ? 'high' : 'medium',
        description: `Memory usage increasing at ${growthRate.toFixed(1)} MB/minute`,
        memoryIncrease: increase,
        growthRate,
        confidence,
        timestamp: Date.now(),
        recommendations: [
          'Check for unsubscribed event listeners',
          'Verify proper cleanup of timers and intervals',
          'Implement data windowing for large datasets',
          'Check for circular references in data structures'
        ]
      };
    }

    return null;
  }

  private analyzeMemorySpikes(): MemoryLeakReport[] {
    if (this.snapshots.length < 5) return [];

    const reports: MemoryLeakReport[] = [];
    const recentSnapshots = this.snapshots.slice(-10); // Last 10 snapshots

    for (let i = 1; i < recentSnapshots.length; i++) {
      const current = recentSnapshots[i];
      const previous = recentSnapshots[i - 1];

      const spike = current.usedJSHeapSize - previous.usedJSHeapSize;

      if (spike > this.spikeThresholdMB) {
        reports.push({
          id: `memory-spike-${current.timestamp}`,
          type: 'spike',
          severity: spike > 100 ? 'critical' : 'high',
          description: `Sudden memory spike of ${spike.toFixed(1)} MB detected`,
          memoryIncrease: spike,
          growthRate: spike * 60, // Convert to MB/minute for consistency
          confidence: 0.9,
          timestamp: current.timestamp,
          recommendations: [
            'Check for large object allocations',
            'Verify data processing operations',
            'Monitor WebGL/WebGPU buffer allocations',
            'Check for memory leaks in third-party libraries'
          ]
        });
      }
    }

    return reports;
  }

  private analyzeMemoryPatterns(): MemoryLeakReport | null {
    if (this.snapshots.length < 120) return null; // Need at least 2 minutes

    // Look for sawtooth patterns (allocation followed by GC)
    const values = this.snapshots.slice(-120).map(s => s.usedJSHeapSize);
    const peaks: number[] = [];
    const valleys: number[] = [];

    // Simple peak/valley detection
    for (let i = 1; i < values.length - 1; i++) {
      if (values[i] > values[i - 1] && values[i] > values[i + 1]) {
        peaks.push(values[i]);
      }
      if (values[i] < values[i - 1] && values[i] < values[i + 1]) {
        valleys.push(values[i]);
      }
    }

    if (peaks.length > 5 && valleys.length > 5) {
      const avgPeak = peaks.reduce((a, b) => a + b, 0) / peaks.length;
      const avgValley = valleys.reduce((a, b) => a + b, 0) / valleys.length;
      const amplitude = avgPeak - avgValley;

      // If amplitude is growing over time, it might indicate a leak
      const recentPeaks = peaks.slice(-10);
      const olderPeaks = peaks.slice(-20, -10);

      if (recentPeaks.length > 0 && olderPeaks.length > 0) {
        const recentAvgPeak = recentPeaks.reduce((a, b) => a + b, 0) / recentPeaks.length;
        const olderAvgPeak = olderPeaks.reduce((a, b) => a + b, 0) / olderPeaks.length;

        if (recentAvgPeak > olderAvgPeak + 5) { // Peaks growing by more than 5MB
          return {
            id: `memory-pattern-${Date.now()}`,
            type: 'leak',
            severity: 'medium',
            description: `Memory usage pattern suggests potential leak (${amplitude.toFixed(1)} MB amplitude)`,
            memoryIncrease: recentAvgPeak - olderAvgPeak,
            growthRate: (recentAvgPeak - olderAvgPeak) / 10, // Over 10 peak intervals
            confidence: 0.7,
            timestamp: Date.now(),
            recommendations: [
              'Monitor garbage collection frequency',
              'Check for object retention in closures',
              'Implement proper cleanup in component unmount',
              'Use WeakMap/WeakSet for cache storage'
            ]
          };
        }
      }
    }

    return null;
  }

  getMemoryStats(): {
    currentUsage: number;
    averageUsage: number;
    peakUsage: number;
    growthRate: number;
    snapshotsCount: number;
  } {
    if (this.snapshots.length === 0) {
      return {
        currentUsage: 0,
        averageUsage: 0,
        peakUsage: 0,
        growthRate: 0,
        snapshotsCount: 0
      };
    }

    const values = this.snapshots.map(s => s.usedJSHeapSize);
    const currentUsage = this.snapshots[this.snapshots.length - 1].usedJSHeapSize;
    const averageUsage = values.reduce((a, b) => a + b, 0) / values.length;
    const peakUsage = Math.max(...values);

    // Calculate growth rate over last minute
    const recent = this.snapshots.slice(-60);
    let growthRate = 0;
    if (recent.length >= 2) {
      const first = recent[0].usedJSHeapSize;
      const last = recent[recent.length - 1].usedJSHeapSize;
      const timeDiff = (recent[recent.length - 1].timestamp - recent[0].timestamp) / (1000 * 60); // minutes
      growthRate = timeDiff > 0 ? (last - first) / timeDiff : 0;
    }

    return {
      currentUsage,
      averageUsage,
      peakUsage,
      growthRate,
      snapshotsCount: this.snapshots.length
    };
  }

  getRecentReports(minutes: number = 5): MemoryLeakReport[] {
    const cutoff = Date.now() - (minutes * 60 * 1000);
    
    // Filter reports within the specified time window
    const recentReports = this.reports.filter(report => report.timestamp >= cutoff);
    
    return recentReports;
  }

  addListener(callback: (report: MemoryLeakReport) => void): void {
    this.listeners.add(callback);
  }

  removeListener(callback: (report: MemoryLeakReport) => void): void {
    this.listeners.delete(callback);
  }

  clearSnapshots(): void {
    this.snapshots = [];
  }

  private storeReport(report: MemoryLeakReport): void {
    this.reports.push(report);
    
    // Keep only recent reports to prevent memory accumulation
    if (this.reports.length > this.maxReports) {
      this.reports = this.reports.slice(-this.maxReports);
    }
  }

  clearReports(): void {
    this.reports = [];
  }

  exportData(): { snapshots: MemorySnapshot[]; stats: ReturnType<MemoryLeakDetector['getMemoryStats']> } {
    return {
      snapshots: [...this.snapshots],
      stats: this.getMemoryStats()
    };
  }
}

// Singleton instance
export const memoryLeakDetector = new MemoryLeakDetector();