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
  'Data': ['elementQuery', 'screenshot', 'csvHandle'],
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
    description: 'Navigate to a URL',
    examples: ['Navigate to https://example.com', 'Navigate and wait for network to be idle'],
  },
  [NodeType.ACTION]: {
    label: 'Action',
    description: 'Perform browser actions like click, double-click, hover, etc.',
    examples: ['Click a button: selector="button.submit", action="click"', 'Hover over element: selector=".menu-item", action="hover"'],
  },
  [NodeType.TYPE]: {
    label: 'Type',
    description: 'Type text into an input field',
    examples: ['Type into email field: selector="input[type=email]", text="user@example.com"', 'Type with delay: text="Hello", delay=100'],
  },
  [NodeType.WAIT]: {
    label: 'Wait',
    description: 'Wait for a condition or timeout',
    examples: ['Wait 5 seconds: waitType="timeout", value=5000', 'Wait for selector: waitType="selector", value=".loaded"'],
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
    description: 'Read CSV from file into context, or write/append an array from context to a CSV file.',
    examples: ['Write products to CSV: action="write", filePath="${data.outputDirectory}/products.csv", dataSource="products"', 'Read CSV: action="read", filePath="/path/to/data.csv", contextKey="csvData"'],
  },
  [NodeType.KEYBOARD]: {
    label: 'Keyboard',
    description: 'Send keyboard input (key press, shortcuts, type)',
    examples: ['Press Enter key', 'Type text with delay'],
  },
  [NodeType.SCROLL]: {
    label: 'Scroll',
    description: 'Scroll the page or an element',
    examples: ['Scroll to element', 'Scroll by delta'],
  },
  [NodeType.STORAGE]: {
    label: 'Storage',
    description: 'Get or set cookies, localStorage, sessionStorage',
    examples: ['Get cookies', 'Set localStorage value'],
  },
  [NodeType.DIALOG]: {
    label: 'Dialog',
    description: 'Handle browser dialogs (alert, confirm, prompt)',
    examples: ['Accept alert', 'Dismiss confirm'],
  },
  [NodeType.DOWNLOAD]: {
    label: 'Download',
    description: 'Wait for or handle file downloads',
    examples: ['Wait for download to complete'],
  },
  [NodeType.IFRAME]: {
    label: 'Iframe',
    description: 'Switch to or interact with iframes',
    examples: ['Switch to iframe by selector'],
  },
  [NodeType.ELEMENT_QUERY]: {
    label: 'Element Query',
    description: 'Query elements and extract text, attributes, or count',
    examples: ['Get text from element', 'Get attribute value'],
  },
  [NodeType.FORM_INPUT]: {
    label: 'Form Input',
    description: 'Interact with form elements (select, check, fill)',
    examples: ['Select option from dropdown', 'Check checkbox'],
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
    description: 'Modify browser context (geolocation, viewport, permissions, etc.)',
    examples: ['Set geolocation', 'Set viewport size'],
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
  return JSON.stringify(schemas, null, 2);
}

/**
 * Returns property schema for a single node type (JSON string)
 */
export function getNodePropertySchemaByType(type: string): string {
  const schema = getNodeProperties(type);
  return JSON.stringify(schema, null, 2);
}
