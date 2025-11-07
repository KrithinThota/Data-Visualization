'use client';

import React from 'react';
import { BaseChart } from './BaseChart';
import { ChartConfig, DataPoint } from '@/types/dashboard';

interface BarChartProps {
  config: ChartConfig;
  width: number;
  height: number;
  onHover?: (point: DataPoint | null, event: MouseEvent) => void;
}

export const BarChart: React.FC<BarChartProps> = ({
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