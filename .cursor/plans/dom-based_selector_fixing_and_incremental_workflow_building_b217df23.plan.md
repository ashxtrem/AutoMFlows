---
name: DOM-Based Selector Fixing and Incremental Workflow Building
overview: Integrate pageDebugHelper DOM capture into error fixing flow, assess token feasibility, and implement incremental workflow building that captures DOM at each step to generate correct selectors.
todos: []
isProject: false
---

# DOM-Based Selector Fixing and Incremental Workflow Building

## Part 1: Integrate DOM Capture into Error Fixing

### Current State

- `PageDebugHelper.captureDebugInfo()` already captures:
  - Page source (HTML DOM, up to 1MB)
  - Similar selectors using `findSimilarSelectors()`
  - Page URL
- It's called in `executor.ts` when UI nodes fail (line 594)
- **Problem**: Debug info is captured but NOT passed to error analysis/fixing flow

### Implementation Plan

#### 1.1 Modify Error Analysis to Accept DOM Context

**File**: `[mcp-server/src/utils/errorAnalyzer.ts](mcp-server/src/utils/errorAnalyzer.ts)`

- Add `PageDebugInfo` parameter to `ErrorAnalyzer.analyze()`
- When DOM is available:
  - Parse HTML to extract actual selectors
  - Match failed selector against DOM elements
  - Generate correct selectors from DOM structure
  - Use `similarSelectors` from `PageDebugHelper` directly

#### 1.2 Pass Debug Info from Executor to Error Analysis

**File**: `[backend/src/engine/executor.ts](backend/src/engine/executor.ts)`

- When emitting `NODE_ERROR` event, include `debugInfo` in event payload
- Store debug info in execution context for later retrieval

#### 1.3 Enhance Error Analysis with DOM Parsing

**File**: `[mcp-server/src/utils/errorAnalyzer.ts](mcp-server/src/utils/errorAnalyzer.ts)`

- Add method `analyzeWithDOM()` that:
  - Parses HTML DOM to find elements matching failed selector pattern
  - Extracts element attributes (id, class, data-*, aria-*)
  - Generates multiple selector options using `SelectorGenerator` logic
  - Prioritizes selectors by uniqueness and stability

#### 1.4 Update Fix Workflow to Use DOM-Based Selectors

**File**: `[mcp-server/src/tools/fixWorkflow.ts](mcp-server/src/tools/fixWorkflow.ts)`

- Accept `PageDebugInfo` in `FixWorkflowParams`
- When `correctSelector` is not available from error message parsing:
  - Use `similarSelectors` from `PageDebugInfo`
  - Parse DOM to generate selectors
  - Select best selector based on quality metrics

### Token Utilization Feasibility

#### Current DOM Capture Size

- Full page source: up to 1MB (truncated)
- 1MB HTML ≈ **250,000 tokens** (assuming ~4 chars/token)
- This is **too large** for most LLM contexts

#### Optimization Strategies

**Strategy 1: Structured DOM Extraction** (Recommended)

- Extract only relevant elements:
  - Elements with IDs
  - Elements with classes matching failed selector
  - Form elements (input, select, button)
  - Interactive elements (a, button, [onclick])
- Size reduction: **~90%** (1MB → 100KB → ~25k tokens)

**Strategy 2: Intelligent Truncation**

- Parse HTML and extract:
  - Only elements within viewport
  - Only elements matching selector pattern (e.g., all `input` elements)
  - Only parent/child relationships of failed element
- Size reduction: **~95%** (1MB → 50KB → ~12.5k tokens)

**Strategy 3: LLM Vision Alternative**

- Send screenshot + structured element list (not full HTML)
- Use vision model to identify correct element
- Token cost: **~1-2k tokens** per image

**Strategy 4: Hybrid Approach** (Best)

- Use structured extraction for rule-based fixing (no LLM)
- Only use LLM when rule-based fails
- Pass minimal context: failed selector + 5-10 similar selectors
- Token cost: **~500-1k tokens** per fix

