import { Node } from 'reactflow';
import { useState } from 'react';
import RetryConfigSection from '../RetryConfigSection';
import { usePropertyInput } from '../../hooks/usePropertyInput';
import SelectorFinderButton from '../SelectorFinderButton';
import { SELECTOR_TYPE_OPTIONS } from '../../utils/selectorHelpers';

interface StorageConfigProps {
  node: Node;
  onChange: (field: string, value: any) => void;
}

export default function StorageConfig({ node, onChange }: StorageConfigProps) {
  const data = node.data;
  const [showAdvanced, setShowAdvanced] = useState(false);
  const { getPropertyValue, isPropertyDisabled, getInputClassName } = usePropertyInput(node);

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
  const action = data.action || 'getCookie';

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Action</label>
        <select
          value={getPropertyValue('action', 'getCookie')}
          onChange={(e) => {
            const newAction = e.target.value;
            onChange('action', newAction);
            // Clear action-specific properties
            if (newAction !== 'getCookie') {
              onChange('name', undefined);
              onChange('url', undefined);
            }
            if (newAction !== 'setCookie') {
              onChange('cookies', undefined);
            }
            if (newAction !== 'clearCookies') {
              onChange('domain', undefined);
            }
            if (newAction !== 'getLocalStorage' && newAction !== 'setLocalStorage' && newAction !== 'getSessionStorage' && newAction !== 'setSessionStorage') {
              onChange('key', undefined);
            }
            if (newAction !== 'setLocalStorage' && newAction !== 'setSessionStorage') {
              onChange('value', undefined);
            }
          }}
          disabled={isPropertyDisabled('action')}
          className={getInputClassName('action', 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm')}
        >
          <option value="getCookie">Get Cookie</option>
          <option value="setCookie">Set Cookie</option>
          <option value="clearCookies">Clear Cookies</option>
          <option value="getLocalStorage">Get Local Storage</option>
          <option value="setLocalStorage">Set Local Storage</option>
          <option value="clearLocalStorage">Clear Local Storage</option>
          <option value="getSessionStorage">Get Session Storage</option>
          <option value="setSessionStorage">Set Session Storage</option>
          <option value="clearSessionStorage">Clear Session Storage</option>
        </select>
      </div>

      {action === 'getCookie' && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Cookie Name (optional)</label>
            <input
              type="text"
              value={getPropertyValue('name', '')}
              onChange={(e) => onChange('name', e.target.value)}
              placeholder="Leave empty to get all cookies"
              disabled={isPropertyDisabled('name')}
              className={getInputClassName('name', 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">URL (optional)</label>
            <input
              type="text"
              value={getPropertyValue('url', '')}
              onChange={(e) => onChange('url', e.target.value)}
              placeholder="https://example.com"
              disabled={isPropertyDisabled('url')}
              className={getInputClassName('url', 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm')}
            />
          </div>
        </>
      )}

      {action === 'setCookie' && (
        <>
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
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Cookies (JSON array)</label>
            <textarea
              value={data.cookies ? JSON.stringify(data.cookies, null, 2) : ''}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value);
                  onChange('cookies', parsed);
                } catch {
                  // Invalid JSON, don't update
                }
              }}
              placeholder='[{"name": "cookie1", "value": "value1", "domain": "example.com"}]'
              rows={5}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm font-mono"
            />
            <div className="mt-1 text-xs text-gray-400">
              Array of cookie objects with name, value, and optional domain, path, expires, httpOnly, secure, sameSite
            </div>
          </div>
        </>
      )}

      {action === 'clearCookies' && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Domain (optional)</label>
          <input
            type="text"
            value={getPropertyValue('domain', '')}
            onChange={(e) => onChange('domain', e.target.value)}
            placeholder="Leave empty to clear all cookies"
            disabled={isPropertyDisabled('domain')}
            className={getInputClassName('domain', 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm')}
          />
        </div>
      )}

      {(action === 'getLocalStorage' || action === 'getSessionStorage') && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Key (optional)</label>
          <input
            type="text"
            value={getPropertyValue('key', '')}
            onChange={(e) => onChange('key', e.target.value)}
            placeholder="Leave empty to get all keys"
            disabled={isPropertyDisabled('key')}
            className={getInputClassName('key', 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm')}
          />
        </div>
      )}

      {(action === 'setLocalStorage' || action === 'setSessionStorage') && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Key</label>
            <input
              type="text"
              value={getPropertyValue('key', '')}
              onChange={(e) => onChange('key', e.target.value)}
              disabled={isPropertyDisabled('key')}
              className={getInputClassName('key', 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Value</label>
            <textarea
              value={getPropertyValue('value', '')}
              onChange={(e) => onChange('value', e.target.value)}
              rows={3}
              disabled={isPropertyDisabled('value')}
              className={getInputClassName('value', 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm')}
            />
          </div>
        </>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Context Key</label>
        <input
          type="text"
          value={getPropertyValue('contextKey', 'storageResult')}
          onChange={(e) => onChange('contextKey', e.target.value)}
          placeholder="storageResult"
          disabled={isPropertyDisabled('contextKey')}
          className={getInputClassName('contextKey', 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm')}
        />
        <div className="mt-1 text-xs text-gray-400">
          Key to store retrieved values in context
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
      </div>

      {/* Advanced Waiting Options - same pattern as other configs */}
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
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Wait for Selector</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={data.waitForSelector || ''}
                  onChange={(e) => onChange('waitForSelector', e.target.value)}
                  placeholder="#element"
                  className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm"
                />
                <SelectorFinderButton nodeId={node.id} fieldName="waitForSelector" />
              </div>
              <div className="mt-2">
                <select
                  value={data.waitForSelectorType || 'css'}
                  onChange={(e) => onChange('waitForSelectorType', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm"
                >
                  {SELECTOR_TYPE_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Wait for URL Pattern</label>
              <input
                type="text"
                value={data.waitForUrl || ''}
                onChange={(e) => onChange('waitForUrl', e.target.value)}
                placeholder="/pattern/ or exact-url"
                className={`w-full px-3 py-2 bg-gray-700 border rounded text-sm ${
                  isUrlPatternValid ? 'border-gray-600' : 'border-red-500'
                }`}
              />
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
            </div>

            {(data.waitForSelector || data.waitForUrl || data.waitForCondition) && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Wait Strategy</label>
                <select
                  value={data.waitStrategy || 'parallel'}
                  onChange={(e) => onChange('waitStrategy', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm"
                >
                  <option value="parallel">Parallel</option>
                  <option value="sequential">Sequential</option>
                </select>
              </div>
            )}
          </div>
        )}
      </div>

      <RetryConfigSection data={data} onChange={onChange} />
    </div>
  );
}
