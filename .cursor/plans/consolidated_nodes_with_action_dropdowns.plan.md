# Consolidated Nodes with Action Dropdowns

## Overview

Instead of having separate nodes for similar actions (e.g., Click, Double Click, Right Click, Hover), we'll consolidate them into unified nodes with action dropdowns. The dropdown selection will dynamically change which properties are shown (both inline and in node config panel).

**Reference Pattern**: The `Wait` node already implements this pattern with `waitType` dropdown that changes properties based on selection.

---

## Design Pattern

### Action Dropdown Structure

1. **Primary Action Dropdown** (always visible, first property)

   - Located at the top of inline properties
   - Changes available properties dynamically
   - Updates node handler execution logic

2. **Dynamic Properties**

   - Properties shown/hidden based on action selection
   - Property types change (text input → number input, etc.)
   - Property labels change contextually

3. **Common Properties**

   - Properties shared across all actions (e.g., selector, timeout, failSilently)
   - Always visible regardless of action selection

### Implementation Pattern

```typescript
// Node Data Structure
interface ConsolidatedNodeData {
  action: 'click' | 'doubleClick' | 'rightClick' | 'hover'; // Action dropdown
  selector: string; // Common property
  selectorType?: 'css' | 'xpath'; // Common property
  timeout?: number; // Common property
  // Action-specific properties (conditional)
  delay?: number; // For hover, type actions
  button?: 'left' | 'right' | 'middle'; // For click actions
  // ... other action-specific properties
}
```

### Handler Pattern

```typescript
async execute(node: BaseNode, context: ContextManager): Promise<void> {
  const data = node.data as ConsolidatedNodeData;
  const page = context.getPage();
  
  switch (data.action) {
    case 'click':
      await page.click(data.selector, { timeout: data.timeout });
      break;
    case 'doubleClick':
      await page.dblclick(data.selector, { timeout: data.timeout });
      break;
    case 'rightClick':
      await page.click(data.selector, { button: 'right', timeout: data.timeout });
      break;
    case 'hover':
      await page.hover(data.selector, { timeout: data.timeout });
      break;
  }
}
```

---

## Common Features (All Consolidated Nodes)

All consolidated nodes will include the following common features, matching the current Click and Type node implementations:

### Advanced Waiting Options (Collapsible Section)

These options allow waiting for conditions before or after the main operation:

- **Wait After Operation** (`waitAfterOperation`, boolean, default: false)
  - If `false`: Wait conditions execute BEFORE the operation (default)
  - If `true`: Wait conditions execute AFTER the operation

- **Wait for Selector** (`waitForSelector`, string, optional)
  - Wait for a specific element to appear
  - Requires `waitForSelectorType` (css | xpath, default: css)
  - Optional `waitForSelectorTimeout` (number, defaults to main timeout)

- **Wait for URL Pattern** (`waitForUrl`, string, optional)
  - Wait until URL matches pattern
  - Supports regex with `/pattern/` syntax or plain text for exact match
  - Optional `waitForUrlTimeout` (number, defaults to main timeout)
  - Includes regex validation (shows error if invalid pattern)

- **Wait for JavaScript Condition** (`waitForCondition`, string, optional)
  - JavaScript expression that returns truthy value when condition is met
  - Executed in page context
  - Optional `waitForConditionTimeout` (number, defaults to main timeout)

- **Wait Strategy** (`waitStrategy`, parallel | sequential, default: parallel)
  - Only shown if any wait condition is set
  - **Parallel**: All conditions checked simultaneously (faster, conditions must be independent)
  - **Sequential**: Conditions checked one after another (useful when conditions depend on each other)

### Retry Configuration (Collapsible Section)

These options enable retry logic for failed operations:

- **Enable Retry** (`retryEnabled`, boolean, default: false)
  - Master switch to enable retry mechanism

- **Retry Strategy** (`retryStrategy`, count | untilCondition, default: count)
  - **count**: Retry fixed number of times
  - **untilCondition**: Retry until condition is met

- **Retry Count** (`retryCount`, number, default: 3)
  - Only shown if `retryStrategy` is 'count'
  - Number of retries on failure (excluding initial attempt)

- **Retry Until Condition** (`retryUntilCondition`, object, optional)
  - Only shown if `retryStrategy` is 'untilCondition'
  - Structure:
    - `type` (selector | url | javascript, required)
    - `value` (string, required) - Condition value
    - `selectorType` (css | xpath, optional) - Only if type is 'selector'
    - `timeout` (number, default: 30000) - Max retry timeout

- **Retry Delay** (`retryDelay`, number, default: 1000)
  - Base delay between retries in milliseconds

- **Delay Strategy** (`retryDelayStrategy`, fixed | exponential, default: fixed)
  - **fixed**: Constant delay between retries
  - **exponential**: Delay increases with each retry

- **Max Delay** (`retryMaxDelay`, number, optional)
  - Only shown if `retryDelayStrategy` is 'exponential'
  - Maximum delay cap for exponential backoff (leave empty for no limit)

**Note**: These features are already implemented in Click and Type nodes. All consolidated nodes must maintain feature parity with these existing nodes.

---

## Consolidated Node Groups

### 1. **Action Node** (Element Interactions)

**Consolidates**: Click, Double Click, Right Click, Hover

**Actions**:

- `click` - Single click (default)
- `doubleClick` - Double click
- `rightClick` - Right click / context menu
- `hover` - Hover over element

**Common Properties**:

- `selector` (string, required)
- `selectorType` (css | xpath, default: css)
- `timeout` (number, default: 30000)
- `failSilently` (boolean, default: false)

**Advanced Waiting Options** (collapsible section, same as Click/Type nodes):

- `waitAfterOperation` (boolean, default: false) - Wait conditions execute after operation if true, before if false
- `waitForSelector` (string, optional) - Wait for element to appear
- `waitForSelectorType` (css | xpath, default: css) - Selector type for wait
- `waitForSelectorTimeout` (number, optional) - Timeout for selector wait (defaults to main timeout)
- `waitForUrl` (string, optional) - Wait for URL pattern (supports regex with /pattern/ syntax)
- `waitForUrlTimeout` (number, optional) - Timeout for URL wait (defaults to main timeout)
- `waitForCondition` (string, optional) - JavaScript condition to wait for
- `waitForConditionTimeout` (number, optional) - Timeout for condition wait (defaults to main timeout)
- `waitStrategy` (parallel | sequential, default: parallel) - How to execute multiple wait conditions (only shown if any wait condition is set)

