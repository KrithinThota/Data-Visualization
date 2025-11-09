import { NextResponse } from 'next/server';
import { ChartConfig } from '@/types/dashboard';

export const runtime = 'edge';

// Static chart configurations
const chartConfigs: ChartConfig[] = [
  {
    id: 'line-chart-1',
    type: 'line',
    dataKey: 'value',
    color: '#1F77B4',
    visible: true
  },
  {
    id: 'bar-chart-1',
    type: 'bar',
    dataKey: 'value',
    color: '#FF7F0E',
    visible: true
  },
  {
    id: 'scatter-chart-1',
    type: 'scatter',
    dataKey: 'value',
    color: '#2CA02C',
    visible: true
  },
  {
    id: 'heatmap-chart-1',
    type: 'heatmap',
    dataKey: 'value',
    color: '#D62728',
    visible: true
  }
];

export async function GET() {
  return NextResponse.json({
    configs: chartConfigs,
    timestamp: Date.now(),
    version: '1.0.0'
  });
}

// Static generation for chart configurations