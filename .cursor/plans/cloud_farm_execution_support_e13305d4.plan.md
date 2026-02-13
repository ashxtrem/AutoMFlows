---
name: ""
overview: ""
todos: []
isProject: false
---

# Cloud Farm Execution Support

## Overview

Enable AutoMFlows to execute workflows on cloud farms (BrowserStack, LambdaTest) by connecting Playwright to remote browsers via WebSocket endpoints. This allows users to test on different browsers, OS combinations, and devices without managing local browser installations.

## Architecture

Playwright supports connecting to remote browsers using:

- **BrowserStack**: `chromium.connectOverCDP()` with WebSocket endpoint
- **LambdaTest**: `chromium.connect({ wsEndpoint: 'wss://...' })` with WebSocket endpoint

The system will support both local browser launch (current behavior) and remote browser connection (new feature).

## Implementation Plan

### 1. Update Type Definitions

**File**: `shared/src/types.ts`

Add cloud provider configuration to `OpenBrowserNodeData`:

```typescript
export interface OpenBrowserNodeData {
  // ... existing fields ...
  
  // Cloud provider configuration
  cloudProvider?: 'local' | 'browserstack' | 'lambdatest';
  cloudProviderEnabled?: boolean; // Toggle to enable/disable without deleting config
  cloudConfig?: {
    // BrowserStack specific
    browserstack?: {
      username?: string; // From env: BROWSERSTACK_USERNAME
      accessKey?: string; // From env: BROWSERSTACK_ACCESS_KEY
      wsEndpoint?: string; // WebSocket endpoint (optional, can be auto-generated)
      buildName?: string;
      projectName?: string;
      sessionName?: string;
      // Browser capabilities
      browserName?: string;
      browserVersion?: string;
      os?: string;
      osVersion?: string;
      resolution?: string;
      device?: string;
      // Tunnel configuration
      tunnelEnabled?: boolean; // Enable BrowserStack Local Testing tunnel
      tunnelName?: string; // Optional tunnel name identifier
    };
    
    // LambdaTest specific
    lambdatest?: {
      username?: string; // From env: LAMBDATEST_USERNAME
      accessKey?: string; // From env: LAMBDATEST_ACCESS_KEY
      wsEndpoint?: string; // WebSocket endpoint (optional, can be auto-generated)
      build?: string;
      name?: string;
      // Browser capabilities
      browserName?: string;
      browserVersion?: string;
      platform?: string;
      platformVersion?: string;
      resolution?: string;
      device?: string;
      // Tunnel configuration
      tunnelEnabled?: boolean; // Enable LambdaTest tunnel
      tunnelName?: string; // Optional tunnel name identifier
    };
  };
}
```

**Key design decisions**:

- `cloudProviderEnabled` allows disabling cloud provider without deleting saved configuration
- `cloudConfig` stores provider-specific configs separately, allowing switching providers without losing previous settings
- Default is `cloudProvider: 'local'` and `cloudProviderEnabled: false`

### 2. Frontend: Cloud Provider Modal Component

**File**: `frontend/src/components/CloudProviderModal.tsx` (new)

Create a modal component for configuring cloud providers:

**Features**:

- Provider selection (BrowserStack, LambdaTest) - modular design for easy extension
- Form fields for credentials (username, accessKey)
- Form fields for capabilities (browser, OS, version, etc.)
- Toggle to enable/disable cloud provider
- Save/Cancel buttons
- Preserve previous provider configs when switching

**Structure**:

```typescript
interface CloudProviderModalProps {
  node: Node;
  onSave: (config: CloudProviderConfig) => void;
  onClose: () => void;
}

// Provider types - extensible
type CloudProvider = 'local' | 'browserstack' | 'lambdatest';

// Configuration structure
interface CloudProviderConfig {
  cloudProvider: CloudProvider;
  cloudProviderEnabled: boolean;
  cloudConfig?: {
    browserstack?: BrowserStackConfig;
    lambdatest?: LambdaTestConfig;
  };
}
```

