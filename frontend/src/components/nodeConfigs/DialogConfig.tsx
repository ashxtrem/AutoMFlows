import { Node } from 'reactflow';
import { useState } from 'react';
import RetryConfigSection from '../RetryConfigSection';
import { usePropertyInput } from '../../hooks/usePropertyInput';
import SelectorFinderButton from '../SelectorFinderButton';

interface DialogConfigProps {
  node: Node;
  onChange: (field: string, value: any) => void;
}

export default function DialogConfig({ node, onChange }: DialogConfigProps) {
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
  const action = data.action || 'accept';

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Action</label>
        <select
          value={getPropertyValue('action', 'accept')}
          onChange={(e) => {
            const newAction = e.target.value;
            onChange('action', newAction);
            if (newAction !== 'prompt') {
              onChange('inputText', undefined);
            }
            if (newAction !== 'waitForDialog') {
              onChange('outputVariable', undefined);
            }
          }}
          disabled={isPropertyDisabled('action')}
          className={getInputClassName('action', 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm')}
        >
          <option value="accept">Accept</option>
          <option value="dismiss">Dismiss</option>
          <option value="prompt">Prompt</option>
          <option value="waitForDialog">Wait for Dialog</option>
        </select>
      </div>

      {action === 'prompt' && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Input Text</label>
          <input
            type="text"
            value={getPropertyValue('inputText', '')}
            onChange={(e) => onChange('inputText', e.target.value)}
            disabled={isPropertyDisabled('inputText')}
            className={getInputClassName('inputText', 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm')}
          />
        </div>
      )}

      {action === 'waitForDialog' && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Output Variable</label>
          <input
            type="text"
            value={getPropertyValue('outputVariable', 'dialogMessage')}
            onChange={(e) => onChange('outputVariable', e.target.value)}
            placeholder="dialogMessage"
            disabled={isPropertyDisabled('outputVariable')}
            className={getInputClassName('outputVariable', 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm')}
          />
        </div>
      )}

      {(action === 'accept' || action === 'dismiss' || action === 'prompt' || action === 'waitForDialog') && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Expected Message (optional)</label>
          <input
            type="text"
            value={getPropertyValue('message', '')}
            onChange={(e) => onChange('message', e.target.value)}
            placeholder="Expected dialog message"
            disabled={isPropertyDisabled('message')}
            className={getInputClassName('message', 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm')}
          />
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
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={data.waitForSelector || ''}
                  onChange={(e) => onChange('waitForSelector', e.target.value)}
                  className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm"
                />
                <SelectorFinderButton nodeId={node.id} fieldName="waitForSelector" />
              </div>
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
