'use client';

import React, { useRef, useEffect, useMemo, useCallback, memo } from 'react';
import { DataPoint, ChartBounds, ViewportSize, PerformanceMetrics } from '@/lib/types';
import {
  clearCanvas,
  drawGrid,
  drawAxes,
  mapDataToCanvas,
  drawScatterPoints
} from '@/lib/canvasUtils';
import { calculateChartBounds } from '@/lib/dataGenerator';
import { cn } from '@/lib/utils';

interface ScatterPlotProps {
  data: DataPoint[];
  width: number;
  height: number;
  color?: string;
  pointSize?: number;
  opacity?: number;
  showGrid?: boolean;
  showAxes?: boolean;
  onPerformanceUpdate?: (metrics: PerformanceMetrics) => void;
  animated?: boolean;
}

const ScatterPlotComponent = ({
  data,
  width,
  height,
  color = '#f59e0b',
  pointSize = 4,
  opacity = 0.8,
  showGrid = true,
  showAxes = true,
  onPerformanceUpdate,
  animated = true
}: ScatterPlotProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  
  const viewport: ViewportSize = useMemo(() => ({ width, height }), [width, height]);
  
  const chartBounds = useMemo(() => {
    if (data.length === 0) return { minX: 0, maxX: 100, minY: 0, maxY: 100 };
    return calculateChartBounds(data);
  }, [data]);
  
  const mappedPoints = useMemo(() => {
    if (data.length === 0) return [];
    return data.map(point => {
      const mapped = mapDataToCanvas(point, chartBounds, viewport);
      const size = point.metadata?.size || pointSize;
      return { ...mapped, size };
    });
  }, [data, chartBounds, viewport, pointSize]);
  
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;
    
    const startTime = performance.now();
    
    clearCanvas(ctx, viewport);
    
    if (showGrid) {
      drawGrid(ctx, chartBounds, viewport);
    }
    
    if (showAxes) {
      drawAxes(ctx, chartBounds, viewport);
    }
    
    if (mappedPoints.length > 0) {
      drawScatterPoints(ctx, mappedPoints, { color, pointSize, opacity });
    }
    
    const endTime = performance.now();
    const renderTime = endTime - startTime;
    
    if (onPerformanceUpdate) {
      onPerformanceUpdate({
        fps: 60,
        memoryUsage: (performance as any).memory?.usedJSHeapSize / 1024 / 1024 || 0,
        renderTime,
        dataProcessingTime: 0,
        dataPointsCount: data.length
      });
    }
  }, [viewport, chartBounds, mappedPoints, showGrid, showAxes, color, pointSize, opacity, onPerformanceUpdate, data.length]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    canvas.width = width;
    canvas.height = height;
    
    const ctx = canvas.getContext('2d', { alpha: false });
    if (ctx) {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.scale(dpr, dpr);
    }
    
    render();
  }, [width, height, render]);
  
  useEffect(() => {
    render();
  }, [data, render]);
  
  useEffect(() => {
    if (!animated) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      return;
    }
    
    const animate = () => {
      render();
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [animated, render]);
  
  return (
    <div className="relative inline-block" style={{ width, height }}>
      <canvas
        ref={canvasRef}
        className={cn(
          "border border-gray-200 rounded-lg transition-opacity duration-300",
          data.length === 0 ? "opacity-0" : "opacity-100"
        )}
        style={{ width, height }}
      />
      <div
        className={cn(
          "absolute inset-0 flex items-center justify-center transition-opacity duration-300",
          data.length === 0 ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      >
        <p className="text-gray-500 text-sm">No data available</p>
      </div>
    </div>
  );
};

const ScatterPlot = memo(ScatterPlotComponent);
ScatterPlot.displayName = 'ScatterPlot';

export default ScatterPlot;