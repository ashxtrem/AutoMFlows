import { SelectorOption, SelectorFinderEvent } from '@automflows/shared';
import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;
let selectorFinderCallbacks: Map<string, (selectors: SelectorOption[]) => void> = new Map();

/**
 * Initialize selector finder service
 */
export function initSelectorFinder(backendPort: number): void {
  if (socket && socket.connected) {
    return; // Already initialized
  }

  socket = io(`http://localhost:${backendPort}`, {
    transports: ['websocket', 'polling'],
  });

  socket.on('connect', () => {
    console.log('Selector finder socket connected');
  });

  socket.on('selector-finder-event', (event: SelectorFinderEvent) => {
    if (event.event === 'selectors-generated' && event.selectors && event.nodeId && event.fieldName) {
      const callbackKey = `${event.nodeId}-${event.fieldName}`;
      const callback = selectorFinderCallbacks.get(callbackKey);
      if (callback) {
        callback(event.selectors);
        // DO NOT delete callback here - it should persist until component unmounts or user accepts/cancels
        // The cleanup function returned from onSelectorsGenerated will handle deletion
      }
    }
  });

  socket.on('disconnect', () => {
    console.log('Selector finder socket disconnected');
  });
}

/**
 * Start selector finder session
 */
export async function startSelectorFinder(
  nodeId: string,
  fieldName: string,
  backendPort: number
): Promise<{ sessionId: string; pageUrl: string }> {
  initSelectorFinder(backendPort);

  const response = await fetch(`http://localhost:${backendPort}/api/workflows/selector-finder/start`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ nodeId, fieldName }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to start selector finder');
  }

  return await response.json();
}

/**
 * Stop selector finder session
 */
export async function stopSelectorFinder(backendPort: number): Promise<void> {
  const response = await fetch(`http://localhost:${backendPort}/api/workflows/selector-finder/stop`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to stop selector finder');
  }
}

/**
 * Get selector finder status
 */
export async function getSelectorFinderStatus(backendPort: number): Promise<{
  active: boolean;
  sessionId: string | null;
  pageUrl: string | null;
}> {
  const response = await fetch(`http://localhost:${backendPort}/api/workflows/selector-finder/status`);

  if (!response.ok) {
    throw new Error('Failed to get selector finder status');
  }

  return await response.json();
}

/**
 * Register callback for when selectors are generated
 */
export function onSelectorsGenerated(
  nodeId: string,
  fieldName: string,
  callback: (selectors: SelectorOption[]) => void
): () => void {
  const callbackKey = `${nodeId}-${fieldName}`;
  selectorFinderCallbacks.set(callbackKey, callback);

  // Return cleanup function
  return () => {
    selectorFinderCallbacks.delete(callbackKey);
  };
}

/**
 * Send selected selector to backend
 */
export async function selectSelector(
  selectors: SelectorOption[],
  selectedIndex: number,
  nodeId: string,
  fieldName: string,
  backendPort: number
): Promise<void> {
  const response = await fetch(`http://localhost:${backendPort}/api/workflows/selector-finder/selectors`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      selectors,
      selectedIndex,
      nodeId,
      fieldName,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to select selector');
  }
}
