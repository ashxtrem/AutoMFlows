import { create } from 'zustand';
import { ReportType } from '@automflows/shared';

// Helper function to load from localStorage with default
function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const saved = localStorage.getItem(key);
    if (saved === null) return defaultValue;
    if (typeof defaultValue === 'boolean') {
      return (saved === 'true') as T;
    }
    if (typeof defaultValue === 'number') {
      return Number(saved) as T;
    }
    if (typeof defaultValue === 'object') {
      return JSON.parse(saved) as T;
    }
    return saved as T;
  } catch (error) {
    console.warn(`Failed to load setting ${key}:`, error);
    return defaultValue;
  }
}

// Helper function to save to localStorage
function saveToStorage<T>(key: string, value: T): void {
  try {
    if (typeof value === 'boolean' || typeof value === 'number') {
      localStorage.setItem(key, String(value));
    } else if (typeof value === 'object') {
      localStorage.setItem(key, JSON.stringify(value));
    } else {
      localStorage.setItem(key, value as string);
    }
  } catch (error) {
    console.warn(`Failed to save setting ${key}:`, error);
  }
}

interface CanvasSettings {
  autoArrangeNodes: 'none' | 'vertical' | 'horizontal';
  nodesPerRowColumn: number;
  gridSize: number;
  showGrid: boolean;
  snapToGrid: boolean;
  connectionStyle: 'curved' | 'straight' | 'stepped';
  autoConnect: boolean;
  lazyLoading: boolean;
}

interface AppearanceSettings {
  theme: 'light' | 'dark' | 'auto';
  fontSize: number;
  fontFamily: string;
  highContrast: boolean;
}

interface NotificationSettings {
  audioNotifications: boolean;
  disabledNotifications: Set<string>;
}

interface ReportSettings {
  defaultReportFormat: ReportType;
  reportRetention: number;
  autoOpenReports: boolean;
}

interface SettingsState {
  // Canvas settings
  canvas: CanvasSettings;
  setCanvasSetting: <K extends keyof CanvasSettings>(
    key: K,
    value: CanvasSettings[K]
  ) => void;

  // Appearance settings
  appearance: AppearanceSettings;
  setAppearanceSetting: <K extends keyof AppearanceSettings>(
    key: K,
    value: AppearanceSettings[K]
  ) => void;

  // Notification settings
  notifications: NotificationSettings;
  setNotificationSetting: <K extends keyof NotificationSettings>(
    key: K,
    value: NotificationSettings[K]
  ) => void;
  toggleNotificationDisabled: (notificationId: string) => void;

  // Report settings
  reports: ReportSettings;
  setReportSetting: <K extends keyof ReportSettings>(
    key: K,
    value: ReportSettings[K]
  ) => void;

  // Tour settings
  tourCompleted: boolean;
  showTour: boolean;
  startTour: () => void;
  completeTour: () => void;
  resetTour: () => void;
}

const defaultCanvasSettings: CanvasSettings = {
  autoArrangeNodes: 'none',
  nodesPerRowColumn: 10,
  gridSize: 16,
  showGrid: true,
  snapToGrid: false,
  connectionStyle: 'curved',
  autoConnect: false,
  lazyLoading: false,
};

const defaultAppearanceSettings: AppearanceSettings = {
  theme: 'dark',
  fontSize: 14,
  fontFamily: 'Inter',
  highContrast: false,
};

const defaultNotificationSettings: NotificationSettings = {
  audioNotifications: true,
  disabledNotifications: new Set<string>(),
};

const defaultReportSettings: ReportSettings = {
  defaultReportFormat: 'html',
  reportRetention: 10,
  autoOpenReports: false,
};

