'use client';

import React, { useRef, useEffect, useMemo, useCallback, memo } from 'react';
import { DataPoint, ChartBounds, ViewportSize, PerformanceMetrics } from '@/lib/types';
import {
  clearCanvas,
  drawGrid,
  drawAxes,
  mapDataToCanvas,
  drawLine
} from '@/lib/canvasUtils';
import { calculateChartBounds } from '@/lib/dataGenerator';
import { cn } from '@/lib/utils';

interface LineChartProps {
  data: DataPoint[];
  width: number;
  height: number;
  color?: string;
  lineWidth?: number;
  smooth?: boolean;
  showGrid?: boolean;
  showAxes?: boolean;
  onPerformanceUpdate?: (metrics: PerformanceMetrics) => void;
  animated?: boolean;
}

const LineChartComponent = ({
  data,
  width,
  height,
  color = '#3b82f6',
  lineWidth = 2,
  smooth = true,
  showGrid = true,
  showAxes = true,
  onPerformanceUpdate,
  animated = true
}: LineChartProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const lastRenderTimeRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);
  const renderCallbackRef = useRef<(() => void) | null>(null);

  const viewport: ViewportSize = useMemo(() => ({ width, height }), [width, height]);

  const chartBounds = useMemo(() => {
    if (data.length === 0) return { minX: 0, maxX: 100, minY: 0, maxY: 100 };
    return calculateChartBounds(data);
  }, [data.length]); // Only recalculate when data length changes

  const mappedPoints = useMemo(() => {
    if (data.length === 0) return [];
    return data.map(point => mapDataToCanvas(point, chartBounds, viewport));
  }, [data.length, chartBounds, viewport]); // Use data.length instead of full data array
  
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
      drawLine(ctx, mappedPoints, { color, lineWidth, smooth });
    }

    const endTime = performance.now();
    const renderTime = endTime - startTime;
    
    frameCountRef.current++;
    if (endTime - lastRenderTimeRef.current >= 1000) {
      const fps = (frameCountRef.current * 1000) / (endTime - lastRenderTimeRef.current);
      frameCountRef.current = 0;
      lastRenderTimeRef.current = endTime;
      
      if (onPerformanceUpdate) {
        onPerformanceUpdate({
          fps: Math.round(fps),
          memoryUsage: (performance as any).memory?.usedJSHeapSize / 1024 / 1024 || 0,
          renderTime,
          dataProcessingTime: 0,
          dataPointsCount: data.length
        });
      }
    }
  }, [viewport, chartBounds, showGrid, showAxes, color, lineWidth, smooth, data.length]);

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
    
    // Store render callback in ref for animation loop
    renderCallbackRef.current = render;
    render();
  }, [width, height, render]);
  
  useEffect(() => {
    if (!animated) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }
    
    const animate = () => {
      // Use ref to avoid dependency on render function
      if (renderCallbackRef.current) {
        renderCallbackRef.current();
      }
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [animated]);

  // Separate effect for data changes
  useEffect(() => {
    if (!animated && renderCallbackRef.current) {
      renderCallbackRef.current();
    }
  }, [data.length, animated]);
  
  // Seamless transition between no-data and chart states
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

const LineChart = memo(LineChartComponent);
LineChart.displayName = 'LineChart';

export default LineChart;