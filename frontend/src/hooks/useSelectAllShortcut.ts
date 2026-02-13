import { useEffect } from 'react';
import { useWorkflowStore } from '../store/workflowStore';

/**
 * Hook that handles Ctrl/Cmd+A shortcut to select all nodes
 */
export function useSelectAllShortcut() {
  const { selectAllNodes, canvasReloading, selectedNode } = useWorkflowStore();

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

      // Don't handle if user is typing in an input (allow browser select all)
      if (isInputFocused) {
        return;
      }

      // Don't handle if canvas is reloading or properties panel is open
      if (canvasReloading || selectedNode) {
        return;
      }

      // Ctrl/Cmd + A: Select all nodes
      if (isModifierPressed && e.key === 'a' && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        selectAllNodes();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [selectAllNodes, canvasReloading, selectedNode]);
}
