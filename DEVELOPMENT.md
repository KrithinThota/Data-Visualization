# Development Guide

## Overview

This comprehensive guide is designed for developers who want to contribute to, extend, or modify the Ultra-High Performance Data Visualization Dashboard. It covers development setup, coding standards, contribution guidelines, and advanced customization patterns.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Development Environment Setup](#development-environment-setup)
3. [Project Structure](#project-structure)
4. [Coding Standards](#coding-standards)
5. [Development Workflow](#development-workflow)
6. [Contributing Guidelines](#contributing-guidelines)
7. [Customization Guide](#customization-guide)
8. [Performance Optimization](#performance-optimization)
9. [Debugging & Profiling](#debugging--profiling)
10. [Advanced Features](#advanced-features)

---

## Getting Started

### Prerequisites

Before you start developing, ensure you have:

- **Node.js**: Version 18.0 or higher
- **npm/yarn/pnpm**: Latest version
- **Git**: For version control
- **Modern Code Editor**: VS Code recommended with extensions
- **Browser**: Chrome/Firefox/Safari with developer tools

### Quick Start

```bash
# Clone the repository
git clone https://github.com/your-username/data-visualization-dashboard.git
cd data-visualization-dashboard

# Install dependencies
npm install

# Start development server
npm run dev

# Open browser
open http://localhost:3000
```

### Essential VS Code Extensions

Install these extensions for the best development experience:

```json
{
  "recommendations": [
    "ms-vscode.vscode-typescript-next",
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "ms-vscode.vscode-jest",
    "ms-vscode.vscode-json",
    "ms-python.python",
    "streetsidesoftware.code-spell-checker"
  ]
}
```

---

## Development Environment Setup

### Local Development Configuration

Create `.env.local` for development:

```env
# Development Environment
NODE_ENV=development
NEXT_PUBLIC_ENABLE_WEBGPU=true
NEXT_PUBLIC_PERFORMANCE_MONITORING=true
NEXT_PUBLIC_BUNDLE_ANALYZER=true
NEXT_PUBLIC_ENABLE_DEBUG_MODE=true

# Testing Configuration
NEXT_PUBLIC_TEST_DATA_POINTS=10000
NEXT_PUBLIC_ENABLE_MEMORY_DEBUGGING=true

# Mock Data (for development without real data source)
NEXT_PUBLIC_MOCK_DATA=true
NEXT_PUBLIC_DATA_UPDATE_INTERVAL=100

# Debug Settings
NEXT_PUBLIC_DEBUG_COMPONENTS=true
NEXT_PUBLIC_DEBUG_PERFORMANCE=true
NEXT_PUBLIC_DEBUG_MEMORY=true

# Local Development
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_WEBSOCKET_URL=ws://localhost:3001
```

### Development Scripts

Add these helpful scripts to your `package.json`:

```json
{
  "scripts": {
    "dev": "next dev",
    "dev:debug": "NODE_OPTIONS='--inspect' next dev",
    "dev:perf": "NEXT_PUBLIC_DEBUG_PERFORMANCE=true npm run dev",
    "dev:memory": "NEXT_PUBLIC_DEBUG_MEMORY=true npm run dev",
    "dev:components": "NEXT_PUBLIC_DEBUG_COMPONENTS=true npm run dev",
    "dev:analysis": "ANALYZE=true npm run dev",
    "dev:test": "npm run dev & npm run test:watch",
    "dev:full": "npm run dev & npm run test:watch & npm run storybook"
  }
}
```

### Browser Developer Tools Setup

#### Chrome DevTools Configuration

1. **Performance Panel**: Use for frame rate analysis and memory profiling
2. **Memory Tab**: Monitor heap usage and detect memory leaks
3. **Performance Monitor**: Real-time performance metrics
4. **Coverage**: Analyze unused JavaScript and CSS

#### React DevTools

Install React DevTools browser extension for component debugging:

```bash
# Chrome
# https://chrome.google.com/webstore/detail/react-developer-tools/fmkadmapgofadopljbjfkapdkoienihi

# Firefox  
# https://addons.mozilla.org/en-US/firefox/addon/react-devtools/
```

---

## Project Structure

### Directory Structure

```
data-visualization-dashboard/
├── app/                          # Next.js App Router
│   ├── page.tsx                  # Home page (redirects to dashboard)
│   ├── layout.tsx                # Root layout
│   ├── globals.css               # Global styles
│   ├── favicon.ico              # App icon
│   └── dashboard/               # Dashboard route
│       └── page.tsx             # Main dashboard page
├── components/                   # React components
│   ├── Dashboard.tsx            # Main dashboard container
│   ├── charts/                  # Chart components
│   │   ├── BaseChart.tsx        # Base chart implementation
│   │   ├── LineChart.tsx        # Line chart
│   │   ├── BarChart.tsx         # Bar chart
│   │   ├── ScatterChart.tsx     # Scatter plot
│   │   ├── HeatmapChart.tsx     # Heatmap
│   │   └── ChartGrid.tsx        # Chart grid layout
│   ├── controls/                # User control components
│   │   ├── ControlPanel.tsx     # Main control panel
│   │   └── AdvancedZoomPan.tsx  # Zoom/pan controls
│   ├── providers/               # React context providers
│   │   └── DataProvider.tsx     # Data management context
│   └── ui/                      # UI components
│       ├── PerformanceMonitor.tsx # Performance metrics display
│       ├── DataTable.tsx        # Tabular data view
│       ├── IntelligentTooltip.tsx # Context-aware tooltips
│       └── AccessibilityLayer.tsx # Accessibility features
├── hooks/                       # Custom React hooks
│   ├── usePerformanceMonitor.ts # Performance monitoring
│   ├── useMemoryManagement.ts   # Memory management
│   └── useKeyboardShortcuts.ts  # Keyboard navigation
├── lib/                         # Utility libraries
│   ├── canvas/                  # Canvas rendering utilities
│   │   ├── canvasUtils.ts       # Core canvas functions
│   │   └── enhancedLOD.ts       # Level of detail system
│   ├── data/                    # Data processing
│   │   ├── dataGenerator.ts     # Realistic data generation
│   │   └── dataWorker.ts        # Web Worker for data processing
│   ├── memory/                  # Memory management
│   │   ├── memoryMonitor.ts     # Memory usage tracking
│   │   ├── enhancedLeakDetector.ts # Memory leak detection
│   │   ├── weakCache.ts         # Weak reference caching
│   │   └── sharedArrayBufferIntegration.ts # Cross-thread data sharing
│   ├── performance/             # Performance monitoring
│   │   ├── performanceBenchmarking.ts # Benchmark suite
│   │   ├── chartBenchmark.ts    # Chart-specific benchmarks
│   │   └── performanceRecommendations.ts # Optimization suggestions
│   ├── webgpu/                  # WebGPU integration
│   │   ├── webgpuIntegration.ts # Main WebGPU wrapper
│   │   ├── gpuMemoryManager.ts  # GPU memory management
│   │   └── webgpuRenderer.ts    # GPU rendering pipeline
│   └── wasm/                    # WebAssembly modules
│       ├── wasmLoader.ts        # WASM module loader
│       └── simdProcessor.ts     # SIMD data processing
├── types/                       # TypeScript type definitions
│   └── dashboard.ts             # Core dashboard types
├── public/                      # Static assets
│   ├── file.svg                 # App icons
│   ├── globe.svg
│   ├── next.svg
│   ├── vercel.svg
│   ├── window.svg
│   └── wasm/                    # WebAssembly binaries
└── tests/                       # Test suite
    ├── memory/                  # Memory management tests
    ├── performance/             # Performance tests
    └── accessibility/           # Accessibility tests
```

### File Naming Conventions

- **Components**: PascalCase (`LineChart.tsx`, `DataProvider.tsx`)
- **Hooks**: camelCase with `use` prefix (`usePerformanceMonitor.ts`)
- **Utilities**: camelCase (`dataGenerator.ts`, `canvasUtils.ts`)
- **Types**: PascalCase (`DashboardState.ts`, `ChartConfig.ts`)
- **Constants**: UPPER_SNAKE_CASE (`PERFORMANCE_CONFIG.ts`)
- **Tests**: Same as source with `.test.ts` suffix

---

## Coding Standards

### TypeScript Guidelines

#### Type Safety First

```typescript
// Good: Define proper interfaces
interface DataPoint {
  timestamp: number;
  value: number;
  category: string;
  metadata?: Record<string, any>;
}

// Bad: Using 'any' type
interface BadDataPoint {
  timestamp: any;
  value: any;
  category: any;
}
```

#### Generic Types for Reusability

```typescript
// Good: Generic hook for different data types
function useDataProcessor<T extends DataPoint>(data: T[]) {
  const processedData = useMemo(() => {
    return data.map(item => ({
      ...item,
      processed: true,
      timestamp: item.timestamp
    }));
  }, [data]);
  
  return { processedData };
}

// Usage
const { processedData } = useDataProcessor(dataPoints);
```

#### Strict Configuration

The project uses strict TypeScript configuration:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true
  }
}
```

### React Component Guidelines

#### Component Structure

```typescript
'use client';

import React, { useMemo, useCallback, useEffect } from 'react';
import { ComponentProps } from '@/types/component';

// Component with proper structure
interface ChartComponentProps {
  data: DataPoint[];
  config: ChartConfig;
  width: number;
  height: number;
  onUpdate?: (data: DataPoint[]) => void;
}

export const ChartComponent: React.FC<ChartComponentProps> = ({
  data,
  config,
  width,
  height,
  onUpdate
}) => {
  // 1. Hooks at the top
  const { performance } = usePerformanceMonitor();
  const memory = useMemoryManagement('ChartComponent');

  // 2. Computed values with useMemo
  const processedData = useMemo(() => {
    return data.filter(item => config.visible)
               .map(item => ({
                 ...item,
                 normalized: normalizeValue(item.value)
               }));
  }, [data, config]);

  // 3. Event handlers with useCallback
  const handleDataUpdate = useCallback((newData: DataPoint[]) => {
    memory.updateMemoryAccess();
    onUpdate?.(newData);
  }, [memory, onUpdate]);

  // 4. Effects
  useEffect(() => {
    memory.registerComponent('ChartComponent', processedData.length);
    return () => memory.unregisterComponent('ChartComponent');
  }, [memory, processedData.length]);

  // 5. Render
  return (
    <div className="chart-container">
      {/* Component JSX */}
    </div>
  );
};

ChartComponent.displayName = 'ChartComponent';
```

#### Performance Optimization Patterns

```typescript
// 1. React.memo for expensive components
const ExpensiveChart = React.memo<ChartProps>(({ data, config }) => {
  // Component implementation
}, (prevProps, nextProps) => {
  // Custom comparison for better optimization
  return (
    prevProps.data === nextProps.data &&
    prevProps.config.id === nextProps.config.id &&
    prevProps.width === nextProps.width &&
    prevProps.height === nextProps.height
  );
});

// 2. useMemo for expensive calculations
const expensiveCalculation = useMemo(() => {
  return data.reduce((acc, item) => {
    return acc + complexComputation(item);
  }, 0);
}, [data]);

// 3. useCallback for stable function references
const handleZoom = useCallback((zoomLevel: number) => {
  setZoomLevel(zoomLevel);
}, []);

// 4. Virtual scrolling for large lists
const VirtualizedDataTable = React.memo<TableProps>(({ data, height }) => {
  const rowRenderer = useCallback(({ index, style }) => {
    return (
      <div style={style}>
        <DataRow data={data[index]} />
      </div>
    );
  }, [data]);

  return (
    <AutoSizer height={height}>
      {({ width }) => (
        <FixedSizeList
          width={width}
          height={height}
          itemCount={data.length}
          itemSize={50}
          itemData={data}
        >
          {rowRenderer}
        </FixedSizeList>
      )}
    </AutoSizer>
  );
});
```

### CSS and Styling Guidelines

#### Tailwind CSS Best Practices

```typescript
// 1. Component-scoped styles
const ChartContainer: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`
      relative w-full h-full 
      bg-white dark:bg-gray-800 
      rounded-lg shadow-md 
      border border-gray-200 dark:border-gray-700
      ${className}
    `}>
      {/* Content */}
    </div>
  );
};

// 2. Responsive design patterns
const ResponsiveChart = () => {
  return (
    <div className={`
      grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 
      gap-4 md:gap-6 lg:gap-8
      p-4 md:p-6 lg:p-8
    `}>
      {/* Charts */}
    </div>
  );
};

// 3. Performance considerations
const OptimizedStyles = () => {
  return (
    <div className={`
      // Use transform instead of layout-changing properties
      transform transition-transform duration-200
      
      // Use will-change for frequently animated elements
      will-change-transform
      
      // Avoid expensive properties in large components
      // Use CSS custom properties for dynamic values
      bg-[color:var(--chart-bg)]
    `}>
      {/* Content */}
    </div>
  );
};
```

---

## Development Workflow

### Git Workflow

#### Branch Strategy

We use a modified Git Flow:

```
main
├── develop
├── feature/new-chart-type
├── feature/webgpu-optimization
├── hotfix/memory-leak-fix
└── release/v1.2.0
```

#### Branch Naming Convention

- **Feature**: `feature/description-of-feature`
- **Bug Fix**: `fix/description-of-fix`
- **Hot Fix**: `hotfix/critical-fix-description`
- **Documentation**: `docs/documentation-update`
- **Performance**: `perf/performance-improvement`
- **Refactor**: `refactor/code-improvement`

#### Commit Message Format

```
type(scope): description

[optional body]

[optional footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `perf`: Performance improvement
- `refactor`: Code refactoring
- `docs`: Documentation changes
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

Examples:
```bash
feat(charts): add heatmap chart type with clustering
fix(memory): resolve memory leak in data provider
perf(webgpu): optimize buffer allocation for large datasets
docs(api): update component documentation
test(performance): add benchmarks for 50k+ data points
```

### Development Cycle

#### 1. Feature Development

```bash
# Create feature branch
git checkout -b feature/new-chart-type

# Develop and commit regularly
git add .
git commit -m "feat(chart): implement basic heatmap structure"

# Keep branch updated
git fetch origin
git rebase origin/develop

# Push when ready for review
git push origin feature/new-chart-type
```

#### 2. Code Review Process

1. **Self Review**: Check your code before submitting
2. **Automated Checks**: Ensure CI passes
3. **Peer Review**: Request review from team members
4. **Address Feedback**: Make requested changes
5. **Final Approval**: Merge after approval

#### 3. Testing Requirements

Before submitting a PR, ensure:

- [ ] All unit tests pass
- [ ] Integration tests pass
- [ ] Performance benchmarks maintained
- [ ] No memory leaks introduced
- [ ] Accessibility standards met
- [ ] Documentation updated

---

## Contributing Guidelines

### Code Style

#### ESLint Configuration

The project uses a strict ESLint configuration:

```javascript
// .eslintrc.js
module.exports = {
  extends: [
    'next/core-web-vitals',
    '@typescript-eslint/recommended',
    '@typescript-eslint/recommended-requiring-type-checking'
  ],
  rules: {
    // Performance rules
    'react-hooks/exhaustive-deps': 'error',
    'react-hooks/rules-of-hooks': 'error',
    
    // TypeScript rules
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/prefer-const': 'error',
    
    // Accessibility rules
    'jsx-a11y/alt-text': 'error',
    'jsx-a11y/anchor-has-content': 'error',
    'jsx-a11y/aria-props': 'error',
    
    // Performance rules
    'react/jsx-no-bind': 'error',
    'react/jsx-no-constructed-context-values': 'error'
  }
};
```

#### Prettier Configuration

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false
}
```

### Performance Guidelines

#### Performance Checklist

Before submitting any changes:

- [ ] **FPS Impact**: Does the change maintain 60fps?
- [ ] **Memory Usage**: No new memory leaks introduced
- [ ] **Bundle Size**: New dependencies are justified
- [ ] **Rendering Time**: Component render time <16ms
- [ ] **Data Processing**: Efficient data manipulation

#### Performance Testing

```bash
# Run performance benchmarks
npm run benchmark

# Test with large datasets
npm run test:performance -- --data-points=50000

# Memory profiling
npm run test:memory

# Bundle analysis
npm run build:analyze
```

### Accessibility Guidelines

#### WCAG 2.1 AA Compliance

All UI components must meet WCAG 2.1 AA standards:

- [ ] **Keyboard Navigation**: All functionality accessible via keyboard
- [ ] **Screen Reader Support**: Proper ARIA labels and semantic HTML
- [ ] **Color Contrast**: Minimum 4.5:1 contrast ratio
- [ ] **Focus Management**: Visible focus indicators
- [ ] **Alternative Text**: Descriptive alt text for images

#### Testing Accessibility

```bash
# Run accessibility tests
npm run test:accessibility

# Test with screen reader simulation
npm run test:screen-reader

# Manual keyboard testing
npm run test:keyboard-navigation
```

---

## Customization Guide

### Adding New Chart Types

#### 1. Create Chart Component

```typescript
// components/charts/YourNewChart.tsx
'use client';

import React, { useRef, useEffect } from 'react';
import { BaseChart } from './BaseChart';
import { ChartConfig, DataPoint } from '@/types/dashboard';
import { useMemoryManagement } from '@/hooks/useMemoryManagement';

interface YourNewChartProps {
  config: ChartConfig;
  width: number;
  height: number;
  data: DataPoint[];
}

export const YourNewChart: React.FC<YourNewChartProps> = ({
  config,
  width,
  height,
  data
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const memory = useMemoryManagement(`YourNewChart_${config.id}`);

  useEffect(() => {
    if (!canvasRef.current || !data.length) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;

    // Implement your chart rendering logic
    ctx.clearRect(0, 0, width, height);
    
    // Your custom rendering code here
    renderYourChart(ctx, data, config, width, height);
    
    memory.updateMemoryAccess();
  }, [data, config, width, height, memory]);

  return (
    <div className="your-new-chart-container">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="cursor-crosshair"
      />
    </div>
  );
};

// Custom rendering function
function renderYourChart(
  ctx: CanvasRenderingContext2D,
  data: DataPoint[],
  config: ChartConfig,
  width: number,
  height: number
) {
  // Implement your specific chart rendering logic
  const padding = 40;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  // Your chart-specific rendering code
}
```

#### 2. Register Chart Type

```typescript
// types/dashboard.ts
export interface ChartConfig {
  id: string;
  type: 'line' | 'bar' | 'scatter' | 'heatmap' | 'your-new-type';
  dataKey: string;
  color: string;
  visible: boolean;
  aggregation?: '1min' | '5min' | '1hour';
}
```

#### 3. Update Chart Grid

```typescript
// components/charts/ChartGrid.tsx
import { YourNewChart } from './YourNewChart';

const ChartComponent = ({ config, width, height, data }) => {
  const chartProps = { config, width, height, data };

  switch (config.type) {
    case 'line':
      return <LineChart {...chartProps} />;
    case 'bar':
      return <BarChart {...chartProps} />;
    case 'scatter':
      return <ScatterChart {...chartProps} />;
    case 'heatmap':
      return <HeatmapChart {...chartProps} />;
    case 'your-new-type':  // Add your new chart type
      return <YourNewChart {...chartProps} />;
    default:
      console.warn(`Unknown chart type: ${config.type}`);
      return null;
  }
};
```

### Customizing Data Sources

#### 1. Implement Custom Data Provider

```typescript
// components/providers/CustomDataProvider.tsx
'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { DataPoint, DashboardState } from '@/types/dashboard';

interface CustomDataContextType {
  data: DataPoint[];
  isLoading: boolean;
  error?: string;
  filters: FilterConfig;
  updateFilters: (filters: FilterConfig) => void;
  addCustomDataSource: (source: DataSource) => void;
}

const CustomDataContext = createContext<CustomDataContextType | null>(null);

interface DataSource {
  type: 'websocket' | 'api' | 'file' | 'custom';
  config: any;
  transform?: (rawData: any) => DataPoint[];
}

export const CustomDataProvider: React.FC<{
  children: React.ReactNode;
  initialDataSources?: DataSource[];
}> = ({ children, initialDataSources = [] }) => {
  const [data, setData] = useState<DataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [filters, setFilters] = useState<FilterConfig>({});
  const [dataSources, setDataSources] = useState<DataSource[]>(initialDataSources);

  useEffect(() => {
    // Initialize data sources
    dataSources.forEach(source => {
      switch (source.type) {
        case 'websocket':
          setupWebSocketSource(source);
          break;
        case 'api':
          setupApiSource(source);
          break;
        case 'file':
          setupFileSource(source);
          break;
        case 'custom':
          setupCustomSource(source);
          break;
      }
    });
  }, [dataSources]);

  const setupWebSocketSource = (source: DataSource) => {
    const ws = new WebSocket(source.config.url);
    
    ws.onmessage = (event) => {
      const rawData = JSON.parse(event.data);
      const transformedData = source.transform ? source.transform(rawData) : rawData;
      setData(prevData => [...prevData, ...transformedData]);
    };

    ws.onerror = (error) => {
      setError(`WebSocket error: ${error}`);
    };
  };

  const setupApiSource = async (source: DataSource) => {
    try {
      setIsLoading(true);
      const response = await fetch(source.config.url);
      const rawData = await response.json();
      const transformedData = source.transform ? source.transform(rawData) : rawData;
      setData(transformedData);
    } catch (err) {
      setError(`API error: ${err}`);
    } finally {
      setIsLoading(false);
    }
  };

  const addCustomDataSource = (source: DataSource) => {
    setDataSources(prev => [...prev, source]);
  };

  return (
    <CustomDataContext.Provider value={{
      data,
      isLoading,
      error,
      filters,
      updateFilters: setFilters,
      addCustomDataSource
    }}>
      {children}
    </CustomDataContext.Provider>
  );
};

export const useCustomData = () => {
  const context = useContext(CustomDataContext);
  if (!context) {
    throw new Error('useCustomData must be used within CustomDataProvider');
  }
  return context;
};
```

### Theme Customization

#### 1. Create Custom Theme

```typescript
// lib/themes/customTheme.ts
export const customTheme = {
  colors: {
    primary: {
      50: '#f0f9ff',
      500: '#3b82f6',
      900: '#1e3a8a',
    },
    secondary: {
      50: '#fdf4ff',
      500: '#a855f7',
      900: '#581c87',
    },
    background: {
      light: '#ffffff',
      dark: '#0f172a',
    },
    chart: {
      line: '#3b82f6',
      bar: '#10b981',
      scatter: '#f59e0b',
      heatmap: '#ef4444',
    },
  },
  chart: {
    defaultWidth: 800,
    defaultHeight: 400,
    padding: 40,
    animationDuration: 200,
  },
  performance: {
    targetFPS: 60,
    memoryThreshold: 100, // MB
    maxDataPoints: 100000,
  },
};
```

#### 2. Apply Theme

```typescript
// hooks/useTheme.ts
import { useContext, createContext } from 'react';
import { customTheme } from '@/lib/themes/customTheme';

interface ThemeContextType {
  theme: typeof customTheme;
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDark, setIsDark] = useState(false);

  const toggleTheme = () => {
    setIsDark(prev => !prev);
  };

  return (
    <ThemeContext.Provider value={{
      theme: {
        ...customTheme,
        colors: {
          ...customTheme.colors,
          background: {
            light: customTheme.colors.background.light,
            dark: isDark ? '#0f172a' : customTheme.colors.background.light,
          },
        },
      },
      isDark,
      toggleTheme
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};
```

---

## Performance Optimization

### Profiling Tools

#### Chrome DevTools

1. **Performance Tab**: Record and analyze frame rate and rendering performance
2. **Memory Tab**: Identify memory leaks and optimize heap usage
3. **Coverage Tab**: Find unused JavaScript and CSS
4. **Performance Monitor**: Real-time performance metrics

#### React DevTools Profiler

```typescript
// Wrap components for profiling
const ProfiledChart = withProfiler(ChartComponent, {
  id: 'ChartRendering',
  getProps: (props) => ({
    dataPoints: props.data.length,
    chartType: props.config.type,
  }),
});
```

### Memory Optimization

#### Memory Leak Detection

```typescript
// hooks/useMemoryDebugger.ts
export const useMemoryDebugger = () => {
  const [leakReports, setLeakReports] = useState<LeakReport[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      const report = enhancedLeakDetector.checkForLeaks();
      if (report.length > 0) {
        setLeakReports(report);
        console.warn('Memory leaks detected:', report);
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);

  return { leakReports };
};
```

#### Object Pooling

```typescript
// lib/memory/objectPool.ts
class ObjectPool<T extends { id: string }> {
  private pool: Map<string, T[]> = new Map();

  acquire(id: string): T | null {
    const objects = this.pool.get(id);
    if (objects && objects.length > 0) {
      return objects.pop()!;
    }
    return null;
  }

  release(object: T): void {
    const objects = this.pool.get(object.id) || [];
    objects.push(object);
    this.pool.set(object.id, objects);
  }

  clear(id: string): void {
    this.pool.delete(id);
  }
}

// Usage
const pointPool = new ObjectPool<DataPoint>();

// Acquire object
let point = pointPool.acquire('data-point');
if (!point) {
  point = { id: 'data-point', timestamp: 0, value: 0, category: '' };
}

// Use object
point.timestamp = Date.now();
point.value = Math.random() * 100;

// Release back to pool
pointPool.release(point);
```

### Rendering Optimization

#### Canvas Optimization

```typescript
// lib/canvas/optimizedCanvas.ts
class OptimizedCanvas {
  private context: CanvasRenderingContext2D;
  private frameData: ImageData | null = null;
  private dirtyRegions: Rectangle[] = [];

  constructor(canvas: HTMLCanvasElement) {
    this.context = canvas.getContext('2d')!;
  }

  // Batch operations to reduce draw calls
  batchDraw(operations: DrawOperation[]) {
    this.context.save();
    
    // Combine operations
    operations.forEach(op => {
      switch (op.type) {
        case 'line':
          this.drawLine(op);
          break;
        case 'rect':
          this.drawRect(op);
          break;
        case 'circle':
          this.drawCircle(op);
          break;
      }
    });
    
    this.context.restore();
  }

  // Dirty region optimization
  markDirtyRegion(rect: Rectangle) {
    this.dirtyRegions.push(rect);
    
    // Clear only dirty regions
    this.dirtyRegions.forEach(region => {
      this.context.clearRect(region.x, region.y, region.width, region.height);
    });
    
    this.dirtyRegions = [];
  }

  // Use requestAnimationFrame for smooth animations
  scheduleRender(renderFn: () => void) {
    requestAnimationFrame(renderFn);
  }
}
```

#### WebGPU Optimization

```typescript
// lib/webgpu/optimizedWebGPU.ts
class OptimizedWebGPU {
  private device: GPUDevice;
  private pipelineCache: Map<string, GPURenderPipeline> = new Map();
  private bufferPool: GPUBuffer[] = [];

  constructor(device: GPUDevice) {
    this.device = device;
  }

  // Pipeline caching
  getPipeline(key: string, descriptor: GPURenderPipelineDescriptor): GPURenderPipeline {
    if (!this.pipelineCache.has(key)) {
      this.pipelineCache.set(key, this.device.createRenderPipeline(descriptor));
    }
    return this.pipelineCache.get(key)!;
  }

  // Buffer pooling
  acquireBuffer(size: number, usage: GPUBufferUsageFlags): GPUBuffer {
    // Try to reuse existing buffer
    const existingBuffer = this.bufferPool.find(
      buffer => buffer.size === size && (buffer.usage & usage) === usage
    );
    
    if (existingBuffer) {
      this.bufferPool = this.bufferPool.filter(b => b !== existingBuffer);
      return existingBuffer;
    }

    // Create new buffer
    return this.device.createBuffer({
      size,
      usage,
      mappedAtCreation: false,
    });
  }

  releaseBuffer(buffer: GPUBuffer): void {
    this.bufferPool.push(buffer);
    
    // Limit pool size
    if (this.bufferPool.length > 10) {
      const oldBuffer = this.bufferPool.shift();
      oldBuffer?.destroy();
    }
  }

  // Efficient data transfer
  updateBufferData(
    buffer: GPUBuffer,
    data: ArrayBuffer,
    offset: number = 0
  ): void {
    // Use queue.writeBuffer for efficient transfers
    this.device.queue.writeBuffer(buffer, offset, data);
  }
}
```

---

## Debugging & Profiling

### Development Debug Tools

#### Performance Debugger

```typescript
// lib/debug/performanceDebugger.ts
export class PerformanceDebugger {
  private metrics: PerformanceMetric[] = [];
  private frameCount = 0;
  private lastTime = performance.now();

  startFrame(): void {
    this.frameCount++;
    this.lastTime = performance.now();
  }

  endFrame(): void {
    const now = performance.now();
    const frameTime = now - this.lastTime;
    const fps = 1000 / frameTime;

    this.metrics.push({
      timestamp: now,
      frameTime,
      fps,
      frameCount: this.frameCount,
    });

    // Log performance warnings
    if (frameTime > 16.67) { // 60fps threshold
      console.warn(`Slow frame detected: ${frameTime.toFixed(2)}ms (${fps.toFixed(1)} fps)`);
    }

    // Keep only last 1000 metrics
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }
  }

  getAverageFPS(): number {
    const recentMetrics = this.metrics.slice(-60); // Last 60 frames
    const totalFPS = recentMetrics.reduce((sum, m) => sum + m.fps, 0);
    return totalFPS / recentMetrics.length;
  }

  getSlowFrames(): PerformanceMetric[] {
    return this.metrics.filter(m => m.frameTime > 16.67);
  }

  generateReport(): PerformanceReport {
    return {
      averageFPS: this.getAverageFPS(),
      frameCount: this.frameCount,
      slowFrames: this.getSlowFrames().length,
      recommendations: this.generateRecommendations(),
    };
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    const averageFPS = this.getAverageFPS();

    if (averageFPS < 55) {
      recommendations.push('Consider reducing data complexity or implementing LOD system');
    }

    const slowFrames = this.getSlowFrames();
    if (slowFrames.length > this.metrics.length * 0.1) {
      recommendations.push('High number of slow frames detected, check for blocking operations');
    }

    return recommendations;
  }
}
```

#### Memory Debugger

```typescript
// lib/debug/memoryDebugger.ts
export class MemoryDebugger {
  private allocations: Allocation[] = [];
  private leaks: PotentialLeak[] = [];
  private interval: NodeJS.Timeout;

  constructor() {
    this.interval = setInterval(() => {
      this.checkForLeaks();
    }, 30000); // Check every 30 seconds
  }

  trackAllocation(object: object, size: number, source: string): void {
    this.allocations.push({
      object,
      size,
      source,
      timestamp: Date.now(),
    });
  }

  trackDeallocation(object: object): void {
    this.allocations = this.allocations.filter(a => a.object !== object);
  }

  private checkForLeaks(): void {
    const now = Date.now();
    
    // Find objects older than 5 minutes
    const potentialLeaks = this.allocations.filter(
      allocation => now - allocation.timestamp > 300000 // 5 minutes
    );

    if (potentialLeaks.length > 0) {
      this.leaks.push({
        timestamp: now,
        count: potentialLeaks.length,
        totalSize: potentialLeaks.reduce((sum, leak) => sum + leak.size, 0),
        sources: [...new Set(potentialLeaks.map(l => l.source))],
      });

      console.warn('Potential memory leaks detected:', potentialLeaks);
    }
  }

  getMemoryReport(): MemoryReport {
    const now = Date.now();
    const totalSize = this.allocations.reduce((sum, a) => sum + a.size, 0);
    
    return {
      totalAllocations: this.allocations.length,
      totalSize,
      recentLeaks: this.leaks.slice(-5),
      oldestAllocation: Math.min(...this.allocations.map(a => a.timestamp)),
      sources: this.getAllocationBySource(),
    };
  }

  private getAllocationBySource(): Record<string, number> {
    const sources: Record<string, number> = {};
    
    this.allocations.forEach(allocation => {
      sources[allocation.source] = (sources[allocation.source] || 0) + allocation.size;
    });
    
    return sources;
  }

  dispose(): void {
    clearInterval(this.interval);
    this.allocations = [];
    this.leaks = [];
  }
}

// Usage in components
const useMemoryDebugging = (componentName: string) => {
  const memoryDebugger = useRef(new MemoryDebugger());

  useEffect(() => {
    memoryDebugger.current.trackAllocation(component, componentName);
    return () => {
      memoryDebugger.current.trackDeallocation(component);
    };
  }, []);

  return memoryDebugger.current;
};
```

### Browser Debugging

#### Console Debugging

```typescript
// Global debug utilities
window.debugDashboard = {
  // Performance metrics
  getPerformance: () => {
    const metrics = usePerformanceMonitor.getState().metrics;
    console.table(metrics);
    return metrics;
  },

  // Memory information
  getMemory: () => {
    const memory = performance.memory;
    console.log('Memory Usage:', {
      used: `${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
      total: `${(memory.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
      limit: `${(memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)} MB`,
    });
    return memory;
  },

  // WebGPU info
  getWebGPU: () => {
    const isSupported = !!navigator.gpu;
    console.log('WebGPU Support:', isSupported);
    return isSupported;
  },

  // Component tree
  getComponentTree: () => {
    console.log('Component Tree:', React_dev.getOwnerTree());
  },

  // Force garbage collection (Chrome only)
  gc: () => {
    if (window.gc) {
      window.gc();
      console.log('Garbage collection triggered');
    } else {
      console.log('Garbage collection not available');
    }
  }
};

// Usage in console:
// debugDashboard.getPerformance()
// debugDashboard.getMemory()
// debugDashboard.getWebGPU()
// debugDashboard.gc()
```

---

## Advanced Features

### Custom Web Workers

#### Data Processing Worker

```typescript
// workers/dataProcessor.worker.ts
interface WorkerMessage {
  type: 'PROCESS_DATA' | 'AGGREGATE_DATA' | 'FILTER_DATA';
  payload: any;
}

interface WorkerResponse {
  type: 'RESULT' | 'ERROR';
  payload: any;
}

self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const { type, payload } = event.data;

  try {
    switch (type) {
      case 'PROCESS_DATA':
        const processed = processData(payload.data);
        self.postMessage({ type: 'RESULT', payload: processed });
        break;

      case 'AGGREGATE_DATA':
        const aggregated = aggregateData(payload.data, payload.params);
        self.postMessage({ type: 'RESULT', payload: aggregated });
        break;

      case 'FILTER_DATA':
        const filtered = filterData(payload.data, payload.params);
        self.postMessage({ type: 'RESULT', payload: filtered });
        break;

      default:
        throw new Error(`Unknown message type: ${type}`);
    }
  } catch (error) {
    self.postMessage({ type: 'ERROR', payload: error.message });
  }
};

function processData(data: DataPoint[]): DataPoint[] {
  return data.map(point => ({
    ...point,
    processed: true,
    normalized: normalizeValue(point.value),
    timestamp: point.timestamp
  }));
}

function aggregateData(data: DataPoint[], params: { bucketSize: number }) {
  const buckets = new Map<number, DataPoint[]>();
  
  data.forEach(point => {
    const bucketKey = Math.floor(point.timestamp / params.bucketSize);
    const bucket = buckets.get(bucketKey) || [];
    bucket.push(point);
    buckets.set(bucketKey, bucket);
  });

  return Array.from(buckets.entries()).map(([timestamp, points]) => ({
    timestamp,
    avg: points.reduce((sum, p) => sum + p.value, 0) / points.length,
    count: points.length,
    min: Math.min(...points.map(p => p.value)),
    max: Math.max(...points.map(p => p.value)),
  }));
}

function filterData(data: DataPoint[], params: { minValue?: number; maxValue?: number; categories?: string[] }) {
  return data.filter(point => {
    if (params.minValue !== undefined && point.value < params.minValue) return false;
    if (params.maxValue !== undefined && point.value > params.maxValue) return false;
    if (params.categories && !params.categories.includes(point.category)) return false;
    return true;
  });
}
```

#### Using Web Workers

```typescript
// hooks/useWebWorker.ts
export const useWebWorker = () => {
  const workerRef = useRef<Worker | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string>();

  useEffect(() => {
    workerRef.current = new Worker('/workers/dataProcessor.worker.ts', {
      type: 'module'
    });

    workerRef.current.onmessage = (event) => {
      const { type, payload } = event.data;
      
      setIsProcessing(false);
      
      if (type === 'RESULT') {
        setResult(payload);
        setError(undefined);
      } else if (type === 'ERROR') {
        setError(payload);
        setResult(null);
      }
    };

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  const processData = useCallback(async (
    data: DataPoint[],
    operation: 'PROCESS_DATA' | 'AGGREGATE_DATA' | 'FILTER_DATA',
    params?: any
  ) => {
    if (!workerRef.current) return;

    setIsProcessing(true);
    
    workerRef.current.postMessage({
      type: operation,
      payload: { data, params }
    });
  }, []);

  return {
    processData,
    isProcessing,
    result,
    error,
    isSupported: typeof Worker !== 'undefined'
  };
};
```

### WebAssembly Integration

#### WASM Module Example

```wat
;; wasm/dataProcessor.wat
(module
  (func $normalize (export "normalize") (param $value f32) (param $min f32) (param $max f32) (result f32)
    (f32.sub
      (f32.div
        (f32.sub (local.get $value) (local.get $min))
        (f32.sub (local.get $max) (local.get $min))
      )
      (f32.const 0.5)
    )
  )

  (func $aggregate (export "aggregate") (param $ptr i32) (param $length i32) (param $bucketSize f32) (result i32)
    (local $i i32)
    (local $sum f32)
    (local $count i32)
    
    (loop $aggregate_loop
      (br_if $aggregate_loop (i32.lt_u (local.get $i) (local.get $length)))
      
      (local.set $sum 
        (f32.add 
          (local.get $sum) 
          (f32.load (local.get $ptr))
        )
      )
      (local.set $count (i32.add (local.get $count) (i32.const 1)))
      (local.set $i (i32.add (local.get $i) (i32.const 4)))
      (br $aggregate_loop)
    )
    
    (i32.store (local.get $ptr) (f32.div (local.get $sum) (f32.convert_i32_u (local.get $count))))
    (i32.const 1)
  )
)
```

#### Loading and Using WASM

```typescript
// lib/wasm/wasmLoader.ts
export class WASMLoader {
  private module: WebAssembly.Instance | null = null;
  private memory: WebAssembly.Memory | null = null;

  async initialize(wasmPath: string): Promise<void> {
    try {
      const response = await fetch(wasmPath);
      const wasmBytes = await response.arrayBuffer();
      
      const memory = new WebAssembly.Memory({ 
        initial: 256, // 256 pages (16MB)
        maximum: 1024, // 1024 pages (64MB)
        shared: false 
      });

      const imports = {
        env: {
          memory,
          abort: () => console.error('WASM abort called')
        }
      };

      const { instance } = await WebAssembly.instantiate(wasmBytes, imports);
      this.module = instance;
      this.memory = memory;
      
      console.log('WASM module loaded successfully');
    } catch (error) {
      console.error('Failed to load WASM module:', error);
      throw error;
    }
  }

  normalizeValues(values: number[], min: number, max: number): number[] {
    if (!this.module || !this.memory) {
      throw new Error('WASM module not initialized');
    }

    const wasm = this.module.exports as any;
    const memory = this.memory;
    
    // Allocate memory in WASM
    const ptr = (wasm.memory || memory).buffer.byteLength;
    const valuesBytes = new Float32Array(memory.buffer, ptr, values.length);
    valuesBytes.set(values);

    // Call WASM function
    const normalizedPtr = wasm.normalize(
      ptr, 
      min, 
      max
    );

    // Read results
    const normalizedValues = new Float32Array(
      memory.buffer, 
      normalizedPtr, 
      values.length
    );

    return Array.from(normalizedValues);
  }

  aggregateValues(values: number[]): number {
    if (!this.module || !this.memory) {
      throw new Error('WASM module not initialized');
    }

    const wasm = this.module.exports as any;
    
    // Allocate memory
    const ptr = (wasm.memory || this.memory).buffer.byteLength;
    const valuesBytes = new Float32Array(this.memory.buffer, ptr, values.length);
    valuesBytes.set(values);

    // Call WASM aggregate function
    return wasm.aggregate(ptr, values.length, 1000);
  }
}

// Usage
const wasmLoader = new WASMLoader();

await wasmLoader.initialize('/wasm/dataProcessor.wasm');

// Use WASM for performance-critical operations
const normalizedData = wasmLoader.normalizeValues(data.map(d => d.value), 0, 100);
const avgValue = wasmLoader.aggregateValues(data.map(d => d.value));
```

### Custom Hooks

#### Performance Monitoring Hook

```typescript
// hooks/usePerformanceMonitor.ts
export const usePerformanceMonitor = create<PerformanceState>((set, get) => ({
  metrics: {
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
  },
  
  updateMetrics: (newMetrics: Partial<PerformanceMetrics>) => {
    set(state => ({
      metrics: { ...state.metrics, ...newMetrics }
    }));
  },

  startMeasure: (name: string) => {
    performance.mark(`${name}-start`);
  },

  endMeasure: (name: string) => {
    performance.mark(`${name}-end`);
    performance.measure(name, `${name}-start`, `${name}-end`);
    
    const measure = performance.getEntriesByName(name, 'measure')[0];
    if (measure) {
      get().updateMetrics({ renderTime: measure.duration });
    }
  }
}));

// Usage in components
const ComponentWithMonitoring = () => {
  const { startMeasure, endMeasure } = usePerformanceMonitor();
  
  const renderExpensiveChart = () => {
    startMeasure('chart-render');
    
    // Expensive rendering operation
    setTimeout(() => {
      endMeasure('chart-render');
    }, 16);
  };

  return (
    <button onClick={renderExpensiveChart}>
      Render Chart
    </button>
  );
};
```

This development guide provides comprehensive coverage of all aspects of developing with the dashboard, from basic setup to advanced optimization techniques. It serves as the definitive resource for any developer working on or extending the project.