import { Node } from 'reactflow';
import { SetConfigNodeData } from '@automflows/shared';
import { useState, useMemo, useEffect } from 'react';
import { X, Plus, Copy, Edit, Download } from 'lucide-react';
import Editor from '@monaco-editor/react';
import { useNotificationStore } from '../../frontend/src/store/notificationStore';

interface SetConfigConfigProps {
  node: Node;
  onChange: (field: string, value: any) => void;
}

interface FlattenedItem {
  key: string;
  value: any;
  path: string;
  type: string;
}

/**
 * Flatten nested JSON objects into dot-notation keys
 */
function flattenObject(obj: any, prefix = '', items: FlattenedItem[] = []): FlattenedItem[] {
  if (obj === null || obj === undefined) {
    items.push({
      key: prefix || 'null',
      value: null,
      path: prefix || 'null',
      type: 'null',
    });
    return items;
  }

  const objType = Array.isArray(obj) ? 'array' : typeof obj;

  if (objType === 'object' && !Array.isArray(obj)) {
    // It's an object, recurse into its properties
    for (const [key, value] of Object.entries(obj)) {
      const newPrefix = prefix ? `${prefix}.${key}` : key;
      flattenObject(value, newPrefix, items);
    }
  } else {
    // It's a primitive value or array
    items.push({
      key: prefix,
      value: obj,
      path: prefix,
      type: Array.isArray(obj) ? 'array' : typeof obj,
    });
  }

  return items;
}

/**
 * Format value for display
 */
function formatValue(value: any, type: string): string {
  if (value === null || value === undefined) {
    return 'null';
  }
  
  if (type === 'array') {
    return `[${Array.isArray(value) ? value.length : 0} items]`;
  }
  
  if (type === 'object') {
    return '{...}';
  }
  
  if (type === 'string') {
    const str = String(value);
    return str.length > 50 ? `${str.substring(0, 50)}...` : str;
  }
  
  return String(value);
}

/**
 * Generate the variable path for copying
 */
function generateVariablePath(path: string, contextKey?: string): string {
  if (contextKey) {
    return `\${data.${contextKey}.${path}}`;
  }
  return `\${data.${path}}`;
}

