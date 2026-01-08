import { Node } from 'reactflow';
import { IntValueNodeData } from '@automflows/shared';

interface IntValueConfigProps {
  node: Node;
  onChange: (field: string, value: any) => void;
}

export default function IntValueConfig({ node, onChange }: IntValueConfigProps) {
  const data = node.data as IntValueNodeData;

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Value
        </label>
        <input
          type="number"
          value={data.value ?? 0}
          onChange={(e) => onChange('value', parseInt(e.target.value, 10) || 0)}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-gray-200"
          placeholder="0"
        />
      </div>
    </div>
  );
}

