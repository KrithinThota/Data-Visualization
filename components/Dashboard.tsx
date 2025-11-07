'use client';

import React, { useState } from 'react';

export const Dashboard: React.FC = () => {
  const [viewMode, setViewMode] = useState<'charts' | 'table' | 'split'>('charts');
  const [isFullscreen, setIsFullscreen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Performance Dashboard
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Real-time data visualization
              </p>
            </div>

            <div className="flex items-center space-x-4">
              {/* View Mode Toggle */}
              <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
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

              {/* Fullscreen Toggle */}
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
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
          {/* Mock Performance Monitor */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
              Performance Monitor
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="metric">
                <div className="text-sm font-medium text-gray-600 dark:text-gray-400">FPS</div>
                <div className="text-xl font-bold text-green-600">60.0</div>
              </div>
              <div className="metric">
                <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Memory</div>
                <div className="text-xl font-bold text-blue-600">67.8 MB</div>
              </div>
              <div className="metric">
                <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Render Time</div>
                <div className="text-xl font-bold text-purple-600">14.2 ms</div>
              </div>
              <div className="metric">
                <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Data Points</div>
                <div className="text-xl font-bold text-orange-600">10,000</div>
              </div>
            </div>
          </div>

          {/* Mock Chart Area */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
              Data Visualization
            </h3>
            <div className="h-96 bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-center">
              <p className="text-gray-600 dark:text-gray-400">
                Chart components will be displayed here in the full implementation
              </p>
            </div>
          </div>

          {/* Content Based on View Mode */}
          {(viewMode === 'charts' || viewMode === 'split') && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
                Charts View
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Multiple chart types will be displayed here in the full implementation
              </p>
            </div>
          )}

          {(viewMode === 'table' || viewMode === 'split') && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
                Data Table View
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Tabular data representation will be displayed here in the full implementation
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center text-sm text-gray-600 dark:text-gray-400">
            <div>
              Last updated: {new Date().toLocaleTimeString()}
            </div>
            <div className="flex items-center space-x-4">
              <span>FPS: 60.0</span>
              <span>Memory: 67.8 MB</span>
              <span>Data points: 10,000</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};