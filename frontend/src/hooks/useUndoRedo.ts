import { useEffect } from 'react';
import { useWorkflowStore } from '../store/workflowStore';

export function useUndoRedo() {
  const undo = useWorkflowStore((state) => state.undo);
  const redo = useWorkflowStore((state) => state.redo);
  const canUndo = useWorkflowStore((state) => state.canUndo);
  const canRedo = useWorkflowStore((state) => state.canRedo);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Cmd (Mac) or Ctrl (Windows/Linux)
      const isModifierPressed = e.metaKey || e.ctrlKey;
      
      if (isModifierPressed && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (canUndo()) {
          undo();
        }
      } else if (
        (isModifierPressed && e.key === 'z' && e.shiftKey) ||
        (isModifierPressed && e.key === 'y')
      ) {
        e.preventDefault();
        if (canRedo()) {
          redo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [undo, redo, canUndo, canRedo]);

  return { undo, redo, canUndo, canRedo };
}

