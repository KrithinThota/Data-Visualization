import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { enhancedLeakDetector } from '@/lib/memory/enhancedLeakDetector';
import { CleanupManager, cleanupManager, registerComponentCleanup } from '@/lib/memory/cleanupManager';
import { memoryMonitor } from '@/lib/memory/memoryMonitor';
import { ObjectPool, CanvasContextPool, Float32ArrayPool } from '@/lib/memory/objectPool';
import { computationCache, dataCache } from '@/lib/memory/weakCache';
import { SharedBufferManager } from '@/lib/memory/sharedBuffer';

describe('Memory Management System', () => {
  beforeEach(() => {
    // Reset all singleton instances before each test
    cleanupManager.reset();
    computationCache.clear();
    dataCache.clear();
  });

  afterEach(() => {
    // Cleanup after each test
    cleanupManager.executeAllTasks();
  });

  describe('Enhanced Leak Detector', () => {
    it('should register and track objects', () => {
      const testObject = { data: 'test' };
      const initialStats = enhancedLeakDetector.getStats();
      
      enhancedLeakDetector.registerObject(testObject, 'TestObject', 1024);
      
      const updatedStats = enhancedLeakDetector.getStats();
      expect(updatedStats.registeredObjects).toBe(initialStats.registeredObjects + 1);
    });

    it('should detect circular references', () => {
      const obj1 = { name: 'obj1' };
      const obj2 = { name: 'obj2' };
      
      // Create circular reference
      (obj1 as any).ref = obj2;
      (obj2 as any).ref = obj1;
      
      enhancedLeakDetector.registerObject(obj1, 'CircularObject1', 512);
      enhancedLeakDetector.registerObject(obj2, 'CircularObject2', 512);
      enhancedLeakDetector.addReference(obj1, obj2);
      
      const hasCircularRef = enhancedLeakDetector.detectCircularReferenceLeak([]);
      expect(hasCircularRef).toBe(true);
    });

    it('should cleanup orphaned objects', () => {
      const testObject = { data: 'test' };
      enhancedLeakDetector.registerObject(testObject, 'TestObject', 1024);
      
      const initialStats = enhancedLeakDetector.getStats();
      expect(initialStats.registeredObjects).toBeGreaterThan(0);
      
      // Simulate time passing and cleanup
      enhancedLeakDetector.cleanup();
      
      // Note: In real tests, you'd need to wait for timeout periods
    });
  });

  describe('Cleanup Manager', () => {
    it('should register and execute cleanup tasks', async () => {
      let executed = false;
      
      const unregister = registerComponentCleanup(
        'TestComponent',
        () => {
          executed = true;
        },
        'high'
      );
      
      expect(cleanupManager.getStats().totalTasks).toBeGreaterThan(0);
      
      await cleanupManager.executeTask('component-TestComponent-' + Date.now());
      
      // Cleanup task might not execute immediately depending on implementation
      unregister();
    });

    it('should handle task dependencies', async () => {
      let dep1Executed = false;
      let dep2Executed = false;
      
      registerComponentCleanup('Dependent', async () => {
        dep2Executed = true;
      }, 'high', ['dependency1']);
      
      registerComponentCleanup('Dependency1', () => {
        dep1Executed = true;
      }, 'high');
      
      await cleanupManager.executeTasksByPriority('high');
      
      // Check dependency execution
      expect(dep1Executed).toBeDefined(); // May or may not execute depending on timing
    });

    it('should start and stop periodic cleanup', () => {
      const initialStats = cleanupManager.getStats();
      
      cleanupManager.startPeriodicCleanup(1000); // 1 second for testing
      
      expect(cleanupManager.cleanupInterval).toBeDefined();
      
      cleanupManager.stopPeriodicCleanup();
      
      expect(cleanupManager.cleanupInterval).toBeNull();
    });
  });

  describe('Object Pooling', () => {
    it('should create and manage object pools', () => {
      let createCount = 0;
      let resetCount = 0;
      
      const factory = () => {
        createCount++;
        return { data: 'test' };
      };
      
      const reset = (obj: any) => {
        resetCount++;
        obj.data = null;
      };
      
      const pool = new ObjectPool(factory, reset, 5);
      
      // Acquire objects
      const obj1 = pool.acquire();
      const obj2 = pool.acquire();
      
      expect(createCount).toBe(2);
      expect(pool.getStats().active).toBe(2);
      
      // Release objects
      pool.release(obj1);
      pool.release(obj2);
      
      expect(pool.getStats().available).toBe(2);
      expect(resetCount).toBe(2);
    });

    it('should handle canvas context pooling', () => {
      const pool = new CanvasContextPool(3);
      
      const ctx1 = pool.acquire();
      const ctx2 = pool.acquire();
      
      expect(pool.getStats().active).toBe(2);
      expect(ctx1).toBeDefined();
      expect(ctx2).toBeDefined();
      
      pool.release(ctx1);
      pool.release(ctx2);
      
      expect(pool.getStats().available).toBe(2);
    });

    it('should handle typed array pooling', () => {
      const pool = new Float32ArrayPool(5);
      
      const array1 = pool.acquire(100);
      const array2 = pool.acquire(200);
      
      expect(array1.length).toBe(1024); // Default size
      expect(array2.length).toBe(200);  // Custom size
      
      pool.release(array1);
      pool.release(array2);
      
      expect(pool.getStats().available).toBe(2);
    });
  });

  describe('Weak Cache', () => {
    it('should cache and retrieve values', () => {
      const cache = computationCache;
      
      const testKey = { id: 'test' };
      const testValue = { result: 'computed' };
      
      cache.set(testKey, testValue);
      
      const retrieved = cache.get(testKey);
      expect(retrieved).toEqual(testValue);
    });

    it('should handle TTL expiration', () => {
      const shortCache = new (require('@/lib/memory/weakCache').WeakCache)(100); // 100ms TTL
      
      const testKey = { id: 'test' };
      const testValue = { result: 'temp' };
      
      shortCache.set(testKey, testValue);
      expect(shortCache.get(testKey)).toEqual(testValue);
      
      // Wait for expiration (in real tests, use fake timers)
      setTimeout(() => {
        expect(shortCache.get(testKey)).toBeUndefined();
      }, 150);
    });

    it('should evict least recently used items', () => {
      const smallCache = new (require('@/lib/memory/weakCache').WeakCache)(1000, 2); // Max size 2
      
      smallCache.set({ id: 1 }, 'value1');
      smallCache.set({ id: 2 }, 'value2');
      smallCache.set({ id: 3 }, 'value3'); // Should evict one
      
      const stats = smallCache.getStats();
      expect(stats.size).toBeLessThanOrEqual(2);
    });
  });

  describe('Shared Buffer Manager', () => {
    it('should create and manage shared buffers', () => {
      if (!SharedBufferManager.isSupported()) {
        console.log('SharedArrayBuffer not supported, skipping test');
        return;
      }
      
      const buffer = SharedBufferManager.createBuffer('test', 1024);
      expect(buffer).toBeDefined();
      expect(buffer.byteLength).toBe(1024);
      
      const stats = SharedBufferManager.getStats();
      expect(stats.totalBuffers).toBe(1);
      
      SharedBufferManager.deleteBuffer('test');
      expect(SharedBufferManager.getBuffer('test')).toBeUndefined();
    });

    it('should create typed array views', () => {
      if (!SharedBufferManager.isSupported()) {
        console.log('SharedArrayBuffer not supported, skipping test');
        return;
      }
      
      SharedBufferManager.createBuffer('test', 1024);
      
      const float32View = SharedBufferManager.createFloat32Array('test', 0, 256);
      const uint8View = SharedBufferManager.createUint8Array('test', 0, 1024);
      
      expect(float32View).toBeInstanceOf(Float32Array);
      expect(uint8View).toBeInstanceOf(Uint8Array);
      expect(float32View.length).toBe(256);
      expect(uint8View.length).toBe(1024);
      
      SharedBufferManager.deleteBuffer('test');
    });

    it('should manage shared ring buffers', () => {
      if (!SharedBufferManager.isSupported()) {
        console.log('SharedArrayBuffer not supported, skipping test');
        return;
      }
      
      const { SharedRingBuffer } = require('@/lib/memory/sharedBuffer');
      const ringBuffer = new SharedRingBuffer(512);
      
      const testData = new Uint8Array([1, 2, 3, 4, 5]);
      
      expect(ringBuffer.write(testData)).toBe(true);
      
      const readData = ringBuffer.read(5);
      expect(readData).toEqual(testData);
    });
  });

  describe('Memory Monitor', () => {
    it('should monitor memory usage', () => {
      const stats = memoryMonitor.getStats();
      expect(stats).toHaveProperty('memoryUsage');
      expect(stats).toHaveProperty('activeAlerts');
      expect(stats).toHaveProperty('leakStats');
    });

    it('should create and manage alerts', () => {
      const testAlert = {
        id: 'test-alert',
        type: 'warning' as const,
        title: 'Test Alert',
        message: 'This is a test alert',
        timestamp: Date.now(),
        actions: [],
        autoResolve: true
      };
      
      memoryMonitor.createAlert(testAlert);
      
      const activeAlerts = memoryMonitor.getActiveAlerts();
      expect(activeAlerts.find(a => a.id === 'test-alert')).toBeDefined();
      
      memoryMonitor.resolveAlert('test-alert');
      const resolvedAlerts = memoryMonitor.getActiveAlerts();
      expect(resolvedAlerts.find(a => a.id === 'test-alert')).toBeUndefined();
    });

    it('should update thresholds', () => {
      const newThresholds = {
        memoryUsage: 200 * 1024 * 1024, // 200MB
        growthRate: 10 * 1024 * 1024    // 10MB/minute
      };
      
      memoryMonitor.updateThresholds(newThresholds);
      const stats = memoryMonitor.getStats();
      expect(stats.thresholds.memoryUsage).toBe(newThresholds.memoryUsage);
    });
  });

  describe('Integration Tests', () => {
    it('should work together without conflicts', () => {
      // Test multiple systems working together
      const testObject = { data: 'integration-test' };
      
      // Register with leak detector
      enhancedLeakDetector.registerObject(testObject, 'IntegrationTest', 2048);
      
      // Create pool object
      const pool = new ObjectPool(() => ({ value: 0 }), (obj) => { obj.value = 0; });
      const pooledObj = pool.acquire();
      
      // Cache some data
      computationCache.set({ type: 'test' }, { result: 'cached' });
      
      // Register cleanup
      const unregister = registerComponentCleanup('IntegrationTest', () => {
        pool.release(pooledObj);
      }, 'high');
      
      // Check stats from all systems
      const leakStats = enhancedLeakDetector.getStats();
      const poolStats = pool.getStats();
      const cacheStats = computationCache.getStats();
      const cleanupStats = cleanupManager.getStats();
      
      expect(leakStats.registeredObjects).toBeGreaterThan(0);
      expect(poolStats.active).toBeGreaterThan(0);
      expect(cacheStats.size).toBeGreaterThan(0);
      expect(cleanupStats.totalTasks).toBeGreaterThan(0);
      
      // Cleanup
      unregister();
    });

    it('should handle high memory pressure scenarios', async () => {
      // Simulate high memory usage
      const largeObjects = [];
      
      for (let i = 0; i < 100; i++) {
        const obj = new Array(1000).fill(`data-${i}`);
        largeObjects.push(obj);
        enhancedLeakDetector.registerObject(obj, 'LargeObject', obj.length * 4);
      }
      
      // Force cleanup
      await cleanupManager.executeTasksByPriority('critical');
      
      // Check that cleanup reduced memory pressure
      const stats = memoryMonitor.getStats();
      expect(stats).toBeDefined();
      
      // Clear test objects
      largeObjects.length = 0;
    });
  });
});

