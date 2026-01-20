---
name: Canvas Node Search Feature
overview: Implement a search overlay that appears when Ctrl+F is pressed while the canvas is focused. The overlay will search through node names, properties, and values, highlight matching nodes, and allow navigation through matches with Enter.
todos:
  - id: create-search-overlay
    content: Create NodeSearchOverlay component with input field, search button, match count display, keyboard handlers (Enter, Escape), positioned in top-left corner with high z-index
    status: pending
  - id: add-keyboard-shortcut
    content: Add Ctrl+F (Cmd+F on Mac) keyboard shortcut handler in Canvas.tsx that opens search overlay when canvas is focused (allow opening even when other UI elements are open)
    status: pending
  - id: implement-search-logic
    content: Implement searchNodes function that searches through node names, types, and all properties/values recursively. Make search manual (only executes on button click or Enter key press), not automatic on workflow changes
    status: pending
  - id: add-node-highlighting
    content: Add searchHighlighted property to nodes and update CustomNode to visually highlight matching nodes
    status: pending
    dependencies:
      - implement-search-logic
  - id: implement-navigation
    content: Implement Enter key handler to navigate to matching nodes sequentially using fitView
    status: pending
    dependencies:
      - create-search-overlay
      - implement-search-logic
  - id: handle-cleanup
    content: Clear search state, remove highlighting, and reset match index when overlay closes. Only close on Escape or close button (not on outside clicks). Keep overlay visible when sidebars/popups/workflow execution occurs
    status: pending
    dependencies:
      - add-node-highlighting
---

# Canvas Node Search Feature

## Overview

Add a search overlay that appears in the top-right corner when Ctrl+F (Cmd+F on Mac) is pressed while the canvas is focused. The overlay will search through all nodes by name, properties, and values, highlight matching nodes with a visual indicator, and allow sequential navigation through matches. The search overlay persists even when other UI elements (sidebars, popups, etc.) are opened.

## Implementation Details

### 1. Create NodeSearchOverlay Component

**File**: `frontend/src/components/NodeSearchOverlay.tsx`

- Create a new component similar to `CanvasSearchOverlay` but for searching existing nodes
- Position: Top-right corner (absolute positioning, fixed to canvas container)
- Features:
- Search input field (auto-focused when opened)
- Minimum 3 characters required before searching
- Search button to explicitly trigger search (user clicks to search)
- Display match count (e.g., "3 matches" or "Match 1 of 3")
- Close button (X) and Escape key support (ONLY ways to close - no outside click closing)
- Enter key to navigate to next match
- Arrow keys for navigation (optional enhancement)
- High z-index to stay above other UI elements (sidebars, popups, etc.)

### 2. Add Search State Management

**File**: `frontend/src/components/Canvas.tsx`

- Add state for search overlay visibility: `const [nodeSearchOverlay, setNodeSearchOverlay] = useState<boolean>(false)`
- Add state for search query: `const [searchQuery, setSearchQuery] = useState<string>('')`
- Add state for matching node IDs: `const [matchingNodeIds, setMatchingNodeIds] = useState<string[]>([])`
- Add state for current match index: `const [currentMatchIndex, setCurrentMatchIndex] = useState<number>(0)`
- Add state to track if search has been executed: `const [searchExecuted, setSearchExecuted] = useState<boolean>(false)`
- **Important**: Search state persists even when:
- User clicks on nodes (RightSidebar opens)
- User interacts with LeftSidebar
- NodeErrorPopup opens
- Settings open
- Workflow execution starts
- Any other UI element opens

### 3. Implement Keyboard Shortcut Handler

**File**: `frontend/src/components/Canvas.tsx`

