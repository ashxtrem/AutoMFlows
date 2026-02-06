import { Node } from 'reactflow';
import { SetConfigNodeData } from '@automflows/shared';
import { useState, useMemo, useEffect, useCallback } from 'react';
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

/**
 * Path information for validation
 */
interface PathInfo {
  path: string;
  type: 'primitive' | 'object' | 'array';
  value: any;
}

/**
 * Validation result
 */
interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Find duplicate keys at the same level in JSON string
 * This checks the raw string before JSON.parse to catch duplicates
 * Uses a simple tokenizer approach
 */
function findDuplicateKeys(jsonString: string): string[] {
  const duplicates: string[] = [];
  const trimmed = jsonString.trim();
  
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) {
    return duplicates;
  }
  
  /**
   * Extract keys from root level object
   * Simple approach: find all "key": patterns at root level
   */
  const extractRootLevelKeys = (content: string): string[] => {
    const keys: string[] = [];
    let i = 0;
    let depth = 0; // Track object/array nesting depth
    let inString = false;
    let stringChar = '';
    let escapeNext = false;
    
    while (i < content.length) {
      const char = content[i];
      
      if (escapeNext) {
        escapeNext = false;
        i++;
        continue;
      }
      
      if (char === '\\' && inString) {
        escapeNext = true;
        i++;
        continue;
      }
      
      if (!inString) {
        if (char === '"' || char === "'") {
          inString = true;
          stringChar = char;
          
          // Check if this might be a key (at root level)
          if (depth === 0) {
            // Look ahead to find colon
            let j = i + 1;
            let foundColon = false;
            let keyEnd = -1;
            
            while (j < content.length && j < i + 500) {
              const nextChar = content[j];
              
              if (nextChar === stringChar && content[j - 1] !== '\\') {
                // End of string
                keyEnd = j;
                j++;
                // Skip whitespace
                while (j < content.length && /\s/.test(content[j])) {
                  j++;
                }
                if (j < content.length && content[j] === ':') {
                  foundColon = true;
                }
                break;
              }
              j++;
            }
            
            if (foundColon && keyEnd > i) {
              // Extract key
              const key = content.substring(i + 1, keyEnd);
              // Unescape key
              const unescapedKey = key.replace(/\\(.)/g, (_match, escaped) => {
                const escapes: Record<string, string> = {
                  'n': '\n',
                  't': '\t',
                  'r': '\r',
                  '\\': '\\',
                  '"': '"',
                  "'": "'"
                };
                return escapes[escaped] || escaped;
              });
              keys.push(unescapedKey);
            }
          }
        } else if (char === '{' || char === '[') {
          depth++;
        } else if (char === '}' || char === ']') {
          depth--;
        }
      } else {
        // In string
        if (char === stringChar) {
          inString = false;
          stringChar = '';
        }
      }
      
      i++;
    }
    
    return keys;
  };
  
  // Extract root object content (between first { and last })
  const rootContent = trimmed.slice(1, -1);
  const rootKeys = extractRootLevelKeys(rootContent);
  
  // Find duplicates
  const seen = new Map<string, number>();
  for (const key of rootKeys) {
    const count = seen.get(key) || 0;
    seen.set(key, count + 1);
    if (count === 1 && !duplicates.includes(key)) {
      duplicates.push(key);
    }
  }
  
  return duplicates;
}

/**
 * Collect all paths recursively from an object
 * Handles nested objects and arrays
 */
