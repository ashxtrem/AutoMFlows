import { Node } from 'reactflow';

interface TypeConfigProps {
  node: Node;
  onChange: (field: string, value: any) => void;
}

export default function TypeConfig({ node, onChange }: TypeConfigProps) {
  const data = node.data;

  return (
    <div className="space-y-4">
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
          value={data.selector || ''}
          onChange={(e) => onChange('selector', e.target.value)}
          placeholder="#input or //input[@id='input']"
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Text</label>
        <textarea
          value={data.text || ''}
          onChange={(e) => onChange('text', e.target.value)}
          placeholder="Text to type"
          rows={3}
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

