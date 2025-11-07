export class SharedBufferManager {
  private static buffers = new Map<string, SharedArrayBuffer>();
  private static views = new Map<string, Map<string, ArrayBufferView>>();
  private static transferQueues = new Map<string, ArrayBuffer[]>();

  static createBuffer(key: string, size: number): SharedArrayBuffer {
    if (this.buffers.has(key)) {
      console.warn(`Buffer ${key} already exists, returning existing buffer`);
      return this.buffers.get(key)!;
    }

    const buffer = new SharedArrayBuffer(size);
    this.buffers.set(key, buffer);
    this.views.set(key, new Map());
    return buffer;
  }

  static getBuffer(key: string): SharedArrayBuffer | undefined {
    return this.buffers.get(key);
  }

  static deleteBuffer(key: string): boolean {
    const deleted = this.buffers.delete(key);
    if (deleted) {
      this.views.delete(key);
      this.transferQueues.delete(key);
    }
    return deleted;
  }

  // Create typed views on shared buffers
  static createFloat32Array(key: string, byteOffset = 0, length?: number): Float32Array {
    const buffer = this.buffers.get(key);
    if (!buffer) throw new Error(`Buffer ${key} not found`);

    const array = new Float32Array(buffer, byteOffset, length);
    this.views.get(key)!.set(`float32_${byteOffset}_${length}`, array);
    return array;
  }

  static createUint8Array(key: string, byteOffset = 0, length?: number): Uint8Array {
    const buffer = this.buffers.get(key);
    if (!buffer) throw new Error(`Buffer ${key} not found`);

    const array = new Uint8Array(buffer, byteOffset, length);
    this.views.get(key)!.set(`uint8_${byteOffset}_${length}`, array);
    return array;
  }

  static createInt32Array(key: string, byteOffset = 0, length?: number): Int32Array {
    const buffer = this.buffers.get(key);
    if (!buffer) throw new Error(`Buffer ${key} not found`);

    const array = new Int32Array(buffer, byteOffset, length);
    this.views.get(key)!.set(`int32_${byteOffset}_${length}`, array);
    return array;
  }

  // Zero-copy data transfer between ArrayBuffer and SharedArrayBuffer
  static async zeroCopyTransfer(sourceBuffer: ArrayBuffer, targetKey: string): Promise<void> {
    const targetBuffer = this.buffers.get(targetKey);
    if (!targetBuffer) throw new Error(`Target buffer ${targetKey} not found`);

    if (sourceBuffer.byteLength > targetBuffer.byteLength) {
      throw new Error('Source buffer is larger than target buffer');
    }

    // Use Atomics for thread-safe transfer (if needed)
    const sourceView = new Uint8Array(sourceBuffer);
    const targetView = new Uint8Array(targetBuffer);

    // Copy data without creating intermediate buffers
    targetView.set(sourceView);
  }

  // Transfer ownership to Web Worker
  static transferToWorker(bufferKey: string, worker: Worker): void {
    const buffer = this.buffers.get(bufferKey);
    if (!buffer) throw new Error(`Buffer ${bufferKey} not found`);

    // Transfer ownership - buffer becomes unusable in main thread
    worker.postMessage({
      type: 'SHARED_BUFFER_TRANSFER',
      bufferKey,
      buffer
    }, [buffer]);

    // Remove from our tracking since ownership is transferred
    this.buffers.delete(bufferKey);
    this.views.delete(bufferKey);
  }

  // Queue data for batched transfer
  static queueForTransfer(bufferKey: string, data: ArrayBuffer): void {
    if (!this.transferQueues.has(bufferKey)) {
      this.transferQueues.set(bufferKey, []);
    }
    this.transferQueues.get(bufferKey)!.push(data);
  }

  // Process queued transfers
  static async processTransferQueue(bufferKey: string): Promise<void> {
    const queue = this.transferQueues.get(bufferKey);
    if (!queue || queue.length === 0) return;

    const buffer = this.buffers.get(bufferKey);
    if (!buffer) throw new Error(`Buffer ${bufferKey} not found`);

    const targetView = new Uint8Array(buffer);
    let offset = 0;

    for (const data of queue) {
      const sourceView = new Uint8Array(data);
      targetView.set(sourceView, offset);
      offset += data.byteLength;
    }

    // Clear the queue
    this.transferQueues.delete(bufferKey);
  }

  // Memory-mapped operations for large datasets
  static async createMemoryMappedView<T extends ArrayBufferView>(
    bufferKey: string,
    TypedArray: { new(buffer: ArrayBufferLike, byteOffset?: number, length?: number): T },
    byteOffset = 0,
    length?: number
  ): Promise<T> {
    const buffer = this.buffers.get(bufferKey);
    if (!buffer) throw new Error(`Buffer ${bufferKey} not found`);

    // Simulate async memory mapping (in reality this would be handled by the OS)
    await new Promise(resolve => setTimeout(resolve, 0));

    return new TypedArray(buffer, byteOffset, length);
  }

  // Get buffer statistics
  static getStats(): {
    totalBuffers: number;
    totalMemory: number;
    bufferKeys: string[];
    viewsPerBuffer: Record<string, number>;
  } {
    const bufferKeys = Array.from(this.buffers.keys());
    const viewsPerBuffer: Record<string, number> = {};

    for (const [key, views] of this.views) {
      viewsPerBuffer[key] = views.size;
    }

    const totalMemory = bufferKeys.reduce((sum, key) => {
      const buffer = this.buffers.get(key);
      return sum + (buffer?.byteLength || 0);
    }, 0);

    return {
      totalBuffers: bufferKeys.length,
      totalMemory,
      bufferKeys,
      viewsPerBuffer
    };
  }

  // Cleanup unused buffers
  static cleanup(): void {
    const keysToDelete: string[] = [];

    for (const [key, views] of this.views) {
      if (views.size === 0) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => {
      this.buffers.delete(key);
      this.views.delete(key);
      this.transferQueues.delete(key);
    });
  }

  // Check if SharedArrayBuffer is supported
  static isSupported(): boolean {
    return typeof SharedArrayBuffer !== 'undefined';
  }

  // Get maximum buffer size (implementation dependent)
  static getMaxBufferSize(): number {
    // In practice, this would be determined by the environment
    // For now, return a reasonable default
    return 128 * 1024 * 1024; // 128MB
  }
}

