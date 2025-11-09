'use client';

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FilterOptions } from '@/lib/types';

interface FilterPanelProps {
  categories: string[];
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
  onReset: () => void;
}

export default function FilterPanel({
  categories,
  filters,
  onFiltersChange,
  onReset
}: FilterPanelProps) {
  const [localValueRange, setLocalValueRange] = useState<[number, number]>(
    filters.valueRange
  );
  
  const handleCategoryToggle = useCallback((category: string) => {
    const newCategories = filters.categories.includes(category)
      ? filters.categories.filter(c => c !== category)
      : [...filters.categories, category];
    
    onFiltersChange({
      ...filters,
      categories: newCategories
    });
  }, [filters, onFiltersChange]);
  
  const handleValueRangeChange = useCallback((type: 'min' | 'max', value: string) => {
    const numValue = parseFloat(value) || 0;
    const newRange: [number, number] = type === 'min'
      ? [numValue, Math.max(numValue, localValueRange[1])]
      : [Math.min(localValueRange[0], numValue), numValue];

    setLocalValueRange(newRange);
  }, [localValueRange]);
  
  const applyValueRange = useCallback(() => {
    onFiltersChange({
      ...filters,
      valueRange: localValueRange
    });
  }, [filters, localValueRange, onFiltersChange]);
  
  const handleTimeRangeChange = useCallback((type: 'start' | 'end', value: string) => {
    const timestamp = new Date(value).getTime();
    if (isNaN(timestamp)) return;
    
    onFiltersChange({
      ...filters,
      timeRange: {
        ...filters.timeRange,
        [type]: timestamp
      }
    });
  }, [filters, onFiltersChange]);
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg">Filters</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Categories Filter */}
        <div>
          <h4 className="font-medium mb-3">Categories</h4>
          <div className="flex flex-wrap gap-2">
            {categories.map(category => (
              <Badge
                key={category}
                variant={filters.categories.includes(category) ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => handleCategoryToggle(category)}
              >
                {category}
              </Badge>
            ))}
          </div>
          {filters.categories.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-2"
              onClick={() => onFiltersChange({ ...filters, categories: [] })}
            >
              Clear Categories
            </Button>
          )}
        </div>
        
        {/* Value Range Filter */}
        <div>
          <h4 className="font-medium mb-3">Value Range</h4>
          <div className="flex items-center gap-2">
            <input
              type="number"
              placeholder="Min"
              className="w-24 px-2 py-1 border rounded"
              value={localValueRange[0]}
              onChange={(e) => handleValueRangeChange('min', e.target.value)}
            />
            <span>-</span>
            <input
              type="number"
              placeholder="Max"
              className="w-24 px-2 py-1 border rounded"
              value={localValueRange[1]}
              onChange={(e) => handleValueRangeChange('max', e.target.value)}
            />
            <Button size="sm" onClick={applyValueRange}>
              Apply
            </Button>
          </div>
        </div>
        
        {/* Time Range Filter */}
        <div>
          <h4 className="font-medium mb-3">Time Range</h4>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <label className="text-sm w-16">From:</label>
              <input
                type="datetime-local"
                className="flex-1 px-2 py-1 border rounded"
                value={new Date(filters.timeRange.start).toISOString().slice(0, 16)}
                onChange={(e) => handleTimeRangeChange('start', e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm w-16">To:</label>
              <input
                type="datetime-local"
                className="flex-1 px-2 py-1 border rounded"
                value={new Date(filters.timeRange.end).toISOString().slice(0, 16)}
                onChange={(e) => handleTimeRangeChange('end', e.target.value)}
              />
            </div>
          </div>
        </div>
        
        {/* Reset Button */}
        <div className="pt-4 border-t">
          <Button variant="outline" onClick={onReset} className="w-full">
            Reset All Filters
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}