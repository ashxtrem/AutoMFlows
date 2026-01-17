// Property Data Types
export enum PropertyDataType {
  INT = 'int',
  FLOAT = 'float',
  DOUBLE = 'double',
  STRING = 'string',
  BOOLEAN = 'boolean',
}

// Node Types
export enum NodeType {
  START = 'start',
  OPEN_BROWSER = 'openBrowser',
  TYPE = 'type',
  SCREENSHOT = 'screenshot',
  WAIT = 'wait',
  JAVASCRIPT_CODE = 'javascriptCode',
  LOOP = 'loop',
  INT_VALUE = 'intValue',
  STRING_VALUE = 'stringValue',
  BOOLEAN_VALUE = 'booleanValue',
  INPUT_VALUE = 'inputValue',
  VERIFY = 'verify',
  API_REQUEST = 'apiRequest',
  API_CURL = 'apiCurl',
  LOAD_CONFIG_FILE = 'loadConfigFile',
  SELECT_CONFIG_FILE = 'selectConfigFile',
  DB_CONNECT = 'dbConnect',
  DB_DISCONNECT = 'dbDisconnect',
  DB_QUERY = 'dbQuery',
  ACTION = 'action',
  ELEMENT_QUERY = 'elementQuery',
  FORM_INPUT = 'formInput',
  NAVIGATION = 'navigation',
  KEYBOARD = 'keyboard',
  SCROLL = 'scroll',
  STORAGE = 'storage',
  DIALOG = 'dialog',
  DOWNLOAD = 'download',
  IFRAME = 'iframe',
}

// Base Node Interface
export interface BaseNode {
  id: string;
  type: NodeType | string; // Support both enum and custom plugin node types
  position: { x: number; y: number };
  data: NodeData | Record<string, any>; // Support custom plugin node data
}

// Node Data Types
export interface StartNodeData {
  label?: string;
  recordSession?: boolean; // Enable video recording
  screenshotAllNodes?: boolean; // Enable screenshots on all nodes
  screenshotTiming?: 'pre' | 'post' | 'both'; // When to take screenshots
}

export interface OpenBrowserNodeData {
  headless?: boolean;
  viewportWidth?: number;
  viewportHeight?: number;
  maxWindow?: boolean;
  browser?: 'chromium' | 'firefox' | 'webkit';
  capabilities?: Record<string, any>; // Context options (browser.newContext())
  launchOptions?: Record<string, any>; // Launch options (browser.launch())
  stealthMode?: boolean;
  jsScript?: string; // JavaScript script to inject into all pages
  _inputConnections?: {
    [propertyName: string]: {
      sourceNodeId: string;
      sourceHandleId: string;
    };
  };
}

export interface NavigateNodeData {
  url: string;
  timeout?: number;
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle' | 'commit';
  failSilently?: boolean;
  referer?: string;
  waitForSelector?: string;
  waitForSelectorType?: 'css' | 'xpath';
  waitForSelectorTimeout?: number;
  waitForUrl?: string; // Supports regex patterns
  waitForUrlTimeout?: number;
  waitForCondition?: string; // JavaScript code
  waitForConditionTimeout?: number;
  waitStrategy?: 'sequential' | 'parallel';
  waitAfterOperation?: boolean; // false = wait before (default), true = wait after
  retryEnabled?: boolean;
  retryStrategy?: 'count' | 'untilCondition';
  retryCount?: number;
  retryUntilCondition?: {
    type: 'selector' | 'url' | 'javascript';
    value: string;
    selectorType?: 'css' | 'xpath';
    timeout?: number;
  };
  retryDelay?: number;
  retryDelayStrategy?: 'fixed' | 'exponential';
  retryMaxDelay?: number;
  _inputConnections?: {
    [propertyName: string]: {
      sourceNodeId: string;
      sourceHandleId: string;
    };
  };
}

export interface NavigationNodeData {
  action: 'navigate' | 'goBack' | 'goForward' | 'reload' | 'newTab' | 'switchTab' | 'closeTab';
  timeout?: number;
  failSilently?: boolean;
  // Action-specific properties
  url?: string; // For navigate/newTab actions
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle' | 'commit'; // For navigate/goBack/goForward/reload
  referer?: string; // For navigate action
  tabIndex?: number; // For switchTab/closeTab actions
  urlPattern?: string; // For switchTab action
  contextKey?: string; // For newTab/switchTab actions (store page reference)
  // Advanced Waiting Options
  waitForSelector?: string;
  waitForSelectorType?: 'css' | 'xpath';
  waitForSelectorTimeout?: number;
  waitForUrl?: string;
  waitForUrlTimeout?: number;
  waitForCondition?: string;
  waitForConditionTimeout?: number;
  waitStrategy?: 'sequential' | 'parallel';
  waitAfterOperation?: boolean; // false = wait before (default), true = wait after
  // Retry Configuration
  retryEnabled?: boolean;
  retryStrategy?: 'count' | 'untilCondition';
  retryCount?: number;
  retryUntilCondition?: {
    type: 'selector' | 'url' | 'javascript';
    value: string;
    selectorType?: 'css' | 'xpath';
    timeout?: number;
  };
  retryDelay?: number;
  retryDelayStrategy?: 'fixed' | 'exponential';
  retryMaxDelay?: number;
  _inputConnections?: {
    [propertyName: string]: {
      sourceNodeId: string;
      sourceHandleId: string;
    };
  };
}

