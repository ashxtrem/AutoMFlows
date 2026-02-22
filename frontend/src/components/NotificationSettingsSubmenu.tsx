import { useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { useSettingsStore } from '../store/settingsStore';
import { useNotificationStore } from '../store/notificationStore';

const NOTIFICATION_TYPES = [
  { id: 'success', label: 'Success Notifications' },
  { id: 'error', label: 'Error Notifications' },
  { id: 'info', label: 'Info Notifications' },
  { id: 'settings', label: 'Settings Notifications' },
] as const;

interface NotificationSettingsSubmenuProps {
  onBack?: () => void;
}

export default function NotificationSettingsSubmenu({ onBack }: NotificationSettingsSubmenuProps) {
  const notifications = useSettingsStore((state) => state.notifications);
  const setNotificationSetting = useSettingsStore((state) => state.setNotificationSetting);
  const toggleNotificationDisabled = useSettingsStore((state) => state.toggleNotificationDisabled);
  const addNotification = useNotificationStore((state) => state.addNotification);
  const [disabledSet, setDisabledSet] = useState(new Set(notifications.disabledNotifications));

  const handleAudioNotificationsToggle = (value: boolean) => {
    setNotificationSetting('audioNotifications', value);
    addNotification({
      type: 'settings',
      title: 'Settings Applied',
      details: [`Audio notifications ${value ? 'enabled' : 'disabled'}`],
    });
  };

  const handleTypeToggle = (notificationId: string) => {
    const newSet = new Set(disabledSet);
    if (newSet.has(notificationId)) {
      newSet.delete(notificationId);
    } else {
      newSet.add(notificationId);
    }
    setDisabledSet(newSet);
    toggleNotificationDisabled(notificationId);

    addNotification({
      type: 'settings',
      title: 'Notification Settings Updated',
      details: [
        `${NOTIFICATION_TYPES.find((t) => t.id === notificationId)?.label || notificationId} ${newSet.has(notificationId) ? 'disabled' : 'enabled'}`,
      ],
    });
  };

  return (
    <div className={onBack ? 'p-3 space-y-3' : 'space-y-3'}>
      {onBack && (
        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={onBack}
            className="text-gray-400 hover:text-white transition-colors p-1"
            aria-label="Back to settings"
          >
            <ChevronLeft size={16} />
          </button>
          <h3 className="text-sm font-medium text-white">Notifications</h3>
        </div>
      )}

      {/* Audio Notifications Toggle */}
      <div className="flex items-center justify-between py-1">
        <span className="text-sm text-white font-medium">Audio Notifications</span>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={notifications.audioNotifications}
            onChange={(e) => handleAudioNotificationsToggle(e.target.checked)}
            className="sr-only"
          />
          <div
            className={`w-14 h-7 rounded-lg transition-colors flex items-center px-1 cursor-pointer ${
              notifications.audioNotifications ? 'bg-green-600' : 'bg-gray-700'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-md bg-white transition-transform duration-200 ${
                notifications.audioNotifications ? 'translate-x-7' : 'translate-x-0'
              }`}
            />
          </div>
        </label>
      </div>

      {/* Notification Type Toggles */}
      <div className="border-t border-gray-700 pt-3 mt-2">
        <label className="block text-xs text-gray-400 mb-2">Notification Types</label>
        <div className="space-y-2">
          {NOTIFICATION_TYPES.map((type) => {
            const isDisabled = disabledSet.has(type.id);
            return (
              <div
                key={type.id}
                className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg"
              >
                <span className="text-sm text-white">{type.label}</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!isDisabled}
                    onChange={() => handleTypeToggle(type.id)}
                    className="sr-only"
                  />
                  <div
                    className={`w-14 h-7 rounded-lg transition-colors flex items-center px-1 cursor-pointer ${
                      !isDisabled ? 'bg-green-600' : 'bg-gray-600'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-md bg-white transition-transform duration-200 ${
                        !isDisabled ? 'translate-x-7' : 'translate-x-0'
                      }`}
                    />
                  </div>
                </label>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
