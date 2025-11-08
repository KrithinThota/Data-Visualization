import { DataPoint } from '@/types/dashboard';

export class DataGenerator {
  private intervalId: NodeJS.Timeout | null = null;
  private listeners: Set<(data: DataPoint[]) => void> = new Set();
  private isRunning = false;
  private dataBuffer: DataPoint[] = [];
  private readonly bufferSize = 1000;

  constructor(private updateInterval = 100) {} // 100ms updates

  startStreaming(callback: (data: DataPoint[]) => void): void {
    console.log('🚀 DataGenerator: Starting streaming with callback');
    this.listeners.add(callback);
    if (!this.isRunning) {
      this.isRunning = true;
      this.startGeneration();
    }

    // Generate initial batch immediately if no data
    if (this.dataBuffer.length === 0) {
      const initialBatch = this.generateBatch();
      this.dataBuffer.push(...initialBatch);
      console.log('📊 DataGenerator: Generated initial batch of', initialBatch.length, 'points');
      this.listeners.forEach(listener => {
        console.log('📡 DataGenerator: Notifying listener with initial batch');
        listener(initialBatch);
      });
    }
  }

  stopStreaming(): void {
    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.listeners.clear();
    this.dataBuffer = [];
  }

  private startGeneration(): void {
    console.log('🔄 DataGenerator: Starting generation loop with', this.updateInterval, 'ms interval');
    this.intervalId = setInterval(() => {
      if (!this.isRunning) return;

      const newData = this.generateBatch();
      console.log('📈 DataGenerator: Generated real-time batch of', newData.length, 'points');
      this.dataBuffer.push(...newData);

      // Keep buffer at reasonable size
      if (this.dataBuffer.length > this.bufferSize) {
        this.dataBuffer = this.dataBuffer.slice(-this.bufferSize);
      }

      // Notify all listeners
      console.log('📡 DataGenerator: Broadcasting to', this.listeners.size, 'listeners');
      this.listeners.forEach(listener => listener(newData));
    }, this.updateInterval);
  }

  private generateBatch(): DataPoint[] {
    const batch: DataPoint[] = [];
    const now = Date.now();
    const batchSize = 10;

    for (let i = 0; i < batchSize; i++) {
      // Generate realistic time-series data with patterns and noise
      const baseTime = now + (i * this.updateInterval);
      const trend = Math.sin(baseTime / 10000) * 20; // Long-term trend
      const seasonal = Math.cos(baseTime / 1000) * 10; // Seasonal pattern
      const noise = (Math.random() - 0.5) * 5; // Random noise
      const value = 50 + trend + seasonal + noise; // Base value + patterns

      // Ensure value stays within reasonable bounds
      const clampedValue = Math.max(0, Math.min(100, value));

      batch.push({
        timestamp: baseTime,
        value: clampedValue,
        category: this.getRandomCategory(),
        metadata: {
          source: 'realtime',
          quality: Math.random() > 0.1 ? 'high' : 'low', // 90% high quality
          batchId: Date.now()
        }
      });
    }

    return batch;
  }

  private getRandomCategory(): string {
    const categories = ['A', 'B', 'C', 'D'];
    return categories[Math.floor(Math.random() * categories.length)];
  }

  // Get current buffer for historical data access
  getBufferedData(): DataPoint[] {
    return [...this.dataBuffer];
  }

  // Public method to generate a batch (for initial data loading)
  generateInitialBatch(): DataPoint[] {
    return this.generateBatch();
  }

  // Get data within time range
  getDataInRange(startTime: number, endTime: number): DataPoint[] {
    return this.dataBuffer.filter(point =>
      point.timestamp >= startTime && point.timestamp <= endTime
    );
  }

  // Change update frequency
  setUpdateInterval(interval: number): void {
    this.updateInterval = Math.max(10, interval); // Minimum 10ms
    if (this.isRunning) {
      this.stopStreaming();
      this.startStreaming(() => {}); // Restart with new interval
    }
  }

  // Get current statistics
  getStats(): {
    totalPoints: number;
    timeSpan: number;
    avgValue: number;
    categories: string[];
  } {
    if (this.dataBuffer.length === 0) {
      return { totalPoints: 0, timeSpan: 0, avgValue: 0, categories: [] };
    }

    const values = this.dataBuffer.map(p => p.value);
    const timestamps = this.dataBuffer.map(p => p.timestamp);
    const categories = [...new Set(this.dataBuffer.map(p => p.category))];

    return {
      totalPoints: this.dataBuffer.length,
      timeSpan: Math.max(...timestamps) - Math.min(...timestamps),
      avgValue: values.reduce((a, b) => a + b, 0) / values.length,
      categories
    };
  }
}