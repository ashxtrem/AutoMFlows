---
name: Switch Node Plugin Implementation
overview: Create a switch node plugin that enables conditional branching in workflows. The node will evaluate conditions (UI elements, API status, JSON matching, JavaScript expressions) and execute only the matching branch, skipping others.
todos: []
---

# Switch Node Plugin Implementation

## Overview

Create a new plugin `switch-node` that provides conditional branching functionality. The switch node evaluates conditions and executes only the matching branch, enabling dynamic workflow execution based on runtime conditions.

## Architecture

The implementation requires changes across multiple layers:

1. **Backend**: Condition evaluator utility, switch node handler, executor modifications for conditional branching
2. **Plugin**: Plugin manifest, handler implementation, TypeScript definitions
3. **Frontend**: Config component for managing cases, node rendering with multiple output handles

## Implementation Plan

### 1. Create Plugin Structure

Create new plugin directory: `plugins/switch-node/`

Files to create:

- `plugin.json` - Plugin manifest with switch node definition
- `handler.ts` - Switch node handler implementation
- `config.tsx` - React component for configuring switch cases
- `README.md` - Plugin documentation

### 2. Condition Evaluator Utility

Create `backend/src/utils/conditionEvaluator.ts`:

- Unified condition evaluation system
- Support for multiple condition types:
  - `ui-element`: Check if UI element exists/is visible (reuse browser verification strategies)
  - `api-status`: Check API response status code (reuse API verification strategies)
  - `api-json-path`: Match JSON path value in API response (reuse API body path strategies)
  - `javascript`: Evaluate JavaScript expression
  - `variable`: Compare workflow variable values
- Returns boolean result with details for debugging

### 3. Switch Node Handler

Implement `SwitchHandler` in `plugins/switch-node/handler.ts`:

- Evaluate each case condition in order
- Store selected output handle ID in context (e.g., `context.setData('switchOutput', 'case-1')`)
- If no case matches, use default output handle
- Throw error if no default case configured

### 4. Executor Modifications

Modify `backend/src/engine/executor.ts`:

- After executing a switch node, check which output handle was selected
- Mark nodes as "skipped" if they're not reachable from the selected output handle
- Modify execution loop to skip nodes that are marked as skipped
- Update topological sort logic or add post-execution filtering

Modify `backend/src/engine/parser.ts`:

- Add method `getNodesReachableFromHandle(nodeId: string, sourceHandle: string): string[]`
- Track which nodes are reachable from each output handle
- Update validation to allow multiple control flow outputs from switch nodes

### 5. Frontend Config Component

Create `plugins/switch-node/config.tsx`:

- **This component is used in the properties panel (NodeConfigForm), NOT in the node view**
- UI for managing cases in the properties panel:
  - List of cases (default: 2 cases + default)
  - "Add Case" button to add more cases
  - Each case has:
    - Case name/label (displayed in node view)
    - Condition type dropdown (UI element, API status, JSON match, JavaScript, Variable)
    - Condition-specific fields (selector, API context key, JSON path, JS expression, etc.)
    - Expected value/match type
  - Default case (always present, cannot be removed)
- Store case configuration in node data: `{ cases: [...], defaultCase: {...} }`
- All condition configuration happens here - keeps node view clean

### 6. Frontend Node Rendering

Modify `frontend/src/nodes/CustomNode.tsx`:

- Detect switch node type
- **Node view shows ONLY:**
  - Case labels (simple text labels for each case)
  - Output handles (connection points) for each case
  - Default case label and handle
- Render multiple output handles:
  - One handle per case (e.g., `case-1`, `case-2`)
  - One handle for default (e.g., `default`)
- Position handles vertically on right side
- Label each handle with case name (from node data)
- **No condition configuration UI in node view** - all configuration is in properties panel
- Update edge connection logic to support multiple source handles

### 7. Node Data Structure

Switch node data structure:

```typescript
interface SwitchNodeData {
  cases: Array<{
    id: string;
    label: string;
    condition: {
      type: 'ui-element' | 'api-status' | 'api-json-path' | 'javascript' | 'variable';
      // Condition-specific fields
      selector?: string;
      selectorType?: 'css' | 'xpath';
      elementCheck?: 'visible' | 'hidden' | 'exists';
      apiContextKey?: string;
      statusCode?: number;
      jsonPath?: string;
      expectedValue?: any;
      matchType?: 'equals' | 'contains' | 'greaterThan' | etc.;
      javascriptExpression?: string;
      variableName?: string;
      comparisonOperator?: 'equals' | 'greaterThan' | etc.;
    };
  }>;
  defaultCase: {
    label: string;
  };
}
```

### 8. Edge Handling

Update edge serialization/deserialization in `frontend/src/utils/serialization.ts`:

- Ensure `sourceHandle` is preserved for switch node outputs
- Update validation to allow multiple edges from switch node with different source handles

### 9. Execution Flow

Execution flow diagram:

```
[Previous Node] → [Switch Node] → Evaluates conditions
                                    ↓
                    ┌───────────────┴───────────────┐
                    ↓                               ↓
            [Case 1 Match]                  [Case 2 Match]
                    ↓                               ↓
            [Branch 1 Nodes]                [Branch 2 Nodes]
                    └───────────────┬───────────────┘
                                    ↓
                            [Default Case]
                                    ↓
                            [Default Branch]
```

### 10. Testing Considerations

- Test with UI element conditions (element visible/hidden)
- Test with API status conditions
- Test with JSON path matching
- Test with JavaScript expressions
- Test default case execution
- Test multiple switch nodes in sequence
- Test switch nodes with loops

## Files to Modify

### New Files

- `plugins/switch-node/plugin.json`
- `plugins/switch-node/handler.ts`
- `plugins/switch-node/config.tsx`
- `plugins/switch-node/README.md`
- `backend/src/utils/conditionEvaluator.ts`

### Modified Files

- `backend/src/engine/executor.ts` - Add conditional branching logic
- `backend/src/engine/parser.ts` - Add reachability analysis for switch nodes
- `frontend/src/nodes/CustomNode.tsx` - Render multiple output handles for switch nodes (only labels and handles, no config UI)
- `frontend/src/components/NodeConfigForm.tsx` - Register switch node config component for properties panel
- `frontend/src/utils/serialization.ts` - Ensure sourceHandle preservation
- `frontend/src/utils/validation.ts` - Update validation for switch nodes

## Key Implementation Details

1. **Condition Evaluation**: Reuse existing verification strategies where possible (browser verification, API verification) to maintain consistency
2. **Execution Skipping**: Mark nodes as skipped in context, then filter them during execution loop
3. **Handle IDs**: Use consistent naming: `case-{index}` for cases, `default` for default case
4. **Error Handling**: If condition evaluation fails, fall back to default case (or throw if no default)
5. **UI/UX Separation**:

   - **Node View**: Clean and simple - only shows case labels and output handles (connection points)
   - **Properties Panel**: All condition configuration happens here via the config component
   - This keeps the node view uncluttered and makes configuration manageable

6. **Config Component Integration**: 

   - The config component will be registered via plugin system and used in `NodeConfigForm.tsx` when switch node is selected
   - Plugin loader will automatically register config components from `configComponentPath` in plugin manifest
   - Config component receives `node` and `onChange` props like other node config components

7. **Node View Simplicity**: 

   - Node view displays minimal information: node title, case labels, and output handles
   - Case labels are read-only display (from `cases[].label` and `defaultCase.label`)
   - All editing happens in properties panel via config component