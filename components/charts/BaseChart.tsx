'use client';

import React, { useRef, useEffect, useMemo, useCallback } from 'react';
import { CanvasRenderer } from '@/lib/canvas/canvasUtils';
import { EnhancedLOD } from '@/lib/canvas/enhancedLOD';
import { HybridRenderer } from '@/lib/webgpu/webgpuIntegration';
import { DataPoint, ChartConfig, ZoomPanState } from '@/types/dashboard';
import { useData } from '@/components/providers/DataProvider';
import { useChartMemoryManagement } from '@/hooks/useMemoryManagement';
import { enhancedLeakDetector } from '@/lib/memory/enhancedLeakDetector';
import { registerComponentCleanup } from '@/lib/memory/cleanupManager';

interface BaseChartProps {
  width: number;
  height: number;
  config: ChartConfig;
  onHover?: (point: DataPoint | null, event: MouseEvent) => void;
  zoomPanState?: ZoomPanState;
}

export const BaseChart: React.FC<BaseChartProps> = React.memo(({
  width,
  height,
  config,
  onHover,
  zoomPanState
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<CanvasRenderer | null>(null);
  const hybridRendererRef = useRef<HybridRenderer | null>(null);
  const lodRendererRef = useRef(new EnhancedLOD());
  const animationRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef(0);
  const pooledContextRef = useRef<CanvasRenderingContext2D | null>(null);
  const dataBufferRef = useRef<Float32Array | null>(null);

  const { data } = useData();

  // Memory management for this chart component
  const memory = useChartMemoryManagement(
    config.id,
    data.length,
    width,
    height
  );

  const processedData = useMemo(() => {
    if (!data.length) return [];

    // Filter data based on chart config
    const filtered = data.filter(() => config.visible);

    // Apply time range filtering if needed
    // Apply category filtering if needed

    return filtered;
  }, [data, config]);

  // Start animation loop with memory management
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;

    // Register component for memory leak detection
    enhancedLeakDetector.registerObject(canvas, 'HTMLCanvasElement', width * height * 4); // RGBA
    enhancedLeakDetector.registerObject(lodRendererRef.current, 'EnhancedLOD', 1024);

    // Update memory access
    memory.updateMemoryAccess();

    // Register cleanup task
    const unregisterCleanup = registerComponentCleanup(
      `BaseChart-${config.id}`,
      () => {
        // Release pooled context
        if (pooledContextRef.current) {
          memory.releaseCanvasContext(pooledContextRef.current);
        }
        
        // Clear any cached data
        if (hybridRendererRef.current) {
          hybridRendererRef.current.destroy();
        }

        // Clear data buffer
        if (dataBufferRef.current) {
          memory.releaseArray(dataBufferRef.current);
        }
      },
      'medium'
    );

    const initializeRenderer = async () => {
      try {
        // Get pooled canvas context from memory management
        pooledContextRef.current = memory.acquireCanvasContext();

        // Initialize hybrid renderer (WebGPU with Canvas fallback)
        hybridRendererRef.current = new HybridRenderer(canvas);
        await hybridRendererRef.current.initialize();

        // Fallback Canvas renderer using pooled context
        rendererRef.current = new CanvasRenderer(canvas);


        // Initialize last frame time
        lastFrameTimeRef.current = performance.now();

        // Start animation loop
        const startRenderLoop = () => {
          const renderFrame = async () => {
            if (!hybridRendererRef.current || !canvasRef.current) return;

            const now = performance.now();
            lastFrameTimeRef.current = now;

            // Update LOD based on zoom level
            if (zoomPanState) {
              lodRendererRef.current.setZoomLevel(zoomPanState.zoom);
            }

            try {
              // Process data into buffer for efficient rendering
              if (dataBufferRef.current) {
                const buffer = memory.processDataToBuffer(processedData);
                if (buffer) {
                  // Use buffer for rendering if supported by hybrid renderer
                  // For now, fall back to original data
                }
              }

              // Render using hybrid renderer (WebGPU or Canvas fallback)
              await hybridRendererRef.current.renderChart(processedData, config);
            } catch (error) {
              console.warn('Rendering failed, falling back to LOD system:', error);
              // Fallback to LOD system if hybrid renderer fails
              if (rendererRef.current) {
                rendererRef.current.clear();
                lodRendererRef.current.render(processedData, rendererRef.current, config, width, height);
              }
            }

            // Continue animation loop
            animationRef.current = requestAnimationFrame(renderFrame);
          };

          animationRef.current = requestAnimationFrame(renderFrame);
        };

        startRenderLoop();
      } catch (error) {
        console.error('Failed to initialize renderer:', error);
        // Fallback to Canvas only
        rendererRef.current = new CanvasRenderer(canvas);
        lastFrameTimeRef.current = performance.now();

        const renderFrame = async () => {
          if (!rendererRef.current || !canvasRef.current) return;

          const now = performance.now();
          lastFrameTimeRef.current = now;

          // Update LOD based on zoom level
          if (zoomPanState) {
            lodRendererRef.current.setZoomLevel(zoomPanState.zoom);
          }

          // Render using LOD system
          rendererRef.current.clear();
          lodRendererRef.current.render(processedData, rendererRef.current, config, width, height);

          // Continue animation loop
          animationRef.current = requestAnimationFrame(renderFrame);
        };

        animationRef.current = requestAnimationFrame(renderFrame);
      }
    };

    initializeRenderer();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (hybridRendererRef.current) {
        hybridRendererRef.current.destroy();
      }
      // Cleanup registered tasks
      unregisterCleanup();
    };
  }, [processedData, config, width, height, zoomPanState, memory]);

  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onHover || !canvasRef.current) return;

    const startTime = performance.now();
    const rect = canvasRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Use memory-efficient data processing for hover detection
    const processedHoverData = processedData; // Use already processed data
    
    const nearestPoint = findNearestPoint(x, y, processedHoverData, width, height);
    
    // Measure interaction latency
    const latency = performance.now() - startTime;
    // Report latency for performance monitoring
    if (process.env.NODE_ENV === 'development') {
      console.debug('Interaction latency:', latency.toFixed(2), 'ms');
    }
    memory.updateMemoryAccess(); // Update for memory tracking

    onHover(nearestPoint, event.nativeEvent);
  }, [onHover, processedData, width, height, memory]);

  const handleMouseLeave = useCallback(() => {
    if (onHover) {
      onHover(null, {} as MouseEvent);
    }
    memory.updateMemoryAccess(); // Update for memory tracking
  }, [onHover, memory]);

  return (
    <div className="chart-container relative">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="chart-canvas cursor-crosshair"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      />

      {/* Memory performance indicator for debugging */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute top-2 left-2 bg-black/70 text-white text-xs p-1 rounded">
          <div>Memory: {Math.round(memory.getMemoryStats().leakDetection.orphanedObjects)}</div>
          <div>Pool: {memory.getMemoryStats().pools.canvas.active} contexts</div>
        </div>
      )}
    </div>
  );
});

BaseChart.displayName = 'BaseChart';

// Helper function to find nearest data point
function findNearestPoint(
  mouseX: number,
  mouseY: number,
  data: DataPoint[],
  canvasWidth: number,
  canvasHeight: number
): DataPoint | null {
  if (!data.length) return null;

  const maxValue = Math.max(...data.map(p => p.value));
  const minValue = Math.min(...data.map(p => p.value));
  const timeRange = Math.max(...data.map(p => p.timestamp)) - Math.min(...data.map(p => p.timestamp));

  let nearest: DataPoint | null = null;
  let minDistance = Infinity;

  data.forEach(point => {
    const pointX = ((point.timestamp - Math.min(...data.map(p => p.timestamp))) / timeRange) * canvasWidth;
    const pointY = canvasHeight - ((point.value - minValue) / (maxValue - minValue)) * canvasHeight;

    const distance = Math.sqrt((mouseX - pointX) ** 2 + (mouseY - pointY) ** 2);

    if (distance < minDistance && distance < 50) { // 50px tolerance
      minDistance = distance;
      nearest = point;
    }
  });

  return nearest;
}