**UI Flow**:

1. Modal opens with provider selection dropdown
2. User selects provider (BrowserStack/LambdaTest)
3. Form appears with:
  - Enable/Disable toggle (default: disabled/local)
  - Credentials section (username, accessKey)
  - Capabilities section (browser, OS, version, etc.)
4. User can switch providers - previous provider's config is preserved
5. User can disable cloud provider - config remains saved but disabled
6. Save button updates node data

### 3. Frontend: Update OpenBrowserConfig Component

**File**: `frontend/src/components/nodeConfigs/OpenBrowserConfig.tsx`

Add a "Cloud Provider" button that opens the modal:

```typescript
// Add state for modal
const [showCloudProviderModal, setShowCloudProviderModal] = useState(false);

// Add button in the form
<div>
  <label className="block text-sm font-medium text-gray-300 mb-1">Cloud Provider</label>
  <button
    onClick={() => setShowCloudProviderModal(true)}
    className="w-full px-3 py-2 bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded text-white text-sm transition-colors"
  >
    {data.cloudProviderEnabled && data.cloudProvider && data.cloudProvider !== 'local' 
      ? `Configure ${data.cloudProvider.charAt(0).toUpperCase() + data.cloudProvider.slice(1)}` 
      : 'Configure Cloud Provider'}
    {data.cloudProviderEnabled && data.cloudProvider && data.cloudProvider !== 'local' && ' (Enabled)'}
  </button>
</div>

// Add modal component
{showCloudProviderModal && (
  <CloudProviderModal
    node={node}
    onSave={(config) => {
      // Update all cloud provider fields
      onChange('cloudProvider', config.cloudProvider);
      onChange('cloudProviderEnabled', config.cloudProviderEnabled);
      onChange('cloudConfig', config.cloudConfig);
      setShowCloudProviderModal(false);
    }}
    onClose={() => setShowCloudProviderModal(false)}
  />
)}
```

**Visual indicators**:

- Show provider name and "Enabled" status if cloud provider is active
- Button text changes based on current state

### 4. Frontend: Cloud Provider Modal Implementation Details

**Provider Selection**:

- Dropdown/radio buttons for provider selection
- Options: "Local (Default)", "BrowserStack", "LambdaTest"
- When switching providers, preserve previous provider's config

**Enable/Disable Toggle**:

- Checkbox/toggle at top of form
- When disabled, form fields are grayed out but values preserved
- Default: disabled (local execution)

**Credentials Form**:

- Username field
- Access Key field (password type)
- Optional: "Use environment variables" checkbox (for future enhancement)
- Values saved to node data

**Capabilities Form** (provider-specific):

- BrowserStack: browserName, browserVersion, os, osVersion, resolution, device, buildName, projectName, sessionName
- LambdaTest: browserName, browserVersion, platform, platformVersion, resolution, device, build, name
- Use appropriate input types (dropdowns for browser/OS, text for versions)

**Tunnel Configuration**:

- Checkbox: "Enable Tunnel" (for localhost/internal network testing)
- Tunnel Name field (optional, for identifying tunnel instances)
- Info text explaining tunnel requirements:
  - BrowserStack: Requires `browserstack-local` npm package and running tunnel process
  - LambdaTest: Requires LambdaTest tunnel binary (LT) to be running
- Warning if tunnel enabled but not running (detection in backend)

**State Management**:

- Load existing config from node data
- Preserve all provider configs when switching
- Only update the selected provider's config on save

### 5. Enhance PlaywrightManager

**File**: `backend/src/utils/playwright.ts`

Add methods to:

- Connect to remote browsers via WebSocket
- Generate WebSocket endpoints for BrowserStack/LambdaTest
- Support both local launch and remote connection

**Key changes**:

- Add `connectToRemoteBrowser()` method
- Modify `launch()` to check for `cloudProviderEnabled` and route accordingly
- Add helper methods for generating WebSocket endpoints
- Handle credential resolution from environment variables (prefer env vars, fallback to node data)

