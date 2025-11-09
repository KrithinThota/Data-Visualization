export interface DataPoint {
  timestamp: number;
  value: number;
  category: string;
  metadata?: Record<string, any>;
}

export interface ChartConfig {
  type: 'line' | 'bar' | 'scatter' | 'heatmap';
  dataKey: string;
  color: string;
  visible: boolean;
}

export interface PerformanceMetrics {
  fps: number;
  memoryUsage: number;
  renderTime: number;
  dataProcessingTime: number;
  dataPointsCount: number;
}

export interface TimeRange {
  start: number;
  end: number;
}

export interface FilterOptions {
  categories: string[];
  valueRange: [number, number];
  timeRange: TimeRange;
}

export interface ChartBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface ViewportSize {
  width: number;
  height: number;
}

export interface AggregationLevel {
  type: '1min' | '5min' | '1hour' | 'none';
  enabled: boolean;
}

export interface ZoomState {
  scale: number;
  offsetX: number;
  offsetY: number;
}

export interface PanState {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  offsetX?: number;
  offsetY?: number;
  isPanning: boolean;
}

export interface HeatmapData {
  x: number;
  y: number;
  value: number;
  label?: string;
}

export interface DataTableRow {
  id: string;
  timestamp: number;
  value: number;
  category: string;
  metadata?: Record<string, any>;
}

export interface RealtimeDataStreamOptions {
  updateInterval: number;
  maxDataPoints: number;
  enableAggregation: boolean;
}