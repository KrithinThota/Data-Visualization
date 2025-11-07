'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { usePerformanceMonitor, useWebGPUMonitor, ExtendedPerformanceMetrics } from '@/hooks/usePerformanceMonitor';
import { WebGPUIntegration } from '@/lib/webgpu/webgpuIntegration';

interface PerformanceMonitorProps {
  webgpuIntegration?: WebGPUIntegration;
  className?: string;
  showRecommendations?: boolean;
  compact?: boolean;
}

interface PerformanceRecommendation {
  type: 'warning' | 'error' | 'info';
  message: string;
  action?: string;
  priority: number;
}

export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  webgpuIntegration,
  className = '',
  showRecommendations = true,
  compact = false
}) => {
  const { metrics } = usePerformanceMonitor(webgpuIntegration);
  const gpuMetrics = useWebGPUMonitor(webgpuIntegration);
  const [isExpanded, setIsExpanded] = useState(!compact);
  const [performanceHistory, setPerformanceHistory] = useState<ExtendedPerformanceMetrics[]>([]);

  // Track performance history for trend analysis
  useEffect(() => {
    const timer = setTimeout(() => {
      setPerformanceHistory(prev => {
        const newHistory = [...prev, metrics];
        // Keep last 60 seconds of data (assuming 1 second intervals)
        return newHistory.slice(-60);
      });
    }, 1000); // Update every second

    return () => clearTimeout(timer);
  }, [metrics]);

  // Generate performance recommendations
  const recommendations = useMemo((): PerformanceRecommendation[] => {
    const recs: PerformanceRecommendation[] = [];

    // FPS recommendations
    if (metrics.fps < 30) {
      recs.push({
        type: 'error',
        message: 'FPS critically low - performance severely impacted',
        action: 'Consider reducing data points or enabling LOD',
        priority: 10
      });
    } else if (metrics.fps < 50) {
      recs.push({
        type: 'warning',
        message: 'FPS below optimal range',
        action: 'Enable adaptive quality or reduce rendering complexity',
        priority: 7
      });
    }

    // Memory recommendations
    if (metrics.memoryUsage > 100) {
      recs.push({
        type: 'error',
        message: 'High memory usage detected',
        action: 'Check for memory leaks or reduce data window size',
        priority: 9
      });
    } else if (metrics.memoryUsage > 75) {
      recs.push({
        type: 'warning',
        message: 'Memory usage elevated',
        action: 'Consider implementing data windowing',
        priority: 6
      });
    }

    // GPU recommendations
    if (metrics.gpuMemoryUsage > 500) {
      recs.push({
        type: 'warning',
        message: 'High GPU memory usage',
        action: 'Optimize GPU buffer management',
        priority: 5
      });
    }

    // WebGPU recommendations
    if (!metrics.webgpuEnabled && navigator.gpu) {
      recs.push({
        type: 'info',
        message: 'WebGPU available but not enabled',
        action: 'Enable WebGPU for better performance',
        priority: 3
      });
    }

    // Render time recommendations
    if (metrics.renderTime > 16.67) { // More than one frame at 60fps
      recs.push({
        type: 'warning',
        message: 'Render time exceeding frame budget',
        action: 'Optimize rendering pipeline or reduce complexity',
        priority: 4
      });
    }

    return recs.sort((a, b) => b.priority - a.priority);
  }, [metrics]);

  // Calculate performance trends
  const trends = useMemo(() => {
    if (performanceHistory.length < 10) return null;

    const recent = performanceHistory.slice(-10);
    const older = performanceHistory.slice(-20, -10);

    const avgFPSRecent = recent.reduce((sum, m) => sum + m.fps, 0) / recent.length;
    const avgFPSOlder = older.reduce((sum, m) => sum + m.fps, 0) / older.length;

    const avgMemoryRecent = recent.reduce((sum, m) => sum + m.memoryUsage, 0) / recent.length;
    const avgMemoryOlder = older.reduce((sum, m) => sum + m.memoryUsage, 0) / older.length;

    return {
      fps: avgFPSRecent - avgFPSOlder,
      memory: avgMemoryRecent - avgMemoryOlder
    };
  }, [performanceHistory]);

  const getStatusColor = (value: number, thresholds: { good: number; warning: number; error: number }) => {
    if (value >= thresholds.good) return 'text-green-400';
    if (value >= thresholds.warning) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getRecommendationIcon = (type: PerformanceRecommendation['type']) => {
    switch (type) {
      case 'error': return '🚨';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
    }
  };

  if (compact) {
    return (
      <div className={`performance-monitor-compact fixed top-4 right-4 bg-black/80 text-white p-2 rounded-lg font-mono text-xs ${className}`}>
        <div className="flex items-center gap-2">
          <div className={`font-bold ${getStatusColor(metrics.fps, { good: 50, warning: 30, error: 0 })}`}>
            {metrics.fps} FPS
          </div>
          <div className="text-gray-400">|</div>
          <div className={getStatusColor(metrics.memoryUsage, { good: 50, warning: 75, error: 100 })}>
            {metrics.memoryUsage.toFixed(0)}MB
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="ml-2 text-gray-400 hover:text-white"
          >
            {isExpanded ? '−' : '+'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`performance-monitor fixed top-4 right-4 bg-black/90 text-white p-4 rounded-lg font-mono text-sm max-w-sm ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-lg">Performance Monitor</h3>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-gray-400 hover:text-white"
        >
          {isExpanded ? '−' : '+'}
        </button>
      </div>

      {isExpanded && (
        <>
          {/* Core Metrics */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <div className="text-gray-400 text-xs">FPS</div>
              <div className={`text-lg font-bold ${getStatusColor(metrics.fps, { good: 50, warning: 30, error: 0 })}`}>
                {metrics.fps}
                {trends && (
                  <span className={`text-xs ml-1 ${trends.fps > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    ({trends.fps > 0 ? '+' : ''}{trends.fps.toFixed(1)})
                  </span>
                )}
              </div>
            </div>

            <div>
              <div className="text-gray-400 text-xs">Memory</div>
              <div className={`text-lg font-bold ${getStatusColor(metrics.memoryUsage, { good: 50, warning: 75, error: 100 })}`}>
                {metrics.memoryUsage.toFixed(1)}MB
                {trends && (
                  <span className={`text-xs ml-1 ${trends.memory > 0 ? 'text-red-400' : 'text-green-400'}`}>
                    ({trends.memory > 0 ? '+' : ''}{trends.memory.toFixed(1)})
                  </span>
                )}
              </div>
            </div>

            <div>
              <div className="text-gray-400 text-xs">Render Time</div>
              <div className={`font-bold ${getStatusColor(metrics.renderTime, { good: 8, warning: 16, error: 33 })}`}>
                {metrics.renderTime.toFixed(1)}ms
              </div>
            </div>

            <div>
              <div className="text-gray-400 text-xs">Data Processing</div>
              <div className="font-bold text-blue-400">
                {metrics.dataProcessingTime.toFixed(1)}ms
              </div>
            </div>
          </div>

          {/* GPU Metrics */}
          {gpuMetrics.supported && (
            <div className="border-t border-gray-700 pt-3 mb-4">
              <div className="text-gray-400 text-xs mb-2">GPU Metrics</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-gray-400">GPU Memory:</span>
                  <span className="ml-1 text-purple-400">{(metrics.gpuMemoryUsage / 1024 / 1024).toFixed(1)}MB</span>
                </div>
                <div>
                  <span className="text-gray-400">Compute:</span>
                  <span className="ml-1 text-cyan-400">{metrics.computeTime.toFixed(1)}ms</span>
                </div>
                <div>
                  <span className="text-gray-400">Renderer:</span>
                  <span className="ml-1 text-green-400">{metrics.rendererType}</span>
                </div>
                <div>
                  <span className="text-gray-400">WebGPU:</span>
                  <span className={`ml-1 ${metrics.webgpuEnabled ? 'text-green-400' : 'text-red-400'}`}>
                    {metrics.webgpuEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Recommendations */}
          {showRecommendations && recommendations.length > 0 && (
            <div className="border-t border-gray-700 pt-3">
              <div className="text-gray-400 text-xs mb-2">Recommendations</div>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {recommendations.slice(0, 3).map((rec, index) => (
                  <div key={index} className="flex items-start gap-2 text-xs">
                    <span className="text-sm">{getRecommendationIcon(rec.type)}</span>
                    <div className="flex-1">
                      <div className={`font-medium ${
                        rec.type === 'error' ? 'text-red-400' :
                        rec.type === 'warning' ? 'text-yellow-400' : 'text-blue-400'
                      }`}>
                        {rec.message}
                      </div>
                      {rec.action && (
                        <div className="text-gray-400 text-xs mt-1">{rec.action}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Performance History Indicator */}
          <div className="border-t border-gray-700 pt-3 mt-3">
            <div className="text-gray-400 text-xs mb-2">History ({performanceHistory.length}s)</div>
            <div className="flex gap-1 h-4">
              {performanceHistory.slice(-20).map((m, i) => (
                <div
                  key={i}
                  className={`flex-1 rounded-sm ${
                    m.fps >= 50 ? 'bg-green-500' :
                    m.fps >= 30 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ opacity: 0.3 + (i / 20) * 0.7 }}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default PerformanceMonitor;