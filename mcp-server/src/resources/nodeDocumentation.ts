import { NodeType, getNodeProperties, PropertyDataType } from '@automflows/shared';
import * as fs from 'fs';
import * as path from 'path';

export interface NodeDocumentation {
  type: string;
  label: string;
  category: string;
  description: string;
  fields: FieldDocumentation[];
  examples: string[];
}

export interface FieldDocumentation {
  name: string;
  label: string;
  type: string;
  required: boolean;
  description: string;
  defaultValue?: any;
}

export interface PluginNodeDefinition {
  type: string;
  label: string;
  category: string;
  icon?: string;
  description?: string;
  handlerPath: string;
  configComponentPath?: string;
  defaultData?: Record<string, any>;
}

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

const NODE_CATEGORIES: Record<string, string[]> = {
  'Start': ['start'],
  'Browser': ['openBrowser', 'contextManipulate', 'navigation', 'keyboard', 'scroll', 'dialog', 'download', 'iframe'],
  'Interaction': ['action', 'formInput', 'type'],
  'Storage': ['storage'],
  'Data': ['elementQuery', 'screenshot', 'csvHandle', 'dataExtractor', 'smartExtractor'],
  'Verification': ['verify'],
  'API': ['apiRequest', 'apiCurl'],
  'Database': ['dbConnect', 'dbDisconnect', 'dbQuery'],
  'Control': ['wait', 'loop'],
  'Code': ['javascriptCode'],
  'Values': ['intValue', 'stringValue', 'booleanValue', 'inputValue'],
  'Config': ['loadConfigFile', 'selectConfigFile'],
};

function dataTypeToString(dataType: PropertyDataType): string {
  switch (dataType) {
    case PropertyDataType.INT:
    case PropertyDataType.FLOAT:
    case PropertyDataType.DOUBLE:
      return 'number';
    case PropertyDataType.STRING:
      return 'string';
    case PropertyDataType.BOOLEAN:
      return 'boolean';
    default:
      return 'string';
  }
}

function getCategoryForType(type: string): string {
  for (const [category, types] of Object.entries(NODE_CATEGORIES)) {
    if (types.includes(type)) return category;
  }
  return 'Other';
}

