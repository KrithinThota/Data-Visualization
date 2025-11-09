'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { DataTableRow } from '@/lib/types';

interface UseVirtualizationOptions {
  containerHeight: number;
  itemHeight: number;
  overscan?: number;
}

interface UseVirtualizationReturn {
  visibleItems: DataTableRow[];
  totalHeight: number;
  scrollTop: number;
  setScrollTop: (scrollTop: number) => void;
  scrollToIndex: (index: number) => void;
  getVisibleRange: () => { start: number; end: number };
}

export function useVirtualization<T extends DataTableRow>(
  items: T[],
  options: UseVirtualizationOptions
): UseVirtualizationReturn {
  const { containerHeight, itemHeight, overscan = 5 } = options;
  
  const [scrollTop, setScrollTop] = useState(0);
  
  const totalHeight = useMemo(() => {
    return items.length * itemHeight;
  }, [items.length, itemHeight]);
  
  const visibleRange = useMemo(() => {
    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const end = Math.min(items.length, start + visibleCount + overscan * 2);
    
    return { start, end };
  }, [scrollTop, itemHeight, containerHeight, items.length, overscan]);
  
  const visibleItems = useMemo(() => {
    const { start, end } = visibleRange;
    return items.slice(start, end).map((item, index) => ({
      ...item,
      _virtualIndex: start + index,
      _top: (start + index) * itemHeight
    }));
  }, [items, visibleRange, itemHeight]);
  
  const scrollToIndex = useCallback((index: number) => {
    const targetScrollTop = Math.max(0, index * itemHeight - containerHeight / 2);
    setScrollTop(targetScrollTop);
  }, [itemHeight, containerHeight]);
  
  const getVisibleRange = useCallback(() => {
    return visibleRange;
  }, [visibleRange]);
  
  return {
    visibleItems,
    totalHeight,
    scrollTop,
    setScrollTop,
    scrollToIndex,
    getVisibleRange
  };
}