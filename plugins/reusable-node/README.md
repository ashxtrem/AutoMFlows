# Reusable Node Plugin

A plugin for AutoMFlows that enables defining and executing reusable flows within workflows.

## Overview

The Reusable Node plugin provides three node types that allow you to:

1. **Define reusable flows** - Create named, reusable sub-workflows
2. **Mark flow boundaries** - Indicate where reusable flows end
3. **Execute reusable flows** - Run reusable flows on-demand from anywhere in your workflow

## Node Types

### 1. Reusable Node

**Type:** `reusable.reusable`

Defines a reusable flow with a unique context name. This node marks the beginning of a reusable flow definition.

**Configuration:**
- **Context Name** (required): A unique identifier for this reusable flow. Must be unique within the workflow.

**Behavior:**
- Not executed during main workflow execution
- Acts as a definition/marker for the reusable flow
- The flow starts from nodes connected to this node's output

### 2. End Node

**Type:** `reusable.end`

Marks the end of a reusable flow. This node indicates where the reusable flow should terminate.

**Configuration:**
- No configuration required

**Behavior:**
- Not executed during main workflow execution
- Acts as a marker to indicate the end of a reusable flow
- Supports nested reusable flows (inner End nodes don't terminate outer reusable flows)

### 3. Run Reusable Node

**Type:** `reusable.runReusable`

Executes a reusable flow by matching its context name. When executed, this node finds the matching Reusable node and executes all nodes within that reusable scope.

**Configuration:**
- **Reusable Flow** (required): Select the reusable flow to execute from a dropdown of available reusable flows

**Behavior:**
- Executes during main workflow execution
- Finds the Reusable node with matching context name
- Extracts and executes the reusable sub-workflow
- Uses the same execution context (variables, page, browser) as the main workflow
- Propagates errors to the main workflow

## Usage Example

```
Main Workflow:
[Start] → [Navigate to Login] → [Run Reusable: login] → [Navigate to Dashboard] → [End]

Reusable Flow (login):
[Reusable: login] → [Type Username] → [Type Password] → [Click Login] → [End]
```

**Execution Flow:**
1. Main workflow starts
2. "Navigate to Login" executes
3. "Run Reusable: login" executes
   - Finds Reusable node with context "login"
   - Executes: Type Username → Type Password → Click Login
4. "Navigate to Dashboard" executes
5. Main workflow ends

## Key Features

### Context Sharing
Reusable flows share the same execution context as the main workflow:
- Variables set in reusable flows are available in the main workflow
- Browser/page instances are shared
- Data flows seamlessly between main workflow and reusable flows

### Nested Reusable Flows
You can nest reusable flows within other reusable flows:
- Inner reusable flows are properly scoped
- End nodes within nested reusables don't terminate outer reusable flows
- Each reusable flow maintains its own scope

### Validation
The plugin includes validation for:
- Unique context names (no duplicate Reusable nodes with same context name)
- Valid Run Reusable references (context name must exist)
- Missing End nodes (warnings if reusable flow has no End node)

## Implementation Details

### Execution Flow

1. **Main Workflow Execution:**
   - Reusable and End nodes are skipped
   - Nodes within reusable scopes are skipped
   - Run Reusable nodes execute normally

2. **Reusable Flow Execution:**
   - When a Run Reusable node executes:
     - Finds matching Reusable node by context name
     - Extracts sub-workflow (nodes between Reusable and End)
     - Creates a WorkflowParser for the sub-workflow
     - Executes nodes in topological order
     - Uses the same ContextManager instance

### Scope Detection

Reusable scopes are detected by:
- Starting from the Reusable node
- Following driver (control flow) connections
- Collecting all nodes until an End node is reached
- Handling nested reusable flows correctly

### Error Handling

- If Run Reusable references a non-existent context name: throws error
- If Reusable flow has no End node: logs warning, uses implicit end (no more driver connections)
- If reusable flow execution fails: propagates error to main workflow
- Nested reusable execution is handled correctly

## Best Practices

1. **Naming:** Use descriptive, unique context names (e.g., "login", "setup", "cleanup")
2. **End Nodes:** Always include an End node for clarity, though not strictly required
3. **Scope:** Keep reusable flows focused on a single task or operation
4. **Reusability:** Design reusable flows to be independent and reusable across different workflows

## Limitations

- Reusable flows cannot have their own Start nodes (execution starts from first connected node)
- Circular dependencies between reusable flows are not supported
- Reusable flows execute synchronously (cannot run in parallel)

## Future Enhancements

Potential future improvements:
- Parallel execution of reusable flows
- Reusable flows with parameters/inputs
- Reusable flows with return values
- Visual grouping/collapsing of reusable flows in the UI
