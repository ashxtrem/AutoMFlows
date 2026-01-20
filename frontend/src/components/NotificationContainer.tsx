import { useNotificationStore } from '../store/notificationStore';
import { useSettingsStore } from '../store/settingsStore';
import NotificationNudge from './NotificationNudge';

export default function NotificationContainer() {
  const notifications = useNotificationStore((state) => state.notifications);
  const disabledNotifications = useSettingsStore((state) => state.notifications.disabledNotifications);

  // Filter out disabled notification types
  const filteredNotifications = notifications.filter((notification) => {
    return !disabledNotifications.has(notification.type);
  });

  // Show max 5 notifications, most recent first
  const visibleNotifications = filteredNotifications.slice(-5).reverse();

  if (visibleNotifications.length === 0) {
    return null;
  }

  return (
    <div
      className="fixed right-4 z-50 pointer-events-none"
      style={{ top: '20px' }} // Top positioning since TopBar is now a FAB menu
    >
      <div className="flex flex-col items-end gap-0 pointer-events-auto">
        {visibleNotifications.map((notification) => (
          <NotificationNudge key={notification.id} notification={notification} />
        ))}
      </div>
    </div>
  );
}
