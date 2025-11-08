import { MemoryLeakReport, MemorySnapshot } from '../performance/memoryLeakDetector';

export interface LeakPattern {
  id: string;
  name: string;
  description: string;
  detector: (snapshots: MemorySnapshot[]) => boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  recommendations: string[];
}

export interface ObjectReference {
  id: string;
  type: string;
  created: number;
  lastAccessed: number;
  size: number;
  references: string[];
}

export class EnhancedLeakDetector {
  private static instance: EnhancedLeakDetector;
  private objectRegistry = new Map<string, ObjectReference>();
  private weakObjectMap = new WeakMap<object, string>(); // Maps objects to their IDs
  private referenceGraph = new Map<string, Set<string>>();
  private leakPatterns: LeakPattern[] = [];
  private monitoringInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeLeakPatterns();
  }

  static getInstance(): EnhancedLeakDetector {
    if (!EnhancedLeakDetector.instance) {
      EnhancedLeakDetector.instance = new EnhancedLeakDetector();
    }
    return EnhancedLeakDetector.instance;
  }

  private initializeLeakPatterns(): void {
    this.leakPatterns = [
      {
        id: 'event-listener-leak',
        name: 'Event Listener Leak',
        description: 'Objects with event listeners not being cleaned up',
        detector: this.detectEventListenerLeak.bind(this),
        severity: 'high',
        recommendations: [
          'Remove event listeners in cleanup functions',
          'Use AbortController for abortable event listeners',
          'Check for circular references in event handlers'
        ]
      },
      {
        id: 'timer-leak',
        name: 'Timer Leak',
        description: 'setTimeout/setInterval not cleared',
        detector: this.detectTimerLeak.bind(this),
        severity: 'medium',
        recommendations: [
          'Clear all timers in cleanup functions',
          'Use useEffect cleanup for React components',
          'Prefer requestAnimationFrame over setInterval for animations'
        ]
      },
      {
        id: 'dom-reference-leak',
        name: 'DOM Reference Leak',
        description: 'JavaScript objects holding references to detached DOM nodes',
        detector: this.detectDOMReferenceLeak.bind(this),
        severity: 'high',
        recommendations: [
          'Remove DOM references when elements are removed',
          'Use WeakRef for optional DOM references',
          'Implement proper cleanup in component unmount'
        ]
      },
      {
        id: 'circular-reference-leak',
        name: 'Circular Reference Leak',
        description: 'Objects with circular references preventing garbage collection',
        detector: this.detectCircularReferenceLeak.bind(this),
        severity: 'critical',
        recommendations: [
          'Break circular references in cleanup',
          'Use WeakMap/WeakSet for caches',
          'Implement proper object lifecycle management'
        ]
      },
      {
        id: 'subscription-leak',
        name: 'Subscription Leak',
        description: 'Observable subscriptions not unsubscribed',
        detector: this.detectSubscriptionLeak.bind(this),
        severity: 'medium',
        recommendations: [
          'Unsubscribe from observables in cleanup',
          'Use takeUntil pattern with RxJS',
          'Implement proper subscription management'
        ]
      }
    ];
  }

  registerObject(obj: object, type: string, size = 0): void {
    const id = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const reference: ObjectReference = {
      id,
      type,
      created: Date.now(),
      lastAccessed: Date.now(),
      size,
      references: []
    };

    this.objectRegistry.set(id, reference);
    this.weakObjectMap.set(obj, id);
  }

  updateAccess(obj: object): void {
    const id = this.weakObjectMap.get(obj);
    if (id) {
      const ref = this.objectRegistry.get(id);
      if (ref) {
        ref.lastAccessed = Date.now();
      }
    }
  }

  addReference(fromObj: object, toObj: object): void {
    const fromId = this.weakObjectMap.get(fromObj);
    const toId = this.weakObjectMap.get(toObj);

    if (fromId && toId) {
      const fromRef = this.objectRegistry.get(fromId);
      const toRef = this.objectRegistry.get(toId);

      if (fromRef && toRef) {
        if (!this.referenceGraph.has(fromRef.id)) {
          this.referenceGraph.set(fromRef.id, new Set());
        }
        this.referenceGraph.get(fromRef.id)!.add(toRef.id);

        if (!fromRef.references.includes(toRef.id)) {
          fromRef.references.push(toRef.id);
        }
      }
    }
  }

  detectLeaks(snapshots: MemorySnapshot[]): MemoryLeakReport[] {
    const reports: MemoryLeakReport[] = [];

    // Run pattern-based detection
    for (const pattern of this.leakPatterns) {
      if (pattern.detector(snapshots)) {
        reports.push({
          id: `${pattern.id}_${Date.now()}`,
          type: 'leak',
          severity: pattern.severity,
          description: pattern.description,
          memoryIncrease: 0, // Would be calculated based on pattern
          growthRate: 0,
          confidence: 0.8,
          timestamp: Date.now(),
          recommendations: pattern.recommendations
        });
      }
    }

    // Detect orphaned objects
    const orphanedReports = this.detectOrphanedObjects(snapshots);
    reports.push(...orphanedReports);

    // Detect memory fragmentation
    const fragmentationReport = this.detectMemoryFragmentation(snapshots);
    if (fragmentationReport) reports.push(fragmentationReport);

    return reports;
  }

  private detectEventListenerLeak(snapshots: MemorySnapshot[]): boolean {
    // Parameter included for interface compatibility, currently unused in heuristic detection
    // Future enhancement: integrate memory snapshots for more accurate leak detection
    void snapshots; // Explicitly mark as intentionally unused

    // Check for objects that might have event listeners
    // This is a heuristic-based detection
    let suspiciousObjects = 0;

    for (const ref of this.objectRegistry.values()) {
      if (ref.type.includes('Component') || ref.type.includes('Element')) {
        // Check if object has been alive for too long without access
        const age = Date.now() - ref.created;
        const timeSinceAccess = Date.now() - ref.lastAccessed;

        if (age > 300000 && timeSinceAccess > 60000) { // 5min alive, 1min no access
          suspiciousObjects++;
        }
      }
    }

    return suspiciousObjects > 10; // Threshold for suspicion
  }

  private detectTimerLeak(snapshots: MemorySnapshot[]): boolean {
    // Parameter included for interface compatibility, currently unused in heuristic detection
    void snapshots; // Explicitly mark as intentionally unused

    // Check for timer-related objects that haven't been cleaned up
    let timerObjects = 0;

    for (const ref of this.objectRegistry.values()) {
      if (ref.type.includes('Timeout') || ref.type.includes('Interval')) {
        const age = Date.now() - ref.created;
        if (age > 300000) { // 5 minutes
          timerObjects++;
        }
      }
    }

    return timerObjects > 5;
  }

  private detectDOMReferenceLeak(snapshots: MemorySnapshot[]): boolean {
    // Parameter included for interface compatibility, currently unused in heuristic detection
    void snapshots; // Explicitly mark as intentionally unused

    // Check for objects that reference DOM elements
    let domReferences = 0;

    for (const ref of this.objectRegistry.values()) {
      if (ref.references.some((refId: string) => refId.includes('Element') || refId.includes('Node'))) {
        const age = Date.now() - ref.created;
        if (age > 180000) { // 3 minutes
          domReferences++;
        }
      }
    }

    return domReferences > 20;
  }

  private detectCircularReferenceLeak(snapshots: MemorySnapshot[]): boolean {
    // Parameter included for interface compatibility, currently unused in graph-based detection
    void snapshots; // Explicitly mark as intentionally unused

    // Detect circular references in the reference graph
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (nodeId: string): boolean => {
      if (recursionStack.has(nodeId)) return true;
      if (visited.has(nodeId)) return false;

      visited.add(nodeId);
      recursionStack.add(nodeId);

      const neighbors = this.referenceGraph.get(nodeId);
      if (neighbors) {
        for (const neighbor of neighbors) {
          if (hasCycle(neighbor)) return true;
        }
      }

      recursionStack.delete(nodeId);
      return false;
    };

    for (const nodeId of this.referenceGraph.keys()) {
      if (hasCycle(nodeId)) {
        return true;
      }
    }

    return false;
  }

  private detectSubscriptionLeak(snapshots: MemorySnapshot[]): boolean {
    // Parameter included for interface compatibility, currently unused in heuristic detection
    void snapshots; // Explicitly mark as intentionally unused

    // Check for subscription-like objects
    let subscriptionObjects = 0;

    for (const ref of this.objectRegistry.values()) {
      if (ref.type.includes('Subscription') || ref.type.includes('Observable')) {
        const age = Date.now() - ref.created;
        if (age > 300000) { // 5 minutes
          subscriptionObjects++;
        }
      }
    }

    return subscriptionObjects > 10;
  }

  private detectOrphanedObjects(snapshots: MemorySnapshot[] = []): MemoryLeakReport[] {
    // Parameter included for interface compatibility, currently unused in registry-based detection
    void snapshots; // Explicitly mark as intentionally unused

    const reports: MemoryLeakReport[] = [];
    const now = Date.now();

    for (const ref of this.objectRegistry.values()) {
      const age = now - ref.created;
      const timeSinceAccess = now - ref.lastAccessed;

      // Objects that are old but haven't been accessed recently
      if (age > 600000 && timeSinceAccess > 300000) { // 10min old, 5min no access
        reports.push({
          id: `orphaned_${ref.id}`,
          type: 'leak',
          severity: 'medium',
          description: `Orphaned ${ref.type} object detected (${Math.round(age / 1000)}s old)`,
          memoryIncrease: ref.size,
          growthRate: 0,
          confidence: 0.7,
          timestamp: now,
          recommendations: [
            'Check for missing cleanup in component unmount',
            'Verify proper object disposal',
            'Implement WeakRef for optional references'
          ]
        });
      }
    }

    return reports;
  }

  private detectMemoryFragmentation(snapshots: MemorySnapshot[]): MemoryLeakReport | null {
    if (snapshots.length < 10) return null;

    // Calculate memory fragmentation by analyzing allocation patterns
    const recent = snapshots.slice(-10);
    const allocations = recent.map(s => s.usedJSHeapSize);
    const differences = [];

    for (let i = 1; i < allocations.length; i++) {
      differences.push(allocations[i] - allocations[i - 1]);
    }

    // High variance in allocation sizes might indicate fragmentation
    const mean = differences.reduce((a, b) => a + b, 0) / differences.length;
    const variance = differences.reduce((sum, diff) => sum + Math.pow(diff - mean, 2), 0) / differences.length;
    const stdDev = Math.sqrt(variance);

    // If standard deviation is high relative to mean, might indicate fragmentation
    if (stdDev > Math.abs(mean) * 2 && Math.abs(mean) > 1024 * 1024) { // 1MB threshold
      return {
        id: `fragmentation_${Date.now()}`,
        type: 'leak',
        severity: 'low',
        description: 'Memory fragmentation detected - frequent large allocations/deallocations',
        memoryIncrease: stdDev,
        growthRate: 0,
        confidence: 0.6,
        timestamp: Date.now(),
        recommendations: [
          'Consider using object pooling',
          'Batch allocations when possible',
          'Use SharedArrayBuffer for large data structures',
          'Implement memory defragmentation strategies'
        ]
      };
    }

    return null;
  }

  startMonitoring(intervalMs = 30000): void { // 30 seconds
    if (this.monitoringInterval) {
      this.stopMonitoring();
    }

    this.monitoringInterval = setInterval(() => {
      this.performLeakCheck();
    }, intervalMs);
  }

  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  private performLeakCheck(): void {
    // This would integrate with the main memory leak detector
    // For now, just log potential issues
    const orphanedCount = Array.from(this.objectRegistry.values())
      .filter(ref => Date.now() - ref.lastAccessed > 300000).length;

    if (orphanedCount > 0) {
      console.warn(`Memory leak detected: ${orphanedCount} orphaned objects`);
    }
  }

  getStats(): {
    registeredObjects: number;
    orphanedObjects: number;
    circularReferences: boolean;
    totalReferences: number;
  } {
    const now = Date.now();
    const orphanedObjects = Array.from(this.objectRegistry.values())
      .filter(ref => now - ref.lastAccessed > 300000).length;

    return {
      registeredObjects: this.objectRegistry.size,
      orphanedObjects,
      circularReferences: this.detectCircularReferenceLeak([]), // Pass empty array for basic check
      totalReferences: Array.from(this.referenceGraph.values())
        .reduce((sum, refs) => sum + refs.size, 0)
    };
  }

  cleanup(): void {
    // Remove old entries from registry
    const now = Date.now();
    const toDelete: string[] = [];

    for (const [id, ref] of this.objectRegistry) {
      if (now - ref.lastAccessed > 600000) { // 10 minutes
        toDelete.push(id);
      }
    }

    toDelete.forEach(id => {
      const ref = this.objectRegistry.get(id);
      if (ref) {
        this.referenceGraph.delete(ref.id);
      }
      this.objectRegistry.delete(id);
    });
  }
}

// Global instance
export const enhancedLeakDetector = EnhancedLeakDetector.getInstance();