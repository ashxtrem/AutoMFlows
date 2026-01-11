import { useEffect, useState, useRef } from 'react';
import { X, CheckCircle, XCircle, Info, Settings } from 'lucide-react';
import { Notification, useNotificationStore } from '../store/notificationStore';

interface NotificationNudgeProps {
  notification: Notification;
}

export default function NotificationNudge({ notification }: NotificationNudgeProps) {
  const removeNotification = useNotificationStore((state) => state.removeNotification);
  const [progress, setProgress] = useState(100);
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    // Trigger slide-in animation
    setIsVisible(true);

    // Calculate progress update interval (update every 50ms for smooth animation)
    const updateInterval = 50;
    const totalDuration = notification.duration || 3000; // Default to 3 seconds if not provided

    // Start progress bar animation
    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const remaining = Math.max(0, 100 - (elapsed / totalDuration) * 100);
      setProgress(remaining);

      if (remaining <= 0) {
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
        }
      }
    }, updateInterval);

    // Set auto-dismiss timeout
    timeoutRef.current = setTimeout(() => {
      handleDismiss();
    }, totalDuration);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [notification.duration]);

  const handleDismiss = () => {
    setIsVisible(false);
    // Wait for slide-out animation before removing
    setTimeout(() => {
      removeNotification(notification.id);
    }, 300);
  };

  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return <CheckCircle className="w-5 h-5" />;
      case 'error':
        return <XCircle className="w-5 h-5" />;
      case 'info':
        return <Info className="w-5 h-5" />;
      case 'settings':
        return <Settings className="w-5 h-5" />;
      default:
        return <Info className="w-5 h-5" />;
    }
  };

  const getColors = () => {
    switch (notification.type) {
      case 'success':
        return {
          bg: 'bg-green-600',
          border: 'border-green-500',
          icon: 'text-green-100',
          progress: 'bg-green-400',
        };
      case 'error':
        return {
          bg: 'bg-red-600',
          border: 'border-red-500',
          icon: 'text-red-100',
          progress: 'bg-red-400',
        };
      case 'info':
        return {
          bg: 'bg-blue-600',
          border: 'border-blue-500',
          icon: 'text-blue-100',
          progress: 'bg-blue-400',
        };
      case 'settings':
        return {
          bg: 'bg-yellow-600',
          border: 'border-yellow-500',
          icon: 'text-yellow-100',
          progress: 'bg-yellow-400',
        };
      default:
        return {
          bg: 'bg-gray-600',
          border: 'border-gray-500',
          icon: 'text-gray-100',
          progress: 'bg-gray-400',
        };
    }
  };

  const colors = getColors();

  return (
    <div
      className={`
        ${colors.bg} ${colors.border} border-l-4 rounded-lg shadow-lg mb-3 min-w-[320px] max-w-[400px]
        transition-all duration-300 ease-in-out
        ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
      `}
      style={{ zIndex: 50 }}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className={`${colors.icon} flex-shrink-0 mt-0.5`}>
            {getIcon()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-white mb-1">
                  {notification.title}
                </h4>
                {notification.message && (
                  <p className="text-sm text-white/90 mb-2">
                    {notification.message}
                  </p>
                )}
                {notification.details && notification.details.length > 0 && (
                  <ul className="text-xs text-white/80 space-y-1 mb-2">
                    {notification.details.map((detail, index) => (
                      <li key={index} className="flex items-center gap-1">
                        <span className="w-1 h-1 rounded-full bg-white/60"></span>
                        {detail}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <button
                onClick={handleDismiss}
                className="flex-shrink-0 text-white/70 hover:text-white transition-colors p-1 -mt-1 -mr-1"
                aria-label="Dismiss notification"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {/* Progress bar */}
            <div className="mt-2 h-1 bg-white/20 rounded-full overflow-hidden">
              <div
                className={`h-full ${colors.progress} transition-all ease-linear`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
