import { Node } from 'reactflow';
import { DbConnectNodeData } from '@automflows/shared';
import { usePropertyInput } from '../../hooks/usePropertyInput';

interface DbConnectConfigProps {
  node: Node;
  onChange: (field: string, value: any) => void;
}

const DB_TYPES = [
  { value: 'postgres', label: 'PostgreSQL' },
  { value: 'mysql', label: 'MySQL' },
  { value: 'mongodb', label: 'MongoDB' },
  { value: 'sqlite', label: 'SQLite' },
];

export default function DbConnectConfig({ node, onChange }: DbConnectConfigProps) {
  const data = node.data as DbConnectNodeData;
  const { getPropertyValue, isPropertyDisabled, getInputClassName } = usePropertyInput(node);

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Database Type</label>
        <select
          value={getPropertyValue('dbType', 'postgres')}
          onChange={(e) => onChange('dbType', e.target.value)}
          disabled={isPropertyDisabled('dbType')}
          className={getInputClassName('dbType', 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm')}
        >
          {DB_TYPES.map((dt) => (
            <option key={dt.value} value={dt.value}>
              {dt.label}
            </option>
          ))}
        </select>
        {isPropertyDisabled('dbType') && (
          <div className="mt-1 text-xs text-gray-500 italic">
            This property is converted to input. Connect a node to provide the value.
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Config Key (Optional)
        </label>
        <input
          type="text"
          value={data.configKey || ''}
          onChange={(e) => onChange('configKey', e.target.value || undefined)}
          placeholder="env.db"
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
        />
        <div className="mt-1 text-xs text-gray-400">
          Load entire config object from context (e.g., 'env.db' loads from data.env.db). Individual fields below will override config values.
        </div>
      </div>

      {data.dbType !== 'sqlite' && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Host</label>
            <input
              type="text"
              value={getPropertyValue('host', '')}
              onChange={(e) => onChange('host', e.target.value)}
              placeholder="localhost"
              disabled={isPropertyDisabled('host')}
              className={getInputClassName('host', 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm')}
            />
            {isPropertyDisabled('host') && (
              <div className="mt-1 text-xs text-gray-500 italic">
                This property is converted to input. Connect a node to provide the value.
              </div>
            )}
            <div className="mt-1 text-xs text-gray-400">
              Supports: {'${data.key.path}'} or {'${variables.key}'}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Port</label>
            <input
              type="text"
              value={getPropertyValue('port', '')}
              onChange={(e) => onChange('port', e.target.value)}
              placeholder={data.dbType === 'postgres' ? '5432' : data.dbType === 'mysql' ? '3306' : '27017'}
              disabled={isPropertyDisabled('port')}
              className={getInputClassName('port', 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm')}
            />
            {isPropertyDisabled('port') && (
              <div className="mt-1 text-xs text-gray-500 italic">
                This property is converted to input. Connect a node to provide the value.
              </div>
            )}
            <div className="mt-1 text-xs text-gray-400">
              Supports: {'${data.key.path}'} or {'${variables.key}'}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">User</label>
            <input
              type="text"
              value={getPropertyValue('user', '')}
              onChange={(e) => onChange('user', e.target.value)}
              placeholder="admin"
              disabled={isPropertyDisabled('user')}
              className={getInputClassName('user', 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm')}
            />
            {isPropertyDisabled('user') && (
              <div className="mt-1 text-xs text-gray-500 italic">
                This property is converted to input. Connect a node to provide the value.
              </div>
            )}
            <div className="mt-1 text-xs text-gray-400">
              Supports: {'${data.key.path}'} or {'${variables.key}'}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Password</label>
            <input
              type="password"
              value={getPropertyValue('password', '')}
              onChange={(e) => onChange('password', e.target.value)}
              placeholder="password"
              disabled={isPropertyDisabled('password')}
              className={getInputClassName('password', 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm')}
            />
            {isPropertyDisabled('password') && (
              <div className="mt-1 text-xs text-gray-500 italic">
                This property is converted to input. Connect a node to provide the value.
              </div>
            )}
            <div className="mt-1 text-xs text-gray-400">
              Supports: {'${data.key.path}'} or {'${variables.key}'}
            </div>
          </div>
        </>
      )}

      {data.dbType === 'sqlite' && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">File Path</label>
          <input
            type="text"
            value={getPropertyValue('filePath', '')}
            onChange={(e) => onChange('filePath', e.target.value)}
            placeholder="/path/to/database.db"
            disabled={isPropertyDisabled('filePath')}
            className={getInputClassName('filePath', 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm')}
          />
          {isPropertyDisabled('filePath') && (
            <div className="mt-1 text-xs text-gray-500 italic">
              This property is converted to input. Connect a node to provide the value.
            </div>
          )}
          <div className="mt-1 text-xs text-gray-400">
            Supports: {'${data.key.path}'} or {'${variables.key}'}
          </div>
        </div>
      )}

      {data.dbType !== 'sqlite' && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Database</label>
          <input
            type="text"
            value={getPropertyValue('database', '')}
            onChange={(e) => onChange('database', e.target.value)}
            placeholder="mydb"
            disabled={isPropertyDisabled('database')}
            className={getInputClassName('database', 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm')}
          />
          {isPropertyDisabled('database') && (
            <div className="mt-1 text-xs text-gray-500 italic">
              This property is converted to input. Connect a node to provide the value.
            </div>
          )}
          <div className="mt-1 text-xs text-gray-400">
            Supports: {'${data.key.path}'} or {'${variables.key}'}
          </div>
        </div>
      )}

      {(data.dbType === 'postgres' || data.dbType === 'mongodb') && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Connection String (Optional)</label>
          <input
            type="text"
            value={getPropertyValue('connectionString', '')}
            onChange={(e) => onChange('connectionString', e.target.value)}
            placeholder={data.dbType === 'postgres' ? 'postgresql://user:password@host:port/database' : 'mongodb://user:password@host:port/database'}
            disabled={isPropertyDisabled('connectionString')}
            className={getInputClassName('connectionString', 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm')}
          />
          {isPropertyDisabled('connectionString') && (
            <div className="mt-1 text-xs text-gray-500 italic">
              This property is converted to input. Connect a node to provide the value.
            </div>
          )}
          <div className="mt-1 text-xs text-gray-400">
            Alternative to individual fields. Supports: {'${data.key.path}'} or {'${variables.key}'}
          </div>
        </div>
      )}

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
          Key to store connection in context (accessible via {'${data.'}connectionKey{'}'}). Supports: {'${data.key.path}'} or {'${variables.key}'}
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
          Continue execution even if connection fails
        </div>
      </div>
    </div>
  );
}
