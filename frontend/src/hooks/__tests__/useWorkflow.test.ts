import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useWorkflowAutoSave, useWorkflowLoad } from '../useWorkflow';
import { useWorkflowStore } from '../../store/workflowStore';
import * as serialization from '../../utils/serialization';

vi.mock('../../store/workflowStore');
vi.mock('../../utils/serialization');

describe('useWorkflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('useWorkflowAutoSave', () => {
    it('should auto-save workflow after delay', () => {
      const mockSaveToLocalStorage = vi.spyOn(serialization, 'saveToLocalStorage');
      (useWorkflowStore as any).mockReturnValue({
        nodes: [{ id: 'n1' }],
        edges: [],
        groups: [],
      });

      renderHook(() => useWorkflowAutoSave());

      vi.advanceTimersByTime(1000);

      expect(mockSaveToLocalStorage).toHaveBeenCalled();
    });
  });

  describe('useWorkflowLoad', () => {
    it('should load workflow from localStorage', () => {
      const mockSetNodes = vi.fn();
      const mockSetEdges = vi.fn();
      const mockSetGroups = vi.fn();
      const mockSaveToHistory = vi.fn();
      const mockClearAllNodeErrors = vi.fn();

      (useWorkflowStore as any).mockReturnValue({
        setNodes: mockSetNodes,
        setEdges: mockSetEdges,
        setGroups: mockSetGroups,
        saveToHistory: mockSaveToHistory,
        clearAllNodeErrors: mockClearAllNodeErrors,
        setFitViewRequested: vi.fn(),
      });

      const mockWorkflow = {
        nodes: [{ id: 'n1' }],
        edges: [],
        groups: [],
      };
      vi.spyOn(serialization, 'loadFromLocalStorage').mockReturnValue(mockWorkflow as any);

      renderHook(() => useWorkflowLoad());

      expect(mockSetNodes).toHaveBeenCalledWith(mockWorkflow.nodes);
      expect(mockSetEdges).toHaveBeenCalledWith(mockWorkflow.edges);
    });
  });
});
