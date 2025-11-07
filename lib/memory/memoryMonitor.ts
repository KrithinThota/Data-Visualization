import { MemoryLeakReport } from '../performance/memoryLeakDetector';
import { enhancedLeakDetector } from './enhancedLeakDetector';
import { cleanupManager } from './cleanupManager';

export interface MemoryAlert {
  id: string;
  type: 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  timestamp: number;
  actions: MemoryAlertAction[];
  autoResolve?: boolean;
}

export interface MemoryAlertAction {
  label: string;
  action: () => void | Promise<void>;
  primary?: boolean;
}

export class MemoryMonitor {
  private static instance: MemoryMonitor;
  private alerts: MemoryAlert[] = [];
  private listeners = new Set<(alert: MemoryAlert) => void>();
  private thresholds = {
    memoryUsage: 100 * 1024 * 1024, // 100MB
    growthRate: 5 * 1024 * 1024, // 5MB/minute
    leakCount: 10,
    fps: 30
  };

  private monitoringInterval: NodeJS.Timeout | null = null;
  private lastMemoryCheck = 0;
  private consecutiveWarnings = 0;

  constructor() {
    this.initializeDefaultAlerts();
  }

  static getInstance(): MemoryMonitor {
    if (!MemoryMonitor.instance) {
      MemoryMonitor.instance = new MemoryMonitor();
    }
    return MemoryMonitor.instance;
  }

  private initializeDefaultAlerts(): void {
    // Memory usage alert
    this.createAlert({
      id: 'high-memory-usage',
      type: 'warning',
      title: 'High Memory Usage',
      message: 'Application memory usage has exceeded safe limits',
      timestamp: Date.now(),
      actions: [
        {
          label: 'Run Cleanup',
          action: () => cleanupManager.executeTasksByPriority('high'),
          primary: true
        },
        {
          label: 'Force GC',
          action: () => {
            if (typeof global !== 'undefined' && global.gc) {
              global.gc();
            }
          }
        }
      ],
      autoResolve: true
    });

    // Memory leak alert
    this.createAlert({
      id: 'memory-leak-detected',
      type: 'error',
      title: 'Memory Leak Detected',
      message: 'Potential memory leaks have been detected in the application',
      timestamp: Date.now(),
      actions: [
        {
          label: 'View Details',
          action: () => console.log('Memory leak details:', enhancedLeakDetector.getStats()),
          primary: true
        },
        {
          label: 'Run Full Cleanup',
          action: () => cleanupManager.executeAllTasks()
        }
      ]
    });

    // Performance degradation alert
    this.createAlert({
      id: 'performance-degradation',
      type: 'warning',
      title: 'Performance Degradation',
      message: 'Application performance has degraded significantly',
      timestamp: Date.now(),
      actions: [
        {
          label: 'Reduce Data Points',
          action: () => {
            // This would need to integrate with data management
            console.log('Reducing data points for performance');
          },
          primary: true
        },
        {
          label: 'Enable LOD',
          action: () => {
            // Enable level-of-detail rendering
            console.log('Enabling LOD rendering');
          }
        }
      ],
      autoResolve: true
    });
  }

  startMonitoring(intervalMs = 10000): void { // 10 seconds
    if (this.monitoringInterval) {
      this.stopMonitoring();
    }

    this.monitoringInterval = setInterval(() => {
      this.performMemoryCheck();
    }, intervalMs);
  }

  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  private async performMemoryCheck(): Promise<void> {
    const now = Date.now();
    const timeSinceLastCheck = now - this.lastMemoryCheck;

    if (timeSinceLastCheck < 5000) return; // Minimum 5 second intervals

    this.lastMemoryCheck = now;

    // Check memory usage
    const memoryUsage = (performance as unknown as { memory?: { usedJSHeapSize?: number } }).memory?.usedJSHeapSize || 0;
    if (memoryUsage > this.thresholds.memoryUsage) {
      await this.triggerAlert('high-memory-usage');
      this.consecutiveWarnings++;
    } else if (memoryUsage < this.thresholds.memoryUsage * 0.8) {
      this.consecutiveWarnings = Math.max(0, this.consecutiveWarnings - 1);
    }

    // Check for memory leaks
    const leakStats = enhancedLeakDetector.getStats();
    if (leakStats.orphanedObjects > this.thresholds.leakCount) {
      await this.triggerAlert('memory-leak-detected');
    }

    // Check performance
    // This would integrate with performance monitor
    const fps = 60; // Placeholder - would come from performance monitor
    if (fps < this.thresholds.fps) {
      await this.triggerAlert('performance-degradation');
    }

    // Auto-resolve alerts if conditions improve
    this.checkAutoResolve();
  }

