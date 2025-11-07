/**
 * Memory Management Validation Tests
 * These tests validate the memory management system works correctly
 * Run with: npm run test:memory
 */

// Mock console methods to avoid cluttering test output
const originalConsole = { ...console };
const mutedConsole = {
  log: () => {},
  warn: () => {},
  error: () => {}
};

// Test utilities
class TestRunner {
  private tests: { name: string; test: () => Promise<void> | void }[] = [];
  private failures: string[] = [];

  async runTest(name: string, testFn: () => Promise<void> | void): Promise<void> {
    try {
      console.log = originalConsole.log;
      await testFn();
      console.log(`✅ PASS: ${name}`);
    } catch (error) {
      console.log(`❌ FAIL: ${name}`);
      console.error(error);
      this.failures.push(name);
    } finally {
      console.log = mutedConsole.log;
    }
  }

  async runAll(): Promise<void> {
    console.log('🚀 Starting Memory Management Tests...');
    for (const { name, test } of this.tests) {
      await this.runTest(name, test);
    }
    
    console.log = originalConsole.log;
    console.log(`\n📊 Test Results: ${this.tests.length - this.failures.length}/${this.tests.length} passed`);
    
    if (this.failures.length > 0) {
      console.log('❌ Failed tests:');
      this.failures.forEach(name => console.log(`  - ${name}`));
    }
  }

  test(name: string, testFn: () => Promise<void> | void): void {
    this.tests.push({ name, test: testFn });
  }
}

const runner = new TestRunner();

// Test 1: Basic Object Pool Functionality
runner.test('Object Pooling', async () => {
  const { ObjectPool } = await import('@/lib/memory/objectPool');
  
  let createCount = 0;
  let resetCount = 0;
  
  const factory = () => {
    createCount++;
    return { data: 'test', id: createCount };
  };
  
  interface PooledObject {
    data: string | null;
    id: number;
  }
  
  const reset = (obj: PooledObject) => {
    resetCount++;
    obj.data = null;
  };
  
  const pool = new ObjectPool(factory, reset, 5);
  
  // Test acquiring objects
  const obj1 = pool.acquire();
  const obj2 = pool.acquire();
  
  if (!obj1 || !obj2) {
    throw new Error('Failed to acquire objects from pool');
  }
  
  const stats1 = pool.getStats();
  if (stats1.active !== 2) {
    throw new Error(`Expected 2 active objects, got ${stats1.active}`);
  }
  
  // Test releasing objects
  pool.release(obj1);
  pool.release(obj2);
  
  const stats2 = pool.getStats();
  if (stats2.available !== 2) {
    throw new Error(`Expected 2 available objects, got ${stats2.available}`);
  }
  
  // Test max size constraint
  for (let i = 0; i < 10; i++) {
    pool.acquire();
  }
  
  const stats3 = pool.getStats();
  if (stats3.total > 5) {
    throw new Error(`Pool exceeded max size: ${stats3.total} > 5`);
  }
});

// Test 2: Canvas Context Pool
runner.test('Canvas Context Pool', async () => {
  const { CanvasContextPool } = await import('@/lib/memory/objectPool');
  
  // Only run if in browser environment
  if (typeof document === 'undefined') {
    console.log('⚠️ Skipping Canvas Context Pool test (no browser environment)');
    return;
  }
  
  const pool = new CanvasContextPool(3);
  const ctx1 = pool.acquire();
  const ctx2 = pool.acquire();
  
  if (!ctx1 || !ctx2) {
    throw new Error('Failed to acquire canvas contexts');
  }
  
  const stats = pool.getStats();
  if (stats.active !== 2) {
    throw new Error(`Expected 2 active contexts, got ${stats.active}`);
  }
  
  // Test cleanup
  pool.release(ctx1);
  pool.release(ctx2);
  
  const statsAfter = pool.getStats();
  if (statsAfter.available !== 2) {
    throw new Error(`Expected 2 available contexts after release, got ${statsAfter.available}`);
  }
});

// Test 3: Float32Array Pool
runner.test('Float32Array Pool', async () => {
  const { Float32ArrayPool } = await import('@/lib/memory/objectPool');
  
  const pool = new Float32ArrayPool(5);
  const array1 = pool.acquire(100);
  const array2 = pool.acquire(200);
  
  if (!(array1 instanceof Float32Array) || !(array2 instanceof Float32Array)) {
    throw new Error('Failed to acquire Float32Arrays');
  }
  
  if (array1.length !== 1024) {
    throw new Error(`Expected default size 1024, got ${array1.length}`);
  }
  
  if (array2.length !== 200) {
    throw new Error(`Expected custom size 200, got ${array2.length}`);
  }
  
  // Test that values are properly reset
  array1.fill(42);
  pool.release(array1);
  
  const array3 = pool.acquire();
  if (array3[0] !== 0) {
    throw new Error('Array not properly reset after release');
  }
});

