'use client';

import React from 'react';
import { BaseChart } from './BaseChart';
import { ChartConfig, DataPoint } from '@/types/dashboard';

interface HeatmapChartProps {
  config: ChartConfig;
  width: number;
  height: number;
  onHover?: (point: DataPoint | null, event: MouseEvent) => void;
}

export const HeatmapChart: React.FC<HeatmapChartProps> = ({
  config,
  width,
  height,
  onHover
}) => {
  return (
    <BaseChart
      width={width}
      height={height}
      config={config}
      onHover={onHover || (() => {})}
    />
  );
};