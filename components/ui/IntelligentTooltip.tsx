'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { DataPoint, TooltipData } from '@/types/dashboard';

interface IntelligentTooltipProps {
  data: DataPoint[];
  children: (onHover: (point: DataPoint | null, event: MouseEvent) => void) => React.ReactNode;
  enabled?: boolean;
}

export const IntelligentTooltip: React.FC<IntelligentTooltipProps> = ({
  data,
  children,
  enabled = true
}) => {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const analyzeContext = useCallback((point: DataPoint): TooltipData['context'] => {
    const timeWindow = 5 * 60 * 1000; // 5 minutes window
    const nearby = data.filter(p =>
      Math.abs(p.timestamp - point.timestamp) < timeWindow
    );

    // Calculate trend
    const sortedNearby = nearby.sort((a, b) => a.timestamp - b.timestamp);
    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';

    if (sortedNearby.length > 3) {
      const firstHalf = sortedNearby.slice(0, Math.floor(sortedNearby.length / 2));
      const secondHalf = sortedNearby.slice(Math.floor(sortedNearby.length / 2));

      const firstAvg = firstHalf.reduce((sum, p) => sum + p.value, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((sum, p) => sum + p.value, 0) / secondHalf.length;

      const changePercent = Math.abs((secondAvg - firstAvg) / firstAvg);
      if (changePercent > 0.05) { // 5% change threshold
        trend = secondAvg > firstAvg ? 'increasing' : 'decreasing';
      }
    }

    // Detect outliers using IQR method
    const values = nearby.map(p => p.value).sort((a, b) => a - b);
    const q1 = values[Math.floor(values.length * 0.25)];
    const q3 = values[Math.floor(values.length * 0.75)];
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;

    const outliers = nearby.filter(p => p.value < lowerBound || p.value > upperBound);

    return { nearby, trend, outliers };
  }, [data]);

  const handleHover = useCallback((point: DataPoint | null, event: MouseEvent) => {
    if (!enabled) return;

    if (!point) {
      setTooltip(null);
      return;
    }

    const canvas = event.target as HTMLCanvasElement;
    const rect = canvas.getBoundingClientRect();

    setTooltip({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      data: point,
      context: analyzeContext(point)
    });
  }, [enabled, analyzeContext]);

  useEffect(() => {
    if (tooltip && tooltipRef.current) {
      const tooltipEl = tooltipRef.current;
      const rect = tooltipEl.getBoundingClientRect();

      // Position tooltip to avoid going off-screen
      let left = tooltip.x + 15;
      let top = tooltip.y - 10;

      if (left + rect.width > window.innerWidth) {
        left = tooltip.x - rect.width - 15;
      }

      if (top + rect.height > window.innerHeight) {
        top = tooltip.y - rect.height - 10;
      }

      // Ensure tooltip stays within viewport bounds
      left = Math.max(10, Math.min(left, window.innerWidth - rect.width - 10));
      top = Math.max(10, Math.min(top, window.innerHeight - rect.height - 10));

      tooltipEl.style.left = `${left}px`;
      tooltipEl.style.top = `${top}px`;
    }
  }, [tooltip]);

  const formatValue = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toFixed(2);
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing': return '↗️';
      case 'decreasing': return '↘️';
      default: return '→';
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'increasing': return 'text-green-400';
      case 'decreasing': return 'text-red-400';
      default: return 'text-yellow-400';
    }
  };

  return (
    <>
      {children(handleHover)}

      {tooltip && (
        <div
          ref={tooltipRef}
          className="intelligent-tooltip fixed bg-black/95 text-white p-4 rounded-lg shadow-2xl pointer-events-none z-50 max-w-sm border border-white/20 backdrop-blur-sm"
          role="tooltip"
          aria-live="polite"
        >
          <div className="font-semibold text-lg mb-2">
            {new Date(tooltip.data.timestamp).toLocaleString()}
          </div>

          <div className="mb-3">
            <div className="text-2xl font-bold">
              {formatValue(tooltip.data.value)}
            </div>
            <div className="text-sm opacity-75">
              Category: {tooltip.data.category}
            </div>
          </div>

          <div className="border-t border-white/20 pt-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">Trend:</span>
              <span className={`font-semibold ${getTrendColor(tooltip.context.trend)}`}>
                {getTrendIcon(tooltip.context.trend)} {tooltip.context.trend}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm">Nearby points:</span>
              <span className="font-semibold">{tooltip.context.nearby.length}</span>
            </div>

            {tooltip.context.outliers.length > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-orange-400">Outliers detected:</span>
                <span className="font-semibold text-orange-400">{tooltip.context.outliers.length}</span>
              </div>
            )}

            {/* Show min/max in context */}
            {tooltip.context.nearby.length > 0 && (
              <div className="mt-3 pt-2 border-t border-white/10">
                <div className="text-xs opacity-75 mb-1">Context (5min window):</div>
                <div className="flex justify-between text-sm">
                  <span>Min: {formatValue(Math.min(...tooltip.context.nearby.map(p => p.value)))}</span>
                  <span>Max: {formatValue(Math.max(...tooltip.context.nearby.map(p => p.value)))}</span>
                </div>
              </div>
            )}
          </div>

          {/* Tooltip arrow */}
          <div className="absolute w-3 h-3 bg-black/95 border-r border-b border-white/20 transform rotate-45 -bottom-1.5 left-4"></div>
        </div>
      )}
    </>
  );
};