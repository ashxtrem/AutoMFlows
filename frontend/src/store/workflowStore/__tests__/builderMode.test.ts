import { describe, it, expect, beforeEach, vi } from 'vitest';
import { create } from 'zustand';
import { createBuilderModeSlice, BuilderModeSlice } from '../builderMode';
import { getInitialState } from '../core';
import { RecordedAction } from '@automflows/shared';

type TestStore = ReturnType<typeof getInitialState> & BuilderModeSlice;

describe('WorkflowStore Builder Mode Slice', () => {
  let store: ReturnType<typeof create<TestStore>>;

  beforeEach(() => {
    Storage.prototype.setItem = vi.fn();
    Storage.prototype.getItem = vi.fn();
    
    store = create<TestStore>((set, get) => ({
      ...createBuilderModeSlice(set, get),
      ...getInitialState(),
    }));
  });

  it('should set builder mode active', () => {
    store.getState().setBuilderModeActive(true);
    expect(store.getState().builderModeActive).toBe(true);
  });

  it('should set builder mode actions', () => {
    const actions: RecordedAction[] = [{ id: 'a1', type: 'click', selector: '.btn' }] as any;
    store.getState().setBuilderModeActions(actions);
    expect(store.getState().builderModeActions).toEqual(actions);
  });

  it('should add builder mode action', () => {
    const action: RecordedAction = { id: 'a1', type: 'click', selector: '.btn' } as any;
    const initialState = store.getState().builderModeActions.length;
    store.getState().addBuilderModeAction(action);
    expect(store.getState().builderModeActions.length).toBe(initialState + 1);
  });

  it('should remove builder mode action', () => {
    const action: RecordedAction = { id: 'a1', type: 'click', selector: '.btn' } as any;
    store.getState().addBuilderModeAction(action);
    store.getState().removeBuilderModeAction('a1');
    expect(store.getState().builderModeActions.length).toBe(0);
  });

  it('should reset builder mode actions', () => {
    const action: RecordedAction = { id: 'a1', type: 'click', selector: '.btn' } as any;
    store.getState().addBuilderModeAction(action);
    store.getState().resetBuilderModeActions();
    expect(store.getState().builderModeActions.length).toBe(0);
  });
});
