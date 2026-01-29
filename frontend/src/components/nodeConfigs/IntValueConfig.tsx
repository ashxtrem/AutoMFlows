import { Node } from 'reactflow';
import { IntValueNodeData } from '@automflows/shared';

interface IntValueConfigProps {
  node: Node;
  onChange: (field: string, value: any) => void;
}

export default function IntValueConfig({ node, onChange }: IntValueConfigProps) {
  const data = node.data as IntValueNodeData;
  // Handle both number and string values (string for interpolation)
  const valueStr = typeof data.value === 'string' ? data.value : (data.value?.toString() ?? '');
  const containsInterpolation = typeof data.value === 'string' && valueStr.includes('${');

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Value
          <span className="ml-2 text-xs text-gray-400">(supports ${'{data.key.path}'})</span>
        </label>
        <input
          type={containsInterpolation ? "text" : "number"}
          value={valueStr}
          onChange={(e) => {
            const inputValue = e.target.value;
            // If it contains interpolation pattern, store as string
            if (inputValue.includes('${')) {
              onChange('value', inputValue as any); // Store as string for interpolation
            } else if (inputValue === '') {
              onChange('value', 0);
            } else {
              // Otherwise, try to parse as number
              const numValue = parseInt(inputValue, 10);
              onChange('value', isNaN(numValue) ? 0 : numValue);
            }
          }}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-gray-200"
          placeholder="0 or ${data.key.path}"
        />
        <div className="mt-1 text-xs text-gray-400">
          Supports variable interpolation: ${'{data.key.path}'} or ${'{variables.key.path}'}
        </div>
      </div>
    </div>
  );
}

