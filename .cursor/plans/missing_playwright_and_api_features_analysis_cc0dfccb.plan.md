---
name: Missing Playwright and API Features Analysis
overview: Comprehensive analysis of missing Playwright browser automation features and API testing capabilities that can be added as new nodes or extensions to existing nodes in the AutoMFlows system.
todos:
  - id: analyze-current-nodes
    content: Document current node implementation and Playwright API usage
    status: pending
  - id: identify-missing-features
    content: Identify missing Playwright browser automation features
    status: pending
  - id: identify-missing-api-features
    content: Identify missing API testing features and enhancements
    status: pending
  - id: prioritize-features
    content: Prioritize features by value and common use cases
    status: pending
---

# Missing Playwright and API Features Analysis

## Current Implementation Summary

### Existing Browser Nodes

- **Open Browser**: Launch browser with viewport, stealth mode, custom scripts
- **Navigate**: Navigate to URLs with wait strategies
- **Click**: Click elements (CSS/XPath selectors)
- **Type**: Fill input fields (currently only uses `page.fill()` - clears and fills instantly)
- **Get Text**: Extract text content
- **Screenshot**: Capture screenshots (full page support)
- **Wait**: Wait for selectors, URLs, conditions, API responses

### Existing API Nodes

- **API Request**: HTTP requests (GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS)
- **API cURL**: Execute cURL commands

### Existing Utility Nodes

- **Verify**: Browser/API/Database verification strategies
- **JavaScript Code**: Execute custom JavaScript
- **Loop**: Iterate over arrays
- **Value Nodes**: Int/String/Boolean/Input value storage

---

## Missing Playwright Features - High Priority

### 1. **Element Interaction Nodes**

#### Enhanced Type Node / Text Input Methods

**Current Implementation**: The Type node only uses `page.fill()` which clears the field and types text instantly.

**Missing Text Input Methods**:

1. **Type with Keystrokes Node** (or extend Type node)

- **Playwright API**: `locator.type(text, options)` or `page.type(selector, text, options)`
- **Features**:
- Types character by character with delays (simulates real typing)
- Configurable delay between keystrokes
- Triggers keyboard events (keydown, keypress, keyup, input)
- Better for testing autocomplete, validation, or apps that listen to keyboard events
- **Use Case**: Testing autocomplete, real-time validation, apps that detect typing vs pasting

2. **Press Sequentially Node** (or extend Type node)

- **Playwright API**: `locator.pressSequentially(text, options)`
- **Features**:
- Same as `type()` but more explicit name
- Types with delays between keystrokes
- Configurable delay (default: 0ms, can be set to simulate human typing)
- **Use Case**: Human-like typing simulation, testing typing speed detection

3. **Insert Text Node** (or extend Type node)

- **Playwright API**: `page.keyboard.insertText(text)`
- **Features**:
- Inserts text without triggering keyboard events
- Faster than type() - doesn't fire keydown/keypress/keyup
- Only fires input event
- Useful for performance or when keyboard events cause issues
- **Use Case**: Fast text input, avoiding keyboard event handlers, performance testing

4. **Clear Field Node** (or extend Type node)

- **Playwright API**: `locator.clear()` or `locator.fill('')`
- **Features**:
- Clear input field before typing
- Separate clear operation (useful for append/prepend scenarios)
- **Use Case**: Clearing fields before new input, reset operations

5. **Append Text Node** (or extend Type node)

- **Playwright API**: `locator.fill(existingValue + newText)` or `locator.type(newText)` after focus
- **Features**:
- Append text to existing value
- Get current value, append, set new value
- **Use Case**: Adding to existing text, incremental input

6. **Prepend Text Node** (or extend Type node)

- **Playwright API**: `locator.fill(newText + existingValue)`
- **Features**:
- Prepend text to existing value
- Get current value, prepend, set new value
- **Use Case**: Adding prefix to existing text

