import { Node } from 'reactflow';
import { BooleanValueNodeData } from '@automflows/shared';

interface BooleanValueConfigProps {
  node: Node;
  onChange: (field: string, value: any) => void;
}

export default function BooleanValueConfig({ node, onChange }: BooleanValueConfigProps) {
  const data = node.data as BooleanValueNodeData;

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Value
        </label>
        <select
          value={String(data.value ?? false)}
          onChange={(e) => onChange('value', e.target.value === 'true')}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-gray-200"
        >
          <option value="true">True</option>
          <option value="false">False</option>
        </select>
      </div>
    </div>
  );
}

