import React, { useEffect, useRef, useCallback } from 'react';
import { enhancedLeakDetector } from '@/lib/memory/enhancedLeakDetector';
import { registerComponentCleanup } from '@/lib/memory/cleanupManager';
import { memoryMonitor, MemoryAlert } from '@/lib/memory/memoryMonitor';
import { canvasContextPool, float32ArrayPool, uint8ArrayPool } from '@/lib/memory/objectPool';
import { computationCache, dataCache } from '@/lib/memory/weakCache';
import { SharedBufferManager, SharedRingBuffer } from '@/lib/memory/sharedBuffer';

export interface MemoryManagementOptions {
  registerLeakDetection?: boolean;
  enableCleanup?: boolean;
  enableMonitoring?: boolean;
  enableObjectPooling?: boolean;
  enableSharedBuffers?: boolean;
  poolCanvasContext?: boolean;
  cacheComputations?: boolean;
  cacheData?: boolean;
}

/**
 * Comprehensive React hook for memory management integration
 */
export function useMemoryManagement(componentId: string, options: MemoryManagementOptions = {}) {
  const {
    registerLeakDetection = true,
    enableCleanup = true,
    enableMonitoring = false,
    enableObjectPooling = true,
    enableSharedBuffers = false,
    poolCanvasContext = false,
    cacheComputations = false,
    cacheData = false
  } = options;

  const componentRef = useRef({
    registered: false,
    cleanupFunctions: new Set<() => void>(),
    pooledObjects: new Set<object>(),
    sharedBuffers: new Map<string, SharedArrayBuffer>()
  });

  // Register component for memory leak detection
  useEffect(() => {
    if (!registerLeakDetection) return;

    enhancedLeakDetector.registerObject(componentRef.current, `ReactComponent_${componentId}`, 1024);
    componentRef.current.registered = true;

    return () => {
      // EnhancedLeakDetector uses WeakMap for cleanup automatically
      // No manual unregistration needed
    };
  }, [componentId, registerLeakDetection]);

  // Setup cleanup management
  useEffect(() => {
    if (!enableCleanup) return;

    const unregisterCleanup = registerComponentCleanup(
      componentId,
      () => {
        // Release all pooled objects
        componentRef.current.pooledObjects.forEach(obj => {
          if (canvasContextPool.getStats().active > 0) {
            try {
              canvasContextPool.release(obj as CanvasRenderingContext2D);
            } catch (e) {
              console.warn(`Failed to release canvas context:`, e);
            }
          }
        });

        // Clear caches if enabled
        if (cacheComputations) {
          computationCache.clear();
        }
        if (cacheData) {
          dataCache.clear();
        }

        // Clean up shared buffers
        componentRef.current.sharedBuffers.forEach((_, key) => {
          SharedBufferManager.deleteBuffer(key);
        });
        componentRef.current.sharedBuffers.clear();

        // Execute all cleanup functions
        componentRef.current.cleanupFunctions.forEach(cleanupFn => {
          try {
            cleanupFn();
          } catch (error) {
            console.error(`Cleanup function failed for ${componentId}:`, error);
          }
        });
      },
      'medium'
    );

    return () => {
      unregisterCleanup();
    };
  }, [componentId, enableCleanup, cacheComputations, cacheData]);

  // Start memory monitoring if enabled
  useEffect(() => {
    if (!enableMonitoring) return;

    memoryMonitor.startMonitoring();

    return () => {
      memoryMonitor.stopMonitoring();
    };
  }, [enableMonitoring]);

  // Acquire pooled canvas context
  const acquireCanvasContext = useCallback(() => {
    if (!enableObjectPooling || !poolCanvasContext) return null;

    const ctx = canvasContextPool.acquire();
    componentRef.current.pooledObjects.add(ctx);
    return ctx;
  }, [enableObjectPooling, poolCanvasContext]);

  // Release pooled canvas context
  const releaseCanvasContext = useCallback((ctx: CanvasRenderingContext2D | null) => {
    if (!ctx) return;

    if (componentRef.current.pooledObjects.has(ctx)) {
      canvasContextPool.release(ctx);
      componentRef.current.pooledObjects.delete(ctx);
    }
  }, []);

  // Acquire typed array from pool
  const acquireFloat32Array = useCallback((size?: number) => {
    const array = float32ArrayPool.acquire(size);
    componentRef.current.pooledObjects.add(array);
    return array;
  }, []);

  // Acquire typed array from pool
  const acquireUint8Array = useCallback((size?: number) => {
    const array = uint8ArrayPool.acquire(size);
    componentRef.current.pooledObjects.add(array);
    return array;
  }, []);

  // Release typed array to pool
  const releaseArray = useCallback((array: Float32Array | Uint8Array | null) => {
    if (!array) return;

    if (componentRef.current.pooledObjects.has(array)) {
      if (array instanceof Float32Array) {
        float32ArrayPool.release(array);
      } else if (array instanceof Uint8Array) {
        uint8ArrayPool.release(array);
      }
      componentRef.current.pooledObjects.delete(array);
    }
  }, []);

  // Create shared buffer
  const createSharedBuffer = useCallback((key: string, size: number) => {
    if (!enableSharedBuffers) return null;

    const buffer = SharedBufferManager.createBuffer(key, size);
    componentRef.current.sharedBuffers.set(key, buffer);
    return buffer;
  }, [enableSharedBuffers]);

  // Create shared ring buffer
  const createSharedRingBuffer = useCallback((capacity: number) => {
    if (!enableSharedBuffers) return null;
    return new SharedRingBuffer(capacity);
  }, [enableSharedBuffers]);

  // Register cleanup function
  const registerCleanup = useCallback((cleanupFn: () => void) => {
    componentRef.current.cleanupFunctions.add(cleanupFn);
    
    // Return unregister function
    return () => {
      componentRef.current.cleanupFunctions.delete(cleanupFn);
    };
  }, []);

  // Update memory access for leak detection
  const updateMemoryAccess = useCallback(() => {
    if (registerLeakDetection && componentRef.current.registered) {
      enhancedLeakDetector.updateAccess(componentRef.current);
    }
  }, [registerLeakDetection]);

  // Get memory stats
  const getMemoryStats = useCallback(() => {
    return {
      leakDetection: enhancedLeakDetector.getStats(),
      pools: {
        canvas: canvasContextPool.getStats(),
        float32: float32ArrayPool.getStats(),
        uint8: uint8ArrayPool.getStats()
      },
      caches: {
        computation: computationCache.getStats(),
        data: dataCache.getStats()
      },
      sharedBuffers: SharedBufferManager.getStats()
    };
  }, []);

  return {
    // Canvas context pooling
    acquireCanvasContext,
    releaseCanvasContext,
    
    // Typed array pooling
    acquireFloat32Array,
    acquireUint8Array,
    releaseArray,
    
    // Shared buffer management
    createSharedBuffer,
    createSharedRingBuffer,
    
    // Cleanup management
    registerCleanup,
    
    // Memory monitoring
    updateMemoryAccess,
    getMemoryStats,
    
    // Memory utilities
    enhancedLeakDetector,
    memoryMonitor,
    computationCache,
    dataCache
  };
}

