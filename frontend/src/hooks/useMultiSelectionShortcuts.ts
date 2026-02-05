import { useEffect } from 'react';
import { useWorkflowStore } from '../store/workflowStore';
import { useReactFlow } from 'reactflow';

/**
 * Hook that handles multi-selection keyboard shortcuts:
 * - Delete/Backspace: Delete selected nodes
 * - Ctrl/Cmd+D: Duplicate selected nodes
 * - Ctrl/Cmd+C: Copy selected nodes
 * - Ctrl/Cmd+V: Paste nodes
 * - Escape: Clear selection
 */
export function useMultiSelectionShortcuts() {
  const { 
    selectedNodeIds, 
    deleteNode, 
    duplicateNode, 
    copyNode, 
    pasteNode, 
    clearSelection,
    canvasReloading,
    selectedNode,
    clipboard
  } = useWorkflowStore();
  const { screenToFlowPosition } = useReactFlow();

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
      // Also check if any modal/popup is open (prevent shortcuts when modals are active)
      const hasModal = document.querySelector('.fixed.inset-0.bg-black.bg-opacity-50') !== null ||
                      document.querySelector('[role="dialog"]') !== null ||
                      document.querySelector('[role="alertdialog"]') !== null ||
                      document.querySelector('[data-modal="true"]') !== null;
      
      if (canvasReloading || selectedNode || hasModal) {
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

      // Ctrl/Cmd + V: Paste nodes (at center of viewport)
      if (isModifierPressed && e.key === 'v' && !e.shiftKey) {
        if (clipboard) {
          e.preventDefault();
          e.stopPropagation();
          // Paste at center of viewport
          const viewport = document.querySelector('.react-flow__viewport');
          if (viewport) {
            const rect = viewport.getBoundingClientRect();
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            const flowPosition = screenToFlowPosition({ x: centerX, y: centerY });
            pasteNode(flowPosition);
          }
        }
        return;
      }

      // Escape: Clear selection
      if (e.key === 'Escape' && selectedNodeIds.size > 0) {
        e.preventDefault();
        e.stopPropagation();
        clearSelection();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [selectedNodeIds, canvasReloading, selectedNode, deleteNode, duplicateNode, copyNode, pasteNode, clearSelection, clipboard, screenToFlowPosition]);
}
