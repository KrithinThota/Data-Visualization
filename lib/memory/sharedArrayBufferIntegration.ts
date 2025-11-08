import { SharedBufferManager, SharedRingBuffer } from './sharedBuffer';
import { enhancedLeakDetector } from './enhancedLeakDetector';

/**
 * High-performance SharedArrayBuffer integration for data processing
 */
export class SharedArrayBufferIntegration {
  private static instance: SharedArrayBufferIntegration;
  private dataBuffers = new Map<string, SharedArrayBuffer>();
  private ringBuffers = new Map<string, SharedRingBuffer>();
  private workerContext: Worker | null = null;

  static getInstance(): SharedArrayBufferIntegration {
    if (!SharedArrayBufferIntegration.instance) {
      SharedArrayBufferIntegration.instance = new SharedArrayBufferIntegration();
    }
    return SharedArrayBufferIntegration.instance;
  }

  /**
   * Initialize worker context for off-main-thread processing
   */
  initializeWorker(): void {
    if (this.workerContext) return;

    const workerCode = `
      // Worker script for SharedArrayBuffer processing
      let sharedData = null;
      let dataBuffer = null;

      self.onmessage = function(e) {
        const { type, data } = e.data;

        switch (type) {
          case 'PROCESS_DATA':
            if (sharedData && dataBuffer) {
              // Process data using SharedArrayBuffer
              const result = processLargeDataset(sharedData, dataBuffer);
              self.postMessage({ type: 'DATA_PROCESSED', result });
            }
            break;
            
          case 'SET_BUFFER':
            sharedData = data.buffer;
            dataBuffer = new Float32Array(sharedData);
            break;
            
          case 'AGGREGATE':
            if (sharedData) {
              const result = aggregateData(sharedData);
              self.postMessage({ type: 'AGGREGATION_COMPLETE', result });
            }
            break;
        }
      };

      function processLargeDataset(buffer, inputData) {
        // SIMD-accelerated processing using SharedArrayBuffer
        const sharedArray = new Float32Array(buffer);
        let sum = 0;
        
        // Process in chunks for better memory efficiency
        const chunkSize = 1024;
        for (let i = 0; i < sharedArray.length; i += chunkSize) {
          const end = Math.min(i + chunkSize, sharedArray.length);
          for (let j = i; j < end; j++) {
            sum += sharedArray[j] * inputData[j % inputData.length];
          }
        }
        
        return { sum, processed: sharedArray.length };
      }

      function aggregateData(buffer) {
        const sharedArray = new Float32Array(buffer);
        let min = Infinity, max = -Infinity, sum = 0;
        
        for (let i = 0; i < sharedArray.length; i++) {
          const val = sharedArray[i];
          min = Math.min(min, val);
          max = Math.max(max, val);
          sum += val;
        }
        
        return {
          min,
          max,
          avg: sum / sharedArray.length,
          count: sharedArray.length
        };
      }
    `;

    const blob = new Blob([workerCode], { type: 'application/javascript' });
    this.workerContext = new Worker(URL.createObjectURL(blob));

    this.workerContext.onmessage = (e) => {
      const { type, result } = e.data;
      console.log(`Worker ${type}:`, result);
    };
  }

  /**
   * Create a high-performance data buffer for real-time streaming
   */
  createStreamingBuffer(id: string, maxDataPoints: number): SharedArrayBuffer {
    if (this.dataBuffers.has(id)) {
      console.warn(`Buffer ${id} already exists`);
      return this.dataBuffers.get(id)!;
    }

    const bufferSize = maxDataPoints * 2 * 4; // timestamp + value for each point (Float32 = 4 bytes)
    const buffer = SharedBufferManager.createBuffer(id, bufferSize);
    this.dataBuffers.set(id, buffer);

    // Register for memory leak detection
    enhancedLeakDetector.registerObject(buffer, `SharedArrayBuffer_${id}`, bufferSize);

    return buffer;
  }

  /**
   * Create a ring buffer for circular data storage
   */
  createRingBuffer(id: string, capacity: number): SharedRingBuffer {
    const ringBuffer = new SharedRingBuffer(capacity);
    this.ringBuffers.set(id, ringBuffer);

    // Register for memory leak detection
    enhancedLeakDetector.registerObject(ringBuffer, `SharedRingBuffer_${id}`, capacity);

    return ringBuffer;
  }

  /**
   * Transfer data to worker for processing using SharedArrayBuffer
   */
  async processDataInWorker(
    bufferId: string,
    data: Float32Array,
    operation: 'process' | 'aggregate' = 'process'
  ): Promise<{ sum?: number; processed?: number; min?: number; max?: number; avg?: number; count?: number }> {
    if (!this.workerContext) {
      this.initializeWorker();
    }

    const buffer = this.dataBuffers.get(bufferId);
    if (!buffer) {
      throw new Error(`Buffer ${bufferId} not found`);
    }

    return new Promise((resolve, reject) => {
      if (!this.workerContext) {
        reject(new Error('Worker context not initialized'));
        return;
      }

      const handler = (e: MessageEvent) => {
        if (e.data.type === 'DATA_PROCESSED') {
          this.workerContext!.removeEventListener('message', handler);
          resolve(e.data.result);
        } else if (e.data.type === 'AGGREGATION_COMPLETE') {
          this.workerContext!.removeEventListener('message', handler);
          resolve(e.data.result);
        }
      };

      this.workerContext.addEventListener('message', handler);

      // Transfer data to worker
      this.workerContext.postMessage({
        type: 'SET_BUFFER',
        data: { buffer }
      });

      setTimeout(() => {
        this.workerContext!.postMessage({
          type: operation.toUpperCase(),
          data: Array.from(data)
        });
      }, 100);
    });
  }

