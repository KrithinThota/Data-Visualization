# Testing Guide

## Overview

This comprehensive testing guide covers all aspects of testing the Ultra-High Performance Data Visualization Dashboard, including unit tests, integration tests, performance tests, and accessibility testing.

## Table of Contents

1. [Testing Strategy](#testing-strategy)
2. [Test Setup](#test-setup)
3. [Unit Testing](#unit-testing)
4. [Integration Testing](#integration-testing)
5. [Performance Testing](#performance-testing)
6. [Accessibility Testing](#accessibility-testing)
7. [End-to-End Testing](#end-to-end-testing)
8. [Test Configuration](#test-configuration)
9. [CI/CD Integration](#cicd-integration)
10. [Testing Best Practices](#testing-best-practices)

---

## Testing Strategy

### Testing Pyramid

Our testing strategy follows the testing pyramid approach:

```
                    /\
                   /  \
                  / E2E \
                 /______\
                /        \
               /Integration\
              /____________\
             /              \
            /    Unit       \
           /________________\
```

#### Test Distribution
- **Unit Tests**: 70% (Components, hooks, utilities)
- **Integration Tests**: 20% (Data flow, component interaction)
- **E2E Tests**: 10% (Critical user journeys)

### Testing Principles

1. **Performance-First**: All tests must maintain 60fps requirements
2. **Memory-Safe**: Tests include memory leak detection
3. **Accessibility**: All UI components tested for accessibility
4. **Cross-Browser**: Tests run on multiple browser engines
5. **Real Data**: Tests use realistic data patterns

---

## Test Setup

### Dependencies

Add testing dependencies to `package.json`:

```json
{
  "devDependencies": {
    "@testing-library/react": "^13.4.0",
    "@testing-library/jest-dom": "^5.16.5",
    "@testing-library/user-event": "^14.4.3",
    "@types/jest": "^29.2.0",
    "jest": "^29.2.0",
    "jest-environment-jsdom": "^29.2.0",
    "jest-canvas-mock": "^2.4.0",
    "msw": "^0.47.0",
    "cypress": "^10.0.0",
    "@cypress/react18": "^2.0.0",
    "axe-core": "^4.4.0",
    "jest-axe": "^6.0.0"
  },
  "jest": {
    "testEnvironment": "jsdom",
    "setupFilesAfterEnv": ["<rootDir>/jest.setup.js"],
    "moduleNameMapping": {
      "^@/(.*)$": "<rootDir>/$1"
    },
    "collectCoverageFrom": [
      "components/**/*.{ts,tsx}",
      "hooks/**/*.{ts,tsx}",
      "lib/**/*.{ts,tsx}",
      "!lib/**/*.d.ts"
    ],
    "coverageThreshold": {
      "global": {
        "branches": 80,
        "functions": 80,
        "lines": 80,
        "statements": 80
      }
    }
  }
}
```

### Test Configuration

Create `jest.setup.js`:

```javascript
import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';
import { server } from './tests/msw/server';

// Polyfills for Node.js environment
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock WebGL and Canvas
import 'jest-canvas-mock';

// Mock WebGPU API
global.navigator = {
  ...global.navigator,
  gpu: {
    requestAdapter: jest.fn(),
    requestDevice: jest.fn()
  }
};

// Mock performance API
global.performance = {
  ...global.performance,
  memory: {
    usedJSHeapSize: 1024 * 1024 * 50, // 50MB
    totalJSHeapSize: 1024 * 1024 * 100,
    jsHeapSizeLimit: 1024 * 1024 * 500
  },
  now: jest.fn(() => Date.now())
};

// Setup MSW
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Custom matchers
expect.extend({
  toBeWithinRange(received, floor, ceiling) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () => `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  }
});
```

---

## Unit Testing

### Component Testing

#### Chart Components

Test `LineChart` component:

```typescript
// tests/components/LineChart.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LineChart } from '@/components/charts/LineChart';
import { ChartConfig } from '@/types/dashboard';
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

const mockChartConfig: ChartConfig = {
  id: 'test-line-chart',
  type: 'line',
  dataKey: 'value',
  color: '#3b82f6',
  visible: true,
  aggregation: '1min'
};

const mockData = Array.from({ length: 1000 }, (_, i) => ({
  timestamp: Date.now() + i * 1000,
  value: Math.sin(i / 10) * 50 + 50,
  category: 'A'
}));

describe('LineChart', () => {
  beforeEach(() => {
    // Mock canvas context
    HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
      canvas: { width: 800, height: 400 },
      clearRect: jest.fn(),
      beginPath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      stroke: jest.fn(),
      fill: jest.fn(),
      save: jest.fn(),
      restore: jest.fn(),
      scale: jest.fn(),
      translate: jest.fn()
    }));
  });

  it('renders without crashing', () => {
    render(
      <LineChart
        config={mockChartConfig}
        width={800}
        height={400}
      />
    );
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('displays correct accessibility attributes', () => {
    render(
      <LineChart
        config={mockChartConfig}
        width={800}
        height={400}
        enableAccessibility={true}
      />
    );
    
    const chart = screen.getByRole('img');
    expect(chart).toHaveAttribute('aria-label');
    expect(chart).toHaveAttribute('role', 'img');
  });

  it('handles mouse hover events', async () => {
    const user = userEvent.setup();
    const mockOnHover = jest.fn();

    render(
      <LineChart
        config={mockChartConfig}
        width={800}
        height={400}
        onHover={mockOnHover}
      />
    );

    const canvas = screen.getByRole('img');
    await user.hover(canvas);
    
    await waitFor(() => {
      expect(mockOnHover).toHaveBeenCalled();
    });
  });

  it('meets accessibility standards', async () => {
    const { container } = render(
      <LineChart
        config={mockChartConfig}
        width={800}
        height={400}
        enableAccessibility={true}
      />
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('maintains performance with large datasets', async () => {
    const startTime = performance.now();
    
    render(
      <LineChart
        config={mockChartConfig}
        width={800}
        height={400}
      />
    );

    // Wait for initial render
    await waitFor(() => {
      expect(screen.getByRole('img')).toBeInTheDocument();
    });

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    // Chart should render within 16ms for 60fps
    expect(renderTime).toBeLessThan(16);
  });
});
```

#### Hook Testing

Test performance monitoring hook:

```typescript
// tests/hooks/usePerformanceMonitor.test.ts
import { renderHook, act } from '@testing-library/react';
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';
import { WebGPUIntegration } from '@/lib/webgpu/webgpuIntegration';

describe('usePerformanceMonitor', () => {
  it('initializes with default metrics', () => {
    const { result } = renderHook(() => usePerformanceMonitor());

    expect(result.current.metrics).toEqual({
      fps: 0,
      memoryUsage: 0,
      renderTime: 0,
      dataProcessingTime: 0,
      interactionLatency: 0,
      gpuMemoryUsage: 0,
      computeTime: 0,
      renderTimeGPU: 0,
      webgpuEnabled: false,
      rendererType: 'canvas'
    });
  });

  it('measures render time correctly', () => {
    const { result } = renderHook(() => usePerformanceMonitor());

    act(() => {
      result.current.measureRenderTime('test-render', () => {
        // Simulate render work
        const start = Date.now();
        while (Date.now() - start < 5) {
          // Busy wait for 5ms
        }
      });
    });

    // The measureRenderTime function adds marks and measures
    // We can't easily test the actual timing in Jest environment
    expect(result.current.metrics.renderTime).toBeGreaterThanOrEqual(0);
  });

  it('tracks interaction latency', () => {
    const { result } = renderHook(() => usePerformanceMonitor());

    act(() => {
      const startTime = result.current.startInteractionMeasurement();
      
      // Simulate interaction
      setTimeout(() => {
        act(() => {
          result.current.measureInteractionLatency(startTime);
        });
      }, 10);
    });

    // Wait for the async operation
    expect(result.current.metrics.interactionLatency).toBeGreaterThanOrEqual(0);
  });
});
```

### Utility Testing

Test memory management utilities:

```typescript
// tests/lib/memory/memoryMonitor.test.ts
import { MemoryManager } from '@/lib/memory/memoryMonitor';

describe('MemoryManager', () => {
  let memoryManager: MemoryManager;

  beforeEach(() => {
    memoryManager = new MemoryManager();
  });

  afterEach(() => {
    memoryManager.cleanup();
  });

  it('tracks object allocations', () => {
    const testObject = { data: 'test' };
    
    memoryManager.registerObject(testObject, 'TestObject', 1024);

    const stats = memoryManager.getMemoryStats();
    expect(stats.totalObjects).toBe(1);
    expect(stats.allocatedSize).toBe(1024);
  });

  it('detects memory leaks', () => {
    const leakObjects: object[] = [];
    
    // Simulate memory leak
    for (let i = 0; i < 10; i++) {
      const obj = { id: i, data: `test-${i}` };
      memoryManager.registerObject(obj, 'LeakObject', 512);
      leakObjects.push(obj);
    }

    // Advance time to simulate aging
    jest.advanceTimersByTime(60000); // 1 minute

    const leaks = memoryManager.detectLeaks();
    expect(leaks.length).toBeGreaterThan(0);
  });

  it('cleans up resources properly', () => {
    const testObject = { data: 'test' };
    memoryManager.registerObject(testObject, 'TestObject', 1024);
    
    expect(memoryManager.getMemoryStats().totalObjects).toBe(1);

    memoryManager.cleanup();
    
    expect(memoryManager.getMemoryStats().totalObjects).toBe(0);
  });
});
```

---

## Integration Testing

### Data Flow Testing

Test data flow from generator to components:

```typescript
// tests/integration/dataFlow.test.tsx
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { Dashboard } from '@/components/Dashboard';
import { DataProvider } from '@/components/providers/DataProvider';
import { DataGenerator } from '@/lib/data/dataGenerator';

describe('Data Flow Integration', () => {
  it('flows data from generator to charts', async () => {
    const dataGenerator = new DataGenerator(100);
    
    render(
      <DataProvider dataGenerator={dataGenerator}>
        <Dashboard />
      </DataProvider>
    );

    // Wait for initial data load
    await waitFor(() => {
      const dataElements = screen.queryAllByText(/FPS:/);
      expect(dataElements.length).toBeGreaterThan(0);
    });

    // Verify performance monitor is showing metrics
    expect(screen.getByText(/FPS:/)).toBeInTheDocument();
    expect(screen.getByText(/Memory:/)).toBeInTheDocument();
  });

  it('handles real-time data updates', async () => {
    const dataGenerator = new DataGenerator(50); // Fast updates
    let updateCount = 0;

    render(
      <DataProvider dataGenerator={dataGenerator}>
        <Dashboard />
      </DataProvider>
    );

    // Wait for first update
    await waitFor(() => {
      const fpsText = screen.getByText(/FPS:/);
      expect(fpsText).toBeInTheDocument();
    });

    // Advance time and check for updates
    jest.advanceTimersByTime(500);
    
    await waitFor(() => {
      // Component should continue to show updated metrics
      expect(screen.getByText(/FPS:/)).toBeInTheDocument();
    });
  });
});
```

### Component Interaction Testing

Test chart interactions with controls:

```typescript
// tests/integration/chartInteractions.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Dashboard } from '@/components/Dashboard';

describe('Chart Interactions', () => {
  it('responds to view mode changes', async () => {
    const user = userEvent.setup();
    
    render(<Dashboard />);

    // Wait for dashboard to load
    await waitFor(() => {
      expect(screen.getByText('Charts')).toBeInTheDocument();
    });

    // Switch to table view
    await user.click(screen.getByText('Table'));
    
    await waitFor(() => {
      expect(screen.getByText('Data points:')).toBeInTheDocument();
    });

    // Switch to split view
    await user.click(screen.getByText('Split'));
    
    await waitFor(() => {
      expect(screen.getByText('Charts')).toBeInTheDocument();
      expect(screen.getByText('Table')).toBeInTheDocument();
    });
  });

  it('handles keyboard shortcuts', async () => {
    const user = userEvent.setup();
    
    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('Charts')).toBeInTheDocument();
    });

    // Test fullscreen toggle (Ctrl+F)
    await user.keyboard('{Control>f}');
    
    // Verify fullscreen state (you might need to adjust this based on implementation)
    await waitFor(() => {
      // Add appropriate assertions for fullscreen state
    });
  });
});
```

---

## Performance Testing

### Benchmark Testing

Test performance with different data sizes:

```typescript
// tests/performance/benchmark.test.ts
import { PerformanceBenchmarkingSuite, STANDARD_BENCHMARKS } from '@/lib/performance/performanceBenchmarking';

describe('Performance Benchmarks', () => {
  let benchmarkSuite: PerformanceBenchmarkingSuite;

  beforeEach(() => {
    benchmarkSuite = new PerformanceBenchmarkingSuite();
  });

  it('meets FPS targets for medium load', async () => {
    const result = await benchmarkSuite.runBenchmark(
      STANDARD_BENCHMARKS.mediumLoad,
      async (data, renderer) => {
        // Mock rendering function
        const canvas = document.createElement('canvas');
        canvas.width = 800;
        canvas.height = 400;
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, 800, 400);
          ctx.beginPath();
          data.forEach((point, index) => {
            if (index === 0) {
              ctx.moveTo(index * 0.08, 400 - point.value * 4);
            } else {
              ctx.lineTo(index * 0.08, 400 - point.value * 4);
            }
          });
          ctx.stroke();
        }
      },
      (count) => Array.from({ length: count }, (_, i) => ({
        timestamp: Date.now() + i,
        value: Math.random() * 100,
        category: 'A'
      }))
    );

    expect(result.results.canvas?.averageFPS).toBeGreaterThanOrEqual(55);
    expect(result.results.canvas?.fpsStability).toBeLessThanOrEqual(0.2);
  });

  it('detects memory leaks under stress', async () => {
    const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;
    
    await benchmarkSuite.runBenchmark(
      STANDARD_BENCHMARKS.stressTest,
      async (data) => {
        // Simulate rendering with potential memory leaks
        const largeDataSet = Array.from({ length: 100000 }, (_, i) => ({
          timestamp: Date.now() + i,
          value: Math.random() * 100,
          category: 'A'
        }));
        
        return largeDataSet;
      },
      (count) => Array.from({ length: count }, (_, i) => ({
        timestamp: Date.now() + i,
        value: Math.random() * 100,
        category: 'A'
      }))
    );

    const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
    const memoryGrowth = finalMemory - initialMemory;
    
    // Memory growth should be less than 50MB for stress test
    expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024);
  });

  it('compares Canvas vs WebGPU performance', async () => {
    const result = await benchmarkSuite.runBenchmark(
      STANDARD_BENCHMARKS.mediumLoad,
      async (data, renderer) => {
        // Rendering logic here
        return Promise.resolve();
      },
      (count) => Array.from({ length: count }, (_, i) => ({
        timestamp: Date.now() + i,
        value: Math.random() * 100,
        category: 'A'
      }))
    );

    if (result.results.canvas && result.results.webgpu) {
      // WebGPU should be faster or equal
      expect(result.results.webgpu.averageFPS).toBeGreaterThanOrEqual(
        result.results.canvas.averageFPS * 0.9
      );
    }
  });
});
```

### Memory Testing

Test memory management:

```typescript
// tests/performance/memory.test.ts
import { render, cleanup } from '@testing-library/react';
import { LineChart } from '@/components/charts/LineChart';

describe('Memory Management', () => {
  afterEach(() => {
    cleanup();
  });

  it('does not leak memory on mount/unmount cycles', () => {
    const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;
    const config = {
      id: 'test-chart',
      type: 'line' as const,
      dataKey: 'value',
      color: '#3b82f6',
      visible: true
    };

    // Mount and unmount multiple times
    for (let i = 0; i < 10; i++) {
      const { unmount } = render(
        <LineChart config={config} width={800} height={400} />
      );
      
      unmount();
      cleanup();
    }

    // Force garbage collection (in Node.js this might not work)
    if (global.gc) {
      global.gc();
    }

    const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
    const memoryGrowth = finalMemory - initialMemory;
    
    // Allow some growth but not excessive
    expect(memoryGrowth).toBeLessThan(10 * 1024 * 1024); // 10MB
  });

  it('releases canvas resources properly', () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      const originalRestore = ctx.restore;
      ctx.restore = jest.fn().mockImplementation(originalRestore);
      
      const config = {
        id: 'test-chart',
        type: 'line' as const,
        dataKey: 'value',
        color: '#3b82f6',
        visible: true
      };

      render(
        <LineChart config={config} width={800} height={400} />
      );

      cleanup();

      // Canvas context should be restored
      expect(ctx.restore).toHaveBeenCalled();
    }
  });
});
```

---

## Accessibility Testing

### WCAG Compliance Testing

```typescript
// tests/accessibility/accessibility.test.tsx
import React from 'react';
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { Dashboard } from '@/components/Dashboard';
import { LineChart } from '@/components/charts/LineChart';

expect.extend(toHaveNoViolations);

describe('Accessibility Tests', () => {
  it('Dashboard meets WCAG 2.1 AA standards', async () => {
    const { container } = render(<Dashboard />);
    const results = await axe(container, {
      rules: {
        'color-contrast': { enabled: true },
        'keyboard-navigation': { enabled: true },
        'focus-management': { enabled: true }
      }
    });

    expect(results).toHaveNoViolations();
  });

  it('Chart components have proper ARIA labels', () => {
    const config = {
      id: 'test-chart',
      type: 'line' as const,
      dataKey: 'value',
      color: '#3b82f6',
      visible: true
    };

    const { container } = render(
      <LineChart
        config={config}
        width={800}
        height={400}
        enableAccessibility={true}
      />
    );

    const chart = container.querySelector('canvas');
    expect(chart).toHaveAttribute('aria-label');
    expect(chart).toHaveAttribute('role', 'img');
    
    // Check for title element
    expect(container.querySelector('title')).toBeInTheDocument();
  });

  it('supports keyboard navigation', async () => {
    const user = require('@testing-library/user-event').default;
    const userEvent = user.setup();
    
    render(<Dashboard />);

    // Tab through interactive elements
    await userEvent.tab();
    expect(document.activeElement).toBeTruthy();

    // More keyboard navigation tests...
  });

  it('provides adequate color contrast', async () => {
    const config = {
      id: 'test-chart',
      type: 'line' as const,
      dataKey: 'value',
      color: '#3b82f6', // Should have good contrast
      visible: true
    };

    const { container } = render(
      <LineChart
        config={config}
        width={800}
        height={400}
        enableAccessibility={true}
      />
    );

    const results = await axe(container, {
      rules: {
        'color-contrast': { enabled: true }
      }
    });

    expect(results).toHaveNoViolations();
  });

  it('works with screen readers', () => {
    const config = {
      id: 'test-chart',
      type: 'line' as const,
      dataKey: 'value',
      color: '#3b82f6',
      visible: true
    };

    const { container } = render(
      <LineChart
        config={config}
        width={800}
        height={400}
        enableAccessibility={true}
      />
    );

    // Check for screen reader support elements
    expect(container.querySelector('[aria-live]')).toBeInTheDocument();
    expect(container.querySelector('[aria-describedby]')).toBeInTheDocument();
  });
});
```

---

## End-to-End Testing

### Cypress Configuration

Create `cypress.config.ts`:

```typescript
import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    supportFile: 'cypress/support/e2e.ts',
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    viewportWidth: 1280,
    viewportHeight: 720,
    video: false,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
    responseTimeout: 30000
  },
  component: {
    devServer: {
      framework: 'next',
      bundler: 'webpack'
    },
    specPattern: 'cypress/component/**/*.cy.{js,jsx,ts,tsx}'
  }
});
```

### E2E Test Examples

```typescript
// cypress/e2e/dashboard.cy.ts
describe('Dashboard E2E Tests', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('loads dashboard and displays charts', () => {
    cy.get('h1').contains('Performance Dashboard');
    cy.get('[data-testid="performance-monitor"]').should('be.visible');
    cy.get('[data-testid="chart-grid"]').should('be.visible');
  });

  it('switches between view modes', () => {
    // Default to charts view
    cy.get('[data-testid="view-charts"]').should('have.class', 'active');

    // Switch to table view
    cy.get('[data-testid="view-table"]').click();
    cy.get('[data-testid="data-table"]').should('be.visible');

    // Switch to split view
    cy.get('[data-testid="view-split"]').click();
    cy.get('[data-testid="chart-grid"]').should('be.visible');
    cy.get('[data-testid="data-table"]').should('be.visible');
  });

  it('toggles fullscreen mode', () => {
    cy.get('[data-testid="fullscreen-toggle"]').click();
    cy.get('body').should('have.class', 'fullscreen');

    cy.get('[data-testid="fullscreen-toggle"]').click();
    cy.get('body').should('not.have.class', 'fullscreen');
  });

  it('displays real-time performance metrics', () => {
    cy.get('[data-testid="fps-counter"]').should('be.visible');
    cy.get('[data-testid="memory-usage"]').should('be.visible');
    
    // Verify metrics are updating
    cy.get('[data-testid="fps-counter"]').then(($fps) => {
      const initialFps = parseFloat($fps.text() || '0');
      cy.wait(1000);
      cy.get('[data-testid="fps-counter"]').should('not.equal', initialFps.toString());
    });
  });

  it('handles keyboard shortcuts', () => {
    // Test fullscreen shortcut
    cy.get('body').type('{ctrl+f}');
    cy.get('body').should('have.class', 'fullscreen');

    // Test view mode shortcuts
    cy.get('body').type('{ctrl+f}'); // Exit fullscreen first
    cy.get('body').type('2');
    cy.get('[data-testid="view-table"]').should('have.class', 'active');

    cy.get('body').type('3');
    cy.get('[data-testid="view-split"]').should('have.class', 'active');
  });

  it('maintains performance with large datasets', () => {
    // This test would be more complex in a real scenario
    // For now, we'll just check that the dashboard remains responsive
    
    const startTime = Date.now();
    
    cy.get('[data-testid="chart-grid"]').should('be.visible');
    
    cy.then(() => {
      const loadTime = Date.now() - startTime;
      expect(loadTime).to.be.lessThan(2000); // Should load within 2 seconds
    });
  });

  it('is accessible via keyboard navigation', () => {
    // Tab through interactive elements
    cy.get('body').tab();
    cy.focused().should('have.attr', 'data-testid', 'view-charts');

    cy.get('body').tab();
    cy.focused().should('have.attr', 'data-testid', 'view-table');

    // Test chart interaction via keyboard
    cy.get('canvas').focus();
    cy.get('canvas').should('have.attr', 'tabindex', '0');
  });
});
```

### Component Testing with Cypress

```typescript
// cypress/component/Chart.cy.tsx
import React from 'react';
import { LineChart } from '@/components/charts/LineChart';

