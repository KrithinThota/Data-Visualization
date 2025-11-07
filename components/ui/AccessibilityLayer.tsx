'use client';

import React, { useCallback, useEffect, useRef } from 'react';
import { DataPoint } from '@/types/dashboard';

interface AccessibilityLayerProps {
  children: React.ReactNode;
  data?: DataPoint[];
  onHover?: (point: DataPoint | null, event: MouseEvent) => void;
  chartId?: string;
  enableKeyboardNavigation?: boolean;
  enableScreenReaderSupport?: boolean;
  ariaLabel?: string;
  ariaDescription?: string;
}

interface FocusableElement {
  focus: () => void;
  blur: () => void;
}

export const AccessibilityLayer: React.FC<AccessibilityLayerProps> = ({
  children,
  data = [],
  onHover,
  chartId = 'chart',
  enableKeyboardNavigation = true,
  enableScreenReaderSupport = true,
  ariaLabel = 'Interactive data visualization',
  ariaDescription = 'Use arrow keys to navigate data points, Enter for details, Escape to close tooltips'
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const focusableElements = useRef<FocusableElement[]>([]);
  const currentFocusedIndex = useRef(0);
  const [announcements, setAnnouncements] = React.useState<string>('');

  // Generate announcements for screen readers
  const announceChange = useCallback((message: string) => {
    if (enableScreenReaderSupport) {
      setAnnouncements(message);
      setTimeout(() => setAnnouncements(''), 1000);
    }
  }, [enableScreenReaderSupport]);

  // Focus management
  const focusToElement = useCallback((index: number) => {
    if (focusableElements.current[index]) {
      focusableElements.current[index].focus();
    }
  }, []);

  // Keyboard navigation handler
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enableKeyboardNavigation || !data.length) return;

    switch (event.key) {
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault();
        if (currentFocusedIndex.current > 0) {
          currentFocusedIndex.current--;
          focusToElement(currentFocusedIndex.current);
          announceChange(`Navigated to data point ${currentFocusedIndex.current + 1} of ${data.length}`);
        }
        break;
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault();
        if (currentFocusedIndex.current < data.length - 1) {
          currentFocusedIndex.current++;
          focusToElement(currentFocusedIndex.current);
          announceChange(`Navigated to data point ${currentFocusedIndex.current + 1} of ${data.length}`);
        }
        break;
      case 'Enter':
        event.preventDefault();
        const focusedPoint = data[currentFocusedIndex.current];
        if (focusedPoint && onHover) {
          onHover(focusedPoint, {} as MouseEvent);
          announceChange(
            `Data point: ${focusedPoint.value} at ${new Date(focusedPoint.timestamp).toLocaleString()}`
          );
        }
        break;
      case 'Escape':
        event.preventDefault();
        if (onHover) {
          onHover(null, {} as MouseEvent);
          announceChange('Closed data point details');
        }
        break;
      case 'Home':
        event.preventDefault();
        currentFocusedIndex.current = 0;
        focusToElement(0);
        announceChange('Navigated to first data point');
        break;
      case 'End':
        event.preventDefault();
        currentFocusedIndex.current = data.length - 1;
        focusToElement(data.length - 1);
        announceChange('Navigated to last data point');
        break;
    }
  }, [enableKeyboardNavigation, data, onHover, announceChange, focusToElement]);

  // Register global keyboard events
  useEffect(() => {
    if (enableKeyboardNavigation) {
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
    // Always return cleanup function to avoid undefined returns
    return () => {};
  }, [handleKeyDown, enableKeyboardNavigation]);

  // Update focusable elements when data changes
  useEffect(() => {
    if (data.length > 0) {
      focusableElements.current = data.map((_, index) => ({
        focus: () => announceChange(`Focus on data point ${index + 1}`),
        blur: () => announceChange(`Blur data point ${index + 1}`)
      }));
    }
  }, [data, announceChange]);

  return (
    <div
      ref={containerRef}
      className="accessibility-layer"
      role="region"
      aria-label={ariaLabel}
      aria-describedby={enableScreenReaderSupport ? `${chartId}-description` : undefined}
    >
      {/* Screen reader description */}
      {enableScreenReaderSupport && (
        <div id={`${chartId}-description`} className="sr-only">
          {ariaDescription}
        </div>
      )}

      {/* Live region for announcements */}
      {enableScreenReaderSupport && (
        <div
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
          role="status"
        >
          {announcements}
        </div>
      )}

      {/* Skip links for keyboard navigation */}
      {enableKeyboardNavigation && (
        <div className="sr-only">
          <a href={`#${chartId}-content`} className="skip-link">
            Skip to chart content
          </a>
          <a href={`#${chartId}-controls`} className="skip-link">
            Skip to chart controls
          </a>
        </div>
      )}

      {/* Main content with accessibility enhancement */}
      <div id={`${chartId}-content`} className="accessibility-content">
        <div
          data-accessibility-id={chartId}
          role="application"
          aria-label={ariaLabel}
          tabIndex={enableKeyboardNavigation ? 0 : undefined}
        >
          {children}
        </div>
      </div>

      {/* Keyboard navigation help */}
      {enableKeyboardNavigation && data.length > 0 && (
        <div
          id={`${chartId}-controls`}
          className="sr-only"
          role="navigation"
          aria-label="Chart navigation"
        >
          <p>
            Keyboard shortcuts: Use arrow keys to navigate data points, 
            Enter for details, Escape to close, Home for first point, 
            End for last point. Total data points: {data.length}
          </p>
        </div>
      )}

      <style jsx>{`
        .accessibility-layer:focus-within .chart-canvas {
          outline: 2px solid #3b82f6;
          outline-offset: 2px;
        }
        
        .skip-link {
          position: absolute;
          top: -40px;
          left: 6px;
          background: #000;
          color: #fff;
          padding: 8px;
          text-decoration: none;
          border-radius: 4px;
          z-index: 1000;
        }
        
        .skip-link:focus {
          top: 6px;
        }
        
        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }
      `}</style>
    </div>
  );
};

// Utility component for accessible chart elements
export const AccessibleChartElement: React.FC<{
  children: React.ReactNode;
  role?: string;
  ariaLabel?: string;
  ariaDescription?: string;
  tabIndex?: number;
}> = ({
  children,
  role = 'img',
  ariaLabel,
  ariaDescription,
  tabIndex = 0
}) => {
  return (
    <div
      role={role}
      aria-label={ariaLabel}
      aria-description={ariaDescription}
      tabIndex={tabIndex}
      className="accessible-chart-element"
    >
      {children}
    </div>
  );
};

// Hook for accessibility announcements
export const useAccessibilityAnnouncement = () => {
  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', priority);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }, []);

  return { announce };
};

// Utility for creating accessible data descriptions
export const createAccessibleDataDescription = (data: DataPoint[]): string => {
  if (!data.length) return 'No data available';
  
  const values = data.map(d => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
  
  return `Chart contains ${data.length} data points. Value range: ${min.toFixed(2)} to ${max.toFixed(2)}, average: ${avg.toFixed(2)}`;
};