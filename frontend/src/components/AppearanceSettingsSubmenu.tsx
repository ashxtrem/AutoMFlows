import { ChevronLeft } from 'lucide-react';
import { useSettingsStore } from '../store/settingsStore';
import { useNotificationStore } from '../store/notificationStore';
import { applyTheme, initTheme } from '../utils/theme';
import { useEffect } from 'react';

interface AppearanceSettingsSubmenuProps {
  onBack: () => void;
}

export default function AppearanceSettingsSubmenu({ onBack }: AppearanceSettingsSubmenuProps) {
  const appearance = useSettingsStore((state) => state.appearance);
  const setAppearanceSetting = useSettingsStore((state) => state.setAppearanceSetting);
  const addNotification = useNotificationStore((state) => state.addNotification);

  // Initialize theme system
  useEffect(() => {
    const cleanup = initTheme(appearance.theme, () => {
      // Theme changed
    });
    return cleanup;
  }, [appearance.theme]);

  const handleThemeChange = (theme: 'light' | 'dark' | 'auto') => {
    setAppearanceSetting('theme', theme);
    applyTheme(theme);
    addNotification({
      type: 'settings',
      title: 'Theme Updated',
      details: [`Theme set to ${theme}`],
    });
  };

  const handleFontSizeChange = (value: number) => {
    const clampedValue = Math.max(10, Math.min(24, value));
    setAppearanceSetting('fontSize', clampedValue);
    document.documentElement.style.fontSize = `${clampedValue}px`;
    addNotification({
      type: 'settings',
      title: 'Font Size Updated',
      details: [`Font size set to ${clampedValue}px`],
    });
  };

  const handleFontFamilyChange = (fontFamily: string) => {
    setAppearanceSetting('fontFamily', fontFamily);
    document.documentElement.style.fontFamily = fontFamily;
    addNotification({
      type: 'settings',
      title: 'Font Family Updated',
      details: [`Font family set to ${fontFamily}`],
    });
  };

  const handleHighContrastToggle = (value: boolean) => {
    setAppearanceSetting('highContrast', value);
    document.documentElement.classList.toggle('high-contrast', value);
    addNotification({
      type: 'settings',
      title: 'Settings Applied',
      details: [`High contrast mode ${value ? 'enabled' : 'disabled'}`],
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
        <h3 className="text-sm font-medium text-white">Appearance</h3>
      </div>

      {/* Theme */}
      <div>
        <label className="block text-xs text-gray-400 mb-1">Theme</label>
        <select
          value={appearance.theme}
          onChange={(e) => handleThemeChange(e.target.value as 'light' | 'dark' | 'auto')}
          className="w-full px-3 py-1.5 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="light">Light</option>
          <option value="dark">Dark</option>
          <option value="auto">Auto (Follow System)</option>
        </select>
      </div>

      {/* Font Size */}
      <div>
        <label className="block text-xs text-gray-400 mb-1">Font Size: {appearance.fontSize}px</label>
        <input
          type="range"
          min="10"
          max="24"
          value={appearance.fontSize}
          onChange={(e) => handleFontSizeChange(Number(e.target.value))}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>10px</span>
          <span>24px</span>
        </div>
      </div>

      {/* Font Family */}
      <div>
        <label className="block text-xs text-gray-400 mb-1">Font Family</label>
        <select
          value={appearance.fontFamily}
          onChange={(e) => handleFontFamilyChange(e.target.value)}
          className="w-full px-3 py-1.5 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="Inter">Inter</option>
          <option value="system-ui">System UI</option>
          <option value="Arial">Arial</option>
          <option value="Helvetica">Helvetica</option>
          <option value="Times New Roman">Times New Roman</option>
          <option value="Courier New">Courier New</option>
          <option value="Monaco">Monaco</option>
        </select>
      </div>

      {/* High Contrast Mode Toggle */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-white font-medium">High Contrast Mode</span>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={appearance.highContrast}
            onChange={(e) => handleHighContrastToggle(e.target.checked)}
            className="sr-only"
          />
          <div
            className={`w-14 h-7 rounded-lg transition-colors flex items-center px-1 cursor-pointer ${
              appearance.highContrast ? 'bg-green-600' : 'bg-gray-700'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-md bg-white transition-transform duration-200 ${
                appearance.highContrast ? 'translate-x-7' : 'translate-x-0'
              }`}
            />
          </div>
        </label>
      </div>
    </div>
  );
}
