import { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Search,
  Settings,
  LayoutGrid,
  Palette,
  Bell,
  Target,
  FileText,
  HardDrive,
  Keyboard,
  Info,
  ExternalLink,
  Github,
} from 'lucide-react';
import CanvasSettingsSubmenu from './CanvasSettingsSubmenu';
import AppearanceSettingsSubmenu from './AppearanceSettingsSubmenu';
import NotificationSettingsSubmenu from './NotificationSettingsSubmenu';
import MemoryManagementSubmenu from './MemoryManagementSubmenu';
import BreakpointSettings from './BreakpointSettings';
import { useWorkflowStore } from '../store/workflowStore';
import { useSettingsStore } from '../store/settingsStore';
import { useNotificationStore } from '../store/notificationStore';
import { ReportType } from '@automflows/shared';
import { getBackendPort, getBackendBaseUrl } from '../utils/getBackendPort';
import {
  getKeyBindingsByCategory,
  getCategoryName,
  getCategoryOrder,
  formatKeyCombination,
} from '../utils/keyBindings';

const STORAGE_KEY_TRACE_LOGS = 'automflows_trace_logs';
const STORAGE_KEY_REPORTING_ENABLED = 'automflows_reporting_enabled';
const STORAGE_KEY_REPORT_PATH = 'automflows_report_path';
const STORAGE_KEY_REPORT_TYPES = 'automflows_report_types';

type SettingsCategory =
  | 'general'
  | 'canvas'
  | 'appearance'
  | 'notifications'
  | 'breakpoints'
  | 'reports'
  | 'memory'
  | 'keybindings'
  | 'about';

interface CategoryDef {
  id: SettingsCategory;
  label: string;
  icon: React.ComponentType<{ size?: number | string; className?: string }>;
  keywords: string[];
}

const CATEGORIES: CategoryDef[] = [
  {
    id: 'general',
    label: 'General',
    icon: Settings,
    keywords: ['general', 'trace logs', 'trace', 'logs', 'follow mode', 'follow', 'debug', 'logging'],
  },
  {
    id: 'canvas',
    label: 'Canvas',
    icon: LayoutGrid,
    keywords: ['canvas', 'grid', 'arrange', 'nodes', 'snap', 'connection', 'auto-connect', 'lazy', 'fps', 'layout', 'performance'],
  },
  {
    id: 'appearance',
    label: 'Appearance',
    icon: Palette,
    keywords: ['appearance', 'theme', 'font', 'size', 'family', 'contrast', 'dark', 'light'],
  },
  {
    id: 'notifications',
    label: 'Notifications',
    icon: Bell,
    keywords: ['notification', 'audio', 'sound', 'alert'],
  },
  {
    id: 'breakpoints',
    label: 'Breakpoints',
    icon: Target,
    keywords: ['breakpoint', 'debug', 'pause', 'pre', 'post', 'execution'],
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: FileText,
    keywords: ['report', 'html', 'allure', 'json', 'junit', 'csv', 'markdown', 'format', 'retention', 'output'],
  },
  {
    id: 'memory',
    label: 'Memory',
    icon: HardDrive,
    keywords: ['memory', 'storage', 'cache', 'history', 'clear', 'disk'],
  },
  {
    id: 'keybindings',
    label: 'Key Bindings',
    icon: Keyboard,
    keywords: ['key', 'binding', 'shortcut', 'keyboard', 'hotkey'],
  },
  {
    id: 'about',
    label: 'About',
    icon: Info,
    keywords: ['about', 'version', 'system', 'info', 'github', 'node', 'playwright'],
  },
];

interface SystemInfo {
  appVersion: string;
  nodeVersion: string;
  os: string;
  arch: string;
  playwrightVersion: string;
  ramTotal: number;
  ramFree: number;
}

interface SettingsModalProps {
  onClose: () => void;
}

function formatRam(bytes: number): string {
  const gb = bytes / (1024 * 1024 * 1024);
  return `${gb.toFixed(2)} GB`;
}

function getBrowserInfo(): string {
  const ua = navigator.userAgent;
  const edgeMatch = ua.match(/Edg\/(\d+[\d.]*)/);
  if (edgeMatch) return `Edge ${edgeMatch[1]}`;
  const match = ua.match(/(Chrome|Firefox|Safari|Opera)\/(\d+[\d.]*)/);
  if (match) return `${match[1]} ${match[2]}`;
  return 'Unknown';
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="relative inline-flex items-center cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
      />
      <div
        className={`w-14 h-7 rounded-lg transition-colors flex items-center px-1 cursor-pointer ${
          checked ? 'bg-green-600' : 'bg-gray-700'
        }`}
      >
        <div
          className={`w-5 h-5 rounded-md bg-white transition-transform duration-200 ${
            checked ? 'translate-x-7' : 'translate-x-0'
          }`}
        />
      </div>
    </label>
  );
}

