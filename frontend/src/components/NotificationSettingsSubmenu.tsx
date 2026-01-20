import { useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { useSettingsStore } from '../store/settingsStore';
import { useNotificationStore } from '../store/notificationStore';
import NotificationSettingsModal from './NotificationSettingsModal';

interface NotificationSettingsSubmenuProps {
  onBack: () => void;
}

export default function NotificationSettingsSubmenu({ onBack }: NotificationSettingsSubmenuProps) {
  const notifications = useSettingsStore((state) => state.notifications);
  const setNotificationSetting = useSettingsStore((state) => state.setNotificationSetting);
  const addNotification = useNotificationStore((state) => state.addNotification);
  const [showModal, setShowModal] = useState(false);

  const handleAudioNotificationsToggle = (value: boolean) => {
    setNotificationSetting('audioNotifications', value);
    addNotification({
      type: 'settings',
      title: 'Settings Applied',
      details: [`Audio notifications ${value ? 'enabled' : 'disabled'}`],
    });
  };

  return (
    <>
      <div className="p-3 space-y-3">
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

        {/* Notification Settings Button */}
        <button
          onClick={() => setShowModal(true)}
          className="w-full px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
        >
          Notification Settings
        </button>

        {/* Audio Notifications Toggle */}
        <div className="flex items-center justify-between">
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
      </div>

      {showModal && (
        <NotificationSettingsModal onClose={() => setShowModal(false)} />
      )}
    </>
  );
}
