import { Node } from 'reactflow';

interface OpenBrowserConfigProps {
  node: Node;
  onChange: (field: string, value: any) => void;
}

export default function OpenBrowserConfig({ node, onChange }: OpenBrowserConfigProps) {
  const data = node.data;

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Headless Mode</label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={data.headless !== false}
            onChange={(e) => onChange('headless', e.target.checked)}
            className="rounded"
          />
          <span className="text-sm text-gray-400">Run browser in headless mode</span>
        </label>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Viewport Width</label>
        <input
          type="number"
          value={data.viewportWidth || 1280}
          onChange={(e) => onChange('viewportWidth', parseInt(e.target.value, 10))}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Viewport Height</label>
        <input
          type="number"
          value={data.viewportHeight || 720}
          onChange={(e) => onChange('viewportHeight', parseInt(e.target.value, 10))}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">User Agent (Optional)</label>
        <input
          type="text"
          value={data.userAgent || ''}
          onChange={(e) => onChange('userAgent', e.target.value)}
          placeholder="Mozilla/5.0..."
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
        />
      </div>
    </div>
  );
}

