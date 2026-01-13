import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { useNotificationStore } from '../store/notificationStore';

interface SettingsDropdownProps {
  traceLogs: boolean;
  onTraceLogsChange: (value: boolean) => void;
  onReportSettingsClick: () => void;
  menuFixed: boolean;
  onMenuFixedChange: (value: boolean) => void;
}

export default function SettingsDropdown({
  traceLogs,
  onTraceLogsChange,
  onReportSettingsClick,
  menuFixed,
  onMenuFixedChange,
}: SettingsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const addNotification = useNotificationStore((state) => state.addNotification);
  
  // Track previous settings to detect changes
  const prevSettingsRef = useRef({
    traceLogs,
    menuFixed,
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
  
  // Track menu fixed changes (handled by parent, but we can show notification here)
  useEffect(() => {
    if (prevSettingsRef.current.menuFixed !== menuFixed) {
      addNotification({
        type: 'settings',
        title: 'Settings Applied',
        details: [menuFixed ? 'Menu fixed' : 'Menu auto-hide enabled'],
      });
      
      prevSettingsRef.current.menuFixed = menuFixed;
    }
  }, [menuFixed, addNotification]);

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
        className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded flex items-center gap-2 text-sm"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1" />
        </svg>
        Settings
        <ChevronDown size={14} className={isOpen ? 'rotate-180' : ''} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50">
          <div className="p-2 space-y-1">
            {/* Trace Logs Toggle */}
            <div className="px-3 py-2 hover:bg-gray-700 rounded">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm text-white">Trace Logs</span>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={traceLogs}
                    onChange={(e) => onTraceLogsChange(e.target.checked)}
                    className="sr-only"
                  />
                  <div
                    className={`block h-6 w-11 rounded-full transition-colors ${
                      traceLogs ? 'bg-green-600' : 'bg-gray-600'
                    }`}
                  />
                  <div
                    className={`dot absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-transform ${
                      traceLogs ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </div>
              </label>
            </div>

            {/* Fixed Menu Toggle */}
            <div className="px-3 py-2 hover:bg-gray-700 rounded">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm text-white">Fixed Menu</span>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={menuFixed}
                    onChange={(e) => onMenuFixedChange(e.target.checked)}
                    className="sr-only"
                  />
                  <div
                    className={`block h-6 w-11 rounded-full transition-colors ${
                      menuFixed ? 'bg-green-600' : 'bg-gray-600'
                    }`}
                  />
                  <div
                    className={`dot absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-transform ${
                      menuFixed ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </div>
              </label>
            </div>

            {/* Report Settings Button */}
            <div className="px-3 py-2 border-t border-gray-700 mt-2 pt-2">
              <button
                onClick={() => {
                  onReportSettingsClick();
                  setIsOpen(false);
                }}
                className="w-full px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
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