function collectAllPaths(obj: any, prefix = '', paths: Map<string, PathInfo> = new Map()): Map<string, PathInfo> {
  if (obj === null || obj === undefined) {
    const path = prefix || 'null';
    if (!paths.has(path)) {
      paths.set(path, {
        path,
        type: 'primitive',
        value: null,
      });
    }
    return paths;
  }
  
  if (Array.isArray(obj)) {
    // Array itself
    const arrayPath = prefix || '[]';
    if (!paths.has(arrayPath)) {
      paths.set(arrayPath, {
        path: arrayPath,
        type: 'array',
        value: obj,
      });
    }
    
    // Process array items
    obj.forEach((item, index) => {
      const itemPath = prefix ? `${prefix}[${index}]` : `[${index}]`;
      if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
        // Nested object in array
        collectAllPaths(item, itemPath, paths);
      } else if (Array.isArray(item)) {
        // Nested array
        collectAllPaths(item, itemPath, paths);
      } else {
        // Primitive in array
        paths.set(itemPath, {
          path: itemPath,
          type: 'primitive',
          value: item,
        });
      }
    });
    
    return paths;
  }
  
  if (typeof obj === 'object') {
    // Object itself
    const objectPath = prefix || '{}';
    if (!paths.has(objectPath)) {
      paths.set(objectPath, {
        path: objectPath,
        type: 'object',
        value: obj,
      });
    }
    
    // Process object properties
    for (const [key, value] of Object.entries(obj)) {
      const newPath = prefix ? `${prefix}.${key}` : key;
      
      if (value === null || value === undefined) {
        paths.set(newPath, {
          path: newPath,
          type: 'primitive',
          value: null,
        });
      } else if (Array.isArray(value)) {
        collectAllPaths(value, newPath, paths);
      } else if (typeof value === 'object') {
        collectAllPaths(value, newPath, paths);
      } else {
        // Primitive
        paths.set(newPath, {
          path: newPath,
          type: 'primitive',
          value: value,
        });
      }
    }
    
    return paths;
  }
  
  // Primitive value
  const primitivePath = prefix || 'value';
  paths.set(primitivePath, {
    path: primitivePath,
    type: 'primitive',
    value: obj,
  });
  
  return paths;
}

/**
 * Find path conflicts where a path exists with conflicting types
 * or where parent/child paths conflict
 */
function findPathConflicts(paths: Map<string, PathInfo>): string[] {
  const errors: string[] = [];
  const pathArray = Array.from(paths.entries());
  
  // Check for conflicts where a path is both primitive and non-primitive
  // This shouldn't happen in valid JSON, but we check anyway
  const pathTypes = new Map<string, Set<string>>();
  
  for (const [path, info] of pathArray) {
    if (!pathTypes.has(path)) {
      pathTypes.set(path, new Set());
    }
    pathTypes.get(path)!.add(info.type);
  }
  
  // Check for type conflicts at the same path
  for (const [path, types] of pathTypes.entries()) {
    if (types.size > 1) {
      errors.push(`Path conflict: '${path}' has conflicting types: ${Array.from(types).join(', ')}`);
    }
  }
  
  // Check for parent-child conflicts
  // If "a" is a primitive, then "a.b" shouldn't exist
  // If "a" is an object, then "a.b" is valid
  for (const [path, info] of pathArray) {
    if (info.type === 'primitive') {
      // Check if any child paths exist
      const childPaths = pathArray.filter(([p]) => {
        if (path === '') return false;
        // Check if p is a child of path
        // e.g., path="a", p="a.b" or p="a[0]"
        return p.startsWith(path + '.') || p.startsWith(path + '[');
      });
      
      if (childPaths.length > 0) {
        const childPathList = childPaths.map(([p]) => `'${p}'`).join(', ');
        errors.push(`Path conflict: '${path}' is a primitive value but has child paths: ${childPathList}`);
      }
    }
  }
  
  return errors;
}

/**
 * Validate configuration paths
 * Checks for duplicate keys and path conflicts
 */
