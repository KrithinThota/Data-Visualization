'use client';

import React, { useState, useEffect, useCallback, useMemo, Suspense, memo, useDeferredValue } from 'react';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { DashboardProvider, useDashboardContext } from '@/contexts/DashboardContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { DataPoint, FilterOptions, TimeRange, AggregationLevel, DataTableRow, HeatmapData } from '@/lib/types';
import { useDataStream } from '@/hooks/useDataStream';
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';
import { useWorkerFilters } from '@/hooks/useWebWorker';
import { useOptimizedDataProcessing } from '@/hooks/useOptimizedDataProcessing';
import { generateHeatmapData } from '@/lib/dataGenerator';

// Import chart components
import LineChart from '@/components/charts/LineChart';
import BarChart from '@/components/charts/BarChart';
import ScatterPlot from '@/components/charts/ScatterPlot';
import Heatmap from '@/components/charts/Heatmap';

// Import control components
import FilterPanel from '@/components/controls/FilterPanel';
import TimeRangeSelector from '@/components/controls/TimeRangeSelector';
import DataTable from '@/components/ui/DataTable';
import PerformanceMonitor from '@/components/ui/PerformanceMonitor';

const DashboardContent = () => {
  // Get dashboard context
  const {
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
  } = useDashboardContext();

  // Data stream state
  const [streamOptions, setStreamOptions] = useState({
    updateInterval: 100,
    maxDataPoints: 10000,
    enableAggregation: false
  });

  const { data, isConnected, error, lastUpdate, totalPoints, connect, disconnect } = useDataStream(streamOptions);

  // Auto-connect data stream on mount
  useEffect(() => {
    // Small delay to ensure component is fully mounted
    const timer = setTimeout(() => {
      connect();
    }, 100);

    return () => {
      clearTimeout(timer);
      disconnect();
    };
  }, [connect, disconnect]);
  
  // Web Worker for data processing
  const {
    isWorkerReady,
    filterData: workerFilterData,
    aggregateData: workerAggregateData,
    calculateBounds: workerCalculateBounds,
    processHeatmap: workerProcessHeatmap,
    workerError,
    clearError
  } = useWorkerFilters();
  
  // Performance monitoring
  const {
    metrics,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    resetMetrics,
    averageRenderTime,
    peakMemoryUsage
  } = usePerformanceMonitor();

  // Use optimized data processing hook
  const { processedData, isProcessing } = useOptimizedDataProcessing({
    data,
    filters,
    aggregationLevel,
    filtersKey,
    isWorkerReady
  });

  // Memoized expensive computations
  const chartWidth = useMemo(() =>
    Math.min(800, typeof window !== 'undefined' ? window.innerWidth - 100 : 800),
    []
  );
  
  // Chart display options
  const [selectedChart, setSelectedChart] = useState<'line' | 'bar' | 'scatter' | 'heatmap'>('line');

  // Deferred values for non-critical updates (Concurrent Feature)
  const deferredProcessedData = useDeferredValue(processedData);
  
  // Get unique categories from data - memoized to prevent unnecessary recalculations
  const categories = useMemo(() => {
    if (!data || data.length === 0) return [];
    const uniqueCategories = new Set(data.map(point => point.category));
    return Array.from(uniqueCategories).sort();
  }, [data?.length]); // Only depend on data length, not the entire data array
  
  // Generate heatmap data from processed data with unique keys and grid aggregation
  const heatmapData: HeatmapData[] = useMemo(() => {
    if (!processedData || processedData.length === 0) return [];

    const timeRange = filters.timeRange.end - filters.timeRange.start;
    if (timeRange <= 0) return [];

    const gridSize = 50;
    const gridMap = new Map<string, { x: number; y: number; values: number[]; categories: string[] }>();

    // Aggregate points into grid cells to avoid duplicates
    processedData.slice(-1000).forEach(point => {
      const x = Math.floor(Math.max(0, Math.min(gridSize - 1, ((point.timestamp - filters.timeRange.start) / timeRange) * gridSize)));
      const y = Math.floor(Math.max(0, Math.min(gridSize - 1, (point.value / 200) * gridSize)));
      const key = `${x}-${y}`;

      if (!gridMap.has(key)) {
        gridMap.set(key, { x, y, values: [], categories: [] });
      }

      const cell = gridMap.get(key)!;
      cell.values.push(point.value);
      if (!cell.categories.includes(point.category)) {
        cell.categories.push(point.category);
      }
    });

    // Convert grid map to heatmap data with unique keys
    return Array.from(gridMap.entries()).map(([key, cell]) => ({
      x: cell.x,
      y: cell.y,
      value: cell.values.reduce((sum, v) => sum + v, 0) / cell.values.length, // Average value
      label: cell.categories.join(', ')
    }));
  }, [processedData?.length, filters.timeRange.start, filters.timeRange.end]);
  
  // Convert to DataTableRow format - memoized for performance with unique IDs
  const tableData: DataTableRow[] = useMemo(() => {
    if (!processedData || processedData.length === 0) return [];
    return processedData.slice(-1000).map((point, index) => ({
      id: point.metadata?.id || `${point.timestamp}-${index}`, // Unique ID combining timestamp and index
      timestamp: point.timestamp,
      value: point.value,
      category: point.category,
      metadata: point.metadata
    }));
  }, [processedData?.length]); // Only depend on length to avoid unnecessary recalculations
  
  // Handle chart performance updates - memoized callback (React Optimization)
  const handleChartPerformance = useCallback((chartMetrics: any) => {
    if (isMonitoring && metrics) {
      // Update metrics with chart-specific data
      // This would normally update the performance monitor
    }
  }, [isMonitoring, metrics]);

  // Add data processing delay tracking
  const [dataProcessingDelays, setDataProcessingDelays] = useState<number[]>([]);
  const [lastDataProcessingTime, setLastDataProcessingTime] = useState<number>(0);

  useEffect(() => {
    if (data.length > 0) {
      const processingStart = performance.now();
      // Simulate data processing delay
      setTimeout(() => {
        const processingEnd = performance.now();
        const delay = processingEnd - processingStart;
        setLastDataProcessingTime(delay);
        setDataProcessingDelays(prev => {
          const newDelays = [...prev, delay];
          return newDelays.slice(-100); // Keep last 100 measurements
        });
      }, Math.random() * 50); // Random processing delay up to 50ms
    }
  }, [data.length]);
  
  // Start/stop data stream - memoized callback (React Optimization)
  const toggleDataStream = useCallback(() => {
    if (isConnected) {
      disconnect();
    } else {
      connect();
    }
  }, [isConnected, connect, disconnect]);
  
  return (
    <ErrorBoundary>
      <Suspense fallback={
        <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-lg text-gray-600">Loading Dashboard...</p>
          </div>
        </div>
      }>
        <div className="min-h-screen bg-gray-50 p-4">
          <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Performance Dashboard</h1>
            <p className="text-gray-600">Real-time data visualization with 10,000+ points</p>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant={isConnected ? "default" : "secondary"}>
              {isConnected ? 'Streaming' : 'Disconnected'}
            </Badge>
            <Button onClick={toggleDataStream} disabled={false}>
              {isConnected ? 'Stop Stream' : 'Start Stream'}
            </Button>
          </div>
        </div>
        
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">{totalPoints.toLocaleString()}</div>
              <div className="text-sm text-gray-600">Total Data Points</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">{processedData.length.toLocaleString()}</div>
              <div className="text-sm text-gray-600">Visible Points</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-purple-600">{streamOptions.updateInterval}ms</div>
              <div className="text-sm text-gray-600">Update Interval</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-orange-600">
                {metrics ? `${metrics.fps.toFixed(1)} FPS` : 'N/A'}
              </div>
              <div className="text-sm text-gray-600">Current FPS</div>
            </CardContent>
          </Card>
        </div>
        
        {/* Main Content */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Sidebar Controls */}
          <div className="xl:col-span-1 space-y-6">
            {/* Chart Options */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Chart Options</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="show-grid"
                    checked={showGrid}
                    onCheckedChange={setShowGrid}
                  />
                  <Label htmlFor="show-grid">Show Grid</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="show-axes"
                    checked={showAxes}
                    onCheckedChange={setShowAxes}
                  />
                  <Label htmlFor="show-axes">Show Axes</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="animated"
                    checked={animatedCharts}
                    onCheckedChange={setAnimatedCharts}
                  />
                  <Label htmlFor="animated">Animated Charts</Label>
                </div>
              </CardContent>
            </Card>
            
            {/* Stream Controls */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Stream Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm">Update Interval: {streamOptions.updateInterval}ms</Label>
                  <Slider
                    value={[streamOptions.updateInterval]}
                    onValueChange={([value]) => setStreamOptions(prev => ({ ...prev, updateInterval: value }))}
                    min={50}
                    max={1000}
                    step={50}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label className="text-sm">Max Points: {streamOptions.maxDataPoints.toLocaleString()}</Label>
                  <Slider
                    value={[streamOptions.maxDataPoints]}
                    onValueChange={([value]) => setStreamOptions(prev => ({ ...prev, maxDataPoints: value }))}
                    min={1000}
                    max={50000}
                    step={1000}
                    className="mt-2"
                  />
                </div>
              </CardContent>
            </Card>
            
            {/* Filter Panel - Collapsible on mobile */}
            <details className="lg:block">
              <summary className="cursor-pointer p-3 bg-card border rounded-lg mb-4 lg:hidden">
                <span className="font-medium">Filters & Settings</span>
              </summary>
              <div className="space-y-6 mt-4 lg:mt-0">
                <FilterPanel
                  categories={categories}
                />
                
                <TimeRangeSelector />
              </div>
            </details>
            
            {/* Desktop version - always visible */}
            <div className="hidden lg:block space-y-6">
              <FilterPanel
                categories={categories}
              />
              
              <TimeRangeSelector />
            </div>
          </div>
          
          {/* Main Chart Area */}
          <div className="xl:col-span-3 space-y-6">
            {/* Chart Tabs */}
            <Tabs value={selectedChart} onValueChange={(value) => setSelectedChart(value as any)}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="line">Line Chart</TabsTrigger>
                <TabsTrigger value="bar">Bar Chart</TabsTrigger>
                <TabsTrigger value="scatter">Scatter Plot</TabsTrigger>
                <TabsTrigger value="heatmap">Heatmap</TabsTrigger>
              </TabsList>
              
              <TabsContent value="line" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Line Chart - Time Series Data</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <LineChart
                        data={deferredProcessedData}
                        width={chartWidth}
                        height={400}
                        showGrid={showGrid}
                        showAxes={showAxes}
                        animated={animatedCharts}
                        onPerformanceUpdate={handleChartPerformance}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="bar" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Bar Chart - Data Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <BarChart
                        data={deferredProcessedData.slice(-50)} // Show last 50 points for bar chart performance
                        width={chartWidth}
                        height={400}
                        showGrid={showGrid}
                        showAxes={showAxes}
                        animated={animatedCharts}
                        onPerformanceUpdate={handleChartPerformance}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="scatter" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Scatter Plot - Data Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <ScatterPlot
                        data={deferredProcessedData}
                        width={chartWidth}
                        height={400}
                        showGrid={showGrid}
                        showAxes={showAxes}
                        animated={animatedCharts}
                        onPerformanceUpdate={handleChartPerformance}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="heatmap" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Heatmap - Data Density</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Heatmap
                        data={heatmapData}
                        width={chartWidth}
                        height={400}
                        animated={animatedCharts}
                        onPerformanceUpdate={handleChartPerformance}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
            
            {/* Data Table */}
            <DataTable
              data={tableData}
              height={300}
              searchable={true}
              sortable={true}
              isLoading={isProcessing}
              paginated={true}
              pageSize={50}
            />

            {/* Performance Tips */}
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-lg">Performance Tips</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Use filters to reduce data points for better performance</li>
                  <li>• Enable aggregation for large time ranges</li>
                  <li>• Bar chart shows last 50 points for optimal performance</li>
                  <li>• Toggle animations off for smoother interaction</li>
                </ul>
              </CardContent>
            </Card>
            
            {/* Performance Monitor */}
            {/* Performance Monitor with enhanced metrics */}
            <PerformanceMonitor
              metrics={metrics}
              isMonitoring={isMonitoring}
              averageRenderTime={averageRenderTime}
              peakMemoryUsage={peakMemoryUsage}
              onStart={startMonitoring}
              onStop={stopMonitoring}
              onReset={resetMetrics}
              dataProcessingDelays={dataProcessingDelays}
              lastDataProcessingTime={lastDataProcessingTime}
            />
          </div>
        </div>
        
        {/* Error Display */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="text-red-800">
                <strong>Error:</strong> {error}
              </div>
            </CardContent>
          </Card>
        )}
          </div>
        </div>
      </Suspense>
    </ErrorBoundary>
  );
};

const DashboardComponent = () => {
  return (
    <DashboardProvider>
      <DashboardContent />
    </DashboardProvider>
  );
};

export default memo(DashboardComponent);