- Add `useEffect` hook to listen for Ctrl+F (Cmd+F on Mac) keypress
- Check if canvas is focused (check if `reactFlowWrapper.current` contains the active element or if no input/textarea is focused)
- **Important**: Allow opening search even when other UI elements are open (don't block on popups/sidebars)
- If search overlay is already open, focus the input instead of closing
- Prevent default browser find behavior
- Open search overlay and focus input

### 4. Implement Search Logic

**File**: `frontend/src/components/Canvas.tsx` or create `frontend/src/utils/nodeSearch.ts`

- Create function `searchNodes(query: string, nodes: Node[]): string[]` that:
- Returns array of matching node IDs
- Searches through:
- Node type (e.g., "navigation", "api_request")
- Node label (`data.label`)
- All string properties in `data` object (recursively search nested objects)
- All numeric values converted to strings
- Case-insensitive matching
- Only searches if query length >= 3
- **Important**: Search is NOT automatic - only executes when:
- User clicks the search button
- User presses Enter in search input (if query >= 3 chars)
- **Do NOT** auto-search when:
- Workflow nodes change
- User types in search input
- Any other state changes

### 5. Implement Node Highlighting

**File**: `frontend/src/components/Canvas.tsx`

- Modify `mappedNodes` to add `data.searchHighlighted: boolean` property based on `matchingNodeIds`
- **Important**: Only update highlighting when search is explicitly executed (not on every node change)
- Preserve highlighting even when nodes are updated (unless search is cleared)

**File**: `frontend/src/nodes/CustomNode.tsx`

- Add visual highlighting for nodes with `data.searchHighlighted === true`
- Use a distinct color (e.g., yellow/orange border or glow) different from existing states (selected, failed, executing, paused)
- Style should be visible but not override error/execution states
- Highlighting should persist even when node is selected or other UI elements open

### 6. Implement Navigation to Matches

**File**: `frontend/src/components/Canvas.tsx`

- When Enter is pressed in search overlay (after search has been executed):
- Navigate to node at `currentMatchIndex` in `matchingNodeIds`
- Use `fitView({ nodes: [{ id: nodeId }], padding: 0.2, duration: 300 })`
- Increment `currentMatchIndex` (wrap around to 0 when reaching end)
- Optionally select the node visually
- **Important**: Keep search overlay open after navigation
- **Important**: If user clicks on a node after navigation, keep search overlay visible

### 7. Handle Search Overlay Positioning

**File**: `frontend/src/components/NodeSearchOverlay.tsx`

- Position absolutely in **top-right corner**
- Use fixed positioning relative to canvas container
- High z-index (e.g., z-50 or higher) to stay above other UI elements
- Ensure it doesn't overlap with ReactFlow controls
- Responsive positioning if viewport is small
- **Important**: Overlay should remain visible even when:
- RightSidebar opens (position relative to canvas, not sidebar)
- LeftSidebar opens
- NodeErrorPopup opens
- Any other overlay/modal opens

### 8. Clean Up on Close

**File**: `frontend/src/components/Canvas.tsx`

- **Only close when**:
- User presses Escape key
- User clicks the close (X) button
- **Do NOT close when**:
- User clicks outside the overlay
- User clicks on a node
- User opens sidebars/popups
- User executes workflow
- Any other interaction
- On close:
- Clear search query
- Clear matching node IDs
- Remove highlighting from all nodes
- Reset current match index
- Reset search executed state

## Files to Modify

1. **frontend/src/components/Canvas.tsx**

- Add search overlay state and keyboard handler
- Implement search logic and node highlighting
- Add navigation to matches

2. **frontend/src/components/NodeSearchOverlay.tsx** (new file)

- Create search overlay component
- Handle input, display match count
- Handle Enter/Escape keys

3. **frontend/src/nodes/CustomNode.tsx**

- Add visual styling for search-highlighted nodes

4. **frontend/src/utils/nodeSearch.ts** (optional new file)

- Extract search logic into utility function for reusability

## Key Considerations

- Search should be performant even with many nodes
- Highlighting should not interfere with existing node states (error, executing, paused)
- Keyboard shortcuts should not conflict with existing shortcuts
- **Search overlay ONLY closes on Escape or close button** (not on outside clicks)
- Focus management: input should be focused when overlay opens
- Minimum 3 characters requirement should be enforced
- Navigation should cycle through matches (wrap around)
- Search overlay persists across all UI interactions (sidebars, popups, workflow execution)
- Search is manual (user clicks search button or presses Enter) - not automatic
- Search results persist until user explicitly searches again or closes overlay
- Overlay should have high z-index to stay visible above other elements

## Additional Use Cases to Handle

1. **Multiple searches**: User can modify search query and search again without closing overlay
2. **Search while workflow running**: Search overlay remains visible during execution
3. **Search with properties panel open**: Overlay stays visible when RightSidebar is open
4. **Search with error popup**: Overlay stays visible when NodeErrorPopup is shown
5. **Keyboard navigation**: Arrow keys (up/down) to navigate through matches (optional enhancement)
6. **Clear search**: Button to clear search query and remove highlighting without closing overlay
7. **Search persistence**: If user closes overlay and reopens with Ctrl+F, restore last search query (optional)
8. **Case sensitivity toggle**: Optional toggle for case-sensitive search (future enhancement)
9. **Search in specific fields**: Optional dropdown to search only in names, properties, or values (future enhancement)
10. **Search history**: Remember recent searches (optional enhancement)

## Visual Design

- Search overlay: Dark theme matching existing UI (gray-800 background, gray-700 border)
- Position: Top-right corner, fixed to canvas container
- Highlight color: Yellow/orange border or glow (e.g., `#fbbf24` or `#f59e0b`)
- Match count display: Show "X matches" or "Match X of Y" (e.g., "3 matches" or "Match 1 of 3")
- Input field: Similar styling to existing search inputs in the app (see LeftSidebar.tsx for reference)
- Search button: Icon button (Search icon) next to input field to trigger search
- Close button: X icon in top-right of overlay
- Z-index: High enough (z-50 or higher) to stay above sidebars (z-30) and other UI elements