export interface KeyboardNodeData {
  action: 'press' | 'type' | 'insertText' | 'shortcut' | 'down' | 'up';
  timeout?: number;
  failSilently?: boolean;
  // Action-specific properties
  key?: string; // For press/down/up actions
  text?: string; // For type/insertText actions
  shortcut?: string; // For shortcut action (e.g., "Control+C", "Meta+V")
  selector?: string; // Optional - focus element first before action
  selectorType?: 'css' | 'xpath'; // Selector type
  delay?: number; // For type action - delay between keystrokes
  // Advanced Waiting Options
  waitForSelector?: string;
  waitForSelectorType?: 'css' | 'xpath';
  waitForSelectorTimeout?: number;
  waitForUrl?: string;
  waitForUrlTimeout?: number;
  waitForCondition?: string;
  waitForConditionTimeout?: number;
  waitStrategy?: 'sequential' | 'parallel';
  waitAfterOperation?: boolean;
  // Retry Configuration
  retryEnabled?: boolean;
  retryStrategy?: 'count' | 'untilCondition';
  retryCount?: number;
  retryUntilCondition?: {
    type: 'selector' | 'url' | 'javascript';
    value: string;
    selectorType?: 'css' | 'xpath';
    timeout?: number;
  };
  retryDelay?: number;
  retryDelayStrategy?: 'fixed' | 'exponential';
  retryMaxDelay?: number;
  _inputConnections?: {
    [propertyName: string]: {
      sourceNodeId: string;
      sourceHandleId: string;
    };
  };
}

export interface ScrollNodeData {
  action: 'scrollToElement' | 'scrollToPosition' | 'scrollBy' | 'scrollToTop' | 'scrollToBottom';
  timeout?: number;
  failSilently?: boolean;
  // Action-specific properties
  selector?: string; // For scrollToElement action
  selectorType?: 'css' | 'xpath'; // For scrollToElement action
  x?: number; // For scrollToPosition action
  y?: number; // For scrollToPosition action
  deltaX?: number; // For scrollBy action
  deltaY?: number; // For scrollBy action
  // Advanced Waiting Options
  waitForSelector?: string;
  waitForSelectorType?: 'css' | 'xpath';
  waitForSelectorTimeout?: number;
  waitForUrl?: string;
  waitForUrlTimeout?: number;
  waitForCondition?: string;
  waitForConditionTimeout?: number;
  waitStrategy?: 'sequential' | 'parallel';
  waitAfterOperation?: boolean;
  // Retry Configuration
  retryEnabled?: boolean;
  retryStrategy?: 'count' | 'untilCondition';
  retryCount?: number;
  retryUntilCondition?: {
    type: 'selector' | 'url' | 'javascript';
    value: string;
    selectorType?: 'css' | 'xpath';
    timeout?: number;
  };
  retryDelay?: number;
  retryDelayStrategy?: 'fixed' | 'exponential';
  retryMaxDelay?: number;
  _inputConnections?: {
    [propertyName: string]: {
      sourceNodeId: string;
      sourceHandleId: string;
    };
  };
}

export interface ClickNodeData {
  selector: string;
  selectorType?: 'css' | 'xpath';
  timeout?: number;
  failSilently?: boolean;
  waitForSelector?: string;
  waitForSelectorType?: 'css' | 'xpath';
  waitForSelectorTimeout?: number;
  waitForUrl?: string;
  waitForUrlTimeout?: number;
  waitForCondition?: string;
  waitForConditionTimeout?: number;
  waitStrategy?: 'sequential' | 'parallel';
  waitAfterOperation?: boolean; // false = wait before (default), true = wait after
  retryEnabled?: boolean;
  retryStrategy?: 'count' | 'untilCondition';
  retryCount?: number;
  retryUntilCondition?: {
    type: 'selector' | 'url' | 'javascript';
    value: string;
    selectorType?: 'css' | 'xpath';
    timeout?: number;
  };
  retryDelay?: number;
  retryDelayStrategy?: 'fixed' | 'exponential';
  retryMaxDelay?: number;
  _inputConnections?: {
    [propertyName: string]: {
      sourceNodeId: string;
      sourceHandleId: string;
    };
  };
}

