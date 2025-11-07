# API Reference Documentation

## Overview

This document provides comprehensive API reference for all components, hooks, utilities, and types in the Ultra-High Performance Data Visualization Dashboard.

## Table of Contents

1. [Core Types](#core-types)
2. [Components](#components)
3. [Hooks](#hooks)
4. [Libraries & Utilities](#libraries--utilities)
5. [Configuration](#configuration)
6. [Events & Callbacks](#events--callbacks)
7. [Error Handling](#error-handling)

---

## Core Types

### DataPoint

```typescript
interface DataPoint {
  timestamp: number;           // Unix timestamp in milliseconds
  value: number;               // Data value (typically 0-100 range)
  category: string;            // Category identifier (e.g., 'A', 'B', 'C')
  metadata?: Record<string, any>; // Optional metadata object
}
```

**Usage Example:**
```typescript
const dataPoint: DataPoint = {
  timestamp: Date.now(),
  value: 75.5,
  category: 'A',
  metadata: {
    source: 'sensor-1',
    quality: 'high',
    confidence: 0.95
  }
};
```

### ChartConfig

```typescript
interface ChartConfig {
  id: string;                          // Unique identifier for the chart
  type: 'line' | 'bar' | 'scatter' | 'heatmap'; // Chart type
  dataKey: string;                     // Key for data access
  color: string;                       // CSS color string
  visible: boolean;                    // Whether chart is visible
  aggregation?: '1min' | '5min' | '1hour'; // Data aggregation interval
}
```

### PerformanceMetrics

```typescript
interface PerformanceMetrics {
  fps: number;                    // Current frames per second
  memoryUsage: number;            // Memory usage in MB
  renderTime: number;             // Render time in milliseconds
  dataProcessingTime: number;     // Data processing time in ms
  interactionLatency: number;     // User interaction response time
}
```

### FilterConfig

```typescript
interface FilterConfig {
  categories?: string[];    // Array of category names to include
  category?: string;        // Single category filter (alternative to categories)
  valueRange?: [number, number]; // Min/max value range [min, max]
  minValue?: number;        // Minimum value filter
  maxValue?: number;        // Maximum value filter
  timeRange?: TimeRange;    // Time range filter
}
```

### TimeRange

```typescript
interface TimeRange {
  start: number;   // Start timestamp in milliseconds
  end: number;     // End timestamp in milliseconds
}
```

---

## Components

### Dashboard

Main dashboard container component that orchestrates the entire application.

```typescript
interface DashboardProps {
  className?: string;  // Additional CSS classes
}

const Dashboard: React.FC<DashboardProps> = ({ className = '' })
```

**Features:**
- View mode switching (charts/table/split)
- Fullscreen toggle
- Keyboard shortcuts
- Performance monitoring integration
- Responsive layout

**Usage:**
```typescript
import { Dashboard } from '@/components/Dashboard';

function App() {
  return <Dashboard className="custom-dashboard" />;
}
```

### BaseChart

Core chart component that handles rendering with Canvas/WebGL.

```typescript
interface BaseChartProps {
  width: number;                    // Canvas width in pixels
  height: number;                   // Canvas height in pixels
  config: ChartConfig;              // Chart configuration
  onHover?: (point: DataPoint | null, event: MouseEvent) => void;
  zoomPanState?: ZoomPanState;      // Zoom and pan state
}

const BaseChart: React.FC<BaseChartProps> = ({ width, height, config, onHover, zoomPanState })
```

**Features:**
- Canvas and WebGPU rendering
- Level of detail (LOD) system
- Hover interaction handling
- Memory management integration
- Performance monitoring

**Usage:**
```typescript
<BaseChart
  width={800}
  height={400}
  config={chartConfig}
  onHover={(point, event) => console.log('Hovered:', point)}
  zoomPanState={{ zoom: 1, panX: 0, panY: 0, isDragging: false }}
/>
```

### LineChart

Specialized line chart component with accessibility features.

```typescript
interface LineChartProps {
  config: ChartConfig;
  width: number;
  height: number;
  enableZoomPan?: boolean;           // Enable zoom/pan controls
  enableTooltips?: boolean;          // Enable tooltips
  enableAccessibility?: boolean;     // Enable accessibility features
  enableKeyboardShortcuts?: boolean; // Enable keyboard shortcuts
}

const LineChart: React.FC<LineChartProps>
```

### BarChart

Bar chart visualization component.

```typescript
interface BarChartProps {
  config: ChartConfig;
  width: number;
  height: number;
  enableZoomPan?: boolean;
  enableTooltips?: boolean;
  enableAccessibility?: boolean;
  orientation?: 'vertical' | 'horizontal'; // Bar orientation
}

const BarChart: React.FC<BarChartProps>
```

### ScatterChart

Scatter plot visualization component.

```typescript
interface ScatterChartProps {
  config: ChartConfig;
  width: number;
  height: number;
  pointSize?: number;                // Size of scatter points
  enableClustering?: boolean;        // Enable point clustering
  colorBy?: 'category' | 'value' | 'density'; // Color scheme
}

const ScatterChart: React.FC<ScatterChartProps>
```

### HeatmapChart

Heatmap matrix visualization component.

```typescript
interface HeatmapChartProps {
  config: ChartConfig;
  width: number;
  height: number;
  colorScheme?: 'blues' | 'reds' | 'viridis' | 'custom'; // Color scheme
  valueRange?: [number, number];    // Color scale range
  enableClustering?: boolean;       // Enable value clustering
}

const HeatmapChart: React.FC<HeatmapChartProps>
```

### ChartGrid

Grid layout component for multiple charts.

```typescript
interface ChartGridProps {
  charts: ChartConfig[];             // Array of chart configurations
  layout?: 'grid' | 'masonry' | 'tabs'; // Layout style
  columns?: number;                  // Number of columns (for grid layout)
  gap?: number;                      // Gap between charts in pixels
}

const ChartGrid: React.FC<ChartGridProps>
```

### ControlPanel

User control interface for chart configuration.

```typescript
interface ControlPanelProps {
  onFilterChange: (filters: FilterConfig) => void;
  onTimeRangeChange: (timeRange: TimeRange) => void;
  onAggregationChange: (aggregation: ChartConfig['aggregation']) => void;
  availableCategories: string[];
}

const ControlPanel: React.FC<ControlPanelProps>
```

### DataTable

Tabular data view with virtual scrolling.

```typescript
interface DataTableProps {
  data: DataPoint[];                 // Data to display
  columns?: TableColumn[];           // Column definitions
  enableVirtualization?: boolean;    // Enable virtual scrolling
  enableSorting?: boolean;           // Enable column sorting
  pageSize?: number;                 // Rows per page
  height?: number;                   // Table height
}

interface TableColumn {
  key: string;                       // Data key
  title: string;                     // Column title
  width?: number;                    // Column width
  sortable?: boolean;                // Enable sorting
  render?: (value: any, row: DataPoint) => React.ReactNode; // Custom renderer
}

const DataTable: React.FC<DataTableProps>
```

### PerformanceMonitor

Real-time performance metrics display.

```typescript
interface PerformanceMonitorProps {
  showFPS?: boolean;                 // Show FPS counter
  showMemory?: boolean;              // Show memory usage
  showRenderTime?: boolean;          // Show render time
  showGPU?: boolean;                 // Show GPU metrics
  updateInterval?: number;           // Update frequency in ms
  position?: 'top' | 'bottom' | 'overlay'; // Display position
}

const PerformanceMonitor: React.FC<PerformanceMonitorProps>
```

---

## Hooks

### usePerformanceMonitor

Hook for monitoring real-time performance metrics.

```typescript
function usePerformanceMonitor(webgpuIntegration?: WebGPUIntegration): {
  metrics: ExtendedPerformanceMetrics;
  measureRenderTime: (name: string, fn: () => void) => void;
  measureInteractionLatency: (startTime: number) => void;
  startInteractionMeasurement: () => number;
}

interface ExtendedPerformanceMetrics extends PerformanceMetrics {
  gpuMemoryUsage: number;
  computeTime: number;
  renderTimeGPU: number;
  webgpuEnabled: boolean;
  rendererType: 'webgpu' | 'canvas';
}
```

**Usage:**
```typescript
const { metrics, measureRenderTime } = usePerformanceMonitor();

// Measure a custom operation
measureRenderTime('chart-render', () => {
  renderChart();
});

console.log(`Current FPS: ${metrics.fps}`);
```

### useMemoryManagement

Hook for component-level memory management and leak detection.

```typescript
function useMemoryManagement(
  componentName: string,
  options?: {
    registerLeakDetection?: boolean;
    enableMonitoring?: boolean;
    enableCleanup?: boolean;
    enableObjectPooling?: boolean;
    cacheComputations?: boolean;
    cacheData?: boolean;
  }
): {
  updateMemoryAccess: () => void;
  getMemoryStats: () => MemoryStats;
  acquireCanvasContext: () => CanvasRenderingContext2D | null;
  releaseCanvasContext: (context: CanvasRenderingContext2D) => void;
  processDataToBuffer: (data: DataPoint[]) => Float32Array | null;
}

interface MemoryStats {
  leakDetection: {
    orphanedObjects: number;
    totalObjects: number;
    memoryLeaks: LeakReport[];
  };
  pools: {
    canvas: {
      active: number;
      total: number;
    };
    array: {
      active: number;
      total: number;
    };
  };
  caches: {
    computation: {
      hitRate: number;
      size: number;
    };
    data: {
      hitRate: number;
      size: number;
    };
  };
}
```

**Usage:**
```typescript
const memory = useMemoryManagement('ChartComponent', {
  registerLeakDetection: true,
  enableObjectPooling: true,
  cacheComputations: true
});

// Later in component
memory.updateMemoryAccess();
const stats = memory.getMemoryStats();
```

### useData

Hook for accessing dashboard data context.

```typescript
function useData(): {
  data: DataPoint[];
  isLoading: boolean;
  error?: string;
  filters: FilterConfig;
  updateFilters: (filters: FilterConfig) => void;
  addDataPoint: (point: DataPoint) => void;
  getDataInRange: (start: number, end: number) => DataPoint[];
  getStats: () => {
    count: number;
    minValue: number;
    maxValue: number;
    avgValue: number;
    categories: string[];
  };
}
```

**Usage:**
```typescript
const { data, filters, updateFilters, getStats } = useData();

const stats = getStats();
console.log(`Total points: ${stats.count}, Avg value: ${stats.avgValue}`);
```

### useKeyboardShortcuts

Hook for managing keyboard shortcuts.

```typescript
interface ShortcutConfig {
  key: string;                       // Keyboard key
  ctrl?: boolean;                    // Ctrl key modifier
  shift?: boolean;                   // Shift key modifier
  alt?: boolean;                     // Alt key modifier
  meta?: boolean;                    // Meta key modifier
  action: () => void;                // Action to execute
  description: string;               // Shortcut description
  category?: string;                 // Shortcut category for grouping
}

function useKeyboardShortcuts(shortcuts: ShortcutConfig[]): {
  shortcuts: ShortcutConfig[];
  enableShortcuts: () => void;
  disableShortcuts: () => void;
  getShortcutHelp: () => Record<string, ShortcutConfig[]>;
}
```

**Usage:**
```typescript
useKeyboardShortcuts([
  {
    key: 'f',
    ctrl: true,
    action: () => setFullscreen(!isFullscreen),
    description: 'Toggle fullscreen'
  },
  {
    key: '1',
    action: () => setViewMode('charts'),
    description: 'Switch to charts view'
  }
]);
```

### useWebGPUMonitor

Hook for monitoring WebGPU-specific metrics.

```typescript
function useWebGPUMonitor(webgpuIntegration?: WebGPUIntegration): {
  supported: boolean;
  initialized: boolean;
  memoryUsage: number;
  computeTime: number;
  renderTime: number;
  bufferCount: number;
  shaderCompilationTime: number;
  memoryStats: MemoryStats;
}
```

---

## Libraries & Utilities

### DataGenerator

Realistic time-series data generation utility.

```typescript
class DataGenerator {
  constructor(updateInterval?: number); // Update interval in milliseconds (default: 100)
  
  startStreaming(callback: (data: DataPoint[]) => void): void;
  stopStreaming(): void;
  getBufferedData(): DataPoint[];
  getDataInRange(startTime: number, endTime: number): DataPoint[];
  setUpdateInterval(interval: number): void;
  getStats(): {
    totalPoints: number;
    timeSpan: number;
    avgValue: number;
    categories: string[];
  };
}
```

**Usage:**
```typescript
const generator = new DataGenerator(100); // 100ms updates

generator.startStreaming((newData) => {
  console.log('New data:', newData);
});

// Get historical data
const historicalData = generator.getDataInRange(
  Date.now() - 3600000, // 1 hour ago
  Date.now()             // now
);
```

### CanvasRenderer

Canvas-based chart rendering utility.

```typescript
class CanvasRenderer {
  constructor(canvas: HTMLCanvasElement);
  
  clear(): void;
  renderLine(data: DataPoint[], config: ChartConfig): void;
  renderBar(data: DataPoint[], config: ChartConfig): void;
  renderScatter(data: DataPoint[], config: ChartConfig): void;
  renderHeatmap(data: DataPoint[], config: ChartConfig): void;
  setCanvasSize(width: number, height: number): void;
  getContext(): CanvasRenderingContext2D | null;
}
```

### WebGPUIntegration

WebGPU-based high-performance rendering.

```typescript
class WebGPUIntegration {
  constructor(canvas: HTMLCanvasElement);
  
  initialize(): Promise<void>;
  isWebGPUSupported(): boolean;
  renderChart(data: DataPoint[], config: ChartConfig): Promise<void>;
  processData(
    operation: 'filter' | 'aggregate' | 'movingAverage',
    data: DataPoint[],
    params: any
  ): Promise<DataPoint[]>;
  getPerformanceMetrics(): WebGPUMetrics;
  destroy(): void;
}

interface WebGPUMetrics {
  gpuSupported: boolean;
  memoryStats?: {
    totalPooledSize: number;
    pooledBuffers: number;
  };
  computeMetrics?: {
    computeTime: number;
  };
  rendererMetrics?: {
    gpuMemoryUsage: number;
  };
}
```

### PerformanceBenchmarkingSuite

Automated performance testing and benchmarking.

```typescript
class PerformanceBenchmarkingSuite {
  constructor(webgpuIntegration?: WebGPUIntegration);
  
  runBenchmark(
    config: BenchmarkConfig,
    renderCallback: (data: DataPoint[], renderer: 'canvas' | 'webgpu') => Promise<void>,
    dataGenerator: (count: number) => DataPoint[]
  ): Promise<BenchmarkResult>;
  
  getResults(): BenchmarkResult[];
  getLatestResult(): BenchmarkResult | null;
  clearResults(): void;
  exportResults(): string;
}

interface BenchmarkConfig {
  name: string;
  description: string;
  dataPoints: number[];
  duration: number; // seconds
  iterations: number;
  warmupIterations: number;
  rendererType: 'canvas' | 'webgpu' | 'both';
  metrics: ('fps' | 'memory' | 'renderTime' | 'dataProcessing' | 'gpu')[];
}
```

### MemoryManager

Advanced memory management and leak detection.

```typescript
class MemoryManager {
  registerObject(obj: object, type: string, size: number): void;
  trackAllocation(size: number): void;
  trackDeallocation(size: number): void;
  detectLeaks(): LeakReport[];
  getMemoryStats(): MemoryStats;
  cleanup(): void;
}

interface LeakReport {
  id: string;
  type: string;
  age?: number;
  count?: number;
}
```

---

## Configuration

### Performance Configuration

```typescript
const PERFORMANCE_CONFIG = {
  targetFPS: 60,                    // Target frame rate
  maxDataPoints: 100000,            // Maximum data points to handle
  enableWebGPU: true,               // Enable WebGPU acceleration
  memoryThreshold: 100,             // Memory threshold in MB
  updateInterval: 100,              // Data update interval in ms
  lodThresholds: {                  // Level of detail thresholds
    high: 0.8,
    medium: 0.4,
    low: 0.1
  },
  canvasOptimization: {
    enableDirtyRegions: true,       // Enable dirty region rendering
    batchOperations: true,          // Batch canvas operations
    objectPooling: true            // Enable object pooling
  }
};
```

### Chart Configuration Defaults

```typescript
const CHART_DEFAULTS = {
  line: {
    strokeWidth: 2,
    showPoints: false,
    tension: 0.1,                   // Line tension (0-1)
    interpolation: 'linear'
  },
  bar: {
    barWidth: 8,
    padding: 2,
    maxBarHeight: 100
  },
  scatter: {
    pointSize: 4,
    opacity: 0.7,
    maxPoints: 10000
  },
  heatmap: {
    colorScheme: 'blues',
    cellSize: 10,
    showColorbar: true
  }
};
```

### Theme Configuration

```typescript
const THEME_CONFIG = {
  light: {
    background: '#ffffff',
    text: '#1a1a1a',
    grid: '#e5e5e5',
    axis: '#666666',
    colors: ['#3b82f6', '#ef4444', '#10b981', '#f59e0b']
  },
  dark: {
    background: '#1a1a1a',
    text: '#ffffff',
    grid: '#333333',
    axis: '#999999',
    colors: ['#60a5fa', '#f87171', '#34d399', '#fbbf24']
  }
};
```

---

## Events & Callbacks

### Chart Events

```typescript
// Base chart events
interface ChartEvents {
  onHover?: (point: DataPoint | null, event: MouseEvent) => void;
  onClick?: (point: DataPoint | null, event: MouseEvent) => void;
  onZoom?: (zoomLevel: number, center: { x: number; y: number }) => void;
  onPan?: (deltaX: number, deltaY: number) => void;
  onRender?: (renderTime: number, fps: number) => void;
  onError?: (error: Error) => void;
}

// Dashboard events
interface DashboardEvents {
  onViewModeChange?: (mode: 'charts' | 'table' | 'split') => void;
  onFilterChange?: (filters: FilterConfig) => void;
  onTimeRangeChange?: (timeRange: TimeRange) => void;
  onFullscreenToggle?: (isFullscreen: boolean) => void;
}
```

### Performance Events

```typescript
// Performance monitoring events
interface PerformanceEvents {
  onFPSDrop?: (fps: number, threshold: number) => void;
  onMemoryLeak?: (report: LeakReport) => void;
  onRenderSlow?: (renderTime: number, threshold: number) => void;
  onGPUError?: (error: Error) => void;
}
```

### Custom Event Handlers

```typescript
// Example: Custom event handler implementation
function useCustomEvents() {
  const handleHover = useCallback((point: DataPoint | null, event: MouseEvent) => {
    if (point) {
      console.log(`Hovered point: ${point.value} at ${point.timestamp}`);
      // Custom analytics tracking
      analytics.track('chart_hover', {
        value: point.value,
        category: point.category,
        x: event.clientX,
        y: event.clientY
      });
    }
  }, []);

  const handleZoom = useCallback((zoom: number, center: { x: number; y: number }) => {
    // Custom zoom analytics
    analytics.track('chart_zoom', { zoom, centerX: center.x, centerY: center.y });
    
    // Adjust data resolution based on zoom
    if (zoom < 0.5) {
      setDataResolution('low');
    } else if (zoom > 2) {
      setDataResolution('high');
    }
  }, []);

  return { handleHover, handleZoom };
}
```

---

## Error Handling

### Error Types

```typescript
// Custom error types for better error handling
class PerformanceError extends Error {
  constructor(
    message: string,
    public code: string,
    public severity: 'warning' | 'error' | 'critical'
  ) {
    super(message);
    this.name = 'PerformanceError';
  }
}

class MemoryError extends Error {
  constructor(
    message: string,
    public leakReport?: LeakReport,
    public recoveryAction?: () => void
  ) {
    super(message);
    this.name = 'MemoryError';
  }
}

class RenderingError extends Error {
  constructor(
    message: string,
    public rendererType: 'canvas' | 'webgpu',
    public fallback?: string
  ) {
    super(message);
    this.name = 'RenderingError';
  }
}
```

### Error Boundaries

```typescript
// React Error Boundary for chart components
class ChartErrorBoundary extends React.Component {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to monitoring service
    console.error('Chart error:', error, errorInfo);
    
    // Attempt recovery
    this.props.onError?.(error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="chart-error">
          <h3>Chart Error</h3>
          <p>{this.state.error?.message}</p>
          <button onClick={() => this.setState({ hasError: false, error: null })}>
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### Recovery Strategies

```typescript
// Automatic fallback and recovery mechanisms
class RecoveryManager {
  private strategies: Map<string, () => void> = new Map();

  registerStrategy(errorType: string, strategy: () => void) {
    this.strategies.set(errorType, strategy);
  }

  async recover(error: Error): Promise<boolean> {
    const strategy = this.strategies.get(error.constructor.name);
    
    if (strategy) {
      try {
        await strategy();
        return true;
      } catch (recoveryError) {
        console.error('Recovery failed:', recoveryError);
        return false;
      }
    }
    
    return false;
  }
}

// Example usage
const recoveryManager = new RecoveryManager();

recoveryManager.registerStrategy('WebGPUNotSupportedError', () => {
  // Fallback to Canvas rendering
  setRendererType('canvas');
  console.log('Fell back to Canvas rendering due to WebGPU unavailability');
});

recoveryManager.registerStrategy('MemoryError', () => {
  // Clear caches and reduce data points
  clearMemoryCaches();
  setMaxDataPoints(5000);
  console.log('Reduced data points due to memory constraints');
});
```

---

This API reference provides comprehensive documentation for all public interfaces and components in the dashboard. For additional details on specific implementations, refer to the inline code documentation or the [Development Guide](DEVELOPMENT.md).