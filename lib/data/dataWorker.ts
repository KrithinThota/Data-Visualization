/// <reference lib="webworker" />

import { DataPoint, ProcessedData } from '@/types/dashboard';
import { SIMDProcessor } from '@/lib/wasm/simdProcessor.js';

declare const self: DedicatedWorkerGlobalScope;

interface WorkerMessage {
  type: 'PROCESS_DATA' | 'AGGREGATE' | 'FILTER' | 'STATS' | 'STOP';
  data?: DataPoint[];
  config?: {
    bucketSize?: number;
    threshold?: number;
    timeRange?: { start: number; end: number };
  };
}

interface ExtendedProcessedData extends ProcessedData {
  processingTime: number;
  aggregated?: {
    min: number;
    max: number;
    avg: number;
    count: number;
  };
}

interface WorkerResponse {
  type: 'DATA_PROCESSED' | 'DATA_AGGREGATED' | 'DATA_FILTERED' | 'STATS_COMPUTED' | 'ERROR';
  data?: ExtendedProcessedData | DataPoint[] | Record<string, unknown>;
  error?: string;
}

// Web Worker for heavy data processing using WebAssembly SIMD
self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
  const { type, data, config } = e.data;

  try {
    switch (type) {
      case 'PROCESS_DATA':
        if (!data) throw new Error('No data provided for processing');
        const processed = await processDataWithWASM(data);
        self.postMessage({
          type: 'DATA_PROCESSED',
          data: processed
        } as WorkerResponse);
        break;

      case 'AGGREGATE':
        if (!data || !config?.bucketSize) throw new Error('Missing data or bucket size for aggregation');
        const aggregated = await SIMDProcessor.aggregateData(data, config.bucketSize);
        self.postMessage({
          type: 'DATA_AGGREGATED',
          data: (aggregated as unknown) as Record<string, unknown>
        });
        break;

      case 'FILTER':
        if (!data || config?.threshold === undefined) throw new Error('Missing data or threshold for filtering');
        const filtered = await SIMDProcessor.filterLargeDataset(data, config.threshold);
        self.postMessage({
          type: 'DATA_FILTERED',
          data: filtered as DataPoint[]
        });
        break;

      case 'STATS':
        if (!data) throw new Error('No data provided for statistics');
        const stats = await SIMDProcessor.computeStatistics(data);
        self.postMessage({
          type: 'STATS_COMPUTED',
          data: stats as Record<string, unknown>
        });
        break;

      case 'STOP':
        // Cleanup and terminate
        self.close();
        break;

      default:
        throw new Error(`Unknown message type: ${type}`);
    }
  } catch (error) {
    self.postMessage({
      type: 'ERROR',
      error: error instanceof Error ? error.message : 'Unknown error'
    } as WorkerResponse);
  }
};

async function processDataWithWASM(data: DataPoint[]): Promise<ExtendedProcessedData> {
  const startTime = performance.now();

  // Use SIMD for filtering and aggregation
  const [filteredData, aggregatedData, stats] = await Promise.all([
    SIMDProcessor.filterLargeDataset(data, 0), // Filter out non-positive values (≤ 0)
    SIMDProcessor.aggregateData(data, 60000), // 1-minute buckets
    SIMDProcessor.computeStatistics(data)
  ]);

  const processingTime = performance.now() - startTime;

  return {
    points: data,
    stats: {
      min: stats.min,
      max: stats.max,
      avg: stats.mean,
      count: data.length
    },
    filtered: filteredData,
    processingTime,
    aggregated: aggregatedData
  };
}

interface PerformanceMemory {
  usedJSHeapSize?: number;
}

interface PerformanceWithMemory extends Performance {
  memory?: PerformanceMemory;
}

// Enhanced performance monitoring with error handling
let lastMemoryUsage = 0;
const memoryInterval = setInterval(() => {
  try {
    if ('memory' in performance) {
      const perfWithMemory = performance as PerformanceWithMemory;
      const memoryUsage = perfWithMemory.memory?.usedJSHeapSize;
      if (memoryUsage !== undefined && Math.abs(memoryUsage - lastMemoryUsage) > 1024 * 1024) { // 1MB change
        console.log(`Worker memory usage: ${(memoryUsage / 1024 / 1024).toFixed(2)} MB`);
        lastMemoryUsage = memoryUsage;
        
        // Check for memory leaks
        if (memoryUsage > 100 * 1024 * 1024) { // 100MB threshold
          console.warn('High memory usage detected in worker:', (memoryUsage / 1024 / 1024).toFixed(2), 'MB');
        }
      }
    }
  } catch (error) {
    console.warn('Memory monitoring failed:', error);
  }
}, 5000);

// Cleanup on worker termination
self.addEventListener('beforeunload', () => {
  clearInterval(memoryInterval);
});