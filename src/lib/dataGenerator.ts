import { DataPoint, ChartBounds, ViewportSize, AggregationLevel, HeatmapData } from './types';

export function generateTimeSeriesData(
  count: number,
  startTime: number = Date.now() - count * 100,
  interval: number = 100
): DataPoint[] {
  const data: DataPoint[] = [];
  let value = Math.random() * 100;
  
  for (let i = 0; i < count; i++) {
    const timestamp = startTime + i * interval;
    // Simulate realistic data with trends and noise
    const trend = Math.sin(i * 0.01) * 20;
    const noise = (Math.random() - 0.5) * 10;
    value = Math.max(0, Math.min(200, value + trend + noise));
    
    data.push({
      timestamp,
      value,
      category: `Category ${Math.floor(Math.random() * 5) + 1}`,
      metadata: {
        id: `point-${i}`,
        source: 'simulator',
        quality: Math.random() > 0.1 ? 'good' : 'poor'
      }
    });
  }
  
  return data;
}

export function generateScatterData(count: number): DataPoint[] {
  const data: DataPoint[] = [];
  
  for (let i = 0; i < count; i++) {
    data.push({
      timestamp: Date.now() + Math.random() * 10000,
      value: Math.random() * 200,
      category: `Cluster ${Math.floor(Math.random() * 4) + 1}`,
      metadata: {
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 10 + 2
      }
    });
  }
  
  return data;
}

export function generateHeatmapData(
  width: number,
  height: number,
  resolution: number = 10
): HeatmapData[] {
  const data: HeatmapData[] = [];
  
  for (let x = 0; x < width; x += resolution) {
    for (let y = 0; y < height; y += resolution) {
      // Create interesting patterns
      const centerX = width / 2;
      const centerY = height / 2;
      const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
      const value = Math.max(0, 100 - distance * 0.5 + Math.random() * 20);
      
      data.push({
        x,
        y,
        value,
        label: `(${x}, ${y})`
      });
    }
  }
  
  return data;
}

export function calculateChartBounds(data: DataPoint[]): ChartBounds {
  if (data.length === 0) {
    return { minX: 0, maxX: 100, minY: 0, maxY: 100 };
  }
  
  let minX = data[0].timestamp;
  let maxX = data[0].timestamp;
  let minY = data[0].value;
  let maxY = data[0].value;
  
  for (const point of data) {
    minX = Math.min(minX, point.timestamp);
    maxX = Math.max(maxX, point.timestamp);
    minY = Math.min(minY, point.value);
    maxY = Math.max(maxY, point.value);
  }
  
  // Add padding
  const xPadding = (maxX - minX) * 0.05;
  const yPadding = (maxY - minY) * 0.05;
  
  return {
    minX: minX - xPadding,
    maxX: maxX + xPadding,
    minY: minY - yPadding,
    maxY: maxY + yPadding
  };
}

export function aggregateDataByTime(
  data: DataPoint[],
  aggregationLevel: AggregationLevel
): DataPoint[] {
  if (aggregationLevel.type === 'none' || !aggregationLevel.enabled) {
    return data;
  }
  
  const intervals = {
    '1min': 60 * 1000,
    '5min': 5 * 60 * 1000,
    '1hour': 60 * 60 * 1000
  };
  
  const intervalMs = intervals[aggregationLevel.type];
  const aggregated = new Map<number, DataPoint[]>();
  
  // Group data by time intervals
  for (const point of data) {
    const intervalStart = Math.floor(point.timestamp / intervalMs) * intervalMs;
    if (!aggregated.has(intervalStart)) {
      aggregated.set(intervalStart, []);
    }
    aggregated.get(intervalStart)!.push(point);
  }
  
  // Create aggregated points
  const result: DataPoint[] = [];
  for (const [timestamp, points] of aggregated) {
    const avgValue = points.reduce((sum, p) => sum + p.value, 0) / points.length;
    const category = points[0].category; // Use first category
    
    result.push({
      timestamp,
      value: avgValue,
      category,
      metadata: {
        originalCount: points.length,
        min: Math.min(...points.map(p => p.value)),
        max: Math.max(...points.map(p => p.value))
      }
    });
  }
  
  return result.sort((a, b) => a.timestamp - b.timestamp);
}

export function filterData(
  data: DataPoint[],
  categories: string[],
  valueRange: [number, number],
  timeRange: { start: number; end: number }
): DataPoint[] {
  return data.filter(point => {
    const categoryMatch = categories.length === 0 || categories.includes(point.category);
    const valueMatch = point.value >= valueRange[0] && point.value <= valueRange[1];
    const timeMatch = point.timestamp >= timeRange.start && point.timestamp <= timeRange.end;
    
    return categoryMatch && valueMatch && timeMatch;
  });
}

export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString();
}

export function formatValue(value: number, decimals: number = 2): string {
  return value.toFixed(decimals);
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}