import { Node } from 'reactflow';
import { LoadConfigFileNodeData } from '@automflows/shared';
import { useState, useEffect } from 'react';
import { getBackendPort } from '../../utils/getBackendPort';
import JsonPreview from '../JsonPreview';

interface LoadConfigFileConfigProps {
  node: Node;
  onChange: (field: string, value: any) => void;
}

export default function LoadConfigFileConfig({ node, onChange }: LoadConfigFileConfigProps) {
  const data = node.data as LoadConfigFileNodeData;
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [parsedContent, setParsedContent] = useState<object | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFileContent = async () => {
      if (!data.filePath || data.filePath.trim() === '') {
        setFileContent(null);
        setParsedContent(null);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const port = await getBackendPort();
        const response = await fetch(
          `http://localhost:${port}/api/files/read?filePath=${encodeURIComponent(data.filePath)}`
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || errorData.error || 'Failed to read file');
        }

        const result = await response.json();
        
        if (result.error) {
          setError(result.error);
          setFileContent(result.content || null);
          setParsedContent(null);
        } else {
          setFileContent(result.content);
          setParsedContent(result.parsed || null);
          setError(null);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load file');
        setFileContent(null);
        setParsedContent(null);
      } finally {
        setLoading(false);
      }
    };

    // Debounce the fetch to avoid too many requests while typing
    const timeoutId = setTimeout(() => {
      fetchFileContent();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [data.filePath]);

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          File Path
        </label>
        <input
          type="text"
          value={data.filePath || ''}
          onChange={(e) => onChange('filePath', e.target.value)}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-gray-200"
          placeholder="tests/resources/env.Env1.json or /absolute/path/to/config.json"
        />
        <p className="mt-1 text-xs text-gray-400">
          Relative path from project root or absolute path
        </p>
      </div>
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

      {/* JSON Preview */}
      <JsonPreview
        jsonContent={parsedContent || fileContent}
        contextKey={data.contextKey}
        loading={loading}
        error={error || undefined}
      />
    </div>
  );
}
