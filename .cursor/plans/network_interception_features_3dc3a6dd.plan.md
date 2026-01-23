---
name: Network Interception Features
overview: "Implement comprehensive network interception capabilities using a hybrid approach: global network capture as Open Browser settings, and request/response interception as dedicated nodes."
todos:
  - id: phase1-backend-types
    content: Add network capture settings to OpenBrowserNodeData interface in shared/src/types.ts
    status: pending
  - id: phase1-backend-playwright
    content: Implement network capture event listeners in PlaywrightManager.launch()
    status: pending
  - id: phase1-backend-handler
    content: Update OpenBrowserHandler to pass network capture config to PlaywrightManager
    status: pending
  - id: phase1-frontend-config
    content: Add network capture UI controls to OpenBrowserConfig.tsx
    status: pending
  - id: phase2-types
    content: Define InterceptRequestNodeData interface in shared/src/types.ts
    status: pending
  - id: phase2-backend-handler
    content: Create InterceptRequestHandler in backend/src/nodes/network.ts
    status: pending
  - id: phase2-frontend-config
    content: Create InterceptRequestConfig.tsx component
    status: pending
  - id: phase2-register
    content: Register InterceptRequest handler in backend/src/nodes/index.ts
    status: pending
  - id: phase3-types
    content: Define InterceptResponseNodeData interface in shared/src/types.ts
    status: pending
  - id: phase3-backend-handler
    content: Create InterceptResponseHandler in backend/src/nodes/network.ts
    status: pending
  - id: phase3-frontend-config
    content: Create InterceptResponseConfig.tsx component
    status: pending
  - id: phase4-types
    content: Define WaitForNetworkNodeData interface in shared/src/types.ts
    status: pending
  - id: phase4-backend-handler
    content: Create WaitForNetworkHandler in backend/src/nodes/network.ts
    status: pending
  - id: phase4-frontend-config
    content: Create WaitForNetworkConfig.tsx component
    status: pending
  - id: testing
    content: Create test workflows for all network interception features
    status: pending
---

# Network Interception Features Implementation

## Overview

Based on your requirements for comprehensive network interception capabilities, I recommend a **hybrid approach**:

1. **Capture Network Activity** - Add as Open Browser setting (global monitoring)
2. **Intercept Request Node** - Dedicated node for request mocking/modification
3. **Intercept Response Node** - Dedicated node for response mocking/modification
4. **Wait for Network Node** - Dedicated node for waiting on specific requests/responses

## Architecture Decision

### Why Hybrid Approach?

**Global Network Capture (Setting)**

