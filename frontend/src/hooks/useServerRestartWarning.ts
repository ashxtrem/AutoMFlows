import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { getBackendPort } from '../utils/getBackendPort';

let socket: Socket | null = null;
let wasConnected = false;
let setWarningState: ((show: boolean) => void) | null = null;

/**
 * Hook to detect server disconnections and show warning popup
 * Returns state for showing the warning popup
 */
export function useServerRestartWarning() {
  const [showWarning, setShowWarning] = useState(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    setWarningState = setShowWarning;

    const initializeSocket = async () => {
      try {
        const port = await getBackendPort();
        if (!port || !mountedRef.current) return;

        // Initialize socket if not exists
        if (!socket) {
          socket = io(`http://localhost:${port}`, {
            transports: ['websocket'],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            reconnectionAttempts: Infinity,
          });

          socket.on('connect', () => {
            wasConnected = true;
            // Clear any pending warning if we reconnect quickly
            if (reconnectTimeoutRef.current) {
              clearTimeout(reconnectTimeoutRef.current);
              reconnectTimeoutRef.current = null;
            }
            // Clear warning if it was shown
            if (mountedRef.current && setWarningState) {
              setWarningState(false);
            }
          });

          socket.on('disconnect', (_reason) => {
            // Only show warning if we were previously connected
            // This prevents showing warning on initial page load
            if (wasConnected && mountedRef.current) {
              // Clear any existing timeout
              if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
              }

              // Wait a bit to see if reconnection happens quickly
              reconnectTimeoutRef.current = setTimeout(() => {
                if (mountedRef.current && (!socket?.connected) && setWarningState) {
                  setWarningState(true);
                  // Set flag to prevent Vite auto-refresh
                  sessionStorage.setItem('prevent-auto-refresh', 'true');
                }
              }, 2000); // Wait 2 seconds before showing warning
            }
          });
        } else {
          // Socket already exists, just check if we need to show warning
          if (!socket.connected && wasConnected && mountedRef.current) {
            // Clear any existing timeout
            if (reconnectTimeoutRef.current) {
              clearTimeout(reconnectTimeoutRef.current);
            }

            reconnectTimeoutRef.current = setTimeout(() => {
              if (mountedRef.current && (!socket?.connected) && setWarningState) {
                setWarningState(true);
                sessionStorage.setItem('prevent-auto-refresh', 'true');
              }
            }, 2000);
          }
        }
      } catch (error) {
        console.error('Failed to initialize server restart warning:', error);
      }
    };

    initializeSocket();

    return () => {
      mountedRef.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, []); // Empty dependency array - only run once

  const handleProceed = () => {
    setShowWarning(false);
    // Clear the prevent flag
    sessionStorage.removeItem('prevent-auto-refresh');
    // Refresh the page
    window.location.reload();
  };

  const handleCancel = () => {
    setShowWarning(false);
    // Keep the prevent flag so Vite won't auto-refresh
    // User can continue working, but some features might not work until refresh
  };

  return {
    showWarning,
    handleProceed,
    handleCancel,
  };
}
