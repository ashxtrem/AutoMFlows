import { createWithEqualityFn } from 'zustand/traditional';
import { playNotificationSound } from '../utils/audioNotifications';

export type NotificationType = 'success' | 'error' | 'info' | 'settings';

export interface NotificationAction {
  label: string;
  onClick: () => void;
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  details?: string[];
  duration?: number; // Auto-dismiss duration in milliseconds (optional, defaults based on type)
  action?: NotificationAction;
}

interface NotificationState {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id'>) => string;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

// Default durations based on type
const getDefaultDuration = (type: NotificationType): number => {
  switch (type) {
    case 'success':
    case 'info':
      return 3000; // 3 seconds
    case 'error':
      return 5000; // 5 seconds
    case 'settings':
      return 4000; // 4 seconds
    default:
      return 3000;
  }
};

export const useNotificationStore = createWithEqualityFn<NotificationState>((set) => ({
  notifications: [],

  addNotification: (notification) => {
    const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newNotification: Notification = {
      ...notification,
      id,
      duration: notification.duration || getDefaultDuration(notification.type),
    };

    set((state) => ({
      notifications: [...state.notifications, newNotification],
    }));

    // Play audio notification if enabled
    try {
      const audioNotifications = localStorage.getItem('automflows_settings_notifications_audioNotifications');
      if (audioNotifications !== 'false') { // Default to true
        playNotificationSound().catch(() => {
          // Silently fail if audio can't play
        });
      }
    } catch (error) {
      // Silently fail if localStorage not available
    }

    return id;
  },

  removeNotification: (id) => {
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    }));
  },

  clearAll: () => {
    set({ notifications: [] });
  },
}));
