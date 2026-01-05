import { Node } from 'reactflow';

interface WaitConfigProps {
  node: Node;
  onChange: (field: string, value: any) => void;
}

export default function WaitConfig({ node, onChange }: WaitConfigProps) {
  const data = node.data;

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Wait Type</label>
        <select
          value={data.waitType || 'timeout'}
          onChange={(e) => onChange('waitType', e.target.value)}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
        >
          <option value="timeout">Timeout (milliseconds)</option>
          <option value="selector">Wait for Selector</option>
        </select>
      </div>
      {data.waitType === 'timeout' ? (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Timeout (ms)</label>
          <input
            type="number"
            value={typeof data.value === 'number' ? data.value : parseInt(String(data.value || 1000), 10)}
            onChange={(e) => onChange('value', parseInt(e.target.value, 10))}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
          />
        </div>
      ) : (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Selector Type</label>
            <select
              value={data.selectorType || 'css'}
              onChange={(e) => onChange('selectorType', e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
            >
              <option value="css">CSS Selector</option>
              <option value="xpath">XPath</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Selector</label>
            <input
              type="text"
              value={typeof data.value === 'string' ? data.value : ''}
              onChange={(e) => onChange('value', e.target.value)}
              placeholder="#element or //div[@class='element']"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Timeout (ms)</label>
            <input
              type="number"
              value={data.timeout || 30000}
              onChange={(e) => onChange('timeout', parseInt(e.target.value, 10))}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
            />
          </div>
        </>
      )}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Fail Silently</label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={data.failSilently || false}
            onChange={(e) => onChange('failSilently', e.target.checked)}
            className="rounded"
          />
          <span className="text-sm text-gray-400">
            Continue execution even if this node fails
          </span>
        </label>
      </div>
    </div>
  );
}

