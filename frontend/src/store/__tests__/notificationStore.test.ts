import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useNotificationStore } from '../notificationStore';

// Mock AudioContext
global.AudioContext = vi.fn().mockImplementation(() => ({
  decodeAudioData: vi.fn().mockResolvedValue({}),
  createBuffer: vi.fn().mockReturnValue({
    getChannelData: vi.fn().mockReturnValue(new Float32Array(100)),
    length: 100,
  }),
  sampleRate: 44100,
})) as any;

global.fetch = vi.fn().mockResolvedValue({
  ok: false,
}) as any;

describe('NotificationStore', () => {
  beforeEach(() => {
    // Reset store state
    useNotificationStore.setState({ notifications: [] });
    Storage.prototype.getItem = vi.fn(() => null);
  });

  it('should add notification', () => {
    useNotificationStore.getState().addNotification({
      type: 'info',
      title: 'Test',
      message: 'Test message',
    });
    expect(useNotificationStore.getState().notifications.length).toBe(1);
  });

  it('should remove notification', () => {
    const id = useNotificationStore.getState().addNotification({
      type: 'info',
      title: 'Test',
      message: 'Test message',
    });
    useNotificationStore.getState().removeNotification(id);
    expect(useNotificationStore.getState().notifications.length).toBe(0);
  });

  it('should clear all notifications', () => {
    useNotificationStore.getState().addNotification({
      type: 'info',
      title: 'Test 1',
      message: 'Message 1',
    });
    useNotificationStore.getState().addNotification({
      type: 'error',
      title: 'Test 2',
      message: 'Message 2',
    });
    useNotificationStore.getState().clearAll();
    expect(useNotificationStore.getState().notifications.length).toBe(0);
  });
});