7. **Direct Value Set Node** (or extend Type node)

- **Playwright API**: `page.evaluate((selector, value) => { element.value = value; }, selector, text)`
- **Features**:
- Sets value directly via DOM without events
- Bypasses all input events
- Fastest method but may not trigger validation
- **Use Case**: Setting values programmatically, bypassing event handlers, performance

8. **Type with Focus Node** (or extend Type node)

- **Playwright API**: `locator.focus()` then `page.keyboard.type(text)`
- **Features**:
- Focus element first, then type
- Ensures element is focused before typing
- Better for some frameworks that require focus
- **Use Case**: Ensuring focus before input, framework-specific requirements

**Recommended Implementation**:

- **Option 1**: Extend existing Type node with `inputMethod` option:
- `fill` (default, current behavior) - Clear and fill instantly
- `type` - Type character by character with delays
- `pressSequentially` - Type with configurable delays
- `insertText` - Insert without keyboard events
- `direct` - Set value directly via DOM
- `append` - Append to existing value
- `prepend` - Prepend to existing value
- **Option 2**: Create separate nodes for each method
- **Option 3**: Create a unified "Text Input" node with all methods

**Additional Options for Type Methods**:

- `delay`: Delay between keystrokes (for type/pressSequentially)
- `clearFirst`: Whether to clear field before typing (for fill/type)
- `noWaitAfter`: Skip waiting for navigation after input
- `timeout`: Timeout for the operation

#### Select/Dropdown Node

- **Purpose**: Select options from dropdowns/select elements
- **Playwright API**: `page.selectOption(selector, values)`
- **Features**:
- Single/multiple selection
- Select by value, label, or index
- Support for CSS/XPath selectors
- **Use Case**: Form filling, filter selection

#### Checkbox/Radio Node

- **Purpose**: Check/uncheck checkboxes and radio buttons
- **Playwright API**: `page.setChecked(selector, checked)`
- **Features**:
- Check/uncheck operations
- Verify checked state
- **Use Case**: Form interactions, settings configuration

#### Hover Node

- **Purpose**: Hover over elements to trigger hover states
- **Playwright API**: `page.hover(selector)` or `locator.hover()`
- **Features**:
- Hover with optional wait
- Trigger dropdown menus, tooltips
- **Use Case**: Navigation menus, hover-triggered UI elements

#### Double Click Node

- **Purpose**: Double-click elements
- **Playwright API**: `page.dblclick(selector)` or `locator.dblclick()`
- **Features**:
- Double-click with timeout
- Support for CSS/XPath
- **Use Case**: File selection, special interactions

#### Right Click / Context Menu Node

- **Purpose**: Right-click to open context menus
- **Playwright API**: `page.click(selector, { button: 'right' })`
- **Features**:
- Right-click operation
- Context menu interaction
- **Use Case**: Context menus, right-click actions

#### Keyboard Actions Node

- **Purpose**: Send keyboard keys, shortcuts, special keys
- **Playwright API**: `page.keyboard.press()`, `page.keyboard.type()`, `page.keyboard.down()`
- **Features**:
- Key presses (Enter, Tab, Escape, etc.)
- Keyboard shortcuts (Ctrl+C, Cmd+V)
- Key combinations
- Type text with keyboard events
- **Use Case**: Keyboard navigation, shortcuts, special key handling

#### Drag and Drop Node

- **Purpose**: Drag elements and drop them
- **Playwright API**: `locator.dragTo(target)` or `page.dragAndDrop(source, target)`
- **Features**:
- Drag source to target
- Drag with coordinates
- Support for CSS/XPath selectors
- **Use Case**: File uploads, reordering lists, drag-drop interfaces

#### Upload File Node

- **Purpose**: Upload files via file input
- **Playwright API**: `page.setInputFiles(selector, files)`
- **Features**:
- Single/multiple file upload
- File path or buffer support
- **Use Case**: File upload forms, document submission

#### Scroll Node

