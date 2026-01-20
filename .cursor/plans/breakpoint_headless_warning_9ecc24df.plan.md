---
name: Breakpoint Headless Warning
overview: Add a warning dialog when breakpoints are enabled and browser is headless, with localStorage-based preference tracking per workflow.
todos:
  - id: create-workflow-hash
    content: Create utility function to generate workflow hash based on nodes and edges structure
    status: pending
  - id: create-workflow-checks
    content: Create utility function to check if workflow has headless browser nodes
    status: pending
  - id: create-warning-dialog
    content: Create BreakpointHeadlessWarning dialog component with continue, disable, and cancel options
    status: pending
  - id: modify-execution-hook
    content: Modify executeWorkflow to check conditions, show warning, and handle user choices with localStorage persistence
    status: pending
    dependencies:
      - create-workflow-hash
      - create-workflow-checks
      - create-warning-dialog
  - id: add-breakpoint-disable-method
    content: Add method to workflowStore to temporarily disable breakpoints for single execution
    status: pending
---

# Breakpoint Headless Warning Feature

## Overview

Show a warning dialog when user tries to run a workflow with breakpoints enabled and headless browser mode. Store user preference in localStorage per workflow to avoid repeated prompts.

## Implementation Details

### 1. Create Workflow Hash Utility

Create a utility function to generate a stable hash/ID for a workflow based on its structure (nodes and edges). This will be used to track workflow-specific preferences.

**File**: `frontend/src/utils/workflowHash.ts`

- Function: `generateWorkflowHash(nodes: Node[], edges: Edge[]): string`
- Generate hash from serialized workflow structure (excluding node positions and IDs for stability)
- Use a simple hash function (e.g., JSON.stringify + hash) or a library

### 2. Create Warning Dialog Component

Create a new warning dialog component similar to `ResetWarning.tsx` but for breakpoint/headless warning.

**File**: `frontend/src/components/BreakpointHeadlessWarning.tsx`

- Props: `onContinue`, `onDisableAndRun`, `onCancel`
- Show warning message about breakpoints not being useful in headless mode
- Three buttons:
        - "Continue" - Run with breakpoints enabled
        - "Disable Breakpoints & Run" - Disable breakpoints and run
        - "Cancel" - Cancel execution
- Include checkbox: "Don't ask again for this workflow" (checked by default)

### 3. Add Helper Function to Check Headless Mode

Create a utility function to check if workflow has any OpenBrowser node with headless mode enabled.

**File**: `frontend/src/utils/workflowChecks.ts`

- Function: `hasHeadlessBrowser(nodes: Node[]): boolean`
- Check if any node with type `'openBrowser'` has `headless !== false` (default is headless)

### 4. Modify executeWorkflow Hook

Update `executeWorkflow` in `useExecution.ts` to check conditions and show warning before execution.

**File**: `frontend/src/hooks/useExecution.ts`

- Before executing, check:

        1. `breakpointEnabled` is true
        2. `hasHeadlessBrowser(nodes)` returns true
        3. Generate workflow hash
        4. Check localStorage for preference: `automflows_breakpoint_headless_warning_${workflowHash}`

- If preference exists and is `'skip'`, proceed without warning
- If preference exists and is `'continue'` or `'disable'`, use that action
- Otherwise, show warning dialog
- Store user choice in localStorage with key: `automflows_breakpoint_headless_warning_${workflowHash}`
- Values: `'skip'` (don't ask again), `'continue'` (continue with breakpoints), `'disable'` (disable and run)

### 5. Track Workflow Changes

Add workflow hash tracking to detect when workflow changes.

**File**: `frontend/src/hooks/useExecution.ts`

- Use `useRef` or `useState` to track current workflow hash
- When nodes/edges change, recalculate hash
- If hash changes, clear any cached preference check (or re-check)

### 6. Update FloatingRunButton

Modify `FloatingRunButton.tsx` to pass through the warning check.

**File**: `frontend/src/components/FloatingRunButton.tsx`

- No changes needed if warning is handled in `executeWorkflow`

## Data Flow

```
User clicks Run
  ↓
executeWorkflow() called
  ↓
Check: breakpointEnabled && hasHeadlessBrowser()
  ↓
Generate workflow hash
  ↓
Check localStorage for preference
  ↓
If preference exists → use it
If not → show warning dialog
  ↓
User chooses:
  - Continue → Run with breakpoints
  - Disable & Run → Disable breakpoints, then run
  - Cancel → Stop execution
  ↓
Store preference in localStorage (if "don't ask again" checked)
```

## localStorage Structure

- Key format: `automflows_breakpoint_headless_warning_${workflowHash}`
- Values:
        - `'skip'` - Don't show warning again for this workflow
        - `'continue'` - Always continue with breakpoints (if stored)
        - `'disable'` - Always disable breakpoints and run (if stored)

## Files to Modify

1. `frontend/src/utils/workflowHash.ts` (new)
2. `frontend/src/utils/workflowChecks.ts` (new)
3. `frontend/src/components/BreakpointHeadlessWarning.tsx` (new)
4. `frontend/src/hooks/useExecution.ts` (modify)
5. `frontend/src/store/workflowStore.ts` (may need to add method to disable breakpoints temporarily)

## Notes

- Workflow hash should be stable for the same workflow structure but change when nodes/edges change
- The warning should only appear once per workflow unless the workflow structure changes
- If user chooses "Disable Breakpoints & Run", temporarily disable breakpoints for this execution only (don't change global setting)