**Retry Configuration** (collapsible section, same as Click/Type nodes):

- `retryEnabled` (boolean, default: false) - Enable retry mechanism
- `retryStrategy` (count | untilCondition, default: count) - Retry strategy type
- `retryCount` (number, default: 3) - Number of retries (only if strategy is 'count')
- `retryUntilCondition` (object, optional) - Condition to retry until (only if strategy is 'untilCondition'):
  - `type` (selector | url | javascript, required)
  - `value` (string, required) - Condition value
  - `selectorType` (css | xpath, optional) - Only if type is 'selector'
  - `timeout` (number, default: 30000) - Max retry timeout
- `retryDelay` (number, default: 1000) - Base delay between retries (ms)
- `retryDelayStrategy` (fixed | exponential, default: fixed) - Delay strategy
- `retryMaxDelay` (number, optional) - Max delay cap for exponential backoff (only if delay strategy is 'exponential')

**Action-Specific Properties**:

- **click/rightClick**: `button` (left | right | middle, default: left)
- **hover**: `delay` (number, delay before hover)
- **doubleClick**: `delay` (number, delay between clicks)

**Estimated Reduction**: 4 nodes → 1 node

---

### 2. **Text Input Node** (Enhanced Type Node)

**Consolidates**: Type (current), plus new text input methods

**Actions**:

- `fill` - Clear and fill instantly (current behavior, default)
- `type` - Type character by character with delays
- `pressSequentially` - Type with configurable delays
- `insertText` - Insert without keyboard events
- `append` - Append to existing value
- `prepend` - Prepend to existing value
- `direct` - Set value directly via DOM

**Common Properties**:

- `selector` (string, required)
- `selectorType` (css | xpath, default: css)
- `text` (string, required)
- `timeout` (number, default: 30000)
- `failSilently` (boolean, default: false)

**Advanced Waiting Options** (collapsible section, same as Click/Type nodes):

- `waitAfterOperation` (boolean, default: false) - Wait conditions execute after operation if true, before if false
- `waitForSelector` (string, optional) - Wait for element to appear
- `waitForSelectorType` (css | xpath, default: css) - Selector type for wait
- `waitForSelectorTimeout` (number, optional) - Timeout for selector wait (defaults to main timeout)
- `waitForUrl` (string, optional) - Wait for URL pattern (supports regex with /pattern/ syntax)
- `waitForUrlTimeout` (number, optional) - Timeout for URL wait (defaults to main timeout)
- `waitForCondition` (string, optional) - JavaScript condition to wait for
- `waitForConditionTimeout` (number, optional) - Timeout for condition wait (defaults to main timeout)
- `waitStrategy` (parallel | sequential, default: parallel) - How to execute multiple wait conditions (only shown if any wait condition is set)

**Retry Configuration** (collapsible section, same as Click/Type nodes):

- `retryEnabled` (boolean, default: false) - Enable retry mechanism
- `retryStrategy` (count | untilCondition, default: count) - Retry strategy type
- `retryCount` (number, default: 3) - Number of retries (only if strategy is 'count')
- `retryUntilCondition` (object, optional) - Condition to retry until (only if strategy is 'untilCondition'):
  - `type` (selector | url | javascript, required)
  - `value` (string, required) - Condition value
  - `selectorType` (css | xpath, optional) - Only if type is 'selector'
  - `timeout` (number, default: 30000) - Max retry timeout
- `retryDelay` (number, default: 1000) - Base delay between retries (ms)
- `retryDelayStrategy` (fixed | exponential, default: fixed) - Delay strategy
- `retryMaxDelay` (number, optional) - Max delay cap for exponential backoff (only if delay strategy is 'exponential')

**Action-Specific Properties**:

- **type/pressSequentially**: `delay` (number, delay between keystrokes in ms)
- **append/prepend**: `clearFirst` (boolean, whether to clear before append/prepend)
- **direct**: No additional properties (bypasses all events)

**Estimated Reduction**: 1 node → 1 node (enhanced, no reduction but adds functionality)

---

### 3. **Element Query Node** (Data Extraction)

**Consolidates**: Get Text, Get Attribute, Get Count, Get Element State, Get Bounding Box

**Actions**:

- `getText` - Get text content (current Get Text node)
- `getAttribute` - Get element attribute value
- `getCount` - Count matching elements
- `isVisible` - Check if element is visible
- `isEnabled` - Check if element is enabled
- `isChecked` - Check if checkbox/radio is checked
- `getBoundingBox` - Get element position and size
- `getAllText` - Get text from all matching elements

**Common Properties**:

- `selector` (string, required)
- `selectorType` (css | xpath, default: css)
- `timeout` (number, default: 30000)
- `failSilently` (boolean, default: false)
- **Advanced Waiting Options** (see Common Features section above)
- **Retry Configuration** (see Common Features section above)

**Action-Specific Properties**:

- **getAttribute**: `attributeName` (string, required)
- **getText/getAllText**: `outputVariable` (string, default: 'text')
- **getCount**: `outputVariable` (string, default: 'count')
- **isVisible/isEnabled/isChecked**: `outputVariable` (string, default: 'isVisible'/'isEnabled'/'isChecked')
- **getBoundingBox**: `outputVariable` (string, default: 'boundingBox')

**Estimated Reduction**: 8 nodes → 1 node

---

### 4. **Form Input Node** (Form Interactions)

**Consolidates**: Select/Dropdown, Checkbox/Radio, Upload File

**Actions**:

- `select` - Select dropdown option(s)
- `check` - Check checkbox/radio
- `uncheck` - Uncheck checkbox/radio
- `upload` - Upload file(s)

**Common Properties**:

- `selector` (string, required)
- `selectorType` (css | xpath, default: css)
- `timeout` (number, default: 30000)
- `failSilently` (boolean, default: false)
- **Advanced Waiting Options** (see Common Features section above)
- **Retry Configuration** (see Common Features section above)

