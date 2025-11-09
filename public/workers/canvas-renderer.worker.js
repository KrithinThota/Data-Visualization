/**
 * Canvas Renderer Web Worker
 * Handles background canvas rendering using OffscreenCanvas
 * Offloads rendering from main thread for better performance
 */

let offscreenCanvas = null;
let ctx = null;
let currentConfig = {};

// Message types
const MESSAGE_TYPES = {
  INIT: 'init',
  RENDER_LINE: 'render_line',
  RENDER_BAR: 'render_bar',
  RENDER_SCATTER: 'render_scatter',
  RENDER_HEATMAP: 'render_heatmap',
  UPDATE_CONFIG: 'update_config'
};

/**
 * Initialize OffscreenCanvas
 */
function initOffscreenCanvas(canvas, width, height, config) {
  offscreenCanvas = canvas;
  ctx = offscreenCanvas.getContext('2d', {
    alpha: false,
    desynchronized: true
  });
  
  offscreenCanvas.width = width;
  offscreenCanvas.height = height;
  
  currentConfig = config || {};
  
  // Set optimal rendering properties
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  
  return { success: true };
}

/**
 * Clear canvas
 */
function clearCanvas(width, height) {
  if (!ctx) return;
  ctx.clearRect(0, 0, width, height);
}

/**
 * Draw grid
 */
