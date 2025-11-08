import { DataPoint, LODLevel, StatisticalSummary, AggregatedBucket, ChartConfig } from '@/types/dashboard';
import { CanvasRenderer } from './canvasUtils';

export class EnhancedLOD {
  private levels: LODLevel[] = [
    { threshold: 0.1, strategy: 'pixel' },
    { threshold: 0.5, strategy: 'statistical' },
    { threshold: 2.0, strategy: 'aggregated' },
    { threshold: 10.0, strategy: 'detailed' }
  ];

  private currentLevel = 3;

  setZoomLevel(zoom: number): void {
    this.currentLevel = this.levels.findIndex(level => zoom <= level.threshold);
    if (this.currentLevel === -1) this.currentLevel = this.levels.length - 1;
  }

  render(data: DataPoint[], renderer: CanvasRenderer, config: ChartConfig, width: number, height: number): void {
    const strategy = this.levels[this.currentLevel].strategy;

    switch (strategy) {
      case 'pixel':
        this.renderPixelLevel(data, renderer, width, height);
        break;
      case 'statistical':
        this.renderStatisticalLevel(data, renderer, width, height);
        break;
      case 'aggregated':
        this.renderAggregatedLevel(data, renderer, width, height);
        break;
      case 'detailed':
        this.renderDetailedLevel(data, renderer, config, width, height);
        break;
    }
  }

  private renderPixelLevel(data: DataPoint[], renderer: CanvasRenderer, width: number, height: number): void {
    // Single pixel per data point for extreme zoom out
    const imageData = new ImageData(Math.min(data.length, width), 1);
    const maxValue = Math.max(...data.map(p => p.value));
    const minValue = Math.min(...data.map(p => p.value));

    data.forEach((point, i) => {
      if (i >= width) return; // Limit to canvas width
      const intensity = Math.floor(((point.value - minValue) / (maxValue - minValue)) * 255);
      imageData.data[i * 4] = intensity;     // R
      imageData.data[i * 4 + 1] = intensity; // G
      imageData.data[i * 4 + 2] = intensity; // B
      imageData.data[i * 4 + 3] = 255;       // A
    });

    // Render as 1px high image scaled to full height
    renderer.getContext().putImageData(imageData, 0, height / 2);
  }

  private renderStatisticalLevel(data: DataPoint[], renderer: CanvasRenderer, width: number, height: number): void {
    // Render box plots or statistical summaries
    const stats = this.calculateStats(data);
    this.drawBoxPlot(renderer, stats, 0, 0, width, height);
  }

  private renderAggregatedLevel(data: DataPoint[], renderer: CanvasRenderer, width: number, height: number): void {
    // Render aggregated bars
    const buckets = this.aggregateByTime(data, 1000); // 1 second buckets
    const bucketWidth = width / buckets.length;

    buckets.forEach((bucket, i) => {
      const x = i * bucketWidth;
      const barHeight = (bucket.avg / 100) * height;
      const y = height - barHeight;

      renderer.drawRect(x, y, bucketWidth - 1, barHeight, '#4A90E2');
    });
  }

  private renderDetailedLevel(data: DataPoint[], renderer: CanvasRenderer, config: ChartConfig, width: number, height: number): void {
    // Full detailed rendering based on chart type
    switch (config.type) {
      case 'line':
        this.renderLineChart(data, renderer, config, width, height);
        break;
      case 'bar':
        this.renderBarChart(data, renderer, config, width, height);
        break;
      case 'scatter':
        this.renderScatterChart(data, renderer, config, width, height);
        break;
      case 'heatmap':
        this.renderHeatmapChart(data, renderer, config, width, height);
        break;
    }
  }

  private renderLineChart(data: DataPoint[], renderer: CanvasRenderer, config: ChartConfig, width: number, height: number): void {
    const maxValue = Math.max(...data.map(p => p.value));
    const minValue = Math.min(...data.map(p => p.value));
    const timeRange = Math.max(...data.map(p => p.timestamp)) - Math.min(...data.map(p => p.timestamp));

    const points = data.map((point) => ({
      x: ((point.timestamp - Math.min(...data.map(p => p.timestamp))) / timeRange) * width,
      y: height - ((point.value - minValue) / (maxValue - minValue)) * height
    }));

    renderer.drawLine(points, config.color);
  }