**Action-Specific Properties**:

- **select**: 
  - `values` (string | string[], required) - Option values, labels, or indices
  - `selectBy` (value | label | index, default: value)
  - `multiple` (boolean, allow multiple selection)
- **check/uncheck**: 
  - `force` (boolean, force check even if element is not visible)
- **upload**: 
  - `filePaths` (string | string[], required) - File paths or array of paths
  - `multiple` (boolean, allow multiple files)

**Estimated Reduction**: 3 nodes → 1 node

---

### 5. **Navigation Node** (Browser Navigation)

**Consolidates**: Navigate (current), Go Back, Go Forward, Reload, New Tab, Switch Tab, Close Tab

**Actions**:

- `navigate` - Navigate to URL (current behavior, default)
- `goBack` - Go back in browser history
- `goForward` - Go forward in browser history
- `reload` - Reload current page
- `newTab` - Open new tab/window
- `switchTab` - Switch to different tab
- `closeTab` - Close current or specific tab

**Common Properties**:

- `timeout` (number, default: 30000)
- `failSilently` (boolean, default: false)
- **Advanced Waiting Options** (see Common Features section above)
- **Retry Configuration** (see Common Features section above)

**Action-Specific Properties**:

- **navigate**: 
  - `url` (string, required)
  - `waitUntil` (load | domcontentloaded | networkidle | commit)
  - `referer` (string, optional)
- **goBack/goForward**: 
  - `waitUntil` (load | domcontentloaded | networkidle | commit)
- **reload**: 
  - `waitUntil` (load | domcontentloaded | networkidle | commit)
- **newTab**: 
  - `url` (string, optional - if provided, navigate to URL in new tab)
  - `contextKey` (string, default: 'newPage') - Store new page reference
- **switchTab**: 
  - `tabIndex` (number, optional) - Tab index (0-based)
  - `urlPattern` (string, optional) - Switch to tab matching URL pattern
  - `contextKey` (string, default: 'currentPage') - Store switched page reference
- **closeTab**: 
  - `tabIndex` (number, optional) - Close specific tab, or current if not specified

**Estimated Reduction**: 7 nodes → 1 node

---

### 6. **Keyboard Node** (Keyboard Actions)

**Consolidates**: Keyboard Actions (new), Keyboard Shortcuts

**Actions**:

- `press` - Press a single key
- `type` - Type text via keyboard
- `insertText` - Insert text without keyboard events
- `shortcut` - Press keyboard shortcut (Ctrl+C, Cmd+V, etc.)
- `down` - Hold key down
- `up` - Release key

**Common Properties**:

- `timeout` (number, default: 30000)
- `failSilently` (boolean, default: false)

**Action-Specific Properties**:

- **press**: 
  - `key` (string, required) - Key name (Enter, Tab, Escape, ArrowLeft, etc.)
  - `selector` (string, optional) - Focus element first before pressing
- **type**: 
  - `text` (string, required)
  - `selector` (string, optional) - Focus element first before typing
  - `delay` (number, delay between keystrokes)
- **insertText**: 
  - `text` (string, required)
  - `selector` (string, optional) - Focus element first
- **shortcut**: 
  - `shortcut` (string, required) - e.g., "Control+C", "Meta+V", "Shift+Enter"
  - `selector` (string, optional) - Focus element first
- **down/up**: 
  - `key` (string, required) - Key to hold/release

**Estimated Reduction**: 1 node → 1 node (new node, no reduction)

---

### 7. **Scroll Node** (Scrolling Actions)

**Consolidates**: Scroll (new)

**Actions**:

- `scrollToElement` - Scroll element into view
- `scrollToPosition` - Scroll to x,y coordinates
- `scrollBy` - Scroll by amount
- `scrollToTop` - Scroll to top of page
- `scrollToBottom` - Scroll to bottom of page

**Common Properties**:

- `timeout` (number, default: 30000)
- `failSilently` (boolean, default: false)

**Action-Specific Properties**:

- **scrollToElement**: 
  - `selector` (string, required)
  - `selectorType` (css | xpath, default: css)
- **scrollToPosition**: 
  - `x` (number, required)
  - `y` (number, required)
- **scrollBy**: 
  - `deltaX` (number, required)
  - `deltaY` (number, required)
- **scrollToTop/scrollToBottom**: 
  - No additional properties

**Estimated Reduction**: 1 node → 1 node (new node, no reduction)

---

### 8. **Screenshot Node** (Enhanced)

**Consolidates**: Screenshot (current), Element Screenshot, PDF Generation

**Actions**:

- `fullPage` - Full page screenshot (current behavior, default)
- `element` - Screenshot specific element
- `viewport` - Screenshot current viewport only
- `pdf` - Generate PDF from page

**Common Properties**:

- `path` (string, optional) - Output file path
- `failSilently` (boolean, default: false)
- **Advanced Waiting Options** (see Common Features section above)
- **Retry Configuration** (see Common Features section above)

**Action-Specific Properties**:

- **element**: 
  - `selector` (string, required)
  - `selectorType` (css | xpath, default: css)
  - `mask` (string[], optional) - Selectors to mask in screenshot
- **fullPage/viewport**: 
  - `mask` (string[], optional) - Selectors to mask
- **pdf**: 
  - `format` (A4 | Letter, default: A4)
  - `margin` (object, optional) - { top, right, bottom, left }
  - `printBackground` (boolean, default: true)
  - `landscape` (boolean, default: false)

**Estimated Reduction**: 3 nodes → 1 node

---

### 9. **Storage Node** (Cookies & Storage)

**Consolidates**: Get Cookies, Set Cookie, Clear Cookies, Local Storage, Session Storage

**Actions**:

- `getCookie` - Get cookie value(s)
- `setCookie` - Set cookie(s)
- `clearCookies` - Clear cookies
- `getLocalStorage` - Get localStorage value
- `setLocalStorage` - Set localStorage value
- `clearLocalStorage` - Clear localStorage
- `getSessionStorage` - Get sessionStorage value
- `setSessionStorage` - Set sessionStorage value
- `clearSessionStorage` - Clear sessionStorage

**Common Properties**:

- `contextKey` (string, optional) - Where to store retrieved values
- `failSilently` (boolean, default: false)

