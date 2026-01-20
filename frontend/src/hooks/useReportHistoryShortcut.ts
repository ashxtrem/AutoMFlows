import { useEffect } from 'react';

export function useReportHistoryShortcut() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Ctrl+H (Windows/Linux) or Cmd+H (Mac)
      const isModifierPressed = e.metaKey || e.ctrlKey;
      
      if (isModifierPressed && e.key.toLowerCase() === 'h') {
        e.preventDefault();
        e.stopPropagation();
        
        // Open report history in new tab using current origin
        const reportHistoryUrl = `${window.location.origin}/reports/history`;
        window.open(reportHistoryUrl, '_blank');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);
}
