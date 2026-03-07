/**
 * Node Action Enums Resource
 * Lists all valid enum values for action/waitType/inputMethod/mode fields
 * across node types so the AI can generate accurate configurations.
 */

export interface NodeActionEnumsGuide {
  nodeEnums: NodeEnumEntry[];
  commonOptions: CommonNodeOption[];
}

interface NodeEnumEntry {
  nodeType: string;
  field: string;
  values: EnumValue[];
}

interface EnumValue {
  value: string;
  description: string;
  requiredFields?: string[];
}

interface CommonNodeOption {
  name: string;
  type: string;
  description: string;
  applicableTo: string[];
  defaultValue?: any;
}

export function getNodeActionEnumsGuide(): NodeActionEnumsGuide {
  return {
    nodeEnums: [
      {
        nodeType: 'navigation',
        field: 'action',
        values: [
          { value: 'navigate', description: 'Navigate to a URL', requiredFields: ['url'] },
          { value: 'goBack', description: 'Browser back button' },
          { value: 'goForward', description: 'Browser forward button' },
          { value: 'reload', description: 'Reload current page' },
          { value: 'newTab', description: 'Open a new tab', requiredFields: ['url'] },
          { value: 'switchTab', description: 'Switch to a tab by index', requiredFields: ['tabIndex'] },
          { value: 'closeTab', description: 'Close current tab' },
        ],
      },
      {
        nodeType: 'action',
        field: 'action',
        values: [
          { value: 'click', description: 'Single click on element', requiredFields: ['selector'] },
          { value: 'doubleClick', description: 'Double click on element', requiredFields: ['selector'] },
          { value: 'rightClick', description: 'Right-click (context menu) on element', requiredFields: ['selector'] },
          { value: 'hover', description: 'Hover over element', requiredFields: ['selector'] },
          { value: 'dragAndDrop', description: 'Drag element to target', requiredFields: ['selector', 'targetSelector'] },
        ],
      },
      {
        nodeType: 'wait',
        field: 'waitType',
        values: [
          { value: 'timeout', description: 'Wait for a fixed duration in ms', requiredFields: ['value'] },
          { value: 'selector', description: 'Wait for an element to appear', requiredFields: ['value', 'selectorType'] },
          { value: 'url', description: 'Wait for URL to match pattern', requiredFields: ['value'] },
          { value: 'function', description: 'Wait for a JS expression to return truthy', requiredFields: ['value'] },
        ],
      },
      {
        nodeType: 'elementQuery',
        field: 'action',
        values: [
          { value: 'getText', description: 'Get visible text content', requiredFields: ['selector', 'outputVariable'] },
          { value: 'getAttribute', description: 'Get an attribute value', requiredFields: ['selector', 'attributeName', 'outputVariable'] },
          { value: 'getCount', description: 'Count matching elements', requiredFields: ['selector', 'outputVariable'] },
          { value: 'isVisible', description: 'Check if element is visible (boolean)', requiredFields: ['selector', 'outputVariable'] },
          { value: 'isEnabled', description: 'Check if element is enabled (boolean)', requiredFields: ['selector', 'outputVariable'] },
          { value: 'isChecked', description: 'Check if checkbox/radio is checked (boolean)', requiredFields: ['selector', 'outputVariable'] },
          { value: 'getBoundingBox', description: 'Get element position and size', requiredFields: ['selector', 'outputVariable'] },
          { value: 'getAllText', description: 'Get text from ALL matching elements (returns array)', requiredFields: ['selector', 'outputVariable'] },
        ],
      },
      {
        nodeType: 'type',
        field: 'inputMethod',
        values: [
          { value: 'fill', description: 'Clear field then set value instantly (default, recommended)' },
          { value: 'type', description: 'Type character by character with optional delay' },
          { value: 'pressSequentially', description: 'Press each key sequentially (alias for type)' },
          { value: 'append', description: 'Add text after existing content without clearing' },
          { value: 'prepend', description: 'Insert text before existing content' },
          { value: 'direct', description: 'Set value directly via JavaScript (bypasses events)' },
        ],
      },
      {
        nodeType: 'keyboard',
        field: 'action',
        values: [
          { value: 'press', description: 'Press a single key or key combo', requiredFields: ['key'] },
          { value: 'type', description: 'Type text character by character', requiredFields: ['text'] },
          { value: 'insertText', description: 'Insert text at once (like paste)', requiredFields: ['text'] },
          { value: 'shortcut', description: 'Execute keyboard shortcut', requiredFields: ['shortcut'] },
          { value: 'down', description: 'Hold key down', requiredFields: ['key'] },
          { value: 'up', description: 'Release held key', requiredFields: ['key'] },
        ],
      },
      {
        nodeType: 'formInput',
        field: 'action',
        values: [
          { value: 'select', description: 'Select option from dropdown', requiredFields: ['selector', 'value'] },
          { value: 'check', description: 'Check a checkbox', requiredFields: ['selector'] },
          { value: 'uncheck', description: 'Uncheck a checkbox', requiredFields: ['selector'] },
          { value: 'upload', description: 'Upload file to file input', requiredFields: ['selector', 'filePath'] },
        ],
      },
      {
        nodeType: 'scroll',
        field: 'action',
        values: [
          { value: 'scrollToElement', description: 'Scroll until element is visible', requiredFields: ['selector'] },
          { value: 'scrollToPosition', description: 'Scroll to absolute position', requiredFields: ['x', 'y'] },
          { value: 'scrollBy', description: 'Scroll by relative delta', requiredFields: ['deltaX', 'deltaY'] },
          { value: 'scrollToTop', description: 'Scroll to top of page' },
          { value: 'scrollToBottom', description: 'Scroll to bottom of page' },
        ],
      },
      {
        nodeType: 'storage',
        field: 'action',
        values: [
          { value: 'getCookie', description: 'Get cookies and store in context', requiredFields: ['contextKey'] },
          { value: 'setCookie', description: 'Set a cookie' },
          { value: 'clearCookies', description: 'Clear all cookies' },
          { value: 'getLocalStorage', description: 'Get localStorage item' },
          { value: 'setLocalStorage', description: 'Set localStorage item' },
          { value: 'clearLocalStorage', description: 'Clear all localStorage' },
          { value: 'getSessionStorage', description: 'Get sessionStorage item' },
          { value: 'setSessionStorage', description: 'Set sessionStorage item' },
          { value: 'clearSessionStorage', description: 'Clear all sessionStorage' },
        ],
      },
      {
        nodeType: 'dialog',
        field: 'action',
        values: [
          { value: 'accept', description: 'Accept dialog (OK)' },
          { value: 'dismiss', description: 'Dismiss dialog (Cancel)' },
          { value: 'prompt', description: 'Enter text in prompt dialog', requiredFields: ['promptText'] },
          { value: 'waitForDialog', description: 'Wait for a dialog to appear' },
        ],
      },
      {
        nodeType: 'download',
        field: 'action',
        values: [
          { value: 'waitForDownload', description: 'Wait for a download to start' },
          { value: 'saveDownload', description: 'Save downloaded file to path' },
          { value: 'getDownloadPath', description: 'Get the path of the downloaded file' },
        ],
      },
      {
        nodeType: 'iframe',
        field: 'action',
        values: [
          { value: 'switchToIframe', description: 'Switch context to iframe', requiredFields: ['selector'] },
          { value: 'switchToMainFrame', description: 'Return to main frame' },
          { value: 'getIframeContent', description: 'Get iframe content' },
        ],
      },
      {
        nodeType: 'contextManipulate',
        field: 'action',
        values: [
          { value: 'setGeolocation', description: 'Set browser geolocation', requiredFields: ['latitude', 'longitude'] },
          { value: 'setPermissions', description: 'Set browser permissions' },
          { value: 'setViewportSize', description: 'Set viewport dimensions', requiredFields: ['viewportWidth', 'viewportHeight'] },
          { value: 'setUserAgent', description: 'Set custom user agent string' },
          { value: 'emulateDevice', description: 'Emulate a specific device', requiredFields: ['device'] },
          { value: 'setLocale', description: 'Set browser locale' },
          { value: 'setTimezone', description: 'Set browser timezone' },
          { value: 'setColorScheme', description: 'Set color scheme (light/dark)' },
          { value: 'saveState', description: 'Save browser state (cookies, localStorage)' },
          { value: 'loadState', description: 'Load previously saved browser state' },
        ],
      },
      {
        nodeType: 'csvHandle',
        field: 'action',
        values: [
          { value: 'write', description: 'Create/overwrite CSV file from context data', requiredFields: ['filePath', 'dataSource'] },
          { value: 'append', description: 'Append rows to existing CSV file', requiredFields: ['filePath', 'dataSource'] },
          { value: 'read', description: 'Read CSV file into context', requiredFields: ['filePath', 'contextKey'] },
        ],
      },
      {
        nodeType: 'loop',
        field: 'mode',
        values: [
          { value: 'forEach', description: 'Iterate over each item in an array variable. Sets "item" and "index" context variables.', requiredFields: ['arrayVariable'] },
          { value: 'doWhile', description: 'Repeat while condition is true', requiredFields: ['condition'] },
        ],
      },
      {
        nodeType: 'verify',
        field: 'domain',
        values: [
          { value: 'browser', description: 'Verify browser/DOM state' },
          { value: 'api', description: 'Verify API response' },
          { value: 'database', description: 'Verify database query result' },
        ],
      },
      {
        nodeType: 'verify (browser)',
        field: 'verificationType',
        values: [
          { value: 'visible', description: 'Assert element is visible', requiredFields: ['selector'] },
          { value: 'hidden', description: 'Assert element is hidden', requiredFields: ['selector'] },
          { value: 'text', description: 'Assert element has expected text', requiredFields: ['selector', 'expectedValue'] },
          { value: 'attribute', description: 'Assert element attribute value', requiredFields: ['selector', 'attributeName', 'expectedValue'] },
          { value: 'url', description: 'Assert current page URL', requiredFields: ['expectedValue'] },
          { value: 'title', description: 'Assert page title', requiredFields: ['expectedValue'] },
          { value: 'count', description: 'Assert element count', requiredFields: ['selector', 'expectedValue'] },
          { value: 'contains', description: 'Assert element contains text', requiredFields: ['selector', 'expectedValue'] },
          { value: 'enabled', description: 'Assert element is enabled', requiredFields: ['selector'] },
          { value: 'checked', description: 'Assert checkbox/radio is checked', requiredFields: ['selector'] },
        ],
      },
      {
        nodeType: 'verify (api)',
        field: 'verificationType',
        values: [
          { value: 'status', description: 'Assert HTTP status code', requiredFields: ['expectedValue'] },
          { value: 'body', description: 'Assert response body content', requiredFields: ['expectedValue'] },
          { value: 'header', description: 'Assert response header', requiredFields: ['attributeName', 'expectedValue'] },
        ],
      },
      {
        nodeType: 'smartExtractor',
        field: 'mode',
        values: [
          { value: 'allLinks', description: 'Extract all links (text + href)' },
          { value: 'allImages', description: 'Extract all images (src + alt)' },
          { value: 'tables', description: 'Extract HTML table data by index' },
          { value: 'repeatedItems', description: 'Auto-detect repeated DOM patterns (product cards, list items)' },
        ],
      },
    ],

    commonOptions: [
      {
        name: 'waitForSelector',
        type: 'boolean',
        description: 'Wait for the target selector to appear before executing the action. Adds reliability for dynamic pages.',
        applicableTo: ['action', 'type', 'formInput', 'elementQuery', 'scroll'],
        defaultValue: false,
      },
      {
        name: 'waitAfterOperation',
        type: 'number',
        description: 'Milliseconds to wait after the operation completes. Helps with transitions/animations.',
        applicableTo: ['action', 'type', 'formInput', 'navigation', 'keyboard'],
        defaultValue: 0,
      },
      {
        name: 'retryEnabled',
        type: 'boolean',
        description: 'Enable automatic retry on failure.',
        applicableTo: ['action', 'type', 'formInput', 'elementQuery', 'verify', 'apiRequest'],
        defaultValue: false,
      },
      {
        name: 'retryCount',
        type: 'number',
        description: 'Number of retry attempts when retryEnabled is true.',
        applicableTo: ['action', 'type', 'formInput', 'elementQuery', 'verify', 'apiRequest'],
        defaultValue: 3,
      },
      {
        name: 'retryDelay',
        type: 'number',
        description: 'Delay in ms between retry attempts.',
        applicableTo: ['action', 'type', 'formInput', 'elementQuery', 'verify', 'apiRequest'],
        defaultValue: 1000,
      },
      {
        name: 'timeout',
        type: 'number',
        description: 'Operation timeout in milliseconds.',
        applicableTo: ['action', 'type', 'formInput', 'elementQuery', 'wait', 'navigation'],
        defaultValue: 30000,
      },
      {
        name: 'failSilently',
        type: 'boolean',
        description: 'If true, the node will not fail the workflow on error — execution continues to the next node.',
        applicableTo: ['action', 'type', 'formInput', 'elementQuery', 'verify', 'apiRequest', 'wait'],
        defaultValue: false,
      },
      {
        name: 'scrollThenAction',
        type: 'boolean',
        description: 'Scroll element into view before performing the action. Can interfere with clicks on overlaid elements — disable if click targets the wrong element.',
        applicableTo: ['action', 'type', 'formInput'],
        defaultValue: false,
      },
      {
        name: 'selectorType',
        type: 'SelectorType',
        description: 'The type of selector used. See automflows://selector-guide for full reference.',
        applicableTo: ['action', 'type', 'formInput', 'elementQuery', 'wait', 'scroll', 'verify'],
        defaultValue: 'css',
      },
      {
        name: 'selectorModifiers',
        type: 'SelectorModifiers',
        description: 'Modifier object for refining the selector (nth, filterText, chainSelector, etc.). See automflows://selector-guide for details.',
        applicableTo: ['action', 'type', 'formInput', 'elementQuery', 'wait', 'scroll', 'verify'],
      },
    ],
  };
}

export function getNodeActionEnumsAsResource(): string {
  return JSON.stringify(getNodeActionEnumsGuide(), null, 2);
}
