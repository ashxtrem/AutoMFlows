---
name: Reusable Node Plugin Implementation
overview: "Create a reusable node plugin system that enables defining reusable flows and executing them on-demand. The plugin includes three node types: Reusable (defines a reusable flow), End (marks end of reusable), and Run Reusable (executes a reusable flow by context name)."
todos:
  - id: create-plugin-structure
    content: Create plugin directory structure with plugin.json manifest defining Reusable, End, and Run Reusable node types
    status: completed
  - id: create-flow-extractor
    content: Create reusableFlowExtractor.ts utility to extract reusable sub-workflows and find reusable nodes by context name
    status: completed
  - id: implement-handlers
    content: Implement ReusableHandler (no-op), EndHandler (no-op), and RunReusableHandler (executes reusable flow) in handler.ts
    status: completed
  - id: modify-parser
    content: Modify WorkflowParser to identify reusable scopes and filter them from main execution order
    status: completed
  - id: modify-executor
    content: Modify Executor to skip Reusable/End nodes and nodes in reusable scopes during main workflow execution
    status: completed
  - id: create-config-components
    content: Create React config components for Reusable (context name input) and Run Reusable (context name selector) nodes
    status: completed
  - id: update-node-rendering
    content: Update CustomNode.tsx to render reusable node types with appropriate visual indicators
    status: completed
  - id: add-validation
    content: Add validation for unique context names, required End nodes, and valid Run Reusable references
    status: completed
---

# Reusable Node Plugin Implementation

## Overview

Create a plugin system that enables users to define reusable flows and execute them on-demand without redrawing nodes. The plugin provides three node types:

- **Reusable**: Defines a reusable flow with a context name
- **End**: Marks the end of a reusable flow (used within reusable flows)
- **Run Reusable**: Executes a reusable flow by matching its context name

## Architecture

The implementation requires:

1. **Plugin Structure**: New plugin `reusable-node` with three node types
2. **Workflow Analysis**: Utility to extract reusable flow sub-graphs
3. **Execution Engine Modifications**: Skip Reusable/End nodes in main flow, execute reusable sub-flows when Run Reusable is called
4. **Frontend Components**: Config components for Reusable and Run Reusable nodes

## Implementation Plan

### 1. Create Plugin Structure

Create new plugin directory: `plugins/reusable-node/`

Files to create:

- `plugin.json` - Plugin manifest with three node definitions
- `handler.ts` - Handler implementations for all three node types
- `config.tsx` - React config components for Reusable and Run Reusable nodes
- `README.md` - Plugin documentation

### 2. Reusable Flow Extractor Utility

Create `backend/src/utils/reusableFlowExtractor.ts`:

