---
name: Enhanced Side Panel with Tabs and Canvas Search
overview: Enhance the LeftSidebar component with tabbed categories (All, Browser, API, Utils), pin search/collapse icons, and add a floating search overlay on canvas double-click that allows adding nodes at the click location.
todos:
  - id: update-left-sidebar-tabs
    content: Add tab navigation (All, Browser, API, Utils) to LeftSidebar component with state management
    status: completed
  - id: pin-sidebar-icons
    content: Pin search and collapse icons to stay visible when scrolling in LeftSidebar
    status: completed
  - id: reorganize-node-categories
    content: Create helper function to categorize nodes into Browser/API/Utils and update filtering logic
    status: completed
    dependencies:
      - update-left-sidebar-tabs
  - id: create-canvas-search-overlay
    content: Create CanvasSearchOverlay component with search input, filtered node list, and click-to-add functionality
    status: completed
  - id: add-double-click-handler
    content: Add onPaneDoubleClick handler in Canvas component to show search overlay at click location
    status: completed
    dependencies:
      - create-canvas-search-overlay
  - id: integrate-node-addition
    content: Connect CanvasSearchOverlay to workflowStore.addNode to place nodes at search location
    status: completed
    dependencies:
      - create-canvas-search-overlay
      - add-double-click-handler
---

# Enhanced Side Panel with Tabs and Canvas Search

## Overview

Transform the left sidebar into a tabbed interface with categorized nodes, pin the search and collapse icons, and add a floating search overlay on canvas double-click for quick node insertion.

## Implementation Plan

### 1. Update LeftSidebar Component Structure

**File: [frontend/src/components/LeftSidebar.tsx](frontend/src/components/LeftSidebar.tsx)**

- Add tab navigation with 4 tabs: "All", "Browser", "API", "Utils"
- Pin search and collapse icons to stay visible when scrolling
- Reorganize node categories into tab-specific groupings
- Update filtering logic to work with tabs

**Node Categorization:**

- **Browser Tab**: OPEN_BROWSER, NAVIGATE, CLICK, TYPE, GET_TEXT, SCREENSHOT, VERIFY (browser domain), and plugin nodes with browser/UI category
- **API Tab**: API_REQUEST, API_CURL, VERIFY (API domain), and plugin nodes with API category
- **Utils Tab**: JAVASCRIPT_CODE, WAIT, LOOP, INT_VALUE, STRING_VALUE, BOOLEAN_VALUE, INPUT_VALUE, LOAD_CONFIG_FILE, SELECT_CONFIG_FILE, VERIFY (other domains), and plugin nodes with utility category
- **All Tab**: Shows all nodes grouped by their original categories

### 2. Create Canvas Search Overlay Component

**New File: [frontend/src/components/CanvasSearchOverlay.tsx](frontend/src/components/CanvasSearchOverlay.tsx)**

- Floating search box component that appears at double-click location
- Search input with node filtering
- Dropdown list of matching nodes
- Click handler to add node at search location
- Auto-focus on input when opened
- Close on outside click or Escape key

### 3. Integrate Double-Click Handler in Canvas

**File: [frontend/src/components/Canvas.tsx](frontend/src/components/Canvas.tsx)**

- Add `onPaneDoubleClick` handler to detect double-clicks on empty canvas
- Calculate click position in flow coordinates
- Show CanvasSearchOverlay at that position
- Handle node addition from overlay

### 4. Update Node Categorization Logic

**File: [frontend/src/components/LeftSidebar.tsx](frontend/src/components/LeftSidebar.tsx)**

- Create helper function to determine node's primary category (Browser/API/Utils)
- Map existing categories to new tab structure
- Handle plugin nodes with category metadata
- Ensure "All" tab shows category sections

## Technical Details

### Tab State Management

- Use `useState` for active tab selection
- Persist tab selection in localStorage (optional)

### Pinned Icons

- Use `sticky` positioning or fixed header section
- Ensure icons remain visible during scroll

### Search Overlay Positioning

- Convert screen coordinates to flow coordinates using `screenToFlowPosition`
- Position overlay absolutely at click location
- Handle edge cases (near viewport boundaries)

### Node Filtering

- Reuse existing `matchesSearch` function
- Filter nodes based on active tab
- Show category sections in "All" tab

## Files to Modify

1. `frontend/src/components/LeftSidebar.tsx` - Add tabs, pin icons, reorganize categories
2. `frontend/src/components/Canvas.tsx` - Add double-click handler
3. `frontend/src/components/CanvasSearchOverlay.tsx` - New component for canvas search

## Files to Reference

- `frontend/src/store/workflowStore.ts` - For `addNode` function
- `frontend/src/plugins/registry.ts` - For plugin node definitions
- `shared/src/types.ts` - For NodeType enum and node data types