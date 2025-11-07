import { DataPoint, ChartConfig } from '@/types/dashboard';

/**
 * WebGPU-based renderer for high-performance data visualization
 * Provides GPU-accelerated rendering with compute shader support
 */
export class WebGPURenderer {
  private device: GPUDevice | null = null;
  private context: GPUCanvasContext | null = null;
  private pipeline: GPURenderPipeline | null = null;
  private computePipeline: GPUComputePipeline | null = null;
  private vertexBuffer: GPUBuffer | null = null;
  private uniformBuffer: GPUBuffer | null = null;
  private bindGroup: GPUBindGroup | null = null;
  private canvas: HTMLCanvasElement;
  private initialized = false;
  private fallbackRenderer: CanvasRenderer | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  /**
   * Initialize WebGPU device and context
   */
  async initialize(): Promise<boolean> {
    try {
      // Check WebGPU support
      if (!navigator.gpu) {
        console.warn('WebGPU not supported, falling back to Canvas 2D');
        this.fallbackRenderer = new CanvasRenderer(this.canvas);
        return false;
      }

      // Request adapter and device
      const adapter = await navigator.gpu.requestAdapter({
        powerPreference: 'high-performance'
      });

      if (!adapter) {
        console.warn('No WebGPU adapter found, falling back to Canvas 2D');
        this.fallbackRenderer = new CanvasRenderer(this.canvas);
        return false;
      }

      this.device = await adapter.requestDevice();

      // Configure canvas context
      this.context = this.canvas.getContext('webgpu') as GPUCanvasContext;
      if (!this.context) {
        throw new Error('Failed to get WebGPU context');
      }

      const format = navigator.gpu.getPreferredCanvasFormat();
      this.context.configure({
        device: this.device,
        format,
        alphaMode: 'premultiplied'
      });

      // Create render pipeline
      await this.createRenderPipeline(format);

      // Create compute pipeline for data processing
      await this.createComputePipeline();

      this.initialized = true;
      console.log('WebGPU renderer initialized successfully');
      return true;

    } catch (error) {
      console.error('WebGPU initialization failed:', error);
      this.fallbackRenderer = new CanvasRenderer(this.canvas);
      return false;
    }
  }

  /**
   * Create the render pipeline for line chart rendering
   */
  private async createRenderPipeline(format: GPUTextureFormat): Promise<void> {
    if (!this.device) return;

    const shaderModule = this.device.createShaderModule({
      code: `
        struct VertexInput {
          @location(0) position: vec2<f32>,
          @location(1) color: vec3<f32>,
        };

        struct VertexOutput {
          @builtin(position) position: vec4<f32>,
          @location(0) color: vec3<f32>,
        };

        @group(0) @binding(0) var<uniform> transform: mat4x4<f32>;

        @vertex
        fn vertexMain(input: VertexInput) -> VertexOutput {
          var output: VertexOutput;
          output.position = transform * vec4<f32>(input.position, 0.0, 1.0);
          output.color = input.color;
          return output;
        }

        @fragment
        fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
          return vec4<f32>(input.color, 1.0);
        }
      `
    });

    this.pipeline = this.device.createRenderPipeline({
      layout: 'auto',
      vertex: {
        module: shaderModule,
        entryPoint: 'vertexMain',
        buffers: [{
          arrayStride: 5 * 4, // 2 position + 3 color floats
          attributes: [
            { shaderLocation: 0, offset: 0, format: 'float32x2' },
            { shaderLocation: 1, offset: 8, format: 'float32x3' }
          ]
        }]
      },
      fragment: {
        module: shaderModule,
        entryPoint: 'fragmentMain',
        targets: [{ format }]
      },
      primitive: {
        topology: 'line-strip',
        stripIndexFormat: undefined
      }
    });

    // Create uniform buffer for transformations
    this.uniformBuffer = this.device.createBuffer({
      size: 64, // 4x4 matrix
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });
  }

