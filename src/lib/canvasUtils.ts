import { ViewportSize, ChartBounds } from './types';

export type CanvasContext = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

export function clearCanvas(ctx: CanvasContext, size: ViewportSize): void {
  ctx.clearRect(0, 0, size.width, size.height);
}

export function drawGrid(
  ctx: CanvasContext,
  bounds: ChartBounds,
  viewport: ViewportSize,
  options: {
    color?: string;
    lineWidth?: number;
    xSteps?: number;
    ySteps?: number;
  } = {}
): void {
  const {
    color = '#e5e7eb',
    lineWidth = 1,
    xSteps = 10,
    ySteps = 10
  } = options;
  
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.setLineDash([2, 2]);
  
  // Vertical lines
  for (let i = 0; i <= xSteps; i++) {
    const x = (i / xSteps) * viewport.width;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, viewport.height);
    ctx.stroke();
  }
  
  // Horizontal lines
  for (let i = 0; i <= ySteps; i++) {
    const y = (i / ySteps) * viewport.height;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(viewport.width, y);
    ctx.stroke();
  }
  
  ctx.setLineDash([]);
}

export function drawAxes(
  ctx: CanvasContext,
  bounds: ChartBounds,
  viewport: ViewportSize,
  options: {
    color?: string;
    lineWidth?: number;
    fontSize?: number;
    fontColor?: string;
  } = {}
): void {
  const {
    color = '#374151',
    lineWidth = 2,
    fontSize = 12,
    fontColor = '#6b7280'
  } = options;
  
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.font = `${fontSize}px system-ui`;
  ctx.fillStyle = fontColor;
  
  const padding = 40;
  const chartWidth = viewport.width - padding * 2;
  const chartHeight = viewport.height - padding * 2;
  
  // X-axis
  ctx.beginPath();
  ctx.moveTo(padding, viewport.height - padding);
  ctx.lineTo(viewport.width - padding, viewport.height - padding);
  ctx.stroke();
  
  // Y-axis
  ctx.beginPath();
  ctx.moveTo(padding, padding);
  ctx.lineTo(padding, viewport.height - padding);
  ctx.stroke();
  
  // X-axis labels
  const xStep = Math.ceil((bounds.maxX - bounds.minX) / 5);
  for (let i = 0; i <= 5; i++) {
    const value = bounds.minX + i * xStep;
    const x = padding + (i / 5) * chartWidth;
    const label = new Date(value).toLocaleTimeString().slice(0, 5);
    
    ctx.fillText(label, x - 20, viewport.height - padding + 20);
  }
  
  // Y-axis labels
  const yStep = (bounds.maxY - bounds.minY) / 5;
  for (let i = 0; i <= 5; i++) {
    const value = bounds.minY + i * yStep;
    const y = viewport.height - padding - (i / 5) * chartHeight;
    const label = value.toFixed(1);
    
    ctx.fillText(label, 5, y + 4);
  }
}

export function mapDataToCanvas(
  dataPoint: { timestamp: number; value: number },
  bounds: ChartBounds,
  viewport: ViewportSize
): { x: number; y: number } {
  const padding = 40;
  const chartWidth = viewport.width - padding * 2;
  const chartHeight = viewport.height - padding * 2;
  
  const x = padding + ((dataPoint.timestamp - bounds.minX) / (bounds.maxX - bounds.minX)) * chartWidth;
  const y = viewport.height - padding - ((dataPoint.value - bounds.minY) / (bounds.maxY - bounds.minY)) * chartHeight;
  
  return { x, y };
}

export function drawLine(
  ctx: CanvasContext,
  points: { x: number; y: number }[],
  options: {
    color?: string;
    lineWidth?: number;
    smooth?: boolean;
  } = {}
): void {
  if (points.length < 2) return;
  
  const {
    color = '#3b82f6',
    lineWidth = 2,
    smooth = true
  } = options;
  
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  ctx.beginPath();
  
  if (smooth && points.length > 2) {
    // Draw smooth curve using quadratic curves
    ctx.moveTo(points[0].x, points[0].y);
    
    for (let i = 1; i < points.length - 1; i++) {
      const xc = (points[i].x + points[i + 1].x) / 2;
      const yc = (points[i].y + points[i + 1].y) / 2;
      ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
    }
    
    // Last point
    ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
  } else {
    // Draw straight lines
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
  }
  
  ctx.stroke();
}

export function drawBars(
  ctx: CanvasContext,
  data: { timestamp: number; value: number }[],
  bounds: ChartBounds,
  viewport: ViewportSize,
  options: {
    color?: string;
    barWidth?: number;
  } = {}
): void {
  const {
    color = '#10b981',
    barWidth = 0.8
  } = options;
  
  const padding = 40;
  const chartWidth = viewport.width - padding * 2;
  const chartHeight = viewport.height - padding * 2;
  
  ctx.fillStyle = color;
  
  const actualBarWidth = (chartWidth / data.length) * barWidth;
  const barSpacing = (chartWidth / data.length) * (1 - barWidth);
  
  data.forEach((point, index) => {
    const x = padding + index * (actualBarWidth + barSpacing) + barSpacing / 2;
    const barHeight = ((point.value - bounds.minY) / (bounds.maxY - bounds.minY)) * chartHeight;
    const y = viewport.height - padding - barHeight;
    
    ctx.fillRect(x, y, actualBarWidth, barHeight);
  });
}

export function drawScatterPoints(
  ctx: CanvasContext,
  points: { x: number; y: number; size?: number }[],
  options: {
    color?: string;
    pointSize?: number;
    opacity?: number;
  } = {}
): void {
  const {
    color = '#f59e0b',
    pointSize = 4,
    opacity = 0.8
  } = options;
  
  ctx.fillStyle = color;
  ctx.globalAlpha = opacity;
  
  points.forEach(point => {
    const size = point.size || pointSize;
    ctx.beginPath();
    ctx.arc(point.x, point.y, size, 0, Math.PI * 2);
    ctx.fill();
  });
  
  ctx.globalAlpha = 1;
}

export function drawHeatmap(
  ctx: CanvasContext,
  data: { x: number; y: number; value: number }[],
  viewport: ViewportSize,
  options: {
    colorScale?: (value: number) => string;
    cellSize?: number;
  } = {}
): void {
  const {
    colorScale = defaultHeatmapColorScale,
    cellSize = 10
  } = options;
  
  data.forEach(cell => {
    const color = colorScale(cell.value);
    ctx.fillStyle = color;
    ctx.fillRect(cell.x, cell.y, cellSize, cellSize);
  });
}

function defaultHeatmapColorScale(value: number): string {
  // Simple color scale from blue to red
  const normalized = Math.max(0, Math.min(1, value / 100));
  const hue = (1 - normalized) * 240; // Blue (240) to Red (0)
  return `hsl(${hue}, 70%, 50%)`;
}

export function optimizeCanvasRendering(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext('2d') as CanvasContext;
  if (!ctx) return;

  // Enable image smoothing for better quality
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Set device pixel ratio for sharp rendering
  const devicePixelRatio = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();

  if (canvas.width !== rect.width * devicePixelRatio ||
      canvas.height !== rect.height * devicePixelRatio) {
    canvas.width = rect.width * devicePixelRatio;
    canvas.height = rect.height * devicePixelRatio;
    ctx.scale(devicePixelRatio, devicePixelRatio);
  }

  // Set default styles
  ctx.font = '12px system-ui';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
}