import { Node } from 'reactflow';
import { StringValueNodeData } from '@automflows/shared';

interface StringValueConfigProps {
  node: Node;
  onChange: (field: string, value: any) => void;
}

export default function StringValueConfig({ node, onChange }: StringValueConfigProps) {
  const data = node.data as StringValueNodeData;

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Value
        </label>
        <input
          type="text"
          value={data.value ?? ''}
          onChange={(e) => onChange('value', e.target.value)}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-gray-200"
          placeholder="Enter string value"
        />
      </div>
    </div>
  );
}

