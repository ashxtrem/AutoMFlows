# Commit Messages for Uncommitted Changes

## Commit 1: Add comprehensive settings store with persistent storage
**Files:**
- `frontend/src/store/settingsStore.ts` (new)

**Message:**
```
feat: add centralized settings store with persistent storage

- Implement Zustand store for managing application settings
- Add canvas settings (auto-arrange, grid, connection style, etc.)
- Add appearance settings (theme, font size, font family, high contrast)
- Add notification settings (audio notifications, disabled notifications)
- Add report settings (default format, retention, auto-open)
- Persist all settings to localStorage with type-safe helpers
- Support Set data structures for disabled notifications
```

---

## Commit 2: Implement theme system with light/dark/auto modes
**Files:**
- `frontend/src/utils/theme.ts` (new)
- `frontend/src/index.css` (modified)

**Message:**
```
feat: implement theme system with light/dark/auto and high contrast modes

- Add theme utility functions for theme management
- Support light, dark, and auto (system preference) themes
- Implement high contrast mode for accessibility
- Add CSS variables for theme colors
- Auto-detect system theme preference in auto mode
- Apply theme transitions smoothly across the application
- Override Tailwind classes with theme variables
```

---

## Commit 3: Add settings submenu components
**Files:**
- `frontend/src/components/CanvasSettingsSubmenu.tsx` (new)
- `frontend/src/components/AppearanceSettingsSubmenu.tsx` (new)
- `frontend/src/components/NotificationSettingsSubmenu.tsx` (new)
- `frontend/src/components/MemoryManagementSubmenu.tsx` (new)
- `frontend/src/components/ReportConfigurationSubmenu.tsx` (new)

**Message:**
```
feat: add settings submenu components for organized settings UI

- Create CanvasSettingsSubmenu for canvas-related settings
- Create AppearanceSettingsSubmenu for theme and appearance options
- Create NotificationSettingsSubmenu for notification preferences
- Create MemoryManagementSubmenu for memory management options
- Create ReportConfigurationSubmenu for report settings
- Integrate with settings store for persistent configuration
- Add navigation between main settings and submenus
```

---

## Commit 4: Add key bindings modal and utilities
**Files:**
- `frontend/src/components/KeyBindingsModal.tsx` (new)
- `frontend/src/utils/keyBindings.ts` (new)

**Message:**
```
feat: add key bindings modal and keyboard shortcut utilities

- Create KeyBindingsModal component to display available shortcuts
- Add keyBindings utility for managing keyboard shortcuts
- Support platform-specific key display (Cmd vs Ctrl)
- Show keyboard shortcuts in organized categories
- Integrate with settings for customizable key bindings
```

---

## Commit 5: Enhance report settings with additional configuration
**Files:**
- `frontend/src/components/ReportSettingsPopup.tsx` (modified)
- `frontend/src/components/ReportConfigurationSubmenu.tsx` (new)

**Message:**
```
feat: enhance report settings with additional configuration options

- Add default report format selection
- Add report retention settings (keep last N reports)
- Add auto-open reports toggle
- Integrate report settings with centralized settings store
- Move change detection to useEffect for automatic notifications
- Improve report settings UI with additional options section
```

---

## Commit 6: Refactor TopBar with new settings submenu system
**Files:**
- `frontend/src/components/TopBar.tsx` (modified)

**Message:**
```
refactor: reorganize TopBar settings with submenu navigation

- Replace single settings menu with hierarchical submenu system
- Add navigation between main settings and category submenus
- Integrate new settings submenu components
- Add key bindings modal trigger
- Improve settings menu organization and UX
- Maintain existing trace logs and follow mode toggles
```

---

## Commit 7: Integrate theme system into App component
**Files:**
- `frontend/src/App.tsx` (modified)

**Message:**
```
feat: integrate theme system and appearance settings into App

- Apply theme from settings store on mount and changes
- Support dynamic font size and font family changes
- Apply high contrast mode when enabled
- Initialize theme system with auto-detection support
- Add report history keyboard shortcut hook
- Ensure theme persists across component re-renders
```

---

