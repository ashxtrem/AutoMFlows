import { Node } from 'reactflow';
import { DbTransactionBeginNodeData, DbTransactionCommitNodeData, DbTransactionRollbackNodeData } from '@automflows/shared';
import { usePropertyInput } from '../../hooks/usePropertyInput';

type DbTransactionNodeData = DbTransactionBeginNodeData | DbTransactionCommitNodeData | DbTransactionRollbackNodeData;

interface DbTransactionConfigProps {
  node: Node;
  onChange: (field: string, value: any) => void;
  action: 'begin' | 'commit' | 'rollback';
}

const ACTION_LABELS = {
  begin: 'Begin Transaction',
  commit: 'Commit Transaction',
  rollback: 'Rollback Transaction',
};

export default function DbTransactionConfig({ node, onChange, action }: DbTransactionConfigProps) {
  const data = node.data as DbTransactionNodeData;
  const { getPropertyValue, isPropertyDisabled, getInputClassName } = usePropertyInput(node);

  return (
    <div className="space-y-4">
      <div className="text-sm text-gray-400">
        {action === 'begin' && 'Start a database transaction. All subsequent DB Query nodes using the same connection will run within this transaction until commit or rollback.'}
        {action === 'commit' && 'Commit the current transaction, saving all changes made since the last begin.'}
        {action === 'rollback' && 'Roll back the current transaction, discarding all changes made since the last begin.'}
      </div>

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
          Key of the connection to use. Must match the connection key from DB Connect. Supports: {'${data.key.path}'} or {'${variables.key}'}
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
          Continue execution even if {ACTION_LABELS[action].toLowerCase()} fails
        </div>
      </div>
    </div>
  );
}
