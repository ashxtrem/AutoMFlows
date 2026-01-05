import { Node } from 'reactflow';

interface NavigateConfigProps {
  node: Node;
  onChange: (field: string, value: any) => void;
}

export default function NavigateConfig({ node, onChange }: NavigateConfigProps) {
  const data = node.data;

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">URL</label>
        <input
          type="text"
          value={data.url || ''}
          onChange={(e) => onChange('url', e.target.value)}
          placeholder="https://example.com"
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Timeout (ms)</label>
        <input
          type="number"
          value={data.timeout || 30000}
          onChange={(e) => onChange('timeout', parseInt(e.target.value, 10) || 30000)}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Wait Until
          <span className="ml-2 text-xs text-gray-400">(hover for details)</span>
        </label>
        <select
          value={data.waitUntil || 'networkidle'}
          onChange={(e) => onChange('waitUntil', e.target.value)}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
        >
          <option 
            value="load"
            title="Waits for the 'load' event to fire. This is when the page and all its resources have finished loading."
          >
            load
          </option>
          <option 
            value="domcontentloaded"
            title="Waits for the 'DOMContentLoaded' event. This fires when the HTML document has been completely loaded and parsed."
          >
            domcontentloaded
          </option>
          <option 
            value="networkidle"
            title="Waits until there are no network connections for at least 500ms. Useful for SPAs that load content dynamically."
          >
            networkidle
          </option>
          <option 
            value="commit"
            title="Waits for the navigation to commit. This is the earliest point when navigation is considered successful."
          >
            commit
          </option>
        </select>
        <div className="mt-1 text-xs text-gray-400">
          {data.waitUntil === 'load' && "Waits for the 'load' event to fire. This is when the page and all its resources have finished loading."}
          {data.waitUntil === 'domcontentloaded' && "Waits for the 'DOMContentLoaded' event. This fires when the HTML document has been completely loaded and parsed."}
          {data.waitUntil === 'networkidle' && "Waits until there are no network connections for at least 500ms. Useful for SPAs that load content dynamically."}
          {data.waitUntil === 'commit' && "Waits for the navigation to commit. This is the earliest point when navigation is considered successful."}
          {!data.waitUntil && "Waits until there are no network connections for at least 500ms. Useful for SPAs that load content dynamically."}
        </div>
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
            Continue execution even if navigation fails
          </span>
        </label>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Referer (Optional)</label>
        <input
          type="text"
          value={data.referer || ''}
          onChange={(e) => onChange('referer', e.target.value)}
          placeholder="https://example.com"
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
        />
      </div>
    </div>
  );
}