**Action-Specific Properties**:

- **getCookie**: 
  - `name` (string, optional) - Get specific cookie, or all if not specified
  - `url` (string, optional) - Get cookies for specific URL
- **setCookie**: 
  - `cookies` (array, required) - Array of cookie objects: { name, value, domain?, path?, expires?, httpOnly?, secure?, sameSite? }
- **clearCookies**: 
  - `domain` (string, optional) - Clear cookies for specific domain
- **getLocalStorage/getSessionStorage**: 
  - `key` (string, optional) - Get specific key, or all keys if not specified
- **setLocalStorage/setSessionStorage**: 
  - `key` (string, required)
  - `value` (string, required)
- **clearLocalStorage/clearSessionStorage**: 
  - No additional properties

**Estimated Reduction**: 8 nodes → 1 node

---

### 10. **Dialog Node** (Dialog Handling)

**Consolidates**: Handle Dialog (new)

**Actions**:

- `accept` - Accept alert/confirm/prompt
- `dismiss` - Dismiss alert/confirm/prompt
- `prompt` - Input text and accept prompt
- `waitForDialog` - Wait for dialog to appear

**Common Properties**:

- `timeout` (number, default: 30000)
- `failSilently` (boolean, default: false)

**Action-Specific Properties**:

- **accept**: 
  - `message` (string, optional) - Expected dialog message (for verification)
- **dismiss**: 
  - `message` (string, optional) - Expected dialog message
- **prompt**: 
  - `inputText` (string, required) - Text to input
  - `message` (string, optional) - Expected dialog message
- **waitForDialog**: 
  - `message` (string, optional) - Expected dialog message pattern
  - `outputVariable` (string, default: 'dialogMessage') - Store dialog message

**Estimated Reduction**: 1 node → 1 node (new node, no reduction)

---

### 11. **Download Node** (File Downloads)

**Consolidates**: Download File (new)

**Actions**:

- `waitForDownload` - Wait for download to start
- `saveDownload` - Save downloaded file
- `getDownloadPath` - Get download file path

**Common Properties**:

- `timeout` (number, default: 30000)
- `failSilently` (boolean, default: false)

**Action-Specific Properties**:

- **waitForDownload**: 
  - `urlPattern` (string, optional) - Wait for download from URL matching pattern
  - `outputVariable` (string, default: 'download') - Store download object
- **saveDownload**: 
  - `downloadObject` (string, required) - Download object from context (from waitForDownload)
  - `savePath` (string, required) - Path to save file
- **getDownloadPath**: 
  - `downloadObject` (string, required) - Download object from context
  - `outputVariable` (string, default: 'downloadPath') - Store file path

**Estimated Reduction**: 1 node → 1 node (new node, no reduction)

---

### 12. **Iframe Node** (Iframe Handling)

**Consolidates**: Switch to Iframe, Get Iframe Content (new)

**Actions**:

- `switchToIframe` - Switch context to iframe
- `switchToMainFrame` - Switch back to main frame
- `getIframeContent` - Get content from iframe

**Common Properties**:

- `timeout` (number, default: 30000)
- `failSilently` (boolean, default: false)

**Action-Specific Properties**:

- **switchToIframe**: 
  - `selector` (string, optional) - Iframe selector
  - `name` (string, optional) - Iframe name attribute
  - `url` (string, optional) - Iframe URL pattern
  - `contextKey` (string, default: 'iframePage') - Store iframe page reference
- **switchToMainFrame**: 
  - No additional properties
- **getIframeContent**: 
  - `iframeSelector` (string, required) - Iframe selector
  - `contentSelector` (string, required) - Element selector within iframe
  - `outputVariable` (string, default: 'iframeContent') - Store content

**Estimated Reduction**: 2 nodes → 1 node

---

## Summary: Node Consolidation

### Current Node Count: ~20 nodes

### Consolidated Node Count: ~12 nodes

### Reduction: ~40% fewer nodes

### Breakdown:

| Consolidated Node | Current Nodes | New Count | Reduction |

|------------------|---------------|-----------|-----------|

| Action Node | Click, Double Click, Right Click, Hover | 1 | -3 |

| Text Input Node | Type (enhanced) | 1 | 0 |

| Element Query Node | Get Text, Get Attribute, Get Count, Get Element State (4), Get Bounding Box, GetAll Text | 1 | -7 |

| Form Input Node | Select, Checkbox, Upload | 1 | -2 |

| Navigation Node | Navigate, Go Back, Go Forward, Reload, New Tab, Switch Tab, Close Tab | 1 | -6 |

| Keyboard Node | (new) | 1 | +1 |

| Scroll Node | (new) | 1 | +1 |

| Screenshot Node | Screenshot, Element Screenshot, PDF | 1 | -2 |

| Storage Node | Get Cookie, Set Cookie, Clear Cookie, Local Storage (3), Session Storage (3) | 1 | -7 |

| Dialog Node | (new) | 1 | +1 |

| Download Node | (new) | 1 | +1 |

| Iframe Node | Switch Iframe, Get Iframe Content | 1 | -1 |

**Net Reduction**: ~15 nodes removed, ~4 new nodes added = **~11 nodes net reduction**

---

## Implementation Details

### Frontend Changes

1. **CustomNode.tsx** - Update inline property rendering
   ```typescript
   // Example for Action Node
   case NodeType.ACTION:
     const action = renderData.action || 'click';
     return (
       <div className="mt-2 space-y-1">
         {/* Action dropdown - always first */}
         {renderPropertyRow('action', (
           <InlineSelect
             label="Action"
             value={action}
             onChange={(value) => {
               handlePropertyChange('action', value);
               // Reset action-specific properties when action changes
               if (value !== action) {
                 // Clear action-specific properties
                 handlePropertyChange('button', undefined);
                 handlePropertyChange('delay', undefined);
               }
             }}
             options={[
               { label: 'Click', value: 'click' },
               { label: 'Double Click', value: 'doubleClick' },
               { label: 'Right Click', value: 'rightClick' },
               { label: 'Hover', value: 'hover' },
             ]}
           />
         ), 0)}
         
         {/* Common properties */}
         {renderPropertyRow('selector', ...)}
         {renderPropertyRow('selectorType', ...)}
         
         {/* Action-specific properties - conditional rendering */}
         {(action === 'click' || action === 'rightClick') && (
           renderPropertyRow('button', (
             <InlineSelect
               label="Button"
               value={renderData.button || 'left'}
               onChange={(value) => handlePropertyChange('button', value)}
               options={[
                 { label: 'Left', value: 'left' },
                 { label: 'Right', value: 'right' },
                 { label: 'Middle', value: 'middle' },
               ]}
             />
           ), 10)
         )}
         
         {action === 'hover' && (
           renderPropertyRow('delay', (
             <InlineNumberInput
               label="Delay (ms)"
               value={renderData.delay || 0}
               onChange={(value) => handlePropertyChange('delay', value)}
             />
           ), 10)
         )}
       </div>
     );
   ```

