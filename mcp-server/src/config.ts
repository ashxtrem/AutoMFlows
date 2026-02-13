import * as fs from 'fs';
import * as path from 'path';

export interface MCPConfig {
  backendUrl: string;
  workflowsPath: string;
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
