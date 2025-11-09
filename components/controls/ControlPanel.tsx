'use client';

import React from 'react';
import { useDataActions, useData } from '@/components/providers/DataProvider';

interface ControlPanelProps {
  className?: string;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({ className = '' }) => {
   const { updateFilters, updateWindowSize, clearData } = useDataActions();
   const { windowSize } = useData();

  const handleDataSourceChange = (source: string) => {
    // For now, just log - could be extended to switch data sources
    console.log('Data source changed to:', source);
  };


  const handleDataLoadChange = (load: 'low' | 'medium' | 'high' | 'stress') => {
    const intervals = { low: 2000, medium: 500, high: 100, stress: 10 };
    console.log('Data load changed to:', load, 'with interval:', intervals[load], 'ms');
    // TODO: Implement data generation load control
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

  const handleWindowSizeChange = (size: number) => {
    updateWindowSize(size);
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
            Data Load
          </label>
          <select
            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            onChange={(e) => handleDataLoadChange(e.target.value as 'low' | 'medium' | 'high' | 'stress')}
            defaultValue="medium"
          >
            <option value="low">Low (2s)</option>
            <option value="medium">Medium (500ms)</option>
            <option value="high">High (100ms)</option>
            <option value="stress">Stress Test (10ms)</option>
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

         <div>
           <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
             Window Size: {windowSize || 2000} points
           </label>
           <input
             type="range"
             min="500"
             max="5000"
             step="500"
             value={windowSize || 2000}
             onChange={(e) => handleWindowSizeChange(parseInt(e.target.value))}
             className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
           />
           <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
             <span>500</span>
             <span>5000</span>
           </div>
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