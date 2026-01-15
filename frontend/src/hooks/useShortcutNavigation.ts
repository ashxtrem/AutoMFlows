import { useEffect, useRef } from 'react';
import { useReactFlow } from 'reactflow';
import { useWorkflowStore } from '../store/workflowStore';
import { isShortcutKeyPress } from '../utils/shortcutValidator';

/**
 * Check if any popup, modal, or edit window is currently open
 * This prevents shortcuts from triggering when user is interacting with UI elements
 */
function isAnyPopupOpen(): boolean {
  // Check if any input, textarea, or select is focused (user is typing)
  const activeElement = document.activeElement;
  if (activeElement && (
    activeElement.tagName === 'INPUT' ||
    activeElement.tagName === 'TEXTAREA' ||
    activeElement.tagName === 'SELECT'
  )) {
    return true;
  }

  // Check if any element with z-50 or higher is visible (popups typically use z-50)
  // This catches most popups/modals
  const highZIndexElements = document.querySelectorAll('[style*="z-index"]');
  for (const el of highZIndexElements) {
    const zIndex = window.getComputedStyle(el).zIndex;
    if (zIndex && parseInt(zIndex) >= 50 && el instanceof HTMLElement) {
      // Check if element is actually visible
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        return true;
      }
    }
  }

  // Check for common popup classes/attributes
  const popupSelectors = [
    '[class*="fixed"][class*="inset-0"]', // Full-screen overlays
    '[class*="z-50"]', // Tailwind z-50 class
    '[class*="z-[50]"]', // Tailwind z-[50] class
  ];

  for (const selector of popupSelectors) {
    const elements = document.querySelectorAll(selector);
    for (const el of elements) {
      if (el instanceof HTMLElement) {
        const rect = el.getBoundingClientRect();
        // Check if element is visible and has significant size
        if (rect.width > 100 && rect.height > 100) {
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * Hook that handles keyboard shortcut navigation to nodes
 * Listens for shortcut key presses and navigates to the associated node
 * Only triggers when canvas is clean (no popups, no properties panel, no edit windows)
 */
export function useShortcutNavigation() {
  const { setCenter, getViewport, setNodes, getNodes } = useReactFlow();
  const nodes = useWorkflowStore((state) => state.nodes);
  const selectedNode = useWorkflowStore((state) => state.selectedNode);
  const errorPopupNodeId = useWorkflowStore((state) => state.errorPopupNodeId);
  const canvasReloading = useWorkflowStore((state) => state.canvasReloading);
  
  // Build shortcut map: shortcut key -> nodeId
  const shortcutMapRef = useRef<Map<string, string>>(new Map());

  // Update shortcut map when nodes change
  useEffect(() => {
    const map = new Map<string, string>();
    
    nodes.forEach((node) => {
      if (node.data.type === 'shortcut.shortcut') {
        const shortcut = node.data.shortcut?.toLowerCase();
        
        if (shortcut && /^[a-z0-9]$/.test(shortcut)) {
          // Always navigate to the shortcut node itself
          map.set(shortcut, node.id);
        }
      }
    });

    shortcutMapRef.current = map;
  }, [nodes]);

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle if it's a valid shortcut key press (no modifiers)
      if (!isShortcutKeyPress(event)) {
        return;
      }

      // Check if canvas is in a clean state (no popups, no properties panel, etc.)
      // Block shortcuts if:
      // 1. Properties panel is open (selectedNode exists)
      // 2. Error popup is open
      // 3. Canvas is reloading
      // 4. Any popup/modal is open (checked via DOM)
      if (selectedNode || errorPopupNodeId || canvasReloading || isAnyPopupOpen()) {
        return;
      }

      const shortcut = event.key.toLowerCase();
      const targetNodeId = shortcutMapRef.current.get(shortcut);

      if (targetNodeId) {
        event.preventDefault();
        event.stopPropagation();

        // Find the target node in ReactFlow's nodes
        const reactFlowNodes = getNodes();
        const targetNode = reactFlowNodes.find((n) => n.id === targetNodeId);
        
        if (targetNode) {
          // Select the node using ReactFlow's API (doesn't open properties panel)
          setNodes((nds) =>
            nds.map((node) => ({
              ...node,
              selected: node.id === targetNodeId,
            }))
          );

          // Navigate to the node - center it in viewport
          const viewport = getViewport();
          const nodePosition = targetNode.position;
          
          // Center the node in the viewport
          setCenter(nodePosition.x, nodePosition.y, {
            zoom: viewport.zoom,
            duration: 300,
          });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true); // Use capture phase
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [nodes, setCenter, getViewport, setNodes, getNodes, selectedNode, errorPopupNodeId, canvasReloading]);
}
