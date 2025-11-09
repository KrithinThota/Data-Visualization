'use client';

import { useCallback, useRef, useState } from 'react';
import { FilterOptions, AggregationLevel, ChartBounds, HeatmapData } from '@/lib/types';

type WorkerMessageType = 
  | 'filter_data'
  | 'aggregate_data' 
  | 'sort_data'
  | 'calculate_bounds'
  | 'process_heatmap';

type WorkerResponseType = 'success' | 'error';

interface WorkerRequest {
  type: WorkerMessageType;
  data: any;
  options: any;
  requestId: string;
}

interface WorkerResponse {
  requestId: string;
  type: WorkerResponseType;
  data?: any;
  error?: string;
}

interface UseWebWorkerReturn {
  isWorkerReady: boolean;
  processData: (type: WorkerMessageType, data: any, options: any) => Promise<any>;
  workerError: string | null;
  clearError: () => void;
}

export function useWebWorker(): UseWebWorkerReturn {
  const [isWorkerReady, setIsWorkerReady] = useState(false);
  const [workerError, setWorkerError] = useState<string | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const pendingRequests = useRef<Map<string, (data: any) => void>>(new Map());

  // Initialize worker
  const initializeWorker = useCallback(() => {
    if (workerRef.current) return;

    try {
      workerRef.current = new Worker('/workers/data-processor.worker.js');
      
      workerRef.current.onmessage = (e: MessageEvent<WorkerResponse>) => {
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
        console.error('Worker error:', error);
        setWorkerError('Worker failed to initialize');
      };

      workerRef.current.onmessageerror = (error) => {
        console.error('Worker message error:', error);
        setWorkerError('Worker message processing failed');
      };

      setIsWorkerReady(true);
    } catch (error) {
      console.error('Failed to create worker:', error);
      setWorkerError('Failed to create Web Worker');
    }
  }, []);

  const processData = useCallback(async (
    type: WorkerMessageType, 
    data: any, 
    options: any
  ): Promise<any> => {
    if (!isWorkerReady) {
      initializeWorker();
      // Wait a bit for worker to be ready
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return new Promise((resolve, reject) => {
      if (!workerRef.current) {
        reject(new Error('Worker not initialized'));
        return;
      }

      const requestId = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      pendingRequests.current.set(requestId, resolve);
      
      const message: WorkerRequest = {
        type,
        data,
        options,
        requestId
      };

      try {
        workerRef.current.postMessage(message);
      } catch (error) {
        pendingRequests.current.delete(requestId);
        setWorkerError('Failed to send message to worker');
        reject(error);
      }

      // Timeout after 30 seconds
      setTimeout(() => {
        if (pendingRequests.current.has(requestId)) {
          pendingRequests.current.delete(requestId);
          setWorkerError('Worker processing timeout');
          reject(new Error('Worker processing timeout'));
        }
      }, 30000);
    });
  }, [isWorkerReady, initializeWorker]);

  const clearError = useCallback(() => {
    setWorkerError(null);
  }, []);

  return {
    isWorkerReady,
    processData,
    workerError,
    clearError
  };
}

// Convenience hooks for specific data processing tasks
export function useWorkerFilters() {
  const { processData, isWorkerReady, workerError, clearError } = useWebWorker();

  const filterData = useCallback(async (
    data: any[], 
    filters: FilterOptions
  ) => {
    return processData('filter_data', data, { filters });
  }, [processData]);

  const aggregateData = useCallback(async (
    data: any[], 
    aggregationLevel: AggregationLevel
  ) => {
    return processData('aggregate_data', data, { aggregationLevel });
  }, [processData]);

  const calculateBounds = useCallback(async (data: any[]) => {
    return processData('calculate_bounds', data, {});
  }, [processData]);

  const processHeatmap = useCallback(async (
    data: HeatmapData[], 
    width: number, 
    height: number, 
    resolution = 10
  ) => {
    return processData('process_heatmap', data, { width, height, resolution });
  }, [processData]);

  return {
    isWorkerReady,
    filterData,
    aggregateData,
    calculateBounds,
    processHeatmap,
    workerError,
    clearError
  };
}