// Utility for creating ring buffers with SharedArrayBuffer
export class SharedRingBuffer {
  private buffer: SharedArrayBuffer;
  private view: Uint8Array;
  private writePos: Uint32Array;
  private readPos: Uint32Array;
  private capacity: number;

  constructor(capacity: number) {
    // Layout: [writePos: 4 bytes][readPos: 4 bytes][data: capacity bytes]
    const totalSize = 8 + capacity;
    this.buffer = new SharedArrayBuffer(totalSize);
    this.view = new Uint8Array(this.buffer, 8, capacity);
    this.writePos = new Uint32Array(this.buffer, 0, 1);
    this.readPos = new Uint32Array(this.buffer, 4, 1);
    this.capacity = capacity;

    // Initialize positions
    Atomics.store(this.writePos, 0, 0);
    Atomics.store(this.readPos, 0, 0);
  }

  write(data: Uint8Array): boolean {
    const dataLength = data.length;
    const currentWrite = Atomics.load(this.writePos, 0);
    const currentRead = Atomics.load(this.readPos, 0);

    // Check if there's enough space
    const availableSpace = this.capacity - ((currentWrite - currentRead + this.capacity) % this.capacity);
    if (availableSpace < dataLength + 1) { // +1 for potential wrap-around
      return false; // Not enough space
    }

    // Write data
    for (let i = 0; i < dataLength; i++) {
      const pos = (currentWrite + i) % this.capacity;
      this.view[pos] = data[i];
    }

    // Update write position atomically
    Atomics.store(this.writePos, 0, (currentWrite + dataLength) % this.capacity);
    return true;
  }

  read(maxLength: number): Uint8Array | null {
    const currentWrite = Atomics.load(this.writePos, 0);
    const currentRead = Atomics.load(this.readPos, 0);

    const availableData = (currentWrite - currentRead + this.capacity) % this.capacity;
    if (availableData === 0) return null;

    const readLength = Math.min(maxLength, availableData);
    const result = new Uint8Array(readLength);

    for (let i = 0; i < readLength; i++) {
      const pos = (currentRead + i) % this.capacity;
      result[i] = this.view[pos];
    }

    // Update read position atomically
    Atomics.store(this.readPos, 0, (currentRead + readLength) % this.capacity);
    return result;
  }

  getStats(): { used: number; available: number; capacity: number } {
    const currentWrite = Atomics.load(this.writePos, 0);
    const currentRead = Atomics.load(this.readPos, 0);
    const used = (currentWrite - currentRead + this.capacity) % this.capacity;
    const available = this.capacity - used;

    return { used, available, capacity: this.capacity };
  }
}

// Export singleton instance
export const sharedBufferManager = new SharedBufferManager();