export default function SetConfigConfig({ node, onChange }: SetConfigConfigProps) {
  const data = node.data as SetConfigNodeData;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [jsonValue, setJsonValue] = useState<string>('{}');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const addNotification = useNotificationStore((state) => state.addNotification);

  const config = data.config || {};
  const hasConfig = Object.keys(config).length > 0;

  // Flatten config for display
  const flattenedItems = useMemo(() => {
    if (!hasConfig || typeof config !== 'object' || Array.isArray(config)) {
      return [];
    }
    return flattenObject(config);
  }, [config, hasConfig]);

  // Initialize modal with current config when opening
  useEffect(() => {
    if (isModalOpen) {
      try {
        const jsonString = JSON.stringify(config, null, 2);
        setJsonValue(jsonString);
        setJsonError(null);
      } catch (error: any) {
        setJsonError(error.message);
      }
    }
  }, [isModalOpen, config]);

  const handleOpenModal = (key?: string) => {
    setEditingKey(key || null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingKey(null);
    setJsonError(null);
  };

  const handleSaveConfig = () => {
    try {
      // Validate JSON
      const parsed = JSON.parse(jsonValue.trim());
      
      // Validate that it's an object
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        setJsonError('Config must be a JSON object');
        return;
      }

      // Save config
      onChange('config', parsed);
      setJsonError(null);
      handleCloseModal();
      
      addNotification({
        type: 'success',
        title: 'Config Saved',
        message: 'Configuration data has been saved successfully',
      });
    } catch (error: any) {
      setJsonError(`Invalid JSON: ${error.message}`);
    }
  };

  const handleExportConfig = () => {
    if (!hasConfig) {
      addNotification({
        type: 'error',
        title: 'No Config',
        message: 'No config data to export',
      });
      return;
    }

    const jsonString = JSON.stringify(config, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    
    // Generate filename: config-{timestamp}.json
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `config-${timestamp}.json`;
    
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);

    // Update exportedFileName for reference
    onChange('exportedFileName', filename);

    // Show notification with usage hint
    addNotification({
      type: 'success',
      title: 'Config Exported',
      message: `Config saved as ${filename}. Use this file path in Load Config File node.`,
    });
  };

  const copyToClipboard = async (text: string, label?: string) => {
    try {
      await navigator.clipboard.writeText(text);
      addNotification({
        type: 'success',
        title: 'Copied',
        message: label ? `${label} copied to clipboard` : 'Copied to clipboard',
      });
    } catch (err) {
      console.error('Failed to copy:', err);
      addNotification({
        type: 'error',
        title: 'Copy Failed',
        message: 'Failed to copy to clipboard',
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Context Key Input */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Context Key (Optional)
        </label>
        <input
          type="text"
          value={data.contextKey || ''}
          onChange={(e) => onChange('contextKey', e.target.value || undefined)}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-gray-200"
          placeholder="env (leave empty to merge into root)"
        />
        <p className="mt-1 text-xs text-gray-400">
          If specified, config will be stored under data.{data.contextKey || 'key'}. Otherwise, merged into root
        </p>
      </div>

      {/* Empty State or Config List */}
      {!hasConfig ? (
        <div className="flex justify-center py-8">
          <button
            onClick={() => handleOpenModal()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded flex items-center gap-2 transition-colors"
          >
            <Plus size={16} />
            Add Config
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-300">Config Data</h3>
            <button
              onClick={() => handleOpenModal()}
              className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded flex items-center gap-1 transition-colors"
            >
              <Edit size={12} />
              Edit All
            </button>
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {flattenedItems.map((item, index) => (
              <div
                key={index}
                className="flex items-start gap-2 p-2 bg-gray-800 rounded hover:bg-gray-700 transition-colors"
              >
                <div 
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleOpenModal(item.path);
                  }}
                >
                  <div className="text-xs text-gray-300 font-mono break-all">
                    {item.key}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {formatValue(item.value, item.type)}
                    <span className="ml-2 text-gray-600">({item.type})</span>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    copyToClipboard(
                      generateVariablePath(item.path, data.contextKey),
                      item.key
                    );
                  }}
                  className="flex-shrink-0 p-1.5 text-gray-400 hover:text-blue-400 hover:bg-gray-700 rounded transition-colors"
                  title={`Copy ${generateVariablePath(item.path, data.contextKey)}`}
                >
                  <Copy size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Export Button */}
      {hasConfig && (
        <div className="pt-2 border-t border-gray-700">
          <button
            onClick={handleExportConfig}
            className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded flex items-center justify-center gap-2 transition-colors"
          >
            <Download size={16} />
            Export as JSON
          </button>
        </div>
      )}

      {/* Modal Editor */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handleCloseModal();
            }
          }}
        >
          <div 
            className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[85vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h2 className="text-lg font-semibold text-white">
                {editingKey ? `Edit Config - ${editingKey}` : 'Edit Config'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="overflow-y-auto p-4 flex-1">
              <div className="mb-4">
                <div className="bg-gray-900 border border-gray-700 rounded overflow-hidden" style={{ minHeight: '400px' }}>
                  <Editor
                    height="400px"
                    language="json"
                    value={jsonValue}
                    onChange={(value) => {
                      setJsonValue(value || '{}');
                      setJsonError(null);
                    }}
                    theme="vs-dark"
                    options={{
                      minimap: { enabled: false },
                      fontSize: 12,
                      lineNumbers: 'on',
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                      formatOnPaste: true,
                      formatOnType: true,
                      readOnly: false,
                    }}
                    loading={
                      <div className="flex items-center justify-center h-[400px] text-gray-400">
                        Loading editor...
                      </div>
                    }
                  />
                </div>
                {jsonError && (
                  <p className="mt-2 text-sm text-red-400">{jsonError}</p>
                )}
                <p className="mt-2 text-xs text-gray-400">
                  Enter valid JSON object. Press Escape to cancel.
                </p>
              </div>
            </div>

            <div className="p-4 border-t border-gray-700 flex justify-end gap-2">
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveConfig}
                disabled={!!jsonError}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
