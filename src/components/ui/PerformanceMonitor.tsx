'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PerformanceMetrics } from '@/lib/types';

interface PerformanceMonitorProps {
  metrics: PerformanceMetrics | null;
  isMonitoring: boolean;
  averageRenderTime: number;
  peakMemoryUsage: number;
  onStart: () => void;
  onStop: () => void;
  onReset: () => void;
  dataProcessingDelays?: number[];
  lastDataProcessingTime?: number;
}

export default function PerformanceMonitor({
  metrics,
  isMonitoring,
  averageRenderTime,
  peakMemoryUsage,
  onStart,
  onStop,
  onReset,
  dataProcessingDelays = [],
  lastDataProcessingTime = 0
}: PerformanceMonitorProps) {
  const getFpsColor = (fps: number) => {
    if (fps >= 55) return 'text-green-600';
    if (fps >= 30) return 'text-yellow-600';
    return 'text-red-600';
  };
  
  const getRenderTimeColor = (time: number) => {
    if (time <= 16) return 'text-green-600'; // 60fps = 16.67ms per frame
    if (time <= 33) return 'text-yellow-600'; // 30fps = 33.33ms per frame
    return 'text-red-600';
  };
  
  const getMemoryColor = (memory: number) => {
    if (memory <= 50) return 'text-green-600';
    if (memory <= 100) return 'text-yellow-600';
    return 'text-red-600';
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Performance Monitor</CardTitle>
          <div className="flex gap-2">
            {!isMonitoring ? (
              <Badge variant="secondary" className="cursor-pointer" onClick={onStart}>
                Start
              </Badge>
            ) : (
              <Badge variant="destructive" className="cursor-pointer" onClick={onStop}>
                Stop
              </Badge>
            )}
            <Badge variant="outline" className="cursor-pointer" onClick={onReset}>
              Reset
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {metrics ? (
          <>
            {/* FPS */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">FPS</span>
              <span className={`text-lg font-bold ${getFpsColor(metrics.fps)}`}>
                {metrics.fps.toFixed(1)}
              </span>
            </div>
            
            {/* Render Time */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Render Time</span>
              <span className={`text-lg font-bold ${getRenderTimeColor(metrics.renderTime)}`}>
                {metrics.renderTime.toFixed(2)}ms
              </span>
            </div>
            
            {/* Average Render Time */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Avg Render Time</span>
              <span className={`text-lg font-bold ${getRenderTimeColor(averageRenderTime)}`}>
                {averageRenderTime.toFixed(2)}ms
              </span>
            </div>
            
            {/* Memory Usage */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Memory Usage</span>
              <span className={`text-lg font-bold ${getMemoryColor(metrics.memoryUsage)}`}>
                {metrics.memoryUsage.toFixed(1)}MB
              </span>
            </div>
            
            {/* Peak Memory Usage */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Peak Memory</span>
              <span className={`text-lg font-bold ${getMemoryColor(peakMemoryUsage)}`}>
                {peakMemoryUsage.toFixed(1)}MB
              </span>
            </div>
            
            {/* Data Points */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Data Points</span>
              <span className="text-lg font-bold text-blue-600">
                {metrics.dataPointsCount.toLocaleString()}
              </span>
            </div>

            {/* Data Processing Time */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Data Processing</span>
              <span className={`text-lg font-bold ${getRenderTimeColor(lastDataProcessingTime)}`}>
                {lastDataProcessingTime.toFixed(2)}ms
              </span>
            </div>

            {/* Average Data Processing Time */}
            {dataProcessingDelays.length > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Avg Data Processing</span>
                <span className={`text-lg font-bold ${getRenderTimeColor(dataProcessingDelays.reduce((a, b) => a + b, 0) / dataProcessingDelays.length)}`}>
                  {(dataProcessingDelays.reduce((a, b) => a + b, 0) / dataProcessingDelays.length).toFixed(2)}ms
                </span>
              </div>
            )}
            
            {/* Status */}
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Status</span>
                <Badge variant={isMonitoring ? "default" : "secondary"}>
                  {isMonitoring ? 'Monitoring' : 'Stopped'}
                </Badge>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p className="mb-4">No performance data available</p>
            <p className="text-sm">Click "Start" to begin monitoring</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}