export interface TypeNodeData {
  selector: string;
  selectorType?: 'css' | 'xpath';
  text: string;
  timeout?: number;
  failSilently?: boolean;
  waitForSelector?: string;
  waitForSelectorType?: 'css' | 'xpath';
  waitForSelectorTimeout?: number;
  waitForUrl?: string;
  waitForUrlTimeout?: number;
  waitForCondition?: string;
  waitForConditionTimeout?: number;
  waitStrategy?: 'sequential' | 'parallel';
  waitAfterOperation?: boolean; // false = wait before (default), true = wait after
  retryEnabled?: boolean;
  retryStrategy?: 'count' | 'untilCondition';
  retryCount?: number;
  retryUntilCondition?: {
    type: 'selector' | 'url' | 'javascript';
    value: string;
    selectorType?: 'css' | 'xpath';
    timeout?: number;
  };
  retryDelay?: number;
  retryDelayStrategy?: 'fixed' | 'exponential';
  retryMaxDelay?: number;
  _inputConnections?: {
    [propertyName: string]: {
      sourceNodeId: string;
      sourceHandleId: string;
    };
  };
}

export interface ActionNodeData {
  action: 'click' | 'doubleClick' | 'rightClick' | 'hover';
  selector: string;
  selectorType?: 'css' | 'xpath';
  timeout?: number;
  failSilently?: boolean;
  // Action-specific properties
  button?: 'left' | 'right' | 'middle'; // For click/rightClick actions
  delay?: number; // For hover/doubleClick actions
  // Advanced Waiting Options
  waitForSelector?: string;
  waitForSelectorType?: 'css' | 'xpath';
  waitForSelectorTimeout?: number;
  waitForUrl?: string;
  waitForUrlTimeout?: number;
  waitForCondition?: string;
  waitForConditionTimeout?: number;
  waitStrategy?: 'sequential' | 'parallel';
  waitAfterOperation?: boolean; // false = wait before (default), true = wait after
  // Retry Configuration
  retryEnabled?: boolean;
  retryStrategy?: 'count' | 'untilCondition';
  retryCount?: number;
  retryUntilCondition?: {
    type: 'selector' | 'url' | 'javascript';
    value: string;
    selectorType?: 'css' | 'xpath';
    timeout?: number;
  };
  retryDelay?: number;
  retryDelayStrategy?: 'fixed' | 'exponential';
  retryMaxDelay?: number;
  _inputConnections?: {
    [propertyName: string]: {
      sourceNodeId: string;
      sourceHandleId: string;
    };
  };
}

export interface ElementQueryNodeData {
  action: 'getText' | 'getAttribute' | 'getCount' | 'isVisible' | 'isEnabled' | 'isChecked' | 'getBoundingBox' | 'getAllText';
  selector: string;
  selectorType?: 'css' | 'xpath';
  timeout?: number;
  failSilently?: boolean;
  // Action-specific properties
  attributeName?: string; // For getAttribute action
  outputVariable?: string; // For all actions (defaults vary by action)
  // Advanced Waiting Options
  waitForSelector?: string;
  waitForSelectorType?: 'css' | 'xpath';
  waitForSelectorTimeout?: number;
  waitForUrl?: string;
  waitForUrlTimeout?: number;
  waitForCondition?: string;
  waitForConditionTimeout?: number;
  waitStrategy?: 'sequential' | 'parallel';
  waitAfterOperation?: boolean; // false = wait before (default), true = wait after
  // Retry Configuration
  retryEnabled?: boolean;
  retryStrategy?: 'count' | 'untilCondition';
  retryCount?: number;
  retryUntilCondition?: {
    type: 'selector' | 'url' | 'javascript';
    value: string;
    selectorType?: 'css' | 'xpath';
    timeout?: number;
  };
  retryDelay?: number;
  retryDelayStrategy?: 'fixed' | 'exponential';
  retryMaxDelay?: number;
  _inputConnections?: {
    [propertyName: string]: {
      sourceNodeId: string;
      sourceHandleId: string;
    };
  };
}

export interface FormInputNodeData {
  action: 'select' | 'check' | 'uncheck' | 'upload';
  selector: string;
  selectorType?: 'css' | 'xpath';
  timeout?: number;
  failSilently?: boolean;
  // Action-specific properties
  values?: string | string[]; // For select action
  selectBy?: 'value' | 'label' | 'index'; // For select action
  multiple?: boolean; // For select/upload actions
  force?: boolean; // For check/uncheck actions
  filePaths?: string | string[]; // For upload action
  // Advanced Waiting Options
  waitForSelector?: string;
  waitForSelectorType?: 'css' | 'xpath';
  waitForSelectorTimeout?: number;
  waitForUrl?: string;
  waitForUrlTimeout?: number;
  waitForCondition?: string;
  waitForConditionTimeout?: number;
  waitStrategy?: 'sequential' | 'parallel';
  waitAfterOperation?: boolean; // false = wait before (default), true = wait after
  // Retry Configuration
  retryEnabled?: boolean;
  retryStrategy?: 'count' | 'untilCondition';
  retryCount?: number;
  retryUntilCondition?: {
    type: 'selector' | 'url' | 'javascript';
    value: string;
    selectorType?: 'css' | 'xpath';
    timeout?: number;
  };
  retryDelay?: number;
  retryDelayStrategy?: 'fixed' | 'exponential';
  retryMaxDelay?: number;
  _inputConnections?: {
    [propertyName: string]: {
      sourceNodeId: string;
      sourceHandleId: string;
    };
  };
}

