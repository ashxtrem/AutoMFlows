import { useEffect } from 'react';
import { useWorkflowStore } from '../store/workflowStore';
import { useNotificationStore } from '../store/notificationStore';

export function useBreakpointShortcut() {
  const { breakpointEnabled, setBreakpointSettings } = useWorkflowStore();
  const addNotification = useNotificationStore((state) => state.addNotification);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Ctrl+B (Windows/Linux) or Cmd+B (Mac)
      const isModifierPressed = e.metaKey || e.ctrlKey;
      
      if (isModifierPressed && e.key === 'b') {
        e.preventDefault();
        e.stopPropagation();
        
        const newValue = !breakpointEnabled;
        setBreakpointSettings({ enabled: newValue });
        
        addNotification({
          type: 'info',
          title: 'Breakpoint',
          message: newValue ? 'Breakpoint enabled' : 'Breakpoint disabled',
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [breakpointEnabled, setBreakpointSettings, addNotification]);
}
