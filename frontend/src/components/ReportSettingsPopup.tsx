import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { ReportType } from '@automflows/shared';

const STORAGE_KEY_REPORTING_ENABLED = 'automflows_reporting_enabled';
const STORAGE_KEY_REPORT_PATH = 'automflows_report_path';
const STORAGE_KEY_REPORT_TYPES = 'automflows_report_types';

interface ReportSettingsPopupProps {
  onClose: () => void;
}

export default function ReportSettingsPopup({ onClose }: ReportSettingsPopupProps) {
  const [reportingEnabled, setReportingEnabled] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY_REPORTING_ENABLED);
    return saved === 'true';
  });
  const [reportPath, setReportPath] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY_REPORT_PATH);
    return saved || './output';
  });
  const [reportTypes, setReportTypes] = useState<ReportType[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_REPORT_TYPES);
    return saved ? JSON.parse(saved) : ['html'];
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_REPORTING_ENABLED, String(reportingEnabled));
  }, [reportingEnabled]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_REPORT_PATH, reportPath);
  }, [reportPath]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_REPORT_TYPES, JSON.stringify(reportTypes));
  }, [reportTypes]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const toggleReportType = (type: ReportType) => {
    if (reportTypes.includes(type)) {
      // Don't allow unchecking HTML if it's the only one
      if (type === 'html' && reportTypes.length === 1) {
        return;
      }
      setReportTypes(reportTypes.filter(t => t !== type));
    } else {
      setReportTypes([...reportTypes, type]);
    }
  };

  const handleSave = () => {
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">Report Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="overflow-y-auto p-4 flex-1">
          <div className="space-y-4">
            {/* Enable Reports Toggle */}
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-white">Enable Reports</label>
              <div className="relative cursor-pointer" onClick={() => {
                setReportingEnabled(!reportingEnabled);
              }}>
                <input
                  type="checkbox"
                  checked={reportingEnabled}
                  onChange={(e) => setReportingEnabled(e.target.checked)}
                  className="sr-only"
                />
                <div
                  className={`block h-6 w-11 rounded-full transition-colors ${
                    reportingEnabled ? 'bg-green-600' : 'bg-gray-600'
                  }`}
                />
                <div
                  className={`dot absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-transform ${
                    reportingEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </div>
            </div>

            {reportingEnabled && (
              <>
                {/* Report Path Input */}
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Report Path (optional)
                  </label>
                  <input
                    type="text"
                    value={reportPath}
                    onChange={(e) => setReportPath(e.target.value)}
                    placeholder="./output"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="mt-1 text-xs text-gray-400">
                    Default: ./output (relative to project root)
                  </p>
                </div>

                {/* Report Types Multi-Select */}
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Report Types
                  </label>
                  <div className="space-y-2">
                    {(['html', 'allure', 'json', 'junit', 'csv', 'markdown'] as ReportType[]).map((type) => (
                      <label
                        key={type}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={reportTypes.includes(type)}
                          onChange={() => toggleReportType(type)}
                          disabled={type === 'html' && reportTypes.length === 1 && reportTypes.includes('html')}
                          className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-white capitalize">
                          {type === 'html' ? 'HTML (Playwright default)' : type.toUpperCase()}
                          {type === 'html' && <span className="text-gray-400 ml-1">(default)</span>}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-gray-700 flex gap-2">
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
          >
            Save
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
