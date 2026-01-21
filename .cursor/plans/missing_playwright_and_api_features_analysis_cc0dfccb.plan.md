---
name: Missing Playwright and API Features Analysis
overview: Comprehensive analysis of missing Playwright browser automation features and API testing capabilities that can be added as new nodes or extensions to existing nodes in the AutoMFlows system. Updated to reflect currently implemented features.
todos:
  - id: analyze-current-nodes
    content: Document current node implementation and Playwright API usage
    status: completed
  - id: identify-missing-features
    content: Identify missing Playwright browser automation features
    status: completed
  - id: identify-missing-api-features
    content: Identify missing API testing features and enhancements
    status: completed
  - id: prioritize-features
    content: Prioritize features by value and common use cases
    status: completed
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

## ✅ IMPLEMENTED FEATURES

The following features have been implemented and are available in the current codebase:

### 1. **Element Interaction Nodes** ✅

#### Enhanced Type Node ✅

- **Status**: IMPLEMENTED
- **Implementation**: Extended Type node with `inputMethod` option
- **Available Methods**:
- `fill` (default) - Clear and fill instantly
- `type` - Type character by character with delays
- `pressSequentially` - Type with configurable delays
- `append` - Append to existing value
- `prepend` - Prepend to existing value
- `direct` - Set value directly via DOM
- **Location**: `backend/src/nodes/interaction.ts` (TypeHandler)
- **Note**: `insertText` is available via Keyboard node, not Type node

#### Select/Dropdown Node ✅

- **Status**: IMPLEMENTED
- **Implementation**: Form Input node with `select` action
- **Features**: Single/multiple selection, select by value/label/index
- **Location**: `backend/src/nodes/interaction.ts` (FormInputHandler)

#### Checkbox/Radio Node ✅

- **Status**: IMPLEMENTED
- **Implementation**: Form Input node with `check`/`uncheck` actions
- **Location**: `backend/src/nodes/interaction.ts` (FormInputHandler)

#### Hover Node ✅

- **Status**: IMPLEMENTED
- **Implementation**: Action node with `hover` action
- **Location**: `backend/src/nodes/interaction.ts` (ActionHandler)

#### Double Click Node ✅

- **Status**: IMPLEMENTED
- **Implementation**: Action node with `doubleClick` action
- **Location**: `backend/src/nodes/interaction.ts` (ActionHandler)

#### Right Click Node ✅

- **Status**: IMPLEMENTED
- **Implementation**: Action node with `rightClick` action (button: 'right')
- **Location**: `backend/src/nodes/interaction.ts` (ActionHandler)

#### Keyboard Actions Node ✅

- **Status**: IMPLEMENTED
- **Implementation**: Dedicated Keyboard node
- **Available Actions**: press, type, insertText, shortcut, down, up
- **Location**: `backend/src/nodes/interaction.ts` (KeyboardHandler)

#### Drag and Drop Node ✅

- **Status**: IMPLEMENTED
- **Implementation**: Action node with `dragAndDrop` action
- **Features**: Drag to target element or coordinates
- **Location**: `backend/src/nodes/interaction.ts` (ActionHandler)

#### Upload File Node ✅

- **Status**: IMPLEMENTED
- **Implementation**: Form Input node with `upload` action
- **Features**: Single/multiple file upload via `setInputFiles`
- **Location**: `backend/src/nodes/interaction.ts` (FormInputHandler)

#### Scroll Node ✅

- **Status**: IMPLEMENTED
- **Implementation**: Dedicated Scroll node
- **Available Actions**: scrollToElement, scrollToPosition, scrollBy, scrollToTop, scrollToBottom
- **Location**: `backend/src/nodes/interaction.ts` (ScrollHandler)

### 2. **Element Query & Data Extraction Nodes** ✅

#### Get Attribute Node ✅

- **Status**: IMPLEMENTED
- **Implementation**: Element Query node with `getAttribute` action
- **Location**: `backend/src/nodes/utility.ts` (ElementQueryHandler)

#### Get All Text Node ✅

- **Status**: IMPLEMENTED
- **Implementation**: Element Query node with `getAllText` action
- **Location**: `backend/src/nodes/utility.ts` (ElementQueryHandler)

#### Get Count Node ✅

- **Status**: IMPLEMENTED
- **Implementation**: Element Query node with `getCount` action
- **Location**: `backend/src/nodes/utility.ts` (ElementQueryHandler)

#### Get Element State Node ✅

- **Status**: IMPLEMENTED
- **Implementation**: Element Query node with `isVisible`, `isEnabled`, `isChecked` actions
- **Location**: `backend/src/nodes/utility.ts` (ElementQueryHandler)

