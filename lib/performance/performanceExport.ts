import { ExtendedPerformanceMetrics } from '@/hooks/usePerformanceMonitor';
import { PerformanceAlert } from './performanceAlerts';
import { MemoryLeakReport } from './memoryLeakDetector';
import { GPUPerformanceReport } from './gpuMonitor';
import { PerformanceAnalysis } from './performanceHistory';
import { BenchmarkResult } from './performanceBenchmarking';

export interface PerformanceReport {
  metadata: {
    generatedAt: string;
    period: {
      start: number;
      end: number;
      duration: number;
    };
    systemInfo: {
      userAgent: string;
      platform: string;
      webgpuSupported: boolean;
      hardwareConcurrency: number;
      deviceMemory?: number;
    };
  };
  summary: {
    overall: {
      averageFPS: number;
      stability: number;
      memoryEfficiency: number;
      alertCount: number;
    };
    renderer: {
      recommended: 'canvas' | 'webgpu' | 'hybrid';
      performance: Record<string, number>;
      memoryUsage: Record<string, number>;
    };
  };
  analysis: PerformanceAnalysis;
  alerts: PerformanceAlert[];
  benchmarks?: BenchmarkResult[];
  recommendations: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  };
  rawData: {
    metrics: ExtendedPerformanceMetrics[];
    memoryLeaks: MemoryLeakReport[];
    gpuReports: GPUPerformanceReport[];
  };
}

export class PerformanceReportGenerator {
  private metrics: ExtendedPerformanceMetrics[] = [];
  private alerts: PerformanceAlert[] = [];
  private memoryLeaks: MemoryLeakReport[] = [];
  private gpuReports: GPUPerformanceReport[] = [];
  private benchmarks: BenchmarkResult[] = [];

  addMetrics(metrics: ExtendedPerformanceMetrics): void {
    this.metrics.push(metrics);
  }

  addAlert(alert: PerformanceAlert): void {
    this.alerts.push(alert);
  }

  addMemoryLeak(report: MemoryLeakReport): void {
    this.memoryLeaks.push(report);
  }

  addGPUReport(report: GPUPerformanceReport): void {
    this.gpuReports.push(report);
  }

  addBenchmark(result: BenchmarkResult): void {
    this.benchmarks.push(result);
  }

