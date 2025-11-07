

# Kilocode IDE Agent Rules for Next.js Performance Dashboard Implementation

## Core Architecture Rules

### Next.js App Router Implementation
- **Server Components**: Use exclusively for static content, initial data fetching, and non-interactive elements
- **Client Components**: Mark with `'use client'` directive for any interactive elements, charts, or stateful components
- **Component Boundaries**: Clearly separate server and client components to minimize client-side JavaScript
- **Streaming Implementation**: Implement loading.tsx and error.tsx boundaries for progressive loading
- **Route Handlers**: Use app/api/ directory for data endpoints with proper caching headers

### Performance-First Development Rules
- **Performance Budget**: Set strict limits: <500KB gzipped bundle, <100ms interaction response, 60fps target
- **Performance Monitoring**: Implement FPS counter and memory usage display from day one
- **Progressive Enhancement**: Start with basic functionality, then enhance with features while monitoring performance
- **Performance Regression Testing**: Any new feature must not impact established performance benchmarks

## React Performance Optimization Rules

### Component Architecture
- **Memoization Strategy**: Apply React.memo to all chart components and expensive UI components
- **useMemo/useCallback**: Memoize all expensive calculations, event handlers, and derived data
- **State Colocation**: Keep state as close to where it's used as possible to minimize re-renders
- **Component Composition**: Break down complex components into smaller, specialized components
- **Render Props Pattern**: Use for flexible component composition while maintaining performance

### State Management Rules
- **Context Optimization**: Split contexts by domain to prevent unnecessary re-renders
- **State Structure**: Design state to minimize updates and avoid deep object mutations
- **Derived Data**: Use selectors or useMemo for derived data instead of storing in state
- **State Updates**: Batch state updates and use functional updates when depending on previous state

## Canvas + React Integration Rules

### Canvas Implementation
- **useRef Pattern**: Always use useRef for canvas elements to prevent unnecessary re-renders
- **RequestAnimationFrame**: Use exclusively for all canvas animations, never setInterval
- **Dirty Region Updates**: Only redraw changed portions of the canvas, not the entire canvas
- **Canvas Context Optimization**: Reuse canvas context and avoid recreating on every render
- **OffscreenCanvas**: Implement for background rendering when possible

### Hybrid Rendering Strategy
- **Canvas for Data Points**: Use canvas for high-density data visualization (10,000+ points)
- **SVG for UI Elements**: Use SVG for axes, labels, and interactive elements
- **Layer Separation**: Implement separate layers for data and UI to optimize redraws
- **Hit Detection**: Implement efficient hit detection for interactive elements

## Data Management Rules

### Data Generation & Streaming
- **Realistic Data**: Generate time-series data with proper patterns and variations
- **Data Windowing**: Implement sliding window approach to limit memory usage
- **Data Aggregation**: Implement efficient aggregation algorithms for different time periods
- **Data Streaming**: Use efficient data structures for real-time updates every 100ms

### Data Processing
- **Web Workers**: Implement for all heavy data processing to prevent UI blocking
- **Data Transformation**: Transform data close to the source to minimize client-side processing
- **Lazy Loading**: Implement lazy loading for historical data
- **Data Compression**: Use efficient data structures to minimize memory footprint

## Performance Optimization Rules

### Rendering Optimization
- **Virtual Scrolling**: Implement for all data tables and lists
- **Level of Detail (LOD)**: Implement different rendering strategies based on zoom level
- **Incremental Rendering**: Render data in chunks to maintain 60fps
- **Priority-based Rendering**: Prioritize visible elements over off-screen elements

### Memory Management
- **Cleanup Patterns**: Implement proper cleanup in useEffect for all subscriptions and timers
- **Object Pooling**: Reuse objects to minimize garbage collection
- **Memory Monitoring**: Implement memory usage tracking to identify leaks
- **Data Lifecycle**: Implement proper data lifecycle management to prevent memory accumulation

## TypeScript Implementation Rules

### Type Safety
- **Strict Mode**: Use strict TypeScript configuration
- **Type Definitions**: Create comprehensive type definitions for all data structures
- **Generic Types**: Use generics for reusable components and utilities
- **Type Guards**: Implement proper type guards for runtime type checking

### Code Organization
- **Barrel Exports**: Use barrel exports for clean imports
- **Path Mapping**: Configure path mapping for clean import paths
- **Utility Types**: Leverage TypeScript utility types for type transformations
- **Discriminated Unions**: Use for type-safe state management

## Performance Monitoring Rules

### Metrics Collection
- **FPS Monitoring**: Implement continuous FPS monitoring during real-time updates
- **Memory Tracking**: Track memory usage over time to identify leaks
- **Interaction Latency**: Measure response time for all user interactions
- **Rendering Performance**: Track rendering time for different components

### Performance Optimization Workflow
- **Profile First**: Always profile before optimizing
- **Benchmark Establish**: Establish benchmarks before implementing optimizations
- **Incremental Optimization**: Optimize one component at a time
- **Regression Testing**: Test for performance regressions after each change

## Code Quality Rules

### Development Practices
- **Small PRs**: Keep pull requests small and focused
- **Performance Reviews**: Include performance impact in code reviews
- **Documentation**: Document performance decisions and trade-offs
- **Testing**: Implement performance tests alongside functional tests

### Error Handling
- **Error Boundaries**: Implement error boundaries to prevent crashes
- **Graceful Degradation**: Implement fallbacks for performance-critical features
- **Error Monitoring**: Implement error tracking to identify issues
- **Recovery Strategies**: Implement recovery strategies for performance issues

## Deployment Rules

### Build Optimization
- **Code Splitting**: Implement code splitting for optimal loading
- **Tree Shaking**: Ensure unused code is eliminated
- **Bundle Analysis**: Regularly analyze bundle size and composition
- **Production Testing**: Always test performance in production build

### Performance Testing
- **Load Testing**: Implement load testing for different data volumes
- **Device Testing**: Test on various devices and network conditions
- **Continuous Monitoring**: Implement continuous performance monitoring
- **Performance Budgets**: Set and enforce performance budgets

## Documentation Rules

### Performance Documentation
- **PERFORMANCE.md**: Document all performance optimizations and benchmarks
- **Decision Records**: Document architectural decisions and trade-offs
- **Performance Guides**: Create guides for maintaining performance
- **Benchmark Results**: Include benchmark results in documentation

### Code Documentation
- **Performance Comments**: Document performance-critical code sections
- **Optimization Explanations**: Explain why specific optimizations were implemented
- **Usage Guidelines**: Document performance considerations for usage
- **Troubleshooting**: Document common performance issues and solutions

These rules ensure that Kilocode IDE agents implement a truly performant dashboard that meets all PRD requirements while maintaining code quality and performance standards.