#### Get Element Bounding Box Node ✅

- **Status**: IMPLEMENTED
- **Implementation**: Element Query node with `getBoundingBox` action
- **Location**: `backend/src/nodes/utility.ts` (ElementQueryHandler)

### 3. **Page & Navigation Nodes** ✅

#### Go Back/Forward Node ✅

- **Status**: IMPLEMENTED
- **Implementation**: Navigation node with `goBack`/`goForward` actions
- **Location**: `backend/src/nodes/browser.ts` (NavigationHandler)

#### Reload Page Node ✅

- **Status**: IMPLEMENTED
- **Implementation**: Navigation node with `reload` action
- **Location**: `backend/src/nodes/browser.ts` (NavigationHandler)

#### New Tab/Window Node ✅

- **Status**: IMPLEMENTED
- **Implementation**: Navigation node with `newTab` action
- **Location**: `backend/src/nodes/browser.ts` (NavigationHandler)

#### Switch Tab/Window Node ✅

- **Status**: IMPLEMENTED
- **Implementation**: Navigation node with `switchTab` action
- **Features**: Switch by index or URL pattern
- **Location**: `backend/src/nodes/browser.ts` (NavigationHandler)

#### Close Tab Node ✅

- **Status**: IMPLEMENTED
- **Implementation**: Navigation node with `closeTab` action
- **Location**: `backend/src/nodes/browser.ts` (NavigationHandler)

### 4. **Cookies & Storage Nodes** ✅

#### Get Cookies Node ✅

- **Status**: IMPLEMENTED
- **Implementation**: Storage node with `getCookie` action
- **Features**: Get all cookies or cookie by name
- **Location**: `backend/src/nodes/utility.ts` (StorageHandler)

#### Set Cookie Node ✅

- **Status**: IMPLEMENTED
- **Implementation**: Storage node with `setCookie` action
- **Features**: Set single/multiple cookies with domain, path, expiry
- **Location**: `backend/src/nodes/utility.ts` (StorageHandler)

#### Clear Cookies Node ✅

- **Status**: IMPLEMENTED
- **Implementation**: Storage node with `clearCookies` action
- **Features**: Clear all cookies or cookies for specific domain
- **Location**: `backend/src/nodes/utility.ts` (StorageHandler)

#### Local Storage Node ✅

- **Status**: IMPLEMENTED
- **Implementation**: Storage node with `getLocalStorage`/`setLocalStorage`/`clearLocalStorage` actions
- **Location**: `backend/src/nodes/utility.ts` (StorageHandler)

#### Session Storage Node ✅

- **Status**: IMPLEMENTED
- **Implementation**: Storage node with `getSessionStorage`/`setSessionStorage`/`clearSessionStorage` actions
- **Location**: `backend/src/nodes/utility.ts` (StorageHandler)

### 5. **Iframe & Shadow DOM Nodes** ✅

#### Switch to Iframe Node ✅

- **Status**: IMPLEMENTED
- **Implementation**: Iframe node with `switchToIframe` action
- **Features**: Switch by selector, name, or URL pattern
- **Location**: `backend/src/nodes/utility.ts` (IframeHandler)

#### Get Iframe Content Node ✅

- **Status**: IMPLEMENTED
- **Implementation**: Iframe node with `getIframeContent` action
- **Location**: `backend/src/nodes/utility.ts` (IframeHandler)

#### Switch to Main Frame Node ✅

- **Status**: IMPLEMENTED
- **Implementation**: Iframe node with `switchToMainFrame` action
- **Location**: `backend/src/nodes/utility.ts` (IframeHandler)

### 6. **Advanced Browser Features** ✅

#### Download File Node ✅

- **Status**: IMPLEMENTED
- **Implementation**: Dedicated Download node
- **Available Actions**: waitForDownload, saveDownload, getDownloadPath
- **Location**: `backend/src/nodes/utility.ts` (DownloadHandler)

#### Handle Dialog Node ✅

- **Status**: IMPLEMENTED
- **Implementation**: Dedicated Dialog node
- **Available Actions**: accept, dismiss, prompt, waitForDialog
- **Location**: `backend/src/nodes/utility.ts` (DialogHandler)

#### Element Screenshot Node ✅

- **Status**: IMPLEMENTED
- **Implementation**: Screenshot node with `element` action
- **Features**: Screenshot element with mask support
- **Location**: `backend/src/nodes/utility.ts` (ScreenshotHandler)

#### PDF Generation Node ✅

- **Status**: IMPLEMENTED
- **Implementation**: Screenshot node with `pdf` action
- **Features**: Generate PDF with format, margins, landscape options
- **Location**: `backend/src/nodes/utility.ts` (ScreenshotHandler)

