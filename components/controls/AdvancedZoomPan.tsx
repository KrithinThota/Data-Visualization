'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { ZoomPanState } from '@/types/dashboard';

interface AdvancedZoomPanProps {
  children: (transform: { scale: number; translateX: number; translateY: number }) => React.ReactNode;
  onTransformChange?: (transform: ZoomPanState) => void;
  initialZoom?: number;
  minZoom?: number;
  maxZoom?: number;
  enablePan?: boolean;
  enableZoom?: boolean;
}

export const AdvancedZoomPan: React.FC<AdvancedZoomPanProps> = ({
  children,
  onTransformChange,
  initialZoom = 1,
  minZoom = 0.1,
  maxZoom = 10,
  enablePan = true,
  enableZoom = true
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState<ZoomPanState>({
    zoom: initialZoom,
    panX: 0,
    panY: 0,
    isDragging: false
  });

  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const [isSpacePressed, setIsSpacePressed] = useState(false);

  const handleWheel = useCallback((e: WheelEvent) => {
    if (!enableZoom) return;

    e.preventDefault();
    const rect = containerRef.current!.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(minZoom, Math.min(maxZoom, transform.zoom * zoomFactor));

    // Zoom towards mouse position
    const zoomPointX = mouseX - transform.panX;
    const zoomPointY = mouseY - transform.panY;

    const newPanX = mouseX - zoomPointX * (newZoom / transform.zoom);
    const newPanY = mouseY - zoomPointY * (newZoom / transform.zoom);

    const newTransform = { ...transform, zoom: newZoom, panX: newPanX, panY: newPanY };
    setTransform(newTransform);
    onTransformChange?.(newTransform);
  }, [transform, minZoom, maxZoom, enableZoom, onTransformChange]);

  const handleMouseDown = useCallback((e: MouseEvent) => {
    if (!enablePan) return;

    // Only start dragging if space is pressed or middle mouse button
    if (!isSpacePressed && e.button !== 1) return;

    setLastMousePos({ x: e.clientX, y: e.clientY });
    setTransform(prev => ({ ...prev, isDragging: true }));
    e.preventDefault();
  }, [enablePan, isSpacePressed]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!transform.isDragging) return;

    const deltaX = e.clientX - lastMousePos.x;
    const deltaY = e.clientY - lastMousePos.y;

    const newTransform = {
      ...transform,
      panX: transform.panX + deltaX,
      panY: transform.panY + deltaY
    };

    setTransform(newTransform);
    setLastMousePos({ x: e.clientX, y: e.clientY });
    onTransformChange?.(newTransform);
  }, [transform, lastMousePos, onTransformChange]);

  const handleMouseUp = useCallback(() => {
    setTransform(prev => ({ ...prev, isDragging: false }));
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.code === 'Space') {
      setIsSpacePressed(true);
      e.preventDefault();
    }

    // Zoom shortcuts
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case '=':
        case '+':
          e.preventDefault();
          const zoomIn = Math.min(maxZoom, transform.zoom * 1.2);
          const newTransformZoomIn = { ...transform, zoom: zoomIn };
          setTransform(newTransformZoomIn);
          onTransformChange?.(newTransformZoomIn);
          break;
        case '-':
          e.preventDefault();
          const zoomOut = Math.max(minZoom, transform.zoom / 1.2);
          const newTransformZoomOut = { ...transform, zoom: zoomOut };
          setTransform(newTransformZoomOut);
          onTransformChange?.(newTransformZoomOut);
          break;
        case '0':
          e.preventDefault();
          const resetTransform = { zoom: initialZoom, panX: 0, panY: 0, isDragging: false };
          setTransform(resetTransform);
          onTransformChange?.(resetTransform);
          break;
      }
    }
  }, [transform, minZoom, maxZoom, initialZoom, onTransformChange]);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    if (e.code === 'Space') {
      setIsSpacePressed(false);
    }
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('wheel', handleWheel, { passive: false });
    container.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    return () => {
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleWheel, handleMouseDown, handleMouseMove, handleMouseUp, handleKeyDown, handleKeyUp]);

  const cursor = transform.isDragging ? 'grabbing' : isSpacePressed ? 'grab' : 'default';

  return (
    <div
      ref={containerRef}
      className="zoom-pan-container overflow-hidden select-none"
      style={{ cursor }}
    >
      <div
        style={{
          transform: `scale(${transform.zoom}) translate(${transform.panX / transform.zoom}px, ${transform.panY / transform.zoom}px)`,
          transformOrigin: '0 0',
          transition: transform.isDragging ? 'none' : 'transform 0.1s ease-out'
        }}
      >
        {children({ scale: transform.zoom, translateX: transform.panX, translateY: transform.panY })}
      </div>

      {/* Zoom controls overlay */}
      <div className="absolute top-4 left-4 bg-black/80 text-white p-2 rounded-lg text-sm font-mono">
        <div>Zoom: {(transform.zoom * 100).toFixed(0)}%</div>
        <div>Pan: {transform.panX.toFixed(0)}, {transform.panY.toFixed(0)}</div>
        <div className="text-xs opacity-75 mt-1">
          Scroll to zoom • Space+drag to pan • Ctrl+± to zoom • Ctrl+0 to reset
        </div>
      </div>
    </div>
  );
};