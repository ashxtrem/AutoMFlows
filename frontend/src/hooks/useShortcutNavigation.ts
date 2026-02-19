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

  // Check for actual modal/dialog/popup elements more specifically
  // Look for elements with role="dialog", role="alertdialog", or common modal classes
  const modalSelectors = [
    '[role="dialog"]',
    '[role="alertdialog"]',
    '[data-modal="true"]',
    '[data-popup="true"]',
    // Common modal overlay patterns (but exclude ReactFlow)
    '[class*="modal"][class*="overlay"]',
    '[class*="popup"][class*="overlay"]',
    '[class*="dialog"][class*="overlay"]',
  ];

  for (const selector of modalSelectors) {
    const elements = document.querySelectorAll(selector);
    for (const el of elements) {
      if (el instanceof HTMLElement) {
        // Skip ReactFlow elements and canvas containers
        const classList = Array.from(el.classList);
        const id = el.id || '';
        // Skip ReactFlow canvas and controls
        if (classList.some(c => c.includes('react-flow') || c.includes('reactflow')) ||
            id.includes('react-flow') || id.includes('reactflow') ||
            el.closest('.react-flow') || el.closest('[class*="react-flow"]')) {
          continue;
        }
        
        const rect = el.getBoundingClientRect();
        // Check if element is visible and has significant size
        if (rect.width > 100 && rect.height > 100) {
          return true;
        }
      }
    }
  }

  // Also check for elements with very high z-index (>= 100) that aren't ReactFlow
  // Higher threshold to avoid false positives from UI elements
  const highZIndexElements = document.querySelectorAll('[style*="z-index"]');
  for (const el of highZIndexElements) {
    if (el instanceof HTMLElement) {
      const classList = Array.from(el.classList);
      const id = el.id || '';
      // Skip ReactFlow elements
      if (classList.some(c => c.includes('react-flow') || c.includes('reactflow')) ||
          id.includes('react-flow') || id.includes('reactflow') ||
          el.closest('.react-flow') || el.closest('[class*="react-flow"]')) {
        continue;
      }
      
      const zIndex = window.getComputedStyle(el).zIndex;
      // Use higher threshold (100) to avoid matching regular UI elements
      if (zIndex && parseInt(zIndex) >= 100) {
        const rect = el.getBoundingClientRect();
        // Check if element is actually visible and covers significant area
        if (rect.width > 200 && rect.height > 200) {
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
  const { fitView, setNodes, getNodes } = useReactFlow();
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

          // Navigate to the node - use fitView (same as follow mode) for consistent zoom
          fitView({
            nodes: [{ id: targetNodeId }],
            padding: 0.2,
            duration: 300,
          });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true); // Use capture phase
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [nodes, fitView, setNodes, getNodes, selectedNode, errorPopupNodeId, canvasReloading]);
}
