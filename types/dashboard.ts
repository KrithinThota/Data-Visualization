export interface DataPoint {
  timestamp: number;
  value: number;
  category: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: Record<string, any>;
}

export interface ChartConfig {
  id: string;
  type: 'line' | 'bar' | 'scatter' | 'heatmap';
  dataKey: string;
  color: string;
  visible: boolean;
  aggregation?: '1min' | '5min' | '1hour';
}

export interface PerformanceMetrics {
  fps: number;
  memoryUsage: number;
  renderTime: number;
  dataProcessingTime: number;
  interactionLatency: number;
}

export interface FilterConfig {
  categories?: string[];
  category?: string;
  valueRange?: [number, number];
  minValue?: number;
  maxValue?: number;
  timeRange?: TimeRange;
}

export interface TimeRange {
  start: number;
  end: number;
}

export interface DashboardState {
   data: DataPoint[];
   filters: FilterConfig;
   timeRange: TimeRange;
   chartConfigs: ChartConfig[];
   performance: PerformanceMetrics;
   isLoading: boolean;
   windowSize?: number;
   categoryColors?: Record<string, string>;
 }

export interface AggregatedPoint {
  timestamp: number;
  min: number;
  max: number;
  avg: number;
  count: number;
}

export interface ProcessedData {
  points: DataPoint[];
  stats: {
    min: number;
    max: number;
    avg: number;
    count: number;
  };
  filtered: DataPoint[];
}

export interface LODLevel {
  threshold: number;
  strategy: 'pixel' | 'statistical' | 'aggregated' | 'detailed';
}

export interface StatisticalSummary {
  min: number;
  max: number;
  median: number;
  q1: number;
  q3: number;
}

export interface BenchmarkResult {
  dataPoints: number;
  renderTime: number;
  memoryUsage: number;
  fps: number;
  totalTime: number;
  chartType?: string;
  rendererType?: string;
  lodLevel?: string;
  percentiles?: {
    p50: number;
    p95: number;
    p99: number;
  };
}

export interface LeakReport {
  id: string;
  age?: number;
  count?: number;
  type: string;
}

export interface QualitySettings {
  samples: number;
  smoothing: 'none' | 'linear' | 'cubic' | 'spline';
}

export interface ZoomPanState {
  zoom: number;
  panX: number;
  panY: number;
  isDragging: boolean;
}

export interface TooltipData {
  x: number;
  y: number;
  data: DataPoint;
  context: {
    nearby: DataPoint[];
    trend: 'increasing' | 'decreasing' | 'stable';
    outliers: DataPoint[];
  };
}

export interface AggregatedBucket {
  timestamp: number;
  avg: number;
  count: number;
}