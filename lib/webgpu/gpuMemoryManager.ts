import { DataPoint } from '@/types/dashboard';

/**
 * GPU Memory Manager for efficient WebGPU buffer management
 * Handles direct GPU memory access, buffer pooling, and zero-copy operations
 */
export class GPUMemoryManager {
  private device: GPUDevice | null = null;
  private bufferPool = new Map<string, GPUBuffer[]>();
  private sharedBuffers = new Map<string, SharedArrayBuffer>();

  /**
   * Initialize GPU memory manager
   */
  async initialize(device: GPUDevice): Promise<void> {
    this.device = device;
    console.log('GPU Memory Manager initialized');
  }

  /**
   * Create a GPU buffer with automatic memory management
   */
  createBuffer(descriptor: GPUBufferDescriptor, key?: string): GPUBuffer {
    if (!this.device) {
      throw new Error('GPU Memory Manager not initialized');
    }

    const buffer = this.device.createBuffer(descriptor);

    // Add to pool if key provided
    if (key) {
      if (!this.bufferPool.has(key)) {
        this.bufferPool.set(key, []);
      }
      this.bufferPool.get(key)!.push(buffer);
    }

    return buffer;
  }

  /**
   * Get a buffer from the pool or create a new one
   */
  getPooledBuffer(key: string, descriptor: GPUBufferDescriptor): GPUBuffer {
    const pool = this.bufferPool.get(key);
    if (pool && pool.length > 0) {
      const buffer = pool.pop()!;
      // Check if buffer is still valid and matches descriptor
      if (this.isBufferCompatible(buffer, descriptor)) {
        return buffer;
      } else {
        // Buffer incompatible, destroy and create new
        buffer.destroy();
      }
    }

    return this.createBuffer(descriptor, key);
  }

  /**
   * Return buffer to pool for reuse
   */
  returnToPool(key: string, buffer: GPUBuffer): void {
    if (!this.bufferPool.has(key)) {
      this.bufferPool.set(key, []);
    }

    const pool = this.bufferPool.get(key)!;
    if (pool.length < 10) { // Limit pool size
      pool.push(buffer);
    } else {
      buffer.destroy();
    }
  }

  /**
   * Create shared buffer for zero-copy data transfer
   */
  createSharedBuffer(key: string, size: number): SharedArrayBuffer {
    const buffer = new SharedArrayBuffer(size);
    this.sharedBuffers.set(key, buffer);
    return buffer;
  }

  /**
   * Get existing shared buffer
   */
  getSharedBuffer(key: string): SharedArrayBuffer | undefined {
    return this.sharedBuffers.get(key);
  }

  /**
   * Transfer data to GPU buffer with zero-copy when possible
   */
  async transferToGPU(
    data: ArrayBuffer | SharedArrayBuffer,
    targetBuffer: GPUBuffer,
    offset: number = 0
  ): Promise<void> {
    if (!this.device) {
      throw new Error('GPU Memory Manager not initialized');
    }

    // Check if we can do zero-copy transfer
    if (data instanceof SharedArrayBuffer) {
      // For SharedArrayBuffer, we can potentially use direct mapping
      // (This is a simplified implementation - actual zero-copy depends on WebGPU implementation)
      const view = new Uint8Array(data);
      this.device.queue.writeBuffer(targetBuffer, offset, view.buffer);
    } else {
      // Regular ArrayBuffer transfer
      this.device.queue.writeBuffer(targetBuffer, offset, data);
    }
  }

  /**
   * Read data from GPU buffer back to CPU
   */
  async readFromGPU(
    sourceBuffer: GPUBuffer,
    size: number,
    offset: number = 0
  ): Promise<ArrayBuffer> {
    if (!this.device) {
      throw new Error('GPU Memory Manager not initialized');
    }

    const readBuffer = this.device.createBuffer({
      size,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
    });

    const commandEncoder = this.device.createCommandEncoder();
    commandEncoder.copyBufferToBuffer(sourceBuffer, offset, readBuffer, 0, size);
    this.device.queue.submit([commandEncoder.finish()]);

    await readBuffer.mapAsync(GPUMapMode.READ);
    const result = readBuffer.getMappedRange().slice(0);
    readBuffer.unmap();
    readBuffer.destroy();

    return result;
  }

  /**
   * Create data buffer for DataPoint array
   */
  createDataBuffer(data: DataPoint[], usage: GPUBufferUsageFlags): GPUBuffer {
    const bufferSize = data.length * 12; // 3 floats * 4 bytes each
    const buffer = this.createBuffer({
      size: bufferSize,
      usage: usage | GPUBufferUsage.COPY_DST
    });

    // Convert DataPoint array to Float32Array
    const floatData = new Float32Array(data.length * 3);
    data.forEach((point, i) => {
      floatData[i * 3] = point.timestamp;
      floatData[i * 3 + 1] = point.value;
      floatData[i * 3 + 2] = point.category.charCodeAt(0) || 0;
    });

    this.device!.queue.writeBuffer(buffer, 0, floatData.buffer);
    return buffer;
  }

  /**
   * Create uniform buffer for shader parameters
   */
  createUniformBuffer(data: Float32Array | number[]): GPUBuffer {
    const array = Array.isArray(data) ? new Float32Array(data) : data;
    const buffer = this.createBuffer({
      size: array.byteLength,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });

    this.device!.queue.writeBuffer(buffer, 0, array.buffer);
    return buffer;
  }

  /**
   * Create storage buffer for compute operations
   */
  createStorageBuffer(size: number, initialData?: ArrayBuffer): GPUBuffer {
    const buffer = this.createBuffer({
      size,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC
    });

    if (initialData) {
      this.device!.queue.writeBuffer(buffer, 0, initialData);
    }

    return buffer;
  }

