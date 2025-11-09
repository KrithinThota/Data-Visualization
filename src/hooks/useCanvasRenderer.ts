'use client';

import { useCallback, useRef, useState, useEffect } from 'react';
import { DataPoint, ChartBounds } from '@/lib/types';

interface CanvasRendererOptions {
  enableOffscreen?: boolean;
  workerPath?: string;
}

interface RenderOptions {
  color?: string;
  lineWidth?: number;
  smooth?: boolean;
  showGrid?: boolean;
  showAxes?: boolean;
  barWidth?: number;
  pointSize?: number;
  opacity?: number;
  cellSize?: number;
}

type ChartType = 'line' | 'bar' | 'scatter' | 'heatmap';

/**
 * Hook for optimized canvas rendering with OffscreenCanvas support
 */
export function useCanvasRenderer(options: CanvasRendererOptions = {}) {
  const {
    enableOffscreen = true,
    workerPath = '/workers/canvas-renderer.worker.js'
  } = options;

  const [isWorkerReady, setIsWorkerReady] = useState(false);
  const [workerError, setWorkerError] = useState<string | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const offscreenCanvasRef = useRef<OffscreenCanvas | null>(null);
  const pendingRequests = useRef<Map<string, (result: any) => void>>(new Map());

  // Initialize worker
  useEffect(() => {
    if (!enableOffscreen || typeof OffscreenCanvas === 'undefined') {
      return;
    }

    try {
      workerRef.current = new Worker(workerPath);

      workerRef.current.onmessage = (e) => {
        const { requestId, type, data, error } = e.data;
        const resolver = pendingRequests.current.get(requestId);

        if (resolver) {
          if (type === 'success') {
            resolver(data);
          } else {
            setWorkerError(error || 'Unknown worker error');
            resolver(null);
          }
          pendingRequests.current.delete(requestId);
        }
      };

      workerRef.current.onerror = (error) => {
        console.error('Canvas worker error:', error);
        setWorkerError('Worker failed to initialize');
        setIsWorkerReady(false);
      };

      setIsWorkerReady(true);
    } catch (error) {
      console.error('Failed to create canvas worker:', error);
      setWorkerError('Failed to create worker');
    }

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, [enableOffscreen, workerPath]);

  /**
   * Initialize offscreen canvas
   */
  const initOffscreenCanvas = useCallback(async (
    canvas: HTMLCanvasElement,
    width: number,
    height: number
  ): Promise<boolean> => {
    if (!isWorkerReady || !workerRef.current) {
      return false;
    }

    try {
      if (typeof OffscreenCanvas !== 'undefined' && canvas.transferControlToOffscreen) {
        offscreenCanvasRef.current = canvas.transferControlToOffscreen();

        const requestId = `init_${Date.now()}`;
        return new Promise((resolve) => {
          pendingRequests.current.set(requestId, resolve);

          workerRef.current!.postMessage({
            type: 'init',
            canvas: offscreenCanvasRef.current,
            width,
            height,
            requestId
          }, [offscreenCanvasRef.current as any]);
        });
      }
    } catch (error) {
      console.error('Failed to initialize offscreen canvas:', error);
      return false;
    }

    return false;
  }, [isWorkerReady]);

  /**
   * Render chart using worker
   */
  const renderInWorker = useCallback(async (
    chartType: ChartType,
    data: DataPoint[] | any,
    bounds: ChartBounds,
    width: number,
    height: number,
    options: RenderOptions = {}
  ): Promise<ImageBitmap | null> => {
    if (!isWorkerReady || !workerRef.current) {
      return null;
    }

    const requestId = `render_${chartType}_${Date.now()}`;
    const messageType = `render_${chartType}`;

    return new Promise((resolve) => {
      pendingRequests.current.set(requestId, resolve);

      workerRef.current!.postMessage({
        type: messageType,
        data: chartType === 'heatmap' ? data : { points: data, bounds },
        width,
        height,
        options,
        requestId
      });

      // Timeout after 5 seconds
      setTimeout(() => {
        if (pendingRequests.current.has(requestId)) {
          pendingRequests.current.delete(requestId);
          resolve(null);
        }
      }, 5000);
    });
  }, [isWorkerReady]);

  /**
   * Render chart on main thread (fallback)
   */
  const renderOnMainThread = useCallback((
    ctx: CanvasRenderingContext2D,
    chartType: ChartType,
    data: DataPoint[],
    bounds: ChartBounds,
    width: number,
    height: number,
    options: RenderOptions = {}
  ) => {
    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw based on chart type
    switch (chartType) {
      case 'line':
        renderLineOnMainThread(ctx, data, bounds, width, height, options);
        break;
      case 'bar':
        renderBarOnMainThread(ctx, data, bounds, width, height, options);
        break;
      case 'scatter':
        renderScatterOnMainThread(ctx, data, bounds, width, height, options);
        break;
      case 'heatmap':
        renderHeatmapOnMainThread(ctx, data as any, width, height, options);
        break;
    }
  }, []);

  return {
    isWorkerReady,
    workerError,
    initOffscreenCanvas,
    renderInWorker,
    renderOnMainThread
  };
}

// Main thread rendering functions (fallback)

function renderLineOnMainThread(
  ctx: CanvasRenderingContext2D,
  data: DataPoint[],
  bounds: ChartBounds,
  width: number,
  height: number,
  options: RenderOptions
) {
  const { color = '#3b82f6', lineWidth = 2, smooth = true } = options;

  if (data.length < 2) return;

  const padding = 40;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();

  const points = data.map(point => ({
    x: padding + ((point.timestamp - bounds.minX) / (bounds.maxX - bounds.minX)) * chartWidth,
    y: height - padding - ((point.value - bounds.minY) / (bounds.maxY - bounds.minY)) * chartHeight
  }));

  if (smooth && points.length > 2) {
    ctx.moveTo(points[0].x, points[0].y);

    for (let i = 1; i < points.length - 1; i++) {
      const xc = (points[i].x + points[i + 1].x) / 2;
      const yc = (points[i].y + points[i + 1].y) / 2;
      ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
    }

    ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
  } else {
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
  }

  ctx.stroke();
}

function renderBarOnMainThread(
  ctx: CanvasRenderingContext2D,
  data: DataPoint[],
  bounds: ChartBounds,
  width: number,
  height: number,
  options: RenderOptions
) {
  const { color = '#10b981', barWidth = 0.8 } = options;

  const padding = 40;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  ctx.fillStyle = color;

  const actualBarWidth = (chartWidth / data.length) * barWidth;
  const barSpacing = (chartWidth / data.length) * (1 - barWidth);

  data.forEach((point, index) => {
    const x = padding + index * (actualBarWidth + barSpacing) + barSpacing / 2;
    const barHeight = ((point.value - bounds.minY) / (bounds.maxY - bounds.minY)) * chartHeight;
    const y = height - padding - barHeight;

    ctx.fillRect(x, y, actualBarWidth, barHeight);
  });
}

function renderScatterOnMainThread(
  ctx: CanvasRenderingContext2D,
  data: DataPoint[],
  bounds: ChartBounds,
  width: number,
  height: number,
  options: RenderOptions
) {
  const { color = '#f59e0b', pointSize = 4, opacity = 0.8 } = options;

  const padding = 40;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  ctx.fillStyle = color;
  ctx.globalAlpha = opacity;

  data.forEach(point => {
    const x = padding + ((point.timestamp - bounds.minX) / (bounds.maxX - bounds.minX)) * chartWidth;
    const y = height - padding - ((point.value - bounds.minY) / (bounds.maxY - bounds.minY)) * chartHeight;

    ctx.beginPath();
    ctx.arc(x, y, pointSize, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.globalAlpha = 1;
}

function renderHeatmapOnMainThread(
  ctx: CanvasRenderingContext2D,
  data: any[],
  width: number,
  height: number,
  options: RenderOptions
) {
  const { cellSize = 10 } = options;

  data.forEach(cell => {
    const normalized = Math.max(0, Math.min(1, cell.value / 100));
    const hue = (1 - normalized) * 240;
    ctx.fillStyle = `hsl(${hue}, 70%, 50%)`;
    ctx.fillRect(cell.x * cellSize, cell.y * cellSize, cellSize, cellSize);
  });
}