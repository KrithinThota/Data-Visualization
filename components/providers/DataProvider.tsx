'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { DataGenerator } from '@/lib/data/dataGenerator';
import { SIMDProcessor } from '@/lib/wasm/simdProcessor';
import { DataPoint, DashboardState, FilterConfig, TimeRange } from '@/types/dashboard';
import { enhancedLeakDetector } from '@/lib/memory/enhancedLeakDetector';
import { registerComponentCleanup } from '@/lib/memory/cleanupManager';
import { memoryMonitor } from '@/lib/memory/memoryMonitor';
import { dataCache } from '@/lib/memory/weakCache';

const DataContext = createContext<DashboardState | null>(null);

interface DataProviderActions {
  updateFilters: (filters: Partial<FilterConfig>) => void;
  updateTimeRange: (timeRange: TimeRange) => void;
  clearData: () => void;
  getProcessedData: () => Promise<DataPoint[]>;
}

const DataActionsContext = createContext<DataProviderActions | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DashboardState>(() => ({
    data: [],
    filters: {},
    timeRange: { start: Date.now() - 3600000, end: Date.now() }, // Last hour
    chartConfigs: [],
    performance: {
      fps: 0,
      memoryUsage: 0,
      renderTime: 0,
      dataProcessingTime: 0,
      interactionLatency: 0
    },
    isLoading: true
  }));

  const dataGeneratorRef = useRef<DataGenerator | null>(null);
  const performanceIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize data generator and memory management
  useEffect(() => {
    dataGeneratorRef.current = new DataGenerator();

    // Register this component for memory leak detection
    enhancedLeakDetector.registerObject(dataGeneratorRef.current, 'DataGenerator', 1024);

    // Register cleanup task for this component
    const unregisterCleanup = registerComponentCleanup(
      'DataProvider',
      () => {
        // Stop data generator
        if (dataGeneratorRef.current) {
          dataGeneratorRef.current.stopStreaming();
        }
        
        // Clear performance interval
        if (performanceIntervalRef.current) {
          clearInterval(performanceIntervalRef.current);
          performanceIntervalRef.current = null;
        }
        
        // Clear data cache
        dataCache.clear();
      },
      'high'
    );

    return () => {
      unregisterCleanup();
    };
  }, []);

  // Start data streaming with WebAssembly processing
  useEffect(() => {
    if (!dataGeneratorRef.current) return;

    const processIncomingData = async (newData: DataPoint[]) => {
      const startTime = performance.now();

      try {
        // Use cached data processing if available
        const cacheKey = { data: newData, filters: state.filters, timeRange: state.timeRange };
        let processedData = dataCache.get(cacheKey) as DataPoint[] | undefined;

        if (!processedData) {
          // Apply filters using SIMD if available
          processedData = newData;
          if (state.filters.valueRange) {
            processedData = await SIMDProcessor.filterLargeDataset(
              processedData,
              state.filters.valueRange[0]
            );
          }

          // Apply time range filtering
          processedData = processedData.filter(point =>
            point.timestamp >= state.timeRange.start &&
            point.timestamp <= state.timeRange.end
          );

          // Apply category filtering (support both single category and categories array)
          if (state.filters.category) {
            processedData = processedData.filter(point =>
              point.category === state.filters.category
            );
          } else if (state.filters.categories && state.filters.categories.length > 0) {
            processedData = processedData.filter(point =>
              state.filters.categories!.includes(point.category)
            );
          }

          // Cache the processed data
          dataCache.set(cacheKey, processedData);
        }

        // Update state with processed data
        setState(prev => ({
          ...prev,
          data: [...prev.data.slice(-990), ...processedData], // Keep last 1000 points
          isLoading: false,
          performance: {
            ...prev.performance,
            dataProcessingTime: performance.now() - startTime
          }
        }));

        // Update memory monitoring
        enhancedLeakDetector.updateAccess(cacheKey);

      } catch (error) {
        console.error('Data processing error:', error);
        // Fallback to basic processing
        setState(prev => ({
          ...prev,
          data: [...prev.data.slice(-990), ...newData],
          isLoading: false
        }));
      }
    };

    dataGeneratorRef.current.startStreaming(processIncomingData);

    return () => {
      if (dataGeneratorRef.current) {
        dataGeneratorRef.current.stopStreaming();
      }
    };
  }, [state.filters, state.timeRange]);

  // Actions for external control
  const updateFilters = useCallback((filters: Partial<FilterConfig>) => {
    setState(prev => ({
      ...prev,
      filters: { ...prev.filters, ...filters }
    }));
  }, []);

  const updateTimeRange = useCallback((timeRange: TimeRange) => {
    setState(prev => ({
      ...prev,
      timeRange
    }));
  }, []);

  const clearData = useCallback(() => {
    setState(prev => ({
      ...prev,
      data: [],
      isLoading: true
    }));
  }, []);

  const getProcessedData = useCallback(async (): Promise<DataPoint[]> => {
    // Return currently processed data
    return state.data;
  }, [state.data]);

  const actions = useMemo(() => ({
    updateFilters,
    updateTimeRange,
    clearData,
    getProcessedData
  }), [updateFilters, updateTimeRange, clearData, getProcessedData]);

  // Performance monitoring and memory management
  useEffect(() => {
    // Start memory monitoring
    memoryMonitor.startMonitoring();

    const updatePerformance = () => {
      const memoryUsage = (performance as unknown as { memory?: { usedJSHeapSize?: number } }).memory?.usedJSHeapSize || 0;
      const fps = Math.round(1000 / 16.67); // Approximate based on 60fps target

      setState(prev => ({
        ...prev,
        performance: {
          ...prev.performance,
          fps,
          memoryUsage: memoryUsage / 1024 / 1024 // Convert to MB
        }
      }));

      // Update leak detector with stable state reference
      const currentState = {
        data: state.data,
        filters: state.filters,
        timeRange: state.timeRange,
        performance: state.performance
      };
      enhancedLeakDetector.updateAccess(currentState);
    };

    performanceIntervalRef.current = setInterval(updatePerformance, 1000);

    return () => {
      if (performanceIntervalRef.current) {
        clearInterval(performanceIntervalRef.current);
        performanceIntervalRef.current = null;
      }
      memoryMonitor.stopMonitoring();
    };
  },); // Remove state dependency to prevent memory leaks

  return (
    <DataContext.Provider value={state}>
      <DataActionsContext.Provider value={actions}>
        {children}
      </DataActionsContext.Provider>
    </DataContext.Provider>
  );
}

export const useData = (): DashboardState => {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within DataProvider');
  return context;
};

export const useDataActions = (): DataProviderActions => {
  const context = useContext(DataActionsContext);
  if (!context) throw new Error('useDataActions must be used within DataProvider');
  return context;
};