'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { DataPoint, RealtimeDataStreamOptions } from '@/lib/types';

interface UseDataStreamReturn {
  data: DataPoint[];
  isConnected: boolean;
  error: string | null;
  lastUpdate: number;
  totalPoints: number;
  connect: () => void;
  disconnect: () => void;
  updateOptions: (options: Partial<RealtimeDataStreamOptions>) => void;
}

export function useDataStream(
  options: RealtimeDataStreamOptions = {
    updateInterval: 100,
    maxDataPoints: 10000,
    enableAggregation: false
  }
): UseDataStreamReturn {
  const [data, setData] = useState<DataPoint[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<number>(0);
  const [totalPoints, setTotalPoints] = useState<number>(0);
  
  const eventSourceRef = useRef<EventSource | null>(null);
  const optionsRef = useRef(options);
  const dataBufferRef = useRef<DataPoint[]>([]);
  
  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    try {
      const params = new URLSearchParams({
        interval: optionsRef.current.updateInterval.toString(),
        maxPoints: optionsRef.current.maxDataPoints.toString()
      });

      eventSourceRef.current = new EventSource(`/api/data/stream?${params}`);

      eventSourceRef.current.onopen = () => {
        setIsConnected(true);
        setError(null);
      };

      eventSourceRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          if (message.type === 'initial') {
            setData(message.data);
            dataBufferRef.current = message.data;
            setTotalPoints(message.count);
            setLastUpdate(message.timestamp);
          } else if (message.type === 'batch') {
            // Handle batched updates - more efficient
            const newDataPoints = message.dataPoints;

            setData(prevData => {
              const updated = [...prevData, ...newDataPoints];
              // Maintain max data points
              if (updated.length > optionsRef.current.maxDataPoints) {
                return updated.slice(-optionsRef.current.maxDataPoints);
              }
              return updated;
            });

            dataBufferRef.current = [...dataBufferRef.current, ...newDataPoints];
            if (dataBufferRef.current.length > optionsRef.current.maxDataPoints) {
              dataBufferRef.current = dataBufferRef.current.slice(-optionsRef.current.maxDataPoints);
            }

            setTotalPoints(message.totalPoints);
            setLastUpdate(message.timestamp);
          } else if (message.type === 'update') {
            // Fallback to single updates
            const newDataPoint = message.dataPoint;

            setData(prevData => {
              const updated = [...prevData, newDataPoint];
              if (updated.length > optionsRef.current.maxDataPoints) {
                return updated.slice(-optionsRef.current.maxDataPoints);
              }
              return updated;
            });

            dataBufferRef.current = [...dataBufferRef.current, newDataPoint];
            if (dataBufferRef.current.length > optionsRef.current.maxDataPoints) {
              dataBufferRef.current = dataBufferRef.current.slice(-optionsRef.current.maxDataPoints);
            }

            setTotalPoints(message.totalPoints);
            setLastUpdate(message.timestamp);
          }
        } catch (err) {
          console.error('Error parsing SSE message:', err);
          setError('Failed to parse data update');
        }
      };

      eventSourceRef.current.onerror = (event) => {
        console.error('EventSource error:', event);
        setIsConnected(false);
        setError('Connection error');
      };

    } catch (err) {
      console.error('Error connecting to data stream:', err);
      setError('Failed to connect to data stream');
      setIsConnected(false);
    }
  }, []);
  
  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsConnected(false);
  }, []);
  
  const updateOptions = useCallback((newOptions: Partial<RealtimeDataStreamOptions>) => {
    optionsRef.current = { ...optionsRef.current, ...newOptions };
    
    // Reconnect if currently connected
    if (isConnected) {
      disconnect();
      setTimeout(connect, 100);
    }
  }, [isConnected, disconnect, connect]);
  
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);
  
  return {
    data,
    isConnected,
    error,
    lastUpdate,
    totalPoints,
    connect,
    disconnect,
    updateOptions
  };
}