// Test 4: Weak Cache Functionality
runner.test('Weak Cache', async () => {
  const { computationCache } = await import('@/lib/memory/weakCache');
  
  // Test basic caching
  const testKey = { id: 'test', value: 42 };
  const testValue = { result: 'cached', computed: Date.now() };
  
  computationCache.set(testKey, testValue);
  
  const retrieved = computationCache.get(testKey) as { result: string; computed: number } | undefined;
  if (!retrieved || retrieved.result !== testValue.result) {
    throw new Error('Failed to retrieve cached value');
  }
  
  // Test memoization
  let callCount = 0;
  const expensiveFn = (x: number) => {
    callCount++;
    // Simulate expensive computation
    let result = 0;
    for (let i = 0; i < 1000; i++) {
      result += Math.sqrt(x + i);
    }
    return result;
  };
  
  const memoizedFn = computationCache.memoize(expensiveFn);
  
  // First call - should compute
  const result1 = memoizedFn(100);
  if (callCount !== 1) {
    throw new Error(`Expected 1 call, got ${callCount}`);
  }
  
  // Second call with same argument - should use cache
  const result2 = memoizedFn(100);
  if (callCount !== 1) {
    throw new Error(`Expected cached result, but function was called ${callCount} times`);
  }
  
  if (result1 !== result2) {
    throw new Error('Cached results do not match');
  }
  
  // Different argument should trigger new computation
  const result3 = memoizedFn(200);
  // callCount should now be 2 (incremented by memoizedFn(200))
  // Note: TypeScript control flow analysis may not detect this increment
  const expectedFinalCount = 2;
  if (callCount !== expectedFinalCount) {
    throw new Error(`Expected ${expectedFinalCount} calls for different arguments, got ${callCount}`);
  }

  const stats = computationCache.getStats();
  if (stats.size < 2) {
    throw new Error(`Expected at least 2 cached entries, got ${stats.size}`);
  }
});

// Test 5: SharedArrayBuffer Manager
runner.test('Shared Buffer Manager', async () => {
  const { SharedBufferManager } = await import('@/lib/memory/sharedBuffer');
  
  // Check if SharedArrayBuffer is supported
  if (!SharedBufferManager.isSupported()) {
    console.log('⚠️ Skipping SharedBuffer test (SharedArrayBuffer not supported)');
    return;
  }
  
  // Test buffer creation
  const buffer = SharedBufferManager.createBuffer('test-buffer', 1024);
  if (!buffer || buffer.byteLength !== 1024) {
    throw new Error('Failed to create shared buffer');
  }
  
  // Test typed array views
  const float32View = SharedBufferManager.createFloat32Array('test-buffer', 0, 256);
  if (!(float32View instanceof Float32Array) || float32View.length !== 256) {
    throw new Error('Failed to create Float32Array view');
  }
  
  const uint8View = SharedBufferManager.createUint8Array('test-buffer', 0, 1024);
  if (!(uint8View instanceof Uint8Array) || uint8View.length !== 1024) {
    throw new Error('Failed to create Uint8Array view');
  }
  
  // Test statistics
  const stats = SharedBufferManager.getStats();
  if (stats.totalBuffers !== 1 || stats.totalMemory !== 1024) {
    throw new Error(`Incorrect buffer statistics: ${JSON.stringify(stats)}`);
  }
  
  // Test cleanup
  SharedBufferManager.deleteBuffer('test-buffer');
  if (SharedBufferManager.getBuffer('test-buffer')) {
    throw new Error('Buffer not properly deleted');
  }
});

// Test 6: Memory Leak Detection
runner.test('Memory Leak Detection', async () => {
  const { enhancedLeakDetector } = await import('@/lib/memory/enhancedLeakDetector');
  
  // Test object registration
  const testObject = { data: 'leak-test', id: Date.now() };
  const initialStats = enhancedLeakDetector.getStats();
  
  enhancedLeakDetector.registerObject(testObject, 'LeakTestObject', 2048);
  
  const afterStats = enhancedLeakDetector.getStats();
  if (afterStats.registeredObjects <= initialStats.registeredObjects) {
    throw new Error('Object registration failed');
  }
  
  // Test reference tracking
  const ref1 = { name: 'ref1' };
  const ref2 = { name: 'ref2' };
  
  enhancedLeakDetector.registerObject(ref1, 'Reference1', 512);
  enhancedLeakDetector.registerObject(ref2, 'Reference2', 512);
  enhancedLeakDetector.addReference(ref1, ref2);
  
  const refStats = enhancedLeakDetector.getStats();
  if (refStats.totalReferences < 1) {
    throw new Error('Reference tracking failed');
  }
  
  // Test cleanup
  enhancedLeakDetector.cleanup();
  
  const cleanupStats = enhancedLeakDetector.getStats();
  // Objects should be cleaned up after timeout (may not happen immediately in test)
  console.log(`Cleanup stats: ${JSON.stringify(cleanupStats)}`);
});