- **Purpose**: Scroll page or elements
- **Playwright API**: `page.evaluate(() => window.scrollTo())`, `locator.scrollIntoViewIfNeeded()`
- **Features**:
- Scroll to element
- Scroll to position (x, y)
- Scroll by amount
- Smooth scrolling
- **Use Case**: Infinite scroll, lazy-loaded content, element visibility

### 2. **Element Query & Data Extraction Nodes**

#### Get Attribute Node

- **Purpose**: Extract element attributes
- **Playwright API**: `locator.getAttribute(name)`
- **Features**:
- Get any attribute value
- Support for CSS/XPath
- Store in context variable
- **Use Case**: Extract href, data attributes, IDs

#### Get All Text Node

- **Purpose**: Get text from multiple elements
- **Playwright API**: `locator.allTextContents()` or `page.locator(selector).allTextContents()`
- **Features**:
- Extract text from all matching elements
- Return as array
- **Use Case**: Extract list items, table rows, multiple elements

#### Get Count Node

- **Purpose**: Count matching elements
- **Playwright API**: `locator.count()`
- **Features**:
- Count elements matching selector
- Store count in variable
- **Use Case**: Verify number of items, pagination checks

#### Get Element State Node

- **Purpose**: Check element states (visible, enabled, checked, etc.)
- **Playwright API**: `locator.isVisible()`, `locator.isEnabled()`, `locator.isChecked()`
- **Features**:
- Check visibility, enabled state, checked state
- Return boolean
- **Use Case**: Conditional logic based on element state

#### Get Element Bounding Box Node

- **Purpose**: Get element position and size
- **Playwright API**: `locator.boundingBox()`
- **Features**:
- Get x, y, width, height
- Store coordinates
- **Use Case**: Visual verification, element positioning

### 3. **Page & Navigation Nodes**

#### Go Back/Forward Node

- **Purpose**: Browser navigation (back/forward)
- **Playwright API**: `page.goBack()`, `page.goForward()`
- **Features**:
- Navigate browser history
- Wait for navigation
- **Use Case**: Multi-page workflows, history navigation

#### Reload Page Node

- **Purpose**: Reload current page
- **Playwright API**: `page.reload()`
- **Features**:
- Reload with wait options
- Wait until conditions
- **Use Case**: Refresh data, retry page load

#### New Tab/Window Node

- **Purpose**: Open new tabs/windows
- **Playwright API**: `context.newPage()`, `page.evaluate(() => window.open())`
- **Features**:
- Open new tab
- Switch between tabs
- Close tabs
- **Use Case**: Multi-tab workflows, popup handling

#### Switch Tab/Window Node

- **Purpose**: Switch between open tabs/windows
- **Playwright API**: `context.pages()`, page switching
- **Features**:
- Switch by index or URL pattern
- Get all open tabs
- **Use Case**: Multi-tab automation

#### Close Tab Node

- **Purpose**: Close current or specific tab
- **Playwright API**: `page.close()`
- **Features**:
- Close current tab
- Close tab by index
- **Use Case**: Cleanup, tab management

### 4. **Network & Request Interception Nodes**

#### Intercept Request Node

- **Purpose**: Mock/modify network requests
- **Playwright API**: `page.route(url, handler)`
- **Features**:
- Intercept requests by URL pattern
- Modify request (headers, body)
- Mock responses
- Abort requests
- Continue requests unchanged
- **Use Case**: API mocking, testing error scenarios, blocking ads

#### Intercept Response Node

- **Purpose**: Capture and modify responses
- **Playwright API**: `page.route(url, handler)` with `route.fulfill()`
- **Features**:
- Capture response data
- Modify response (status, headers, body)
- Store response in context
- **Use Case**: Response modification, data injection

#### Wait for Request Node

