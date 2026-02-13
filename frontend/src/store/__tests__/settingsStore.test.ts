import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useSettingsStore } from '../settingsStore';

describe('SettingsStore', () => {
  beforeEach(() => {
    Storage.prototype.getItem = vi.fn(() => null);
    Storage.prototype.setItem = vi.fn();
  });

  it('should have default canvas settings', () => {
    const canvas = useSettingsStore.getState().canvas;
    expect(canvas).toBeDefined();
    expect(canvas.autoArrangeNodes).toBeDefined();
  });

  it('should update canvas setting', () => {
    useSettingsStore.getState().setCanvasSetting('showGrid', true);
    expect(useSettingsStore.getState().canvas.showGrid).toBe(true);
  });

  it('should have default appearance settings', () => {
    const appearance = useSettingsStore.getState().appearance;
    expect(appearance).toBeDefined();
    expect(appearance.theme).toBeDefined();
  });

  it('should update appearance setting', () => {
    useSettingsStore.getState().setAppearanceSetting('theme', 'dark');
    expect(useSettingsStore.getState().appearance.theme).toBe('dark');
  });

  it('should toggle notification disabled', () => {
    const initialSize = useSettingsStore.getState().notifications.disabledNotifications.size;
    useSettingsStore.getState().toggleNotificationDisabled('test-notification');
    const newSize = useSettingsStore.getState().notifications.disabledNotifications.size;
    expect(newSize).toBe(initialSize + 1);
    
    // Toggle again should remove it
    useSettingsStore.getState().toggleNotificationDisabled('test-notification');
    const finalSize = useSettingsStore.getState().notifications.disabledNotifications.size;
    expect(finalSize).toBe(initialSize);
  });
});
