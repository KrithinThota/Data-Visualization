import { ExtendedPerformanceMetrics } from '@/hooks/usePerformanceMonitor';
import { MemoryLeakReport } from './memoryLeakDetector';
import { GPUPerformanceReport } from './gpuMonitor';

export interface PerformanceAlert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  category: 'fps' | 'memory' | 'gpu' | 'rendering' | 'data' | 'stability';
  title: string;
  message: string;
  timestamp: number;
  value: number;
  threshold: number;
  acknowledged: boolean;
  autoResolved: boolean;
  metadata?: Record<string, unknown>;
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  category: PerformanceAlert['category'];
  type: PerformanceAlert['type'];
  condition: {
    metric: keyof ExtendedPerformanceMetrics;
    operator: '>' | '<' | '>=' | '<=' | '===' | '!==';
    threshold: number;
    duration?: number; // seconds
    consecutive?: number; // consecutive readings
  };
  cooldown: number; // milliseconds between alerts
  autoResolve: boolean;
  actions?: AlertAction[];
}

export interface AlertAction {
  type: 'notification' | 'config' | 'log' | 'callback';
  payload: unknown;
}

export class PerformanceAlertSystem {
  private alerts: PerformanceAlert[] = [];
  private rules: AlertRule[] = [];
  private activeAlerts: Map<string, PerformanceAlert> = new Map();
  private lastAlertTime: Map<string, number> = new Map();
  private listeners: Set<(alert: PerformanceAlert) => void> = new Set();

  constructor() {
    this.initializeDefaultRules();
  }

  private initializeDefaultRules(): void {
    this.rules = [
      // Critical FPS alerts
      {
        id: 'fps-critical-low',
        name: 'Critical FPS Drop',
        description: 'Frame rate has dropped critically low',
        category: 'fps',
        type: 'critical',
        condition: {
          metric: 'fps',
          operator: '<',
          threshold: 20,
          duration: 5,
          consecutive: 3
        },
        cooldown: 30000, // 30 seconds
        autoResolve: false,
        actions: [
          { type: 'notification', payload: { sound: true, persistent: true } },
          { type: 'config', payload: { emergencyMode: true } }
        ]
      },

      // FPS warning
      {
        id: 'fps-low-performance',
        name: 'Low Frame Rate',
        description: 'Frame rate below acceptable threshold',
        category: 'fps',
        type: 'warning',
        condition: {
          metric: 'fps',
          operator: '<',
          threshold: 30,
          duration: 10
        },
        cooldown: 60000, // 1 minute
        autoResolve: true,
        actions: [
          { type: 'notification', payload: { sound: false } }
        ]
      },

      // Memory critical
      {
        id: 'memory-critical-high',
        name: 'Critical Memory Usage',
        description: 'Memory usage critically high',
        category: 'memory',
        type: 'critical',
        condition: {
          metric: 'memoryUsage',
          operator: '>',
          threshold: 150, // MB
          duration: 30
        },
        cooldown: 60000,
        autoResolve: false,
        actions: [
          { type: 'notification', payload: { sound: true } },
          { type: 'config', payload: { forceGC: true } }
        ]
      },

      // Memory warning
      {
        id: 'memory-high-usage',
        name: 'High Memory Usage',
        description: 'Memory usage elevated',
        category: 'memory',
        type: 'warning',
        condition: {
          metric: 'memoryUsage',
          operator: '>',
          threshold: 100, // MB
          duration: 60
        },
        cooldown: 120000, // 2 minutes
        autoResolve: true
      },

      // GPU memory critical
      {
        id: 'gpu-memory-critical',
        name: 'Critical GPU Memory',
        description: 'GPU memory usage critically high',
        category: 'gpu',
        type: 'critical',
        condition: {
          metric: 'gpuMemoryUsage',
          operator: '>',
          threshold: 500 * 1024 * 1024, // 500MB
          duration: 15
        },
        cooldown: 30000,
        autoResolve: false,
        actions: [
          { type: 'notification', payload: { sound: true } }
        ]
      },

      // Render time warning
      {
        id: 'render-time-high',
        name: 'High Render Time',
        description: 'Render time exceeding frame budget',
        category: 'rendering',
        type: 'warning',
        condition: {
          metric: 'renderTime',
          operator: '>',
          threshold: 16.67, // One frame at 60fps
          duration: 10
        },
        cooldown: 30000,
        autoResolve: true
      },

      // Performance stability
      {
        id: 'performance-unstable',
        name: 'Performance Instability',
        description: 'Performance metrics showing high variance',
        category: 'stability',
        type: 'warning',
        condition: {
          metric: 'fps',
          operator: '<',
          threshold: 45, // Custom logic needed for variance
          duration: 30
        },
        cooldown: 120000,
        autoResolve: true
      }
    ];
  }

