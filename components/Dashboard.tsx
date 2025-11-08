'use client';

import React, { useState } from 'react';
import { ChartGrid } from './charts/ChartGrid';
import { DataTable } from './ui/DataTable';
import { PerformanceMonitor } from './ui/PerformanceMonitor';
import { ControlPanel } from './controls/ControlPanel';
import { useData } from './providers/DataProvider';
import { WebGPUIntegration } from '@/lib/webgpu/webgpuIntegration';

export const Dashboard: React.FC = () => {
  const [viewMode, setViewMode] = useState<'charts' | 'table' | 'split'>('charts');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [webgpuIntegration] = useState(() => new WebGPUIntegration());
  const { performance, data, isLoading } = useData();

  console.log('🎯 Dashboard Render:', {
    dataPoints: data.length,
    isLoading,
    viewMode,
    performance: {
      fps: performance.fps,
      memoryUsage: performance.memoryUsage,
      renderTime: performance.renderTime
    }
  });

  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200 ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              {/* Logo/Brand */}
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                    DataViz Pro
                  </h1>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Real-time Analytics Dashboard
                  </p>
                </div>
              </div>

              {/* Status Indicator */}
              <div className="hidden md:flex items-center space-x-2">
                <div className="flex items-center space-x-1">
                  <div className={`w-2 h-2 rounded-full ${isLoading ? 'bg-yellow-400 animate-pulse' : 'bg-green-400'}`}></div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {isLoading ? 'Loading...' : 'Live'}
                  </span>
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {data.length} points • {performance.dataProcessingTime?.toFixed(1)}ms
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* View Mode Toggle */}
              <div className="hidden sm:flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('charts')}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    viewMode === 'charts'
                      ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  Charts
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    viewMode === 'table'
                      ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  Table
                </button>
                <button
                  onClick={() => setViewMode('split')}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    viewMode === 'split'
                      ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  Split
                </button>
              </div>

              {/* Mobile View Toggle */}
              <div className="sm:hidden">
                <select
                  value={viewMode}
                  onChange={(e) => setViewMode(e.target.value as 'charts' | 'table' | 'split')}
                  className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 rounded-md border-0 text-gray-900 dark:text-white"
                >
                  <option value="charts">Charts</option>
                  <option value="table">Table</option>
                  <option value="split">Split</option>
                </select>
              </div>

              {/* Fullscreen Toggle */}
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              >
                {isFullscreen ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.5 3.5M15 9h4.5M15 9V4.5M15 9l5.5-5.5M9 15v4.5M9 15H4.5M9 15l-5.5 5.5M15 15h4.5M15 15v4.5m0-4.5l5.5 5.5" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 3l-6 6m0 0V4m0 5h5M3 21l6-6m0 0v5m0-5H4" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="space-y-6">
          {/* Performance Monitor */}
          <PerformanceMonitor webgpuIntegration={webgpuIntegration} />

          {/* Control Panel */}
          <ControlPanel />

          {/* Charts View */}
          {(viewMode === 'charts' || viewMode === 'split') && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
                Data Visualization
              </h3>
              {isLoading ? (
                <div className="flex items-center justify-center h-96">
                  <div className="text-gray-500 dark:text-gray-400">Loading charts...</div>
                </div>
              ) : (
                <ChartGrid width={800} height={400} />
              )}
            </div>
          )}

          {/* Table View */}
          {(viewMode === 'table' || viewMode === 'split') && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
                Data Table View
              </h3>
              <DataTable data={data} />
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-center text-sm text-gray-600 dark:text-gray-400 space-y-2 sm:space-y-0">
            <div className="flex items-center space-x-4">
              <span>Last updated: {new Date().toLocaleTimeString()}</span>
              <span className="hidden sm:inline">•</span>
              <span className="text-xs">
                {data.length} data points • {performance.dataProcessingTime?.toFixed(1)}ms processing
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1">
                <div className={`w-2 h-2 rounded-full ${performance.fps >= 50 ? 'bg-green-400' : performance.fps >= 30 ? 'bg-yellow-400' : 'bg-red-400'}`}></div>
                <span>FPS: {performance.fps?.toFixed(1) || '60.0'}</span>
              </div>
              <span>Memory: {performance.memoryUsage?.toFixed(1) || '25.7'} MB</span>
              <span>Render: {performance.renderTime?.toFixed(1) || '1.0'} ms</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};