2. **NodeConfigForm.tsx** - Update config panel

   - Similar conditional rendering based on action selection
   - Show/hide fields dynamically
   - Update field types based on action

3. **nodeProperties.ts** - Update property schemas
   ```typescript
   case NodeType.ACTION:
     const baseProperties = [
       { name: 'action', label: 'Action', dataType: PropertyDataType.STRING, required: true },
       { name: 'selector', label: 'Selector', dataType: PropertyDataType.STRING, required: true },
       // ... common properties
     ];
     
     // Add action-specific properties based on action type
     // This might need to be dynamic based on current action value
     return baseProperties;
   ```


### Backend Changes

1. **types.ts** - Update node data interfaces
   ```typescript
   export interface ActionNodeData {
     action: 'click' | 'doubleClick' | 'rightClick' | 'hover';
     selector: string;
     selectorType?: 'css' | 'xpath';
     timeout?: number;
     // Action-specific (optional)
     button?: 'left' | 'right' | 'middle';
     delay?: number;
     // ... common properties (wait strategies, retry, etc.)
   }
   ```

2. **interaction.ts** (or new action.ts) - Create unified handler
   ```typescript
   export class ActionHandler implements NodeHandler {
     async execute(node: BaseNode, context: ContextManager): Promise<void> {
       const data = node.data as ActionNodeData;
       const page = context.getPage();
       
       if (!page) {
         throw new Error('No page available.');
       }
       
       const selector = VariableInterpolator.interpolateString(data.selector, context);
       const timeout = data.timeout || 30000;
       
       await RetryHelper.executeWithRetry(
         async () => {
           // Wait strategies before...
           
           switch (data.action) {
             case 'click':
               if (data.selectorType === 'xpath') {
                 await page.locator(`xpath=${selector}`).click({ 
                   button: data.button || 'left',
                   timeout 
                 });
               } else {
                 await page.click(selector, { 
                   button: data.button || 'left',
                   timeout 
                 });
               }
               break;
             case 'doubleClick':
               if (data.selectorType === 'xpath') {
                 await page.locator(`xpath=${selector}`).dblclick({ timeout });
               } else {
                 await page.dblclick(selector, { timeout });
               }
               break;
             case 'rightClick':
               if (data.selectorType === 'xpath') {
                 await page.locator(`xpath=${selector}`).click({ 
                   button: 'right',
                   timeout 
                 });
               } else {
                 await page.click(selector, { 
                   button: 'right',
                   timeout 
                 });
               }
               break;
             case 'hover':
               if (data.selectorType === 'xpath') {
                 await page.locator(`xpath=${selector}`).hover({ 
                   timeout,
                   ...(data.delay && { force: false }) // Use delay if provided
                 });
               } else {
                 await page.hover(selector, { timeout });
               }
               if (data.delay) {
                 await page.waitForTimeout(data.delay);
               }
               break;
           }
           
           // Wait strategies after...
         },
         // Retry config...
       );
     }
   }
   ```

3. **index.ts** - Register new handlers
   ```typescript
   const handlers: NodeHandlerMap = {
     // ... existing
     [NodeType.ACTION]: new ActionHandler(),
     [NodeType.ELEMENT_QUERY]: new ElementQueryHandler(),
     [NodeType.FORM_INPUT]: new FormInputHandler(),
     // ... etc
   };
   ```


### Migration Strategy

1. **Backward Compatibility**

   - Keep old node types in enum (deprecated)
   - Map old nodes to new consolidated nodes during workflow load
   - Show migration warning in UI

2. **Gradual Migration**

   - Phase 1: Add new consolidated nodes alongside old ones
   - Phase 2: Auto-convert old nodes to new format on workflow load
   - Phase 3: Remove old node types (after sufficient migration period)

3. **Workflow Conversion**
   ```typescript
   function convertOldNodeToConsolidated(oldNode: BaseNode): BaseNode {
     if (oldNode.type === NodeType.CLICK) {
       return {
         ...oldNode,
         type: NodeType.ACTION,
         data: {
           ...oldNode.data,
           action: 'click'
         }
       };
     }
     // ... other conversions
   }
   ```


---

## Important Notes

### Feature Parity Requirement

**CRITICAL**: Click and Type nodes will remain in the system until deprecated later. All consolidated nodes MUST maintain 100% feature parity with these existing nodes.

**Required Features** (must match ClickConfig.tsx and TypeConfig.tsx exactly):

1. **Advanced Waiting Options** (collapsible section):

   - Wait After Operation checkbox
   - Wait for Selector (with selector type dropdown and timeout)
   - Wait for URL Pattern (with regex validation and timeout)
   - Wait for JavaScript Condition (with timeout)
   - Wait Strategy dropdown (parallel/sequential, only shown if any wait condition is set)

2. **Retry Configuration** (collapsible section):

   - Enable Retry checkbox
   - Retry Strategy dropdown (count/untilCondition)
   - Retry Count input (if strategy is 'count')
   - Retry Until Condition (if strategy is 'untilCondition'):
     - Condition Type dropdown (selector/url/javascript)
     - Condition Value input/textarea
     - Selector Type dropdown (if condition type is 'selector')
     - Max Retry Timeout input
   - Retry Delay input
   - Delay Strategy dropdown (fixed/exponential)
   - Max Delay input (if delay strategy is 'exponential')

3. **Property Input Connections**:

   - Support for converting properties to input connections
   - Visual indication when property is connected
   - Disabled state for connected properties