export interface GetTextNodeData {
  selector: string;
  selectorType?: 'css' | 'xpath';
  outputVariable?: string;
  timeout?: number;
  failSilently?: boolean;
  waitForSelector?: string;
  waitForSelectorType?: 'css' | 'xpath';
  waitForSelectorTimeout?: number;
  waitForUrl?: string;
  waitForUrlTimeout?: number;
  waitForCondition?: string;
  waitForConditionTimeout?: number;
  waitStrategy?: 'sequential' | 'parallel';
  waitAfterOperation?: boolean; // false = wait before (default), true = wait after
  retryEnabled?: boolean;
  retryStrategy?: 'count' | 'untilCondition';
  retryCount?: number;
  retryUntilCondition?: {
    type: 'selector' | 'url' | 'javascript';
    value: string;
    selectorType?: 'css' | 'xpath';
    timeout?: number;
  };
  retryDelay?: number;
  retryDelayStrategy?: 'fixed' | 'exponential';
  retryMaxDelay?: number;
  _inputConnections?: {
    [propertyName: string]: {
      sourceNodeId: string;
      sourceHandleId: string;
    };
  };
}

export interface ScreenshotNodeData {
  action?: 'fullPage' | 'element' | 'viewport' | 'pdf'; // Enhanced: add action dropdown
  path?: string;
  fullPage?: boolean; // Legacy: kept for backward compatibility
  failSilently?: boolean;
  // Action-specific properties
  selector?: string; // For element action
  selectorType?: 'css' | 'xpath'; // For element action
  mask?: string[]; // For element/fullPage/viewport actions - selectors to mask
  format?: 'A4' | 'Letter'; // For pdf action
  margin?: { top?: number; right?: number; bottom?: number; left?: number }; // For pdf action
  printBackground?: boolean; // For pdf action
  landscape?: boolean; // For pdf action
  waitForSelector?: string;
  waitForSelectorType?: 'css' | 'xpath';
  waitForSelectorTimeout?: number;
  waitForUrl?: string;
  waitForUrlTimeout?: number;
  waitForCondition?: string;
  waitForConditionTimeout?: number;
  waitStrategy?: 'sequential' | 'parallel';
  waitAfterOperation?: boolean; // false = wait before (default), true = wait after
  retryEnabled?: boolean;
  retryStrategy?: 'count' | 'untilCondition';
  retryCount?: number;
  retryUntilCondition?: {
    type: 'selector' | 'url' | 'javascript';
    value: string;
    selectorType?: 'css' | 'xpath';
    timeout?: number;
  };
  retryDelay?: number;
  retryDelayStrategy?: 'fixed' | 'exponential';
  retryMaxDelay?: number;
  _inputConnections?: {
    [propertyName: string]: {
      sourceNodeId: string;
      sourceHandleId: string;
    };
  };
}

export interface StorageNodeData {
  action: 'getCookie' | 'setCookie' | 'clearCookies' | 'getLocalStorage' | 'setLocalStorage' | 'clearLocalStorage' | 'getSessionStorage' | 'setSessionStorage' | 'clearSessionStorage';
  contextKey?: string; // Where to store retrieved values
  failSilently?: boolean;
  // Action-specific properties
  name?: string; // For getCookie - get specific cookie, or all if not specified
  url?: string; // For getCookie/setCookie - URL for cookie operations
  cookies?: Array<{ // For setCookie
    name: string;
    value: string;
    domain?: string;
    path?: string;
    expires?: number;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: 'Strict' | 'Lax' | 'None';
  }>;
  domain?: string; // For clearCookies - clear cookies for specific domain
  key?: string; // For getLocalStorage/getSessionStorage/setLocalStorage/setSessionStorage
  value?: string; // For setLocalStorage/setSessionStorage
  // Advanced Waiting Options
  waitForSelector?: string;
  waitForSelectorType?: 'css' | 'xpath';
  waitForSelectorTimeout?: number;
  waitForUrl?: string;
  waitForUrlTimeout?: number;
  waitForCondition?: string;
  waitForConditionTimeout?: number;
  waitStrategy?: 'sequential' | 'parallel';
  waitAfterOperation?: boolean;
  // Retry Configuration
  retryEnabled?: boolean;
  retryStrategy?: 'count' | 'untilCondition';
  retryCount?: number;
  retryUntilCondition?: {
    type: 'selector' | 'url' | 'javascript';
    value: string;
    selectorType?: 'css' | 'xpath';
    timeout?: number;
  };
  retryDelay?: number;
  retryDelayStrategy?: 'fixed' | 'exponential';
  retryMaxDelay?: number;
  _inputConnections?: {
    [propertyName: string]: {
      sourceNodeId: string;
      sourceHandleId: string;
    };
  };
}

