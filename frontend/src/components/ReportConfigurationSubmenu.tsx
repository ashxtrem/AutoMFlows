import { ChevronLeft } from 'lucide-react';
import { useSettingsStore } from '../store/settingsStore';
import { useNotificationStore } from '../store/notificationStore';
import { ReportType } from '@automflows/shared';

interface ReportConfigurationSubmenuProps {
  onBack: () => void;
}

export default function ReportConfigurationSubmenu({ onBack }: ReportConfigurationSubmenuProps) {
  const reports = useSettingsStore((state) => state.reports);
  const setReportSetting = useSettingsStore((state) => state.setReportSetting);
  const addNotification = useNotificationStore((state) => state.addNotification);

  const handleDefaultFormatChange = (format: ReportType) => {
    setReportSetting('defaultReportFormat', format);
    addNotification({
      type: 'settings',
      title: 'Default Report Format Updated',
      details: [`Default format set to ${format.toUpperCase()}`],
    });
  };

  const handleRetentionChange = (value: number) => {
    const clampedValue = Math.max(1, Math.min(100, value));
    setReportSetting('reportRetention', clampedValue);
    addNotification({
      type: 'settings',
      title: 'Report Retention Updated',
      details: [`Keeping last ${clampedValue} reports`],
    });
  };

  const handleToggle = (key: 'autoOpenReports', value: boolean) => {
    setReportSetting(key, value);
    addNotification({
      type: 'settings',
      title: 'Settings Applied',
      details: [`Auto-open Reports ${value ? 'enabled' : 'disabled'}`],
    });
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
        <h3 className="text-sm font-medium text-white">Report Configuration</h3>
      </div>

      {/* Default Report Format */}
      <div>
        <label className="block text-xs text-gray-400 mb-1">Default Report Format</label>
        <select
          value={reports.defaultReportFormat}
          onChange={(e) => handleDefaultFormatChange(e.target.value as ReportType)}
          className="w-full px-3 py-1.5 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="html">HTML</option>
          <option value="allure">Allure</option>
          <option value="json">JSON</option>
          <option value="junit">JUnit</option>
          <option value="csv">CSV</option>
          <option value="markdown">Markdown</option>
        </select>
      </div>

      {/* Report Retention */}
      <div>
        <label className="block text-xs text-gray-400 mb-1">Report Retention: {reports.reportRetention}</label>
        <input
          type="number"
          min="1"
          max="100"
          value={reports.reportRetention}
          onChange={(e) => handleRetentionChange(Number(e.target.value))}
          className="w-full px-3 py-1.5 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="text-xs text-gray-500 mt-1">Keep last N reports</div>
      </div>

      {/* Auto-open Reports Toggle */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-white font-medium">Auto-open Reports</span>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={reports.autoOpenReports}
            onChange={(e) => handleToggle('autoOpenReports', e.target.checked)}
            className="sr-only"
          />
          <div
            className={`w-14 h-7 rounded-lg transition-colors flex items-center px-1 cursor-pointer ${
              reports.autoOpenReports ? 'bg-green-600' : 'bg-gray-700'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-md bg-white transition-transform duration-200 ${
                reports.autoOpenReports ? 'translate-x-7' : 'translate-x-0'
              }`}
            />
          </div>
        </label>
      </div>

      {/* Report Templates Button (Future Feature) */}
      <button
        disabled
        className="w-full px-3 py-2 text-sm bg-gray-600 text-gray-400 rounded-md cursor-not-allowed"
        title="Coming soon"
      >
        Report Templates (Coming Soon)
      </button>
    </div>
  );
}
