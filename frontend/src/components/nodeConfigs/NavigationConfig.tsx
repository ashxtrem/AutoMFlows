import { Node } from 'reactflow';
import { useState } from 'react';
import RetryConfigSection from '../RetryConfigSection';
import { usePropertyInput } from '../../hooks/usePropertyInput';

interface NavigationConfigProps {
  node: Node;
  onChange: (field: string, value: any) => void;
}

export default function NavigationConfig({ node, onChange }: NavigationConfigProps) {
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
  const action = data.action || 'navigate';

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Action</label>
        <select
          value={getPropertyValue('action', 'navigate')}
          onChange={(e) => {
            const newAction = e.target.value;
            onChange('action', newAction);
            // Clear action-specific properties when action changes
            if (newAction !== 'navigate' && newAction !== 'newTab') {
              onChange('url', undefined);
            }
            if (newAction !== 'navigate') {
              onChange('referer', undefined);
            }
            if (newAction !== 'navigate' && newAction !== 'goBack' && newAction !== 'goForward' && newAction !== 'reload') {
              onChange('waitUntil', undefined);
            }
            if (newAction !== 'switchTab') {
              onChange('tabIndex', undefined);
              onChange('urlPattern', undefined);
            }
            if (newAction !== 'closeTab') {
              onChange('tabIndex', undefined);
            }
            if (newAction !== 'newTab' && newAction !== 'switchTab') {
              onChange('contextKey', undefined);
            }
          }}
          disabled={isPropertyDisabled('action')}
          className={getInputClassName('action', 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm')}
        >
          <option value="navigate">Navigate</option>
          <option value="goBack">Go Back</option>
          <option value="goForward">Go Forward</option>
          <option value="reload">Reload</option>
          <option value="newTab">New Tab</option>
          <option value="switchTab">Switch Tab</option>
          <option value="closeTab">Close Tab</option>
        </select>
        {isPropertyDisabled('action') && (
          <div className="mt-1 text-xs text-gray-500 italic">
            This property is converted to input. Connect a node to provide the value.
          </div>
        )}
      </div>

      {/* Action-specific properties */}
      {(action === 'navigate' || action === 'newTab') && (
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
      )}

      {action === 'navigate' && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Referer (optional)</label>
          <input
            type="text"
            value={getPropertyValue('referer', '')}
            onChange={(e) => onChange('referer', e.target.value)}
            placeholder="https://referer.com"
            disabled={isPropertyDisabled('referer')}
            className={getInputClassName('referer', 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm')}
          />
          {isPropertyDisabled('referer') && (
            <div className="mt-1 text-xs text-gray-500 italic">
              This property is converted to input. Connect a node to provide the value.
            </div>
          )}
        </div>
      )}

      {(action === 'navigate' || action === 'goBack' || action === 'goForward' || action === 'reload') && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Wait Until</label>
          <select
            value={getPropertyValue('waitUntil', 'networkidle')}
            onChange={(e) => onChange('waitUntil', e.target.value)}
            disabled={isPropertyDisabled('waitUntil')}
            className={getInputClassName('waitUntil', 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm')}
          >
            <option value="load">Load - Wait for load event</option>
            <option value="domcontentloaded">DOMContentLoaded - Wait for DOMContentLoaded event</option>
            <option value="networkidle">Network Idle - Wait until network is idle</option>
            <option value="commit">Commit - Wait for navigation commit</option>
          </select>
          {isPropertyDisabled('waitUntil') && (
            <div className="mt-1 text-xs text-gray-500 italic">
              This property is converted to input. Connect a node to provide the value.
            </div>
          )}
        </div>
      )}

      {action === 'switchTab' && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Tab Index (optional)</label>
            <input
              type="number"
              value={getPropertyValue('tabIndex', '')}
              onChange={(e) => onChange('tabIndex', e.target.value ? parseInt(e.target.value, 10) : undefined)}
              placeholder="0"
              disabled={isPropertyDisabled('tabIndex')}
              className={getInputClassName('tabIndex', 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm')}
            />
            {isPropertyDisabled('tabIndex') && (
              <div className="mt-1 text-xs text-gray-500 italic">
                This property is converted to input. Connect a node to provide the value.
              </div>
            )}
            <div className="mt-1 text-xs text-gray-400">
              Leave empty to switch by URL pattern or to first available tab
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">URL Pattern (optional)</label>
            <input
              type="text"
              value={getPropertyValue('urlPattern', '')}
              onChange={(e) => onChange('urlPattern', e.target.value)}
              placeholder="/example\.com/ or example.com"
              disabled={isPropertyDisabled('urlPattern')}
              className={getInputClassName('urlPattern', 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm')}
            />
            {isPropertyDisabled('urlPattern') && (
              <div className="mt-1 text-xs text-gray-500 italic">
                This property is converted to input. Connect a node to provide the value.
              </div>
            )}
            <div className="mt-1 text-xs text-gray-400">
              Regex pattern (use /pattern/ syntax) or plain text for exact match
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Context Key</label>
            <input
              type="text"
              value={getPropertyValue('contextKey', 'currentPage')}
              onChange={(e) => onChange('contextKey', e.target.value)}
              placeholder="currentPage"
              disabled={isPropertyDisabled('contextKey')}
              className={getInputClassName('contextKey', 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm')}
            />
            {isPropertyDisabled('contextKey') && (
              <div className="mt-1 text-xs text-gray-500 italic">
                This property is converted to input. Connect a node to provide the value.
              </div>
            )}
            <div className="mt-1 text-xs text-gray-400">
              Key to store the switched page reference in context
            </div>
          </div>
        </>
      )}

      {action === 'closeTab' && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Tab Index (optional)</label>
          <input
            type="number"
            value={getPropertyValue('tabIndex', '')}
            onChange={(e) => onChange('tabIndex', e.target.value ? parseInt(e.target.value, 10) : undefined)}
            placeholder="Leave empty to close current tab"
            disabled={isPropertyDisabled('tabIndex')}
            className={getInputClassName('tabIndex', 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm')}
          />
          {isPropertyDisabled('tabIndex') && (
            <div className="mt-1 text-xs text-gray-500 italic">
              This property is converted to input. Connect a node to provide the value.
            </div>
          )}
          <div className="mt-1 text-xs text-gray-400">
            Leave empty to close current tab, or specify index to close specific tab
          </div>
        </div>
      )}

      {action === 'newTab' && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Context Key</label>
          <input
            type="text"
            value={getPropertyValue('contextKey', 'newPage')}
            onChange={(e) => onChange('contextKey', e.target.value)}
            placeholder="newPage"
            disabled={isPropertyDisabled('contextKey')}
            className={getInputClassName('contextKey', 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm')}
          />
          {isPropertyDisabled('contextKey') && (
            <div className="mt-1 text-xs text-gray-500 italic">
              This property is converted to input. Connect a node to provide the value.
            </div>
          )}
          <div className="mt-1 text-xs text-gray-400">
            Key to store the new page reference in context
          </div>
        </div>
      )}

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
          Continue execution even if navigation fails
        </div>
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
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={data.waitAfterOperation || false}
                  onChange={(e) => onChange('waitAfterOperation', e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm text-gray-300">Wait After Operation</span>
              </label>
              <div className="mt-1 text-xs text-gray-400">
                If checked, wait conditions execute after the operation. Otherwise, they execute before.
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Wait for Selector</label>
              <input
                type="text"
                value={data.waitForSelector || ''}
                onChange={(e) => onChange('waitForSelector', e.target.value)}
                placeholder="#element or //div[@id='element']"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm"
              />
              <div className="mt-2 space-y-2">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Selector Type</label>
                  <select
                    value={data.waitForSelectorType || 'css'}
                    onChange={(e) => onChange('waitForSelectorType', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm"
                  >
                    <option value="css">CSS Selector</option>
                    <option value="xpath">XPath</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Timeout (ms)</label>
                  <input
                    type="number"
                    value={data.waitForSelectorTimeout || ''}
                    onChange={(e) => onChange('waitForSelectorTimeout', e.target.value ? parseInt(e.target.value, 10) : undefined)}
                    placeholder="Defaults to main timeout"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Wait for URL Pattern</label>
              <input
                type="text"
                value={data.waitForUrl || ''}
                onChange={(e) => onChange('waitForUrl', e.target.value)}
                placeholder="/example\.com/ or example.com"
                className={`w-full px-3 py-2 bg-gray-700 border rounded text-sm ${
                  isUrlPatternValid ? 'border-gray-600' : 'border-red-500'
                }`}
              />
              {!isUrlPatternValid && (
                <div className="mt-1 text-xs text-red-400">
                  Invalid regex pattern. Use /pattern/ syntax for regex or plain text for exact match.
                </div>
              )}
              <div className="mt-2">
                <label className="block text-sm font-medium text-gray-300 mb-1">Timeout (ms)</label>
                <input
                  type="number"
                  value={data.waitForUrlTimeout || ''}
                  onChange={(e) => onChange('waitForUrlTimeout', e.target.value ? parseInt(e.target.value, 10) : undefined)}
                  placeholder="Defaults to main timeout"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Wait for JavaScript Condition</label>
              <textarea
                value={data.waitForCondition || ''}
                onChange={(e) => onChange('waitForCondition', e.target.value)}
                placeholder="document.readyState === 'complete'"
                rows={3}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm font-mono"
              />
              <div className="mt-2">
                <label className="block text-sm font-medium text-gray-300 mb-1">Timeout (ms)</label>
                <input
                  type="number"
                  value={data.waitForConditionTimeout || ''}
                  onChange={(e) => onChange('waitForConditionTimeout', e.target.value ? parseInt(e.target.value, 10) : undefined)}
                  placeholder="Defaults to main timeout"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm"
                />
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