  /**
   * Create compute pipeline for data processing
   */
  private async createComputePipeline(): Promise<void> {
    if (!this.device) return;

    const computeShader = this.device.createShaderModule({
      code: `
        struct DataPoint {
          timestamp: f32,
          value: f32,
          category: u32,
        };

        @group(0) @binding(0) var<storage, read> inputData: array<DataPoint>;
        @group(0) @binding(1) var<storage, read_write> outputData: array<f32>;
        @group(0) @binding(2) var<uniform> params: vec4<f32>; // minVal, maxVal, width, height

        @compute @workgroup_size(64)
        fn processData(@builtin(global_invocation_id) id: vec3<u32>) {
          let i = id.x;
          if (i >= arrayLength(&inputData)) { return; }

          let point = inputData[i];
          let normalizedValue = (point.value - params.x) / (params.y - params.x);
          let x = (point.timestamp / 1000.0) * params.z;
          let y = params.w - (normalizedValue * params.w);

          // Store processed coordinates
          outputData[i * 2] = x;
          outputData[i * 2 + 1] = y;
        }
      `
    });

    this.computePipeline = this.device.createComputePipeline({
      layout: 'auto',
      compute: {
        module: computeShader,
        entryPoint: 'processData'
      }
    });
  }

  /**
   * Process data using compute shader
   */
  async processDataGPU(data: DataPoint[], config: ChartConfig): Promise<Float32Array> {
    if (!this.device || !this.computePipeline) {
      throw new Error('WebGPU not initialized');
    }

    const dataBuffer = this.device.createBuffer({
      size: data.length * 12, // 3 floats per point
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
    });

    const outputBuffer = this.device.createBuffer({
      size: data.length * 8, // 2 floats per point
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
    });

    const paramsBuffer = this.device.createBuffer({
      size: 16, // 4 floats
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });

    // Prepare data
    const dataArray = new Float32Array(data.length * 3);
    data.forEach((point, i) => {
      dataArray[i * 3] = point.timestamp;
      dataArray[i * 3 + 1] = point.value;
      dataArray[i * 3 + 2] = point.category.charCodeAt(0) || 0;
    });

    // Calculate min/max values
    const values = data.map(p => p.value);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);

    const paramsArray = new Float32Array([minVal, maxVal, this.canvas.width, this.canvas.height]);

    // Upload data
    this.device.queue.writeBuffer(dataBuffer, 0, dataArray);
    this.device.queue.writeBuffer(paramsBuffer, 0, paramsArray);