  private renderBarChart(data: DataPoint[], renderer: CanvasRenderer, config: ChartConfig, width: number, height: number): void {
    const maxValue = Math.max(...data.map(p => p.value));
    const barWidth = width / data.length;

    data.forEach((point, index) => {
      const barHeight = (point.value / maxValue) * height;
      const x = index * barWidth;
      const y = height - barHeight;

      renderer.drawRect(x, y, barWidth - 1, barHeight, config.color);
    });
  }

  private renderScatterChart(data: DataPoint[], renderer: CanvasRenderer, config: ChartConfig, width: number, height: number): void {
    const maxValue = Math.max(...data.map(p => p.value));
    const minValue = Math.min(...data.map(p => p.value));
    const timeRange = Math.max(...data.map(p => p.timestamp)) - Math.min(...data.map(p => p.timestamp));

    const points = data.map(point => ({
      x: ((point.timestamp - Math.min(...data.map(p => p.timestamp))) / timeRange) * width,
      y: height - ((point.value - minValue) / (maxValue - minValue)) * height
    }));

    renderer.drawPoints(points, config.color, 3);
  }

  private renderHeatmapChart(data: DataPoint[], renderer: CanvasRenderer, config: ChartConfig, width: number, height: number): void {
    if (!data.length) return;
    
    const maxValue = Math.max(...data.map(p => p.value));
    const minValue = Math.min(...data.map(p => p.value));
    const valueRange = maxValue - minValue;
    
    // Use config properties for heatmap styling
    const isVisible = config.visible;
    
    // Early return if chart is not visible
    if (!isVisible) return;
    
    const colorScale = (value: number): string => {
      const normalized = valueRange > 0 ? (value - minValue) / valueRange : 0.5; // Default to middle color if no range
      const adjustedNormalized = Math.min(Math.max(normalized, 0), 1); // Ensure range [0, 1]
      const hue = (1 - adjustedNormalized) * 240; // Blue to red
      // Use base color as saturation and lightness modifier
      return `hsl(${hue}, 70%, 50%)`;
    };

    renderer.drawHeatmap(data, width, height, colorScale);
  }

  private calculateStats(data: DataPoint[]): StatisticalSummary {
    const values = data.map(p => p.value);
    return {
      min: Math.min(...values),
      max: Math.max(...values),
      median: this.median(values),
      q1: this.quantile(values, 0.25),
      q3: this.quantile(values, 0.75)
    };
  }

  private drawBoxPlot(renderer: CanvasRenderer, stats: StatisticalSummary, x: number, y: number, width: number, height: number): void {
    const centerX = x + width / 2;
    const scaleY = (value: number) => y + height - ((value - stats.min) / (stats.max - stats.min)) * height;

    // Box
    renderer.drawRect(centerX - 20, scaleY(stats.q3), 40, scaleY(stats.q1) - scaleY(stats.q3), '#4A90E2', false);

    // Median line
    renderer.getContext().beginPath();
    renderer.getContext().moveTo(centerX - 20, scaleY(stats.median));
    renderer.getContext().lineTo(centerX + 20, scaleY(stats.median));
    renderer.getContext().stroke();

    // Whiskers
    renderer.getContext().beginPath();
    renderer.getContext().moveTo(centerX, scaleY(stats.q3));
    renderer.getContext().lineTo(centerX, scaleY(stats.max));
    renderer.getContext().moveTo(centerX, scaleY(stats.q1));
    renderer.getContext().lineTo(centerX, scaleY(stats.min));
    renderer.getContext().stroke();
  }

  private aggregateByTime(data: DataPoint[], interval: number): AggregatedBucket[] {
    const buckets = new Map<number, number[]>();

    data.forEach(point => {
      const bucket = Math.floor(point.timestamp / interval);
      if (!buckets.has(bucket)) buckets.set(bucket, []);
      buckets.get(bucket)!.push(point.value);
    });

    return Array.from(buckets.entries()).map(([timestamp, values]) => ({
      timestamp: timestamp * interval,
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      count: values.length
    }));
  }

  private median(values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  private quantile(values: number[], p: number): number {
    const sorted = [...values].sort((a, b) => a - b);
    const index = (sorted.length - 1) * p;
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index % 1;

    if (upper >= sorted.length) return sorted[sorted.length - 1];
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  }

  getCurrentLevel(): LODLevel {
    return this.levels[this.currentLevel];
  }

  getAllLevels(): LODLevel[] {
    return this.levels;
  }
}