import { useEffect, useCallback } from 'react';

interface ShortcutDefinition {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean; // For Cmd on Mac
  action: () => void;
  description: string;
  category?: string;
  preventDefault?: boolean;
}

interface KeyboardShortcutsConfig {
  shortcuts: ShortcutDefinition[];
  enabled?: boolean;
}

export function useKeyboardShortcuts(config: KeyboardShortcutsConfig) {
  const { shortcuts, enabled = true } = config;

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    const matchingShortcut = shortcuts.find(shortcut => {
      const keyMatches = event.key.toLowerCase() === shortcut.key.toLowerCase();
      const ctrlMatches = !!event.ctrlKey === !!shortcut.ctrl;
      const shiftMatches = !!event.shiftKey === !!shortcut.shift;
      const altMatches = !!event.altKey === !!shortcut.alt;
      const metaMatches = !!event.metaKey === !!shortcut.meta;

      return keyMatches && ctrlMatches && shiftMatches && altMatches && metaMatches;
    });

    if (matchingShortcut) {
      if (matchingShortcut.preventDefault !== false) {
        event.preventDefault();
      }
      matchingShortcut.action();
    }
  }, [shortcuts, enabled]);

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown, enabled]);

  const getShortcutHelp = useCallback(() => {
    const categories = shortcuts.reduce((acc, shortcut) => {
      const category = shortcut.category || 'General';
      if (!acc[category]) acc[category] = [];
      acc[category].push(shortcut);
      return acc;
    }, {} as Record<string, ShortcutDefinition[]>);

    return categories;
  }, [shortcuts]);

  const isShortcutPressed = useCallback((shortcut: ShortcutDefinition, event: KeyboardEvent) => {
    return event.key.toLowerCase() === shortcut.key.toLowerCase() &&
           !!event.ctrlKey === !!shortcut.ctrl &&
           !!event.shiftKey === !!shortcut.shift &&
           !!event.altKey === !!shortcut.alt &&
           !!event.metaKey === !!shortcut.meta;
  }, []);

  return {
    getShortcutHelp,
    isShortcutPressed,
    shortcuts: enabled ? shortcuts : []
  };
}

// Predefined dashboard shortcuts
export function useDashboardShortcuts() {
  return useKeyboardShortcuts({
    shortcuts: [
      // Zoom and Pan
      {
        key: '+',
        ctrl: true,
        action: () => console.log('Zoom in'),
        description: 'Zoom in',
        category: 'Navigation'
      },
      {
        key: '-',
        ctrl: true,
        action: () => console.log('Zoom out'),
        description: 'Zoom out',
        category: 'Navigation'
      },
      {
        key: '0',
        ctrl: true,
        action: () => console.log('Reset zoom'),
        description: 'Reset zoom and pan',
        category: 'Navigation'
      },

      // Data Controls
      {
        key: 'r',
        ctrl: true,
        action: () => console.log('Refresh data'),
        description: 'Refresh data',
        category: 'Data'
      },
      {
        key: 'p',
        ctrl: true,
        shift: true,
        action: () => console.log('Pause/resume streaming'),
        description: 'Pause/resume data streaming',
        category: 'Data'
      },

      // View Controls
      {
        key: 'f',
        ctrl: true,
        action: () => console.log('Toggle fullscreen'),
        description: 'Toggle fullscreen mode',
        category: 'View'
      },
      {
        key: 'g',
        ctrl: true,
        action: () => console.log('Toggle grid'),
        description: 'Toggle grid overlay',
        category: 'View'
      },

      // Performance
      {
        key: 'd',
        ctrl: true,
        shift: true,
        action: () => console.log('Toggle performance monitor'),
        description: 'Toggle performance monitor',
        category: 'Debug'
      },

      // Export/Save
      {
        key: 's',
        ctrl: true,
        shift: true,
        action: () => console.log('Save snapshot'),
        description: 'Save current view as snapshot',
        category: 'Export'
      },
      {
        key: 'e',
        ctrl: true,
        action: () => console.log('Export data'),
        description: 'Export current data',
        category: 'Export'
      },

      // Time Navigation
      {
        key: 'ArrowLeft',
        alt: true,
        action: () => console.log('Previous time period'),
        description: 'Navigate to previous time period',
        category: 'Time'
      },
      {
        key: 'ArrowRight',
        alt: true,
        action: () => console.log('Next time period'),
        description: 'Navigate to next time period',
        category: 'Time'
      },

      // Chart Controls
      {
        key: '1',
        ctrl: true,
        action: () => console.log('Switch to line chart'),
        description: 'Switch to line chart view',
        category: 'Charts'
      },
      {
        key: '2',
        ctrl: true,
        action: () => console.log('Switch to bar chart'),
        description: 'Switch to bar chart view',
        category: 'Charts'
      },
      {
        key: '3',
        ctrl: true,
        action: () => console.log('Switch to scatter plot'),
        description: 'Switch to scatter plot view',
        category: 'Charts'
      },

      // Accessibility
      {
        key: 'h',
        ctrl: true,
        action: () => console.log('Show keyboard shortcuts help'),
        description: 'Show keyboard shortcuts help',
        category: 'Help'
      }
    ]
  });
}

// Utility hook for custom shortcuts
export function useCustomShortcuts(shortcuts: ShortcutDefinition[]) {
  return useKeyboardShortcuts({ shortcuts });
}