#### Recommended Implementation

```typescript
interface OptimizedDOMContext {
  pageUrl: string;
  failedSelector: string;
  similarSelectors: SelectorSuggestion[]; // Already extracted, ~10 items
  relevantElements: Array<{
    tag: string;
    id?: string;
    classes?: string[];
    attributes: Record<string, string>;
    text?: string;
  }>; // Only matching elements, ~20-50 items
}
```

**Token estimate**: ~500-1,500 tokens per error analysis

## Part 2: Incremental Workflow Building

### Concept

Instead of generating full workflow upfront, build incrementally:

1. Start with minimal workflow (Start + Navigate)
2. Execute to URL
3. Capture DOM at that point
4. User/AI adds next action (e.g., "click search button")
5. System finds correct selector from DOM
6. Add node with correct selector
7. Execute that action
8. Repeat until workflow complete

### Implementation Plan

#### 2.1 Create New MCP Tool: `buildWorkflowIncrementally`

**File**: `mcp-server/src/tools/buildWorkflowIncrementally.ts` (new)

```typescript
interface BuildIncrementallyParams {
  workflow: Workflow; // Current partial workflow
  nextAction: string; // e.g., "click search button", "type 'toys' in search"
  currentPageUrl?: string; // Optional: current page URL
  domContext?: PageDebugInfo; // Optional: captured DOM
}

interface IncrementalBuildResult {
  workflow: Workflow; // Updated workflow with new node
  executionId?: string; // If action was executed
  nextDomContext?: PageDebugInfo; // DOM after action execution
}
```

**Flow**:

1. Parse `nextAction` to determine node type (click, type, navigate, etc.)
2. If DOM context provided:
  - Use `SelectorGenerator` to find correct selector
  - Create node with correct selector
3. If no DOM context:
  - Execute workflow to current state
  - Capture DOM at that point
  - Find selector
  - Create node
4. Optionally execute new node to verify
5. Return updated workflow + new DOM context

#### 2.2 Enhance WorkflowBuilder for Incremental Building

**File**: `[mcp-server/src/utils/workflowBuilder.ts](mcp-server/src/utils/workflowBuilder.ts)`

Add methods:

- `addNodeWithSelectorInference()`: Add node and infer selector from DOM
- `executeToCurrentState()`: Execute workflow up to last node
- `captureCurrentDOM()`: Capture DOM at current execution point

#### 2.3 Create DOM-Based Selector Inference

**File**: `mcp-server/src/utils/domSelectorInference.ts` (new)

```typescript
class DOMSelectorInference {
  static async inferSelector(
    action: string, // "click search button"
    domContext: PageDebugInfo,
    page?: any // Optional: for live element inspection
  ): Promise<SelectorOption[]> {
    // 1. Parse action to extract intent
    // 2. Search DOM for matching elements
    // 3. Generate multiple selector options
    // 4. Rank by quality (uniqueness, stability)
    // 5. Return top options
  }
}
```

**Logic**:

- Parse action text: "click search button" → intent: button, text: "search"
- Search DOM for:
  - Buttons with text containing "search"
  - Elements with id/class containing "search"
  - Elements with aria-label containing "search"
- Generate selectors using `SelectorGenerator`
- Rank by: uniqueness, semantic match, stability

#### 2.4 Integration with Execution

**File**: `[backend/src/engine/executor.ts](backend/src/engine/executor.ts)`

- Add method `executeToNode(nodeId: string)`: Execute workflow up to specific node
- Add method `captureDOMAtCurrentState()`: Capture DOM after current node
- Expose via API endpoint for incremental building

#### 2.5 New API Endpoint

**File**: `[backend/src/routes/workflows.ts](backend/src/routes/workflows.ts)`

```typescript
router.post('/build-incrementally', async (req, res) => {
  // 1. Execute workflow to current state
  // 2. Capture DOM
  // 3. Infer selector for next action
  // 4. Add node to workflow
  // 5. Optionally execute new node
  // 6. Return updated workflow + DOM context
});
```

