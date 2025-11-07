'use client';

import React from 'react';
import { LineChart } from './LineChart';
import { BarChart } from './BarChart';
import { ScatterChart } from './ScatterChart';
import { HeatmapChart } from './HeatmapChart';
import { DataPoint } from '@/types/dashboard';
import { useData } from '@/components/providers/DataProvider';

interface ChartGridProps {
  width?: number;
  height?: number;
}

export const ChartGrid: React.FC<ChartGridProps> = ({
  width = 800,
  height = 400
}) => {
  const { chartConfigs } = useData();

  const handleHover = (point: DataPoint | null) => {
    // Handle tooltip interactions
    console.log('Hover:', point);
  };

  return (
    <div className="chart-grid grid grid-cols-2 gap-4 p-4">
      {chartConfigs.map((config) => (
        <div key={config.id} className="chart-container relative">
          {(() => {
            switch (config.type) {
              case 'line':
                return (
                  <LineChart
                    config={config}
                    width={width / 2 - 16}
                    height={height / 2 - 16}
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
                    width={width / 2 - 16}
                    height={height / 2 - 16}
                    onHover={handleHover}
                  />
                );
              case 'scatter':
                return (
                  <ScatterChart
                    config={config}
                    width={width / 2 - 16}
                    height={height / 2 - 16}
                    onHover={handleHover}
                  />
                );
              case 'heatmap':
                return (
                  <HeatmapChart
                    config={config}
                    width={width / 2 - 16}
                    height={height / 2 - 16}
                    onHover={handleHover}
                  />
                );
              default:
                return null;
            }
          })()}

          <div className="absolute top-2 left-2 bg-white/90 px-2 py-1 rounded text-sm font-medium">
            {config.type.charAt(0).toUpperCase() + config.type.slice(1)} Chart
          </div>
        </div>
      ))}
    </div>
  );
};