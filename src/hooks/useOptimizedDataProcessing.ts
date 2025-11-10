'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { DataPoint, FilterOptions, AggregationLevel } from '@/lib/types';
import { filterData, aggregateDataByTime } from '@/lib/dataGenerator';
import { useWorkerFilters } from './useWebWorker';

interface UseOptimizedDataProcessingOptions {
  data: DataPoint[];
  filters: FilterOptions;
  aggregationLevel: AggregationLevel;
  filtersKey: string;
  isWorkerReady: boolean;
}

interface UseOptimizedDataProcessingReturn {
  processedData: DataPoint[];
  isProcessing: boolean;
}

// Debounce helper
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function useOptimizedDataProcessing({
  data,
  filters,
  aggregationLevel,
  filtersKey,
  isWorkerReady
}: UseOptimizedDataProcessingOptions): UseOptimizedDataProcessingReturn {
  const [processedData, setProcessedData] = useState<DataPoint[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const {
    filterData: workerFilterData,
    aggregateData: workerAggregateData
  } = useWorkerFilters();

  // Store previous filter key to detect changes
  const prevFiltersKeyRef = useRef<string>(filtersKey);
  const processingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const dataBufferRef = useRef<DataPoint[]>([]);
  const lastProcessedTimeRef = useRef<number>(0);

  // Batch size for processing
  const BATCH_SIZE = 1000;
  const MIN_PROCESS_INTERVAL = 50; // Minimum ms between processing

  // Process data in batches
  const processDataBatch = useCallback(async (
    dataToProcess: DataPoint[],
    currentFilters: FilterOptions,
    currentAggregation: AggregationLevel
  ) => {
    try {
      let filtered: DataPoint[];

      if (isWorkerReady) {
        filtered = await workerFilterData(dataToProcess, currentFilters);
      } else {
        filtered = filterData(
          dataToProcess,
          currentFilters.categories,
          currentFilters.valueRange,
          currentFilters.timeRange
        );
      }

      let result = filtered;

      if (currentAggregation.enabled) {
        if (isWorkerReady) {
          result = await workerAggregateData(filtered, currentAggregation);
        } else {
          result = aggregateDataByTime(filtered, currentAggregation);
        }
      }

      return result;
    } catch (error) {
      console.error('Error processing data batch:', error);
      return dataToProcess;
    }
  }, [isWorkerReady, workerFilterData, workerAggregateData]);

  // Debounced processing function
  const debouncedProcess = useMemo(
    () => debounce(async (
      dataToProcess: DataPoint[],
      currentFilters: FilterOptions,
      currentAggregation: AggregationLevel,
      forceUpdate: boolean = false
    ) => {
      const now = Date.now();
      const timeSinceLastProcess = now - lastProcessedTimeRef.current;

      // Skip processing if too soon (unless forced)
      if (!forceUpdate && timeSinceLastProcess < MIN_PROCESS_INTERVAL) {
        return;
      }

      setIsProcessing(true);
      lastProcessedTimeRef.current = now;

      try {
        // Process in batches if data is large
        if (dataToProcess.length > BATCH_SIZE) {
          const batches: DataPoint[][] = [];
          for (let i = 0; i < dataToProcess.length; i += BATCH_SIZE) {
            batches.push(dataToProcess.slice(i, i + BATCH_SIZE));
          }

          // Process batches sequentially but with yielding
          const results: DataPoint[] = [];
          for (const batch of batches) {
            const batchResult = await processDataBatch(batch, currentFilters, currentAggregation);
            results.push(...batchResult);
            
            // Yield to main thread between batches
            await new Promise(resolve => setTimeout(resolve, 0));
          }

          setProcessedData(results);
        } else {
          const result = await processDataBatch(dataToProcess, currentFilters, currentAggregation);
          setProcessedData(result);
        }
      } finally {
        setIsProcessing(false);
      }
    }, 50), // 50ms debounce
    [processDataBatch]
  );

  // Handle data updates
  useEffect(() => {
    if (!data || data.length === 0) {
      if (processedData.length > 0) {
        setProcessedData([]);
      }
      return;
    }

    // Check if filters changed
    const filtersChanged = prevFiltersKeyRef.current !== filtersKey;
    prevFiltersKeyRef.current = filtersKey;

    // Add new data to buffer
    dataBufferRef.current = data;

    // Clear any pending processing
    if (processingTimeoutRef.current) {
      clearTimeout(processingTimeoutRef.current);
    }

    // Schedule processing with debouncing
    processingTimeoutRef.current = setTimeout(() => {
      debouncedProcess(dataBufferRef.current, filters, aggregationLevel, filtersChanged);
    }, filtersChanged ? 0 : 50); // Process immediately on filter change

    return () => {
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
      }
    };
  }, [data, filters, aggregationLevel, filtersKey, debouncedProcess, processedData.length]);

  // Initial data load
  useEffect(() => {
    if (data.length > 0 && processedData.length === 0 && !isProcessing) {
      debouncedProcess(data, filters, aggregationLevel, true);
    }
  }, [data.length, processedData.length, isProcessing]);

  return {
    processedData,
    isProcessing
  };
}