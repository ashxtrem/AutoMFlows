import { useEffect, useRef } from 'react';
import { Node } from 'reactflow';
import { useWorkflowStore } from '../../store/workflowStore';
import { useNotificationStore } from '../../store/notificationStore';

export interface UseShortcutsProps {
  screenToFlowPosition: (position: { x: number; y: number }) => { x: number; y: number };
  setNodes: (nodes: Node[] | ((nodes: Node[]) => Node[])) => void;
  reactFlowWrapper: React.RefObject<HTMLDivElement>;
  nodeSearchOverlayOpen: boolean;
  setNodeSearchOverlayOpen: (open: boolean) => void;
  navigateToFailedNode: () => void;
}

export function useShortcuts({
  screenToFlowPosition,
  setNodes,
  reactFlowWrapper,
  nodeSearchOverlayOpen,
  setNodeSearchOverlayOpen,
  navigateToFailedNode,
}: UseShortcutsProps) {
  const {
    selectedNodeIds,
    canvasReloading,
    selectAllNodes,
    deleteNode,
    duplicateNode,
    copyNode,
    pasteNode,
    clearSelection,
    nodes,
    followModeEnabled,
    setFollowModeEnabled,
  } = useWorkflowStore();
  
  const addNotification = useNotificationStore((state) => state.addNotification);
  
  // Track if Shift key is held during drag
  const shiftKeyHeldRef = useRef(false);
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        shiftKeyHeldRef.current = true;
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        shiftKeyHeldRef.current = false;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Keyboard shortcut for failed node navigation (Ctrl/Cmd + Shift + F)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isModifierPressed = e.metaKey || e.ctrlKey;
      if (isModifierPressed && e.shiftKey && e.key === 'F') {
        e.preventDefault();
        navigateToFailedNode();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [navigateToFailedNode]);

  // Keyboard shortcut for follow mode toggle (Ctrl/Cmd + Shift + L)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isModifierPressed = e.metaKey || e.ctrlKey;
      if (isModifierPressed && e.shiftKey && e.key === 'L') {
        e.preventDefault();
        const newValue = !followModeEnabled;
        setFollowModeEnabled(newValue);
        addNotification({
          type: 'info',
          title: 'Follow Mode',
          message: newValue ? 'Follow mode enabled' : 'Follow mode disabled',
        });
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [followModeEnabled, setFollowModeEnabled, addNotification]);

  // Keyboard shortcut for node search (Ctrl/Cmd + F)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isModifierPressed = e.metaKey || e.ctrlKey;
      // Only trigger if Ctrl+F (Cmd+F on Mac) and not Shift+F (which is for failed node navigation)
      if (isModifierPressed && !e.shiftKey && e.key === 'f') {
        // Check if user is typing in an input/textarea (don't override browser find)
        const activeElement = document.activeElement;
        const isInputFocused = activeElement && (
          activeElement.tagName === 'INPUT' ||
          activeElement.tagName === 'TEXTAREA' ||
          activeElement.tagName === 'SELECT'
        );
        
        // If search overlay is already open, just focus the input
        if (nodeSearchOverlayOpen) {
          // Don't prevent default if user is typing in the search input itself
          if (!isInputFocused || !(activeElement as HTMLElement).closest('[data-search-overlay]')) {
            e.preventDefault();
            // Focus will be handled by the overlay component
          }
          return;
        }
        
        // Only open if not typing in an input (allow browser find in other contexts)
        // But allow opening even when other UI elements are open (sidebars, popups, etc.)
        if (!isInputFocused) {
          e.preventDefault();
          setNodeSearchOverlayOpen(true);
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [nodeSearchOverlayOpen, setNodeSearchOverlayOpen]);

  // Keyboard shortcuts for multi-selection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isModifierPressed = e.metaKey || e.ctrlKey;
      const activeElement = document.activeElement;
      const isInputFocused = activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.tagName === 'SELECT' ||
        (activeElement as HTMLElement).isContentEditable
      );

      // Don't handle shortcuts if user is typing in an input
      if (isInputFocused) {
        return;
      }

      // Don't handle if canvas is reloading or properties panel is open
      const selectedNode = useWorkflowStore.getState().selectedNode;
      
      // Check if any modal/popup is open (prevent shortcuts when modals are active)
      const hasModal = document.querySelector('.fixed.inset-0.bg-black.bg-opacity-50') !== null ||
                      document.querySelector('[role="dialog"]') !== null ||
                      document.querySelector('[role="alertdialog"]') !== null ||
                      document.querySelector('[data-modal="true"]') !== null;
      
      if (canvasReloading || selectedNode || hasModal) {
        return;
      }

      // Ctrl/Cmd + A: Select all nodes
      if (isModifierPressed && e.key === 'a' && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        selectAllNodes();
        // Also update ReactFlow's node selection state
        const allNodeIds = nodes.map((n) => n.id);
        setNodes((nds) =>
          nds.map((node) => ({
            ...node,
            selected: allNodeIds.includes(node.id),
          }))
        );
        return;
      }

      // Delete or Backspace: Delete selected nodes
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNodeIds.size > 0) {
        e.preventDefault();
        e.stopPropagation();
        deleteNode(Array.from(selectedNodeIds));
        return;
      }

      // Ctrl/Cmd + D: Duplicate selected nodes
      if (isModifierPressed && e.key === 'd' && !e.shiftKey && selectedNodeIds.size > 0) {
        e.preventDefault();
        e.stopPropagation();
        duplicateNode(Array.from(selectedNodeIds));
        return;
      }

      // Ctrl/Cmd + C: Copy selected nodes
      if (isModifierPressed && e.key === 'c' && !e.shiftKey && selectedNodeIds.size > 0) {
        e.preventDefault();
        e.stopPropagation();
        copyNode(Array.from(selectedNodeIds));
        return;
      }

      // Ctrl/Cmd + V: Paste nodes (at mouse position or center)
      if (isModifierPressed && e.key === 'v' && !e.shiftKey) {
        if (!reactFlowWrapper.current) return;
        e.preventDefault();
        e.stopPropagation();

        const rect = reactFlowWrapper.current.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const flowPosition = screenToFlowPosition({ x: centerX, y: centerY });

        (async () => {
          try {
            const text = await navigator.clipboard.readText();
            const parsed = JSON.parse(text);
            if (parsed && parsed._automflows === true && Array.isArray(parsed.nodes) && parsed.nodes.length > 0) {
              useWorkflowStore.getState().pasteFromClipboardData(parsed, flowPosition);
              return;
            }
          } catch {
            // System clipboard unavailable or content is not ours — fall back
          }
          const clipboard = useWorkflowStore.getState().clipboard;
          if (clipboard) {
            pasteNode(flowPosition);
          }
        })();
        return;
      }

      // Escape: Clear selection
      if (e.key === 'Escape') {
        const currentState = useWorkflowStore.getState();
        const hasSelection = currentState.selectedNodeIds.size > 0;
        if (hasSelection) {
          e.preventDefault();
          e.stopPropagation();
          clearSelection();
          // Also clear ReactFlow selection
          setNodes((nds) =>
            nds.map((node) => ({
              ...node,
              selected: false,
            }))
          );
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [selectedNodeIds, canvasReloading, selectAllNodes, deleteNode, duplicateNode, copyNode, pasteNode, clearSelection, screenToFlowPosition, nodes, setNodes, reactFlowWrapper]);
}