export const useSettingsStore = create<SettingsState>((set, get) => {
  // Initialize canvas settings from localStorage
  const canvas: CanvasSettings = {
    autoArrangeNodes: loadFromStorage(
      'automflows_settings_canvas_autoArrangeNodes',
      defaultCanvasSettings.autoArrangeNodes
    ),
    nodesPerRowColumn: loadFromStorage(
      'automflows_settings_canvas_nodesPerRowColumn',
      defaultCanvasSettings.nodesPerRowColumn
    ),
    gridSize: loadFromStorage(
      'automflows_settings_canvas_gridSize',
      defaultCanvasSettings.gridSize
    ),
    showGrid: loadFromStorage(
      'automflows_settings_canvas_showGrid',
      defaultCanvasSettings.showGrid
    ),
    snapToGrid: loadFromStorage(
      'automflows_settings_canvas_snapToGrid',
      defaultCanvasSettings.snapToGrid
    ),
    connectionStyle: loadFromStorage(
      'automflows_settings_canvas_connectionStyle',
      defaultCanvasSettings.connectionStyle
    ),
    autoConnect: loadFromStorage(
      'automflows_settings_canvas_autoConnect',
      defaultCanvasSettings.autoConnect
    ),
    lazyLoading: loadFromStorage(
      'automflows_settings_canvas_lazyLoading',
      defaultCanvasSettings.lazyLoading
    ),
  };

  // Initialize appearance settings from localStorage
  const appearance: AppearanceSettings = {
    theme: loadFromStorage(
      'automflows_settings_appearance_theme',
      defaultAppearanceSettings.theme
    ),
    fontSize: loadFromStorage(
      'automflows_settings_appearance_fontSize',
      defaultAppearanceSettings.fontSize
    ),
    fontFamily: loadFromStorage(
      'automflows_settings_appearance_fontFamily',
      defaultAppearanceSettings.fontFamily
    ),
    highContrast: loadFromStorage(
      'automflows_settings_appearance_highContrast',
      defaultAppearanceSettings.highContrast
    ),
  };

  // Initialize notification settings from localStorage
  const disabledNotificationsStr = loadFromStorage<string>(
    'automflows_settings_notifications_disabledNotifications',
    '[]'
  );
  let disabledNotifications: Set<string>;
  try {
    const parsed = JSON.parse(disabledNotificationsStr);
    disabledNotifications = new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    disabledNotifications = new Set<string>();
  }

  const notifications: NotificationSettings = {
    audioNotifications: loadFromStorage(
      'automflows_settings_notifications_audioNotifications',
      defaultNotificationSettings.audioNotifications
    ),
    disabledNotifications,
  };

  // Initialize report settings from localStorage
  const reports: ReportSettings = {
    defaultReportFormat: loadFromStorage(
      'automflows_settings_reports_defaultFormat',
      defaultReportSettings.defaultReportFormat
    ),
    reportRetention: loadFromStorage(
      'automflows_settings_reports_retention',
      defaultReportSettings.reportRetention
    ),
    autoOpenReports: loadFromStorage(
      'automflows_settings_reports_autoOpen',
      defaultReportSettings.autoOpenReports
    ),
  };

  // Initialize tour settings from localStorage
  const tourCompleted = loadFromStorage(
    'automflows_tour_completed',
    false
  );
  const showTour = loadFromStorage(
    'automflows_tour_show',
    false
  );

  return {
    canvas,
    appearance,
    notifications,
    reports,
    tourCompleted,
    showTour,

    setCanvasSetting: (key, value) => {
      const keyMap: Record<keyof CanvasSettings, string> = {
        autoArrangeNodes: 'automflows_settings_canvas_autoArrangeNodes',
        nodesPerRowColumn: 'automflows_settings_canvas_nodesPerRowColumn',
        gridSize: 'automflows_settings_canvas_gridSize',
        showGrid: 'automflows_settings_canvas_showGrid',
        snapToGrid: 'automflows_settings_canvas_snapToGrid',
        connectionStyle: 'automflows_settings_canvas_connectionStyle',
        autoConnect: 'automflows_settings_canvas_autoConnect',
        lazyLoading: 'automflows_settings_canvas_lazyLoading',
      };
      saveToStorage(keyMap[key], value);
      set((state) => ({
        canvas: { ...state.canvas, [key]: value },
      }));
    },

    setAppearanceSetting: (key, value) => {
      const keyMap: Record<keyof AppearanceSettings, string> = {
        theme: 'automflows_settings_appearance_theme',
        fontSize: 'automflows_settings_appearance_fontSize',
        fontFamily: 'automflows_settings_appearance_fontFamily',
        highContrast: 'automflows_settings_appearance_highContrast',
      };
      saveToStorage(keyMap[key], value);
      set((state) => ({
        appearance: { ...state.appearance, [key]: value },
      }));
    },

    setNotificationSetting: (key, value) => {
      const keyMap: Record<keyof NotificationSettings, string> = {
        audioNotifications: 'automflows_settings_notifications_audioNotifications',
        disabledNotifications: 'automflows_settings_notifications_disabledNotifications',
      };
      if (key === 'disabledNotifications') {
        const arrayValue = Array.from(value as Set<string>);
        saveToStorage(keyMap[key], JSON.stringify(arrayValue));
      } else {
        saveToStorage(keyMap[key], value);
      }
      set((state) => ({
        notifications: { ...state.notifications, [key]: value },
      }));
    },

    toggleNotificationDisabled: (notificationId: string) => {
      const state = get();
      const newSet = new Set(state.notifications.disabledNotifications);
      if (newSet.has(notificationId)) {
        newSet.delete(notificationId);
      } else {
        newSet.add(notificationId);
      }
      get().setNotificationSetting('disabledNotifications', newSet);
    },

    setReportSetting: (key, value) => {
      const keyMap: Record<keyof ReportSettings, string> = {
        defaultReportFormat: 'automflows_settings_reports_defaultFormat',
        reportRetention: 'automflows_settings_reports_retention',
        autoOpenReports: 'automflows_settings_reports_autoOpen',
      };
      saveToStorage(keyMap[key], value);
      set((state) => ({
        reports: { ...state.reports, [key]: value },
      }));
    },

    startTour: () => {
      saveToStorage('automflows_tour_show', true);
      set({ showTour: true });
    },

    completeTour: () => {
      saveToStorage('automflows_tour_completed', true);
      saveToStorage('automflows_tour_show', false);
      set({ tourCompleted: true, showTour: false });
    },

    resetTour: () => {
      saveToStorage('automflows_tour_completed', false);
      saveToStorage('automflows_tour_show', true);
      set({ tourCompleted: false, showTour: true });
    },
  };
});
