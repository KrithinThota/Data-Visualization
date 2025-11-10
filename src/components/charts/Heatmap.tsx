'use client';

import React, { useRef, useEffect, useMemo, useCallback, memo } from 'react';
import { HeatmapData, ViewportSize, PerformanceMetrics } from '@/lib/types';
import { clearCanvas, drawHeatmap } from '@/lib/canvasUtils';
import { cn } from '@/lib/utils';

interface HeatmapProps {
  data: HeatmapData[];
  width: number;
  height: number;
  cellSize?: number;
  colorScale?: (value: number) => string;
  onPerformanceUpdate?: (metrics: PerformanceMetrics) => void;
  animated?: boolean;
}

const HeatmapComponent = ({
  data,
  width,
  height,
  cellSize = 10,
  colorScale,
  onPerformanceUpdate,
  animated = true
}: HeatmapProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const renderCallbackRef = useRef<(() => void) | null>(null);
  
  const viewport: ViewportSize = useMemo(() => ({ width, height }), [width, height]);
  
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;
    
    const startTime = performance.now();
    
    clearCanvas(ctx, viewport);
    
    if (data.length > 0) {
      drawHeatmap(ctx, data, viewport, { colorScale, cellSize });
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
  }, [viewport, colorScale, cellSize, data.length]);

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
    
    renderCallbackRef.current = render;
    render();
  }, [width, height, render]);
  
  useEffect(() => {
    if (!animated) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      return;
    }
    
    const animate = () => {
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

const Heatmap = memo(HeatmapComponent);
Heatmap.displayName = 'Heatmap';

export default Heatmap;