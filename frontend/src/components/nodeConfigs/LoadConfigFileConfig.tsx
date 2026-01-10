import { Node } from 'reactflow';
import { LoadConfigFileNodeData } from '@automflows/shared';

interface LoadConfigFileConfigProps {
  node: Node;
  onChange: (field: string, value: any) => void;
}

export default function LoadConfigFileConfig({ node, onChange }: LoadConfigFileConfigProps) {
  const data = node.data as LoadConfigFileNodeData;

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
    </div>
  );
}