## Commit 8: Add notification settings modal and audio notifications
**Files:**
- `frontend/src/components/NotificationSettingsModal.tsx` (new)
- `frontend/src/utils/audioNotifications.ts` (new)
- `frontend/src/store/notificationStore.ts` (modified)
- `frontend/src/components/NotificationContainer.tsx` (modified)
- `frontend/src/components/NotificationNudge.tsx` (modified)

**Message:**
```
feat: add notification settings modal and audio notification support

- Create NotificationSettingsModal for notification preferences
- Add audio notification utility with sound playback
- Support disabling specific notification types
- Integrate audio notifications with notification store
- Update notification components to respect settings
- Add notification nudge improvements
```

---

## Commit 9: Add utility functions for storage and node arrangement
**Files:**
- `frontend/src/utils/storage.ts` (new)
- `frontend/src/utils/nodeArrangement.ts` (new)

**Message:**
```
feat: add utility functions for storage and node arrangement

- Create storage utility for localStorage operations
- Add node arrangement utility for canvas node positioning
- Support various arrangement algorithms (vertical, horizontal)
- Provide type-safe storage helpers
```

---

## Commit 10: Enhance canvas and edge components
**Files:**
- `frontend/src/components/Canvas.tsx` (modified)
- `frontend/src/components/CustomEdge.tsx` (modified)
- `frontend/src/nodes/CustomNode.tsx` (modified)

**Message:**
```
feat: enhance canvas and edge components with settings integration

- Integrate canvas settings (grid, snap, connection style)
- Apply connection style from settings (curved/straight/stepped)
- Improve edge rendering based on settings
- Update node styling for theme support
- Add grid visibility and snap-to-grid functionality
```

---

## Commit 11: Add report history shortcut hook
**Files:**
- `frontend/src/hooks/useReportHistoryShortcut.ts` (new)
- `frontend/src/hooks/useExecution.ts` (modified)
- `frontend/src/hooks/useShortcutNavigation.ts` (modified)

**Message:**
```
feat: add report history keyboard shortcut and enhance hooks

- Create useReportHistoryShortcut hook (Ctrl+H / Cmd+H)
- Enhance execution hook with additional features
- Improve shortcut navigation hook
- Add keyboard shortcut for quick report history access
```

---

## Commit 12: Update workflow store and execution hooks
**Files:**
- `frontend/src/store/workflowStore.ts` (modified)
- `frontend/src/hooks/useExecution.ts` (modified)

**Message:**
```
refactor: update workflow store and execution hooks

- Enhance workflow store with additional state management
- Improve execution hook functionality
- Add support for new workflow features
- Update state management patterns
```

---

## Commit 13: Update keyboard config component
**Files:**
- `frontend/src/components/nodeConfigs/KeyboardConfig.tsx` (modified)

**Message:**
```
chore: update keyboard config component

- Minor updates to keyboard configuration component
```

---

## Commit 14: Add demo workflow test file
**Files:**
- `tests/workflows/demo/allnodeusage.json` (new)

**Message:**
```
test: add demo workflow test file for all node usage

- Add comprehensive workflow test file demonstrating all node types
```

---

## Commit 15: Clean up plan files
**Files:**
- `.cursor/plans/consolidated_nodes_with_action_dropdowns.plan.md` (deleted)
- `.cursor/plans/enhanced_side_panel_with_tabs_and_canvas_search_9f503bb4.plan.md` (deleted)
- `.cursor/plans/breakpoint_headless_warning_9ecc24df.plan.md` (new)
- `.cursor/plans/canvas_node_search_feature_b4cda436.plan.md` (new)
- `.cursor/plans/connection_menu_and_style_options_3420dddd.plan.md` (new)

**Message:**
```
chore: update plan documentation files

- Remove outdated plan files
- Add new plan files for recent features
- Update development planning documentation
```

---

## Summary

The changes can be organized into 15 logical commits:
1. Settings store foundation
2. Theme system
3. Settings submenu components
4. Key bindings
5. Report settings enhancements
6. TopBar refactoring
7. App component integration
8. Notification improvements
9. Utility functions
10. Canvas enhancements
11. Report history shortcut
12. Workflow store updates
13. Keyboard config update
14. Test file addition
15. Plan files cleanup