4. **UI/UX Consistency**:

   - Same collapsible section styling
   - Same validation logic (regex validation for URL patterns)
   - Same help text and tooltips
   - Same layout and spacing

### Implementation Pattern

- **Config Components**: All consolidated nodes should have config components similar to ClickConfig.tsx and TypeConfig.tsx
- **Backend Handlers**: Must use WaitHelper and RetryHelper utilities (same as Click/Type handlers)
- **Backward Compatibility**: Click and Type nodes remain functional until deprecation

---

## Benefits

1. **Reduced Node Clutter**: ~40% fewer nodes in the palette
2. **Better Organization**: Related functionality grouped together
3. **Easier Discovery**: Users find actions more easily
4. **Consistent UX**: Similar actions have similar interfaces
5. **Easier Maintenance**: Less code duplication
6. **Better Extensibility**: Easy to add new actions to existing nodes

---

## Considerations

1. **Learning Curve**: Users need to learn action dropdowns (but Wait node already uses this pattern)
2. **Property Visibility**: Need clear indication of which properties apply to which actions
3. **Default Values**: Ensure sensible defaults when switching actions
4. **Validation**: Validate action-specific properties only when relevant action is selected
5. **Documentation**: Update docs and tooltips to explain action-specific properties
6. **Feature Parity**: Must maintain exact feature parity with Click and Type nodes (see Important Notes section)
7. **Click/Type Node Retention**: Click and Type nodes will remain in the system until fully deprecated - consolidated nodes are additions, not immediate replacements

---

## Next Steps

1. **Phase 1**: Implement Action Node (highest value, consolidates 4 nodes)
2. **Phase 2**: Implement Element Query Node (consolidates 8 nodes)
3. **Phase 3**: Implement Form Input Node (consolidates 3 nodes)
4. **Phase 4**: Implement remaining consolidated nodes
5. **Phase 5**: Migration and cleanup of old node types

---

## Phase 1: Action Node Implementation - Status Summary

**Implementation Status**: ✅ **COMPLETE** (Backend & Frontend)

**Completed Items**:

- ✅ Backend Implementation (100%)
- ✅ Frontend Implementation (100%)
- ✅ Code Review (100%)
- ✅ Integration Review (Partial - node ready, testing pending)

**Pending Items**:

- ⏳ Testing & Validation (all test cases)
- ⏳ Documentation (user docs, API docs)
- ⏳ Migration Preparation (utilities for Phase 5)

**Estimated Time**: 2-3 days for full implementation and testing

**Actual Time**: ~1 day for implementation (testing pending)

**Priority**: High (consolidates 4 nodes, highest value consolidation)

**Next Steps**:

1. Perform comprehensive testing of all Action node features
2. Update user documentation
3. Prepare migration utilities for Phase 5

---

## Phase 3: Form Input Node Implementation - Detailed TODO

### Backend Implementation

- [x] **Add FormInputNodeData interface** (`shared/src/types.ts`)
  - [x] Add `FORM_INPUT` to `NodeType` enum
  - [x] Create `FormInputNodeData` interface with:
    - [x] `action` ('select' | 'check' | 'uncheck' | 'upload')
    - [x] Common properties: `selector`, `selectorType`, `timeout`, `failSilently`
    - [x] Advanced Waiting Options: `waitAfterOperation`, `waitForSelector`, `waitForSelectorType`, `waitForSelectorTimeout`, `waitForUrl`, `waitForUrlTimeout`, `waitForCondition`, `waitForConditionTimeout`, `waitStrategy`
    - [x] Retry Configuration: `retryEnabled`, `retryStrategy`, `retryCount`, `retryUntilCondition`, `retryDelay`, `retryDelayStrategy`, `retryMaxDelay`
    - [x] Action-specific properties:
      - [x] `values` (string | string[]) - For select action
      - [x] `selectBy` ('value' | 'label' | 'index') - For select action
      - [x] `multiple` (boolean) - For select/upload actions
      - [x] `force` (boolean) - For check/uncheck actions
      - [x] `filePaths` (string | string[]) - For upload action
    - [x] `_inputConnections` support
  - [x] Add `FormInputNodeData` to `NodeData` union type

- [x] **Create FormInputHandler** (`backend/src/nodes/interaction.ts`)
  - [x] Import dependencies: `BaseNode`, `FormInputNodeData`, `NodeHandler`, `ContextManager`, `WaitHelper`, `RetryHelper`, `VariableInterpolator`
  - [x] Implement `FormInputHandler` class with `execute` method
  - [x] Handle action dropdown: switch statement for 'select', 'check', 'uncheck', 'upload'
  - [x] Support CSS and XPath selectors (check `selectorType`)
  - [x] Implement wait strategies (before/after operation) using `WaitHelper.executeWaits`
  - [x] Implement retry logic using `RetryHelper.executeWithRetry`
  - [x] Handle action-specific properties:
    - [x] `select` action: Handle `values`, `selectBy`, `multiple` properties
    - [x] `check/uncheck` actions: Handle `force` property
    - [x] `upload` action: Handle `filePaths`, `multiple` properties
  - [x] Variable interpolation for selector and other string properties
  - [x] Error handling with failSilently support
  - [x] Implement all 4 actions:
    - [x] `select` - Select dropdown option(s) using `locator.selectOption()`
    - [x] `check` - Check checkbox/radio using `locator.check()` or `locator.setChecked()`
    - [x] `uncheck` - Uncheck checkbox using `locator.uncheck()` or `locator.setChecked()`
    - [x] `upload` - Upload file(s) using `locator.setInputFiles()`

- [x] **Register FormInputHandler** (`backend/src/nodes/index.ts`)
  - [x] Import `FormInputHandler`
  - [x] Add `[NodeType.FORM_INPUT]: new FormInputHandler()` to handlers map
  - [x] Export `FormInputHandler` from index

- [x] **Update nodeProperties.ts** (`frontend/src/utils/nodeProperties.ts`)
  - [x] Add `NodeType.FORM_INPUT` case
  - [x] Return property schema array with all Form Input node properties
  - [x] Mark properties that can be converted to input connections

### Frontend Implementation

