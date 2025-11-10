'use client';

import React, { createContext, useContext, useState, useCallback, useMemo, useTransition, ReactNode } from 'react';
import { FilterOptions, TimeRange, AggregationLevel } from '@/lib/types';

interface DashboardContextValue {
  filters: FilterOptions;
  aggregationLevel: AggregationLevel;
  showGrid: boolean;
  showAxes: boolean;
  animatedCharts: boolean;
  setFilters: (filters: FilterOptions | ((prev: FilterOptions) => FilterOptions)) => void;
  setAggregationLevel: (level: AggregationLevel) => void;
  setShowGrid: (show: boolean) => void;
  setShowAxes: (show: boolean) => void;
  setAnimatedCharts: (animated: boolean) => void;
  resetFilters: () => void;
  updateTimeRange: (range: TimeRange) => void;
  // Stable filter keys for memoization
  filtersKey: string;
}

const DashboardContext = createContext<DashboardContextValue | undefined>(undefined);

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [isPending, startTransition] = useTransition();

  // Initialize filters with default values
  const [filters, setFiltersState] = useState<FilterOptions>({
    categories: [],
    valueRange: [0, 200],
    timeRange: {
      start: Date.now() - 5 * 60 * 1000,
      end: Date.now()
    }
  });

  const [aggregationLevel, setAggregationLevel] = useState<AggregationLevel>({
    type: 'none',
    enabled: false
  });

  const [showGrid, setShowGrid] = useState(true);
  const [showAxes, setShowAxes] = useState(true);
  const [animatedCharts, setAnimatedCharts] = useState(false);

  // Create stable key for filters to use in memoization
  const filtersKey = useMemo(() => 
    `${filters.categories.sort().join(',')}-${filters.valueRange[0]}-${filters.valueRange[1]}-${filters.timeRange.start}-${filters.timeRange.end}`,
    [filters.categories, filters.valueRange, filters.timeRange]
  );

  // Wrap setFilters in transition for non-blocking updates
  const setFilters = useCallback((filtersOrUpdater: FilterOptions | ((prev: FilterOptions) => FilterOptions)) => {
    startTransition(() => {
      if (typeof filtersOrUpdater === 'function') {
        setFiltersState(filtersOrUpdater);
      } else {
        setFiltersState(filtersOrUpdater);
      }
    });
  }, []);

  const resetFilters = useCallback(() => {
    startTransition(() => {
      setFiltersState({
        categories: [],
        valueRange: [0, 200],
        timeRange: {
          start: Date.now() - 5 * 60 * 1000,
          end: Date.now()
        }
      });
      setAggregationLevel({ type: 'none', enabled: false });
    });
  }, []);

  const updateTimeRange = useCallback((range: TimeRange) => {
    startTransition(() => {
      setFiltersState(prev => ({
        ...prev,
        timeRange: range
      }));
    });
  }, []);

  const value = useMemo<DashboardContextValue>(() => ({
    filters,
    aggregationLevel,
    showGrid,
    showAxes,
    animatedCharts,
    setFilters,
    setAggregationLevel,
    setShowGrid,
    setShowAxes,
    setAnimatedCharts,
    resetFilters,
    updateTimeRange,
    filtersKey
  }), [
    filters,
    aggregationLevel,
    showGrid,
    showAxes,
    animatedCharts,
    setFilters,
    resetFilters,
    updateTimeRange,
    filtersKey
  ]);

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboardContext() {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error('useDashboardContext must be used within a DashboardProvider');
  }
  return context;
}