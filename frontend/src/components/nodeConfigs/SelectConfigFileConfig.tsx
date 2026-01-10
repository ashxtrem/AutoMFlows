import { Node } from 'reactflow';
import { SelectConfigFileNodeData } from '@automflows/shared';
import { useState, useRef } from 'react';

interface SelectConfigFileConfigProps {
  node: Node;
  onChange: (field: string, value: any) => void;
}

export default function SelectConfigFileConfig({ node, onChange }: SelectConfigFileConfigProps) {
  const data = node.data as SelectConfigFileNodeData;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [jsonError, setJsonError] = useState<string | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }

    // Validate file type
    if (!file.name.endsWith('.json')) {
      setJsonError('Please select a JSON file');
      return;
    }

    try {
      const fileContent = await file.text();
      
      // Validate JSON
      try {
        JSON.parse(fileContent);
        setJsonError(null);
      } catch (error: any) {
        setJsonError(`Invalid JSON: ${error.message}`);
        return;
      }

      // Store file content and name
      onChange('fileContent', fileContent);
      onChange('fileName', file.name);
    } catch (error: any) {
      setJsonError(`Failed to read file: ${error.message}`);
    }
  };

  const handleSelectFile = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Config File
        </label>
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
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-gray-200 hover:bg-gray-600 transition-colors"
        >
          {data.fileName || 'Select JSON File'}
        </button>
        {data.fileName && (
          <p className="mt-1 text-xs text-gray-400">
            Selected: {data.fileName}
          </p>
        )}
        {jsonError && (
          <p className="mt-1 text-xs text-red-400">
            {jsonError}
          </p>
        )}
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
    </div>
  );
}
