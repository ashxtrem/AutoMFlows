import * as fs from 'fs';
import * as path from 'path';

/** Wait inserted after navigation actions (ms) */
export const WAIT_AFTER_NAVIGATE_MS = 3000;
/** Wait inserted after click/submit actions (ms) */
export const WAIT_AFTER_CLICK_MS = 2000;
/** Default fallback wait when no explicit duration is given (ms) */
export const DEFAULT_WAIT_MS = 2000;
/** Default maximum execution/polling duration (ms) -- 5 minutes */
export const MAX_EXECUTION_DURATION_MS = 300000;
/** Default maximum wait for a breakpoint to trigger (ms) -- 60 seconds */
export const MAX_BREAKPOINT_WAIT_MS = 60000;
/** Default maximum phase duration for incremental workflow creation (ms) -- 2 minutes */
export const MAX_PHASE_DURATION_MS = 120000;
/** HTTP client request timeout (ms) */
export const HTTP_REQUEST_TIMEOUT_MS = 60000;

export interface MCPConfig {
  backendUrl: string;
  workflowsPath: string;
  verbose: boolean;
  llm: {
    provider: 'openai' | 'local' | 'none';
    openai?: {
      apiKey: string;
      model: string;
    };
    local?: {
      baseUrl: string;
      model: string;
    };
  };
}

const defaultConfig: MCPConfig = {
  backendUrl: process.env.AUTOMFLOWS_BACKEND_URL || 'http://localhost:3003',
  workflowsPath: process.env.AUTOMFLOWS_WORKFLOWS_PATH || path.join(process.cwd(), 'tests', 'workflows', 'demo'),
  verbose: process.env.AUTOMFLOWS_VERBOSE === 'true',
  llm: {
    provider: (process.env.LLM_PROVIDER as 'openai' | 'local' | 'none') || 'none',
    openai: {
      apiKey: process.env.OPENAI_API_KEY || '',
      model: process.env.OPENAI_MODEL || 'gpt-4',
    },
    local: {
      baseUrl: process.env.LOCAL_LLM_BASE_URL || 'http://localhost:11434',
      model: process.env.LOCAL_LLM_MODEL || 'llama3',
    },
  },
};

let config: MCPConfig = defaultConfig;

export function loadConfig(configPath?: string): MCPConfig {
  if (configPath && fs.existsSync(configPath)) {
    try {
      const configFile = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      config = { ...defaultConfig, ...configFile };
    } catch (error) {
      console.warn(`Failed to load config from ${configPath}, using defaults:`, error);
    }
  }
  return config;
}

export function getConfig(): MCPConfig {
  return config;
}
