'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTableRow } from '@/lib/types';
import { useVirtualization } from '@/hooks/useVirtualization';

interface DataTableProps {
   data: DataTableRow[];
   height?: number;
   itemHeight?: number;
   searchable?: boolean;
   sortable?: boolean;
   isLoading?: boolean;
   paginated?: boolean;
   pageSize?: number;
 }

export default function DataTable({
   data,
   height = 400,
   itemHeight = 40,
   searchable = true,
   sortable = true,
   isLoading = false,
   paginated = false,
   pageSize = 50
 }: DataTableProps) {
   const [searchTerm, setSearchTerm] = useState('');
   const [sortColumn, setSortColumn] = useState<keyof DataTableRow>('timestamp');
   const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
   const [currentPage, setCurrentPage] = useState(1);

  // Filter data based on search term
  const filteredData = useMemo(() => {
    if (!searchTerm) return data;

    const lowerSearchTerm = searchTerm.toLowerCase();
    return data.filter(row =>
      row.id.toLowerCase().includes(lowerSearchTerm) ||
      row.category.toLowerCase().includes(lowerSearchTerm) ||
      row.value.toString().includes(lowerSearchTerm) ||
      new Date(row.timestamp).toLocaleString().toLowerCase().includes(lowerSearchTerm)
    );
  }, [data, searchTerm]);

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortable) return filteredData;

    return [...filteredData].sort((a, b) => {
      let aValue = a[sortColumn];
      let bValue = b[sortColumn];

      // Handle different data types
      if (aValue instanceof Date) aValue = aValue.getTime();
      if (bValue instanceof Date) bValue = bValue.getTime();

      if (typeof aValue === 'string') aValue = aValue.toLowerCase();
      if (typeof bValue === 'string') bValue = bValue.toLowerCase();

      if (aValue == null || bValue == null) return 0;

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortable, sortColumn, sortDirection]);

  // Pagination logic
  const totalPages = Math.ceil(sortedData.length / pageSize);
  const paginatedData = paginated ? sortedData.slice((currentPage - 1) * pageSize, currentPage * pageSize) : sortedData;

  // Virtualization (only for non-paginated or when pagination is disabled)
  const {
    visibleItems,
    totalHeight,
    scrollTop,
    setScrollTop,
    scrollToIndex,
    getVisibleRange
  } = useVirtualization(paginated ? paginatedData : sortedData, {
    containerHeight: height,
    itemHeight,
    overscan: 5
  });

  const visibleRange = getVisibleRange();

  const handleSort = useCallback((column: keyof DataTableRow) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  }, [sortColumn]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, [setScrollTop]);

  const formatCellValue = useCallback((value: any, key: keyof DataTableRow): string => {
    if (key === 'timestamp') {
      return new Date(value).toLocaleString();
    }
    if (key === 'value') {
      return typeof value === 'number' ? value.toFixed(2) : String(value);
    }
    if (key === 'metadata') {
      // Don't display metadata as [object Object], show a summary instead
      if (value && typeof value === 'object') {
        const keys = Object.keys(value);
        return keys.length > 0 ? `${keys.length} props` : 'Empty';
      }
      return String(value);
    }
    return String(value);
  }, []);

  // Add loading state display
  if (isLoading && data.length === 0) {
    return (
      <Card className="w-full">
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading data...</p>
        </CardContent>
      </Card>
    );
  }
  
  const columns = [
    { key: 'id' as keyof DataTableRow, label: 'ID', width: '20%' },
    { key: 'timestamp' as keyof DataTableRow, label: 'Timestamp', width: '25%' },
    { key: 'value' as keyof DataTableRow, label: 'Value', width: '15%' },
    { key: 'category' as keyof DataTableRow, label: 'Category', width: '20%' },
    { key: 'metadata' as keyof DataTableRow, label: 'Metadata', width: '20%' }
  ];
  
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            Data Table ({sortedData.length.toLocaleString()} rows{paginated && ` - Page ${currentPage} of ${totalPages}`})
          </CardTitle>
          {searchable && (
            <div className="flex items-center gap-2">
              <Input
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-48"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchTerm('')}
                >
                  Clear
                </Button>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gray-50 border-b p-2">
            <div className="flex" style={{ height: `${itemHeight}px` }}>
              {columns.map(column => (
                <div
                  key={column.key}
                  className="flex items-center px-2 font-medium text-sm"
                  style={{ width: column.width }}
                >
                  {sortable && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="p-0 h-auto font-normal"
                      onClick={() => handleSort(column.key)}
                    >
                      {column.label}
                      {sortColumn === column.key && (
                        <span className="ml-1">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </Button>
                  )}
                  {!sortable && column.label}
                </div>
              ))}
            </div>
          </div>
          
          {/* Virtualized Table Body */}
          <div
            className="relative overflow-auto"
            style={{ height: `${height}px` }}
            onScroll={handleScroll}
          >
            <div style={{ height: `${totalHeight}px`, position: 'relative' }}>
              {visibleItems.map((item, index) => (
                 <div
                   key={item.id}
                   className="absolute w-full border-b hover:bg-gray-50"
                   style={{
                     height: `${itemHeight}px`,
                     top: `${(visibleRange.start + index) * itemHeight}px`,
                     transform: 'translateZ(0)' // Hardware acceleration
                   }}
                 >
                   <div className="flex h-full items-center px-2">
                     {columns.map(column => (
                       <div
                         key={column.key}
                         className="truncate text-sm"
                         style={{ width: column.width }}
                         title={formatCellValue(item[column.key], column.key)}
                       >
                         {formatCellValue(item[column.key], column.key)}
                       </div>
                     ))}
                   </div>
                 </div>
               ))}
            </div>
          </div>
        </div>
        
        {/* Footer with stats and pagination */}
        <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
          <div>
            {paginated ? (
              `Showing ${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, sortedData.length)} of ${sortedData.length} rows`
            ) : (
              `Showing ${visibleItems.length} of ${sortedData.length} rows`
            )}
            {searchTerm && ` (filtered from ${data.length} total)`}
          </div>
          <div className="flex items-center gap-2">
            {paginated ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                >
                  First
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <span className="px-2">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                >
                  Last
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => scrollToIndex(0)}
                  disabled={sortedData.length === 0}
                >
                  First
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => scrollToIndex(sortedData.length - 1)}
                  disabled={sortedData.length === 0}
                >
                  Last
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}