export interface DialogNodeData {
  action: 'accept' | 'dismiss' | 'prompt' | 'waitForDialog';
  timeout?: number;
  failSilently?: boolean;
  // Action-specific properties
  message?: string; // For accept/dismiss/prompt/waitForDialog - expected dialog message
  inputText?: string; // For prompt action - text to input
  outputVariable?: string; // For waitForDialog - store dialog message (default: 'dialogMessage')
  // Advanced Waiting Options
  waitForSelector?: string;
  waitForSelectorType?: 'css' | 'xpath';
  waitForSelectorTimeout?: number;
  waitForUrl?: string;
  waitForUrlTimeout?: number;
  waitForCondition?: string;
  waitForConditionTimeout?: number;
  waitStrategy?: 'sequential' | 'parallel';
  waitAfterOperation?: boolean;
  // Retry Configuration
  retryEnabled?: boolean;
  retryStrategy?: 'count' | 'untilCondition';
  retryCount?: number;
  retryUntilCondition?: {
    type: 'selector' | 'url' | 'javascript';
    value: string;
    selectorType?: 'css' | 'xpath';
    timeout?: number;
  };
  retryDelay?: number;
  retryDelayStrategy?: 'fixed' | 'exponential';
  retryMaxDelay?: number;
  _inputConnections?: {
    [propertyName: string]: {
      sourceNodeId: string;
      sourceHandleId: string;
    };
  };
}

export interface DownloadNodeData {
  action: 'waitForDownload' | 'saveDownload' | 'getDownloadPath';
  timeout?: number;
  failSilently?: boolean;
  // Action-specific properties
  urlPattern?: string; // For waitForDownload - wait for download from URL matching pattern
  outputVariable?: string; // For waitForDownload/getDownloadPath - store download object/path
  downloadObject?: string; // For saveDownload/getDownloadPath - download object from context (from waitForDownload)
  savePath?: string; // For saveDownload - path to save file
  // Advanced Waiting Options
  waitForSelector?: string;
  waitForSelectorType?: 'css' | 'xpath';
  waitForSelectorTimeout?: number;
  waitForUrl?: string;
  waitForUrlTimeout?: number;
  waitForCondition?: string;
  waitForConditionTimeout?: number;
  waitStrategy?: 'sequential' | 'parallel';
  waitAfterOperation?: boolean;
  // Retry Configuration
  retryEnabled?: boolean;
  retryStrategy?: 'count' | 'untilCondition';
  retryCount?: number;
  retryUntilCondition?: {
    type: 'selector' | 'url' | 'javascript';
    value: string;
    selectorType?: 'css' | 'xpath';
    timeout?: number;
  };
  retryDelay?: number;
  retryDelayStrategy?: 'fixed' | 'exponential';
  retryMaxDelay?: number;
  _inputConnections?: {
    [propertyName: string]: {
      sourceNodeId: string;
      sourceHandleId: string;
    };
  };
}

export interface IframeNodeData {
  action: 'switchToIframe' | 'switchToMainFrame' | 'getIframeContent';
  timeout?: number;
  failSilently?: boolean;
  // Action-specific properties
  selector?: string; // For switchToIframe/getIframeContent - iframe selector
  name?: string; // For switchToIframe - iframe name attribute
  url?: string; // For switchToIframe - iframe URL pattern
  contextKey?: string; // For switchToIframe - store iframe page reference (default: 'iframePage')
  iframeSelector?: string; // For getIframeContent - iframe selector
  contentSelector?: string; // For getIframeContent - element selector within iframe
  outputVariable?: string; // For getIframeContent - store content (default: 'iframeContent')
  // Advanced Waiting Options
  waitForSelector?: string;
  waitForSelectorType?: 'css' | 'xpath';
  waitForSelectorTimeout?: number;
  waitForUrl?: string;
  waitForUrlTimeout?: number;
  waitForCondition?: string;
  waitForConditionTimeout?: number;
  waitStrategy?: 'sequential' | 'parallel';
  waitAfterOperation?: boolean;
  // Retry Configuration
  retryEnabled?: boolean;
  retryStrategy?: 'count' | 'untilCondition';
  retryCount?: number;
  retryUntilCondition?: {
    type: 'selector' | 'url' | 'javascript';
    value: string;
    selectorType?: 'css' | 'xpath';
    timeout?: number;
  };
  retryDelay?: number;
  retryDelayStrategy?: 'fixed' | 'exponential';
  retryMaxDelay?: number;
  _inputConnections?: {
    [propertyName: string]: {
      sourceNodeId: string;
      sourceHandleId: string;
    };
  };
}

