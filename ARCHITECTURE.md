# Performance Dashboard - Production Architecture

## System Architecture Overview

```mermaid
graph TB
    subgraph "Client Browser"
        A[User Interface] --> B[Service Worker]
        B --> C[Cache Storage]
        A --> D[Main Thread]
        D --> E[React Components]
        E --> F[Web Worker Pool]
        F --> G[Data Processor Worker]
        F --> H[Canvas Renderer Worker]
        H --> I[OffscreenCanvas]
    end
    
    subgraph "Next.js Server"
        J[Server Components] --> K[Static Chart Configs]
        J --> L[Server Actions]
        M[API Routes] --> N[SSE Stream Handler]
        M --> O[Config API]
        P[Middleware] --> M
    end
    
    D --> N
    N --> D
    L --> J
    K --> E
    
    style A fill:#e1f5ff
    style D fill:#fff4e1
    style J fill:#e8f5e9
    style N fill:#fce4ec
```

## Component Hierarchy

```mermaid
graph TD
    A[page.tsx - Server Component] --> B[DashboardShell - Client]
    B --> C[Suspense: Performance Monitor]
    B --> D[Suspense: Chart Area]
    B --> E[Suspense: Data Table]
    B --> F[Suspense: Controls]
    
    D --> G[ChartRenderer]
    G --> H[LineChart - Optimized]
    G --> I[BarChart - Optimized]
    G --> J[ScatterPlot - Optimized]
    G --> K[Heatmap - Optimized]
    
    H --> L[Canvas Manager]
    L --> M[RAF Scheduler]
    L --> N[Dirty Region Tracker]
    L --> O[Context Pool]
    
    style A fill:#4caf50
    style B fill:#2196f3
    style G fill:#ff9800
    style L fill:#f44336
```

## Data Flow Architecture

```mermaid
sequenceDiagram
    participant Browser
    participant MainThread
    participant DataWorker
    participant CanvasWorker
    participant Server
    
    Browser->>Server: Connect SSE Stream
    Server-->>Browser: Initial Data (5000 points)
    
    loop Every 100ms
        Server-->>MainThread: New Data Point
        MainThread->>DataWorker: Filter & Aggregate
        DataWorker-->>MainThread: Processed Data
        
        alt Canvas Dirty
            MainThread->>CanvasWorker: Render Request
            CanvasWorker->>CanvasWorker: Render on OffscreenCanvas
            CanvasWorker-->>MainThread: ImageBitmap
            MainThread->>MainThread: Draw ImageBitmap
        else Canvas Clean
            MainThread->>MainThread: Skip Render
        end
    end
```

## Performance Optimization Strategy

```mermaid
graph LR
    A[Data Update] --> B{Batch Updates?}
    B -->|Yes| C[Buffer 16ms]
    B -->|No| D[Immediate]
    C --> E[Process in Worker]
    D --> E
    E --> F{Canvas Dirty?}
    F -->|Yes| G[Schedule RAF]
    F -->|No| H[Skip Render]
    G --> I[Render Dirty Regions Only]
    I --> J[Transfer to Main Canvas]
    
    style A fill:#e3f2fd
    style E fill:#fff3e0
    style I fill:#f3e5f5
```

## Memory Management Strategy

```mermaid
graph TD
    A[Data Update] --> B[Check Data Size]
    B --> C{> Max Points?}
    C -->|Yes| D[Slice to Max]
    C -->|No| E[Keep All]
    D --> F[Update WeakMap]
    E --> F
    F --> G{Timer: 5min}
    G --> H[Cleanup Old Contexts]
    H --> I[Clear Unused Caches]
    I --> J[Force GC Hint]
    
    style C fill:#ffebee
    style H fill:#e8f5e9
```

## Canvas Rendering Pipeline

```mermaid
flowchart TD
    A[Data Change Detected] --> B{Animation Enabled?}
    B -->|Yes| C[Mark Canvas Dirty]
    B -->|No| D[Direct Render]
    
    C --> E{RAF Scheduled?}
    E -->|No| F[Schedule RAF]
    E -->|Yes| G[Wait for Frame]
    
    F --> H[Next Frame]
    H --> I{Dirty Regions?}
    I -->|Yes| J[Render Regions Only]
    I -->|No| K[Full Canvas Render]
    
    J --> L[Update Last Render Time]
    K --> L
    D --> L
    L --> M[Clear Dirty Flag]
    
    style C fill:#fff9c4
    style J fill:#c8e6c9
    style K fill:#ffccbc
```

## Server/Client Boundary

```mermaid
graph TB
    subgraph "Server Side"
        A[Static Generation] --> B[Chart Configs]
        A --> C[Initial Metadata]
        D[Server Actions] --> E[Save Config]
        D --> F[Load Config]
        G[API Routes] --> H[SSE Stream]
        G --> I[Config CRUD]
    end
    
    subgraph "Client Side"
        J[Interactive Dashboard] --> K[Real-time Updates]
        J --> L[User Interactions]
        K --> M[Canvas Rendering]
        L --> N[Filter Changes]
        N --> O[Worker Processing]
    end
    
    B -.->|Initial Load| J
    C -.->|Hydration| J
    H -.->|Stream| K
    E -.->|Revalidate| A
    
    style A fill:#4caf50
    style J fill:#2196f3
    style H fill:#ff5722
```

## Bundle Structure