- `extractReusableFlow(workflow: Workflow, reusableNodeId: string): Workflow | null`
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Finds the Reusable node by ID
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Traverses the graph from Reusable node following driver connections
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Collects all nodes until an End node is reached (or no more driver connections)
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Returns a sub-workflow containing only nodes within the reusable scope
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Handles nested reusable flows (End nodes within nested reusables don't end outer reusable)

- `findReusableByContext(workflow: Workflow, contextName: string): BaseNode | null`
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Finds a Reusable node by its context name
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Returns the Reusable node if found

- `getReusableScope(workflow: Workflow, reusableNodeId: string): Set<string>`
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Returns set of node IDs that belong to the reusable flow
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Used to determine which nodes to skip during main workflow execution

### 3. Node Handlers

Implement handlers in `plugins/reusable-node/handler.ts`:

**ReusableHandler**:

- No-op execution (reusable nodes are skipped in main workflow)
- Validates that context name is provided
- Stores reusable metadata in context for later lookup

**EndHandler**:

- No-op execution (end nodes are skipped in main workflow)
- Acts as a marker to indicate end of reusable flow

**RunReusableHandler**:

- Gets context name from node data
- Uses `ReusableFlowExtractor` to find matching Reusable node
- Extracts the reusable sub-workflow
- Creates a new `WorkflowParser` for the sub-workflow
- Executes the sub-workflow nodes in order using the same `ContextManager`
- Handles errors and propagates them appropriately

### 4. Executor Modifications

Modify `backend/src/engine/executor.ts`:

- Before execution, analyze workflow to identify reusable scopes:
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Find all Reusable nodes
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Extract scope for each reusable (nodes between Reusable and End)
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Store reusable scopes in a map: `Map<string, Set<string>>` (reusableNodeId -> nodeIds)

- During main workflow execution:
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Skip Reusable nodes (they're just definitions)
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Skip End nodes (they're just markers)
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Skip nodes that belong to any reusable scope (unless being executed via Run Reusable)
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Track which reusable is currently being executed (if any)

- When executing Run Reusable node:
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Allow execution of nodes within the matching reusable scope
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - After Run Reusable completes, resume skipping reusable nodes

### 5. Parser Modifications

Modify `backend/src/engine/parser.ts`:

- Add method `getReusableScopes(): Map<string, Set<string>>`
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Analyzes workflow to identify reusable scopes
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Returns map of reusable node ID to set of node IDs in that scope

- Modify `getExecutionOrder()`:
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Filter out nodes that belong to reusable scopes (unless being executed)
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - This ensures reusable nodes and their contents are skipped in main flow

### 6. Frontend Config Components

Create `plugins/reusable-node/config.tsx`:

**ReusableConfig Component**:

- Input field for context name (required)
- Validation: context name must be unique within workflow
- Display warning if context name conflicts with another Reusable node

**RunReusableConfig Component**:

- Dropdown/autocomplete to select reusable context name
- Populated from all Reusable nodes in the workflow
- Shows context names of available reusable flows
- Validation: context name must match an existing Reusable node

### 7. Frontend Node Rendering

Modify `frontend/src/nodes/CustomNode.tsx`:

- Detect reusable node types
- **Reusable Node**: 
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Shows context name prominently
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Visual indicator that it's a definition (not executed in main flow)
- **End Node**:
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Simple visual marker
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - May show which reusable it belongs to
- **Run Reusable Node**:
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Shows selected context name
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Visual indicator that it executes a reusable flow

### 8. Node Data Structures

Reusable node data structure:

```typescript
interface ReusableNodeData {
  contextName: string; // Unique identifier for this reusable flow
}

interface EndNodeData {
  // No data needed, just a marker
}

interface RunReusableNodeData {
  contextName: string; // Matches a Reusable node's contextName
}
```

### 9. Execution Flow

Execution flow diagram:

```
Main Workflow:
[Start] → [Node1] → [Run Reusable: login] → [Node2] → [End]

Reusable Flow (login):
[Reusable: login] → [Login Nodes] → [End]

Execution:
1. Main workflow starts
2. Node1 executes
3. Run Reusable: login executes
   - Finds Reusable node with context "login"
   - Extracts sub-workflow: [Login Nodes]
   - Executes Login Nodes with same context
4. Node2 executes
5. Main workflow ends
```

### 10. Validation

Add validation in `backend/src/engine/parser.ts`:

- Each Reusable node must have a unique context name
- Each Reusable node should have a corresponding End node (warning if missing)
- Run Reusable nodes must reference an existing Reusable context name
- Detect circular dependencies in reusable flows
- Ensure reusable flows don't create infinite loops

### 11. Error Handling

- If Run Reusable references a non-existent context name: throw error
- If Reusable flow has no End node: log warning, treat as error or use implicit end
- If reusable flow execution fails: propagate error to main workflow
- Handle nested reusable execution correctly

## Files to Create

### New Files

- `plugins/reusable-node/plugin.json`
- `plugins/reusable-node/handler.ts`
- `plugins/reusable-node/config.tsx`
- `plugins/reusable-node/README.md`
- `backend/src/utils/reusableFlowExtractor.ts`

### Modified Files

- `backend/src/engine/executor.ts` - Add reusable scope tracking and skipping logic
- `backend/src/engine/parser.ts` - Add reusable scope analysis and filtering
- `frontend/src/nodes/CustomNode.tsx` - Add rendering for reusable node types
- `frontend/src/components/NodeConfigForm.tsx` - Register reusable config components

## Key Implementation Details

1. **Reusable Scope Detection**: Use graph traversal from Reusable node following driver connections until End node
2. **Execution Context**: Reusable flows use the same ContextManager instance, so variables and data persist
3. **Nested Reusables**: Support nested reusable flows - inner End nodes don't terminate outer reusable flows
4. **Node Skipping**: Nodes within reusable scopes are skipped during main workflow execution unless executed via Run Reusable
5. **Context Name Matching**: Case-sensitive matching of context names between Reusable and Run Reusable nodes

## Testing Considerations

- Test basic reusable flow execution
- Test multiple reusable flows in one workflow
- Test nested reusable flows
- Test reusable flow with no End node (edge case)
- Test Run Reusable with invalid context name
- Test reusable flows that modify context variables
- Test reusable flows that use the same page/browser instance
- Test error propagation from reusable flows to main workflow