**Implementation approach**:

```typescript
async connectToRemoteBrowser(
  cloudProvider: 'browserstack' | 'lambdatest',
  cloudConfig: any,
  browserType: BrowserType,
  browserContextOptions: any
): Promise<Page>

// Helper methods
private generateBrowserStackEndpoint(config: any): string
private generateLambdaTestEndpoint(config: any): string
private resolveCredentials(provider: string, config: any): { username: string; accessKey: string }
```

**Launch logic update**:

```typescript
async launch(...) {
  // Check if cloud provider is enabled
  if (cloudProviderEnabled && cloudProvider && cloudProvider !== 'local') {
    return await this.connectToRemoteBrowser(cloudProvider, cloudConfig, browserType, browserContextOptions);
  }
  
  // Otherwise, use local launch (existing logic)
  // ... existing launch code ...
}
```

### 6. Update OpenBrowserHandler

**File**: `backend/src/nodes/browser.ts`

Modify `OpenBrowserHandler.execute()` to:

- Extract `cloudProvider`, `cloudProviderEnabled`, and `cloudConfig` from node data
- Pass cloud configuration to PlaywrightManager
- Handle credential resolution (prefer env vars, fallback to node data)

**Implementation**:

```typescript
const cloudProvider = data.cloudProvider || 'local';
const cloudProviderEnabled = data.cloudProviderEnabled === true;
const cloudConfig = data.cloudConfig || {};

// Pass to playwright.launch()
const page = await playwright.launch(
  headless,
  viewport,
  browserType,
  maxWindow,
  capabilities,
  stealthMode,
  launchOptions,
  jsScript,
  cloudProviderEnabled ? cloudProvider : 'local',
  cloudConfig
);
```

### 7. Credential Management

**Approach**: 

- Primary: Environment variables (`BROWSERSTACK_USERNAME`, `BROWSERSTACK_ACCESS_KEY`, etc.)
- Fallback: Node configuration (for flexibility, but less secure)
- Document security best practices

**Environment variables to support**:

- `BROWSERSTACK_USERNAME`
- `BROWSERSTACK_ACCESS_KEY`
- `LAMBDATEST_USERNAME`
- `LAMBDATEST_ACCESS_KEY`

**Credential resolution logic**:

```typescript
private resolveCredentials(provider: 'browserstack' | 'lambdatest', config: any): { username: string; accessKey: string } {
  if (provider === 'browserstack') {
    return {
      username: process.env.BROWSERSTACK_USERNAME || config.browserstack?.username || '',
      accessKey: process.env.BROWSERSTACK_ACCESS_KEY || config.browserstack?.accessKey || ''
    };
  } else if (provider === 'lambdatest') {
    return {
      username: process.env.LAMBDATEST_USERNAME || config.lambdatest?.username || '',
      accessKey: process.env.LAMBDATEST_ACCESS_KEY || config.lambdatest?.accessKey || ''
    };
  }
  throw new Error(`Unknown provider: ${provider}`);
}
```

### 8. Tunnel Support

**Overview**:
Tunnels allow cloud browsers to access localhost/internal URLs. Both providers require separate tunnel processes to be running.

**BrowserStack Tunnel**:

- Requires `browserstack-local` npm package
- Set `browserstackLocal: true` in capabilities
- Tunnel must be started separately: `browserstack-local --key <accessKey>`
- Or programmatically via `BrowserStackLocal` class from `browserstack-local` package

**LambdaTest Tunnel**:

- Requires LambdaTest tunnel binary (LT) downloaded separately
- Set `tunnel: true` in capabilities
- Tunnel must be started separately: `./LT --user <username> --key <accessKey> --tunnelName <name>`
- Or programmatically via LambdaTest tunnel API

**Implementation Approach**:

1. **Option A (Recommended)**: Document tunnel setup, require user to start tunnel manually
  - Add tunnel configuration to capabilities
  - Validate tunnel is running (optional check)
  - Document setup instructions
