import { NextRequest } from 'next/server';
import { generateTimeSeriesData } from '@/lib/dataGenerator';
import { DataPoint } from '@/lib/types';

// Enable edge runtime for better performance
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const interval = parseInt(searchParams.get('interval') || '100');
  const maxPoints = parseInt(searchParams.get('maxPoints') || '10000');

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      let dataPoints: DataPoint[] = [];
      let lastTimestamp = Date.now() - maxPoints * interval;

      // Generate initial data - start with more points for immediate visualization
      dataPoints = generateTimeSeriesData(Math.min(5000, maxPoints), lastTimestamp, interval);
      lastTimestamp = dataPoints[dataPoints.length - 1].timestamp;

      // Batch updates for better performance
      let batchBuffer: DataPoint[] = [];
      const batchInterval = Math.max(50, Math.min(interval, 100)); // 50-100ms batching
      
      const sendBatch = () => {
        if (batchBuffer.length === 0) return;
        
        try {
          const data = {
            type: 'batch',
            dataPoints: batchBuffer,
            totalPoints: dataPoints.length,
            timestamp: Date.now()
          };

          const message = `data: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(message));
          
          batchBuffer = [];
        } catch (error) {
          console.error('Error sending batch:', error);
        }
      };

      const sendUpdate = () => {
        try {
          // Generate new data point
          const newPoint = generateTimeSeriesData(1, lastTimestamp + interval, interval)[0];
          lastTimestamp = newPoint.timestamp;

          // Add to data array
          dataPoints.push(newPoint);

          // Maintain max data points
          if (dataPoints.length > maxPoints) {
            dataPoints = dataPoints.slice(-maxPoints);
          }

          // Add to batch buffer
          batchBuffer.push(newPoint);

        } catch (error) {
          console.error('Error in stream:', error);
          controller.error(error);
        }
      };
      
      // Send batches periodically
      const batchIntervalId = setInterval(sendBatch, batchInterval);

      // Send initial data immediately
      const initialData = {
        type: 'initial',
        data: dataPoints,
        count: dataPoints.length,
        timestamp: Date.now()
      };

      controller.enqueue(encoder.encode(`data: ${JSON.stringify(initialData)}\n\n`));

      // Set up interval for real-time updates
      const intervalId = setInterval(sendUpdate, interval);

      // Clean up on connection close
      request.signal.addEventListener('abort', () => {
        clearInterval(intervalId);
        clearInterval(batchIntervalId);
        sendBatch(); // Send remaining batch
        controller.close();
      });

      return () => {
        clearInterval(intervalId);
        clearInterval(batchIntervalId);
      };
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}