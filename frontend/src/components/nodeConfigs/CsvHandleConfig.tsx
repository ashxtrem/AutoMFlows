import { Node } from 'reactflow';
import { CsvHandleNodeData } from '@automflows/shared';
import { usePropertyInput } from '../../hooks/usePropertyInput';

interface CsvHandleConfigProps {
  node: Node;
  onChange: (field: string, value: any) => void;
}

export default function CsvHandleConfig({ node, onChange }: CsvHandleConfigProps) {
  const data = node.data as CsvHandleNodeData;
  const { getPropertyValue, isPropertyDisabled, getInputClassName } = usePropertyInput(node);
  const action = data.action ?? 'write';

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Action</label>
        <select
          value={getPropertyValue('action', 'write')}
          onChange={(e) => onChange('action', e.target.value as 'write' | 'append' | 'read')}
          disabled={isPropertyDisabled('action')}
          className={getInputClassName('action', 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm')}
        >
          <option value="write">Write (create/overwrite)</option>
          <option value="append">Append rows</option>
          <option value="read">Read from file</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          File path
          {(action === 'write' || action === 'append') && ' (e.g. ${data.outputDirectory}/products.csv)'}
        </label>
        <input
          type="text"
          value={getPropertyValue('filePath', '')}
          onChange={(e) => onChange('filePath', e.target.value)}
          placeholder={action === 'read' ? '/path/to/file.csv' : '${data.outputDirectory}/out.csv'}
          disabled={isPropertyDisabled('filePath')}
          className={getInputClassName('filePath', 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm')}
        />
      </div>

      {(action === 'write' || action === 'append') && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Data source (context key)</label>
          <input
            type="text"
            value={getPropertyValue('dataSource', '')}
            onChange={(e) => onChange('dataSource', e.target.value)}
            placeholder="e.g. products"
            disabled={isPropertyDisabled('dataSource')}
            className={getInputClassName('dataSource', 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm')}
          />
          <p className="text-xs text-gray-500 mt-1">Context key holding an array of objects or rows.</p>
        </div>
      )}

      {action === 'read' && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Context key (store result)</label>
          <input
            type="text"
            value={getPropertyValue('contextKey', 'csvData')}
            onChange={(e) => onChange('contextKey', e.target.value)}
            placeholder="csvData"
            disabled={isPropertyDisabled('contextKey')}
            className={getInputClassName('contextKey', 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm')}
          />
        </div>
      )}

      {(action === 'write' || action === 'append') && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Headers (optional, comma-separated)</label>
          <input
            type="text"
            value={Array.isArray(data.headers) ? data.headers.join(', ') : ''}
            onChange={(e) => {
              const val = e.target.value.trim();
              onChange('headers', val ? val.split(',').map((h) => h.trim()).filter(Boolean) : undefined);
            }}
            placeholder="name, price, url"
            disabled={isPropertyDisabled('headers')}
            className={getInputClassName('headers', 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm')}
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Delimiter (optional)</label>
        <input
          type="text"
          value={getPropertyValue('delimiter', ',')}
          onChange={(e) => onChange('delimiter', e.target.value || undefined)}
          placeholder=","
          disabled={isPropertyDisabled('delimiter')}
          className={getInputClassName('delimiter', 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm')}
        />
      </div>
    </div>
  );
}
