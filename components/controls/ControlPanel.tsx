'use client';

import React from 'react';
import { useDataActions } from '@/components/providers/DataProvider';

interface ControlPanelProps {
  className?: string;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({ className = '' }) => {
  const { updateFilters, clearData } = useDataActions();

  const handleDataSourceChange = (source: string) => {
    // For now, just log - could be extended to switch data sources
    console.log('Data source changed to:', source);
  };

  const handleUpdateIntervalChange = (interval: number) => {
    // Could be used to adjust data generation frequency
    console.log('Update interval changed to:', interval, 'ms');
  };

  const handleClearData = () => {
    clearData();
  };

  const handleFilterChange = (category: string) => {
    if (category === 'all') {
      updateFilters({});
    } else {
      updateFilters({ category });
    }
  };

  return (
    <div className={`control-panel bg-white dark:bg-gray-800 rounded-lg shadow p-4 ${className}`}>
      <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
        Controls
      </h3>
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Data Source
          </label>
          <select
            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            onChange={(e) => handleDataSourceChange(e.target.value)}
            defaultValue="Real-time Stream"
          >
            <option>Real-time Stream</option>
            <option>Static Data</option>
            <option>Custom API</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Update Interval
          </label>
          <select
            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            onChange={(e) => handleUpdateIntervalChange(parseInt(e.target.value))}
            defaultValue="100"
          >
            <option value="100">100ms</option>
            <option value="500">500ms</option>
            <option value="1000">1s</option>
            <option value="5000">5s</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Category Filter
          </label>
          <select
            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            onChange={(e) => handleFilterChange(e.target.value)}
            defaultValue="all"
          >
            <option value="all">All Categories</option>
            <option value="A">Category A</option>
            <option value="B">Category B</option>
            <option value="C">Category C</option>
            <option value="D">Category D</option>
          </select>
        </div>

        <div className="pt-2 border-t border-gray-200 dark:border-gray-600">
          <button
            onClick={handleClearData}
            className="w-full px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded transition-colors"
          >
            Clear Data
          </button>
        </div>
      </div>
    </div>
  );
};