import { DataPoint } from '@/types/dashboard';

export interface AggregatedData {
  min: number;
  max: number;
  avg: number;
  count: number;
}

export class WasmLoader {
  private static instance: WebAssembly.Instance | null = null;
  private static memory: WebAssembly.Memory | null = null;
  private static isSIMDSupported = false;

  static async load(): Promise<WebAssembly.Instance> {
    if (this.instance) return this.instance;

    try {
      // Check for SIMD support
      this.isSIMDSupported = typeof WebAssembly !== 'undefined' &&
        'simd' in WebAssembly &&
        WebAssembly.validate(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0, 253, 15, 26, 11]));

      // Fetch the WebAssembly module
      const response = await fetch('/wasm/dataProcessor.wasm');
      if (!response.ok) {
        throw new Error(`Failed to fetch WASM module: ${response.status}`);
      }

      const buffer = await response.arrayBuffer();

      // Create memory with initial size and maximum
      this.memory = new WebAssembly.Memory({
        initial: 256, // 16MB initial
        maximum: 1024, // 64MB maximum
        shared: true // Enable shared memory for potential future multi-threading
      });

      const importObject = {
        env: {
          memory: this.memory,
          log: (ptr: number) => {
            console.log(`WASM Log: ${ptr}`);
          }
        }
      };

      const { instance } = await WebAssembly.instantiate(buffer, importObject);
      this.instance = instance;

      // Initialize SIMD support
      if (this.isSIMDSupported) {
        const initSIMD = instance.exports.initSIMD as CallableFunction;
        initSIMD(1); // Enable SIMD
        console.log('WebAssembly SIMD enabled');
      }

      return instance;
    } catch (error) {
      console.error('Failed to load WebAssembly module:', error);
      throw error;
    }
  }

  static async aggregateData(data: DataPoint[], bucketSize: number): Promise<AggregatedData> {
    const instance = await this.load();
    const aggregateData = instance.exports.aggregateData as (inputPtr: number, length: number, outputPtr: number, bucketSize: number) => void;

    if (!this.memory) throw new Error('Memory not initialized');

    // Calculate memory requirements
    const dataSize = data.length * 24; // 24 bytes per DataPoint (8+8+4+4)
    const outputSize = 32; // 32 bytes for aggregated result (8*4)
    const totalSize = dataSize + outputSize;

    // Ensure memory is large enough
    const currentPages = this.memory.buffer.byteLength / (64 * 1024);
    const requiredPages = Math.ceil(totalSize / (64 * 1024));

    if (requiredPages > currentPages) {
      const growAmount = requiredPages - currentPages;
      this.memory.grow(growAmount);
    }

    // Allocate memory regions
    const inputPtr = 0;
    const outputPtr = dataSize;

    // Copy data to WebAssembly memory
    const view = new DataView(this.memory.buffer);

    for (let i = 0; i < data.length; i++) {
      const offset = inputPtr + i * 24;
      view.setBigUint64(offset, BigInt(data[i].timestamp), true); // timestamp (i64)
      view.setFloat64(offset + 8, data[i].value, true); // value (f64)
      // Skip category and metadata for aggregation
    }

    // Call WebAssembly function
    aggregateData(inputPtr, data.length, outputPtr, bucketSize);

    // Read results
    const min = view.getFloat64(outputPtr, true);
    const max = view.getFloat64(outputPtr + 8, true);
    const avg = view.getFloat64(outputPtr + 16, true);
    const count = view.getUint32(outputPtr + 24, true);

    return { min, max, avg, count };
  }

  static async filterData(data: DataPoint[], threshold: number): Promise<DataPoint[]> {
    const instance = await this.load();
    const filterDataSIMD = instance.exports.filterDataSIMD as (inputPtr: number, length: number, threshold: number, outputPtr: number) => number;

    if (!this.memory) throw new Error('Memory not initialized');

    // Prepare input data (only values for filtering)
    const inputSize = data.length * 8; // 8 bytes per f64 value
    const outputSize = data.length * 8; // Worst case: all values pass filter
    const totalSize = inputSize + outputSize;

    // Ensure memory is large enough
    const currentPages = this.memory.buffer.byteLength / (64 * 1024);
    const requiredPages = Math.ceil(totalSize / (64 * 1024));

    if (requiredPages > currentPages) {
      const growAmount = requiredPages - currentPages;
      this.memory.grow(growAmount);
    }

    // Allocate memory regions
    const inputPtr = 0;
    const outputPtr = inputSize;

    // Copy values to WebAssembly memory
    const view = new DataView(this.memory.buffer);

    for (let i = 0; i < data.length; i++) {
      view.setFloat64(inputPtr + i * 8, data[i].value, true);
    }

    // Call SIMD filtering function
    const filteredCount = filterDataSIMD(inputPtr, data.length, threshold, outputPtr);

    // Read filtered results
    const filteredData: DataPoint[] = [];
    for (let i = 0; i < filteredCount; i++) {
      const value = view.getFloat64(outputPtr + i * 8, true);
      // Find original data point with this value
      const originalPoint = data.find(point => point.value === value);
      if (originalPoint) {
        filteredData.push(originalPoint);
      }
    }

    return filteredData;
  }

  static getMemoryUsage(): { used: number; total: number } {
    if (!this.memory) return { used: 0, total: 0 };

    return {
      used: this.memory.buffer.byteLength,
      total: this.memory.buffer.byteLength // Simplified
    };
  }

  static isSIMDEnabled(): boolean {
    return this.isSIMDSupported;
  }

  // Memory management helpers
  static async allocate(size: number): Promise<number> {
    const instance = await this.load();
    const malloc = instance.exports.malloc as (size: number) => number;
    return malloc(size);
  }

  static async deallocate(ptr: number): Promise<void> {
    const instance = await this.load();
    const free = instance.exports.free as (ptr: number) => void;
    free(ptr);
  }

  // Cleanup method
  static cleanup(): void {
    this.instance = null;
    this.memory = null;
  }
}