---

## Missing Playwright Features - High Priority

### 1. **Enhanced Type Node - Additional Methods**

**Note**: The Type node has been extended with multiple input methods (fill, type, pressSequentially, append, prepend, direct). However, the following method is still missing:

#### Insert Text Method (via Type Node)

- **Status**: PARTIALLY IMPLEMENTED
- **Current**: Available via Keyboard node (`insertText` action)
- **Missing**: Not available as a Type node input method option
- **Recommendation**: Add `insertText` as an option to Type node's `inputMethod` for consistency
- **Use Case**: Fast text input without keyboard events, performance testing

#### Clear Field Method

- **Status**: NOT IMPLEMENTED
- **Playwright API**: `locator.clear()` or `locator.fill('')`
- **Features**: Clear input field before typing (separate operation)
- **Use Case**: Clearing fields before new input, reset operations
- **Recommendation**: Add `clear` as a Type node action or extend with `clearFirst` option

### 2. **Network & Request Interception Nodes**

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

### 3. **Shadow DOM Nodes**

#### Shadow DOM Selector Node

- **Purpose**: Enhanced selector support for Shadow DOM
- **Playwright API**: `locator.locator()` (auto-pierces shadow DOM)
- **Features**:
- Select elements in Shadow DOM
- Chain selectors through shadow roots
- **Use Case**: Web components, modern frameworks

### 4. **Advanced Browser Features** ✅

#### Set Geolocation Node ✅

- **Status**: IMPLEMENTED
- **Implementation**: Context Manipulate node with `setGeolocation` action
- **Playwright API**: `context.setGeolocation()`
- **Features**:
- Set latitude/longitude
- Set accuracy
- **Use Case**: Location-based testing, geolocation features
- **Location**: `backend/src/nodes/browser.ts` (ContextManipulateHandler)

#### Set Permissions Node ✅

- **Status**: IMPLEMENTED
- **Implementation**: Context Manipulate node with `setPermissions` and `clearPermissions` actions
- **Playwright API**: `context.grantPermissions()`, `context.clearPermissions()`
- **Features**:
- Grant permissions (camera, microphone, notifications, etc.)
- Revoke permissions
- **Use Case**: Permission testing, media features
- **Location**: `backend/src/nodes/browser.ts` (ContextManipulateHandler)

#### Set Viewport Size Node ✅

- **Status**: IMPLEMENTED
- **Implementation**: Context Manipulate node with `setViewportSize` action
- **Playwright API**: `page.setViewportSize()`
- **Features**:
- Set width/height
- Responsive testing
- **Use Case**: Responsive design testing, viewport changes
- **Location**: `backend/src/nodes/browser.ts` (ContextManipulateHandler)

#### Emulate Device Node ✅

- **Status**: IMPLEMENTED
- **Implementation**: Context Manipulate node with `emulateDevice` action
- **Playwright API**: `browser.newContext({ ...devices['iPhone 12'] })`
- **Features**:
- Emulate device (iPhone, iPad, Android)
- Set user agent, viewport, device scale factor
- **Use Case**: Mobile testing, device-specific features
- **Location**: `backend/src/nodes/browser.ts` (ContextManipulateHandler)

#### Set User Agent Node ✅

- **Status**: IMPLEMENTED
- **Implementation**: Context Manipulate node with `setUserAgent` action
- **Playwright API**: `context.setExtraHTTPHeaders()`
- **Features**:
- Set custom user agent
- Mobile/desktop user agents
- **Use Case**: User agent testing, bot detection bypass
- **Location**: `backend/src/nodes/browser.ts` (ContextManipulateHandler)

#### Context Manipulate Node ✅

- **Status**: IMPLEMENTED
- **Implementation**: Unified node consolidating all browser context operations
- **Available Actions**:
  - `setGeolocation` - Set latitude/longitude/accuracy
  - `setPermissions` - Grant permissions
  - `clearPermissions` - Clear all permissions
  - `setViewportSize` - Change viewport dynamically
  - `setUserAgent` - Set custom user agent
  - `setLocale` - Set locale (e.g., "en-US")
  - `setTimezone` - Set timezone (IANA timezone ID)
  - `setColorScheme` - Set color scheme (light/dark/no-preference)
  - `setExtraHTTPHeaders` - Set custom HTTP headers
  - `createContext` - Create new browser context
  - `switchContext` - Switch to existing context
  - `saveState` - Save context state (cookies, storage) to file
  - `loadState` - Load context state from file
  - `emulateDevice` - Emulate device using Playwright devices API
  - `addInitScript` - Add JavaScript to run before page loads