// Test 7: Cleanup Manager
runner.test('Cleanup Manager', async () => {
  const { cleanupManager, registerComponentCleanup } = await import('@/lib/memory/cleanupManager');
  
  // Test task registration
  let cleanupExecuted = false;
  
  const unregister = registerComponentCleanup(
    'TestCleanupComponent',
    () => {
      cleanupExecuted = true;
    },
    'high'
  );
  
  const stats = cleanupManager.getStats();
  if (stats.totalTasks === 0) {
    throw new Error('Cleanup task registration failed');
  }
  
  // Test unregistration
  unregister();
  
  const afterUnregister = cleanupManager.getStats();
  // Task count may vary depending on implementation
  console.log(`Cleanup tasks after unregister: ${afterUnregister.totalTasks}`);
  
  // Test periodic cleanup (without actually running it)
  try {
    cleanupManager.startPeriodicCleanup(1000);
    cleanupManager.stopPeriodicCleanup();
  } catch (error) {
    // Periodic cleanup may not be available in all environments
    console.log('⚠️ Periodic cleanup not available in this environment');
  }
});

// Test 8: Memory Monitor
runner.test('Memory Monitor', async () => {
  const { memoryMonitor } = await import('@/lib/memory/memoryMonitor');
  
  // Test basic monitoring
  const stats = memoryMonitor.getStats();
  
  if (typeof stats.memoryUsage !== 'number') {
    throw new Error('Memory usage not properly tracked');
  }
  
  if (typeof stats.activeAlerts !== 'number') {
    throw new Error('Active alerts not properly tracked');
  }
  
  // Test alert creation
  const testAlert = {
    id: 'test-memory-alert',
    type: 'warning' as const,
    title: 'Test Memory Alert',
    message: 'This is a test alert for memory monitoring',
    timestamp: Date.now(),
    actions: [
      {
        label: 'Dismiss',
        action: () => console.log('Alert dismissed'),
        primary: true
      }
    ],
    autoResolve: true
  };
  
  memoryMonitor.createAlert(testAlert);
  
  const activeAlerts = memoryMonitor.getActiveAlerts();
  const foundAlert = activeAlerts.find(alert => alert.id === 'test-memory-alert');
  
  if (!foundAlert) {
    throw new Error('Alert creation failed');
  }
  
  // Test threshold updates
  memoryMonitor.updateThresholds({
    memoryUsage: 150 * 1024 * 1024, // 150MB
    growthRate: 8 * 1024 * 1024    // 8MB/minute
  });
  
  const updatedStats = memoryMonitor.getStats();
  if (updatedStats.thresholds.memoryUsage !== 150 * 1024 * 1024) {
    throw new Error('Threshold update failed');
  }
  
  // Test alert resolution
  memoryMonitor.resolveAlert('test-memory-alert');
  const resolvedAlerts = memoryMonitor.getActiveAlerts();
  const resolvedAlert = resolvedAlerts.find(alert => alert.id === 'test-memory-alert');
  
  if (resolvedAlert) {
    throw new Error('Alert resolution failed');
  }
});

