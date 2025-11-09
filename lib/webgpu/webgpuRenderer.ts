import { DataPoint, ChartConfig } from '@/types/dashboard';

export class WebGPURenderer {
  private device: GPUDevice | null = null;
  private context: GPUCanvasContext | null = null;
  private pipeline: GPURenderPipeline | null = null;
  private vertexBuffer: GPUBuffer | null = null;
  private indexBuffer: GPUBuffer | null = null;
  private uniformBuffer: GPUBuffer | null = null;
  // private bindGroup: GPUBindGroup | null = null;

  async initialize(canvas: HTMLCanvasElement): Promise<void> {
    if (!navigator.gpu) {
      throw new Error('WebGPU not supported');
    }

    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
      throw new Error('No WebGPU adapter found');
    }

    this.device = await adapter.requestDevice();

    this.context = canvas.getContext('webgpu') as GPUCanvasContext;
    if (!this.context) {
      throw new Error('Failed to get WebGPU context');
    }

    const format = navigator.gpu.getPreferredCanvasFormat();
    this.context.configure({
      device: this.device,
      format,
      alphaMode: 'premultiplied',
    });

    await this.createPipeline(format);
  }

  private async createPipeline(format: GPUTextureFormat): Promise<void> {
    if (!this.device) return;

    // Vertex shader for data points
    const vertexShaderCode = `
      struct VertexInput {
        @location(0) position: vec2<f32>,
        @location(1) color: vec3<f32>,
        @location(2) size: f32,
      };

      struct VertexOutput {
        @builtin(position) position: vec4<f32>,
        @location(0) color: vec3<f32>,
      };

      @vertex
      fn main(input: VertexInput) -> VertexOutput {
        var output: VertexOutput;
        output.position = vec4<f32>(input.position, 0.0, 1.0);
        output.color = input.color;
        return output;
      }
    `;

    // Fragment shader
    const fragmentShaderCode = `
      @fragment
      fn main(@location(0) color: vec3<f32>) -> @location(0) vec4<f32> {
        return vec4<f32>(color, 1.0);
      }
    `;

    const vertexModule = this.device.createShaderModule({
      code: vertexShaderCode,
    });

    const fragmentModule = this.device.createShaderModule({
      code: fragmentShaderCode,
    });

    // Create pipeline
    this.pipeline = this.device.createRenderPipeline({
      layout: 'auto',
      vertex: {
        module: vertexModule,
        entryPoint: 'main',
        buffers: [
          {
            arrayStride: 6 * 4, // 2 position + 3 color + 1 size = 6 floats
            attributes: [
              { shaderLocation: 0, offset: 0, format: 'float32x2' },
              { shaderLocation: 1, offset: 8, format: 'float32x3' },
              { shaderLocation: 2, offset: 20, format: 'float32' },
            ],
          },
        ],
      },
      fragment: {
        module: fragmentModule,
        entryPoint: 'main',
        targets: [{ format }],
      },
      primitive: {
        topology: 'point-list',
      },
    });
  }

  render(data: DataPoint[], _config: ChartConfig, width: number, height: number): void {
    if (!this.device || !this.context || !this.pipeline) {
      console.warn('WebGPU renderer not initialized');
      return;
    }

    // Prepare vertex data
    const vertices = this.prepareVertexData(data, width, height);

    // Create vertex buffer
    this.vertexBuffer = this.device.createBuffer({
      size: vertices.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });

    this.device.queue.writeBuffer(this.vertexBuffer, 0, vertices.buffer);

    // Create command encoder
    const commandEncoder = this.device.createCommandEncoder();
    const textureView = this.context.getCurrentTexture().createView();

    const renderPass = commandEncoder.beginRenderPass({
      colorAttachments: [
        {
          view: textureView,
          clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
          loadOp: 'clear',
          storeOp: 'store',
        },
      ],
    });

    renderPass.setPipeline(this.pipeline);
    renderPass.setVertexBuffer(0, this.vertexBuffer);
    renderPass.draw(data.length);
    renderPass.end();

    // Submit commands
    this.device.queue.submit([commandEncoder.finish()]);
  }

  private prepareVertexData(data: DataPoint[], _width: number, _height: number): Float32Array {
    const vertices: number[] = [];

    // Calculate bounds
    const maxValue = Math.max(...data.map(p => p.value));
    const minValue = Math.min(...data.map(p => p.value));
    const timeRange = Math.max(...data.map(p => p.timestamp)) - Math.min(...data.map(p => p.timestamp));

    data.forEach(point => {
      // Normalize position
      const x = ((point.timestamp - Math.min(...data.map(p => p.timestamp))) / timeRange) * 2 - 1;
      const y = ((point.value - minValue) / (maxValue - minValue)) * 2 - 1;

      // Get color (simplified - in real implementation, use category colors)
      const color = this.getPointColor(point);

      // Size (could be based on data properties)
      const size = 1.0;

      vertices.push(x, y, color.r, color.g, color.b, size);
    });

    return new Float32Array(vertices);
  }

  private getPointColor(point: DataPoint): { r: number; g: number; b: number } {
    // Simplified color mapping - in real implementation, use category colors
    const colors: Record<string, { r: number; g: number; b: number }> = {
      'A': { r: 0.25, g: 0.45, b: 0.85 }, // Blue
      'B': { r: 1.0, g: 0.5, b: 0.0 },   // Orange
      'C': { r: 0.3, g: 0.8, b: 0.3 },   // Green
      'D': { r: 0.8, g: 0.2, b: 0.2 },   // Red
    };

    return colors[point.category] || { r: 0.5, g: 0.5, b: 0.5 };
  }

  destroy(): void {
    if (this.vertexBuffer) {
      this.vertexBuffer.destroy();
    }
    if (this.indexBuffer) {
      this.indexBuffer.destroy();
    }
    if (this.uniformBuffer) {
      this.uniformBuffer.destroy();
    }
    // Device cleanup is handled by the WebGPU integration
  }
}