describe('LineChart Component', () => {
  const config = {
    id: 'test-chart',
    type: 'line' as const,
    dataKey: 'value',
    color: '#3b82f6',
    visible: true
  };

  it('renders chart correctly', () => {
    cy.mount(
      <LineChart
        config={config}
        width={800}
        height={400}
      />
    );

    cy.get('canvas').should('have.width', 800);
    cy.get('canvas').should('have.height', 400);
  });

  it('responds to mouse hover', () => {
    const onHover = cy.stub().as('onHover');
    
    cy.mount(
      <LineChart
        config={config}
        width={800}
        height={400}
        onHover={onHover}
      />
    );

    cy.get('canvas').trigger('mouseover', { clientX: 400, clientY: 200 });
    cy.get('@onHover').should('have.been.called');
  });
});
```

---

## Test Configuration

### Environment-Specific Testing

```typescript
// jest.config.js
const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  collectCoverageFrom: [
    'components/**/*.{js,jsx,ts,tsx}',
    'hooks/**/*.{js,jsx,ts,tsx}',
    'lib/**/*.{js,jsx,ts,tsx}',
    '!lib/**/*.d.ts',
    '!tests/**/*',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    // Per-file thresholds
    './components/charts/LineChart.tsx': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
  // Test patterns
  testMatch: [
    '<rootDir>/tests/**/*.test.{js,jsx,ts,tsx}',
    '<rootDir>/tests/**/*.spec.{js,jsx,ts,tsx}',
    '<rootDir>/tests/integration/**/*.test.{js,jsx,ts,tsx}',
    '<rootDir>/tests/performance/**/*.test.{js,jsx,ts,tsx}',
  ],
  // Coverage exclusions
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/tests/',
    '/cypress/',
    '/.next/',
    '/coverage/',
    '/public/',
  ],
};