- [x] **Create FormInputConfig component** (`frontend/src/components/nodeConfigs/FormInputConfig.tsx`)
  - [x] Copy structure from `ActionConfig.tsx` as base
  - [x] Add action dropdown at the top (first property)
  - [x] Implement conditional rendering for action-specific properties:
    - [x] Show `values`, `selectBy`, `multiple` inputs only for 'select' action
    - [x] Show `force` checkbox only for 'check' and 'uncheck' actions
    - [x] Show `filePaths`, `multiple` inputs only for 'upload' action
  - [x] Include all Advanced Waiting Options (collapsible section):
    - [x] Wait After Operation checkbox
    - [x] Wait for Selector (with selector type dropdown and timeout)
    - [x] Wait for URL Pattern (with regex validation and timeout)
    - [x] Wait for JavaScript Condition (with timeout)
    - [x] Wait Strategy dropdown (only shown if any wait condition is set)
  - [x] Include all Retry Configuration (collapsible section) via RetryConfigSection component
  - [x] Use `usePropertyInput` hook for property input connection support
  - [x] Implement regex validation for URL patterns (same as ClickConfig)
  - [x] Match styling and layout exactly to existing config components
  - [x] Handle file path input for upload action (support single or multiple files via textarea)

- [x] **Update CustomNode.tsx** (`frontend/src/nodes/CustomNode.tsx`)
  - [x] Add `NodeType.FORM_INPUT` case to `renderProperties` function
  - [x] Render action dropdown as first inline property
  - [x] Render common properties (selector, selectorType, timeout)
  - [x] Conditionally render action-specific properties based on selected action
  - [x] Use `InlineSelect`, `InlineTextInput`, `InlineNumberInput` components
  - [x] Handle property changes with action-specific property clearing when action changes

- [x] **Update NodeConfigForm.tsx** (`frontend/src/components/NodeConfigForm.tsx`)
  - [x] Add case for `NodeType.FORM_INPUT` to render `FormInputConfig` component
  - [x] Ensure proper onChange handler wiring

- [x] **Add Form Input node to palette** (`frontend/src/components/LeftSidebar.tsx`)
  - [x] Add Form Input node to node categories (Interaction category)
  - [x] Set appropriate icon, label, and description
  - [x] Ensure it appears in the correct category ("Interaction")
  - [x] Add to getNodeCategory function (categorized as 'browser')