### Usage Flow Example

```typescript
// Step 1: Create minimal workflow
let workflow = {
  nodes: [
    { id: 'start-1', type: 'start', ... },
    { id: 'navigate-1', type: 'navigation', url: 'https://amazon.in', ... }
  ],
  edges: [...]
};

// Step 2: Execute to URL
const result1 = await buildIncrementally({
  workflow,
  nextAction: 'navigate to https://amazon.in'
});
// Result: workflow executed, DOM captured

// Step 3: Add next action
const result2 = await buildIncrementally({
  workflow: result1.workflow,
  nextAction: "type 'toys' in search box",
  domContext: result1.nextDomContext
});
// Result: Type node added with correct selector (#twotabsearchtextbox)

// Step 4: Continue building...
const result3 = await buildIncrementally({
  workflow: result2.workflow,
  nextAction: 'click search button',
  domContext: result2.nextDomContext
});
// Result: Action node added, workflow executed, DOM captured at search results
```

## Implementation Priority

### Phase 1: DOM-Based Error Fixing (High Priority)

1. Modify `ErrorAnalyzer` to accept `PageDebugInfo`
2. Pass debug info from executor to error analysis
3. Use `similarSelectors` from DOM capture
4. Update `fixWorkflow` to use DOM-based selectors

**Estimated effort**: 2-3 days
**Token cost**: ~500-1.5k tokens per error (acceptable)

### Phase 2: Incremental Workflow Building (Medium Priority)

1. Create `buildWorkflowIncrementally` MCP tool
2. Implement `DOMSelectorInference` class
3. Enhance `WorkflowBuilder` with incremental methods
4. Add API endpoint for incremental building

**Estimated effort**: 5-7 days
**Token cost**: ~500-2k tokens per step (very efficient)

### Phase 3: Advanced Optimizations (Low Priority)

1. Implement structured DOM extraction
2. Add LLM vision support for complex selectors
3. Cache DOM contexts for workflow steps
4. Add selector validation before adding nodes

**Estimated effort**: 3-5 days

## Token Cost Analysis

### Current Approach (Error Fixing)

- Error message parsing: **~100 tokens**
- Rule-based fixes: **0 tokens** (no LLM)
- **Total**: ~100 tokens per error

### Proposed Approach (DOM-Based)

- DOM capture: **0 tokens** (server-side)
- Structured extraction: **0 tokens** (server-side)
- Error analysis with DOM: **~500-1.5k tokens** (if using LLM)
- Rule-based with DOM: **~100 tokens** (no LLM, just DOM parsing)
- **Total**: ~100-1.5k tokens per error

### Incremental Building

- Per step: **~500-2k tokens** (DOM parsing + selector inference)
- Full workflow (10 steps): **~5-20k tokens**
- **vs Current**: Full workflow generation **~10-50k tokens**

**Conclusion**: Token usage is **feasible and efficient**, especially with rule-based DOM parsing (no LLM needed for most cases).

## Files to Modify/Create

### Modify Existing

1. `[mcp-server/src/utils/errorAnalyzer.ts](mcp-server/src/utils/errorAnalyzer.ts)` - Add DOM analysis
2. `[mcp-server/src/tools/fixWorkflow.ts](mcp-server/src/tools/fixWorkflow.ts)` - Use DOM context
3. `[backend/src/engine/executor.ts](backend/src/engine/executor.ts)` - Pass debug info
4. `[mcp-server/src/utils/workflowBuilder.ts](mcp-server/src/utils/workflowBuilder.ts)` - Add incremental methods
5. `[backend/src/routes/workflows.ts](backend/src/routes/workflows.ts)` - Add incremental endpoint

### Create New

1. `mcp-server/src/tools/buildWorkflowIncrementally.ts` - Incremental building tool
2. `mcp-server/src/utils/domSelectorInference.ts` - Selector inference from DOM
3. `mcp-server/src/utils/domParser.ts` - Structured DOM extraction utilities

