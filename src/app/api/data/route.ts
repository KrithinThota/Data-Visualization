import { NextRequest, NextResponse } from 'next/server';
import { generateTimeSeriesData, generateScatterData, generateHeatmapData } from '@/lib/dataGenerator';
import { DataPoint } from '@/lib/types';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get('type') || 'timeseries';
  const count = parseInt(searchParams.get('count') || '1000');
  const interval = parseInt(searchParams.get('interval') || '100');
  
  try {
    let data: DataPoint[] = [];
    
    switch (type) {
      case 'timeseries':
        data = generateTimeSeriesData(count, Date.now() - count * interval, interval);
        break;
      case 'scatter':
        data = generateScatterData(count);
        break;
      case 'heatmap':
        const heatmapData = generateHeatmapData(500, 300, 10);
        return NextResponse.json({
          type: 'heatmap',
          data: heatmapData,
          count: heatmapData.length
        });
      default:
        return NextResponse.json(
          { error: 'Invalid data type. Use: timeseries, scatter, or heatmap' },
          { status: 400 }
        );
    }
    
    return NextResponse.json({
      type,
      data,
      count: data.length,
      generatedAt: Date.now()
    });
    
  } catch (error) {
    console.error('Error generating data:', error);
    return NextResponse.json(
      { error: 'Failed to generate data' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, count, interval, startTime } = body;
    
    let data: DataPoint[] = [];
    
    switch (type) {
      case 'timeseries':
        data = generateTimeSeriesData(
          count || 1000,
          startTime || Date.now() - (count || 1000) * (interval || 100),
          interval || 100
        );
        break;
      case 'scatter':
        data = generateScatterData(count || 1000);
        break;
      case 'heatmap':
        const heatmapData = generateHeatmapData(500, 300, 10);
        return NextResponse.json({
          type: 'heatmap',
          data: heatmapData,
          count: heatmapData.length
        });
      default:
        return NextResponse.json(
          { error: 'Invalid data type. Use: timeseries, scatter, or heatmap' },
          { status: 400 }
        );
    }
    
    return NextResponse.json({
      type,
      data,
      count: data.length,
      generatedAt: Date.now()
    });
    
  } catch (error) {
    console.error('Error generating data:', error);
    return NextResponse.json(
      { error: 'Failed to generate data' },
      { status: 500 }
    );
  }
}