- **Purpose**: Wait for specific network requests
- **Playwright API**: `page.waitForRequest(url)`, `page.waitForResponse(url)`
- **Features**:
- Wait for request by URL pattern
- Wait for response
- Extract request/response data
- **Use Case**: Verify API calls, wait for async operations

#### Capture Network Activity Node

- **Purpose**: Record all network requests/responses
- **Playwright API**: `context.on('request')`, `context.on('response')`
- **Features**:
- Capture all network traffic
- Filter by URL pattern
- Store in context as array
- **Use Case**: API monitoring, performance analysis, debugging

### 5. **Cookies & Storage Nodes**

#### Get Cookies Node

- **Purpose**: Read cookies
- **Playwright API**: `context.cookies()`, `page.context().cookies()`
- **Features**:
- Get all cookies
- Get cookie by name
- Get cookies for specific URL
- Store in context
- **Use Case**: Cookie verification, session management

#### Set Cookie Node

- **Purpose**: Set cookies
- **Playwright API**: `context.addCookies(cookies)`
- **Features**:
- Set single/multiple cookies
- Set domain, path, expiry
- **Use Case**: Authentication, session management

#### Clear Cookies Node

- **Purpose**: Clear cookies
- **Playwright API**: `context.clearCookies()`
- **Features**:
- Clear all cookies
- Clear cookies for specific domain
- **Use Case**: Logout, session cleanup

#### Local Storage Node

- **Purpose**: Read/write localStorage
- **Playwright API**: `page.evaluate(() => localStorage.getItem(key))`
- **Features**:
- Get localStorage value
- Set localStorage value
- Clear localStorage
- Get all keys
- **Use Case**: State management, authentication tokens

#### Session Storage Node

- **Purpose**: Read/write sessionStorage
- **Playwright API**: `page.evaluate(() => sessionStorage.getItem(key))`
- **Features**:
- Get sessionStorage value
- Set sessionStorage value
- Clear sessionStorage
- **Use Case**: Session data management

### 6. **Iframe & Shadow DOM Nodes**

#### Switch to Iframe Node

- **Purpose**: Switch context to iframe
- **Playwright API**: `page.frameLocator()`, `page.frames()`
- **Features**:
- Switch to iframe by selector or name
- Switch back to main frame
- Nested iframe support
- **Use Case**: Payment gateways, embedded content, nested frames

#### Get Iframe Content Node

- **Purpose**: Extract content from iframe
- **Playwright API**: `frame.locator()`, `frame.textContent()`
- **Features**:
- Access iframe elements
- Extract iframe content
- **Use Case**: Embedded widget interaction

#### Shadow DOM Selector Node

- **Purpose**: Enhanced selector support for Shadow DOM
- **Playwright API**: `locator.locator()` (auto-pierces shadow DOM)
- **Features**:
- Select elements in Shadow DOM
- Chain selectors through shadow roots
- **Use Case**: Web components, modern frameworks

### 7. **Advanced Browser Features**

#### Download File Node

- **Purpose**: Handle file downloads
- **Playwright API**: `page.waitForEvent('download')`
- **Features**:
- Wait for download
- Get download path
- Save download
- Verify download
- **Use Case**: File downloads, export functionality

#### Handle Dialog Node

- **Purpose**: Handle alerts, confirms, prompts
- **Playwright API**: `page.on('dialog', handler)`
- **Features**:
- Accept/dismiss dialogs
- Get dialog message
- Input text for prompts
- **Use Case**: Alert handling, confirmation dialogs

#### Set Geolocation Node

- **Purpose**: Set browser geolocation
- **Playwright API**: `context.setGeolocation()`
- **Features**:
- Set latitude/longitude
- Set accuracy
- **Use Case**: Location-based testing, geolocation features

#### Set Permissions Node

- **Purpose**: Grant/deny browser permissions
- **Playwright API**: `context.grantPermissions()`
- **Features**:
- Grant permissions (camera, microphone, notifications, etc.)
- Revoke permissions
- **Use Case**: Permission testing, media features

