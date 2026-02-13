import { useState, useRef, useEffect } from 'react';
import { Settings } from 'lucide-react';
import { useNotificationStore } from '../store/notificationStore';

interface SettingsDropdownProps {
  traceLogs: boolean;
  onTraceLogsChange: (value: boolean) => void;
  onReportSettingsClick: () => void;
}

export default function SettingsDropdown({
  traceLogs,
  onTraceLogsChange,
  onReportSettingsClick,
}: SettingsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const addNotification = useNotificationStore((state) => state.addNotification);
  
  // Track previous settings to detect changes
  const prevSettingsRef = useRef({
    traceLogs,
  });

  // Track trace logs changes
  useEffect(() => {
    if (prevSettingsRef.current.traceLogs !== traceLogs) {
      addNotification({
        type: 'settings',
        title: 'Settings Applied',
        details: [traceLogs ? 'Trace logs enabled' : 'Trace logs disabled'],
      });
      
      prevSettingsRef.current.traceLogs = traceLogs;
    }
  }, [traceLogs, addNotification]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      // Close dropdown if clicking outside the dropdown element
      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        setIsOpen(false);
      }
    };

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      // Use capture phase (true) to catch events before they're stopped by React Flow
      // This ensures clicks on canvas/react-flow elements are caught
      // Also listen to both mouse and touch events for better mobile support
      document.addEventListener('mousedown', handleClickOutside, true);
      document.addEventListener('click', handleClickOutside, true);
      document.addEventListener('touchstart', handleClickOutside, true);
      document.addEventListener('keydown', handleEscapeKey);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
      document.removeEventListener('click', handleClickOutside, true);
      document.removeEventListener('touchstart', handleClickOutside, true);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-2 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded flex items-center justify-center"
        title="Settings"
      >
        <Settings size={18} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50">
          <div className="p-3 space-y-3">
            {/* Trace Logs Toggle */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-white font-medium">Trace Logs</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={traceLogs}
                  onChange={(e) => onTraceLogsChange(e.target.checked)}
                  className="sr-only"
                />
                <div
                  className={`w-14 h-7 rounded-lg transition-colors flex items-center px-1 ${
                    traceLogs ? 'bg-green-600' : 'bg-gray-700'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-md bg-white transition-transform ${
                      traceLogs ? 'translate-x-7' : 'translate-x-0'
                    }`}
                  />
                </div>
              </label>
            </div>

            {/* Report Settings Button */}
            <div className="border-t border-gray-700 pt-3 mt-2">
              <button
                onClick={() => {
                  onReportSettingsClick();
                  setIsOpen(false);
                }}
                className="w-full px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
              >
                Report Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