function validateConfigPaths(jsonString: string, parsed: any): ValidationResult {
  const errors: string[] = [];
  
  // 1. Check for duplicate keys at same level
  const duplicateKeys = findDuplicateKeys(jsonString);
  if (duplicateKeys.length > 0) {
    errors.push(`Duplicate keys found at the same level: ${duplicateKeys.map(k => `'${k}'`).join(', ')}`);
  }
  
  // 2. Collect all paths and their types
  const paths = collectAllPaths(parsed);
  
  // 3. Check for conflicts
  const conflicts = findPathConflicts(paths);
  if (conflicts.length > 0) {
    errors.push(...conflicts);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

export default function SetConfigConfig({ node, onChange }: SetConfigConfigProps) {
  const data = node.data as SetConfigNodeData;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [jsonValue, setJsonValue] = useState<string>('{}');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [originalJsonValue, setOriginalJsonValue] = useState<string>('{}');
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
        setOriginalJsonValue(jsonString);
        setJsonError(null);
      } catch (error: any) {
        setJsonError(error.message);
      }
    }
  }, [isModalOpen, config]);

  // Check if there are unsaved changes
  const hasUnsavedChanges = useCallback((): boolean => {
    try {
      const current = jsonValue.trim();
      const original = originalJsonValue.trim();
      
      // Parse both to compare structure (ignoring formatting)
      const currentParsed = JSON.parse(current);
      const originalParsed = JSON.parse(original);
      
      return JSON.stringify(currentParsed) !== JSON.stringify(originalParsed);
    } catch {
      // If parsing fails, consider it changed if strings differ
      return jsonValue.trim() !== originalJsonValue.trim();
    }
  }, [jsonValue, originalJsonValue]);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingKey(null);
    setJsonError(null);
    // Reset to original value if not saved
    setJsonValue(originalJsonValue);
  }, [originalJsonValue]);

  const handleCloseWithCheck = useCallback(() => {
    if (hasUnsavedChanges()) {
      const confirmed = window.confirm(
        'You have unsaved changes. Are you sure you want to close without saving?'
      );
      if (!confirmed) {
        return;
      }
    }
    handleCloseModal();
  }, [hasUnsavedChanges, handleCloseModal]);

  // Handle keyboard events (ESC and Backspace prevention)
  useEffect(() => {
    if (!isModalOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent backspace from deleting nodes when modal is open
      if (e.key === 'Backspace') {
        const target = e.target as HTMLElement;
        // Allow backspace in Monaco editor and input fields
        const isInEditableElement = target instanceof HTMLInputElement || 
                                    target instanceof HTMLTextAreaElement ||
                                    target.closest('.monaco-editor') !== null ||
                                    target.closest('[contenteditable="true"]') !== null;
        
        if (!isInEditableElement) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
        }
      }
      
      // Handle ESC key
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        handleCloseWithCheck();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true); // Use capture phase to catch early
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isModalOpen, handleCloseWithCheck]);

  const handleOpenModal = (key?: string) => {
    setEditingKey(key || null);
    setIsModalOpen(true);
  };

  const handleSaveConfig = () => {
    try {
      // Validate JSON
      const trimmedJson = jsonValue.trim();
      const parsed = JSON.parse(trimmedJson);
      
      // Validate that it's an object
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        setJsonError('Config must be a JSON object');
        return;
      }

      // Validate paths for duplicates and conflicts
      const validation = validateConfigPaths(trimmedJson, parsed);
      if (!validation.isValid) {
        // Display all validation errors
        const errorMessage = validation.errors.join('\n');
        setJsonError(errorMessage);
        return;
      }

      // Save config
      onChange('config', parsed);
      setJsonError(null);
      // Update original value to current saved value
      setOriginalJsonValue(trimmedJson);
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
              handleCloseWithCheck();
            }
          }}
          onKeyDown={(e) => {
            // Prevent backspace from propagating
            if (e.key === 'Backspace' && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
              e.preventDefault();
              e.stopPropagation();
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
                onClick={handleCloseWithCheck}
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
                  <div className="mt-2">
                    <div className="text-sm text-red-400 font-medium mb-1">Validation Errors:</div>
                    <div className="text-sm text-red-400 whitespace-pre-wrap break-words">
                      {jsonError.split('\n').map((error, index) => (
                        <div key={index} className="mb-1">
                          • {error}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <p className="mt-2 text-xs text-gray-400">
                  Enter valid JSON object. All paths must be unique. Press Escape to cancel.
                </p>
              </div>
            </div>

            <div className="p-4 border-t border-gray-700 flex justify-end gap-2">
              <button
                onClick={handleCloseWithCheck}
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