2. **Option B (Advanced)**: Auto-start tunnel process
  - Install `browserstack-local` package for BrowserStack
  - For LambdaTest, require tunnel binary path
  - Start tunnel process before connecting
  - Stop tunnel after execution completes
  - Handle tunnel lifecycle management

**Recommendation**: Start with Option A (manual tunnel setup) for simplicity, add Option B as future enhancement.

### 9. WebSocket Endpoint Generation

**BrowserStack**:

- Format: `wss://cdp.browserstack.com/playwright?capabilities=...`
- Requires capabilities object with browser/OS info
- Auto-generate if not provided in config
- Include `browserstackLocal: true` if tunnel is enabled

**LambdaTest**:

- Format: `wss://cdp.lambdatest.com/playwright?capabilities=...`
- Requires capabilities object with browser/OS info
- Auto-generate if not provided in config
- Include `tunnel: true` if tunnel is enabled

**Endpoint generation**:

```typescript
private generateBrowserStackEndpoint(config: any, credentials: { username: string; accessKey: string }): string {
  const bstackOptions: any = {
    userName: credentials.username,
    accessKey: credentials.accessKey,
    os: config.os || 'Windows',
    osVersion: config.osVersion || '10',
    resolution: config.resolution || '1920x1080',
    buildName: config.buildName || 'AutoMFlows Build',
    projectName: config.projectName || 'AutoMFlows',
    sessionName: config.sessionName || 'AutoMFlows Session'
  };
  
  // Add tunnel configuration if enabled
  if (config.tunnelEnabled) {
    bstackOptions.local = true;
    if (config.tunnelName) {
      bstackOptions.localIdentifier = config.tunnelName;
    }
  }
  
  const capabilities = {
    browserName: config.browserName || 'Chrome',
    browserVersion: config.browserVersion || 'latest',
    'bstack:options': bstackOptions
  };
  
  return `wss://cdp.browserstack.com/playwright?capabilities=${encodeURIComponent(JSON.stringify(capabilities))}`;
}

private generateLambdaTestEndpoint(config: any, credentials: { username: string; accessKey: string }): string {
  const ltOptions: any = {
    username: credentials.username,
    accessKey: credentials.accessKey,
    build: config.build || 'AutoMFlows Build',
    name: config.name || 'AutoMFlows Session',
    resolution: config.resolution || '1920x1080'
  };
  
  // Add tunnel configuration if enabled
  if (config.tunnelEnabled) {
    ltOptions.tunnel = true;
    if (config.tunnelName) {
      ltOptions.tunnelName = config.tunnelName;
    }
  }
  
  const capabilities = {
    browserName: config.browserName || 'Chrome',
    browserVersion: config.browserVersion || 'latest',
    platform: config.platform || 'Windows 10',
    'LT:Options': ltOptions
  };
  
  return `wss://cdp.lambdatest.com/playwright?capabilities=${encodeURIComponent(JSON.stringify(capabilities))}`;
}
```

### 10. Tunnel Validation (Optional Enhancement)

**Tunnel Status Check**:

- Before connecting, optionally verify tunnel is running
- BrowserStack: Check if `browserstack-local` process is active
- LambdaTest: Check if tunnel binary process is active
- Show warning if tunnel enabled but not detected
- Allow user to proceed anyway (tunnel might be running externally)

**Implementation** (Future Enhancement):

```typescript
private async validateTunnel(provider: 'browserstack' | 'lambdatest', config: any): Promise<boolean> {
  if (!config.tunnelEnabled) {
    return true; // No tunnel needed
  }
  
  if (provider === 'browserstack') {
    // Check if browserstack-local process is running
    // Or check if tunnel endpoint is accessible
    // Return true/false
  } else if (provider === 'lambdatest') {
    // Check if LambdaTest tunnel process is running
    // Return true/false
  }
  
  return false;
}
```

### 11. Error Handling

- Handle connection failures gracefully
- Provide clear error messages for missing credentials
- Validate cloud provider configuration
- Handle network timeouts
- Fallback to local execution if cloud connection fails (optional, or throw error)

### 12. Documentation Updates

- Update README with cloud provider setup instructions
- Add examples for BrowserStack and LambdaTest configurations
- Document environment variable requirements
- Add security best practices section
- Document UI workflow for configuring cloud providers
- **Tunnel Setup Guide**:
  - BrowserStack: Install `browserstack-local`, start tunnel process
  - LambdaTest: Download tunnel binary, start tunnel process
  - How to test localhost URLs with tunnels
  - Troubleshooting tunnel connection issues

## Implementation Details

### BrowserStack Connection Flow

1. User configures OpenBrowser node with `cloudProvider: 'browserstack'` and `cloudProviderEnabled: true`
2. System reads credentials from env vars or node config
3. Builds capabilities object from configuration
4. Generates WebSocket endpoint: `wss://cdp.browserstack.com/playwright?capabilities=...`
5. Connects using `chromium.connect({ wsEndpoint })`
6. Creates browser context and page as usual

