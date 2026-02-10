import { describe, it, expect, beforeEach } from 'vitest';
import {
  saveViewportToStorage,
  loadViewportFromStorage,
  getLastKnownViewport,
  setLastKnownViewport,
  getHasRunInitialFitView,
  setHasRunInitialFitView,
} from '../viewport';

describe('Canvas Viewport', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    setLastKnownViewport(null);
    setHasRunInitialFitView(false);
  });

  describe('saveViewportToStorage', () => {
    it('should save viewport to localStorage', () => {
      const viewport = { x: 100, y: 200, zoom: 1.5 };
      saveViewportToStorage(viewport);
      
      const stored = localStorage.getItem('reactflow-viewport');
      expect(stored).not.toBeNull();
      if (stored) {
        const parsed = JSON.parse(stored);
        expect(parsed).toEqual(viewport);
      }
    });
  });

  describe('loadViewportFromStorage', () => {
    it('should load viewport from localStorage', () => {
      const viewport = { x: 100, y: 200, zoom: 1.5 };
      localStorage.setItem('reactflow-viewport', JSON.stringify(viewport));
      
      const loaded = loadViewportFromStorage();
      expect(loaded).not.toBeNull();
      expect(loaded).toEqual(viewport);
    });

    it('should return null for invalid viewport', () => {
      localStorage.setItem('reactflow-viewport', 'invalid-json');
      const loaded = loadViewportFromStorage();
      expect(loaded).toBeNull();
    });

    it('should return null when no viewport stored', () => {
      const loaded = loadViewportFromStorage();
      expect(loaded).toBeNull();
    });
  });

  describe('getLastKnownViewport / setLastKnownViewport', () => {
    it('should get and set last known viewport', () => {
      const viewport = { x: 100, y: 200, zoom: 1.5 };
      setLastKnownViewport(viewport);
      const retrieved = getLastKnownViewport();
      expect(retrieved).toEqual(viewport);
    });

    it('should return null when not set', () => {
      const retrieved = getLastKnownViewport();
      expect(retrieved).toBeNull();
    });
  });

  describe('getHasRunInitialFitView / setHasRunInitialFitView', () => {
    it('should get and set initial fit view flag', () => {
      expect(getHasRunInitialFitView()).toBe(false);
      setHasRunInitialFitView(true);
      expect(getHasRunInitialFitView()).toBe(true);
      setHasRunInitialFitView(false);
      expect(getHasRunInitialFitView()).toBe(false);
    });
  });
});
