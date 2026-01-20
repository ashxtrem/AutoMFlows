import { create } from 'zustand';
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

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],

  addNotification: (notification) => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/9e444106-9553-445b-b71d-eeb363325ed2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'notificationStore.ts:39',message:'addNotification called',data:{title:notification.title,type:notification.type,stackTrace:new Error().stack?.split('\n').slice(0,5).join('|')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
    // #endregion
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