function drawGrid(width, height, bounds, options = {}) {
  if (!ctx) return;
  
  const {
    color = '#e5e7eb',
    lineWidth = 1,
    xSteps = 10,
    ySteps = 10
  } = options;
  
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.setLineDash([2, 2]);
  
  // Vertical lines
  for (let i = 0; i <= xSteps; i++) {
    const x = (i / xSteps) * width;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  
  // Horizontal lines
  for (let i = 0; i <= ySteps; i++) {
    const y = (i / ySteps) * height;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  
  ctx.setLineDash([]);
}

/**
 * Draw axes with labels
 */
function drawAxes(width, height, bounds, options = {}) {
  if (!ctx) return;
  
  const {
    color = '#374151',
    lineWidth = 2,
    fontSize = 12,
    fontColor = '#6b7280'
  } = options;
  
  const padding = 40;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.font = `${fontSize}px system-ui`;
  ctx.fillStyle = fontColor;
  
  // X-axis
  ctx.beginPath();
  ctx.moveTo(padding, height - padding);
  ctx.lineTo(width - padding, height - padding);
  ctx.stroke();
  
  // Y-axis
  ctx.beginPath();
  ctx.moveTo(padding, padding);
  ctx.lineTo(padding, height - padding);
  ctx.stroke();
  
  // X-axis labels (timestamps)
  const xStep = Math.ceil((bounds.maxX - bounds.minX) / 5);
  for (let i = 0; i <= 5; i++) {
    const value = bounds.minX + i * xStep;
    const x = padding + (i / 5) * chartWidth;
    const label = new Date(value).toLocaleTimeString().slice(0, 5);
    ctx.fillText(label, x - 20, height - padding + 20);
  }
  
  // Y-axis labels
  const yStep = (bounds.maxY - bounds.minY) / 5;
  for (let i = 0; i <= 5; i++) {
    const value = bounds.minY + i * yStep;
    const y = height - padding - (i / 5) * chartHeight;
    const label = value.toFixed(1);
    ctx.fillText(label, 5, y + 4);
  }
}

/**
 * Map data point to canvas coordinates
 */
function mapDataToCanvas(point, bounds, width, height) {
  const padding = 40;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  
  const x = padding + ((point.timestamp - bounds.minX) / (bounds.maxX - bounds.minX)) * chartWidth;
  const y = height - padding - ((point.value - bounds.minY) / (bounds.maxY - bounds.minY)) * chartHeight;
  
  return { x, y };
}

/**
 * Render line chart
 */
function renderLineChart(data, bounds, width, height, options = {}) {
  if (!ctx || !data || data.length === 0) return;
  
  const {
    color = '#3b82f6',
    lineWidth = 2,
    smooth = true,
    showGrid = true,
    showAxes = true
  } = options;
  
  // Clear canvas
  clearCanvas(width, height);
  
  // Draw grid
  if (showGrid) {
    drawGrid(width, height, bounds);
  }
  
  // Draw axes
  if (showAxes) {
    drawAxes(width, height, bounds);
  }
  
  // Map data to canvas coordinates
  const points = data.map(point => mapDataToCanvas(point, bounds, width, height));
  
  if (points.length < 2) return;
  
  // Draw line
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  ctx.beginPath();
  
  if (smooth && points.length > 2) {
    ctx.moveTo(points[0].x, points[0].y);
    
    for (let i = 1; i < points.length - 1; i++) {
      const xc = (points[i].x + points[i + 1].x) / 2;
      const yc = (points[i].y + points[i + 1].y) / 2;
      ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
    }
    
    ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
  } else {
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
  }
  
  ctx.stroke();
  
  // Transfer as ImageBitmap
  return offscreenCanvas.transferToImageBitmap();
}

/**
 * Render bar chart
 */
function renderBarChart(data, bounds, width, height, options = {}) {
  if (!ctx || !data || data.length === 0) return;
  
  const {
    color = '#10b981',
    barWidth = 0.8,
    showGrid = true,
    showAxes = true
  } = options;
  
  clearCanvas(width, height);
  
  if (showGrid) {
    drawGrid(width, height, bounds);
  }
  
  if (showAxes) {
    drawAxes(width, height, bounds);
  }
  
  const padding = 40;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  
  ctx.fillStyle = color;
  
  const actualBarWidth = (chartWidth / data.length) * barWidth;
  const barSpacing = (chartWidth / data.length) * (1 - barWidth);
  
  data.forEach((point, index) => {
    const x = padding + index * (actualBarWidth + barSpacing) + barSpacing / 2;
    const barHeight = ((point.value - bounds.minY) / (bounds.maxY - bounds.minY)) * chartHeight;
    const y = height - padding - barHeight;
    
    ctx.fillRect(x, y, actualBarWidth, barHeight);
  });
  
  return offscreenCanvas.transferToImageBitmap();
}

/**
 * Render scatter plot
 */
function renderScatterPlot(data, bounds, width, height, options = {}) {
  if (!ctx || !data || data.length === 0) return;
  
  const {
    color = '#f59e0b',
    pointSize = 4,
    opacity = 0.8,
    showGrid = true,
    showAxes = true
  } = options;
  
  clearCanvas(width, height);
  
  if (showGrid) {
    drawGrid(width, height, bounds);
  }
  
  if (showAxes) {
    drawAxes(width, height, bounds);
  }
  
  ctx.fillStyle = color;
  ctx.globalAlpha = opacity;
  
  data.forEach(point => {
    const mapped = mapDataToCanvas(point, bounds, width, height);
    ctx.beginPath();
    ctx.arc(mapped.x, mapped.y, pointSize, 0, Math.PI * 2);
    ctx.fill();
  });
  
  ctx.globalAlpha = 1;
  
  return offscreenCanvas.transferToImageBitmap();
}

/**
 * Render heatmap
 */
function renderHeatmap(data, width, height, options = {}) {
  if (!ctx || !data || data.length === 0) return;
  
  const { cellSize = 10 } = options;
  
  clearCanvas(width, height);
  
  data.forEach(cell => {
    // Simple color scale from blue to red
    const normalized = Math.max(0, Math.min(1, cell.value / 100));
    const hue = (1 - normalized) * 240;
    ctx.fillStyle = `hsl(${hue}, 70%, 50%)`;
    ctx.fillRect(cell.x * cellSize, cell.y * cellSize, cellSize, cellSize);
  });
  
  return offscreenCanvas.transferToImageBitmap();
}

// Message handler
self.onmessage = function(e) {
  const { type, data, requestId, canvas, width, height, config, options } = e.data;
  
  try {
    let result;
    
    switch (type) {
      case MESSAGE_TYPES.INIT:
        result = initOffscreenCanvas(canvas, width, height, config);
        break;
        
      case MESSAGE_TYPES.RENDER_LINE:
        result = renderLineChart(data.points, data.bounds, width, height, options);
        break;
        
      case MESSAGE_TYPES.RENDER_BAR:
        result = renderBarChart(data.points, data.bounds, width, height, options);
        break;
        
      case MESSAGE_TYPES.RENDER_SCATTER:
        result = renderScatterPlot(data.points, data.bounds, width, height, options);
        break;
        
      case MESSAGE_TYPES.RENDER_HEATMAP:
        result = renderHeatmap(data, width, height, options);
        break;
        
      case MESSAGE_TYPES.UPDATE_CONFIG:
        currentConfig = { ...currentConfig, ...config };
        result = { success: true };
        break;
        
      default:
        throw new Error(`Unknown message type: ${type}`);
    }
    
    // Send success response
    self.postMessage({
      requestId,
      type: 'success',
      data: result
    }, result instanceof ImageBitmap ? [result] : []);
    
  } catch (error) {
    // Send error response
    self.postMessage({
      requestId,
      type: 'error',
      error: error.message
    });
  }
};

console.log('Canvas Renderer Worker initialized');