  addRule(rule: AlertRule): void {
    // Check for duplicate IDs
    if (this.rules.some(r => r.id === rule.id)) {
      throw new Error(`Rule with ID '${rule.id}' already exists`);
    }
    this.rules.push(rule);
  }

  removeRule(ruleId: string): void {
    this.rules = this.rules.filter(r => r.id !== ruleId);
    this.activeAlerts.delete(ruleId);
    this.lastAlertTime.delete(ruleId);
  }

  updateMetrics(metrics: ExtendedPerformanceMetrics): PerformanceAlert[] {
    const newAlerts: PerformanceAlert[] = [];

    for (const rule of this.rules) {
      const alert = this.checkRule(rule, metrics);
      if (alert) {
        newAlerts.push(alert);
        this.activeAlerts.set(alert.id, alert);

        // Notify listeners
        this.listeners.forEach(listener => listener(alert));
      }
    }

    // Check for auto-resolution
    this.checkAutoResolution(metrics);

    return newAlerts;
  }

  private checkRule(rule: AlertRule, metrics: ExtendedPerformanceMetrics): PerformanceAlert | null {
    const now = Date.now();
    const lastAlert = this.lastAlertTime.get(rule.id);

    // Check cooldown
    if (lastAlert && (now - lastAlert) < rule.cooldown) {
      return null;
    }

    const value = metrics[rule.condition.metric] as number;

    // For now, simplified condition checking (would need history for duration/consecutive)
    let conditionMet = false;

    switch (rule.condition.operator) {
      case '>': conditionMet = value > rule.condition.threshold; break;
      case '<': conditionMet = value < rule.condition.threshold; break;
      case '>=': conditionMet = value >= rule.condition.threshold; break;
      case '<=': conditionMet = value <= rule.condition.threshold; break;
      case '===': conditionMet = value === rule.condition.threshold; break;
      case '!==': conditionMet = value !== rule.condition.threshold; break;
    }

    if (conditionMet) {
      this.lastAlertTime.set(rule.id, now);

      return {
        id: `${rule.id}-${now}`,
        type: rule.type,
        category: rule.category,
        title: rule.name,
        message: rule.description,
        timestamp: now,
        value,
        threshold: rule.condition.threshold,
        acknowledged: false,
        autoResolved: false,
        metadata: {
          ruleId: rule.id,
          metric: rule.condition.metric,
          operator: rule.condition.operator
        }
      };
    }

    return null;
  }

  private checkAutoResolution(metrics: ExtendedPerformanceMetrics): void {
    for (const [alertId, alert] of this.activeAlerts) {
      const rule = this.rules.find(r => r.id === alert.metadata?.ruleId);
      if (!rule?.autoResolve) continue;

      const value = metrics[rule.condition.metric] as number;
      let conditionResolved = false;

      // Check if the condition is no longer met
      switch (rule.condition.operator) {
        case '>': conditionResolved = value <= rule.condition.threshold; break;
        case '<': conditionResolved = value >= rule.condition.threshold; break;
        case '>=': conditionResolved = value < rule.condition.threshold; break;
        case '<=': conditionResolved = value > rule.condition.threshold; break;
        case '===': conditionResolved = value !== rule.condition.threshold; break;
        case '!==': conditionResolved = value === rule.condition.threshold; break;
      }

      if (conditionResolved) {
        alert.autoResolved = true;
        this.activeAlerts.delete(alertId);

        // Create resolution alert
        const resolutionAlert: PerformanceAlert = {
          id: `resolved-${alertId}`,
          type: 'info',
          category: alert.category,
          title: `${alert.title} - Resolved`,
          message: `Performance issue has been automatically resolved`,
          timestamp: Date.now(),
          value,
          threshold: alert.threshold,
          acknowledged: false,
          autoResolved: true,
          metadata: { originalAlertId: alertId }
        };

        this.listeners.forEach(listener => listener(resolutionAlert));
      }
    }
  }

  acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId) || this.activeAlerts.get(alertId);
    if (alert) {
      alert.acknowledged = true;
      return true;
    }
    return false;
  }

  getActiveAlerts(): PerformanceAlert[] {
    return Array.from(this.activeAlerts.values());
  }

  getAlertsHistory(limit = 100): PerformanceAlert[] {
    return this.alerts.slice(-limit);
  }

  getAlertsByCategory(category: PerformanceAlert['category']): PerformanceAlert[] {
    return this.getActiveAlerts().filter(alert => alert.category === category);
  }

  getAlertsByType(type: PerformanceAlert['type']): PerformanceAlert[] {
    return this.getActiveAlerts().filter(alert => alert.type === type);
  }

  clearResolvedAlerts(): void {
    // Remove resolved alerts from history after some time
    const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago
    this.alerts = this.alerts.filter(alert =>
      !alert.autoResolved || alert.timestamp > cutoff
    );
  }

  addListener(callback: (alert: PerformanceAlert) => void): void {
    this.listeners.add(callback);
  }

  removeListener(callback: (alert: PerformanceAlert) => void): void {
    this.listeners.delete(callback);
  }

  exportAlerts(): string {
    return JSON.stringify({
      active: this.getActiveAlerts(),
      history: this.getAlertsHistory(),
      rules: this.rules,
      exportTimestamp: new Date().toISOString()
    }, null, 2);
  }

  importRules(rules: AlertRule[]): void {
    this.rules = [...this.rules, ...rules];
  }

  reset(): void {
    this.alerts = [];
    this.activeAlerts.clear();
    this.lastAlertTime.clear();
  }
}

// Integration with memory leak detector
export class MemoryLeakAlertBridge {
  private alertSystem: PerformanceAlertSystem;

  constructor(alertSystem: PerformanceAlertSystem) {
    this.alertSystem = alertSystem;
  }

  onMemoryLeakDetected(report: MemoryLeakReport): void {
    const alert: PerformanceAlert = {
      id: `memory-leak-${report.id}`,
      type: report.severity === 'critical' ? 'critical' : report.severity === 'high' ? 'warning' : 'info',
      category: 'memory',
      title: 'Memory Leak Detected',
      message: report.description,
      timestamp: report.timestamp,
      value: report.memoryIncrease,
      threshold: 10, // MB threshold
      acknowledged: false,
      autoResolved: false,
      metadata: {
        leakType: report.type,
        confidence: report.confidence,
        recommendations: report.recommendations
      }
    };

    // Add to alert system
    this.alertSystem.addListener(() => {}); // Placeholder for proper integration
  }
}

// Integration with GPU monitor
export class GPUAlertBridge {
  private alertSystem: PerformanceAlertSystem;

  constructor(alertSystem: PerformanceAlertSystem) {
    this.alertSystem = alertSystem;
  }

  onGPUReport(report: GPUPerformanceReport): void {
    // Create alerts for GPU warnings
    for (const warning of report.warnings) {
      const alert: PerformanceAlert = {
        id: `gpu-warning-${Date.now()}`,
        type: 'warning',
        category: 'gpu',
        title: 'GPU Performance Warning',
        message: warning,
        timestamp: report.timestamp,
        value: report.metrics.memoryUsage,
        threshold: 0, // Context-dependent
        acknowledged: false,
        autoResolved: false,
        metadata: {
          gpuMetrics: report.metrics,
          utilization: report.utilization
        }
      };

      // Add to alert system
      this.alertSystem.addListener(() => {}); // Placeholder for proper integration
    }
  }
}

// Singleton instance
export const performanceAlertSystem = new PerformanceAlertSystem();