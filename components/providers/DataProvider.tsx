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
   updateWindowSize: (size: number) => void;
   clearData: () => void;
   getProcessedData: () => Promise<DataPoint[]>;
   getCategoryColor: (category: string) => string;
 }

const DataActionsContext = createContext<DataProviderActions | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DashboardState>(() => ({
    data: [],
    filters: {},
    timeRange: { start: Date.now() - 3600000, end: Date.now() + 3600000 }, // Last hour to next hour for real-time data
    windowSize: 2000, // Sliding window size
    categoryColors: {
      'A': '#1F77B4', // Blue
      'B': '#FF7F0E', // Orange
      'C': '#2CA02C', // Green
      'D': '#D62728'  // Red
    },
    chartConfigs: [
      {
        id: 'line-chart-1',
        type: 'line',
        dataKey: 'value',
        color: '#1F77B4', // Colorblind-friendly blue
        visible: true
      },
      {
        id: 'bar-chart-1',
        type: 'bar',
        dataKey: 'value',
        color: '#FF7F0E', // Colorblind-friendly orange
        visible: true
      },
      {
        id: 'scatter-chart-1',
        type: 'scatter',
        dataKey: 'value',
        color: '#2CA02C', // Colorblind-friendly green
        visible: true
      },
      {
        id: 'heatmap-chart-1',
        type: 'heatmap',
        dataKey: 'value',
        color: '#D62728', // Colorblind-friendly red
        visible: true
      }
    ],
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
    console.log('🚀 DataProvider: Initializing data generator...');
    dataGeneratorRef.current = new DataGenerator();

    // Register this component for memory leak detection
    enhancedLeakDetector.registerObject(dataGeneratorRef.current, 'DataGenerator', 1024);

    // Register cleanup task for this component
    const unregisterCleanup = registerComponentCleanup(
      'DataProvider',
      () => {
        console.log('Cleaning up DataProvider...');
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
  const processIncomingData = useCallback(async (newData: DataPoint[]) => {
    console.log('🔄 DataProvider: Processing incoming data batch of', newData.length, 'points');
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

      // Update state with processed data using sliding window
       setState(prev => {
         const windowSize = prev.windowSize || 2000;
         const newDataArray = [...prev.data.slice(-(windowSize - processedData.length)), ...processedData];
         console.log('✅ DataProvider: Updated state with', newDataArray.length, 'total data points (window size:', windowSize, ')');
         return {
           ...prev,
           data: newDataArray,
           isLoading: false,
           performance: {
             ...prev.performance,
             dataProcessingTime: performance.now() - startTime
           }
         };
       });

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
  }, [state.filters, state.timeRange]);

  useEffect(() => {
    if (!dataGeneratorRef.current) {
      console.log('DataGenerator not initialized yet');
      return;
    }

    console.log('🔄 DataProvider: Starting data streaming...');
    dataGeneratorRef.current.startStreaming(processIncomingData);

    return () => {
      if (dataGeneratorRef.current) {
        console.log('⏹️ DataProvider: Stopping data streaming...');
        dataGeneratorRef.current.stopStreaming();
      }
    };
  }, [processIncomingData]);

  // Update time range to maintain sliding window for real-time data
  useEffect(() => {
    const updateTimeRange = () => {
      const now = Date.now();
      setState(prev => ({
        ...prev,
        timeRange: { start: now - 3600000, end: now + 3600000 } // Keep 1 hour window around current time
      }));
    };

    // Update time range every minute to maintain sliding window
    const interval = setInterval(updateTimeRange, 60000);
    return () => clearInterval(interval);
  }, []);

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

  const updateWindowSize = useCallback((size: number) => {
    setState(prev => ({
      ...prev,
      windowSize: Math.max(100, Math.min(10000, size)) // Clamp between 100 and 10000
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

  const getCategoryColor = useCallback((category: string): string => {
    return state.categoryColors?.[category] || '#666666';
  }, [state.categoryColors]);

  const actions = useMemo(() => ({
    updateFilters,
    updateTimeRange,
    updateWindowSize,
    clearData,
    getProcessedData,
    getCategoryColor
  }), [updateFilters, updateTimeRange, updateWindowSize, clearData, getProcessedData, getCategoryColor]);

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