import { X } from 'lucide-react';
import { useSettingsStore } from '../store/settingsStore';
import { useNotificationStore } from '../store/notificationStore';
import { useEffect, useState } from 'react';

interface NotificationSettingsModalProps {
  onClose: () => void;
}

// List of notification types that can be disabled
const NOTIFICATION_TYPES = [
  { id: 'success', label: 'Success Notifications' },
  { id: 'error', label: 'Error Notifications' },
  { id: 'info', label: 'Info Notifications' },
  { id: 'settings', label: 'Settings Notifications' },
] as const;

export default function NotificationSettingsModal({ onClose }: NotificationSettingsModalProps) {
  const notifications = useSettingsStore((state) => state.notifications);
  const toggleNotificationDisabled = useSettingsStore((state) => state.toggleNotificationDisabled);
  const addNotification = useNotificationStore((state) => state.addNotification);
  const [disabledSet, setDisabledSet] = useState(new Set(notifications.disabledNotifications));

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

  const handleToggle = (notificationId: string) => {
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
      details: [`${NOTIFICATION_TYPES.find(t => t.id === notificationId)?.label || notificationId} ${newSet.has(notificationId) ? 'disabled' : 'enabled'}`],
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">Notification Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="overflow-y-auto p-4 flex-1">
          <div className="space-y-3">
            {NOTIFICATION_TYPES.map((type) => {
              const isDisabled = disabledSet.has(type.id);
              return (
                <div key={type.id} className="flex items-center justify-between p-3 bg-gray-700 rounded-md">
                  <span className="text-sm text-white">{type.label}</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!isDisabled}
                      onChange={() => handleToggle(type.id)}
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

        <div className="p-4 border-t border-gray-700">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
