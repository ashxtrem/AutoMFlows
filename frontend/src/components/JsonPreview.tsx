import { useState, useMemo } from 'react';
import { Copy } from 'lucide-react';
import { useNotificationStore } from '../store/notificationStore';

interface JsonPreviewProps {
  jsonContent: string | object | null;
  contextKey?: string; // If JSON is stored under a context key
  loading?: boolean;
  error?: string | null;
}

interface FlattenedItem {
  key: string;
  value: any;
  path: string;
  type: string;
}

type TabType = 'variables' | 'json';

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

export default function JsonPreview({ jsonContent, contextKey, loading, error }: JsonPreviewProps) {
  const [activeTab, setActiveTab] = useState<TabType>('variables');
  const addNotification = useNotificationStore((state) => state.addNotification);

  // Parse JSON content
  const parsedJson = useMemo(() => {
    if (!jsonContent) return null;
    
    if (typeof jsonContent === 'string') {
      try {
        return JSON.parse(jsonContent);
      } catch {
        return null;
      }
    }
    
    return jsonContent;
  }, [jsonContent]);

  // Flatten JSON for variables tab
  const flattenedItems = useMemo(() => {
    if (!parsedJson || typeof parsedJson !== 'object' || Array.isArray(parsedJson)) {
      return [];
    }
    return flattenObject(parsedJson);
  }, [parsedJson]);

  // Format JSON string for display
  const formattedJson = useMemo(() => {
    if (!parsedJson) return '';
    try {
      return JSON.stringify(parsedJson, null, 2);
    } catch {
      return '';
    }
  }, [parsedJson]);

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

  if (loading) {
    return (
      <div className="mt-4 p-4 bg-gray-800 rounded text-sm text-gray-400">
        Loading file content...
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-4 p-4 bg-red-900/30 border border-red-600/50 rounded text-sm text-red-400">
        {error}
      </div>
    );
  }

  if (!jsonContent || !parsedJson) {
    return null;
  }

  return (
    <div className="mt-4 space-y-2">
      {/* Tab Navigation */}
      <div className="flex border-b border-gray-700">
        <button
          onClick={() => setActiveTab('variables')}
          className={`px-3 py-2 text-xs font-medium transition-colors ${
            activeTab === 'variables'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          Variables
        </button>
        <button
          onClick={() => setActiveTab('json')}
          className={`px-3 py-2 text-xs font-medium transition-colors ${
            activeTab === 'json'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          JSON View
        </button>
      </div>

      {/* Variables Tab */}
      {activeTab === 'variables' && (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {flattenedItems.length === 0 ? (
            <div className="p-4 text-sm text-gray-400 text-center">
              No variables found
            </div>
          ) : (
            flattenedItems.map((item, index) => (
              <div
                key={index}
                className="flex items-start gap-2 p-2 bg-gray-800 rounded hover:bg-gray-700 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-gray-300 font-mono break-all">
                    {item.key}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {formatValue(item.value, item.type)}
                    <span className="ml-2 text-gray-600">({item.type})</span>
                  </div>
                </div>
                <button
                  onClick={() => copyToClipboard(generateVariablePath(item.path, contextKey), item.key)}
                  className="flex-shrink-0 p-1.5 text-gray-400 hover:text-blue-400 hover:bg-gray-700 rounded transition-colors"
                  title={`Copy ${generateVariablePath(item.path, contextKey)}`}
                >
                  <Copy size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* JSON View Tab */}
      {activeTab === 'json' && (
        <div className="space-y-2">
          <div className="flex justify-end">
            <button
              onClick={() => copyToClipboard(formattedJson, 'JSON')}
              className="px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded flex items-center gap-1.5 transition-colors"
            >
              <Copy size={12} />
              Copy JSON
            </button>
          </div>
          <div className="p-4 bg-gray-800 rounded max-h-96 overflow-auto">
            <pre className="text-xs text-gray-300 font-mono whitespace-pre-wrap break-words">
              {formattedJson}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
