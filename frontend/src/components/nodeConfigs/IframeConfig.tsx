import { Node } from 'reactflow';
import { useState } from 'react';
import RetryConfigSection from '../RetryConfigSection';
import { usePropertyInput } from '../../hooks/usePropertyInput';

interface IframeConfigProps {
  node: Node;
  onChange: (field: string, value: any) => void;
}

export default function IframeConfig({ node, onChange }: IframeConfigProps) {
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
  const action = data.action || 'switchToIframe';

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Action</label>
        <select
          value={getPropertyValue('action', 'switchToIframe')}
          onChange={(e) => {
            const newAction = e.target.value;
            onChange('action', newAction);
            if (newAction !== 'switchToIframe' && newAction !== 'getIframeContent') {
              onChange('selector', undefined);
              onChange('name', undefined);
              onChange('url', undefined);
            }
            if (newAction !== 'switchToIframe') {
              onChange('contextKey', undefined);
            }
            if (newAction !== 'getIframeContent') {
              onChange('iframeSelector', undefined);
              onChange('contentSelector', undefined);
              onChange('outputVariable', undefined);
            }
          }}
          disabled={isPropertyDisabled('action')}
          className={getInputClassName('action', 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm')}
        >
          <option value="switchToIframe">Switch to Iframe</option>
          <option value="switchToMainFrame">Switch to Main Frame</option>
          <option value="getIframeContent">Get Iframe Content</option>
        </select>
      </div>

      {action === 'switchToIframe' && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Selector (optional)</label>
            <input
              type="text"
              value={getPropertyValue('selector', '')}
              onChange={(e) => onChange('selector', e.target.value)}
              placeholder="#iframe or //iframe[@id='iframe']"
              disabled={isPropertyDisabled('selector')}
              className={getInputClassName('selector', 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm')}
            />
            <div className="mt-1 text-xs text-gray-400">
              Leave empty to use name or URL instead
            </div>
          </div>
          {data.selector && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Selector Type</label>
              <select
                value={getPropertyValue('selectorType', 'css')}
                onChange={(e) => onChange('selectorType', e.target.value)}
                disabled={isPropertyDisabled('selectorType')}
                className={getInputClassName('selectorType', 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm')}
              >
                <option value="css">CSS Selector</option>
                <option value="xpath">XPath</option>
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Name (optional)</label>
            <input
              type="text"
              value={getPropertyValue('name', '')}
              onChange={(e) => onChange('name', e.target.value)}
              placeholder="iframe name attribute"
              disabled={isPropertyDisabled('name')}
              className={getInputClassName('name', 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">URL Pattern (optional)</label>
            <input
              type="text"
              value={getPropertyValue('url', '')}
              onChange={(e) => onChange('url', e.target.value)}
              placeholder="/example\.com/ or example.com"
              disabled={isPropertyDisabled('url')}
              className={getInputClassName('url', 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Context Key</label>
            <input
              type="text"
              value={getPropertyValue('contextKey', 'iframePage')}
              onChange={(e) => onChange('contextKey', e.target.value)}
              placeholder="iframePage"
              disabled={isPropertyDisabled('contextKey')}
              className={getInputClassName('contextKey', 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm')}
            />
          </div>
        </>
      )}

      {action === 'getIframeContent' && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Iframe Selector</label>
            <input
              type="text"
              value={getPropertyValue('iframeSelector', '')}
              onChange={(e) => onChange('iframeSelector', e.target.value)}
              placeholder="#iframe or //iframe[@id='iframe']"
              disabled={isPropertyDisabled('iframeSelector')}
              className={getInputClassName('iframeSelector', 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Content Selector</label>
            <input
              type="text"
              value={getPropertyValue('contentSelector', '')}
              onChange={(e) => onChange('contentSelector', e.target.value)}
              placeholder="#content or //div[@id='content']"
              disabled={isPropertyDisabled('contentSelector')}
              className={getInputClassName('contentSelector', 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Output Variable</label>
            <input
              type="text"
              value={getPropertyValue('outputVariable', 'iframeContent')}
              onChange={(e) => onChange('outputVariable', e.target.value)}
              placeholder="iframeContent"
              disabled={isPropertyDisabled('outputVariable')}
              className={getInputClassName('outputVariable', 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm')}
            />
          </div>
        </>
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
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Wait for Selector</label>
              <input
                type="text"
                value={data.waitForSelector || ''}
                onChange={(e) => onChange('waitForSelector', e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Wait for URL Pattern</label>
              <input
                type="text"
                value={data.waitForUrl || ''}
                onChange={(e) => onChange('waitForUrl', e.target.value)}
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
