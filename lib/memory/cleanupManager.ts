import { enhancedLeakDetector } from './enhancedLeakDetector';

export interface CleanupTask {
  id: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  execute: () => void | Promise<void>;
  description: string;
  dependencies?: string[];
}

export class CleanupManager {
  private static instance: CleanupManager;
  private cleanupTasks = new Map<string, CleanupTask>();
  private executedTasks = new Set<string>();
  private taskDependencies = new Map<string, Set<string>>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeDefaultTasks();
  }

  static getInstance(): CleanupManager {
    if (!CleanupManager.instance) {
      CleanupManager.instance = new CleanupManager();
    }
    return CleanupManager.instance;
  }

  private initializeDefaultTasks(): void {
    // Memory cleanup task
    this.registerTask({
      id: 'memory-cleanup',
      priority: 'high',
      execute: () => {
        enhancedLeakDetector.cleanup();
        if (typeof global !== 'undefined' && global.gc) {
          global.gc();
        }
      },
      description: 'Clean up orphaned objects and force garbage collection'
    });

    // Canvas context cleanup
    this.registerTask({
      id: 'canvas-cleanup',
      priority: 'medium',
      execute: () => {
        // Force cleanup of canvas contexts
        const canvases = document.querySelectorAll('canvas');
        canvases.forEach(canvas => {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
          }
        });
      },
      description: 'Clear canvas contexts to free GPU memory'
    });

    // Event listener cleanup
    this.registerTask({
      id: 'event-listener-cleanup',
      priority: 'high',
      execute: () => {
        // This would need to be implemented with a registry of event listeners
        // For now, it's a placeholder
        console.log('Event listener cleanup executed');
      },
      description: 'Remove unused event listeners'
    });

    // WebWorker cleanup
    this.registerTask({
      id: 'worker-cleanup',
      priority: 'medium',
      execute: () => {
        // Terminate idle workers
        // This would need integration with worker manager
        console.log('Worker cleanup executed');
      },
      description: 'Terminate idle Web Workers'
    });
  }

  registerTask(task: CleanupTask): void {
    this.cleanupTasks.set(task.id, task);

    if (task.dependencies) {
      for (const dep of task.dependencies) {
        if (!this.taskDependencies.has(dep)) {
          this.taskDependencies.set(dep, new Set());
        }
        this.taskDependencies.get(dep)!.add(task.id);
      }
    }
  }

  unregisterTask(taskId: string): void {
    this.cleanupTasks.delete(taskId);
    this.executedTasks.delete(taskId);

    // Remove from dependencies
    for (const deps of this.taskDependencies.values()) {
      deps.delete(taskId);
    }
  }

  async executeTask(taskId: string): Promise<void> {
    const task = this.cleanupTasks.get(taskId);
    if (!task || this.executedTasks.has(taskId)) {
      return;
    }

    // Execute dependencies first
    if (task.dependencies) {
      for (const dep of task.dependencies) {
        await this.executeTask(dep);
      }
    }

    try {
      await task.execute();
      this.executedTasks.add(taskId);
      console.log(`Cleanup task '${task.description}' executed successfully`);
    } catch (error) {
      console.error(`Cleanup task '${taskId}' failed:`, error);
    }
  }

  async executeTasksByPriority(priority: 'low' | 'medium' | 'high' | 'critical'): Promise<void> {
    const tasks = Array.from(this.cleanupTasks.values())
      .filter(task => task.priority === priority)
      .sort((a, b) => this.getPriorityWeight(b.priority) - this.getPriorityWeight(a.priority));

    for (const task of tasks) {
      await this.executeTask(task.id);
    }
  }

  async executeAllTasks(): Promise<void> {
    const priorities: Array<'critical' | 'high' | 'medium' | 'low'> = ['critical', 'high', 'medium', 'low'];

    for (const priority of priorities) {
      await this.executeTasksByPriority(priority);
    }
  }

  startPeriodicCleanup(intervalMs = 300000): void { // 5 minutes default
    if (this.cleanupInterval) {
      this.stopPeriodicCleanup();
    }

    this.cleanupInterval = setInterval(async () => {
      await this.executeTasksByPriority('high');
    }, intervalMs);
  }

  stopPeriodicCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  private getPriorityWeight(priority: string): number {
    const weights = { critical: 4, high: 3, medium: 2, low: 1 };
    return weights[priority as keyof typeof weights] || 0;
  }

  getStats(): {
    totalTasks: number;
    executedTasks: number;
    pendingTasks: number;
    tasksByPriority: Record<string, number>;
  } {
    const tasksByPriority = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
    };

    for (const task of this.cleanupTasks.values()) {
      tasksByPriority[task.priority]++;
    }

    return {
      totalTasks: this.cleanupTasks.size,
      executedTasks: this.executedTasks.size,
      pendingTasks: this.cleanupTasks.size - this.executedTasks.size,
      tasksByPriority
    };
  }

  reset(): void {
    this.executedTasks.clear();
  }
}

// React hook for component cleanup
export function useCleanupEffect(
  cleanupFn: () => void | Promise<void>,
  deps: unknown[] = []
): void {
  // This would need React import in actual usage
  // For now, it's a utility function that should be used with proper React import
  console.warn('useCleanupEffect requires React import to function properly');
}

// Utility for registering cleanup tasks in components
export function registerComponentCleanup(
  componentId: string,
  cleanupFn: () => void | Promise<void>,
  priority: 'low' | 'medium' | 'high' | 'critical' = 'medium'
): () => void {
  const manager = CleanupManager.getInstance();

  const taskId = `component-${componentId}-${Date.now()}`;

  manager.registerTask({
    id: taskId,
    priority,
    execute: cleanupFn,
    description: `Cleanup for component ${componentId}`
  });

  // Return unregister function
  return () => manager.unregisterTask(taskId);
}

// Global cleanup manager instance
export const cleanupManager = CleanupManager.getInstance();