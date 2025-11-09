'use server';

import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { revalidatePath } from 'next/cache';

const CONFIG_DIR = join(process.cwd(), 'config', 'charts');

export interface ChartConfig {
  id: string;
  name: string;
  type: 'line' | 'bar' | 'scatter' | 'heatmap';
  color?: string;
  lineWidth?: number;
  smooth?: boolean;
  showGrid?: boolean;
  showAxes?: boolean;
  animated?: boolean;
  barWidth?: number;
  pointSize?: number;
  opacity?: number;
  cellSize?: number;
  [key: string]: any;
}

/**
 * Load default chart configuration
 */
export async function loadDefaultConfig(): Promise<any> {
  try {
    const configPath = join(CONFIG_DIR, 'default.json');
    const content = await readFile(configPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error('Failed to load default config:', error);
    // Return fallback config
    return {
      line: { color: '#3b82f6', lineWidth: 2, smooth: true },
      bar: { color: '#10b981', barWidth: 0.8 },
      scatter: { color: '#f59e0b', pointSize: 4, opacity: 0.8 },
      heatmap: { cellSize: 10 },
      performance: {
        targetFPS: 60,
        maxDataPoints: 10000,
        enableWebWorkers: true
      }
    };
  }
}

/**
 * Save custom chart configuration
 */
export async function saveChartConfig(config: ChartConfig): Promise<{ success: boolean; error?: string }> {
  try {
    // Ensure config directory exists
    await mkdir(CONFIG_DIR, { recursive: true });

    const configPath = join(CONFIG_DIR, `${config.id}.json`);
    await writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');

    // Revalidate dashboard page to reflect changes
    revalidatePath('/dashboard');

    return { success: true };
  } catch (error) {
    console.error('Failed to save chart config:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Load custom chart configuration
 */
export async function loadChartConfig(id: string): Promise<ChartConfig | null> {
  try {
    const configPath = join(CONFIG_DIR, `${id}.json`);
    const content = await readFile(configPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Failed to load chart config ${id}:`, error);
    return null;
  }
}

/**
 * Save dashboard preferences
 */
export async function saveDashboardPreferences(preferences: {
  updateInterval?: number;
  maxDataPoints?: number;
  enableAggregation?: boolean;
  defaultChartType?: string;
  [key: string]: any;
}): Promise<{ success: boolean; error?: string }> {
  try {
    await mkdir(CONFIG_DIR, { recursive: true });

    const preferencesPath = join(CONFIG_DIR, 'preferences.json');
    await writeFile(preferencesPath, JSON.stringify(preferences, null, 2), 'utf-8');

    revalidatePath('/dashboard');

    return { success: true };
  } catch (error) {
    console.error('Failed to save preferences:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Load dashboard preferences
 */
export async function loadDashboardPreferences(): Promise<any> {
  try {
    const preferencesPath = join(CONFIG_DIR, 'preferences.json');
    const content = await readFile(preferencesPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    // Return defaults if file doesn't exist
    return {
      updateInterval: 100,
      maxDataPoints: 10000,
      enableAggregation: false,
      defaultChartType: 'line'
    };
  }
}

/**
 * Export data as JSON
 */
export async function exportDataAsJSON(data: any[]): Promise<{ success: boolean; data?: string; error?: string }> {
  try {
    const json = JSON.stringify(data, null, 2);
    return { success: true, data: json };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Export failed'
    };
  }
}

/**
 * Export data as CSV
 */
export async function exportDataAsCSV(data: any[]): Promise<{ success: boolean; data?: string; error?: string }> {
  try {
    if (data.length === 0) {
      return { success: false, error: 'No data to export' };
    }

    // Get headers from first object
    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];

    // Add data rows
    for (const row of data) {
      const values = headers.map(header => {
        const value = row[header];
        // Handle special characters and quotes
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      });
      csvRows.push(values.join(','));
    }

    return { success: true, data: csvRows.join('\n') };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Export failed'
    };
  }
}