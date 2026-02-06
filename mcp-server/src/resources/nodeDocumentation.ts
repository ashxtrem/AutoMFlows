import { NodeType } from '@automflows/shared';
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
  'Data': ['elementQuery', 'screenshot'],
  'Verification': ['verify'],
  'API': ['apiRequest', 'apiCurl'],
  'Database': ['dbConnect', 'dbDisconnect', 'dbQuery'],
  'Control': ['wait', 'loop'],
  'Code': ['javascriptCode'],
  'Values': ['intValue', 'stringValue', 'booleanValue', 'inputValue'],
  'Config': ['loadConfigFile', 'selectConfigFile'],
};

export function generateNodeDocumentation(): NodeDocumentation[] {
  const docs: NodeDocumentation[] = [];

  // Start Node
  docs.push({
    type: NodeType.START,
    label: 'Start',
    category: 'Start',
    description: 'The entry point of a workflow. All workflows must start with this node.',
    fields: [
      {
        name: 'slowMo',
        label: 'Slow Motion',
        type: 'number',
        required: false,
        description: 'Delay in milliseconds between node executions',
        defaultValue: 0,
      },
      {
        name: 'screenshotAllNodes',
        label: 'Screenshot All Nodes',
        type: 'boolean',
        required: false,
        description: 'Enable screenshots on all nodes',
        defaultValue: false,
      },
      {
        name: 'recordSession',
        label: 'Record Session',
        type: 'boolean',
        required: false,
        description: 'Enable video recording of the session',
        defaultValue: false,
      },
    ],
    examples: ['Every workflow must begin with a Start node'],
  });

  // Open Browser Node
  docs.push({
    type: NodeType.OPEN_BROWSER,
    label: 'Open Browser',
    category: 'Browser',
    description: 'Opens a browser instance (Chromium, Firefox, or WebKit)',
    fields: [
      {
        name: 'headless',
        label: 'Headless',
        type: 'boolean',
        required: false,
        description: 'Run browser in headless mode',
        defaultValue: false,
      },
      {
        name: 'browser',
        label: 'Browser',
        type: 'string',
        required: false,
        description: 'Browser type: chromium, firefox, or webkit',
        defaultValue: 'chromium',
      },
      {
        name: 'viewportWidth',
        label: 'Viewport Width',
        type: 'number',
        required: false,
        description: 'Browser viewport width in pixels',
        defaultValue: 1280,
      },
      {
        name: 'viewportHeight',
        label: 'Viewport Height',
        type: 'number',
        required: false,
        description: 'Browser viewport height in pixels',
        defaultValue: 720,
      },
    ],
    examples: [
      'Open browser in headless mode',
      'Open Firefox browser with custom viewport',
    ],
  });

  // Navigation Node
  docs.push({
    type: NodeType.NAVIGATION,
    label: 'Navigation',
    category: 'Browser',
    description: 'Navigate to a URL',
    fields: [
      {
        name: 'url',
        label: 'URL',
        type: 'string',
        required: true,
        description: 'The URL to navigate to',
      },
      {
        name: 'waitUntil',
        label: 'Wait Until',
        type: 'string',
        required: false,
        description: 'When to consider navigation finished: load, domcontentloaded, networkidle, commit',
        defaultValue: 'networkidle',
      },
      {
        name: 'timeout',
        label: 'Timeout',
        type: 'number',
        required: false,
        description: 'Navigation timeout in milliseconds',
        defaultValue: 30000,
      },
    ],
    examples: [
      'Navigate to https://example.com',
      'Navigate and wait for network to be idle',
    ],
  });

  // Action Node
  docs.push({
    type: NodeType.ACTION,
    label: 'Action',
    category: 'Interaction',
    description: 'Perform browser actions like click, double-click, hover, etc.',
    fields: [
      {
        name: 'action',
        label: 'Action',
        type: 'string',
        required: true,
        description: 'Action type: click, doubleClick, hover, rightClick, etc.',
      },
      {
        name: 'selector',
        label: 'Selector',
        type: 'string',
        required: true,
        description: 'CSS selector, XPath, or Playwright locator',
      },
      {
        name: 'selectorType',
        label: 'Selector Type',
        type: 'string',
        required: false,
        description: 'Type of selector: css, xpath, getByRole, getByText, etc.',
        defaultValue: 'css',
      },
      {
        name: 'timeout',
        label: 'Timeout',
        type: 'number',
        required: false,
        description: 'Action timeout in milliseconds',
        defaultValue: 30000,
      },
    ],
    examples: [
      'Click a button: selector="button.submit", action="click"',
      'Hover over element: selector=".menu-item", action="hover"',
    ],
  });

  // Type Node
  docs.push({
    type: NodeType.TYPE,
    label: 'Type',
    category: 'Interaction',
    description: 'Type text into an input field',
    fields: [
      {
        name: 'selector',
        label: 'Selector',
        type: 'string',
        required: true,
        description: 'CSS selector or Playwright locator for the input field',
      },
      {
        name: 'text',
        label: 'Text',
        type: 'string',
        required: true,
        description: 'Text to type into the field',
      },
      {
        name: 'clearFirst',
        label: 'Clear First',
        type: 'boolean',
        required: false,
        description: 'Clear the field before typing',
        defaultValue: false,
      },
      {
        name: 'delay',
        label: 'Delay',
        type: 'number',
        required: false,
        description: 'Delay between keystrokes in milliseconds',
        defaultValue: 0,
      },
    ],
    examples: [
      'Type into email field: selector="input[type=email]", text="user@example.com"',
      'Type with delay: text="Hello", delay=100',
    ],
  });

  // Wait Node
  docs.push({
    type: NodeType.WAIT,
    label: 'Wait',
    category: 'Control',
    description: 'Wait for a condition or timeout',
    fields: [
      {
        name: 'waitType',
        label: 'Wait Type',
        type: 'string',
        required: true,
        description: 'Type of wait: timeout, selector, condition, url',
      },
      {
        name: 'value',
        label: 'Value',
        type: 'string | number',
        required: true,
        description: 'Wait value (timeout in ms, selector string, condition, or URL)',
      },
      {
        name: 'timeout',
        label: 'Timeout',
        type: 'number',
        required: false,
        description: 'Maximum wait time in milliseconds',
        defaultValue: 30000,
      },
    ],
    examples: [
      'Wait 5 seconds: waitType="timeout", value=5000',
      'Wait for selector: waitType="selector", value=".loaded"',
    ],
  });

  // API Request Node
  docs.push({
    type: NodeType.API_REQUEST,
    label: 'API Request',
    category: 'API',
    description: 'Make HTTP API requests',
    fields: [
      {
        name: 'method',
        label: 'Method',
        type: 'string',
        required: true,
        description: 'HTTP method: GET, POST, PUT, DELETE, etc.',
      },
      {
        name: 'url',
        label: 'URL',
        type: 'string',
        required: true,
        description: 'API endpoint URL',
      },
      {
        name: 'headers',
        label: 'Headers',
        type: 'object',
        required: false,
        description: 'HTTP headers object',
      },
      {
        name: 'body',
        label: 'Body',
        type: 'string | object',
        required: false,
        description: 'Request body (string or JSON object)',
      },
      {
        name: 'contextKey',
        label: 'Context Key',
        type: 'string',
        required: false,
        description: 'Key to store response in context',
        defaultValue: 'apiResponse',
      },
    ],
    examples: [
      'GET request: method="GET", url="https://api.example.com/data"',
      'POST with JSON: method="POST", body={key: "value"}',
    ],
  });

  // Verify Node
  docs.push({
    type: NodeType.VERIFY,
    label: 'Verify',
    category: 'Verification',
    description: 'Verify conditions, assertions, or element states',
    fields: [
      {
        name: 'domain',
        label: 'Domain',
        type: 'string',
        required: true,
        description: 'Verification domain: browser, api, database',
      },
      {
        name: 'verificationType',
        label: 'Verification Type',
        type: 'string',
        required: true,
        description: 'Type of verification: visible, text, attribute, status, etc.',
      },
      {
        name: 'selector',
        label: 'Selector',
        type: 'string',
        required: false,
        description: 'Element selector (for browser domain)',
      },
      {
        name: 'expectedValue',
        label: 'Expected Value',
        type: 'string | number',
        required: false,
        description: 'Expected value for comparison',
      },
    ],
    examples: [
      'Verify element visible: domain="browser", verificationType="visible", selector=".success"',
      'Verify API status: domain="api", verificationType="status", expectedValue=200',
    ],
  });

  // Add more node types as needed...
  // For brevity, I'm including the most commonly used ones

  return docs;
}

/**
 * Discovers plugin nodes by scanning the plugins directory
 */
export function discoverPluginNodes(): PluginNodeDefinition[] {
  const pluginNodes: PluginNodeDefinition[] = [];
  const pluginsDir = path.join(process.cwd(), 'plugins');

  // Check if plugins directory exists
  if (!fs.existsSync(pluginsDir)) {
    console.warn(`Plugins directory not found: ${pluginsDir}`);
    return pluginNodes;
  }

  // Scan plugins directory
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

        // Add all nodes from this plugin
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
  // Extract fields from defaultData
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

  // Combine core and plugin documentation
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
