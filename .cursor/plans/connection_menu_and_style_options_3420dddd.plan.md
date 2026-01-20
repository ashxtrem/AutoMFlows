---
name: Connection Menu and Style Options
overview: Move hide/unhide connections into a Connection menu submenu and add connection style options (curved/straight/stepped) with instant canvas updates, localStorage persistence, and notifications.
todos: []
---

# Connection Menu and Style Options

## Overview

Reorganize connection visibility controls and add connection style options (curved/straight/stepped edges) to a new Connection menu submenu in the TopBar. All changes should update the canvas instantly, persist to localStorage, and show notifications.

## Implementation Plan

### 1. Update WorkflowStore - Add Connection Style State

**File**: `frontend/src/store/workflowStore.ts`

- Add `connectionStyle: 'curved' | 'straight' | 'stepped'` to `WorkflowState` interface
- Initialize `connectionStyle` from localStorage (default: 'curved' to match current `getBezierPath` behavior)
- Add `setConnectionStyle` function that:
  - Updates the state
  - Saves to localStorage (`automflows_connection_style`)
  - Shows notification via `useNotificationStore`

### 2. Update CustomEdge Component - Support Multiple Path Types

**File**: `frontend/src/components/CustomEdge.tsx`

- Import `getStraightPath` and `getSmoothStepPath` from `reactflow` (in addition to existing `getBezierPath`)
- Read `connectionStyle` from `useWorkflowStore`
- Conditionally call the appropriate path function based on `connectionStyle`:
  - `'curved'` → `getBezierPath` (current implementation)
  - `'straight'` → `getStraightPath`
  - `'stepped'` → `getSmoothStepPath`
- Ensure both visible and invisible click paths use the same path type

### 3. Update TopBar - Add Connection Menu with Submenu

**File**: `frontend/src/components/TopBar.tsx`

- Remove hide/unhide connections button from "View Section" (lines 692-699)
- Add new "Connection" menu item in the main menu (similar to Settings menu structure)
- Create `isConnectionSubmenuOpen` state and `connectionSubmenuRef` ref
- Add Connection submenu that appears to the left of main menu (similar to Settings submenu positioning)
- Connection submenu contains:
  - **Hide/Unhide** button (moved from View section)
  - **Connection Style** section with three radio/button options:
    - Curved
    - Straight  
    - Stepped
  - Show checkmark/indicator next to current style
- Handle click outside logic for Connection submenu (similar to Settings submenu)
- Show notification when connection style changes (similar to trace logs/follow mode notifications)

### 4. Update Canvas - Pass Style to Edges

**File**: `frontend/src/components/Canvas.tsx`

- Ensure `mappedEdges` includes the `type` property set to `'default'` (or ensure CustomEdge receives style via store)
- Verify edges react to `connectionStyle` changes from store (should happen automatically via CustomEdge reading from store)

### 5. Notification Integration

**File**: `frontend/src/components/TopBar.tsx`

- When connection style changes, show notification:
  ```typescript
  addNotification({
    type: 'settings',
    title: 'Settings Applied',
    details: [`Connection style set to ${styleName}`],
  });
  ```

- When hide/unhide toggles, show notification (if not already showing)

## Technical Details

### localStorage Keys

- `automflows_connection_style`: Stores 'curved' | 'straight' | 'stepped'
- `reactflow-edges-hidden`: Already exists for visibility (keep as is)

### Edge Path Functions (ReactFlow)

- `getBezierPath`: Creates curved/bezier paths (current default)
- `getStraightPath`: Creates straight line paths
- `getSmoothStepPath`: Creates stepped/orthogonal paths with rounded corners

### Menu Structure

```
Main Menu
├── File Operations (Save, Load, Reset)
├── View Section
│   └── Report History (keep)
├── Connection Menu (NEW)
│   └── Submenu:
│       ├── Hide/Unhide Connections
│       └── Connection Style:
│           ├── ✓ Curved
│           ├── Straight
│           └── Stepped
└── Settings Menu
    └── Submenu (existing)
```

## Files to Modify

1. `frontend/src/store/workflowStore.ts` - Add connectionStyle state and setter
2. `frontend/src/components/CustomEdge.tsx` - Support multiple path types
3. `frontend/src/components/TopBar.tsx` - Add Connection menu and submenu, move hide/unhide
4. `frontend/src/components/Canvas.tsx` - Verify edge rendering (likely no changes needed)

## Testing Considerations

- Verify all existing connections update style instantly when changed
- Verify new connections use the selected style
- Verify settings persist across page refreshes
- Verify notifications appear on style changes
- Verify hide/unhide still works correctly
- Verify no disconnections occur when changing styles