export interface WaitNodeData {
  waitType: 'timeout' | 'selector' | 'url' | 'condition' | 'api-response';
  value: number | string; // timeout in ms, selector string, URL pattern, JavaScript condition, or API response context key
  selectorType?: 'css' | 'xpath';
  timeout?: number;
  failSilently?: boolean;
  // API response wait configuration
  apiWaitConfig?: {
    contextKey: string; // Which API response to check
    checkType: 'status' | 'header' | 'body-path' | 'body-value';
    path?: string; // JSON path for body checks, header name for header checks
    expectedValue?: any;
    matchType?: MatchType;
  };
  retryEnabled?: boolean;
  retryStrategy?: 'count' | 'untilCondition';
  retryCount?: number;
  retryUntilCondition?: {
    type: 'selector' | 'url' | 'javascript';
    value: string;
    selectorType?: 'css' | 'xpath';
    timeout?: number;
  };
  retryDelay?: number;
  retryDelayStrategy?: 'fixed' | 'exponential';
  retryMaxDelay?: number;
  _inputConnections?: {
    [propertyName: string]: {
      sourceNodeId: string;
      sourceHandleId: string;
    };
  };
}

export interface JavaScriptCodeNodeData {
  code: string;
  failSilently?: boolean;
}

export interface LoopNodeData {
  arrayVariable: string; // Variable name from previous node output
  failSilently?: boolean;
}

export interface IntValueNodeData {
  value: number;
}

export interface StringValueNodeData {
  value: string;
}

export interface BooleanValueNodeData {
  value: boolean;
}

export interface InputValueNodeData {
  dataType: PropertyDataType;
  value: string | number | boolean;
}

export interface ApiRequestNodeData {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
  url: string; // Supports ${data.key.path} interpolation
  headers?: Record<string, string>; // Supports interpolation in values
  body?: string; // Request body (supports interpolation)
  bodyType?: 'json' | 'form-data' | 'raw' | 'url-encoded';
  timeout?: number;
  contextKey?: string; // Where to store response (default: 'apiResponse')
  failSilently?: boolean;
  retryEnabled?: boolean;
  retryStrategy?: 'count' | 'untilCondition';
  retryCount?: number;
  retryUntilCondition?: {
    type: 'api-status' | 'api-json-path' | 'api-javascript';
    value?: string; // Optional, used for api-javascript condition code
    timeout?: number;
    // API-specific fields
    expectedStatus?: number; // For api-status
    jsonPath?: string; // For api-json-path
    expectedValue?: any; // For api-json-path
    matchType?: MatchType; // For api-json-path
    contextKey?: string; // For api-javascript (which API response to check, defaults to node's contextKey)
  };
  retryDelay?: number;
  retryDelayStrategy?: 'fixed' | 'exponential';
  retryMaxDelay?: number;
  _inputConnections?: {
    [propertyName: string]: {
      sourceNodeId: string;
      sourceHandleId: string;
    };
  };
}

export interface ApiCurlNodeData {
  curlCommand: string; // Raw cURL command (supports interpolation)
  timeout?: number;
  contextKey?: string; // Where to store response (default: 'apiResponse')
  failSilently?: boolean;
  retryEnabled?: boolean;
  retryStrategy?: 'count' | 'untilCondition';
  retryCount?: number;
  retryUntilCondition?: {
    type: 'api-status' | 'api-json-path' | 'api-javascript';
    value?: string; // Optional, used for api-javascript condition code
    timeout?: number;
    // API-specific fields
    expectedStatus?: number; // For api-status
    jsonPath?: string; // For api-json-path
    expectedValue?: any; // For api-json-path
    matchType?: MatchType; // For api-json-path
    contextKey?: string; // For api-javascript (which API response to check, defaults to node's contextKey)
  };
  retryDelay?: number;
  retryDelayStrategy?: 'fixed' | 'exponential';
  retryMaxDelay?: number;
  _inputConnections?: {
    [propertyName: string]: {
      sourceNodeId: string;
      sourceHandleId: string;
    };
  };
}

export interface LoadConfigFileNodeData {
  filePath: string; // Relative or absolute path
  contextKey?: string; // Optional key to store under (default: merge into root)
}

export interface SelectConfigFileNodeData {
  fileContent: string; // JSON content from file picker
  fileName?: string; // Optional: name of the selected file
  contextKey?: string; // Optional key to store under (default: merge into root)
}

