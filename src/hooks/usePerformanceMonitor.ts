'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { PerformanceMetrics } from '@/lib/types';
import { PerformanceMonitor } from '@/lib/performanceUtils';

interface UsePerformanceMonitorReturn {
  metrics: PerformanceMetrics | null;
  isMonitoring: boolean;
  startMonitoring: () => void;
  stopMonitoring: () => void;
  resetMetrics: () => void;
  averageRenderTime: number;
  peakMemoryUsage: number;
}

export function usePerformanceMonitor(): UsePerformanceMonitorReturn {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [averageRenderTime, setAverageRenderTime] = useState(0);
  const [peakMemoryUsage, setPeakMemoryUsage] = useState(0);
  
  const monitorRef = useRef<PerformanceMonitor | null>(null);
  const metricsHistoryRef = useRef<PerformanceMetrics[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
 const startMonitoring = useCallback(() => {
    if (monitorRef.current) {
      monitorRef.current.reset();
    } else {
      monitorRef.current = new PerformanceMonitor();
    }
    
    setIsMonitoring(true);
    metricsHistoryRef.current = [];
    setPeakMemoryUsage(0);
    
    // Use setInterval for reliable real-time updates (200ms interval)
    intervalRef.current = setInterval(() => {
      if (!monitorRef.current) return;
      
      const currentMetrics = monitorRef.current.endFrame();
      monitorRef.current.startFrame();
      
      setMetrics(currentMetrics);
      metricsHistoryRef.current.push(currentMetrics);
      
      if (metricsHistoryRef.current.length > 100) {
        metricsHistoryRef.current.shift();
      }
      
      const avgRenderTime = metricsHistoryRef.current.reduce(
        (sum, m) => sum + m.renderTime,
        0
      ) / metricsHistoryRef.current.length;
      setAverageRenderTime(avgRenderTime);
      
      setPeakMemoryUsage(prev => Math.max(prev, currentMetrics.memoryUsage));
    }, 200);
    
    monitorRef.current.startFrame();
  }, []);
  
  const stopMonitoring = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsMonitoring(false);
  }, []);
  
  const resetMetrics = useCallback(() => {
    if (monitorRef.current) {
      monitorRef.current.reset();
    }
    setMetrics(null);
    setAverageRenderTime(0);
    setPeakMemoryUsage(0);
    metricsHistoryRef.current = [];
  }, []);
  
  useEffect(() => {
    return () => {
      stopMonitoring();
    };
  }, [stopMonitoring]);
  
  return {
    metrics,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    resetMetrics,
    averageRenderTime,
    peakMemoryUsage
  };
}