- [x] **Update node metadata** (if applicable)
  - [x] Add Form Input node icon and color in CustomNode.tsx (CheckBoxIcon, #FF9800)
  - [x] Add Form Input node label in CustomNode.tsx and RightSidebar.tsx
  - [x] Set default node data structure in workflowStore.ts (`{ action: 'select', selector: '', selectorType: 'css', timeout: 30000 }`)

### Testing & Validation

- [ ] **Test Form Input Node - Select action**
  - [ ] Test basic select with single value
  - [ ] Test select with multiple values
  - [ ] Test select by value, label, and index
  - [ ] Test select with wait strategies
  - [ ] Test select with retry configuration

- [ ] **Test Form Input Node - Check action**
  - [ ] Test basic check checkbox
  - [ ] Test check radio button
  - [ ] Test check with force option
  - [ ] Test check with wait strategies
  - [ ] Test check with retry configuration

- [ ] **Test Form Input Node - Uncheck action**
  - [ ] Test basic uncheck checkbox
  - [ ] Test uncheck with force option
  - [ ] Test uncheck with wait strategies
  - [ ] Test uncheck with retry configuration

- [ ] **Test Form Input Node - Upload action**
  - [ ] Test basic upload with single file
  - [ ] Test upload with multiple files
  - [ ] Test upload with wait strategies
  - [ ] Test upload with retry configuration

- [ ] **Test Advanced Features**
  - [ ] Test wait for selector (CSS and XPath)
  - [ ] Test wait for URL pattern (regex and exact match)
  - [ ] Test wait for JavaScript condition
  - [ ] Test wait strategy (parallel and sequential)
  - [ ] Test retry with count strategy
  - [ ] Test retry with untilCondition strategy
  - [ ] Test variable interpolation in all string properties

- [ ] **Test UI/UX**
  - [ ] Verify action dropdown changes properties correctly
  - [ ] Verify action-specific properties show/hide correctly
  - [ ] Verify collapsible sections work
  - [ ] Verify property input connections work
  - [ ] Verify validation (regex for URL patterns)
  - [ ] Verify styling matches existing nodes

- [ ] **Test Edge Cases**
  - [ ] Test with missing selector
  - [ ] Test with invalid selector
  - [ ] Test with missing values (for select)
  - [ ] Test with missing filePaths (for upload)
  - [ ] Test with timeout expiration
  - [ ] Test with retry exhaustion
  - [ ] Test with failSilently enabled on failures
  - [ ] Test action switching clears action-specific properties

### Documentation

- [ ] **Update documentation**
  - [ ] Document Form Input node in user documentation
  - [ ] Document all actions (select, check, uncheck, upload)
  - [ ] Document all properties and options
  - [ ] Add examples for each action type
  - [ ] Document wait strategies and retry configuration
  - [ ] Update API documentation if applicable

### Code Review Checklist

- [ ] **Backend Code Review**
  - [ ] Code follows existing patterns (matches ActionHandler structure)
  - [ ] Proper error handling
  - [ ] Variable interpolation implemented correctly
  - [ ] WaitHelper and RetryHelper used correctly
  - [ ] No code duplication (reuse existing utilities)

- [ ] **Frontend Code Review**
  - [ ] Component structure matches existing config components
  - [ ] Conditional rendering works correctly
  - [ ] Property input connections work
  - [ ] Validation logic matches existing components
  - [ ] Styling matches existing nodes
  - [ ] No console errors or warnings

- [ ] **Integration Review**
  - [ ] Node appears in palette correctly
  - [ ] Node can be added to canvas
  - [ ] Node can be configured
  - [ ] Node executes correctly in workflows
  - [ ] Node works with other nodes (connections, etc.)

### Migration Preparation

- [ ] **Prepare migration utilities** (for future Phase 5)
  - [ ] Create function to convert Select node to Form Input node with action='select'
  - [ ] Create function to convert Checkbox node to Form Input node with action='check'
  - [ ] Document migration path
  - [ ] Note: Actual migration will happen in Phase 5, but prepare utilities now

---

**Estimated Time**: 2-3 days for full implementation and testing

**Actual Time**: ~1 day for implementation (testing pending)

**Priority**: High (consolidates 3 nodes)

---

## Phase 3 Status Summary

**Implementation Status**: ✅ **COMPLETE** (Backend & Frontend)

**Completed Items**:

- ✅ Backend Implementation (100%)
- ✅ Frontend Implementation (100%)

**Pending Items**:

- ⏳ Testing & Validation (all test cases)
- ⏳ Documentation (user docs, API docs)
- ⏳ Migration Preparation (utilities for Phase 5)

**Next Steps**:

1. Perform comprehensive testing of all Form Input node features
2. Update user documentation
3. Prepare migration utilities for Phase 5

---

## Phase 4: Implement Remaining Consolidated Nodes - Detailed TODO

### 4.1 Navigation Node (Consolidates 7 nodes) - ✅ PARTIALLY COMPLETE

- [x] **Add NavigationNodeData interface** (`shared/src/types.ts`)
  - [x] Add `NAVIGATION` to `NodeType` enum
  - [x] Create `NavigationNodeData` interface with action dropdown and all properties
  - [x] Add to `NodeData` union type

- [x] **Create NavigationHandler** (`backend/src/nodes/browser.ts`)
  - [x] Implement all 7 actions: navigate, goBack, goForward, reload, newTab, switchTab, closeTab
  - [x] Handle tab management (context storage for new pages)
  - [x] Register in backend/src/nodes/index.ts

- [ ] **Frontend Implementation**
  - [ ] Create NavigationConfig component
  - [ ] Update CustomNode.tsx
  - [ ] Add to palette

### 4.2 Keyboard Node (New)

- [ ] **Add KeyboardNodeData interface** (`shared/src/types.ts`)
- [ ] **Create KeyboardHandler** (`backend/src/nodes/interaction.ts`)
- [ ] **Frontend Implementation**

### 4.3 Scroll Node (New)

- [ ] **Add ScrollNodeData interface** (`shared/src/types.ts`)
- [ ] **Create ScrollHandler** (`backend/src/nodes/interaction.ts`)
- [ ] **Frontend Implementation**

### 4.4 Screenshot Node (Enhanced)

- [ ] **Enhance ScreenshotNodeData** (`shared/src/types.ts`)
  - [ ] Add `action` dropdown: fullPage, element, viewport, pdf
  - [ ] Add action-specific properties

- [ ] **Enhance ScreenshotHandler** (`backend/src/nodes/utility.ts`)
  - [ ] Implement element screenshot, viewport screenshot, PDF generation

- [ ] **Frontend Implementation**
  - [ ] Update ScreenshotConfig component

### 4.5 Storage Node (Consolidates 8 nodes)

- [ ] **Add StorageNodeData interface** (`shared/src/types.ts`)
- [ ] **Create StorageHandler** (`backend/src/nodes/utility.ts`)
- [ ] **Frontend Implementation**

### 4.6 Dialog Node (New)

- [ ] **Add DialogNodeData interface** (`shared/src/types.ts`)
- [ ] **Create DialogHandler** (`backend/src/nodes/utility.ts`)
- [ ] **Frontend Implementation**

### 4.7 Download Node (New)

- [ ] **Add DownloadNodeData interface** (`shared/src/types.ts`)
- [ ] **Create DownloadHandler** (`backend/src/nodes/utility.ts`)
- [ ] **Frontend Implementation**

### 4.8 Iframe Node (Consolidates 2 nodes)

- [ ] **Add IframeNodeData interface** (`shared/src/types.ts`)
- [ ] **Create IframeHandler** (`backend/src/nodes/utility.ts`)
- [ ] **Frontend Implementation**

---

## Phase 5: Migration and Cleanup - Detailed TODO

- [x] **Create Migration Utilities** (`backend/src/utils/migration.ts`)
  - [x] Create `convertOldNodeToConsolidated` function
  - [x] Handle conversion for:
    - [x] Click → Action (action='click')
    - [x] Get Text → Element Query (action='getText')
    - [x] Navigate → Navigation (action='navigate')
    - [ ] Screenshot → Screenshot (action='fullPage') - when enhanced
    - [ ] Other node conversions (Select, Checkbox, Upload → Form Input)

- [x] **Migration Helper Functions**
  - [x] `migrateWorkflow` - Migrate entire workflow
  - [x] `isDeprecatedNodeType` - Check if node type is deprecated
  - [x] `getMigrationSuggestion` - Get migration suggestion for deprecated node

- [ ] **Workflow Load Migration** (`backend/src/engine/executor.ts` or workflow loader)
  - [ ] Auto-convert old nodes to new format on workflow load
  - [ ] Show migration warnings/logs
  - [ ] Integrate `migrateWorkflow` function into workflow loading

- [ ] **Deprecation Strategy**
  - [ ] Mark old node types as deprecated in enum (add @deprecated JSDoc)
  - [ ] Add deprecation warnings in UI (show warning when deprecated node is used)
  - [ ] Document migration path in user documentation
  - [ ] Set timeline for removal (e.g., 6 months deprecation period)

- [ ] **Cleanup** (Future - after deprecation period)
  - [ ] Remove old node handlers
  - [ ] Remove old node config components
  - [ ] Remove old node types from enum
  - [ ] Update documentation

---

**Estimated Time**: 5-7 days for Phase 4, 1-2 days for Phase 5

**Priority**: Medium-High (completes consolidation plan)

---

## Phase 2: Element Query Node Implementation - Status Summary

**Implementation Status**: ✅ **COMPLETE** (Backend & Frontend)

**Completed Items**:

- ✅ Backend Implementation (100%)
- ✅ Frontend Implementation (100%)

**Pending Items**:

- ⏳ Testing & Validation (all test cases)
- ⏳ Documentation (user docs, API docs)
- ⏳ Migration Preparation (utilities for Phase 5)

**Next Steps**:

1. Perform comprehensive testing of all Element Query node features
2. Update user documentation
3. Prepare migration utilities for Phase 5