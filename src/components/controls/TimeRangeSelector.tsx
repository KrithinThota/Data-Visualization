'use client';

import React, { useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TimeRange, AggregationLevel } from '@/lib/types';

interface TimeRangeSelectorProps {
  selectedRange: TimeRange;
  aggregationLevel: AggregationLevel;
  onRangeChange: (range: TimeRange) => void;
  onAggregationChange: (level: AggregationLevel) => void;
}

const PRESET_RANGES = [
  { label: 'Last 5 min', duration: 5 * 60 * 1000 },
  { label: 'Last 15 min', duration: 15 * 60 * 1000 },
  { label: 'Last 30 min', duration: 30 * 60 * 1000 },
  { label: 'Last 1 hour', duration: 60 * 60 * 1000 },
  { label: 'Last 3 hours', duration: 3 * 60 * 60 * 1000 },
  { label: 'Last 6 hours', duration: 6 * 60 * 60 * 1000 },
];

const AGGREGATION_LEVELS: Array<{ type: AggregationLevel['type']; label: string }> = [
  { type: 'none', label: 'No Aggregation' },
  { type: '1min', label: '1 Minute' },
  { type: '5min', label: '5 Minutes' },
  { type: '1hour', label: '1 Hour' },
];

export default function TimeRangeSelector({
  selectedRange,
  aggregationLevel,
  onRangeChange,
  onAggregationChange
}: TimeRangeSelectorProps) {
  const handlePresetRange = useCallback((duration: number) => {
    const end = Date.now();
    const start = end - duration;
    onRangeChange({ start, end });
  }, [onRangeChange]);
  
  const handleCustomRange = useCallback((type: 'start' | 'end', value: string) => {
    const timestamp = new Date(value).getTime();
    if (isNaN(timestamp)) return;

    const newRange = {
      ...selectedRange,
      [type]: timestamp
    };

    // Ensure start is before end
    if (type === 'start' && timestamp >= selectedRange.end) {
      newRange.end = timestamp + (selectedRange.end - selectedRange.start);
    } else if (type === 'end' && timestamp <= selectedRange.start) {
      newRange.start = timestamp - (selectedRange.end - selectedRange.start);
    }

    onRangeChange(newRange);
  }, [selectedRange, onRangeChange]);
  
  const handleAggregationToggle = useCallback((type: AggregationLevel['type']) => {
    onAggregationChange({
      type,
      enabled: type !== 'none'
    });
  }, [onAggregationChange]);
  
  const formatDuration = (ms: number): string => {
    const minutes = Math.floor(ms / (60 * 1000));
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m`;
    }
    return `${minutes}m`;
  };
  
  const currentDuration = selectedRange.end - selectedRange.start;
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg">Time Range</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Range Display */}
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="text-sm text-gray-600">Current Range:</div>
          <div className="font-medium">
            {formatDuration(currentDuration)} ({new Date(selectedRange.start).toLocaleTimeString()} - {new Date(selectedRange.end).toLocaleTimeString()})
          </div>
        </div>
        
        {/* Preset Ranges */}
        <div>
          <h4 className="font-medium mb-3">Quick Select</h4>
          <div className="grid grid-cols-2 gap-2">
            {PRESET_RANGES.map(range => (
              <Button
                key={range.label}
                variant="outline"
                size="sm"
                onClick={() => handlePresetRange(range.duration)}
                className="justify-start"
              >
                {range.label}
              </Button>
            ))}
          </div>
        </div>
        
        {/* Custom Range */}
        <div>
          <h4 className="font-medium mb-3">Custom Range</h4>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <label className="text-sm w-12">From:</label>
              <input
                type="datetime-local"
                className="flex-1 px-2 py-1 border rounded text-sm"
                value={new Date(selectedRange.start).toISOString().slice(0, 16)}
                onChange={(e) => handleCustomRange('start', e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm w-12">To:</label>
              <input
                type="datetime-local"
                className="flex-1 px-2 py-1 border rounded text-sm"
                value={new Date(selectedRange.end).toISOString().slice(0, 16)}
                onChange={(e) => handleCustomRange('end', e.target.value)}
              />
            </div>
          </div>
        </div>
        
        {/* Aggregation Level */}
        <div>
          <h4 className="font-medium mb-3">Data Aggregation</h4>
          <div className="space-y-2">
            {AGGREGATION_LEVELS.map(level => (
              <Badge
                key={level.type}
                variant={aggregationLevel.type === level.type ? "default" : "outline"}
                className="cursor-pointer mr-2 mb-2"
                onClick={() => handleAggregationToggle(level.type)}
              >
                {level.label}
              </Badge>
            ))}
          </div>
          {aggregationLevel.enabled && (
            <p className="text-xs text-gray-500 mt-2">
              Data will be aggregated by {aggregationLevel.type} intervals for better performance
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}