/**
 * Specialized hook for chart components
 */
export function useChartMemoryManagement(
  chartId: string, 
  dataPoints: number,
  canvasWidth: number,
  canvasHeight: number
) {
  const memory = useMemoryManagement(`Chart_${chartId}`, {
    registerLeakDetection: true,
    enableCleanup: true,
    enableMonitoring: true,
    enableObjectPooling: true,
    poolCanvasContext: true,
    cacheComputations: true
  });

  const pooledContextRef = useRef<CanvasRenderingContext2D | null>(null);
  const dataBufferRef = useRef<Float32Array | null>(null);

  // Acquire canvas context on mount
  useEffect(() => {
    pooledContextRef.current = memory.acquireCanvasContext();
    
    return () => {
      memory.releaseCanvasContext(pooledContextRef.current);
      pooledContextRef.current = null;
    };
  },);

  // Create data buffer for chart data
  useEffect(() => {
    const requiredSize = dataPoints * 2; // timestamp and value
    dataBufferRef.current = memory.acquireFloat32Array(requiredSize);
    
    return () => {
      memory.releaseArray(dataBufferRef.current);
      dataBufferRef.current = null;
    };
  }, [dataPoints, memory]);

  // Process chart data into buffer
  const processDataToBuffer = useCallback((data: Array<{ timestamp: number; value: number }>) => {
    if (!dataBufferRef.current || data.length > dataBufferRef.current.length / 2) {
      console.warn('Chart data buffer overflow, consider increasing pool size');
      return null;
    }

    const buffer = dataBufferRef.current;
    for (let i = 0; i < data.length; i++) {
      buffer[i * 2] = data[i].timestamp;
      buffer[i * 2 + 1] = data[i].value;
    }

    return buffer;
  }, []);

  return {
    ...memory,
    pooledContext: pooledContextRef,
    dataBuffer: dataBufferRef,
    processDataToBuffer,
    canvasDimensions: { width: canvasWidth, height: canvasHeight },
    dataPointCount: dataPoints
  };
}

/**
 * Hook for memory alerts management
 */
export function useMemoryAlerts() {
  const [alerts, setAlerts] = React.useState<MemoryAlert[]>(() => memoryMonitor.getActiveAlerts());

  useEffect(() => {
    const handleAlert = (alert: MemoryAlert) => {
      setAlerts(prev => [...prev, alert]);
    };

    memoryMonitor.addListener(handleAlert);

    return () => {
      memoryMonitor.removeListener(handleAlert);
    };
  }, []);

  const resolveAlert = useCallback((alertId: string) => {
    memoryMonitor.resolveAlert(alertId);
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));
  }, []);

  const getStats = useCallback(() => {
    return memoryMonitor.getStats();
  }, []);

  return {
    alerts,
    resolveAlert,
    getStats
  };
}

// Re-export for convenience
export type { MemoryAlert } from '@/lib/memory/memoryMonitor';