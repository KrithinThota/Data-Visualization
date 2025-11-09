// Data Processing Web Worker
// Handles heavy data processing tasks off the main thread

// Message types
const MESSAGE_TYPES = {
  FILTER_DATA: 'filter_data',
  AGGREGATE_DATA: 'aggregate_data',
  SORT_DATA: 'sort_data',
  CALCULATE_BOUNDS: 'calculate_bounds',
  PROCESS_HEATMAP: 'process_heatmap'
};

// Helper functions for data processing
function filterData(data, filters) {
  const { categories, valueRange, timeRange } = filters;
  
  return data.filter(point => {
    const categoryMatch = categories.length === 0 || categories.includes(point.category);
    const valueMatch = point.value >= valueRange[0] && point.value <= valueRange[1];
    const timeMatch = point.timestamp >= timeRange.start && point.timestamp <= timeRange.end;
    
    return categoryMatch && valueMatch && timeMatch;
  });
}

function aggregateDataByTime(data, aggregationLevel) {
  if (aggregationLevel.type === 'none' || !aggregationLevel.enabled) {
    return data;
  }
  
  const intervals = {
    '1min': 60 * 1000,
    '5min': 5 * 60 * 1000,
    '1hour': 60 * 60 * 1000
  };
  
  const intervalMs = intervals[aggregationLevel.type];
  const aggregated = new Map();
  
  // Group data by time intervals
  for (const point of data) {
    const intervalStart = Math.floor(point.timestamp / intervalMs) * intervalMs;
    if (!aggregated.has(intervalStart)) {
      aggregated.set(intervalStart, []);
    }
    aggregated.get(intervalStart).push(point);
  }
  
  // Create aggregated points
  const result = [];
  for (const [timestamp, points] of aggregated) {
    const avgValue = points.reduce((sum, p) => sum + p.value, 0) / points.length;
    const category = points[0].category;
    
    result.push({
      timestamp,
      value: avgValue,
      category,
      metadata: {
        originalCount: points.length,
        min: Math.min(...points.map(p => p.value)),
        max: Math.max(...points.map(p => p.value))
      }
    });
  }
  
  return result.sort((a, b) => a.timestamp - b.timestamp);
}

function calculateChartBounds(data) {
  if (data.length === 0) {
    return { minX: 0, maxX: 100, minY: 0, maxY: 100 };
  }
  
  let minX = data[0].timestamp;
  let maxX = data[0].timestamp;
  let minY = data[0].value;
  let maxY = data[0].value;
  
  for (const point of data) {
    minX = Math.min(minX, point.timestamp);
    maxX = Math.max(maxX, point.timestamp);
    minY = Math.min(minY, point.value);
    maxY = Math.max(maxY, point.value);
  }
  
  // Add padding
  const xPadding = (maxX - minX) * 0.05;
  const yPadding = (maxY - minY) * 0.05;
  
  return {
    minX: minX - xPadding,
    maxX: maxX + xPadding,
    minY: minY - yPadding,
    maxY: maxY + yPadding
  };
}

function processHeatmapData(data, width, height, resolution = 10) {
  const grid = new Map();
  
  for (const point of data) {
    const gridX = Math.floor(point.x / resolution);
    const gridY = Math.floor(point.y / resolution);
    const key = `${gridX},${gridY}`;
    
    if (!grid.has(key)) {
      grid.set(key, { x: gridX * resolution, y: gridY * resolution, value: 0, count: 0 });
    }
    
    const cell = grid.get(key);
    cell.value += point.value;
    cell.count++;
  }
  
  const result = [];
  for (const cell of grid.values()) {
    result.push({
      x: cell.x,
      y: cell.y,
      value: cell.value / cell.count,
      label: `Grid (${cell.x}, ${cell.y})`
    });
  }
  
  return result;
}

function sortData(data, column, direction) {
  return [...data].sort((a, b) => {
    let aValue = a[column];
    let bValue = b[column];
    
    if (typeof aValue === 'string') aValue = aValue.toLowerCase();
    if (typeof bValue === 'string') bValue = bValue.toLowerCase();
    
    if (aValue < bValue) return direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return direction === 'asc' ? 1 : -1;
    return 0;
  });
}

// Message handler
self.onmessage = function(e) {
  const { type, data, options, requestId } = e.data;
  
  try {
    let result;
    
    switch (type) {
      case MESSAGE_TYPES.FILTER_DATA:
        result = filterData(data, options.filters);
        break;
        
      case MESSAGE_TYPES.AGGREGATE_DATA:
        result = aggregateDataByTime(data, options.aggregationLevel);
        break;
        
      case MESSAGE_TYPES.SORT_DATA:
        result = sortData(data, options.column, options.direction);
        break;
        
      case MESSAGE_TYPES.CALCULATE_BOUNDS:
        result = calculateChartBounds(data);
        break;
        
      case MESSAGE_TYPES.PROCESS_HEATMAP:
        result = processHeatmapData(data, options.width, options.height, options.resolution);
        break;
        
      default:
        throw new Error(`Unknown message type: ${type}`);
    }
    
    // Send success response
    self.postMessage({
      requestId,
      type: 'success',
      data: result
    });
    
  } catch (error) {
    // Send error response
    self.postMessage({
      requestId,
      type: 'error',
      error: error.message
    });
  }
};

// Performance monitoring
let processingCount = 0;
let totalProcessingTime = 0;

const startTime = performance.now();

// Log worker initialization
console.log('Data Processor Worker initialized');

// Optional: Periodic performance reporting
setInterval(() => {
  const elapsedTime = performance.now() - startTime;
  console.log(`Worker Performance: ${processingCount} operations in ${elapsedTime.toFixed(2)}ms`);
}, 30000); // Every 30 seconds