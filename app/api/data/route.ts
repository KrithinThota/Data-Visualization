import { NextRequest, NextResponse } from 'next/server';
import { DataPoint } from '@/types/dashboard';

export const runtime = 'edge';

// In-memory data store for demo (in production, use database)
let dataStore: DataPoint[] = [];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '1000');
    const category = searchParams.get('category');
    const startTime = searchParams.get('startTime');
    const endTime = searchParams.get('endTime');

    let filteredData = [...dataStore];

    // Apply filters
    if (category && category !== 'all') {
      filteredData = filteredData.filter(point => point.category === category);
    }

    if (startTime) {
      const start = parseInt(startTime);
      filteredData = filteredData.filter(point => point.timestamp >= start);
    }

    if (endTime) {
      const end = parseInt(endTime);
      filteredData = filteredData.filter(point => point.timestamp <= end);
    }

    // Apply limit
    filteredData = filteredData.slice(-limit);

    return NextResponse.json({
      data: filteredData,
      count: filteredData.length,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, data } = body;

    switch (action) {
      case 'add':
        if (Array.isArray(data)) {
          dataStore.push(...data);
          // Keep only last 10000 points to prevent memory issues
          if (dataStore.length > 10000) {
            dataStore = dataStore.slice(-10000);
          }
        } else {
          dataStore.push(data);
        }
        break;

      case 'clear':
        dataStore = [];
        break;

      case 'update':
        // Update specific data points
        const { id, updates } = data;
        const index = dataStore.findIndex(point => point.timestamp === id);
        if (index !== -1) {
          dataStore[index] = { ...dataStore[index], ...updates };
        }
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      count: dataStore.length,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const startTime = searchParams.get('startTime');
    const endTime = searchParams.get('endTime');

    const originalLength = dataStore.length;

    if (category) {
      dataStore = dataStore.filter(point => point.category !== category);
    } else if (startTime && endTime) {
      const start = parseInt(startTime);
      const end = parseInt(endTime);
      dataStore = dataStore.filter(point =>
        point.timestamp < start || point.timestamp > end
      );
    } else {
      dataStore = [];
    }

    return NextResponse.json({
      success: true,
      deleted: originalLength - dataStore.length,
      remaining: dataStore.length,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}