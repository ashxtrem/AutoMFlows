export type KeyBindingCategory = 'workflow' | 'navigation' | 'execution' | 'general';

export interface KeyBinding {
  id: string;
  keys: string[]; // e.g., ['Ctrl', 'B'] or ['a']
  description: string;
  category: KeyBindingCategory;
  platformSpecific?: {
    mac?: string[];
    windows?: string[];
  };
}

/**
 * Detect if the current platform is Mac
 */
function isMac(): boolean {
  return typeof navigator !== 'undefined' && /Mac|iPhone|iPod|iPad/i.test(navigator.platform);
}

/**
 * Get platform-specific key label (Ctrl for Windows/Linux, Cmd for Mac)
 */
export function getModifierKey(): string {
  return isMac() ? 'Cmd' : 'Ctrl';
}

/**
 * Format key combination for display
 */
export function formatKeyCombination(binding: KeyBinding): string {
  const modifier = getModifierKey();
  const keys = binding.platformSpecific 
    ? (isMac() ? binding.platformSpecific.mac : binding.platformSpecific.windows) || binding.keys
    : binding.keys;
  
  // Replace Ctrl/Cmd with platform-specific modifier
  return keys.map(key => {
    if (key === 'Ctrl' || key === 'Cmd') {
      return modifier;
    }
    return key;
  }).join(' + ');
}

/**
 * All keyboard shortcuts available in the application
 */
export const KEY_BINDINGS: KeyBinding[] = [
  // Workflow shortcuts
  {
    id: 'undo',
    keys: ['Ctrl', 'Z'],
    description: 'Undo the last action',
    category: 'workflow',
    platformSpecific: {
      mac: ['Cmd', 'Z'],
      windows: ['Ctrl', 'Z'],
    },
  },
  {
    id: 'redo',
    keys: ['Ctrl', 'Shift', 'Z'],
    description: 'Redo the last undone action',
    category: 'workflow',
    platformSpecific: {
      mac: ['Cmd', 'Shift', 'Z'],
      windows: ['Ctrl', 'Shift', 'Z'],
    },
  },
  {
    id: 'redo-alt',
    keys: ['Ctrl', 'Y'],
    description: 'Redo the last undone action (alternative)',
    category: 'workflow',
    platformSpecific: {
      mac: ['Cmd', 'Y'],
      windows: ['Ctrl', 'Y'],
    },
  },
  
  // Execution shortcuts
  {
    id: 'breakpoint-toggle',
    keys: ['Ctrl', 'B'],
    description: 'Toggle breakpoint mode on/off',
    category: 'execution',
    platformSpecific: {
      mac: ['Cmd', 'B'],
      windows: ['Ctrl', 'B'],
    },
  },
  {
    id: 'follow-mode-toggle',
    keys: ['Ctrl', 'Shift', 'L'],
    description: 'Toggle follow mode to automatically follow executing nodes',
    category: 'execution',
    platformSpecific: {
      mac: ['Cmd', 'Shift', 'L'],
      windows: ['Ctrl', 'Shift', 'L'],
    },
  },
  
  // Navigation shortcuts
  {
    id: 'navigate-failed-node',
    keys: ['Ctrl', 'Shift', 'F'],
    description: 'Navigate to the first failed node in the workflow',
    category: 'navigation',
    platformSpecific: {
      mac: ['Cmd', 'Shift', 'F'],
      windows: ['Ctrl', 'Shift', 'F'],
    },
  },
  {
    id: 'shortcut-node-navigation',
    keys: ['a-z', '0-9'],
    description: 'Navigate to a shortcut node by pressing its assigned key',
    category: 'navigation',
  },
  
  // General shortcuts
  {
    id: 'report-history',
    keys: ['Ctrl', 'H'],
    description: 'Open report history in a new tab',
    category: 'general',
    platformSpecific: {
      mac: ['Cmd', 'H'],
      windows: ['Ctrl', 'H'],
    },
  },
  {
    id: 'escape',
    keys: ['Escape'],
    description: 'Close modals, popups, and dialogs, or clear node selection',
    category: 'general',
  },
  
  // Selection shortcuts
  {
    id: 'select-all',
    keys: ['Ctrl', 'A'],
    description: 'Select all nodes in the canvas',
    category: 'workflow',
    platformSpecific: {
      mac: ['Cmd', 'A'],
      windows: ['Ctrl', 'A'],
    },
  },
  {
    id: 'duplicate-selected',
    keys: ['Ctrl', 'D'],
    description: 'Duplicate all selected nodes',
    category: 'workflow',
    platformSpecific: {
      mac: ['Cmd', 'D'],
      windows: ['Ctrl', 'D'],
    },
  },
  {
    id: 'delete-selected',
    keys: ['Delete'],
    description: 'Delete all selected nodes',
    category: 'workflow',
  },
  {
    id: 'delete-selected-alt',
    keys: ['Backspace'],
    description: 'Delete all selected nodes (alternative)',
    category: 'workflow',
  },
  {
    id: 'copy-selected',
    keys: ['Ctrl', 'C'],
    description: 'Copy all selected nodes',
    category: 'workflow',
    platformSpecific: {
      mac: ['Cmd', 'C'],
      windows: ['Ctrl', 'C'],
    },
  },
  {
    id: 'paste-selected',
    keys: ['Ctrl', 'V'],
    description: 'Paste copied nodes',
    category: 'workflow',
    platformSpecific: {
      mac: ['Cmd', 'V'],
      windows: ['Ctrl', 'V'],
    },
  },
];

/**
 * Get all key bindings grouped by category
 */
export function getKeyBindingsByCategory(): Record<KeyBindingCategory, KeyBinding[]> {
  const grouped: Record<KeyBindingCategory, KeyBinding[]> = {
    workflow: [],
    navigation: [],
    execution: [],
    general: [],
  };
  
  KEY_BINDINGS.forEach(binding => {
    grouped[binding.category].push(binding);
  });
  
  return grouped;
}

/**
 * Get category display name
 */
export function getCategoryName(category: KeyBindingCategory): string {
  const names: Record<KeyBindingCategory, string> = {
    workflow: 'Workflow',
    navigation: 'Navigation',
    execution: 'Execution',
    general: 'General',
  };
  return names[category];
}

/**
 * Get category order for display
 */
export function getCategoryOrder(): KeyBindingCategory[] {
  return ['workflow', 'execution', 'navigation', 'general'];
}