- **Location**: `backend/src/nodes/browser.ts` (ContextManipulateHandler)
- **Frontend**: `frontend/src/components/nodeConfigs/ContextManipulateConfig.tsx`

### 5. **Visual & Screenshot Features**

#### Visual Comparison Node

- **Purpose**: Compare screenshots (visual regression)
- **Playwright API**: `expect(page).toHaveScreenshot()`
- **Features**:
- Compare with baseline image
- Threshold configuration
- Mask regions
- Generate diff images
- **Use Case**: Visual regression testing, UI consistency

### 6. **Performance & Monitoring Nodes**

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

1. **Switch Context Node** ✅ - Multiple browser contexts (IMPLEMENTED via Context Manipulate node)
2. **Authentication State Reuse** ✅ - Save/load browser state (IMPLEMENTED via Context Manipulate node)
3. **Shadow DOM & Iframe Interaction** - Enhanced iframe support
4. **Pixel-Perfect Snapshot Comparison** - Visual regression
5. **Responsive Design Testing** ✅ - Device emulation (IMPLEMENTED via Context Manipulate node)
6. **Network Interception** - Request/response mocking

---

## Implementation Priority Recommendations

### Phase 1 (High Value, Common Use Cases) - UPDATED

**Note**: Many Phase 1 features are already implemented. Remaining high-priority items:

1. **Intercept Request Node** - Network request mocking/modification
2. **Wait for Request/Response Node** - Wait for specific network requests
3. **Visual Comparison Node** - Visual regression testing
4. **Set Geolocation Node** ✅ - Location-based testing (IMPLEMENTED via Context Manipulate node)
5. **Set Permissions Node** ✅ - Browser permissions management (IMPLEMENTED via Context Manipulate node)

### Phase 2 (Advanced Interactions) - UPDATED

**Note**: Most Phase 2 features are already implemented. Remaining items:

1. **Capture Network Activity Node** - Record all network traffic
2. **Set Viewport Size Node** ✅ - Dynamic viewport changes (IMPLEMENTED via Context Manipulate node)
3. **Emulate Device Node** ✅ - Mobile device emulation (IMPLEMENTED via Context Manipulate node)
4. **Set User Agent Node** ✅ - User agent customization (IMPLEMENTED via Context Manipulate node)
5. **Shadow DOM Enhanced Support** - Better Shadow DOM selector handling

### Phase 3 (Advanced Features)

1. **Performance Metrics Node** - Capture performance data
2. **Console Logs Node** - Capture console output
3. **JavaScript Errors Node** - Capture uncaught errors
4. **Visual Comparison Node** - Screenshot comparison (if not in Phase 1)

### Phase 4 (API Enhancements)

1. **File Upload API Node** - Multipart form data uploads
2. **WebSocket Node** - WebSocket connections
3. **GraphQL Request Node** - GraphQL API support
4. **Response Parser Node** - JSONPath, XML parsing
5. **API Test Assertion Node** - API response validation
6. **OAuth Flow Node** - OAuth authentication
7. **JWT Token Node** - JWT generation/validation
8. **Basic Auth Node** - HTTP Basic Authentication
9. **API Key Auth Node** - API key authentication
10. **Streaming Response Node** - Handle streaming responses
11. **API Mock Server Node** - Create mock API servers
12. **Rate Limiting Node** - Handle rate limits

---

## Notes

### Implementation Patterns

- All new nodes should follow the existing pattern:
- Support CSS and XPath selectors
- Support retry mechanisms
- Support wait strategies (before/after)
- Support failSilently option
- Support variable interpolation
- Store results in context

- The codebase follows a pattern of extending existing nodes rather than creating separate nodes (e.g., Action node handles click, doubleClick, rightClick, hover, dragAndDrop; Form Input node handles select, check, uncheck, upload)

- Type node has been successfully extended with multiple input methods (fill, type, pressSequentially, append, prepend, direct)

### Key Implementation Insights

- **Network interception features** are particularly powerful for testing edge cases and mocking backend responses - these are still missing and high priority

- **Cookie and storage management nodes** are already implemented and essential for authentication workflows and state management

- **Visual comparison and screenshot features** - Element screenshots and PDF generation are implemented; visual comparison/regression testing is still missing

- **Performance and monitoring nodes** (metrics, console logs, JS errors) are missing and would be valuable for debugging and quality assurance

- **API enhancements** - Most API features are still missing (WebSocket, GraphQL, OAuth, JWT, streaming, etc.) and represent significant opportunities for expansion

### Summary Statistics

- **Implemented**: ~30+ browser automation features
- **Missing**: ~20+ browser automation features (primarily network interception, performance monitoring, advanced browser settings)
- **API Features**: Most API enhancements are still missing (~15+ features)