    // Create bind group
    const bindGroup = this.device.createBindGroup({
      layout: this.computePipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: dataBuffer } },
        { binding: 1, resource: { buffer: outputBuffer } },
        { binding: 2, resource: { buffer: paramsBuffer } }
      ]
    });

    // Execute compute shader
    const commandEncoder = this.device.createCommandEncoder();
    const passEncoder = commandEncoder.beginComputePass();
    passEncoder.setPipeline(this.computePipeline);
    passEncoder.setBindGroup(0, bindGroup);
    passEncoder.dispatchWorkgroups(Math.ceil(data.length / 64));
    passEncoder.end();

    // Read results
    const readBuffer = this.device.createBuffer({
      size: data.length * 8,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
    });
    commandEncoder.copyBufferToBuffer(outputBuffer, 0, readBuffer, 0, data.length * 8);
    this.device.queue.submit([commandEncoder.finish()]);

    await readBuffer.mapAsync(GPUMapMode.READ);
    const result = new Float32Array(readBuffer.getMappedRange());
    readBuffer.unmap();

    return result;
  }

  /**
   * Render line chart using WebGPU
   */
  async renderLineChart(data: DataPoint[], config: ChartConfig): Promise<void> {
    if (!this.initialized || !this.device || !this.context || !this.pipeline) {
      if (this.fallbackRenderer) {
        this.fallbackRenderer.renderLineChart(data, config);
      }
      return;
    }

    try {
      // Process data on GPU
      const processedData = await this.processDataGPU(data, config);

      // Create vertex buffer
      const vertexData = new Float32Array(data.length * 5); // x, y, r, g, b
      const color = this.hexToRgb(config.color);

      for (let i = 0; i < data.length; i++) {
        vertexData[i * 5] = processedData[i * 2];     // x
        vertexData[i * 5 + 1] = processedData[i * 2 + 1]; // y
        vertexData[i * 5 + 2] = color.r;              // r
        vertexData[i * 5 + 3] = color.g;              // g
        vertexData[i * 5 + 4] = color.b;              // b
      }

      if (this.vertexBuffer) {
        this.vertexBuffer.destroy();
      }

      this.vertexBuffer = this.device.createBuffer({
        size: vertexData.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
      });
      this.device.queue.writeBuffer(this.vertexBuffer, 0, vertexData);

      // Create transformation matrix
      const transformMatrix = this.createOrthographicMatrix(0, this.canvas.width, this.canvas.height, 0, -1, 1);
      this.device.queue.writeBuffer(this.uniformBuffer!, 0, transformMatrix);

      // Create bind group
      this.bindGroup = this.device.createBindGroup({
        layout: this.pipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: this.uniformBuffer! } }
        ]
      });

      // Render
      const commandEncoder = this.device.createCommandEncoder();
      const textureView = this.context.getCurrentTexture().createView();

      const renderPass = commandEncoder.beginRenderPass({
        colorAttachments: [{
          view: textureView,
          clearValue: { r: 0, g: 0, b: 0, a: 1 },
          loadOp: 'clear',
          storeOp: 'store'
        }]
      });

      renderPass.setPipeline(this.pipeline);
      renderPass.setBindGroup(0, this.bindGroup);
      renderPass.setVertexBuffer(0, this.vertexBuffer);
      renderPass.draw(data.length);
      renderPass.end();

      this.device.queue.submit([commandEncoder.finish()]);

    } catch (error) {
      console.error('WebGPU rendering failed:', error);
      if (this.fallbackRenderer) {
        this.fallbackRenderer.renderLineChart(data, config);
      }
    }
  }

  /**
   * Utility function to convert hex color to RGB
   */
  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16) / 255,
      g: parseInt(result[2], 16) / 255,
      b: parseInt(result[3], 16) / 255
    } : { r: 1, g: 1, b: 1 };
  }

  /**
   * Create orthographic projection matrix
   */
  private createOrthographicMatrix(left: number, right: number, bottom: number, top: number, near: number, far: number): Float32Array {
    const matrix = new Float32Array(16);
    matrix[0] = 2 / (right - left);
    matrix[5] = 2 / (top - bottom);
    matrix[10] = -2 / (far - near);
    matrix[12] = -(right + left) / (right - left);
    matrix[13] = -(top + bottom) / (top - bottom);
    matrix[14] = -(far + near) / (far - near);
    matrix[15] = 1;
    return matrix;
  }

  /**
   * Check if WebGPU is supported
   */
  static isSupported(): boolean {
    return 'gpu' in navigator;
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): { gpuMemoryUsage: number; computeTime: number } {
    // WebGPU doesn't expose direct memory metrics yet
    // This would need to be implemented with performance marks
    return {
      gpuMemoryUsage: 0, // Placeholder
      computeTime: 0     // Placeholder
    };
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.vertexBuffer) {
      this.vertexBuffer.destroy();
    }
    if (this.uniformBuffer) {
      this.uniformBuffer.destroy();
    }
    if (this.device) {
      this.device.destroy();
    }
  }
}

/**
 * Fallback Canvas 2D renderer
 */
class CanvasRenderer {
  private ctx: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
  }

  renderLineChart(data: DataPoint[], config: ChartConfig): void {
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);

    if (data.length < 2) return;

    this.ctx.strokeStyle = config.color;
    this.ctx.lineWidth = 2;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    // Calculate bounds
    const values = data.map(p => p.value);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const width = this.ctx.canvas.width;
    const height = this.ctx.canvas.height;

    this.ctx.beginPath();
    data.forEach((point, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - ((point.value - minVal) / (maxVal - minVal)) * height;

      if (index === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }
    });
    this.ctx.stroke();
  }
}