const NODE_METADATA: Record<string, { label: string; description: string; examples: string[] }> = {
  [NodeType.START]: {
    label: 'Start',
    description: 'The entry point of a workflow. All workflows must start with this node.',
    examples: ['Every workflow must begin with a Start node'],
  },
  [NodeType.OPEN_BROWSER]: {
    label: 'Open Browser',
    description: 'Opens a browser instance (Chromium, Firefox, or WebKit)',
    examples: ['Open browser in headless mode', 'Open Firefox browser with custom viewport'],
  },
  [NodeType.NAVIGATION]: {
    label: 'Navigation',
    description: 'Navigate to a URL or control browser navigation. Valid actions: "navigate" (requires url), "goBack", "goForward", "reload", "newTab", "switchTab" (requires tabIndex), "closeTab".',
    examples: [
      'Navigate to URL: action="navigate", url="https://example.com", waitUntil="networkidle"',
      'Go back: action="goBack"',
      'Open new tab: action="newTab", url="https://example.com"',
      'Switch tab: action="switchTab", tabIndex=1',
    ],
  },
  [NodeType.ACTION]: {
    label: 'Action',
    description: 'Perform browser actions on elements. Valid actions: "click", "doubleClick", "rightClick", "hover", "dragAndDrop" (requires targetSelector or targetX/targetY).',
    examples: [
      'Click a button: action="click", selector="button.submit"',
      'Hover over element: action="hover", selector=".menu-item"',
      'Double click: action="doubleClick", selector=".editable"',
      'Drag and drop: action="dragAndDrop", selector=".draggable", targetSelector=".droppable"',
    ],
  },
  [NodeType.TYPE]: {
    label: 'Type',
    description: 'Type text into an input field',
    examples: ['Type into email field: selector="input[type=email]", text="user@example.com"', 'Type with delay: text="Hello", delay=100'],
  },
  [NodeType.WAIT]: {
    label: 'Wait',
    description: 'Wait for a condition or timeout. Valid waitType values: "timeout" (value = milliseconds), "selector" (value = CSS/XPath selector, uses selectorType), "url" (value = URL pattern), "function" (value = JS expression).',
    examples: [
      'Wait 5 seconds: waitType="timeout", value=5000',
      'Wait for selector: waitType="selector", value=".loaded", selectorType="css"',
      'Wait for URL: waitType="url", value="*/success*"',
    ],
  },
  [NodeType.API_REQUEST]: {
    label: 'API Request',
    description: 'Make HTTP API requests',
    examples: ['GET request: method="GET", url="https://api.example.com/data"', 'POST with JSON: method="POST", body={key: "value"}'],
  },
  [NodeType.API_CURL]: {
    label: 'API cURL',
    description: 'Execute a cURL command as an API request',
    examples: ['Convert cURL command to API request node'],
  },
  [NodeType.VERIFY]: {
    label: 'Verify',
    description: 'Verify conditions, assertions, or element states',
    examples: ['Verify element visible: domain="browser", verificationType="visible", selector=".success"', 'Verify API status: domain="api", verificationType="status", expectedValue=200'],
  },
  [NodeType.CSV_HANDLE]: {
    label: 'CSV Handle',
    description: 'Read CSV from file into context, or write/append an array from context to a CSV file. Valid actions: "write" (create/overwrite), "append" (add rows), "read" (load into context).',
    examples: [
      'Write CSV: action="write", filePath="output/products.csv", dataSource="products", headers=["name","price"]',
      'Append rows: action="append", filePath="output/products.csv", dataSource="newRows"',
      'Read CSV: action="read", filePath="data/input.csv", contextKey="csvData"',
    ],
  },
  [NodeType.EMAIL]: {
    label: 'Email',
    description: 'Send emails via SMTP with configurable host, authentication, and content type (text/html).',
    examples: ['Send plain text email: smtpHost="smtp.gmail.com", to="user@example.com", subject="Test", body="Hello"', 'Send HTML email: bodyType="html", body="<h1>Report</h1>"'],
  },
  [NodeType.SLACK]: {
    label: 'Slack',
    description: 'Send messages to Slack channels via Incoming Webhooks with optional Block Kit formatting.',
    examples: ['Send simple message: webhookUrl="https://hooks.slack.com/...", message="Build passed!"', 'Send with blocks JSON for rich formatting'],
  },
  [NodeType.WEBHOOK]: {
    label: 'Webhook',
    description: 'Send HTTP requests to external webhook endpoints with configurable method, headers, body, and retry logic.',
    examples: ['POST JSON to webhook: url="https://example.com/webhook", method="POST", body=\'{"event":"complete"}\'', 'With retry: retryEnabled=true, retryCount=3'],
  },
  [NodeType.KEYBOARD]: {
    label: 'Keyboard',
    description: 'Send keyboard input. Valid actions: "press" (requires key), "type" (requires text, types char by char), "insertText" (requires text, inserts at once), "shortcut" (requires shortcut, e.g. "Control+A"), "down" (key down), "up" (key up).',
    examples: [
      'Press Enter: action="press", key="Enter"',
      'Type text with delay: action="type", text="Hello", delay=100',
      'Keyboard shortcut: action="shortcut", shortcut="Control+C"',
    ],
  },
  [NodeType.SCROLL]: {
    label: 'Scroll',
    description: 'Scroll the page or an element. Valid actions: "scrollToElement" (requires selector), "scrollToPosition" (requires x, y), "scrollBy" (requires deltaX, deltaY), "scrollToTop", "scrollToBottom".',
    examples: [
      'Scroll to element: action="scrollToElement", selector=".footer", selectorType="css"',
      'Scroll by delta: action="scrollBy", deltaX=0, deltaY=500',
      'Scroll to bottom of page: action="scrollToBottom"',
      'Scroll to top of page: action="scrollToTop"',
      'Scroll to exact position: action="scrollToPosition", x=0, y=1000',
    ],
  },
  [NodeType.STORAGE]: {
    label: 'Storage',
    description: 'Get or set cookies, localStorage, sessionStorage. Valid actions: "getCookie", "setCookie", "clearCookies", "getLocalStorage", "setLocalStorage", "clearLocalStorage", "getSessionStorage", "setSessionStorage", "clearSessionStorage".',
    examples: [
      'Get cookies: action="getCookie", contextKey="cookies"',
      'Set localStorage: action="setLocalStorage"',
      'Clear cookies: action="clearCookies"',
    ],
  },
  [NodeType.DIALOG]: {
    label: 'Dialog',
    description: 'Handle browser dialogs (alert, confirm, prompt). Valid actions: "accept", "dismiss", "prompt", "waitForDialog".',
    examples: [
      'Accept alert: action="accept"',
      'Dismiss confirm: action="dismiss"',
      'Wait for dialog: action="waitForDialog"',
    ],
  },
  [NodeType.DOWNLOAD]: {
    label: 'Download',
    description: 'Wait for or handle file downloads. Valid actions: "waitForDownload", "saveDownload", "getDownloadPath".',
    examples: [
      'Wait for download: action="waitForDownload"',
      'Save download to path: action="saveDownload"',
    ],
  },
  [NodeType.IFRAME]: {
    label: 'Iframe',
    description: 'Switch to or interact with iframes. Valid actions: "switchToIframe" (requires selector), "switchToMainFrame", "getIframeContent".',
    examples: [
      'Switch to iframe: action="switchToIframe", selector="#my-iframe"',
      'Return to main frame: action="switchToMainFrame"',
    ],
  },
  [NodeType.ELEMENT_QUERY]: {
    label: 'Element Query',
    description: 'Query elements and extract data. Valid actions: "getText", "getAttribute" (requires attributeName), "getCount", "isVisible", "isEnabled", "isChecked", "getBoundingBox", "getAllText". Result stored in outputVariable.',
    examples: [
      'Get text: action="getText", selector=".title", outputVariable="title"',
      'Get attribute: action="getAttribute", selector="a", attributeName="href", outputVariable="link"',
      'Count elements: action="getCount", selector=".item", outputVariable="itemCount"',
      'Check visibility: action="isVisible", selector=".modal", outputVariable="modalVisible"',
    ],
  },
  [NodeType.FORM_INPUT]: {
    label: 'Form Input',
    description: 'Interact with form elements. Valid actions: "select" (dropdown), "check" (checkbox), "uncheck" (checkbox), "upload" (file input).',
    examples: [
      'Select option: action="select", selector="select.country", value="US"',
      'Check checkbox: action="check", selector="input[type=checkbox]"',
      'Upload file: action="upload", selector="input[type=file]"',
    ],
  },
  [NodeType.SCREENSHOT]: {
    label: 'Screenshot',
    description: 'Take a screenshot of the page or an element',
    examples: ['Capture full page screenshot', 'Capture element screenshot'],
  },
  [NodeType.JAVASCRIPT_CODE]: {
    label: 'JavaScript Code',
    description: 'Execute custom JavaScript in the browser context',
    examples: ['Run custom script', 'Extract data with JavaScript'],
  },
  [NodeType.LOOP]: {
    label: 'Loop',
    description: 'Iterate over an array or repeat until condition',
    examples: ['Loop over array variable', 'Do-while loop'],
  },
  [NodeType.DB_CONNECT]: {
    label: 'DB Connect',
    description: 'Connect to a database (PostgreSQL, MySQL, SQLite, etc.)',
    examples: ['Connect to PostgreSQL', 'Use connection string'],
  },
  [NodeType.DB_DISCONNECT]: {
    label: 'DB Disconnect',
    description: 'Disconnect from a database',
    examples: ['Close database connection'],
  },
  [NodeType.DB_QUERY]: {
    label: 'DB Query',
    description: 'Execute a SQL query and store results in context',
    examples: ['SELECT query', 'INSERT with parameters'],
  },
  [NodeType.DB_TRANSACTION_BEGIN]: {
    label: 'DB Transaction Begin',
    description: 'Begin a database transaction',
    examples: ['Start transaction for multiple operations'],
  },
  [NodeType.DB_TRANSACTION_COMMIT]: {
    label: 'DB Transaction Commit',
    description: 'Commit a database transaction',
    examples: ['Commit transaction'],
  },
  [NodeType.DB_TRANSACTION_ROLLBACK]: {
    label: 'DB Transaction Rollback',
    description: 'Rollback a database transaction',
    examples: ['Rollback on error'],
  },
  [NodeType.CONTEXT_MANIPULATE]: {
    label: 'Context Manipulate',
    description: 'Modify browser context settings. Valid actions: "setGeolocation", "setPermissions", "setViewportSize" (requires viewportWidth, viewportHeight), "setUserAgent", "emulateDevice" (requires device), "setLocale", "setTimezone", "setColorScheme", "saveState", "loadState".',
    examples: [
      'Set geolocation: action="setGeolocation", latitude=37.7749, longitude=-122.4194',
      'Set viewport: action="setViewportSize", viewportWidth=1920, viewportHeight=1080',
      'Emulate device: action="emulateDevice", device="iPhone 13"',
    ],
  },
  [NodeType.INT_VALUE]: {
    label: 'Int Value',
    description: 'Provide an integer value (can be connected from other nodes)',
    examples: ['Static integer value'],
  },
  [NodeType.STRING_VALUE]: {
    label: 'String Value',
    description: 'Provide a string value (can be connected from other nodes)',
    examples: ['Static string value'],
  },
  [NodeType.BOOLEAN_VALUE]: {
    label: 'Boolean Value',
    description: 'Provide a boolean value (can be connected from other nodes)',
    examples: ['Static boolean value'],
  },
  [NodeType.INPUT_VALUE]: {
    label: 'Input Value',
    description: 'Provide a configurable value with type selection',
    examples: ['Dynamic value with type'],
  },
  [NodeType.LOAD_CONFIG_FILE]: {
    label: 'Load Config File',
    description: 'Load configuration from a JSON/Env file',
    examples: ['Load env.json for credentials'],
  },
  [NodeType.SELECT_CONFIG_FILE]: {
    label: 'Select Config File',
    description: 'Select which config file to use at runtime',
    examples: ['Choose config by environment'],
  },
  [NodeType.DATA_EXTRACTOR]: {
    label: 'Data Extractor',
    description: 'Extract structured, repeating data from a page by defining a container selector and field mappings. Each container element is iterated, and specified fields are extracted via text content, attributes, or innerHTML. Optionally saves results directly to a CSV file using field names as column headers (set saveToCSV=true and csvFilePath).',
    examples: [
      'Extract product listings: containerSelector=".product-card", fields=[{name:"title",selector:".title",extract:"text"},{name:"price",selector:".price",extract:"text"},{name:"link",selector:"a",extract:"attribute",attribute:"href"}]',
      'Extract table rows with custom selectors: containerSelector="tr.data-row", fields=[{name:"name",selector:"td:nth-child(1)",extract:"text"},{name:"email",selector:"td:nth-child(2)",extract:"text"}]',
      'Extract and save to CSV: containerSelector=".product", fields=[{name:"title",selector:".title",extract:"text"},{name:"price",selector:".price",extract:"text"}], saveToCSV=true, csvFilePath="output/products.csv"',
    ],
  },
  [NodeType.SMART_EXTRACTOR]: {
    label: 'Smart Extractor',
    description: 'Extract data without writing selectors. Supports four modes: "allLinks" extracts all links (text + href), "allImages" extracts all images (src + alt), "tables" extracts HTML table data by index, and "repeatedItems" auto-detects repeated DOM patterns like product cards or list items.',
    examples: [
      'Extract all links: mode="allLinks"',
      'Extract all images with metadata: mode="allImages", includeMetadata=true',
      'Extract second table on page: mode="tables", tableIndex=1',
      'Auto-detect repeated items: mode="repeatedItems"',
    ],
  },
};

