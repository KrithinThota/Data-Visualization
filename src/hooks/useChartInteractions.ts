'use client';

import { useState, useCallback, useRef } from 'react';
import { ZoomState, PanState, ChartBounds } from '@/lib/types';

interface UseChartInteractionsProps {
  initialZoom?: number;
  initialPanX?: number;
  initialPanY?: number;
  minZoom?: number;
  maxZoom?: number;
}

interface UseChartInteractionsReturn {
  zoom: ZoomState;
  pan: PanState;
  handleZoom: (delta: number, centerX: number, centerY: number) => void;
  handlePanStart: (x: number, y: number) => void;
  handlePanMove: (x: number, y: number) => void;
  handlePanEnd: () => void;
  resetView: () => void;
  setZoomLevel: (zoom: number) => void;
  isPanning: boolean;
}

export function useChartInteractions({
  initialZoom = 1,
  initialPanX = 0,
  initialPanY = 0,
  minZoom = 0.1,
  maxZoom = 10
}: UseChartInteractionsProps = {}): UseChartInteractionsReturn {
  const [zoom, setZoom] = useState<ZoomState>({
    scale: initialZoom,
    offsetX: initialPanX,
    offsetY: initialPanY
  });
  
  const [pan, setPan] = useState<PanState>({
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    isPanning: false
  });
  
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const zoomStartRef = useRef({ offsetX: 0, offsetY: 0 });
  
  const handleZoom = useCallback((delta: number, centerX: number, centerY: number) => {
    setZoom(prev => {
      const newScale = Math.max(minZoom, Math.min(maxZoom, prev.scale * (1 + delta * 0.1)));
      const scaleChange = newScale / prev.scale;
      
      return {
        ...prev,
        scale: newScale,
        offsetX: centerX - (centerX - prev.offsetX) * scaleChange,
        offsetY: centerY - (centerY - prev.offsetY) * scaleChange
      };
    });
  }, [minZoom, maxZoom]);
  
  const handlePanStart = useCallback((x: number, y: number) => {
    setZoom(prev => {
      panStartRef.current = { x, y };
      zoomStartRef.current = { offsetX: prev.offsetX, offsetY: prev.offsetY };
      return prev;
    });
    
    setPan(prev => ({
      ...prev,
      startX: x,
      startY: y,
      isPanning: true
    }));
    isPanningRef.current = true;
  }, []);
  
  const handlePanMove = useCallback((x: number, y: number) => {
    if (!isPanningRef.current) return;
    
    const deltaX = x - panStartRef.current.x;
    const deltaY = y - panStartRef.current.y;
    
    setPan(prev => ({
      ...prev,
      currentX: x,
      currentY: y,
      isPanning: true
    }));
    
    setZoom(prev => ({
      ...prev,
      offsetX: zoomStartRef.current.offsetX + deltaX,
      offsetY: zoomStartRef.current.offsetY + deltaY
    }));
  }, []);
  
  const handlePanEnd = useCallback(() => {
    setPan(prev => ({
      ...prev,
      isPanning: false
    }));
    isPanningRef.current = false;
  }, []);
  
  const resetView = useCallback(() => {
    setZoom({
      scale: initialZoom,
      offsetX: initialPanX,
      offsetY: initialPanY
    });
    setPan({
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0,
      isPanning: false
    });
    isPanningRef.current = false;
  }, [initialZoom, initialPanX, initialPanY]);
  
  const setZoomLevel = useCallback((level: number) => {
    const clampedLevel = Math.max(minZoom, Math.min(maxZoom, level));
    setZoom(prev => ({
      ...prev,
      scale: clampedLevel
    }));
  }, [minZoom, maxZoom]);
  
  return {
    zoom,
    pan,
    handleZoom,
    handlePanStart,
    handlePanMove,
    handlePanEnd,
    resetView,
    setZoomLevel,
    isPanning: pan.isPanning
  };
}
