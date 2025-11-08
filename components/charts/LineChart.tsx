'use client';

import React from 'react';
import { BaseChart } from './BaseChart';
import { AdvancedZoomPan } from '@/components/controls/AdvancedZoomPan';
import { IntelligentTooltip } from '@/components/ui/IntelligentTooltip';
import { AccessibilityLayer } from '@/components/ui/AccessibilityLayer';
import { useDashboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useMemoryManagement } from '@/hooks/useMemoryManagement';
import { ChartConfig, ZoomPanState } from '@/types/dashboard';
import { useData } from '@/components/providers/DataProvider';
import { WebGPUIntegration } from '@/lib/webgpu/webgpuIntegration';

interface LineChartProps {
  config: ChartConfig;
  width: number;
  height: number;
  enableZoomPan?: boolean;
  enableTooltips?: boolean;
  enableAccessibility?: boolean;
  enableKeyboardShortcuts?: boolean;
  webgpuIntegration?: WebGPUIntegration;
}

export const LineChart: React.FC<LineChartProps> = ({
  config,
  width,
  height,
  enableZoomPan = true,
  enableTooltips = true,
  enableAccessibility = true,
  enableKeyboardShortcuts = true
}) => {
  const { data } = useData();
  const { getShortcutHelp } = useDashboardShortcuts();

  // Memory management for this component
  const memory = useMemoryManagement(`LineChart_${config.id}`, {
    registerLeakDetection: true,
    enableCleanup: true,
    enableMonitoring: false, // Avoid nested monitoring
    cacheComputations: true,
    cacheData: true
  });

  const handleZoomPanChange = (transform: ZoomPanState) => {
    // Update chart zoom/pan state
    console.log('Zoom/Pan changed:', transform);
    memory.updateMemoryAccess(); // Track memory access
  };

  const defaultZoomPanState = { zoom: 1, panX: 0, panY: 0, isDragging: false };

  const chartContent = (
    <BaseChart
      width={width}
      height={height}
      config={config}
      zoomPanState={enableZoomPan ? defaultZoomPanState : defaultZoomPanState}
    />
  );

  const tooltipWrapped = enableTooltips ? (
    <IntelligentTooltip data={data}>
      {(onHover) => (
        <BaseChart
          width={width}
          height={height}
          config={config}
          onHover={onHover}
          zoomPanState={defaultZoomPanState}
        />
      )}
    </IntelligentTooltip>
  ) : chartContent;

  const zoomPanWrapped = enableZoomPan ? (
    <AdvancedZoomPan onTransformChange={handleZoomPanChange}>
      {({ scale, translateX, translateY }) => (
        <div style={{
          transform: `scale(${scale}) translate(${translateX}px, ${translateY}px)`,
          transformOrigin: '0 0'
        }}>
          {tooltipWrapped}
        </div>
      )}
    </AdvancedZoomPan>
  ) : tooltipWrapped;

  const accessibilityWrapped = enableAccessibility ? (
    <AccessibilityLayer>
      {zoomPanWrapped}
    </AccessibilityLayer>
  ) : zoomPanWrapped;

  return (
    <div className="line-chart-container relative">
      {accessibilityWrapped}

      {/* Memory indicator for debugging in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs p-1 rounded opacity-50 hover:opacity-100 transition-opacity">
          <div className="font-semibold">Memory:</div>
          <div>Orphans: {memory.getMemoryStats().leakDetection.orphanedObjects}</div>
          <div>Cache Hit: {memory.getMemoryStats().caches.computation.hitRate.toFixed(1)}%</div>
        </div>
      )}

      {/* Keyboard shortcuts help */}
      {enableKeyboardShortcuts && (
        <div className="absolute bottom-2 right-2 bg-black/80 text-white p-2 rounded text-xs font-mono opacity-0 hover:opacity-100 transition-opacity">
          <div className="text-xs mb-1">Keyboard Shortcuts:</div>
          {Object.entries(getShortcutHelp()).map(([category, shortcuts]) => (
            <div key={category} className="mb-1">
              <div className="font-semibold text-xs">{category}:</div>
              {shortcuts.slice(0, 3).map((shortcut, idx) => (
                <div key={idx} className="text-xs opacity-75">
                  {shortcut.description}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};