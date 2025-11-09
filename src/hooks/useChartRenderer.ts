'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { DataPoint, ViewportSize, ChartBounds } from '@/lib/types';
import { calculateChartBounds } from '@/lib/dataGenerator';

interface UseChartRendererOptions {
  width: number;
  height: number;
  data: DataPoint[];
  maxDataPoints?: number;
  enableVirtualization?: boolean;
}

interface UseChartRendererReturn {
  viewport: ViewportSize;
  bounds: ChartBounds;
  visibleData: DataPoint[];
  isLoading: boolean;
  error: string | null;
  updateSize: (width: number, height: number) => void;
  refreshBounds: () => void;
}

export function useChartRenderer({
  width,
  height,
  data,
  maxDataPoints = 10000,
  enableVirtualization = true
}: UseChartRendererOptions): UseChartRendererReturn {
  const [viewport, setViewport] = useState<ViewportSize>({ width, height });
  const [bounds, setBounds] = useState<ChartBounds>({ minX: 0, maxX: 100, minY: 0, maxY: 100 });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Update viewport when dimensions change
  const updateSize = useCallback((newWidth: number, newHeight: number) => {
    setViewport({ width: newWidth, height: newHeight });
  }, []);
  
  // Calculate chart bounds
  const refreshBounds = useCallback(() => {
    try {
      setIsLoading(true);
      setError(null);
      
      const newBounds = calculateChartBounds(data);
      setBounds(newBounds);
    } catch (err) {
      console.error('Error calculating chart bounds:', err);
      setError('Failed to calculate chart bounds');
    } finally {
      setIsLoading(false);
    }
  }, [data]);
  
  // Virtualize data if needed
  const visibleData = useMemo(() => {
    if (!enableVirtualization || data.length <= maxDataPoints) {
      return data;
    }
    
    // Simple sampling for large datasets
    const step = Math.ceil(data.length / maxDataPoints);
    const sampled: DataPoint[] = [];
    
    for (let i = 0; i < data.length; i += step) {
      sampled.push(data[i]);
    }
    
    return sampled;
  }, [data, enableVirtualization, maxDataPoints]);
  
  // Update viewport when props change
  useEffect(() => {
    setViewport({ width, height });
  }, [width, height]);
  
  // Recalculate bounds when data changes
  useEffect(() => {
    refreshBounds();
  }, [data, refreshBounds]);
  
  return {
    viewport,
    bounds,
    visibleData,
    isLoading,
    error,
    updateSize,
    refreshBounds
  };
}