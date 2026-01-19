import { Node } from 'reactflow';
import { useState } from 'react';
import RetryConfigSection from '../RetryConfigSection';
import { usePropertyInput } from '../../hooks/usePropertyInput';

interface KeyboardConfigProps {
  node: Node;
  onChange: (field: string, value: any) => void;
}

export default function KeyboardConfig({ node, onChange }: KeyboardConfigProps) {
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
  const action = data.action || 'press';

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Action</label>
        <select
          value={getPropertyValue('action', 'press')}
          onChange={(e) => {
            const newAction = e.target.value;
            onChange('action', newAction);
            // Clear action-specific properties when action changes
            if (newAction !== 'press' && newAction !== 'down' && newAction !== 'up') {
              onChange('key', undefined);
            }
            if (newAction !== 'type' && newAction !== 'insertText') {
              onChange('text', undefined);
            }
            if (newAction !== 'shortcut') {
              onChange('shortcut', undefined);
            }
            if (newAction !== 'type') {
              onChange('delay', undefined);
            }
            if (newAction !== 'press' && newAction !== 'type' && newAction !== 'insertText' && newAction !== 'shortcut') {
              onChange('selector', undefined);
              onChange('selectorType', undefined);
            }
          }}
          disabled={isPropertyDisabled('action')}
          className={getInputClassName('action', 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm')}
        >
          <option value="press">Press</option>
          <option value="type">Type</option>
          <option value="insertText">Insert Text</option>
          <option value="shortcut">Shortcut</option>
          <option value="down">Hold Key Down</option>
          <option value="up">Release Key</option>
        </select>
        {isPropertyDisabled('action') && (
          <div className="mt-1 text-xs text-gray-500 italic">
            This property is converted to input. Connect a node to provide the value.
          </div>
        )}
      </div>

      {/* Action-specific properties */}
      {(action === 'press' || action === 'down' || action === 'up') && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Key</label>
          <input
            type="text"
            value={getPropertyValue('key', '')}
            onChange={(e) => onChange('key', e.target.value)}
            placeholder="Enter, Tab, Escape, ArrowLeft, etc."
            disabled={isPropertyDisabled('key')}
            className={getInputClassName('key', 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm')}
          />
          {isPropertyDisabled('key') && (
            <div className="mt-1 text-xs text-gray-500 italic">
              This property is converted to input. Connect a node to provide the value.
            </div>
          )}
          <div className="mt-1 text-xs text-gray-400">
            Key name (e.g., Enter, Tab, Escape, ArrowLeft, ArrowRight, ArrowUp, ArrowDown, Backspace, Delete, etc.)
          </div>
        </div>
      )}

      {(action === 'type' || action === 'insertText') && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Text</label>
          <textarea
            value={getPropertyValue('text', '')}
            onChange={(e) => onChange('text', e.target.value)}
            placeholder="Text to type"
            rows={3}
            disabled={isPropertyDisabled('text')}
            className={getInputClassName('text', 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm')}
          />
          {isPropertyDisabled('text') && (
            <div className="mt-1 text-xs text-gray-500 italic">
              This property is converted to input. Connect a node to provide the value.
            </div>
          )}
        </div>
      )}

      {action === 'type' && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Delay (ms)</label>
          <input
            type="number"
            value={getPropertyValue('delay', '')}
            onChange={(e) => onChange('delay', e.target.value ? parseInt(e.target.value, 10) : undefined)}
            placeholder="Delay between keystrokes"
            disabled={isPropertyDisabled('delay')}
            className={getInputClassName('delay', 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm')}
          />
          {isPropertyDisabled('delay') && (
            <div className="mt-1 text-xs text-gray-500 italic">
              This property is converted to input. Connect a node to provide the value.
            </div>
          )}
        </div>
      )}

      {action === 'shortcut' && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Shortcut</label>
          <input
            type="text"
            value={getPropertyValue('shortcut', '')}
            onChange={(e) => onChange('shortcut', e.target.value)}
            placeholder="Control+C, Meta+V, Shift+Enter"
            disabled={isPropertyDisabled('shortcut')}
            className={getInputClassName('shortcut', 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm')}
          />
          {isPropertyDisabled('shortcut') && (
            <div className="mt-1 text-xs text-gray-500 italic">
              This property is converted to input. Connect a node to provide the value.
            </div>
          )}
          <div className="mt-1 text-xs text-gray-400">
            Keyboard shortcut (e.g., "Control+C", "Meta+V", "Shift+Enter")
          </div>
        </div>
      )}

      {(action === 'press' || action === 'type' || action === 'insertText' || action === 'shortcut') && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Selector (optional)</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={getPropertyValue('selector', '')}
                onChange={(e) => onChange('selector', e.target.value)}
                placeholder="#input or //input[@id='input']"
                disabled={isPropertyDisabled('selector')}
                className={getInputClassName('selector', 'flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm')}
              />
              {!isPropertyDisabled('selector') && (
                <SelectorFinderButton nodeId={node.id} fieldName="selector" />
              )}
            </div>
            {isPropertyDisabled('selector') && (
              <div className="mt-1 text-xs text-gray-500 italic">
                This property is converted to input. Connect a node to provide the value.
              </div>
            )}
            <div className="mt-1 text-xs text-gray-400">
              Focus element first before performing keyboard action
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
          Continue execution even if keyboard operation fails
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
