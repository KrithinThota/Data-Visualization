import { DataPoint } from '@/types/dashboard';

export class CanvasRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private dpr: number;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.dpr = window.devicePixelRatio || 1;
    this.setupCanvas();
  }

  private setupCanvas() {
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * this.dpr;
    this.canvas.height = rect.height * this.dpr;
    this.ctx.scale(this.dpr, this.dpr);
    this.canvas.style.width = rect.width + 'px';
    this.canvas.style.height = rect.height + 'px';
  }

  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width / this.dpr, this.canvas.height / this.dpr);
  }

  drawLine(points: { x: number; y: number }[], color: string, lineWidth: number = 2) {
    if (points.length < 2) return;

    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = lineWidth;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    this.ctx.beginPath();
    this.ctx.moveTo(points[0].x, points[0].y);

    for (let i = 1; i < points.length; i++) {
      this.ctx.lineTo(points[i].x, points[i].y);
    }

    this.ctx.stroke();
  }

  drawPoints(points: { x: number; y: number }[], color: string, radius: number = 3) {
    this.ctx.fillStyle = color;

    for (const point of points) {
      this.ctx.beginPath();
      this.ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  drawBars(bars: { x: number; y: number; width: number; height: number }[], color: string) {
    this.ctx.fillStyle = color;

    for (const bar of bars) {
      this.ctx.fillRect(bar.x, bar.y, bar.width, bar.height);
    }
  }

  drawRect(x: number, y: number, width: number, height: number, color: string, filled: boolean = true) {
    if (filled) {
      this.ctx.fillStyle = color;
      this.ctx.fillRect(x, y, width, height);
    } else {
      this.ctx.strokeStyle = color;
      this.ctx.strokeRect(x, y, width, height);
    }
  }

  drawCircle(x: number, y: number, radius: number, color: string, filled: boolean = true) {
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);

    if (filled) {
      this.ctx.fillStyle = color;
      this.ctx.fill();
    } else {
      this.ctx.strokeStyle = color;
      this.ctx.stroke();
    }
  }

  drawHeatmap(data: DataPoint[], width: number, height: number, colorScale: (value: number) => string) {
    const cellWidth = width / Math.sqrt(data.length);
    const cellHeight = height / Math.sqrt(data.length);

    data.forEach((point, index) => {
      const x = (index % Math.sqrt(data.length)) * cellWidth;
      const y = Math.floor(index / Math.sqrt(data.length)) * cellHeight;

      this.ctx.fillStyle = colorScale(point.value);
      this.ctx.fillRect(x, y, cellWidth, cellHeight);
    });
  }

  getContext(): CanvasRenderingContext2D {
    return this.ctx;
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  resize(width: number, height: number) {
    this.canvas.style.width = width + 'px';
    this.canvas.style.height = height + 'px';
    this.canvas.width = width * this.dpr;
    this.canvas.height = height * this.dpr;
    this.ctx.scale(this.dpr, this.dpr);
  }
}