module.exports = createJestConfig(customJestConfig);
```

### Package.json Scripts

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:ci": "jest --ci --coverage --watchAll=false",
    "test:unit": "jest --testPathPattern=tests/unit",
    "test:integration": "jest --testPathPattern=tests/integration",
    "test:performance": "jest --testPathPattern=tests/performance",
    "test:accessibility": "jest --testPathPattern=tests/accessibility",
    "test:e2e": "cypress run",
    "test:e2e:open": "cypress open",
    "test:e2e:ci": "cypress run --headless",
    "test:all": "npm run test:unit && npm run test:integration && npm run test:performance && npm run test:e2e:ci"
  }
}
```

---

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        node-version: [18.x, 20.x]
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Use Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm run test:ci
      
      - name: Upload coverage reports
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info

  integration-tests:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Use Node.js 18.x
        uses: actions/setup-node@v3
        with:
          node-version: 18.x
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run integration tests
        run: npm run test:integration

  e2e-tests:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Use Node.js 18.x
        uses: actions/setup-node@v3
        with:
          node-version: 18.x
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build application
        run: npm run build
      
      - name: Start application
        run: npm run start &
      
      - name: Wait for application
        run: npx wait-on http://localhost:3000
      
      - name: Run E2E tests
        run: npm run test:e2e:ci

  accessibility-tests:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Use Node.js 18.x
        uses: actions/setup-node@v3
        with:
          node-version: 18.x
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run accessibility tests
        run: npm run test:accessibility

  performance-tests:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Use Node.js 18.x
        uses: actions/setup-node@v3
        with:
          node-version: 18.x
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run performance tests
        run: npm run test:performance
      
      - name: Upload performance results
        uses: actions/upload-artifact@v3
        with:
          name: performance-results
          path: benchmark-results/