function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <span className="text-sm text-white font-medium">{label}</span>
        {description && <p className="text-xs text-gray-400 mt-0.5">{description}</p>}
      </div>
      {children}
    </div>
  );
}

export default function SettingsModal({ onClose }: SettingsModalProps) {
  const [activeCategory, setActiveCategory] = useState<SettingsCategory>('general');
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // General settings
  const { followModeEnabled, setFollowModeEnabled } = useWorkflowStore();
  const addNotification = useNotificationStore((state) => state.addNotification);

  const [traceLogs, setTraceLogs] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY_TRACE_LOGS);
    return saved === null ? true : saved === 'true';
  });

  // Report settings (localStorage-based)
  const reports = useSettingsStore((state) => state.reports);
  const setReportSetting = useSettingsStore((state) => state.setReportSetting);

  const [reportingEnabled, setReportingEnabled] = useState(() => {
    return localStorage.getItem(STORAGE_KEY_REPORTING_ENABLED) === 'true';
  });
  const [reportPath, setReportPath] = useState(() => {
    return localStorage.getItem(STORAGE_KEY_REPORT_PATH) || './output';
  });
  const [reportTypes, setReportTypes] = useState<ReportType[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_REPORT_TYPES);
    return saved ? JSON.parse(saved) : ['html'];
  });

  // About section
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [systemInfoLoading, setSystemInfoLoading] = useState(false);

  // Filter categories based on search
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return CATEGORIES;
    const query = searchQuery.toLowerCase();
    return CATEGORIES.filter(
      (cat) =>
        cat.label.toLowerCase().includes(query) ||
        cat.keywords.some((kw) => kw.includes(query))
    );
  }, [searchQuery]);

  // Auto-select first matching category when search narrows results
  useEffect(() => {
    if (searchQuery.trim() && filteredCategories.length > 0) {
      if (!filteredCategories.find((c) => c.id === activeCategory)) {
        setActiveCategory(filteredCategories[0].id);
      }
    }
  }, [filteredCategories, searchQuery, activeCategory]);

  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Persist trace logs
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_TRACE_LOGS, String(traceLogs));
  }, [traceLogs]);

  // Persist report settings
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_REPORTING_ENABLED, String(reportingEnabled));
  }, [reportingEnabled]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_REPORT_PATH, reportPath);
  }, [reportPath]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_REPORT_TYPES, JSON.stringify(reportTypes));
  }, [reportTypes]);

  // Fetch system info when About tab is selected
  useEffect(() => {
    if (activeCategory === 'about' && !systemInfo && !systemInfoLoading) {
      setSystemInfoLoading(true);
      (async () => {
        try {
          const port = await getBackendPort();
          const response = await fetch(`${getBackendBaseUrl(port)}/api/system-info`);
          if (response.ok) {
            setSystemInfo(await response.json());
          }
        } catch {
          // Backend may be unavailable
        } finally {
          setSystemInfoLoading(false);
        }
      })();
    }
  }, [activeCategory, systemInfo, systemInfoLoading]);

  const handleTraceLogsToggle = async (value: boolean) => {
    setTraceLogs(value);
    addNotification({
      type: 'settings',
      title: 'Settings Applied',
      details: [value ? 'Trace logs enabled' : 'Trace logs disabled'],
    });
    try {
      const port = await getBackendPort();
      await fetch(`${getBackendBaseUrl(port)}/api/workflows/execution/trace-logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: value }),
      });
    } catch {
      // Silently fail if no execution running
    }
  };

  const handleFollowModeToggle = (value: boolean) => {
    setFollowModeEnabled(value);
    // Notification is handled by TopBar's followMode effect
  };

  const toggleReportType = (type: ReportType) => {
    if (reportTypes.includes(type)) {
      if (type === 'html' && reportTypes.length === 1) return;
      setReportTypes(reportTypes.filter((t) => t !== type));
    } else {
      setReportTypes([...reportTypes, type]);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const renderGeneralSection = () => (
    <div className="space-y-1">
      <SettingRow label="Trace Logs" description="Enable detailed execution trace logging">
        <Toggle checked={traceLogs} onChange={handleTraceLogsToggle} />
      </SettingRow>
      <SettingRow label="Follow Mode" description="Auto-scroll canvas to follow executing nodes">
        <Toggle checked={followModeEnabled} onChange={handleFollowModeToggle} />
      </SettingRow>
    </div>
  );

  const renderReportsSection = () => (
    <div className="space-y-4">
      <SettingRow label="Enable Reports" description="Generate reports after workflow execution">
        <Toggle checked={reportingEnabled} onChange={setReportingEnabled} />
      </SettingRow>

      {reportingEnabled && (
        <>
          <div>
            <label className="block text-sm font-medium text-white mb-2">Report Path</label>
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

          <div>
            <label className="block text-sm font-medium text-white mb-2">Report Types</label>
            <div className="space-y-2">
              {(['html', 'allure', 'json', 'junit', 'csv', 'markdown'] as ReportType[]).map(
                (type) => (
                  <label key={type} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={reportTypes.includes(type)}
                      onChange={() => toggleReportType(type)}
                      disabled={
                        type === 'html' &&
                        reportTypes.length === 1 &&
                        reportTypes.includes('html')
                      }
                      className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-white capitalize">
                      {type === 'html' ? 'HTML (Playwright default)' : type.toUpperCase()}
                      {type === 'html' && (
                        <span className="text-gray-400 ml-1">(default)</span>
                      )}
                    </span>
                  </label>
                )
              )}
            </div>
          </div>

          <div className="border-t border-gray-700 pt-4">
            <h3 className="text-sm font-semibold text-white mb-3">Additional Settings</h3>
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Default Report Format
            </label>
            <select
              value={reports.defaultReportFormat}
              onChange={(e) =>
                setReportSetting('defaultReportFormat', e.target.value as ReportType)
              }
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="html">HTML</option>
              <option value="allure">Allure</option>
              <option value="json">JSON</option>
              <option value="junit">JUnit</option>
              <option value="csv">CSV</option>
              <option value="markdown">Markdown</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Report Retention: {reports.reportRetention}
            </label>
            <input
              type="number"
              min="1"
              max="100"
              value={reports.reportRetention}
              onChange={(e) => {
                const val = Math.max(1, Math.min(100, Number(e.target.value)));
                setReportSetting('reportRetention', val);
              }}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="mt-1 text-xs text-gray-400">Keep last N reports (1-100)</p>
          </div>

          <SettingRow
            label="Auto-open Reports"
            description="Automatically open report after execution"
          >
            <Toggle
              checked={reports.autoOpenReports}
              onChange={(v) => setReportSetting('autoOpenReports', v)}
            />
          </SettingRow>
        </>
      )}
    </div>
  );

  const renderKeyBindingsSection = () => {
    const bindingsByCategory = getKeyBindingsByCategory();
    const categoryOrder = getCategoryOrder();

    return (
      <div className="space-y-6">
        {categoryOrder.map((category) => {
          const bindings = bindingsByCategory[category];
          if (bindings.length === 0) return null;

          return (
            <div key={category}>
              <h3 className="text-sm font-semibold text-white mb-3 pb-2 border-b border-gray-700">
                {getCategoryName(category)}
              </h3>
              <div className="space-y-2">
                {bindings.map((binding) => {
                  const keyCombination = formatKeyCombination(binding);
                  const keys = keyCombination.split(' + ');

                  return (
                    <div
                      key={binding.id}
                      className="flex items-start justify-between gap-4 p-3 bg-gray-700/50 rounded-lg"
                    >
                      <p className="text-sm text-white">{binding.description}</p>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {keys.map((key, index) => (
                          <span key={index}>
                            <kbd className="px-2 py-1 text-xs font-semibold text-gray-200 bg-gray-800 border border-gray-600 rounded shadow-sm">
                              {key}
                            </kbd>
                            {index < keys.length - 1 && (
                              <span className="text-gray-500 mx-1">+</span>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

      </div>
    );
  };

  const renderAboutSection = () => {
    const appVersion =
      typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.1.0';

    return (
      <div className="space-y-6">
        {/* Version Info */}
        <div>
          <h3 className="text-sm font-semibold text-white mb-3 pb-2 border-b border-gray-700">
            Version
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between p-3 bg-gray-700/50 rounded-lg">
              <span className="text-sm text-gray-300">AutoMFlows</span>
              <span className="text-sm text-white font-mono">v{appVersion}</span>
            </div>
            {systemInfo && (
              <>
                <div className="flex justify-between p-3 bg-gray-700/50 rounded-lg">
                  <span className="text-sm text-gray-300">Backend</span>
                  <span className="text-sm text-white font-mono">
                    v{systemInfo.appVersion}
                  </span>
                </div>
                <div className="flex justify-between p-3 bg-gray-700/50 rounded-lg">
                  <span className="text-sm text-gray-300">Playwright</span>
                  <span className="text-sm text-white font-mono">
                    v{systemInfo.playwrightVersion}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* System Info */}
        <div>
          <h3 className="text-sm font-semibold text-white mb-3 pb-2 border-b border-gray-700">
            System Info
          </h3>
          {systemInfoLoading ? (
            <div className="text-sm text-gray-400 py-4 text-center">
              Loading system info...
            </div>
          ) : systemInfo ? (
            <div className="space-y-2">
              <div className="flex justify-between p-3 bg-gray-700/50 rounded-lg">
                <span className="text-sm text-gray-300">OS</span>
                <span className="text-sm text-white font-mono">
                  {systemInfo.os} {systemInfo.arch}
                </span>
              </div>
              <div className="flex justify-between p-3 bg-gray-700/50 rounded-lg">
                <span className="text-sm text-gray-300">Node.js</span>
                <span className="text-sm text-white font-mono">
                  {systemInfo.nodeVersion}
                </span>
              </div>
              <div className="flex justify-between p-3 bg-gray-700/50 rounded-lg">
                <span className="text-sm text-gray-300">Browser</span>
                <span className="text-sm text-white font-mono">{getBrowserInfo()}</span>
              </div>
              <div className="flex justify-between p-3 bg-gray-700/50 rounded-lg">
                <span className="text-sm text-gray-300">RAM Total</span>
                <span className="text-sm text-white font-mono">
                  {formatRam(systemInfo.ramTotal)}
                </span>
              </div>
              <div className="flex justify-between p-3 bg-gray-700/50 rounded-lg">
                <span className="text-sm text-gray-300">RAM Free</span>
                <span className="text-sm text-white font-mono">
                  {formatRam(systemInfo.ramFree)}
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex justify-between p-3 bg-gray-700/50 rounded-lg">
                <span className="text-sm text-gray-300">Browser</span>
                <span className="text-sm text-white font-mono">{getBrowserInfo()}</span>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Backend system info unavailable
              </p>
            </div>
          )}
        </div>

        {/* Links */}
        <div>
          <h3 className="text-sm font-semibold text-white mb-3 pb-2 border-b border-gray-700">
            Links
          </h3>
          <div className="space-y-2">
            <a
              href="https://github.com/ashxtrem/AutoMFlows"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-colors"
            >
              <Github size={18} className="text-gray-300" />
              <span className="text-sm text-white">GitHub</span>
              <ExternalLink size={14} className="ml-auto text-gray-400" />
            </a>
          </div>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    switch (activeCategory) {
      case 'general':
        return renderGeneralSection();
      case 'canvas':
        return <CanvasSettingsSubmenu />;
      case 'appearance':
        return <AppearanceSettingsSubmenu />;
      case 'notifications':
        return <NotificationSettingsSubmenu />;
      case 'breakpoints':
        return <BreakpointSettings />;
      case 'reports':
        return renderReportsSection();
      case 'memory':
        return <MemoryManagementSubmenu />;
      case 'keybindings':
        return renderKeyBindingsSection();
      case 'about':
        return renderAboutSection();
      default:
        return null;
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]"
      onClick={handleBackdropClick}
    >
      <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl w-full max-w-4xl mx-4 h-[85vh] flex flex-col overflow-hidden">
        {/* Header with search */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-700">
          <Search size={18} className="text-gray-400 flex-shrink-0" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search settings..."
            className="flex-1 bg-transparent text-white text-sm placeholder-gray-500 focus:outline-none"
          />
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors flex-shrink-0 p-1"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 min-h-0">
          {/* Sidebar */}
          <div className="w-52 border-r border-gray-700 overflow-y-auto py-2 flex-shrink-0">
            {filteredCategories.map((cat) => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                    isActive
                      ? 'bg-blue-600/20 text-blue-400 border-r-2 border-blue-400 font-medium'
                      : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                  }`}
                >
                  <Icon size={16} />
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-white mb-5">
                {CATEGORIES.find((c) => c.id === activeCategory)?.label}
              </h2>
              {renderContent()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