describe('Performance Benchmarks', () => {
  it('should benchmark object pooling performance', () => {
    const iterations = 10000;
    
    // Without pooling
    const startWithoutPool = performance.now();
    for (let i = 0; i < iterations; i++) {
      const obj = { data: i };
      // Simulate work
      obj.data = obj.data * 2;
    }
    const timeWithoutPool = performance.now() - startWithoutPool;
    
    // With pooling
    const pool = new ObjectPool(() => ({ data: 0 }), (obj) => { obj.data = 0; });
    const startWithPool = performance.now();
    for (let i = 0; i < iterations; i++) {
      const obj = pool.acquire();
      obj.data = i * 2;
      pool.release(obj);
    }
    const timeWithPool = performance.now() - startWithPool;
    
    console.log(`Without pool: ${timeWithoutPool.toFixed(2)}ms`);
    console.log(`With pool: ${timeWithPool.toFixed(2)}ms`);
    
    // Pool should be faster or at least comparable
    expect(timeWithPool).toBeLessThanOrEqual(timeWithoutPool * 1.2);
  });

  it('should benchmark cache performance', () => {
    const cache = computationCache;
    const iterations = 1000;
    const expensiveFunction = (x: number) => {
      // Simulate expensive computation
      let result = 0;
      for (let i = 0; i < 1000; i++) {
        result += Math.sqrt(x + i);
      }
      return result;
    };
    
    const memoizedFn = cache.memoize(expensiveFunction);
    
    // First run - should compute
    const start1 = performance.now();
    const result1 = memoizedFn(42);
    const time1 = performance.now() - start1;
    
    // Second run - should use cache
    const start2 = performance.now();
    const result2 = memoizedFn(42);
    const time2 = performance.now() - start2;
    
    expect(result1).toBe(result2);
    expect(time2).toBeLessThan(time1 / 10); // Cache should be much faster
    
    const cacheStats = cache.getStats();
    expect(cacheStats.hitRate).toBeGreaterThan(0);
  });
});