  generateReport(analysis: PerformanceAnalysis): PerformanceReport {
    const startTime = Math.min(...this.metrics.map(m => Date.now() - 1000)); // Estimate
    const endTime = Math.max(...this.metrics.map(m => Date.now()));

    const summary = this.generateSummary(analysis);
    const recommendations = this.generateRecommendations(analysis, summary);

    return {
      metadata: {
        generatedAt: new Date().toISOString(),
        period: {
          start: startTime,
          end: endTime,
          duration: endTime - startTime
        },
        systemInfo: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          webgpuSupported: 'gpu' in navigator,
          hardwareConcurrency: navigator.hardwareConcurrency || 1,
          deviceMemory: (navigator as any).deviceMemory
        }
      },
      summary,
      analysis,
      alerts: this.alerts,
      benchmarks: this.benchmarks.length > 0 ? this.benchmarks : undefined,
      recommendations,
      rawData: {
        metrics: this.metrics,
        memoryLeaks: this.memoryLeaks,
        gpuReports: this.gpuReports
      }
    };
  }

  private generateSummary(analysis: PerformanceAnalysis): PerformanceReport['summary'] {
    const fpsValues = this.metrics.map(m => m.fps).filter(fps => fps > 0);
    const averageFPS = fpsValues.length > 0 ? fpsValues.reduce((a, b) => a + b, 0) / fpsValues.length : 0;

    const stability = analysis.summary.fpsStability;
    const memoryEfficiency = this.calculateMemoryEfficiency();
    const alertCount = this.alerts.length;

    // Determine recommended renderer
    const recommendedRenderer = this.determineRecommendedRenderer();

    // Calculate renderer performance
    const rendererPerformance: Record<string, number> = {};
    const rendererMemory: Record<string, number> = {};

    if (this.benchmarks.length > 0) {
      for (const benchmark of this.benchmarks) {
        if (benchmark.results.canvas) {
          rendererPerformance.canvas = benchmark.results.canvas.averageFPS;
          rendererMemory.canvas = benchmark.results.canvas.averageMemoryUsage;
        }
        if (benchmark.results.webgpu) {
          rendererPerformance.webgpu = benchmark.results.webgpu.averageFPS;
          rendererMemory.webgpu = benchmark.results.webgpu.averageMemoryUsage;
        }
      }
    }

    return {
      overall: {
        averageFPS,
        stability,
        memoryEfficiency,
        alertCount
      },
      renderer: {
        recommended: recommendedRenderer,
        performance: rendererPerformance,
        memoryUsage: rendererMemory
      }
    };
  }

  private calculateMemoryEfficiency(): number {
    if (this.metrics.length === 0) return 0;

    const memoryValues = this.metrics.map(m => m.memoryUsage);
    const averageMemory = memoryValues.reduce((a, b) => a + b, 0) / memoryValues.length;
    const peakMemory = Math.max(...memoryValues);

    // Efficiency is inverse of memory pressure (lower is better)
    return Math.max(0, 100 - (averageMemory / peakMemory) * 100);
  }

  private determineRecommendedRenderer(): 'canvas' | 'webgpu' | 'hybrid' {
    if (this.benchmarks.length === 0) {
      return 'canvas'; // Default fallback
    }

    const latestBenchmark = this.benchmarks[this.benchmarks.length - 1];
    const canvasResult = latestBenchmark.results.canvas;
    const webgpuResult = latestBenchmark.results.webgpu;

    if (!webgpuResult) return 'canvas';
    if (!canvasResult) return 'webgpu';

    const speedup = webgpuResult.averageFPS / canvasResult.averageFPS;
    const memoryOverhead = webgpuResult.averageMemoryUsage - canvasResult.averageMemoryUsage;

    if (speedup > 1.5 && memoryOverhead < 20) {
      return 'webgpu';
    } else if (speedup > 1.2) {
      return 'hybrid';
    } else {
      return 'canvas';
    }
  }

  private generateRecommendations(
    analysis: PerformanceAnalysis,
    summary: PerformanceReport['summary']
  ): PerformanceReport['recommendations'] {
    const immediate: string[] = [];
    const shortTerm: string[] = [];
    const longTerm: string[] = [];

    // Immediate actions based on critical issues
    if (analysis.summary.averageFPS < 20) {
      immediate.push('Enable emergency performance mode - reduce data density and disable advanced features');
    }

    if (analysis.summary.memoryLeaks > 0) {
      immediate.push('Address detected memory leaks immediately');
    }

    if (analysis.summary.criticalAlerts > 0) {
      immediate.push('Review and resolve critical performance alerts');
    }

    // Short-term optimizations
    if (analysis.summary.averageFPS < 45) {
      shortTerm.push('Implement level-of-detail (LOD) rendering system');
      shortTerm.push('Enable adaptive quality based on performance');
    }

    if (analysis.summary.fpsStability > 0.2) {
      shortTerm.push('Stabilize frame rate with consistent timing');
    }

    if (summary.renderer.recommended !== 'canvas') {
      shortTerm.push(`Switch to ${summary.renderer.recommended} renderer for better performance`);
    }

    // Long-term improvements
    if (analysis.trends.fps === 'degrading') {
      longTerm.push('Implement comprehensive performance monitoring and alerting');
    }

    if (analysis.summary.peakMemoryUsage > 200) {
      longTerm.push('Optimize memory management and implement virtual data loading');
    }

    longTerm.push('Implement automated performance regression testing');
    longTerm.push('Set up performance budgets and continuous monitoring');

    return { immediate, shortTerm, longTerm };
  }

  exportAsJSON(report: PerformanceReport): string {
    return JSON.stringify(report, null, 2);
  }

  exportAsCSV(report: PerformanceReport): string {
    const headers = [
      'Timestamp',
      'FPS',
      'Memory Usage (MB)',
      'Render Time (ms)',
      'Data Processing Time (ms)',
      'GPU Memory (MB)',
      'WebGPU Enabled'
    ];

    const rows = report.rawData.metrics.map(metric => [
      new Date(Date.now() - 1000).toISOString(), // Estimate timestamp
      metric.fps.toString(),
      metric.memoryUsage.toFixed(2),
      metric.renderTime.toFixed(2),
      metric.dataProcessingTime.toFixed(2),
      (metric.gpuMemoryUsage / 1024 / 1024).toFixed(2),
      metric.webgpuEnabled.toString()
    ]);

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }

  exportAsMarkdown(report: PerformanceReport): string {
    const md = [
      '# Performance Report',
      '',
      `Generated: ${report.metadata.generatedAt}`,
      `Period: ${new Date(report.metadata.period.start).toLocaleString()} - ${new Date(report.metadata.period.end).toLocaleString()}`,
      '',
      '## System Information',
      `- Platform: ${report.metadata.systemInfo.platform}`,
      `- Hardware Concurrency: ${report.metadata.systemInfo.hardwareConcurrency}`,
      `- WebGPU Supported: ${report.metadata.systemInfo.webgpuSupported}`,
      `- Device Memory: ${report.metadata.systemInfo.deviceMemory || 'Unknown'}GB`,
      '',
      '## Performance Summary',
      `### Overall Metrics`,
      `- Average FPS: ${report.summary.overall.averageFPS.toFixed(1)}`,
      `- Stability: ${(1 - report.summary.overall.stability).toFixed(2)}`,
      `- Memory Efficiency: ${report.summary.overall.memoryEfficiency.toFixed(1)}%`,
      `- Total Alerts: ${report.summary.overall.alertCount}`,
      '',
      `### Renderer Recommendation: ${report.summary.renderer.recommended.toUpperCase()}`,
    ];

    if (Object.keys(report.summary.renderer.performance).length > 0) {
      md.push('', '### Renderer Performance Comparison');
      for (const [renderer, fps] of Object.entries(report.summary.renderer.performance)) {
        const memory = report.summary.renderer.memoryUsage[renderer];
        md.push(`- ${renderer}: ${fps.toFixed(1)} FPS, ${memory?.toFixed(1) || 'N/A'} MB`);
      }
    }

    md.push('', '## Analysis Results', JSON.stringify(report.analysis, null, 2));

    if (report.alerts.length > 0) {
      md.push('', '## Performance Alerts');
      for (const alert of report.alerts.slice(0, 10)) { // Show first 10
        md.push(`- **${alert.type.toUpperCase()}** ${alert.title}: ${alert.message}`);
      }
      if (report.alerts.length > 10) {
        md.push(`- ... and ${report.alerts.length - 10} more alerts`);
      }
    }

    md.push('', '## Recommendations');

    if (report.recommendations.immediate.length > 0) {
      md.push('', '### Immediate Actions');
      report.recommendations.immediate.forEach(rec => md.push(`- ${rec}`));
    }

    if (report.recommendations.shortTerm.length > 0) {
      md.push('', '### Short-term Improvements');
      report.recommendations.shortTerm.forEach(rec => md.push(`- ${rec}`));
    }

    if (report.recommendations.longTerm.length > 0) {
      md.push('', '### Long-term Optimizations');
      report.recommendations.longTerm.forEach(rec => md.push(`- ${rec}`));
    }

    return md.join('\n');
  }

  exportAsHTML(report: PerformanceReport): string {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Performance Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .metric { background: #f5f5f5; padding: 10px; margin: 10px 0; border-radius: 5px; }
        .alert-critical { color: #d32f2f; }
        .alert-warning { color: #f57c00; }
        .alert-info { color: #1976d2; }
        .chart { margin: 20px 0; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <h1>Performance Report</h1>
    <p><strong>Generated:</strong> ${report.metadata.generatedAt}</p>
    <p><strong>Period:</strong> ${new Date(report.metadata.period.start).toLocaleString()} - ${new Date(report.metadata.period.end).toLocaleString()}</p>

    <h2>System Information</h2>
    <div class="metric">
        <p><strong>Platform:</strong> ${report.metadata.systemInfo.platform}</p>
        <p><strong>Hardware Concurrency:</strong> ${report.metadata.systemInfo.hardwareConcurrency}</p>
        <p><strong>WebGPU Supported:</strong> ${report.metadata.systemInfo.webgpuSupported ? 'Yes' : 'No'}</p>
        <p><strong>Device Memory:</strong> ${report.metadata.systemInfo.deviceMemory || 'Unknown'}GB</p>
    </div>

    <h2>Performance Summary</h2>
    <div class="metric">
        <h3>Overall Metrics</h3>
        <p><strong>Average FPS:</strong> ${report.summary.overall.averageFPS.toFixed(1)}</p>
        <p><strong>Stability:</strong> ${(1 - report.summary.overall.stability).toFixed(2)}</p>
        <p><strong>Memory Efficiency:</strong> ${report.summary.overall.memoryEfficiency.toFixed(1)}%</p>
        <p><strong>Total Alerts:</strong> ${report.summary.overall.alertCount}</p>
    </div>

    <div class="metric">
        <h3>Renderer Recommendation</h3>
        <p><strong>Recommended:</strong> ${report.summary.renderer.recommended.toUpperCase()}</p>
        ${Object.keys(report.summary.renderer.performance).length > 0 ? `
        <table>
            <tr><th>Renderer</th><th>FPS</th><th>Memory (MB)</th></tr>
            ${Object.entries(report.summary.renderer.performance).map(([renderer, fps]) => `
                <tr>
                    <td>${renderer}</td>
                    <td>${fps.toFixed(1)}</td>
                    <td>${report.summary.renderer.memoryUsage[renderer]?.toFixed(1) || 'N/A'}</td>
                </tr>
            `).join('')}
        </table>
        ` : ''}
    </div>

    ${report.alerts.length > 0 ? `
    <h2>Performance Alerts</h2>
    <div class="alerts">
        ${report.alerts.slice(0, 20).map(alert => `
            <div class="alert alert-${alert.type}">
                <strong>${alert.type.toUpperCase()}:</strong> ${alert.title} - ${alert.message}
            </div>
        `).join('')}
        ${report.alerts.length > 20 ? `<p>... and ${report.alerts.length - 20} more alerts</p>` : ''}
    </div>
    ` : ''}

    <h2>Recommendations</h2>

    ${report.recommendations.immediate.length > 0 ? `
    <h3>Immediate Actions</h3>
    <ul>
        ${report.recommendations.immediate.map(rec => `<li>${rec}</li>`).join('')}
    </ul>
    ` : ''}

    ${report.recommendations.shortTerm.length > 0 ? `
    <h3>Short-term Improvements</h3>
    <ul>
        ${report.recommendations.shortTerm.map(rec => `<li>${rec}</li>`).join('')}
    </ul>
    ` : ''}

    ${report.recommendations.longTerm.length > 0 ? `
    <h3>Long-term Optimizations</h3>
    <ul>
        ${report.recommendations.longTerm.map(rec => `<li>${rec}</li>`).join('')}
    </ul>
    ` : ''}

    <h2>Raw Data Summary</h2>
    <div class="metric">
        <p><strong>Metrics Samples:</strong> ${report.rawData.metrics.length}</p>
        <p><strong>Memory Leak Reports:</strong> ${report.rawData.memoryLeaks.length}</p>
        <p><strong>GPU Reports:</strong> ${report.rawData.gpuReports.length}</p>
    </div>
</body>
</html>`;

    return html;
  }

  clearData(): void {
    this.metrics = [];
    this.alerts = [];
    this.memoryLeaks = [];
    this.gpuReports = [];
    this.benchmarks = [];
  }
}

// Utility function to download exported data
export function downloadPerformanceReport(
  content: string,
  filename: string,
  mimeType = 'application/json'
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  URL.revokeObjectURL(url);
}

// Singleton instance
export const performanceReportGenerator = new PerformanceReportGenerator();