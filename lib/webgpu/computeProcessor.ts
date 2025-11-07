import { DataPoint } from '@/types/dashboard';

/**
 * WebGPU Compute Processor for high-performance data processing
 * Handles data aggregation, filtering, and transformation using GPU compute shaders
 */
export class ComputeProcessor {
  private device: GPUDevice | null = null;
  private computePipeline: GPUComputePipeline | null = null;
  private bindGroupLayout: GPUBindGroupLayout | null = null;
  private initialized = false;

  /**
   * Initialize WebGPU compute device
   */
  async initialize(): Promise<boolean> {
    try {
      if (!navigator.gpu) {
        console.warn('WebGPU not supported for compute processing');
        return false;
      }

      const adapter = await navigator.gpu.requestAdapter({
        powerPreference: 'high-performance'
      });

      if (!adapter) {
        console.warn('No suitable WebGPU adapter found');
        return false;
      }

      this.device = await adapter.requestDevice();

      // Create bind group layout for compute operations
      this.bindGroupLayout = this.device.createBindGroupLayout({
        entries: [
          {
            binding: 0,
            visibility: GPUShaderStage.COMPUTE,
            buffer: { type: 'read-only-storage' }
          },
          {
            binding: 1,
            visibility: GPUShaderStage.COMPUTE,
            buffer: { type: 'storage' }
          },
          {
            binding: 2,
            visibility: GPUShaderStage.COMPUTE,
            buffer: { type: 'uniform' }
          }
        ]
      });

      this.initialized = true;
      console.log('WebGPU compute processor initialized');
      return true;

    } catch (error) {
      console.error('Failed to initialize WebGPU compute processor:', error);
      return false;
    }
  }

  /**
   * Process data aggregation using compute shader
   */
  async aggregateData(data: DataPoint[], bucketSize: number): Promise<AggregatedBucket[]> {
    if (!this.initialized || !this.device) {
      throw new Error('Compute processor not initialized');
    }

    const shaderCode = `
      struct DataPoint {
        timestamp: f32,
        value: f32,
        category: u32,
      };

      struct AggregatedBucket {
        timestamp: f32,
        min: f32,
        max: f32,
        avg: f32,
        count: u32,
      };

      @group(0) @binding(0) var<storage, read> inputData: array<DataPoint>;
      @group(0) @binding(1) var<storage, read_write> outputBuckets: array<AggregatedBucket>;
      @group(0) @binding(2) var<uniform> params: vec2<f32>; // bucketSize, maxBuckets

      @compute @workgroup_size(64)
      fn aggregateData(@builtin(global_invocation_id) id: vec3<u32>) {
        let bucketIndex = id.x;
        if (bucketIndex >= u32(params.y)) { return; }

        let bucketStartTime = f32(bucketIndex) * params.x;
        let bucketEndTime = bucketStartTime + params.x;

        var minVal = 3.4028235e+38; // f32 max
        var maxVal = -3.4028235e+38; // f32 min
        var sum = 0.0;
        var count = 0u;

        // Find data points in this bucket
        for (var i = 0u; i < arrayLength(&inputData); i = i + 1u) {
          let point = inputData[i];
          if (point.timestamp >= bucketStartTime && point.timestamp < bucketEndTime) {
            minVal = min(minVal, point.value);
            maxVal = max(maxVal, point.value);
            sum = sum + point.value;
            count = count + 1u;
          }
        }

        // Write aggregated result
        if (count > 0u) {
          outputBuckets[bucketIndex] = AggregatedBucket(
            bucketStartTime,
            minVal,
            maxVal,
            sum / f32(count),
            count
          );
        } else {
          outputBuckets[bucketIndex] = AggregatedBucket(
            bucketStartTime,
            0.0,
            0.0,
            0.0,
            0u
          );
        }
      }
    `;

    return this.runComputeShader(
      shaderCode,
      'aggregateData',
      data,
      bucketSize,
      this.calculateBucketCount(data, bucketSize)
    );
  }

  /**
   * Filter data using compute shader
   */
  async filterData(data: DataPoint[], minValue: number, maxValue: number): Promise<DataPoint[]> {
    if (!this.initialized || !this.device) {
      throw new Error('Compute processor not initialized');
    }

    const shaderCode = `
      struct DataPoint {
        timestamp: f32,
        value: f32,
        category: u32,
      };

      @group(0) @binding(0) var<storage, read> inputData: array<DataPoint>;
      @group(0) @binding(1) var<storage, read_write> outputData: array<DataPoint>;
      @group(0) @binding(2) var<uniform> params: vec2<f32>; // minValue, maxValue

      @compute @workgroup_size(64)
      fn filterData(@builtin(global_invocation_id) id: vec3<u32>) {
        let inputIndex = id.x;
        if (inputIndex >= arrayLength(&inputData)) { return; }

        let point = inputData[inputIndex];
        if (point.value >= params.x && point.value <= params.y) {
          // Find next available slot in output (simplified - assumes enough space)
          var outputIndex = 0u;
          for (var i = 0u; i < arrayLength(&outputData); i = i + 1u) {
            if (outputData[i].timestamp == 0.0) {
              outputIndex = i;
              break;
            }
          }
          outputData[outputIndex] = point;
        }
      }
    `;

    const filteredData = await this.runComputeShader(
      shaderCode,
      'filterData',
      data,
      [minValue, maxValue],
      data.length // Allocate max possible size
    );

    // Remove empty entries
    return filteredData.filter(point => point.timestamp !== 0);
  }

