import { Node } from 'reactflow';
import { LoadConfigFileNodeData, SelectConfigFileNodeData, NodeType } from '@automflows/shared';
import { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, ChevronUp, X, Plus, Power, PowerOff } from 'lucide-react';
import JsonPreview from '../JsonPreview';
import { validateConfigPaths } from '../../utils/configValidation';

interface LoadConfigFileConfigProps {
  node: Node;
  onChange: (field: string, value: any) => void;
}

interface ConfigItem {
  id: string;
  fileName: string;
  fileContent: string;
  contextKey?: string;
  enabled: boolean;
}

export default function LoadConfigFileConfig({ node, onChange }: LoadConfigFileConfigProps) {
  const data = node.data as LoadConfigFileNodeData | SelectConfigFileNodeData;
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Migrate old format to new format on mount
  useEffect(() => {
    const migratedData = migrateOldFormat(data, node.data.type as NodeType);
    if (migratedData) {
      onChange('configs', migratedData.configs);
      // Clear old fields if they exist
      if ('filePath' in migratedData && migratedData.filePath) {
        onChange('filePath', undefined);
      }
      if ('fileContent' in migratedData && migratedData.fileContent) {
        onChange('fileContent', undefined);
        onChange('fileName', undefined);
      }
    }
  }, []); // Only run once on mount

  const configs = useMemo(() => {
    return (data.configs || []) as ConfigItem[];
  }, [data.configs]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }

    // Validate file type
    if (!file.name.endsWith('.json')) {
      return;
    }

    try {
      const fileContent = await file.text();
      
      // Validate JSON syntax
      let parsed: any;
      try {
        parsed = JSON.parse(fileContent);
      } catch (error: any) {
        // Invalid JSON - will be caught by validation
        return;
      }

      // Validate that it's an object
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        return;
      }

      // Validate paths
      const validation = validateConfigPaths(fileContent, parsed);
      if (!validation.isValid) {
        // Validation errors will be shown in the config section
        // Still add the config but mark it as having errors
      }

      // Create new config item
      const newConfig: ConfigItem = {
        id: `config-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        fileName: file.name,
        fileContent: fileContent,
        contextKey: undefined,
        enabled: configs.length === 0, // First config enabled by default, others disabled
      };

      // Add to configs array
      const updatedConfigs = [...configs, newConfig];
      onChange('configs', updatedConfigs);

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error: any) {
      console.error('Failed to read file:', error);
    }
  };

  const handleSelectFile = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveConfig = (configId: string) => {
    const updatedConfigs = configs.filter(c => c.id !== configId);
    onChange('configs', updatedConfigs.length > 0 ? updatedConfigs : undefined);
  };

  const handleToggleEnabled = (configId: string) => {
    const updatedConfigs = configs.map(c => 
      c.id === configId ? { ...c, enabled: !c.enabled } : c
    );
    onChange('configs', updatedConfigs);
  };

  const handleContextKeyChange = (configId: string, contextKey: string) => {
    const updatedConfigs = configs.map(c => 
      c.id === configId ? { ...c, contextKey: contextKey || undefined } : c
    );
    onChange('configs', updatedConfigs);
  };

  const [expandedConfigs, setExpandedConfigs] = useState<Set<string>>(new Set());

  const toggleExpand = (configId: string) => {
    const newExpanded = new Set(expandedConfigs);
    if (newExpanded.has(configId)) {
      newExpanded.delete(configId);
    } else {
      newExpanded.add(configId);
    }
    setExpandedConfigs(newExpanded);
  };

  // Validate each config's content
  const getConfigValidation = (config: ConfigItem) => {
    try {
      const parsed = JSON.parse(config.fileContent);
      return validateConfigPaths(config.fileContent, parsed);
    } catch {
      return { isValid: false, errors: ['Invalid JSON'] };
    }
  };

  return (
    <div className="space-y-4">
      {/* Config Sections */}
      {configs.map((config) => {
        const isExpanded = expandedConfigs.has(config.id);
        const validation = getConfigValidation(config);
        let parsedContent: any = null;
        try {
          parsedContent = JSON.parse(config.fileContent);
        } catch {
          parsedContent = null;
        }

        return (
          <div key={config.id} className="border border-gray-700 rounded-lg overflow-hidden">
            {/* Config Header */}
            <div className="bg-gray-800 p-3 flex items-center justify-between">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <button
                  onClick={() => toggleExpand(config.id)}
                  className="text-gray-400 hover:text-white transition-colors flex-shrink-0"
                >
                  {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
                <span className="text-sm font-medium text-gray-300 truncate flex-1">
                  {config.fileName}
                </span>
                <button
                  onClick={() => handleToggleEnabled(config.id)}
                  className={`flex-shrink-0 p-1.5 rounded transition-colors ${
                    config.enabled
                      ? 'text-green-400 hover:text-green-300 bg-green-900/20'
                      : 'text-gray-500 hover:text-gray-400 bg-gray-700/50'
                  }`}
                  title={config.enabled ? 'Disable config' : 'Enable config'}
                >
                  {config.enabled ? <Power size={16} /> : <PowerOff size={16} />}
                </button>
                <button
                  onClick={() => handleRemoveConfig(config.id)}
                  className="text-gray-400 hover:text-red-400 transition-colors flex-shrink-0 p-1"
                  title="Remove config"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Config Content (Collapsible) */}
            {isExpanded && (
              <div className="p-4 bg-gray-800/50 space-y-4">
                {/* Validation Errors */}
                {!validation.isValid && (
                  <div className="p-3 bg-red-900/30 border border-red-600/50 rounded text-sm text-red-400">
                    <div className="font-medium mb-1">Validation Errors:</div>
                    <div className="space-y-1">
                      {validation.errors.map((error, index) => (
                        <div key={index}>• {error}</div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Context Key Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Context Key (Optional)
                  </label>
                  <input
                    type="text"
                    value={config.contextKey || ''}
                    onChange={(e) => handleContextKeyChange(config.id, e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-gray-200"
                    placeholder="env (leave empty to merge into root)"
                  />
                  <p className="mt-1 text-xs text-gray-400">
                    If specified, config will be stored under data.{config.contextKey || 'key'}. Otherwise, merged into root
                  </p>
                </div>

                {/* JSON Preview */}
                {parsedContent && (
                  <JsonPreview
                    jsonContent={parsedContent}
                    contextKey={config.contextKey}
                    error={validation.isValid ? undefined : validation.errors.join('\n')}
                  />
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Load Config Button */}
      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          onChange={handleFileSelect}
          className="hidden"
        />
        <button
          type="button"
          onClick={handleSelectFile}
          className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded flex items-center justify-center gap-2 transition-colors"
        >
          <Plus size={16} />
          Load Config
        </button>
        <p className="mt-1 text-xs text-gray-400 text-center">
          Select a JSON file to load configuration
        </p>
      </div>
    </div>
  );
}

/**
 * Migrate old data format to new format
 */
function migrateOldFormat(
  data: LoadConfigFileNodeData | SelectConfigFileNodeData,
  nodeType: NodeType
): { configs?: ConfigItem[] } | null {
  const configs: ConfigItem[] = [];

  // Handle LoadConfigFileNodeData (filePath)
  if (nodeType === NodeType.LOAD_CONFIG_FILE && 'filePath' in data && data.filePath) {
    // Old format with filePath - we can't migrate this automatically since we don't have file content
    // User will need to reload the file
    return null;
  }

  // Handle SelectConfigFileNodeData (fileContent)
  if (
    (nodeType === NodeType.SELECT_CONFIG_FILE || nodeType === NodeType.LOAD_CONFIG_FILE) &&
    'fileContent' in data &&
    data.fileContent
  ) {
    configs.push({
      id: `config-${Date.now()}-migrated`,
      fileName: ('fileName' in data && data.fileName) || 'config.json',
      fileContent: data.fileContent,
      contextKey: data.contextKey,
      enabled: true, // First migrated config enabled by default
    });
  }

  // If configs array already exists, use it
  if ('configs' in data && Array.isArray(data.configs) && data.configs.length > 0) {
    return null; // Already in new format
  }

  return configs.length > 0 ? { configs } : null;
}