  private async triggerAlert(alertId: string): Promise<void> {
    const alert = this.alerts.find(a => a.id === alertId);
    if (!alert) return;

    // Update timestamp
    alert.timestamp = Date.now();

    // Notify listeners
    this.listeners.forEach(listener => listener(alert));

    // Execute primary action if auto-resolve is enabled
    if (alert.autoResolve) {
      const primaryAction = alert.actions.find(a => a.primary);
      if (primaryAction) {
        try {
          await primaryAction.action();
        } catch (error) {
          console.error('Auto-resolve action failed:', error);
        }
      }
    }
  }

  createAlert(alert: MemoryAlert): void {
    // Remove existing alert with same ID
    this.alerts = this.alerts.filter(a => a.id !== alert.id);
    this.alerts.push(alert);
  }

  resolveAlert(alertId: string): void {
    this.alerts = this.alerts.filter(a => a.id !== alertId);
  }

  getActiveAlerts(): MemoryAlert[] {
    return [...this.alerts];
  }

  getAlertHistory(hours = 24): MemoryAlert[] {
    const cutoff = Date.now() - (hours * 60 * 60 * 1000);
    // In a real implementation, this would store historical alerts
    return this.alerts.filter(alert => alert.timestamp > cutoff);
  }

  updateThresholds(newThresholds: Partial<typeof this.thresholds>): void {
    this.thresholds = { ...this.thresholds, ...newThresholds };
  }

  addListener(callback: (alert: MemoryAlert) => void): void {
    this.listeners.add(callback);
  }

  removeListener(callback: (alert: MemoryAlert) => void): void {
    this.listeners.delete(callback);
  }

  private checkAutoResolve(): void {
    // Auto-resolve alerts when conditions improve
    const memoryUsage = (performance as any).memory?.usedJSHeapSize || 0;

    if (memoryUsage < this.thresholds.memoryUsage * 0.7) {
      this.resolveAlert('high-memory-usage');
    }

    const leakStats = enhancedLeakDetector.getStats();
    if (leakStats.orphanedObjects < this.thresholds.leakCount / 2) {
      this.resolveAlert('memory-leak-detected');
    }

    // Auto-resolve performance issues (placeholder)
    this.resolveAlert('performance-degradation');
  }

  getStats(): {
    activeAlerts: number;
    totalAlerts: number;
    memoryUsage: number;
    leakStats: ReturnType<typeof enhancedLeakDetector.getStats>;
    thresholds: typeof MemoryMonitor.prototype.thresholds;
  } {
    return {
      activeAlerts: this.alerts.length,
      totalAlerts: this.alerts.length, // Would track historical total
      memoryUsage: (performance as unknown as { memory?: { usedJSHeapSize?: number } }).memory?.usedJSHeapSize || 0,
      leakStats: enhancedLeakDetector.getStats(),
      thresholds: { ...this.thresholds }
    };
  }
}

// React hook for memory alerts (requires React import in components)
export function createMemoryAlertsHook() {
  return function useMemoryAlerts() {
    // This would be implemented with proper React imports in component files
    console.warn('useMemoryAlerts requires React import');
    return {
      alerts: [],
      resolveAlert: () => {},
      getStats: () => ({})
    };
  };
}

// Global instance
export const memoryMonitor = MemoryMonitor.getInstance();