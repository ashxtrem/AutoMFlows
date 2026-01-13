import { Node } from 'reactflow';
import { useState } from 'react';
import RetryConfigSection from '../RetryConfigSection';
import { usePropertyInput } from '../../hooks/usePropertyInput';

interface NavigateConfigProps {
  node: Node;
  onChange: (field: string, value: any) => void;
}

export default function NavigateConfig({ node, onChange }: NavigateConfigProps) {
  const data = node.data;
  const [showAdvanced, setShowAdvanced] = useState(false);
  const { getPropertyValue, isPropertyDisabled, getInputClassName } = usePropertyInput(node);

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

  const isUrlPatternValid = validateRegex(data.waitForUrl || '');

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">URL</label>
        <input
          type="text"
          value={getPropertyValue('url', '')}
          onChange={(e) => onChange('url', e.target.value)}
          placeholder="https://example.com"
          disabled={isPropertyDisabled('url')}
          className={getInputClassName('url', 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm')}
        />
        {isPropertyDisabled('url') && (
          <div className="mt-1 text-xs text-gray-500 italic">
            This property is converted to input. Connect a node to provide the value.
          </div>
        )}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Timeout (ms)</label>
        <input
          type="number"
          value={getPropertyValue('timeout', 30000)}
          onChange={(e) => onChange('timeout', parseInt(e.target.value, 10) || 30000)}
          disabled={isPropertyDisabled('timeout')}
          className={getInputClassName('timeout', 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm')}
        />
        {isPropertyDisabled('timeout') && (
          <div className="mt-1 text-xs text-gray-500 italic">
            This property is converted to input. Connect a node to provide the value.
          </div>
        )}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Wait Until
          <span className="ml-2 text-xs text-gray-400">(hover for details)</span>
        </label>
        <select
          value={getPropertyValue('waitUntil', 'networkidle')}
          onChange={(e) => onChange('waitUntil', e.target.value)}
          disabled={isPropertyDisabled('waitUntil')}
          className={getInputClassName('waitUntil', 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm')}
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
        {isPropertyDisabled('waitUntil') && (
          <div className="mt-1 text-xs text-gray-500 italic">
            This property is converted to input. Connect a node to provide the value.
          </div>
        )}
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
          value={getPropertyValue('referer', '')}
          onChange={(e) => onChange('referer', e.target.value)}
          placeholder="https://example.com"
          disabled={isPropertyDisabled('referer')}
          className={getInputClassName('referer', 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm')}
        />
        {isPropertyDisabled('referer') && (
          <div className="mt-1 text-xs text-gray-500 italic">
            This property is converted to input. Connect a node to provide the value.
          </div>
        )}
      </div>

      {/* Advanced Waiting Options */}
      <div className="border-t border-gray-600 pt-4">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full flex items-center justify-between text-sm font-medium text-gray-300 hover:text-white transition-colors"
        >
          <span>Advanced Waiting Options</span>
          <span className="text-gray-400">{showAdvanced ? '▼' : '▶'}</span>
        </button>

        {showAdvanced && (
          <div className="mt-4 space-y-4">
            {/* Wait After Operation Checkbox */}
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={data.waitAfterOperation || false}
                  onChange={(e) => onChange('waitAfterOperation', e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm font-medium text-gray-300">
                  Wait After Operation
                </span>
              </label>
              <div className="mt-1 text-xs text-gray-400 ml-6">
                {data.waitAfterOperation
                  ? 'Wait conditions will execute after navigation (default for navigation)'
                  : 'Wait conditions will execute before navigation'}
              </div>
            </div>

            {/* Wait for Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Wait for Selector (Optional)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={data.waitForSelector || ''}
                  onChange={(e) => onChange('waitForSelector', e.target.value)}
                  placeholder=".my-class or //div[@id='myId']"
                  className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                />
                <select
                  value={data.waitForSelectorType || 'css'}
                  onChange={(e) => onChange('waitForSelectorType', e.target.value)}
                  className="px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                >
                  <option value="css">CSS</option>
                  <option value="xpath">XPath</option>
                </select>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="number"
                  value={data.waitForSelectorTimeout || data.timeout || 30000}
                  onChange={(e) => onChange('waitForSelectorTimeout', parseInt(e.target.value, 10) || undefined)}
                  placeholder="Timeout (ms)"
                  className="w-32 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-xs"
                />
                <span className="text-xs text-gray-400">Timeout for selector wait</span>
              </div>
              <div className="mt-1 text-xs text-gray-400">
                Wait for a specific element to appear after navigation. Useful for SPAs with dynamic content.
              </div>
            </div>

            {/* Wait for URL Pattern */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Wait for URL Pattern (Optional)
              </label>
              <input
                type="text"
                value={data.waitForUrl || ''}
                onChange={(e) => onChange('waitForUrl', e.target.value)}
                placeholder="/pattern/ or exact-url"
                className={`w-full px-3 py-2 bg-gray-700 border rounded text-white text-sm ${
                  data.waitForUrl && !isUrlPatternValid
                    ? 'border-red-500'
                    : 'border-gray-600'
                }`}
              />
              {data.waitForUrl && !isUrlPatternValid && (
                <div className="mt-1 text-xs text-red-400">
                  Invalid regex pattern. Use /pattern/ for regex or plain text for exact match.
                </div>
              )}
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="number"
                  value={data.waitForUrlTimeout || data.timeout || 30000}
                  onChange={(e) => onChange('waitForUrlTimeout', parseInt(e.target.value, 10) || undefined)}
                  placeholder="Timeout (ms)"
                  className="w-32 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-xs"
                />
                <span className="text-xs text-gray-400">Timeout for URL pattern wait</span>
              </div>
              <div className="mt-1 text-xs text-gray-400">
                Wait until URL matches pattern. Use /pattern/ for regex (e.g., /\/dashboard\/.*/) or plain text for exact match.
              </div>
            </div>

            {/* Wait for JavaScript Condition */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Wait for JavaScript Condition (Optional)
              </label>
              <textarea
                value={data.waitForCondition || ''}
                onChange={(e) => onChange('waitForCondition', e.target.value)}
                placeholder="() => document.querySelector('.loaded') !== null"
                rows={3}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm font-mono text-xs"
              />
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="number"
                  value={data.waitForConditionTimeout || data.timeout || 30000}
                  onChange={(e) => onChange('waitForConditionTimeout', parseInt(e.target.value, 10) || undefined)}
                  placeholder="Timeout (ms)"
                  className="w-32 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-xs"
                />
                <span className="text-xs text-gray-400">Timeout for condition wait</span>
              </div>
              <div className="mt-1 text-xs text-gray-400">
                JavaScript expression that returns a truthy value when condition is met. Executed in page context.
              </div>
            </div>

            {/* Wait Strategy */}
            {(data.waitForSelector || data.waitForUrl || data.waitForCondition) && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Wait Strategy
                </label>
                <select
                  value={data.waitStrategy || 'parallel'}
                  onChange={(e) => onChange('waitStrategy', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                >
                  <option value="parallel">Parallel - Wait for all conditions simultaneously</option>
                  <option value="sequential">Sequential - Wait for each condition in order</option>
                </select>
                <div className="mt-1 text-xs text-gray-400">
                  {data.waitStrategy === 'sequential'
                    ? 'Conditions are checked one after another. Useful when conditions depend on each other.'
                    : 'All conditions are checked at the same time. Faster but conditions must be independent.'}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <RetryConfigSection data={data} onChange={onChange} />
    </div>
  );
}

