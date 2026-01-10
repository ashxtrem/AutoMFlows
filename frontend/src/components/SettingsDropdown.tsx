import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

const STORAGE_KEY_TRACE_LOGS = 'automflows_trace_logs';
const STORAGE_KEY_SCREENSHOT_ON_NODE = 'automflows_screenshot_on_node';
const STORAGE_KEY_SCREENSHOT_TIMING = 'automflows_screenshot_timing';

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
  const [screenshotOnNode, setScreenshotOnNode] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY_SCREENSHOT_ON_NODE);
    return saved === 'true';
  });
  const [screenshotTiming, setScreenshotTiming] = useState<'pre' | 'post' | 'both'>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_SCREENSHOT_TIMING);
    return (saved as 'pre' | 'post' | 'both') || 'post';
  });
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_SCREENSHOT_ON_NODE, String(screenshotOnNode));
  }, [screenshotOnNode]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_SCREENSHOT_TIMING, screenshotTiming);
  }, [screenshotTiming]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
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

            {/* Screenshot on Each Node Toggle */}
            <div className="px-3 py-2 hover:bg-gray-700 rounded">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm text-white">Screenshot on Each Node</span>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={screenshotOnNode}
                    onChange={(e) => setScreenshotOnNode(e.target.checked)}
                    className="sr-only"
                  />
                  <div
                    className={`block h-6 w-11 rounded-full transition-colors ${
                      screenshotOnNode ? 'bg-green-600' : 'bg-gray-600'
                    }`}
                  />
                  <div
                    className={`dot absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-transform ${
                      screenshotOnNode ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </div>
              </label>
            </div>

            {/* Screenshot Timing Options */}
            {screenshotOnNode && (
              <div className="px-3 py-2 space-y-2 border-t border-gray-700 mt-2 pt-2">
                <div className="text-xs text-gray-400 mb-1">Screenshot Timing:</div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="screenshotTiming"
                    value="pre"
                    checked={screenshotTiming === 'pre'}
                    onChange={() => setScreenshotTiming('pre')}
                    className="text-blue-600"
                  />
                  <span className="text-sm text-white">Pre</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="screenshotTiming"
                    value="post"
                    checked={screenshotTiming === 'post'}
                    onChange={() => setScreenshotTiming('post')}
                    className="text-blue-600"
                  />
                  <span className="text-sm text-white">Post</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="screenshotTiming"
                    value="both"
                    checked={screenshotTiming === 'both'}
                    onChange={() => setScreenshotTiming('both')}
                    className="text-blue-600"
                  />
                  <span className="text-sm text-white">Both</span>
                </label>
              </div>
            )}

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
