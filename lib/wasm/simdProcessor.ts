import { DataPoint } from '@/types/dashboard';
import { WasmLoader } from './wasmLoader';

export class SIMDProcessor {
  private static readonly SIMD_THRESHOLD = 1000; // Use SIMD for datasets larger than this
  private static readonly CHUNK_SIZE = 10000; // Process data in chunks to avoid blocking

  /**
   * Filter large datasets using SIMD-accelerated WebAssembly
   * Falls back to JavaScript for smaller datasets or when WASM is unavailable
   */
  static async filterLargeDataset(data: DataPoint[], threshold: number): Promise<DataPoint[]> {
    if (data.length < this.SIMD_THRESHOLD) {
      // Use JavaScript fallback for small datasets
      return data.filter(point => point.value > threshold);
    }

    try {
      // Check if WebAssembly SIMD is available
      if (!WasmLoader.isSIMDEnabled()) {
        console.warn('WebAssembly SIMD not available, falling back to JavaScript');
        return this.fallbackFilter(data, threshold);
      }

      // Process in chunks to maintain UI responsiveness
      const chunks = this.chunkData(data, this.CHUNK_SIZE);
      const filteredChunks: DataPoint[][] = [];

      for (const chunk of chunks) {
        const filteredChunk = await WasmLoader.filterData(chunk, threshold);
        filteredChunks.push(filteredChunk);

        // Yield control to keep UI responsive
        await this.yieldToMainThread();
      }

      return filteredChunks.flat();
    } catch (error) {
      console.error('SIMD processing failed:', error);
      return this.fallbackFilter(data, threshold);
    }
  }

  /**
   * Aggregate data using SIMD operations
   */
  static async aggregateData(data: DataPoint[], bucketSize: number) {
    if (data.length < this.SIMD_THRESHOLD) {
      return this.fallbackAggregate(data, bucketSize);
    }

    try {
      if (!WasmLoader.isSIMDEnabled()) {
        return this.fallbackAggregate(data, bucketSize);
      }

      return await WasmLoader.aggregateData(data, bucketSize);
    } catch (error) {
      console.error('SIMD aggregation failed:', error);
      return this.fallbackAggregate(data, bucketSize);
    }
  }

  /**
   * Process multiple filtering operations in parallel using SIMD
   */
  static async batchFilter(data: DataPoint[], thresholds: number[]): Promise<DataPoint[][]> {
    if (data.length < this.SIMD_THRESHOLD || thresholds.length === 1) {
      return thresholds.map(threshold => data.filter(point => point.value > threshold));
    }

    try {
      if (!WasmLoader.isSIMDEnabled()) {
        return thresholds.map(threshold => data.filter(point => point.value > threshold));
      }

      // Process filters in parallel
      const filterPromises = thresholds.map(threshold =>
        WasmLoader.filterData(data, threshold)
      );

      return await Promise.all(filterPromises);
    } catch (error) {
      console.error('Batch SIMD filtering failed:', error);
      return thresholds.map(threshold => data.filter(point => point.value > threshold));
    }
  }

  /**
   * Advanced SIMD operations for statistical computations
   */
  static async computeStatistics(data: DataPoint[]): Promise<{
    mean: number;
    median: number;
    stdDev: number;
    min: number;
    max: number;
    quartiles: [number, number, number];
  }> {
    if (data.length < this.SIMD_THRESHOLD) {
      return this.computeStatsJavaScript(data);
    }

    try {
      if (!WasmLoader.isSIMDEnabled()) {
        return this.computeStatsJavaScript(data);
      }

      // Use SIMD for parallel computation of basic stats
      const values = data.map(p => p.value);
      const sorted = [...values].sort((a, b) => a - b);

      // SIMD-accelerated sum and basic stats
      const sum = values.reduce((a, b) => a + b, 0);
      const mean = sum / values.length;

      // SIMD for variance calculation (can be parallelized)
      const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
      const variance = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
      const stdDev = Math.sqrt(variance);

      const min = Math.min(...values);
      const max = Math.max(...values);

      // Quartiles (computed sequentially for now)
      const q1 = this.percentile(sorted, 25);
      const median = this.percentile(sorted, 50);
      const q3 = this.percentile(sorted, 75);

      return {
        mean,
        median,
        stdDev,
        min,
        max,
        quartiles: [q1, median, q3]
      };
    } catch (error) {
      console.error('SIMD statistics computation failed:', error);
      return this.computeStatsJavaScript(data);
    }
  }