#### Set Viewport Size Node

- **Purpose**: Change viewport size dynamically
- **Playwright API**: `page.setViewportSize()`
- **Features**:
- Set width/height
- Responsive testing
- **Use Case**: Responsive design testing, viewport changes

#### Emulate Device Node

- **Purpose**: Emulate mobile devices
- **Playwright API**: `context = await browser.newContext({ ...devices['iPhone 12'] })`
- **Features**:
- Emulate device (iPhone, iPad, Android)
- Set user agent, viewport, device scale factor
- **Use Case**: Mobile testing, device-specific features

#### Set User Agent Node

- **Purpose**: Change user agent
- **Playwright API**: `context.setExtraHTTPHeaders()` or context options
- **Features**:
- Set custom user agent
- Mobile/desktop user agents
- **Use Case**: User agent testing, bot detection bypass

### 8. **Visual & Screenshot Features**

#### Element Screenshot Node

- **Purpose**: Screenshot specific element
- **Playwright API**: `locator.screenshot()`
- **Features**:
- Screenshot element only
- Full page screenshot (existing)
- Screenshot with mask
- **Use Case**: Component screenshots, element-level visual testing

#### Visual Comparison Node

- **Purpose**: Compare screenshots (visual regression)
- **Playwright API**: `expect(page).toHaveScreenshot()`
- **Features**:
- Compare with baseline image
- Threshold configuration
- Mask regions
- Generate diff images
- **Use Case**: Visual regression testing, UI consistency

#### PDF Generation Node

- **Purpose**: Generate PDF from page
- **Playwright API**: `page.pdf()`
- **Features**:
- Generate PDF
- Configure format, margins
- Save PDF file
- **Use Case**: Report generation, document export

### 9. **Performance & Monitoring Nodes**

#### Performance Metrics Node

- **Purpose**: Capture performance metrics
- **Playwright API**: `page.metrics()`, `page.evaluate(() => performance.timing)`
- **Features**:
- Get load time, DOM content loaded
- Get performance timing API data
- Store metrics in context
- **Use Case**: Performance testing, load time verification

#### Console Logs Node

- **Purpose**: Capture console logs
- **Playwright API**: `page.on('console', handler)`
- **Features**:
- Capture console.log, console.error, etc.
- Filter by log level
- Store logs in context
- **Use Case**: Debugging, error detection

#### JavaScript Errors Node

- **Purpose**: Capture JavaScript errors
- **Playwright API**: `page.on('pageerror', handler)`
- **Features**:
- Capture uncaught errors
- Store error details
- **Use Case**: Error monitoring, quality assurance

---

## Missing API Features - High Priority

### 1. **Advanced HTTP Features**

#### File Upload API Node

- **Purpose**: Upload files via API
- **Features**:
- Multipart form data
- File path or buffer
- Progress tracking
- **Use Case**: File upload APIs, document APIs

#### Streaming Response Node

- **Purpose**: Handle streaming responses
- **Features**:
- Stream large responses
- Process chunks
- Save to file
- **Use Case**: Large file downloads, streaming APIs

#### WebSocket Node

- **Purpose**: WebSocket connections
- **Features**:
- Connect to WebSocket
- Send/receive messages
- Close connection
- **Use Case**: Real-time APIs, chat applications

#### GraphQL Request Node

- **Purpose**: GraphQL API requests
- **Features**:
- GraphQL query/mutation
- Variables support
- GraphQL-specific error handling
- **Use Case**: GraphQL APIs

### 2. **Authentication & Security**

#### OAuth Flow Node

- **Purpose**: OAuth authentication
- **Features**:
- OAuth 2.0 flow
- Token exchange
- Refresh tokens
- **Use Case**: OAuth authentication

#### JWT Token Node

- **Purpose**: Generate/validate JWT tokens
- **Features**:
- Generate JWT
- Decode JWT
- Validate signature
- **Use Case**: JWT-based authentication