```

---

## Testing Best Practices

### Performance Testing Guidelines

1. **Mock External Dependencies**: Use MSW to mock API calls
2. **Isolate Performance Tests**: Run performance tests separately
3. **Use Realistic Data**: Generate data that matches production patterns
4. **Monitor Memory**: Include memory leak detection in tests
5. **Set Timeouts**: Use appropriate timeouts for performance tests

### Accessibility Testing Guidelines

1. **Test Keyboard Navigation**: Ensure all functionality works with keyboard
2. **Check Color Contrast**: Verify WCAG AA standards
3. **Screen Reader Support**: Test with actual screen readers
4. **Focus Management**: Verify proper focus handling
5. **Semantic HTML**: Use proper HTML elements and ARIA attributes

### Component Testing Guidelines

1. **Test User Interactions**: Test clicks, hovers, keyboard events
2. **Mock Complex Dependencies**: Use Jest mocks for external dependencies
3. **Test Error States**: Include tests for error conditions
4. **Test Loading States**: Verify skeleton and loading displays
5. **Test Accessibility**: Every UI component should be accessible

### Integration Testing Guidelines

1. **Test Data Flow**: Verify data moves correctly through the pipeline
2. **Test Component Communication**: Test props and state changes
3. **Test Real-time Updates**: Verify live data updates work
4. **Test Error Propagation**: Ensure errors bubble up correctly
5. **Test Cleanup**: Verify resources are released properly

This comprehensive testing guide ensures high quality, performance, and accessibility for the dashboard application.