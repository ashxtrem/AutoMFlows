import { Node } from 'reactflow';
import { DbDisconnectNodeData } from '@automflows/shared';
import { usePropertyInput } from '../../hooks/usePropertyInput';

interface DbDisconnectConfigProps {
  node: Node;
  onChange: (field: string, value: any) => void;
}

export default function DbDisconnectConfig({ node, onChange }: DbDisconnectConfigProps) {
  const data = node.data as DbDisconnectNodeData;
  const { getPropertyValue, isPropertyDisabled, getInputClassName } = usePropertyInput(node);

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Connection Key</label>
        <input
          type="text"
          value={getPropertyValue('connectionKey', 'dbConnection')}
          onChange={(e) => onChange('connectionKey', e.target.value)}
          placeholder="dbConnection"
          disabled={isPropertyDisabled('connectionKey')}
          className={getInputClassName('connectionKey', 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm')}
        />
        {isPropertyDisabled('connectionKey') && (
          <div className="mt-1 text-xs text-gray-500 italic">
            This property is converted to input. Connect a node to provide the value.
          </div>
        )}
        <div className="mt-1 text-xs text-gray-400">
          Key of the connection to disconnect. Supports: {'${data.key.path}'} or {'${variables.key}'}
        </div>
      </div>

      <div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={data.failSilently || false}
            onChange={(e) => onChange('failSilently', e.target.checked)}
            className="rounded"
          />
          <span className="text-sm text-gray-300">Fail Silently</span>
        </label>
        <div className="mt-1 text-xs text-gray-400">
          Continue execution even if disconnect fails
        </div>
      </div>
    </div>
  );
}