export function generateNodeDocumentation(): NodeDocumentation[] {
  const docs: NodeDocumentation[] = [];

  for (const nodeType of Object.values(NodeType)) {
    const properties = getNodeProperties(nodeType);
    const metadata = NODE_METADATA[nodeType] || {
      label: nodeType.charAt(0).toUpperCase() + nodeType.slice(1).replace(/([A-Z])/g, ' $1'),
      description: `Node type: ${nodeType}`,
      examples: [],
    };

    const fields: FieldDocumentation[] = properties.map((p) => ({
      name: p.name,
      label: p.label,
      type: dataTypeToString(p.dataType),
      required: p.required,
      description: `${p.label} (${p.dataType})`,
      defaultValue: p.defaultValue,
    }));

    docs.push({
      type: nodeType,
      label: metadata.label,
      category: getCategoryForType(nodeType),
      description: metadata.description,
      fields,
      examples: metadata.examples,
    });
  }

  return docs;
}

let _pluginNodeCache: PluginNodeDefinition[] | null = null;

/**
 * Returns cached plugin node definitions (reads filesystem only once per process)
 */
export function getCachedPluginNodes(): PluginNodeDefinition[] {
  if (!_pluginNodeCache) {
    _pluginNodeCache = discoverPluginNodes();
  }
  return _pluginNodeCache;
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Matches a user request against known plugin node types by label or type name.
 * Returns the matching PluginNodeDefinition or undefined.
 */
export function findPluginNodeByKeyword(requestLower: string): PluginNodeDefinition | undefined {
  const pluginNodes = getCachedPluginNodes();
  for (const node of pluginNodes) {
    const label = node.label.toLowerCase();
    const typePart = node.type.split('.').pop()?.toLowerCase() || '';

    const labelRegex = new RegExp(`\\b${escapeRegExp(label)}\\b`);
    const typeRegex = new RegExp(`\\b${escapeRegExp(typePart)}\\b`);

    if (labelRegex.test(requestLower) || (typePart !== label.toLowerCase() && typeRegex.test(requestLower))) {
      return node;
    }
  }
  return undefined;
}

/**
 * Finds a plugin node definition by its full type string (e.g. "switch.switch")
 */
export function findPluginNodeByType(nodeType: string): PluginNodeDefinition | undefined {
  const pluginNodes = getCachedPluginNodes();
  return pluginNodes.find(n => n.type === nodeType);
}

/**
 * Discovers plugin nodes by scanning the plugins directory
 */
export function discoverPluginNodes(): PluginNodeDefinition[] {
  const pluginNodes: PluginNodeDefinition[] = [];
  const pluginsDir = path.join(process.cwd(), 'plugins');

  if (!fs.existsSync(pluginsDir)) {
    console.warn(`Plugins directory not found: ${pluginsDir}`);
    return pluginNodes;
  }

  const pluginDirs = fs.readdirSync(pluginsDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  for (const pluginDir of pluginDirs) {
    const pluginPath = path.join(pluginsDir, pluginDir);
    const manifestPath = path.join(pluginPath, 'plugin.json');

    if (fs.existsSync(manifestPath)) {
      try {
        const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
        const manifest: PluginManifest = JSON.parse(manifestContent);
        pluginNodes.push(...manifest.nodes);
      } catch (error) {
        console.warn(`Failed to load plugin manifest from ${manifestPath}:`, error);
      }
    }
  }

  return pluginNodes;
}

/**
 * Converts plugin node definitions to NodeDocumentation format
 */
export function convertPluginNodeToDocumentation(pluginNode: PluginNodeDefinition): NodeDocumentation {
  const fields: FieldDocumentation[] = [];

  if (pluginNode.defaultData) {
    for (const [key, value] of Object.entries(pluginNode.defaultData)) {
      fields.push({
        name: key,
        label: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1'),
        type: typeof value,
        required: false,
        description: `Field: ${key}`,
        defaultValue: value,
      });
    }
  }

  return {
    type: pluginNode.type,
    label: pluginNode.label,
    category: pluginNode.category,
    description: pluginNode.description || `Plugin node: ${pluginNode.label}`,
    fields,
    examples: [`Use ${pluginNode.label} node from ${pluginNode.type.split('.')[0]} plugin`],
  };
}

/**
 * Generates complete node documentation including core and plugin nodes
 */
export function generateCompleteNodeDocumentation(): NodeDocumentation[] {
  const coreDocs = generateNodeDocumentation();
  const pluginNodes = discoverPluginNodes();
  const pluginDocs = pluginNodes.map(convertPluginNodeToDocumentation);
  return [...coreDocs, ...pluginDocs];
}

export function getNodeDocumentationAsResource(): string {
  const docs = generateCompleteNodeDocumentation();
  return JSON.stringify(docs, null, 2);
}

export function getNodeDocumentationByType(type: string): NodeDocumentation | null {
  const docs = generateCompleteNodeDocumentation();
  return docs.find(d => d.type === type) || null;
}

/**
 * Returns all node property schemas as a JSON object mapping node type to PropertySchema[]
 */
export function getNodePropertySchemasAsResource(): string {
  const schemas: Record<string, ReturnType<typeof getNodeProperties>> = {};
  for (const nodeType of Object.values(NodeType)) {
    schemas[nodeType] = getNodeProperties(nodeType);
  }

  const pluginNodes = getCachedPluginNodes();
  for (const pluginNode of pluginNodes) {
    if (pluginNode.defaultData) {
      schemas[pluginNode.type] = Object.entries(pluginNode.defaultData).map(([key, value]) => ({
        name: key,
        label: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1'),
        dataType: typeof value === 'number' ? 'INT' as any : typeof value === 'boolean' ? 'BOOLEAN' as any : 'STRING' as any,
        required: false,
        defaultValue: value,
      }));
    }
  }

  return JSON.stringify(schemas, null, 2);
}

/**
 * Returns property schema for a single node type (JSON string)
 */
export function getNodePropertySchemaByType(type: string): string {
  const schema = getNodeProperties(type);
  return JSON.stringify(schema, null, 2);
}
