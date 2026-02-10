// Module-level variable to track if initial fitView has run (persists across component remounts)
// This is necessary because React.StrictMode in development causes remounts which reset refs
let hasRunInitialFitViewGlobal = false;

// Module-level variable to store the last known viewport (persists across StrictMode remounts)
// This prevents viewport reset when React.StrictMode causes unexpected remounts
let lastKnownViewport: { x: number; y: number; zoom: number } | null = null;

// LocalStorage key for persisting viewport across page refreshes
const VIEWPORT_STORAGE_KEY = 'reactflow-viewport';

// Helper functions for localStorage persistence
export const saveViewportToStorage = (viewport: { x: number; y: number; zoom: number }) => {
  try {
    localStorage.setItem(VIEWPORT_STORAGE_KEY, JSON.stringify(viewport));
  } catch (error) {
    // Ignore localStorage errors (e.g., quota exceeded, private browsing)
    console.warn('Failed to save viewport to localStorage:', error);
  }
};

export const loadViewportFromStorage = (): { x: number; y: number; zoom: number } | null => {
  try {
    const stored = localStorage.getItem(VIEWPORT_STORAGE_KEY);
    if (stored) {
      const viewport = JSON.parse(stored);
      // Validate viewport structure
      if (viewport && typeof viewport.x === 'number' && typeof viewport.y === 'number' && typeof viewport.zoom === 'number') {
        return viewport;
      }
    }
  } catch (error) {
    // Ignore localStorage errors
    console.warn('Failed to load viewport from localStorage:', error);
  }
  return null;
};

// Getter and setter for module-level viewport state
export const getLastKnownViewport = () => lastKnownViewport;
export const setLastKnownViewport = (viewport: { x: number; y: number; zoom: number } | null) => {
  lastKnownViewport = viewport;
};

// Getter and setter for initial fitView flag
export const getHasRunInitialFitView = () => hasRunInitialFitViewGlobal;
export const setHasRunInitialFitView = (value: boolean) => {
  hasRunInitialFitViewGlobal = value;
};
