'use client';

import React from 'react';
import { LineChart } from './LineChart';
import { BarChart } from './BarChart';
import { ScatterChart } from './ScatterChart';
import { HeatmapChart } from './HeatmapChart';
import { DataPoint } from '@/types/dashboard';
import { useData } from '@/components/providers/DataProvider';
import { WebGPUIntegration } from '@/lib/webgpu/webgpuIntegration';

interface ChartGridProps {
   width?: number;
   height?: number;
   webgpuIntegration?: WebGPUIntegration;
   selectedChartId?: string | null;
   singleMode?: boolean;
 }

export const ChartGrid: React.FC<ChartGridProps> = ({
   width = 800,
   height = 400,
   selectedChartId = null,
   singleMode = false
 }) => {
   const { chartConfigs, data, isLoading } = useData();

  const handleHover = (point: DataPoint | null) => {
    // Handle tooltip interactions
    console.log('📊 Chart Hover:', point ? {
      value: point.value,
      timestamp: new Date(point.timestamp).toLocaleTimeString(),
      category: point.category
    } : 'No hover');
  };

  // Filter charts based on mode
  const visibleConfigs = singleMode && selectedChartId
    ? chartConfigs.filter(config => config.id === selectedChartId && config.visible)
    : chartConfigs.filter(config => config.visible);

  if (isLoading || data.length === 0) {
     return (
       <div className={`chart-grid ${singleMode ? 'flex justify-center' : 'grid grid-cols-2'} gap-4 p-4`}>
         {visibleConfigs.map((config) => (
           <div key={config.id} className="chart-container relative bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center" style={{ width: singleMode ? width : width / 2 - 16, height: singleMode ? height : height / 2 - 16 }}>
             <div className="text-gray-500 dark:text-gray-400 text-sm">
               {isLoading ? 'Loading...' : 'No data available'}
             </div>
           </div>
         ))}
       </div>
     );
   }

   return (
     <div className={`chart-grid ${singleMode ? 'flex justify-center' : 'grid grid-cols-2'} gap-4 p-4`}>
       {visibleConfigs.map((config) => (
         <div key={config.id} className="chart-container relative">
           {(() => {
             switch (config.type) {
               case 'line':
                 return (
                   <LineChart
                     config={config}
                     width={singleMode ? width : width / 2 - 16}
                     height={singleMode ? height : height / 2 - 16}
                     enableZoomPan={true}
                     enableTooltips={true}
                     enableAccessibility={true}
                     enableKeyboardShortcuts={true}
                   />
                 );
               case 'bar':
                 return (
                   <BarChart
                     config={config}
                     width={singleMode ? width : width / 2 - 16}
                     height={singleMode ? height : height / 2 - 16}
                     onHover={handleHover}
                   />
                 );
               case 'scatter':
                 return (
                   <ScatterChart
                     config={config}
                     width={singleMode ? width : width / 2 - 16}
                     height={singleMode ? height : height / 2 - 16}
                     onHover={handleHover}
                   />
                 );
               case 'heatmap':
                 return (
                   <HeatmapChart
                     config={config}
                     width={singleMode ? width : width / 2 - 16}
                     height={singleMode ? height : height / 2 - 16}
                     onHover={handleHover}
                   />
                 );
               default:
                 return null;
             }
           })()}

           <div className="absolute top-2 left-2 bg-white/90 dark:bg-gray-800/90 px-2 py-1 rounded text-sm font-medium text-gray-900 dark:text-white">
             {config.type.charAt(0).toUpperCase() + config.type.slice(1)} Chart
           </div>
         </div>
       ))}
     </div>
   );
};