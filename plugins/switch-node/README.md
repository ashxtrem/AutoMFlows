# Switch Node Plugin

A plugin that provides conditional branching functionality in AutoMFlows workflows. The switch node evaluates conditions and executes only the matching branch, enabling dynamic workflow execution based on runtime conditions.

## Features

- **Multiple Condition Types**: Supports UI element checks, API status/JSON path matching, JavaScript expressions, and variable comparisons
- **Conditional Branching**: Evaluates cases in order and executes only the matching branch
- **Default Case**: Always includes a default case that executes when no other case matches
- **Clean UI**: Simple node view with case labels and output handles; all configuration happens in the properties panel

## Node Structure

The switch node has:
- One input handle (driver) for control flow input
- Multiple output handles (one per case + default) for conditional branching
- Case labels displayed on the node view
- Configuration panel for managing cases and conditions

## Condition Types

### UI Element
Checks if a UI element exists, is visible, or is hidden.

**Fields:**
- Selector (CSS or XPath)
- Selector Type (CSS/XPath)
- Element Check (Visible/Hidden/Exists)
- Timeout (optional)

### API Status
Checks if an API response has a specific status code.

**Fields:**
- API Context Key (default: `apiResponse`)
- Status Code

### API JSON Path
Matches a JSON path value in an API response.

**Fields:**
- API Context Key (default: `apiResponse`)
- JSON Path (e.g., `data.user.id`)
- Expected Value
- Match Type (Equals/Contains/Greater Than/etc.)

### JavaScript
Evaluates a JavaScript expression in the page context.

**Fields:**
- JavaScript Expression (should evaluate to true/false)

### Variable
Compares a workflow variable with a value.

**Fields:**
- Variable Name
- Comparison Operator (Equals/Greater Than/Less Than/etc.)
- Comparison Value

## Usage

1. Add a Switch node to your workflow
2. Configure cases in the properties panel:
   - Add/remove cases as needed
   - Set case labels
   - Configure condition type and parameters for each case
   - Configure the default case label
3. Connect output handles to different branches
4. During execution, the switch node evaluates conditions in order and executes only the matching branch

## Execution Flow

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

Nodes in unreachable branches are automatically skipped during execution.

## Example

**Scenario**: Check if a login button exists, then branch based on result.

1. Add a Switch node
2. Configure Case 1:
   - Label: "Button Exists"
   - Condition Type: UI Element
   - Selector: `#login-button`
   - Element Check: Visible
3. Configure Default Case:
   - Label: "Button Missing"
4. Connect Case 1 handle to "Click Login" branch
5. Connect Default handle to "Error Handling" branch

## Technical Details

- **Handler**: `plugins/switch-node/handler.ts`
- **Config Component**: `plugins/switch-node/config.tsx`
- **Condition Evaluator**: `backend/src/utils/conditionEvaluator.ts`
- **Node Type**: `switch.switch`

The switch node uses the condition evaluator utility which reuses existing verification strategies for consistency with the Verify node.