  /**
   * Optimized data upload for streaming data
   */
  uploadStreamingData(
    buffer: GPUBuffer,
    data: DataPoint[],
    startIndex: number = 0
  ): void {
    if (!this.device) return;

    // Convert only the new data points
    const floatData = new Float32Array(data.length * 3);
    data.forEach((point, i) => {
      floatData[i * 3] = point.timestamp;
      floatData[i * 3 + 1] = point.value;
      floatData[i * 3 + 2] = point.category.charCodeAt(0) || 0;
    });

    // Upload to specific offset in buffer
    const offset = startIndex * 12; // 12 bytes per DataPoint
    this.device.queue.writeBuffer(buffer, offset, floatData.buffer);
  }

  /**
   * Create vertex buffer for rendering
   */
  createVertexBuffer(vertexData: Float32Array): GPUBuffer {
    const buffer = this.createBuffer({
      size: vertexData.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
    });

    this.device!.queue.writeBuffer(buffer, 0, vertexData.buffer);
    return buffer;
  }

  /**
   * Create index buffer for indexed rendering
   */
  createIndexBuffer(indices: Uint32Array): GPUBuffer {
    const buffer = this.createBuffer({
      size: indices.byteLength,
      usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST
    });

    this.device!.queue.writeBuffer(buffer, 0, indices.buffer);
    return buffer;
  }

  /**
   * Memory-efficient buffer resizing
   */
  resizeBuffer(buffer: GPUBuffer, newSize: number): GPUBuffer {
    if (!this.device) {
      throw new Error('GPU Memory Manager not initialized');
    }

    // Create new buffer with new size
    const newBuffer = this.device.createBuffer({
      size: newSize,
      usage: buffer.usage
    });

    // Copy data from old buffer to new buffer
    const commandEncoder = this.device.createCommandEncoder();
    commandEncoder.copyBufferToBuffer(
      buffer,
      0,
      newBuffer,
      0,
      Math.min(buffer.size, newSize)
    );
    this.device.queue.submit([commandEncoder.finish()]);

    // Destroy old buffer
    buffer.destroy();

    return newBuffer;
  }

  /**
   * Check if buffer is compatible with descriptor
   */
  private isBufferCompatible(buffer: GPUBuffer, descriptor: GPUBufferDescriptor): boolean {
    // Basic compatibility check
    return buffer.size >= descriptor.size &&
           (buffer.usage & descriptor.usage) === descriptor.usage;
  }

  /**
   * Get memory usage statistics
   */
  getMemoryStats(): {
    pooledBuffers: number;
    sharedBuffers: number;
    totalPooledSize: number;
  } {
    let totalPooledSize = 0;
    let pooledBuffers = 0;

    for (const buffers of this.bufferPool.values()) {
      pooledBuffers += buffers.length;
      for (const buffer of buffers) {
        totalPooledSize += buffer.size;
      }
    }

    return {
      pooledBuffers,
      sharedBuffers: this.sharedBuffers.size,
      totalPooledSize
    };
  }

  /**
   * Clear all pooled buffers
   */
  clearPool(): void {
    for (const buffers of this.bufferPool.values()) {
      for (const buffer of buffers) {
        buffer.destroy();
      }
    }
    this.bufferPool.clear();
  }

  /**
   * Cleanup all resources
   */
  destroy(): void {
    this.clearPool();
    this.sharedBuffers.clear();
    this.device = null;
  }
}

/**
 * Direct GPU Memory Access utilities
 */
export class DirectGPUMemory {
  private static instance: DirectGPUMemory;
  private memoryManager: GPUMemoryManager | null = null;

  static getInstance(): DirectGPUMemory {
    if (!DirectGPUMemory.instance) {
      DirectGPUMemory.instance = new DirectGPUMemory();
    }
    return DirectGPUMemory.instance;
  }

  /**
   * Initialize with GPU device
   */
  async initialize(device: GPUDevice): Promise<void> {
    this.memoryManager = new GPUMemoryManager();
    await this.memoryManager.initialize(device);
  }

  /**
   * Allocate GPU memory for data processing
   */
  allocateDataMemory(data: DataPoint[]): GPUBuffer {
    if (!this.memoryManager) {
      throw new Error('Direct GPU Memory not initialized');
    }

    return this.memoryManager.createDataBuffer(
      data,
      GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
    );
  }

  /**
   * Direct memory mapping for high-performance data transfer
   */
  async mapBufferForWrite(buffer: GPUBuffer): Promise<ArrayBuffer> {
    await buffer.mapAsync(GPUMapMode.WRITE);
    return buffer.getMappedRange();
  }

  /**
   * Unmap buffer after direct access
   */
  unmapBuffer(buffer: GPUBuffer): void {
    buffer.unmap();
  }

  /**
   * Zero-copy data synchronization between CPU and GPU
   */
  async syncToGPU(
    cpuData: ArrayBuffer,
    gpuBuffer: GPUBuffer,
    offset: number = 0
  ): Promise<void> {
    if (!this.memoryManager) {
      throw new Error('Direct GPU Memory not initialized');
    }

    await this.memoryManager.transferToGPU(cpuData, gpuBuffer, offset);
  }

  /**
   * Zero-copy data synchronization from GPU to CPU
   */
  async syncFromGPU(
    gpuBuffer: GPUBuffer,
    size: number,
    offset: number = 0
  ): Promise<ArrayBuffer> {
    if (!this.memoryManager) {
      throw new Error('Direct GPU Memory not initialized');
    }

    return this.memoryManager.readFromGPU(gpuBuffer, size, offset);
  }

  /**
   * Get memory manager instance
   */
  getMemoryManager(): GPUMemoryManager | null {
    return this.memoryManager;
  }
}