- Runs throughout entire workflow lifecycle
- No conditional logic needed
- Passive monitoring (doesn't modify traffic)
- Similar to video recording setting in Open Browser

**Request/Response Interception (Nodes)**

- Conditional based on workflow logic
- Active modification of network traffic
- Placed at specific workflow points
- Can be enabled/disabled dynamically
- Similar to other action nodes (Click, Type, etc.)

## Implementation Plan

### Phase 1: Global Network Capture (Open Browser Setting)

**Files to Modify:**

- [`backend/src/nodes/browser.ts`](backend/src/nodes/browser.ts) - OpenBrowserHandler
- [`backend/src/utils/playwright.ts`](backend/src/utils/playwright.ts) - PlaywrightManager
- [`frontend/src/components/nodeConfigs/OpenBrowserConfig.tsx`](frontend/src/components/nodeConfigs/OpenBrowserConfig.tsx)
- [`shared/src/types.ts`](shared/src/types.ts) - OpenBrowserNodeData interface

**Implementation Steps:**

1. **Add network capture settings to OpenBrowserNodeData**
```typescript
interface OpenBrowserNodeData {
  // ... existing fields
  captureNetwork?: boolean;
  networkCaptureConfig?: {
    captureRequests?: boolean;
    captureResponses?: boolean;
    captureRequestBody?: boolean;
    captureResponseBody?: boolean;
    urlPatterns?: string[]; // Filter patterns
    contextKey?: string; // Where to store captured data (default: 'networkActivity')
  };
}
```

2. **Implement network capture in PlaywrightManager.launch()**

Set up event listeners on context:

- `context.on('request', handler)` - Capture all requests
- `context.on('response', handler)` - Capture all responses
- Store captured data in ContextManager under configurable key

3. **Add UI controls in OpenBrowserConfig.tsx**

- Checkbox: "Capture Network Activity"
- Expandable section with:
  - Capture requests/responses toggles
  - Capture body content toggles
  - URL pattern filter (comma-separated)
  - Context key input

**Benefits:**

- Passive monitoring without workflow complexity
- Captured data available in `${variables.networkActivity}` for verification nodes
- No performance impact when disabled
- Similar UX to existing video recording feature

### Phase 2: Intercept Request Node

**Files to Create/Modify:**

- `backend/src/nodes/network.ts` - New file with InterceptRequestHandler
- `backend/src/nodes/index.ts` - Register new handler
- `frontend/src/components/nodeConfigs/InterceptRequestConfig.tsx` - New config component
- `shared/src/types.ts` - Add InterceptRequestNodeData interface

**Playwright API:**

```typescript
await page.route(urlPattern, async (route, request) => {
  // Options:
  // 1. Continue unchanged
  await route.continue();
  
  // 2. Modify request
  await route.continue({
    headers: { ...request.headers(), 'X-Custom': 'value' },
    postData: '{"modified": true}'
  });
  
  // 3. Abort request
  await route.abort('blocked');
  
  // 4. Mock response
  await route.fulfill({
    status: 200,
    body: '{"mocked": true}'
  });
});
```

**Node Configuration:**

```typescript
interface InterceptRequestNodeData {
  urlPattern: string; // Glob pattern or regex
  action: 'continue' | 'modify' | 'abort' | 'mock';
  
  // For 'modify' action
  modifyHeaders?: Record<string, string>;
  modifyBody?: string;
  modifyMethod?: string;
  
  // For 'abort' action
  abortReason?: 'failed' | 'aborted' | 'blocked' | 'timedout' | 'accessdenied';
  
  // For 'mock' action
  mockStatus?: number;
  mockHeaders?: Record<string, string>;
  mockBody?: string;
  mockBodyType?: 'json' | 'text' | 'html';
  
  // Storage
  captureOriginalRequest?: boolean;
  contextKey?: string; // Store intercepted request details
  
  // Options
  once?: boolean; // Only intercept first matching request
  failSilently?: boolean;
}
```

**Use Cases:**

- Mock API responses for testing error scenarios
- Add authentication headers dynamically
- Block analytics/tracking requests
- Test offline behavior

### Phase 3: Intercept Response Node

**Files to Create/Modify:**

- Add InterceptResponseHandler to `backend/src/nodes/network.ts`
- `frontend/src/components/nodeConfigs/InterceptResponseConfig.tsx` - New config component
- `shared/src/types.ts` - Add InterceptResponseNodeData interface

**Playwright API:**

```typescript
await page.route(urlPattern, async (route, request) => {
  // Fetch original response
  const response = await route.fetch();
  const body = await response.text();
  
  // Modify and fulfill
  await route.fulfill({
    response,
    status: 200,
    body: modifiedBody,
    headers: { ...response.headers(), 'X-Modified': 'true' }
  });
});
```

**Node Configuration:**

```typescript
interface InterceptResponseNodeData {
  urlPattern: string;
  action: 'continue' | 'modify' | 'capture';
  
  // For 'modify' action
  modifyStatus?: number;
  modifyHeaders?: Record<string, string>;
  modifyBody?: string;
  bodyTransform?: string; // JavaScript code to transform body
  
  // For 'capture' action
  captureHeaders?: boolean;
  captureBody?: boolean;
  contextKey: string; // Where to store response
  
  // Options
  once?: boolean;
  failSilently?: boolean;
}
```

**Use Cases:**

- Inject test data into API responses
- Modify response status for error testing
- Capture API responses for verification
- Transform response data

### Phase 4: Wait for Network Node

**Files to Create/Modify:**

- Add WaitForNetworkHandler to `backend/src/nodes/network.ts`
- `frontend/src/components/nodeConfigs/WaitForNetworkConfig.tsx` - New config component
- `shared/src/types.ts` - Add WaitForNetworkNodeData interface

**Playwright API:**

```typescript
// Wait for specific request
const request = await page.waitForRequest(
  request => request.url().includes('/api/data'),
  { timeout: 30000 }
);

// Wait for specific response
const response = await page.waitForResponse(
  response => response.url().includes('/api/data') && response.status() === 200,
  { timeout: 30000 }
);
```

**Node Configuration:**

```typescript
interface WaitForNetworkNodeData {
  waitType: 'request' | 'response';
  urlPattern: string; // Glob pattern or regex
  
  // Additional filters
  method?: string; // GET, POST, etc.
  statusCode?: number; // For responses
  
  // Capture options
  captureHeaders?: boolean;
  captureBody?: boolean;
  contextKey?: string; // Store captured request/response
  
  // Standard wait options
  timeout?: number;
  failSilently?: boolean;
}
```

**Use Cases:**

- Wait for GraphQL query to complete
- Verify specific API call was made
- Extract data from network response
- Synchronize workflow with async operations

## Implementation Notes

### Network Capture Storage Format

Store captured network activity as:

```typescript
{
  requests: [
    {
      url: string,
      method: string,
      headers: Record<string, string>,
      body?: string,
      timestamp: number
    }
  ],
  responses: [
    {
      url: string,
      status: number,
      statusText: string,
      headers: Record<string, string>,
      body?: string,
      timestamp: number,
      duration: number
    }
  ]
}
```

### Route Management

- Intercept nodes should call `page.route()` when executed
- Routes persist until page navigation or explicit `page.unroute()`
- Consider adding `unrouteAll` option to Navigation node
- Routes are context-specific (per page/tab)

### Pattern Matching

Support both:

- **Glob patterns**: `**/api/users/**` (user-friendly)
- **RegEx**: `/^https:\\/\\/api\\.example\\.com\\/users$/` (advanced)

### Variable Interpolation

All string fields should support variable interpolation:

- URL patterns: `${data.env.apiUrl}/users/**`
- Mock bodies: `{"userId": "${variables.userId}"}`
- Headers: `Authorization: Bearer ${variables.token}`

### Error Handling

- Route handlers should have try-catch with failSilently support
- Invalid patterns should throw descriptive errors
- Timeout on network waits with configurable default

## Testing Strategy

### Browser Tests

1. **Global Capture Test**

   - Enable network capture in Open Browser
   - Navigate and make API calls
   - Verify captured data in context

2. **Request Interception Test**

   - Add Intercept Request node to mock API
   - Verify page receives mocked response
   - Test abort and modify actions

3. **Response Interception Test**

   - Add Intercept Response node
   - Modify response data
   - Verify modified data appears in page

4. **Wait for Network Test**

   - Trigger async API call
   - Use Wait for Network node
   - Verify captured response data

### Example Workflow

```
[Start] 
  → [Open Browser] (captureNetwork: true)
  → [Intercept Request] (mock /api/login with success)
  → [Navigate] (to login page)
  → [Type] (username)
  → [Type] (password)
  → [Click] (login button)
  → [Wait for Network] (wait for /api/user/profile response)
  → [Verify] (check captured profile data)
  → [Intercept Response] (modify /api/products to inject test data)
  → [Navigate] (to products page)
  → [Verify] (check modified product data appears)
```

## Summary

This hybrid approach provides:

- **Global monitoring** via Open Browser settings (passive, workflow-wide)
- **Targeted interception** via dedicated nodes (active, conditional)
- **Comprehensive coverage** of all use cases (monitoring, mocking, modification, blocking)
- **Familiar patterns** consistent with existing node architecture
- **Flexibility** to enable features independently based on needs