export interface DbConnectNodeData {
  dbType: 'postgres' | 'mysql' | 'mongodb' | 'sqlite'; // Supports ${data.config.dbType}
  host?: string; // Supports variable interpolation
  port?: number | string; // Supports variable interpolation (parsed after interpolation)
  user?: string; // Supports variable interpolation
  password?: string; // Supports variable interpolation
  database?: string; // Supports variable interpolation
  connectionString?: string; // Optional alternative to individual fields (supports interpolation)
  configKey?: string; // Optional - load entire config object from context (e.g., 'env.db' loads from data.env.db)
  connectionKey?: string; // Context key to store connection (default: 'dbConnection', supports ${data.key})
  options?: Record<string, any>; // Database-specific options (pool size, SSL, etc.) - supports interpolation for string values
  failSilently?: boolean;
  _inputConnections?: {
    [propertyName: string]: {
      sourceNodeId: string;
      sourceHandleId: string;
    };
  };
}

export interface DbDisconnectNodeData {
  connectionKey?: string; // Which connection to disconnect (default: 'dbConnection', supports ${data.key})
  failSilently?: boolean;
  _inputConnections?: {
    [propertyName: string]: {
      sourceNodeId: string;
      sourceHandleId: string;
    };
  };
}

export interface DbQueryNodeData {
  connectionKey?: string; // Which connection to use (supports ${data.connectionKey})
  query?: string | Record<string, any>; // SQL query string (for SQL databases) or query object (for NoSQL) - supports variable interpolation
  queryKey?: string; // Optional - load query string/object from context (e.g., 'queries.selectUser' loads from data.queries.selectUser)
  queryType?: 'sql' | 'mongodb' | 'raw'; // Supports ${data.queryType}
  params?: any[]; // Parameterized query parameters (each param supports interpolation)
  contextKey?: string; // Where to store results (default: 'dbResult', supports ${data.resultKey})
  timeout?: number; // Query timeout (supports ${data.timeout})
  failSilently?: boolean;
  _inputConnections?: {
    [propertyName: string]: {
      sourceNodeId: string;
      sourceHandleId: string;
    };
  };
}

// Verification Domain and Types
export type VerificationDomain = 'browser' | 'api' | 'database';

export type BrowserVerificationType = 'url' | 'text' | 'element' | 'attribute' | 'formField' | 'cookie' | 'storage' | 'css';

export type DatabaseVerificationType = 'rowCount' | 'columnValue' | 'rowExists' | 'queryResult';

export type MatchType = 'contains' | 'equals' | 'regex' | 'startsWith' | 'endsWith';

export type ComparisonOperator = 'equals' | 'greaterThan' | 'lessThan' | 'greaterThanOrEqual' | 'lessThanOrEqual';

export interface VerifyNodeData {
  domain: VerificationDomain; // 'browser' | 'api' | 'database'
  verificationType: string; // Type specific to domain
  // Browser-specific fields
  urlPattern?: string;
  expectedText?: string;
  selector?: string;
  selectorType?: 'css' | 'xpath';
  attributeName?: string;
  elementCheck?: 'visible' | 'hidden' | 'exists' | 'notExists' | 'count' | 'enabled' | 'disabled' | 'selected' | 'checked';
  cookieName?: string;
  storageType?: 'local' | 'session';
  storageKey?: string;
  cssProperty?: string;
  // API-specific fields
  statusCode?: number;
  jsonPath?: string;
  headerName?: string;
  apiContextKey?: string; // Context key for API response to verify
  // Database-specific fields
  dbContextKey?: string; // Context key for query result to verify (default: 'dbResult', supports ${data.resultKey})
  dbVerificationType?: DatabaseVerificationType; // 'rowCount' | 'columnValue' | 'rowExists' | 'queryResult' (supports ${data.type})
  columnName?: string; // For column value verification (supports ${data.column})
  rowIndex?: number; // For row-based verification (default: 0, supports ${data.index})
  // Common fields
  matchType?: MatchType;
  comparisonOperator?: ComparisonOperator;
  expectedValue?: any;
  caseSensitive?: boolean;
  timeout?: number;
  failSilently?: boolean;
  retryEnabled?: boolean;
  retryStrategy?: 'count' | 'untilCondition';
  retryCount?: number;
  retryUntilCondition?: {
    type: 'selector' | 'url' | 'javascript';
    value: string;
    selectorType?: 'css' | 'xpath';
    timeout?: number;
  };
  retryDelay?: number;
  retryDelayStrategy?: 'fixed' | 'exponential';
  retryMaxDelay?: number;
  _inputConnections?: {
    [propertyName: string]: {
      sourceNodeId: string;
      sourceHandleId: string;
    };
  };
}

export type NodeData =
  | StartNodeData
  | OpenBrowserNodeData
  | TypeNodeData
  | ActionNodeData
  | ElementQueryNodeData
  | FormInputNodeData
  | NavigationNodeData
  | KeyboardNodeData
  | ScrollNodeData
  | StorageNodeData
  | DialogNodeData
  | DownloadNodeData
  | IframeNodeData
  | ScreenshotNodeData
  | WaitNodeData
  | JavaScriptCodeNodeData
  | LoopNodeData
  | IntValueNodeData
  | StringValueNodeData
  | BooleanValueNodeData
  | InputValueNodeData
  | VerifyNodeData
  | ApiRequestNodeData
  | ApiCurlNodeData
  | LoadConfigFileNodeData
  | SelectConfigFileNodeData
  | DbConnectNodeData
  | DbDisconnectNodeData
  | DbQueryNodeData
  | Record<string, any>; // Support custom plugin node data