```
dist/
├── app/
│   ├── page.js                    # Server Component (2KB)
│   └── dashboard/
│       ├── page.js                # Server Component (3KB)
│       └── layout.js              # Server Layout (1KB)
├── chunks/
│   ├── vendors.js                 # React, Next.js (150KB)
│   ├── charts.js                  # Chart components (45KB)
│   ├── ui-components.js           # UI lib (35KB)
│   └── dashboard-client.js        # Dashboard logic (50KB)
├── workers/
│   ├── data-processor.js          # Data worker (15KB)
│   └── canvas-renderer.js         # Canvas worker (12KB)
└── static/
    └── config/
        └── charts/
            └── *.json             # Static configs (5KB)
```

## Production Deployment Flow

```mermaid
graph LR
    A[Build] --> B[Bundle Analysis]
    B --> C{Size OK?}
    C -->|No| D[Optimize]
    D --> B
    C -->|Yes| E[Docker Build]
    E --> F[Self-Hosted Server]
    F --> G[Nginx Reverse Proxy]
    G --> H[SSL Termination]
    H --> I[Compression]
    I --> J[CDN Static Assets]
    
    style C fill:#fff9c4
    style E fill:#e1f5fe
    style G fill:#f3e5f5
```

## Error Handling & Fallbacks

```mermaid
graph TD
    A[Component Render] --> B{Error?}
    B -->|Yes| C[Error Boundary]
    B -->|No| D[Normal Render]
    
    C --> E{Critical?}
    E -->|Yes| F[Full Page Fallback]
    E -->|No| G[Component Fallback]
    
    D --> H{Data Available?}
    H -->|No| I[Skeleton Loader]
    H -->|Yes| J[Render Content]
    
    G --> K[Retry Button]
    K --> A
    
    style B fill:#ffebee
    style E fill:#fce4ec
    style I fill:#e8f5e9
```

## Performance Monitoring Points

```mermaid
mindmap
  root((Performance))
    Rendering
      FPS Counter
      Frame Time
      Paint Events
      Dirty Regions Count
    Memory
      Heap Size
      Data Array Size
      Context Pool Size
      Leak Detection
    Network
      SSE Connection
      Data Transfer Rate
      Latency
      Reconnect Count
    User Experience
      LCP
      FID/INP
      CLS
      TTFB
```

## Core Web Vitals Optimization

| Metric | Strategy | Implementation |
|--------|----------|----------------|
| **LCP** | Server Components, Suspense, Font optimization | Server-side chart config loading, Critical CSS inlining |
| **FID/INP** | Web Workers, useTransition, Event throttling | All data processing off main thread, Non-blocking UI updates |
| **CLS** | Fixed dimensions, Skeleton loaders | Canvas with fixed size, No dynamic layout shifts |
| **TTFB** | Edge runtime, Middleware, Caching | Edge API routes, Response compression |

## Technology Stack

```
┌─────────────────────────────────────────────────┐
│                   Browser                       │
├─────────────────────────────────────────────────┤
│ React 19 + Next.js 15 App Router               │
│ • Server Components                             │
│ • Client Components (selective)                 │
│ • useTransition / useDeferredValue              │
├─────────────────────────────────────────────────┤
│ Canvas API + OffscreenCanvas                    │
│ • 2D Context with optimization flags            │
│ • ImageBitmap transfer                          │
│ • Dirty region tracking                         │
├─────────────────────────────────────────────────┤
│ Web Workers                                     │
│ • Data processing worker                        │
│ • Canvas rendering worker                       │
│ • Shared Array Buffer (optional)                │
├─────────────────────────────────────────────────┤
│ Performance APIs                                │
│ • requestAnimationFrame                         │
│ • requestIdleCallback                           │
│ • PerformanceObserver                           │
│ • Memory API                                    │
└─────────────────────────────────────────────────┘
```

## Key Performance Patterns

### 1. Render Batching
```typescript
// Batch multiple data updates into single render
const batchUpdates = (updates: DataPoint[]) => {
  requestIdleCallback(() => {
    startTransition(() => {
      setData(prevData => [...prevData, ...updates]);
    });
  }, { timeout: 50 });
};
```

### 2. RAF Throttling
```typescript
// Limit renders to 60fps max
let rafId: number | null = null;
const scheduleRender = () => {
  if (rafId !== null) return;
  rafId = requestAnimationFrame(() => {
    render();
    rafId = null;
  });
};
```

### 3. Dirty Region Optimization
```typescript
// Only re-render changed regions
const updateRegion = (region: DOMRect) => {
  ctx.clearRect(region.x, region.y, region.width, region.height);
  renderRegion(region);
};
```

### 4. Context Pooling
```typescript
// Reuse canvas contexts
const getContext = (canvas: HTMLCanvasElement) => {
  return contextPool.get(canvas) || createOptimizedContext(canvas);
};
```

### 5. Memory Limits
```typescript
// Enforce data size limits
const addData = (newData: DataPoint[]) => {
  const combined = [...existingData, ...newData];
  return combined.slice(-MAX_DATA_POINTS);
};
```

---

## Production Checklist

### Pre-Deployment
- [ ] All Suspense boundaries tested
- [ ] Error boundaries handle all cases
- [ ] Memory profiling complete (no leaks)
- [ ] Bundle size analyzed and optimized
- [ ] Core Web Vitals all green
- [ ] Cross-browser testing complete

### Self-Hosted Setup
- [ ] Node.js server configured
- [ ] Nginx reverse proxy set up
- [ ] SSL certificates installed
- [ ] Compression enabled (gzip/brotli)
- [ ] Health check endpoint active
- [ ] Monitoring tools configured
- [ ] Log rotation set up
- [ ] Backup strategy defined

### Performance Verification
- [ ] 60 FPS @ 10k points sustained
- [ ] < 100ms interaction latency
- [ ] < 1MB/hour memory growth
- [ ] No memory leaks over 8 hours
- [ ] Lighthouse score > 90

---

This architecture ensures maximum performance, proper separation of concerns, and production-ready reliability.