import { Node } from 'reactflow';
import RetryConfigSection from '../RetryConfigSection';

interface WaitConfigProps {
  node: Node;
  onChange: (field: string, value: any) => void;
}

export default function WaitConfig({ node, onChange }: WaitConfigProps) {
  const data = node.data;

  // Validate regex pattern
  const validateRegex = (pattern: string): boolean => {
    if (!pattern) return true;
    try {
      if (pattern.startsWith('/') && pattern.endsWith('/')) {
        new RegExp(pattern.slice(1, -1));
      } else {
        new RegExp(pattern);
      }
      return true;
    } catch {
      return false;
    }
  };

  const isUrlPatternValid = data.waitType === 'url' && typeof data.value === 'string' ? validateRegex(data.value) : true;

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
          <option value="url">Wait for URL Pattern</option>
          <option value="condition">Wait for JavaScript Condition</option>
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
      ) : data.waitType === 'selector' ? (
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
      ) : data.waitType === 'url' ? (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">URL Pattern</label>
            <input
              type="text"
              value={typeof data.value === 'string' ? data.value : ''}
              onChange={(e) => onChange('value', e.target.value)}
              placeholder="/pattern/ or exact-url"
              className={`w-full px-3 py-2 bg-gray-700 border rounded text-white text-sm ${
                typeof data.value === 'string' && data.value && !isUrlPatternValid
                  ? 'border-red-500'
                  : 'border-gray-600'
              }`}
            />
            {typeof data.value === 'string' && data.value && !isUrlPatternValid && (
              <div className="mt-1 text-xs text-red-400">
                Invalid regex pattern. Use /pattern/ for regex or plain text for exact match.
              </div>
            )}
            <div className="mt-1 text-xs text-gray-400">
              Use /pattern/ for regex (e.g., /\/dashboard\/.*/) or plain text for exact match.
            </div>
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
      ) : (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">JavaScript Condition</label>
            <textarea
              value={typeof data.value === 'string' ? data.value : ''}
              onChange={(e) => onChange('value', e.target.value)}
              placeholder="() => document.querySelector('.loaded') !== null"
              rows={3}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm font-mono text-xs"
            />
            <div className="mt-1 text-xs text-gray-400">
              JavaScript expression that returns a truthy value when condition is met. Executed in page context.
            </div>
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

      <RetryConfigSection data={data} onChange={onChange} />
    </div>
  );
}