// Edge/Connection Interface
export interface Edge {
  id: string;
  source: string; // Node ID
  target: string; // Node ID
  sourceHandle?: string; // Output port
  targetHandle?: string; // Input port
}

// Workflow JSON Schema
export interface Workflow {
  nodes: BaseNode[];
  edges: Edge[];
}

// Execution Context
export interface ExecutionContext {
  page?: any; // Playwright Page object
  browser?: any; // Playwright Browser object
  data: Record<string, any>; // Data passed between nodes
  variables: Record<string, any>; // Global variables
}

// Execution Status
export enum ExecutionStatus {
  IDLE = 'idle',
  RUNNING = 'running',
  COMPLETED = 'completed',
  ERROR = 'error',
  STOPPED = 'stopped',
}

// Execution Event Types
export enum ExecutionEventType {
  NODE_START = 'node_start',
  NODE_COMPLETE = 'node_complete',
  NODE_ERROR = 'node_error',
  EXECUTION_START = 'execution_start',
  EXECUTION_COMPLETE = 'execution_complete',
  EXECUTION_ERROR = 'execution_error',
  LOG = 'log',
}

// Page Debug Info for UI node errors
export interface SelectorSuggestion {
  selector: string;
  selectorType: 'css' | 'xpath';
  reason: string; // e.g., "Similar ID found", "Class match", etc.
  elementInfo?: string; // e.g., "button#submit-btn.login-button"
}

export interface PageDebugInfo {
  pageUrl?: string;
  pageSource?: string;
  similarSelectors?: SelectorSuggestion[];
}

// Execution Event
export interface ExecutionEvent {
  type: ExecutionEventType;
  nodeId?: string;
  message?: string;
  data?: any;
  traceLogs?: string[]; // Trace logs for node errors
  debugInfo?: PageDebugInfo; // Debug info for UI node errors
  failSilently?: boolean; // If true, node failed but execution should continue
  timestamp: number;
}

// Report Types
export type ReportType = 'html' | 'allure' | 'json' | 'junit' | 'csv' | 'markdown';

export interface ReportConfig {
  enabled: boolean;
  outputPath?: string; // Default: './output'
  reportTypes: ReportType[]; // ['html', 'allure', 'json', etc.]
}

export interface ScreenshotConfig {
  enabled: boolean;
  timing: 'pre' | 'post' | 'both'; // When to take screenshots
}

// API Request/Response Types
export interface ExecuteWorkflowRequest {
  workflow: Workflow;
  traceLogs?: boolean; // Enable trace logging to terminal (default: false)
  screenshotConfig?: ScreenshotConfig;
  reportConfig?: ReportConfig;
  recordSession?: boolean; // Flag to enable video recording
}

export interface ExecuteWorkflowResponse {
  executionId: string;
  status: ExecutionStatus;
}

export interface ExecutionStatusResponse {
  executionId: string;
  status: ExecutionStatus;
  currentNodeId?: string;
  error?: string;
}

export interface StopExecutionResponse {
  success: boolean;
  message: string;
}

// Node Configuration Schema (for validation)
export interface NodeConfigSchema {
  type: NodeType;
  label: string;
  description: string;
  fields: NodeField[];
}

export interface NodeField {
  name: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'code';
  required?: boolean;
  defaultValue?: any;
  options?: { label: string; value: string }[];
  placeholder?: string;
  dataType?: PropertyDataType; // Property data type for input connections
  isInputConnection?: boolean; // Tracks if property is converted to input
  inputHandleId?: string; // Unique handle ID for this property input
}

// Property Input Connection metadata stored in node data
export interface PropertyInputConnection {
  propertyName: string;
  sourceNodeId: string;
  sourceHandleId: string;
  dataType: PropertyDataType;
}

// Plugin System Types
export interface PluginManifest {
  name: string;
  version: string;
  description: string;
  author?: string;
  nodes: PluginNodeDefinition[];
  dependencies?: Record<string, string>;
  requirements?: {
    minVersion?: string;
    maxVersion?: string;
  };
}

export interface PluginNodeDefinition {
  type: string; // Custom node type (e.g., 'myPlugin.myNode')
  label: string;
  category: string;
  icon?: string; // Icon emoji or path to icon file
  description?: string;
  handlerPath: string; // Path to handler file relative to plugin root
  configComponentPath?: string; // Path to config component (optional)
  defaultData?: Record<string, any>; // Default node data
}

export interface PluginMetadata {
  id: string; // Plugin directory name
  manifest: PluginManifest;
  path: string; // Absolute path to plugin directory
  loaded: boolean;
  error?: string;
}