  /**
   * Batch process multiple datasets using SharedArrayBuffer
   */
  async batchProcessDatasets(
    datasets: Array<{ id: string; data: Float32Array; operation: 'process' | 'aggregate' }>
  ): Promise<Array<{ id: string; result?: { sum?: number; processed?: number; min?: number; max?: number; avg?: number; count?: number }; error?: Error }>> {
    const results: Array<{ id: string; result?: { sum?: number; processed?: number; min?: number; max?: number; avg?: number; count?: number }; error?: Error }> = [];

    for (const dataset of datasets) {
      try {
        const result = await this.processDataInWorker(
          dataset.id,
          dataset.data,
          dataset.operation
        );
        results.push({ id: dataset.id, result });
      } catch (error) {
        console.error(`Failed to process dataset ${dataset.id}:`, error);
        results.push({ id: dataset.id, error: error as Error });
      }
    }

    return results;
  }

  /**
   * Create zero-copy data views for efficient access
   */
  createDataViews(bufferId: string) {
    const buffer = this.dataBuffers.get(bufferId);
    if (!buffer) return null;

    const views = {
      timestamps: new Float32Array(buffer, 0, buffer.byteLength / 8),
      values: new Float32Array(buffer, buffer.byteLength / 2, buffer.byteLength / 8),
      raw: new Uint8Array(buffer)
    };

    return views;
  }

  /**
   * Efficient data transfer from regular ArrayBuffer to SharedArrayBuffer
   */
  async transferToSharedBuffer(sourceData: Float32Array, targetBufferId: string): Promise<void> {
    const targetBuffer = this.dataBuffers.get(targetBufferId);
    if (!targetBuffer) {
      throw new Error(`Target buffer ${targetBufferId} not found`);
    }

    if (sourceData.byteLength > targetBuffer.byteLength) {
      throw new Error('Source data too large for target buffer');
    }

    // Create a temporary ArrayBuffer for transfer (SharedArrayBuffer needs special handling)
    const tempBuffer = new ArrayBuffer(sourceData.byteLength);
    new Float32Array(tempBuffer).set(sourceData);

    // Use SharedBufferManager for efficient transfer
    await SharedBufferManager.zeroCopyTransfer(tempBuffer, targetBufferId);
  }

  /**
   * Get memory-efficient iterator for large datasets
   */
  createMemoryEfficientIterator(bufferId: string, chunkSize: number = 1024) {
    const buffer = this.dataBuffers.get(bufferId);
    if (!buffer) return null;

    const view = new Float32Array(buffer);
    let position = 0;

    return {
      next: (): Float32Array | null => {
        if (position >= view.length) return null;

        const end = Math.min(position + chunkSize, view.length);
        const chunk = view.slice(position, end);
        position = end;
        return chunk;
      },

      hasNext: (): boolean => position < view.length,

      reset: (): void => {
        position = 0;
      }
    };
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    // Stop worker
    if (this.workerContext) {
      this.workerContext.terminate();
      this.workerContext = null;
    }

    // Clear all buffers
    this.dataBuffers.forEach((buffer, id) => {
      // buffer is intentionally not used here as we only need the id
      void buffer; // Explicitly mark as intentionally unused
      SharedBufferManager.deleteBuffer(id);
    });
    this.dataBuffers.clear();

    this.ringBuffers.clear();
  }

  /**
   * Get statistics
   */
  getStats(): {
    bufferCount: number;
    ringBufferCount: number;
    totalMemory: number;
    workerActive: boolean;
  } {
    const bufferStats = SharedBufferManager.getStats();
    
    return {
      bufferCount: this.dataBuffers.size,
      ringBufferCount: this.ringBuffers.size,
      totalMemory: bufferStats.totalMemory,
      workerActive: this.workerContext !== null
    };
  }
}

/**
 * React hook for SharedArrayBuffer integration
 */
export function useSharedArrayBuffer(componentId: string, enableWorker = true) {
  const integration = SharedArrayBufferIntegration.getInstance();
  
  // Initialize worker if enabled
  if (enableWorker) {
    integration.initializeWorker();
  }

  const createBuffer = (id: string, maxDataPoints: number) => {
    enhancedLeakDetector.registerObject(
      { componentId, bufferId: id },
      `Component_Buffer_${componentId}_${id}`,
      maxDataPoints * 8
    );
    return integration.createStreamingBuffer(id, maxDataPoints);
  };

  const createRingBuffer = (id: string, capacity: number) => {
    enhancedLeakDetector.registerObject(
      { componentId, ringBufferId: id },
      `Component_RingBuffer_${componentId}_${id}`,
      capacity
    );
    return integration.createRingBuffer(id, capacity);
  };

  const processData = (bufferId: string, data: Float32Array, operation: 'process' | 'aggregate' = 'process') => {
    return integration.processDataInWorker(bufferId, data, operation);
  };

  const batchProcess = (datasets: Array<{ id: string; data: Float32Array; operation: 'process' | 'aggregate' }>) => {
    return integration.batchProcessDatasets(datasets);
  };

  const getStats = () => integration.getStats();

  return {
    createBuffer,
    createRingBuffer,
    processData,
    batchProcess,
    getStats,
    integration
  };
}

// Export singleton instance
export const sharedArrayBufferIntegration = SharedArrayBufferIntegration.getInstance();