import { useEffect } from 'react';

/**
 * Hook that handles file-related keyboard shortcuts:
 * - Ctrl+S / Cmd+S: Save workflow
 * - Ctrl+Shift+S / Cmd+Shift+S: Save workflow as
 * - Ctrl+O / Cmd+O: Open workflow
 */
export function useFileShortcuts() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if user is typing in an input, textarea, or contenteditable element
      const target = e.target as HTMLElement;
      const isInputElement = 
        target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' || 
        target.isContentEditable ||
        target.closest('input') ||
        target.closest('textarea') ||
        target.closest('[contenteditable="true"]');
      
      // Don't handle shortcuts when typing in inputs
      if (isInputElement) {
        return;
      }
      
      // Check if any modal/popup is open (prevent shortcuts when modals are active)
      const hasModal = document.querySelector('[role="dialog"]') || 
                       document.querySelector('.modal') ||
                       document.querySelector('[data-modal]');
      if (hasModal) {
        return;
      }
      
      const isModifierPressed = e.metaKey || e.ctrlKey;
      const isShiftPressed = e.shiftKey;
      
      // Save (Ctrl+S / Cmd+S)
      if (isModifierPressed && !isShiftPressed && e.key === 's') {
        e.preventDefault();
        e.stopPropagation();
        
        // Trigger save via custom event
        window.dispatchEvent(new CustomEvent('workflow-save'));
      }
      
      // Save As (Ctrl+Shift+S / Cmd+Shift+S)
      if (isModifierPressed && isShiftPressed && e.key === 'S') {
        e.preventDefault();
        e.stopPropagation();
        
        // Trigger save as via custom event
        window.dispatchEvent(new CustomEvent('workflow-save-as'));
      }
      
      // Open (Ctrl+O / Cmd+O)
      if (isModifierPressed && !isShiftPressed && e.key === 'o') {
        e.preventDefault();
        e.stopPropagation();
        
        // Trigger open via custom event
        window.dispatchEvent(new CustomEvent('workflow-open'));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);
}
