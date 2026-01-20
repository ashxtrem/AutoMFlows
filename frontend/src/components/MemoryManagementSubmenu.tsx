import { useState, useEffect } from 'react';
import { ChevronLeft } from 'lucide-react';
import { useWorkflowStore } from '../store/workflowStore';
import { useNotificationStore } from '../store/notificationStore';
import { getStorageUsage, formatBytes, clearWorkflowCache } from '../utils/storage';

interface MemoryManagementSubmenuProps {
  onBack: () => void;
}

export default function MemoryManagementSubmenu({ onBack }: MemoryManagementSubmenuProps) {
  const clearHistory = useWorkflowStore((state) => state.clearHistory);
  const addNotification = useNotificationStore((state) => state.addNotification);
  const [storageUsage, setStorageUsage] = useState(getStorageUsage());

  useEffect(() => {
    // Update storage usage periodically
    const interval = setInterval(() => {
      setStorageUsage(getStorageUsage());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleClearCache = () => {
    if (window.confirm('Are you sure you want to clear all cached workflows? This cannot be undone.')) {
      try {
        clearWorkflowCache();
        setStorageUsage(getStorageUsage());
        addNotification({
          type: 'info',
          title: 'Cache Cleared',
          message: 'All cached workflows have been cleared',
        });
      } catch (error) {
        addNotification({
          type: 'error',
          title: 'Clear Cache Failed',
          message: 'Failed to clear cache: ' + (error as Error).message,
        });
      }
    }
  };

  const handleClearHistory = () => {
    if (window.confirm('Are you sure you want to clear undo/redo history? This cannot be undone.')) {
      clearHistory();
      addNotification({
        type: 'info',
        title: 'History Cleared',
        message: 'Undo/redo history has been cleared',
      });
    }
  };

  return (
    <div className="p-3 space-y-3">
      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={onBack}
          className="text-gray-400 hover:text-white transition-colors p-1"
          aria-label="Back to settings"
        >
          <ChevronLeft size={16} />
        </button>
        <h3 className="text-sm font-medium text-white">Memory Management</h3>
      </div>

      {/* Storage Usage */}
      <div className="p-3 bg-gray-700 rounded-md">
        <div className="text-xs text-gray-400 mb-1">Storage Usage</div>
        <div className="text-sm text-white font-medium mb-2">
          {formatBytes(storageUsage.used)} / {formatBytes(storageUsage.total)}
        </div>
        <div className="w-full bg-gray-600 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${Math.min(storageUsage.percentage, 100)}%` }}
          />
        </div>
        <div className="text-xs text-gray-500 mt-1">
          {storageUsage.percentage.toFixed(1)}% used
        </div>
      </div>

      {/* Clear Cache Button */}
      <button
        onClick={handleClearCache}
        className="w-full px-3 py-2 text-sm bg-orange-600 hover:bg-orange-700 text-white rounded-md transition-colors"
      >
        Clear Cache
      </button>

      {/* Clear History Button */}
      <button
        onClick={handleClearHistory}
        className="w-full px-3 py-2 text-sm bg-orange-600 hover:bg-orange-700 text-white rounded-md transition-colors"
      >
        Clear History
      </button>
    </div>
  );
}