### LambdaTest Connection Flow

1. User configures OpenBrowser node with `cloudProvider: 'lambdatest'` and `cloudProviderEnabled: true`
2. System reads credentials from env vars or node config
3. Builds capabilities object from configuration
4. Generates WebSocket endpoint: `wss://cdp.lambdatest.com/playwright?capabilities=...`
5. Connects using `chromium.connect({ wsEndpoint })`
6. Creates browser context and page as usual

### Local Execution (Default)

1. If `cloudProviderEnabled` is false or `cloudProvider` is 'local' or undefined
2. Use existing local browser launch logic
3. No changes to current behavior

### Tunnel Handling

**When Tunnel is Enabled**:

1. **BrowserStack**:
  - Add `local: true` to `bstack:options` in capabilities
  - If `tunnelName` is provided, add `localIdentifier: tunnelName`
  - User must have `browserstack-local` tunnel process running separately
  - Tunnel allows cloud browsers to access `localhost` URLs from user's machine
2. **LambdaTest**:
  - Add `tunnel: true` to `LT:Options` in capabilities
  - If `tunnelName` is provided, add `tunnelName` to `LT:Options`
  - User must have LambdaTest tunnel binary (LT) running separately
  - Tunnel allows cloud browsers to access `localhost` URLs from user's machine

**Tunnel Requirements**:

- Tunnels must be started **before** workflow execution
- Tunnels run as separate processes (not managed by AutoMFlows initially)
- Tunnels use secure protocols (WebSocket, HTTPS, SSH) to connect local network to cloud
- Tunnels enable testing of:
  - `localhost` URLs (e.g., `http://localhost:3000`)
  - Internal network URLs (e.g., `http://192.168.1.100:8080`)
  - Applications behind firewalls

**Error Handling**:

- If tunnel is enabled but not running, connection will fail
- Provide clear error message: "Tunnel is required but not detected. Please start the tunnel process."
- Document tunnel setup in error message or link to setup guide

**Future Enhancement** (Optional):

- Auto-detect if tunnel is running
- Auto-start tunnel process before execution
- Auto-stop tunnel after execution completes

## Testing Considerations

- Test with BrowserStack free tier account
- Test with LambdaTest free tier account
- Verify local browser launch still works (backward compatibility)
- Test error handling for invalid credentials
- Test error handling for network failures
- Test provider switching preserves configs
- Test enable/disable toggle functionality
- Test UI modal interactions

## Future Enhancements

- Support for Sauce Labs
- Support for other cloud providers
- Cloud provider capability presets (common browser/OS combinations)
- Session recording integration with cloud providers
- Environment variable UI integration (show if env vars are set)
- Cloud provider status indicator (connection health)
- **Auto-start tunnel processes** (Option B from tunnel section)
- **Tunnel status validation** before connecting
- **Tunnel lifecycle management** (start/stop tunnels automatically)