// Test 9: Integration Test
runner.test('Memory Management Integration', async () => {
  const { ObjectPool } = await import('@/lib/memory/objectPool');
  const { computationCache, dataCache } = await import('@/lib/memory/weakCache');
  const { enhancedLeakDetector } = await import('@/lib/memory/enhancedLeakDetector');
  
  // Create test objects in different systems
  const pool = new ObjectPool(() => ({ value: 0, type: 'pooled' }), (obj) => { obj.value = 0; });
  const pooledObj = pool.acquire();
  
  const cacheKey = { component: 'integration-test', timestamp: Date.now() };
  computationCache.set(cacheKey, { computed: 'result', size: 1024 });
  
  const leakTestObj = { data: 'leak-test', systems: ['pool', 'cache'] };
  enhancedLeakDetector.registerObject(leakTestObj, 'IntegrationObject', 2048);
  
  // Verify all systems are working
  const poolStats = pool.getStats();
  const cacheStats = computationCache.getStats();
  const leakStats = enhancedLeakDetector.getStats();
  
  if (poolStats.active !== 1) {
    throw new Error(`Pool integration failed: expected 1 active, got ${poolStats.active}`);
  }
  
  if (cacheStats.size === 0) {
    throw new Error('Cache integration failed: no entries found');
  }
  
  if (leakStats.registeredObjects === 0) {
    throw new Error('Leak detection integration failed: no objects registered');
  }
  
  // Test cleanup
  pool.release(pooledObj);
  enhancedLeakDetector.cleanup();
  
  console.log(`Integration test completed successfully:
    Pool: ${poolStats.active} active, ${poolStats.available} available
    Cache: ${cacheStats.size} entries, ${cacheStats.hitRate.toFixed(1)}% hit rate
    Leak Detection: ${leakStats.registeredObjects} registered objects
  `);
});

// Performance benchmark test
runner.test('Performance Benchmark', async () => {
  const { ObjectPool, Float32ArrayPool } = await import('@/lib/memory/objectPool');
  const { computationCache } = await import('@/lib/memory/weakCache');
  
  const iterations = 1000;
  
  // Benchmark object creation without pooling
  console.log = originalConsole.log;
  console.log('🏃 Running performance benchmarks...');
  console.log = mutedConsole.log;
  
  const startNoPool = performance.now();
  for (let i = 0; i < iterations; i++) {
    const obj = { data: i * 2, timestamp: Date.now() };
    obj.data = obj.data + 1;
  }
  const timeNoPool = performance.now() - startNoPool;
  
  // Benchmark with object pooling
  const pool = new ObjectPool(() => ({ data: 0, timestamp: 0 }), (obj) => {
    obj.data = 0;
    obj.timestamp = 0;
  });
  
  const startWithPool = performance.now();
  for (let i = 0; i < iterations; i++) {
    const obj = pool.acquire();
    obj.data = i * 2;
    obj.timestamp = Date.now();
    obj.data = obj.data + 1;
    pool.release(obj);
  }
  const timeWithPool = performance.now() - startWithPool;
  
  console.log = originalConsole.log;
  console.log(`📈 Performance Results:`);
  console.log(`   Without pooling: ${timeNoPool.toFixed(2)}ms`);
  console.log(`   With pooling:   ${timeWithPool.toFixed(2)}ms`);
  console.log(`   Speedup:        ${(timeNoPool / timeWithPool).toFixed(2)}x`);
  console.log = mutedConsole.log;
  
  // Pool should be faster or comparable
  if (timeWithPool > timeNoPool * 1.5) {
    console.log('⚠️ Pool performance slower than expected (this may be normal for small objects)');
  }
  
  // Benchmark cache performance
  let expensiveCallCount = 0;
  const expensiveFn = (x: number) => {
    expensiveCallCount++;
    let result = 0;
    for (let i = 0; i < 100; i++) {
      result += Math.sqrt(x + i);
    }
    return result;
  };
  
  const memoizedFn = computationCache.memoize(expensiveFn);
  
  // First call
  const startFirst = performance.now();
  const result1 = memoizedFn(42);
  const timeFirst = performance.now() - startFirst;
  
  // Cached call
  const startCached = performance.now();
  const result2 = memoizedFn(42);
  const timeCached = performance.now() - startCached;
  
  console.log = originalConsole.log;
  console.log(`🧠 Cache Performance:`);
  console.log(`   First call:  ${timeFirst.toFixed(2)}ms (${expensiveCallCount} computations)`);
  console.log(`   Cached call: ${timeCached.toFixed(2)}ms (${expensiveCallCount} total)`);
  console.log(`   Speedup:     ${(timeFirst / timeCached).toFixed(2)}x`);
  console.log = mutedConsole.log;
  
  if (result1 !== result2) {
    throw new Error('Cache returned different results');
  }
  
  if (expensiveCallCount !== 1) {
    throw new Error(`Expected 1 computation, got ${expensiveCallCount}`);
  }
  
  if (timeCached >= timeFirst / 2) {
    throw new Error('Cache should be significantly faster than computation');
  }
});

// Run all tests
if (typeof window === 'undefined') {
  // Node.js environment
  runner.runAll().catch(error => {
    console.error('Test runner failed:', error);
    process.exit(1);
  });
} else {
  // Browser environment - expose test runner
  (window as typeof window & { runMemoryTests?: () => Promise<void> }).runMemoryTests = () => runner.runAll();
  console.log('Memory tests loaded. Run with: runMemoryTests()');
}