  /**
   * Apply moving average using compute shader
   */
  async movingAverage(data: DataPoint[], windowSize: number): Promise<DataPoint[]> {
    if (!this.initialized || !this.device) {
      throw new Error('Compute processor not initialized');
    }

    const shaderCode = `
      struct DataPoint {
        timestamp: f32,
        value: f32,
        category: u32,
      };

      @group(0) @binding(0) var<storage, read> inputData: array<DataPoint>;
      @group(0) @binding(1) var<storage, read_write> outputData: array<DataPoint>;
      @group(0) @binding(2) var<uniform> params: vec2<f32>; // windowSize, dataLength

      @compute @workgroup_size(64)
      fn movingAverage(@builtin(global_invocation_id) id: vec3<u32>) {
        let index = id.x;
        if (index >= u32(params.y)) { return; }

        let halfWindow = i32(params.x) / 2;
        var sum = 0.0;
        var count = 0;

        // Calculate moving average
        for (var i = -halfWindow; i <= halfWindow; i = i + 1) {
          let dataIndex = i32(index) + i;
          if (dataIndex >= 0 && dataIndex < i32(params.y)) {
            sum = sum + inputData[dataIndex].value;
            count = count + 1;
          }
        }

        let avg = sum / f32(count);
        outputData[index] = DataPoint(
          inputData[index].timestamp,
          avg,
          inputData[index].category
        );
      }
    `;

    return this.runComputeShader(
      shaderCode,
      'movingAverage',
      data,
      [windowSize, data.length],
      data.length
    );
  }

  /**
   * Run a compute shader with given parameters
   */
  private async runComputeShader(
    shaderCode: string,
    entryPoint: string,
    inputData: DataPoint[],
    params: number[] | number,
    outputSize: number
  ): Promise<any[]> {
    if (!this.device || !this.bindGroupLayout) {
      throw new Error('Device not initialized');
    }

    // Create shader module
    const shaderModule = this.device.createShaderModule({
      code: shaderCode
    });

    // Create compute pipeline
    const pipelineLayout = this.device.createPipelineLayout({
      bindGroupLayouts: [this.bindGroupLayout]
    });

    const computePipeline = this.device.createComputePipeline({
      layout: pipelineLayout,
      compute: {
        module: shaderModule,
        entryPoint
      }
    });

    // Prepare input data
    const inputArray = new Float32Array(inputData.length * 3);
    inputData.forEach((point, i) => {
      inputArray[i * 3] = point.timestamp;
      inputArray[i * 3 + 1] = point.value;
      inputArray[i * 3 + 2] = point.category.charCodeAt(0) || 0;
    });

    // Create buffers
    const inputBuffer = this.device.createBuffer({
      size: inputArray.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
    });

    const outputBuffer = this.device.createBuffer({
      size: outputSize * 12, // 3 floats per DataPoint
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
    });

    const paramsArray = Array.isArray(params) ? new Float32Array(params) : new Float32Array([params]);
    const paramsBuffer = this.device.createBuffer({
      size: paramsArray.byteLength,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });

    // Upload data
    this.device.queue.writeBuffer(inputBuffer, 0, inputArray);
    this.device.queue.writeBuffer(paramsBuffer, 0, paramsArray);

    // Create bind group
    const bindGroup = this.device.createBindGroup({
      layout: this.bindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: inputBuffer } },
        { binding: 1, resource: { buffer: outputBuffer } },
        { binding: 2, resource: { buffer: paramsBuffer } }
      ]
    });

    // Execute compute shader
    const commandEncoder = this.device.createCommandEncoder();
    const passEncoder = commandEncoder.beginComputePass();
    passEncoder.setPipeline(computePipeline);
    passEncoder.setBindGroup(0, bindGroup);
    passEncoder.dispatchWorkgroups(Math.ceil(outputSize / 64));
    passEncoder.end();

    // Read results
    const readBuffer = this.device.createBuffer({
      size: outputSize * 12,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
    });
    commandEncoder.copyBufferToBuffer(outputBuffer, 0, readBuffer, 0, outputSize * 12);
    this.device.queue.submit([commandEncoder.finish()]);

    await readBuffer.mapAsync(GPUMapMode.READ);
    const resultArray = new Float32Array(readBuffer.getMappedRange());
    readBuffer.unmap();

    // Convert back to DataPoint objects
    const results: any[] = [];
    for (let i = 0; i < resultArray.length; i += 3) {
      if (entryPoint === 'aggregateData') {
        results.push({
          timestamp: resultArray[i],
          min: resultArray[i + 1],
          max: resultArray[i + 2],
          avg: resultArray[i + 3] || 0,
          count: resultArray[i + 4] || 0
        });
      } else {
        results.push({
          timestamp: resultArray[i],
          value: resultArray[i + 1],
          category: String.fromCharCode(resultArray[i + 2] || 65)
        });
      }
    }

    return results;
  }

  /**
   * Calculate number of buckets needed for aggregation
   */
  private calculateBucketCount(data: DataPoint[], bucketSize: number): number {
    if (data.length === 0) return 0;

    const minTime = Math.min(...data.map(p => p.timestamp));
    const maxTime = Math.max(...data.map(p => p.timestamp));
    return Math.ceil((maxTime - minTime) / bucketSize);
  }

  /**
   * Check if WebGPU compute is supported
   */
  static isSupported(): boolean {
    return 'gpu' in navigator;
  }

  /**
   * Get compute performance metrics
   */
  getPerformanceMetrics(): { computeTime: number; memoryUsage: number } {
    // WebGPU doesn't expose direct compute metrics yet
    return {
      computeTime: 0, // Would need performance marks
      memoryUsage: 0  // Would need buffer size tracking
    };
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.device) {
      this.device.destroy();
    }
  }
}

interface AggregatedBucket {
  timestamp: number;
  min: number;
  max: number;
  avg: number;
  count: number;
}