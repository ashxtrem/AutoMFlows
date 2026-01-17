import { Node } from 'reactflow';
import { useState } from 'react';
import { DbQueryNodeData } from '@automflows/shared';
import { usePropertyInput } from '../../hooks/usePropertyInput';

interface DbQueryConfigProps {
  node: Node;
  onChange: (field: string, value: any) => void;
}

const QUERY_TYPES = [
  { value: 'sql', label: 'SQL' },
  { value: 'mongodb', label: 'MongoDB' },
  { value: 'raw', label: 'Raw' },
];

export default function DbQueryConfig({ node, onChange }: DbQueryConfigProps) {
  const data = node.data as DbQueryNodeData;
  const { getPropertyValue, isPropertyDisabled, getInputClassName } = usePropertyInput(node);
  const [params, setParams] = useState<Array<{ value: string }>>(() => {
    if (data.params && Array.isArray(data.params)) {
      return data.params.map((p) => ({ value: String(p) }));
    }
    return [{ value: '' }];
  });

  const updateParams = (newParams: Array<{ value: string }>) => {
    setParams(newParams);
    const paramsArray = newParams.map((p) => p.value.trim()).filter((p) => p !== '');
    onChange('params', paramsArray.length > 0 ? paramsArray : undefined);
  };

  const addParam = () => {
    updateParams([...params, { value: '' }]);
  };

  const removeParam = (index: number) => {
    const newParams = params.filter((_, i) => i !== index);
    updateParams(newParams.length > 0 ? newParams : [{ value: '' }]);
  };

  const updateParam = (index: number, value: string) => {
    const newParams = [...params];
    newParams[index] = { value };
    updateParams(newParams);
  };

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
          Key of the connection to use. Supports: {'${data.key.path}'} or {'${variables.key}'}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Query Key (Optional)
        </label>
        <input
          type="text"
          value={data.queryKey || ''}
          onChange={(e) => onChange('queryKey', e.target.value || undefined)}
          placeholder="queries.selectUser"
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
        />
        <div className="mt-1 text-xs text-gray-400">
          Load query from context (e.g., 'queries.selectUser' loads from data.queries.selectUser). If provided, query field below is ignored.
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Query Type</label>
        <select
          value={data.queryType || 'sql'}
          onChange={(e) => onChange('queryType', e.target.value)}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
        >
          {QUERY_TYPES.map((qt) => (
            <option key={qt.value} value={qt.value}>
              {qt.label}
            </option>
          ))}
        </select>
      </div>

      {!data.queryKey && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Query {data.queryType === 'mongodb' ? '(JSON)' : ''}
          </label>
          {data.queryType === 'mongodb' ? (
            <textarea
              value={typeof data.query === 'object' ? JSON.stringify(data.query, null, 2) : (data.query || '')}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value);
                  onChange('query', parsed);
                } catch {
                  onChange('query', e.target.value);
                }
              }}
              placeholder='{"collection": "users", "operation": "find", "filter": {}}'
              rows={8}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm font-mono"
            />
          ) : (
            <textarea
              value={typeof data.query === 'string' ? data.query : (data.query ? JSON.stringify(data.query) : '')}
              onChange={(e) => onChange('query', e.target.value)}
              placeholder="SELECT * FROM users WHERE id = $1"
              rows={6}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm font-mono"
            />
          )}
          <div className="mt-1 text-xs text-gray-400">
            Supports: {'${data.key.path}'} or {'${variables.key}'}. Example: SELECT * FROM users WHERE id = {'${data.userId}'}
          </div>
        </div>
      )}

      {data.queryType === 'sql' && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Parameters</label>
          <div className="space-y-2">
            {params.map((param, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="text"
                  value={param.value}
                  onChange={(e) => updateParam(index, e.target.value)}
                  placeholder={`Parameter ${index + 1}`}
                  className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                />
                <button
                  type="button"
                  onClick={() => removeParam(index)}
                  className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addParam}
              className="w-full px-3 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded text-sm"
            >
              Add Parameter
            </button>
          </div>
          <div className="mt-1 text-xs text-gray-400">
            Each parameter supports: {'${data.key.path}'} or {'${variables.key}'}
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Context Key</label>
        <input
          type="text"
          value={getPropertyValue('contextKey', 'dbResult')}
          onChange={(e) => onChange('contextKey', e.target.value)}
          placeholder="dbResult"
          disabled={isPropertyDisabled('contextKey')}
          className={getInputClassName('contextKey', 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm')}
        />
        {isPropertyDisabled('contextKey') && (
          <div className="mt-1 text-xs text-gray-500 italic">
            This property is converted to input. Connect a node to provide the value.
          </div>
        )}
        <div className="mt-1 text-xs text-gray-400">
          Key to store query results in context (accessible via {'${data.'}contextKey{'}'}). Supports: {'${data.key.path}'} or {'${variables.key}'}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Timeout (ms)</label>
        <input
          type="number"
          value={getPropertyValue('timeout', 30000)}
          onChange={(e) => onChange('timeout', parseInt(e.target.value, 10) || 30000)}
          disabled={isPropertyDisabled('timeout')}
          className={getInputClassName('timeout', 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm')}
        />
        {isPropertyDisabled('timeout') && (
          <div className="mt-1 text-xs text-gray-500 italic">
            This property is converted to input. Connect a node to provide the value.
          </div>
        )}
        <div className="mt-1 text-xs text-gray-400">
          Supports: {'${data.key.path}'} or {'${variables.key}'}
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
          Continue execution even if query fails
        </div>
      </div>
    </div>
  );
}
