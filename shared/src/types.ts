// Node Types
export enum NodeType {
  START = 'start',
  OPEN_BROWSER = 'openBrowser',
  NAVIGATE = 'navigate',
  CLICK = 'click',
  TYPE = 'type',
  GET_TEXT = 'getText',
  SCREENSHOT = 'screenshot',
  WAIT = 'wait',
  JAVASCRIPT_CODE = 'javascriptCode',
  LOOP = 'loop',
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
}

export interface OpenBrowserNodeData {
  headless?: boolean;
  viewportWidth?: number;
  viewportHeight?: number;
  userAgent?: string;
}

export interface NavigateNodeData {
  url: string;
  timeout?: number;
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle' | 'commit';
  failSilently?: boolean;
  referer?: string;
}

export interface ClickNodeData {
  selector: string;
  selectorType?: 'css' | 'xpath';
  timeout?: number;
  failSilently?: boolean;
}

export interface TypeNodeData {
  selector: string;
  selectorType?: 'css' | 'xpath';
  text: string;
  timeout?: number;
  failSilently?: boolean;
}

export interface GetTextNodeData {
  selector: string;
  selectorType?: 'css' | 'xpath';
  outputVariable?: string;
  timeout?: number;
  failSilently?: boolean;
}

export interface ScreenshotNodeData {
  path?: string;
  fullPage?: boolean;
  failSilently?: boolean;
}

export interface WaitNodeData {
  waitType: 'timeout' | 'selector';
  value: number | string; // timeout in ms or selector string
  selectorType?: 'css' | 'xpath';
  timeout?: number;
  failSilently?: boolean;
}

export interface JavaScriptCodeNodeData {
  code: string;
  failSilently?: boolean;
}

export interface LoopNodeData {
  arrayVariable: string; // Variable name from previous node output
  failSilently?: boolean;
}

export type NodeData =
  | StartNodeData
  | OpenBrowserNodeData
  | NavigateNodeData
  | ClickNodeData
  | TypeNodeData
  | GetTextNodeData
  | ScreenshotNodeData
  | WaitNodeData
  | JavaScriptCodeNodeData
  | LoopNodeData
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

// Execution Event
export interface ExecutionEvent {
  type: ExecutionEventType;
  nodeId?: string;
  message?: string;
  data?: any;
  timestamp: number;
}

// API Request/Response Types
export interface ExecuteWorkflowRequest {
  workflow: Workflow;
  traceLogs?: boolean; // Enable trace logging to terminal (default: false)
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