#### Basic Auth Node

- **Purpose**: HTTP Basic Authentication
- **Features**:
- Username/password encoding
- Authorization header
- **Use Case**: Basic auth APIs

#### API Key Auth Node

- **Purpose**: API key authentication
- **Features**:
- Header-based API keys
- Query parameter API keys
- **Use Case**: API key authentication

### 3. **Request/Response Processing**

#### Request Builder Node

- **Purpose**: Build complex requests
- **Features**:
- Chain request modifications
- Conditional headers
- Dynamic body construction
- **Use Case**: Complex API workflows

#### Response Parser Node

- **Purpose**: Parse responses
- **Features**:
- JSON parsing with JSONPath
- XML parsing
- HTML parsing
- Extract specific fields
- **Use Case**: Response data extraction

#### Response Validator Node

- **Purpose**: Validate API responses
- **Features**:
- Schema validation (JSON Schema)
- Status code validation
- Header validation
- Body structure validation
- **Use Case**: API contract testing

#### Response Transform Node

- **Purpose**: Transform response data
- **Features**:
- Data transformation
- Field mapping
- Data aggregation
- **Use Case**: Data processing, ETL workflows

### 4. **API Testing Enhancements**

#### API Test Assertion Node

- **Purpose**: Assertions for API tests
- **Features**:
- Status code assertions
- Response time assertions
- Body content assertions
- Header assertions
- **Use Case**: API test validation

#### API Mock Server Node

- **Purpose**: Create mock API servers
- **Features**:
- Mock endpoints
- Response templates
- Dynamic responses
- **Use Case**: Frontend testing, API mocking

#### Rate Limiting Node

- **Purpose**: Handle rate limiting
- **Features**:
- Retry with backoff
- Rate limit detection
- Wait for rate limit reset
- **Use Case**: Rate-limited APIs

---

## Features from TODO.md (Already Planned)

1. **Switch Context Node** - Multiple browser contexts
2. **Authentication State Reuse** - Save/load browser state
3. **Shadow DOM & Iframe Interaction** - Enhanced iframe support
4. **Pixel-Perfect Snapshot Comparison** - Visual regression
5. **Responsive Design Testing** - Device emulation
6. **Network Interception** - Request/response mocking

---

## Implementation Priority Recommendations

### Phase 1 (High Value, Common Use Cases)

1. **Enhanced Type Node** - Add text input methods (type, pressSequentially, insertText, append, prepend, direct)
2. Select/Dropdown Node
3. Checkbox/Radio Node
4. Hover Node
5. Upload File Node
6. Get Attribute Node
7. Get Cookies Node / Set Cookie Node
8. Intercept Request Node
9. Switch to Iframe Node

### Phase 2 (Advanced Interactions)

1. Drag and Drop Node
2. Keyboard Actions Node
3. Scroll Node
4. New Tab/Window Node
5. Download File Node
6. Handle Dialog Node
7. Local Storage Node / Session Storage Node

### Phase 3 (Advanced Features)

1. Visual Comparison Node
2. Performance Metrics Node
3. Network Activity Capture Node
4. Emulate Device Node
5. PDF Generation Node

### Phase 4 (API Enhancements)

1. File Upload API Node
2. WebSocket Node
3. GraphQL Request Node
4. Response Parser Node
5. API Test Assertion Node

---

## Notes

- All new nodes should follow the existing pattern:
- Support CSS and XPath selectors
- Support retry mechanisms
- Support wait strategies (before/after)
- Support failSilently option
- Support variable interpolation
- Store results in context

- Consider extending existing nodes rather than creating new ones where appropriate (e.g., extend Click node to support double-click, right-click; extend Type node to support multiple text input methods)

- Network interception features are particularly powerful for testing edge cases and mocking backend responses

- Cookie and storage management nodes are essential for authentication workflows and state management

- Visual comparison and screenshot features enhance testing capabilities significantly