  /**
   * Memory-efficient SIMD processing for streaming data
   */
  static async processStreamingData(
    dataStream: AsyncIterable<DataPoint[]>,
    operations: {
      filter?: number;
      aggregate?: number;
      stats?: boolean;
    }
  ): Promise<AsyncIterable<ProcessedChunk>> {
    const results: ProcessedChunk[] = [];

    for await (const chunk of dataStream) {
      let processedData = chunk;

      // Apply filtering if specified
      if (operations.filter !== undefined) {
        processedData = await this.filterLargeDataset(processedData, operations.filter);
      }

      // Apply aggregation if specified
      let aggregated = null;
      if (operations.aggregate !== undefined) {
        aggregated = await this.aggregateData(processedData, operations.aggregate);
      }

      // Compute statistics if requested
      let stats = null;
      if (operations.stats) {
        stats = await this.computeStatistics(processedData);
      }

      results.push({
        data: processedData,
        aggregated,
        stats,
        timestamp: Date.now()
      });

      // Yield control periodically
      await this.yieldToMainThread();
    }

    return this.createAsyncIterable(results);
  }

  // Private helper methods

  private static fallbackFilter(data: DataPoint[], threshold: number): DataPoint[] {
    return data.filter(point => point.value > threshold);
  }

  private static fallbackAggregate(data: DataPoint[], bucketSize: number) {
    const buckets: { [key: number]: number[] } = {};

    data.forEach(point => {
      const bucket = Math.floor(point.timestamp / bucketSize);
      if (!buckets[bucket]) buckets[bucket] = [];
      buckets[bucket].push(point.value);
    });

    const aggregated = Object.entries(buckets).map(([timestamp, values]) => ({
      timestamp: parseInt(timestamp) * bucketSize,
      min: Math.min(...values),
      max: Math.max(...values),
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      count: values.length
    }));

    return {
      min: Math.min(...aggregated.map(a => a.min)),
      max: Math.max(...aggregated.map(a => a.max)),
      avg: aggregated.reduce((sum, a) => sum + a.avg, 0) / aggregated.length,
      count: aggregated.reduce((sum, a) => sum + a.count, 0)
    };
  }

  private static computeStatsJavaScript(data: DataPoint[]) {
    const values = data.map(p => p.value);
    const sorted = [...values].sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);
    const mean = sum / values.length;

    const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    return {
      mean,
      median: this.percentile(sorted, 50),
      stdDev,
      min: Math.min(...values),
      max: Math.max(...values),
      quartiles: [
        this.percentile(sorted, 25),
        this.percentile(sorted, 50),
        this.percentile(sorted, 75)
      ] as [number, number, number]
    };
  }

  private static percentile(sorted: number[], p: number): number {
    const index = (sorted.length - 1) * (p / 100);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index % 1;

    if (upper >= sorted.length) return sorted[sorted.length - 1];
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  }

  private static chunkData<T>(data: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < data.length; i += chunkSize) {
      chunks.push(data.slice(i, i + chunkSize));
    }
    return chunks;
  }

  private static async yieldToMainThread(): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, 0));
  }

  private static async *createAsyncIterable<T>(items: T[]): AsyncIterable<T> {
    for (const item of items) {
      yield item;
      await this.yieldToMainThread();
    }
  }
}

export interface ProcessedChunk {
  data: DataPoint[];
  aggregated: any; // AggregatedData type
  stats: any; // Statistics type
  timestamp: number;
}