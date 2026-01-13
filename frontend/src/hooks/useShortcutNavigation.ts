import { useEffect, useRef } from 'react';
import { useReactFlow } from 'reactflow';
import { useWorkflowStore } from '../store/workflowStore';
import { isShortcutKeyPress } from '../utils/shortcutValidator';

/**
 * Hook that handles keyboard shortcut navigation to nodes
 * Listens for shortcut key presses and navigates to the associated node
 */
export function useShortcutNavigation() {
  const { setCenter, getViewport, setNodes, getNodes } = useReactFlow();
  const nodes = useWorkflowStore((state) => state.nodes);
  
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
  }, [nodes, setCenter, getViewport, setNodes, getNodes]);
}
