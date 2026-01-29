import { Node } from 'reactflow';
import { useState } from 'react';
import { BooleanValueNodeData } from '@automflows/shared';

interface BooleanValueConfigProps {
  node: Node;
  onChange: (field: string, value: any) => void;
}

export default function BooleanValueConfig({ node, onChange }: BooleanValueConfigProps) {
  const data = node.data as BooleanValueNodeData;
  const valueStr = typeof data.value === 'string' ? data.value : String(data.value ?? false);
  const containsInterpolation = typeof data.value === 'string' && valueStr.includes('${');
  const [useInterpolation, setUseInterpolation] = useState(containsInterpolation);

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Value
          <span className="ml-2 text-xs text-gray-400">(supports ${'{data.key.path}'})</span>
        </label>
        {useInterpolation ? (
          <>
            <input
              type="text"
              value={valueStr}
              onChange={(e) => onChange('value', e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-gray-200"
              placeholder='${data.key.path} or ${variables.key.path}'
            />
            <div className="mt-1 text-xs text-gray-400">
              Supports variable interpolation: ${'{data.key.path}'} or ${'{variables.key.path}'}
            </div>
            <button
              type="button"
              onClick={() => {
                setUseInterpolation(false);
                onChange('value', false);
              }}
              className="mt-2 text-xs text-blue-400 hover:text-blue-300"
            >
              Switch to boolean select
            </button>
          </>
        ) : (
          <>
            <select
              value={String(data.value ?? false)}
              onChange={(e) => onChange('value', e.target.value === 'true')}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-gray-200"
            >
              <option value="true">True</option>
              <option value="false">False</option>
            </select>
            <button
              type="button"
              onClick={() => {
                setUseInterpolation(true);
                onChange('value', '');
              }}
              className="mt-2 text-xs text-blue-400 hover:text-blue-300"
            >
              Use variable interpolation instead
            </button>
          </>
        )}
      </div>
    </div>
  );
}

