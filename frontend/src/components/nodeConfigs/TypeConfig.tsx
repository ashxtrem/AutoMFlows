import { Node } from 'reactflow';
import { useState } from 'react';
import { usePropertyInput } from '../../hooks/usePropertyInput';
import SelectorFinderButton from '../SelectorFinderButton';

interface TypeConfigProps {
  node: Node;
  onChange: (field: string, value: any) => void;
}

export default function TypeConfig({ node, onChange }: TypeConfigProps) {
  const data = node.data;
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showRetry, setShowRetry] = useState(false);
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
        {isPropertyDisabled('selectorType') && (
          <div className="mt-1 text-xs text-gray-500 italic">
            This property is converted to input. Connect a node to provide the value.
          </div>
        )}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Selector</label>
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
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Input Method</label>
        <select
          value={getPropertyValue('inputMethod', 'fill')}
          onChange={(e) => onChange('inputMethod', e.target.value)}
          disabled={isPropertyDisabled('inputMethod')}
          className={getInputClassName('inputMethod', 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm')}
        >
          <option value="fill">Fill - Clear and fill instantly (default)</option>
          <option value="type">Type - Type character by character with delays</option>
          <option value="pressSequentially">Press Sequentially - Type with configurable delays</option>
          <option value="append">Append - Append to existing value</option>
          <option value="prepend">Prepend - Prepend to existing value</option>
          <option value="direct">Direct - Set value directly via DOM</option>
        </select>
        {isPropertyDisabled('inputMethod') && (
          <div className="mt-1 text-xs text-gray-500 italic">
            This property is converted to input. Connect a node to provide the value.
          </div>
        )}
        <div className="mt-1 text-xs text-gray-400">
          {data.inputMethod === 'fill' && 'Clears the field and fills text instantly. Fastest method.'}
          {data.inputMethod === 'type' && 'Types character by character, triggering keyboard events. Good for autocomplete and validation.'}
          {data.inputMethod === 'pressSequentially' && 'Same as type but more explicit. Types with delays between keystrokes.'}
          {data.inputMethod === 'append' && 'Appends text to the existing value in the field.'}
          {data.inputMethod === 'prepend' && 'Prepends text to the existing value in the field.'}
          {data.inputMethod === 'direct' && 'Sets value directly via DOM without triggering events. Fastest but may not trigger validation.'}
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Text</label>
        <textarea
          value={getPropertyValue('text', '')}
          onChange={(e) => onChange('text', e.target.value)}
          placeholder="Text to type"
          disabled={isPropertyDisabled('text')}
          rows={3}
          className={getInputClassName('text', 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm')}
        />
        {isPropertyDisabled('text') && (
          <div className="mt-1 text-xs text-gray-500 italic">
            This property is converted to input. Connect a node to provide the value.
          </div>
        )}
      </div>
      {(data.inputMethod === 'type' || data.inputMethod === 'pressSequentially') && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Delay Between Keystrokes (ms)</label>
          <input
            type="number"
            value={getPropertyValue('delay', 0)}
            onChange={(e) => onChange('delay', parseInt(e.target.value, 10) || 0)}
            disabled={isPropertyDisabled('delay')}
            min="0"
            placeholder="0"
            className={getInputClassName('delay', 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm')}
          />
          {isPropertyDisabled('delay') && (
            <div className="mt-1 text-xs text-gray-500 italic">
              This property is converted to input. Connect a node to provide the value.
            </div>
          )}
          <div className="mt-1 text-xs text-gray-400">
            Delay in milliseconds between each keystroke. 0 = no delay (fast typing), higher values = slower typing (simulates human typing).
          </div>
        </div>
      )}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Timeout (ms)</label>
        <input
          type="number"
          value={getPropertyValue('timeout', 30000)}
          onChange={(e) => onChange('timeout', parseInt(e.target.value, 10))}
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
                  ? 'Wait conditions will execute after the type operation'
                  : 'Wait conditions will execute before the type operation (default)'}
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
                Wait for a specific element to appear before typing. Useful for input fields that appear after AJAX loads.
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
                Wait until URL matches pattern before typing. Use /pattern/ for regex (e.g., /\/dashboard\/.*/) or plain text for exact match.
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

      {/* Retry Configuration */}
      <div className="border-t border-gray-600 pt-4">
        <button
          type="button"
          onClick={() => setShowRetry(!showRetry)}
          className="w-full flex items-center justify-between text-sm font-medium text-gray-300 hover:text-white transition-colors"
        >
          <span>Retry Configuration</span>
          <span className="text-gray-400">{showRetry ? '▼' : '▶'}</span>
        </button>

        {showRetry && (
          <div className="mt-4 space-y-4">
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={data.retryEnabled || false}
                  onChange={(e) => onChange('retryEnabled', e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm text-gray-300">Enable Retry</span>
              </label>
            </div>

            {data.retryEnabled && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Retry Strategy</label>
                  <select
                    value={data.retryStrategy || 'count'}
                    onChange={(e) => onChange('retryStrategy', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                  >
                    <option value="count">Retry Count - Retry fixed number of times</option>
                    <option value="untilCondition">Retry Until Condition - Retry until condition is met</option>
                  </select>
                </div>

                {data.retryStrategy === 'count' ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Retry Count</label>
                    <input
                      type="number"
                      value={data.retryCount || 3}
                      onChange={(e) => onChange('retryCount', parseInt(e.target.value, 10) || 3)}
                      min="1"
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                    />
                    <div className="mt-1 text-xs text-gray-400">
                      Number of times to retry on failure (excluding initial attempt)
                    </div>
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Condition Type</label>
                      <select
                        value={data.retryUntilCondition?.type || 'selector'}
                        onChange={(e) => onChange('retryUntilCondition', {
                          ...data.retryUntilCondition,
                          type: e.target.value,
                          value: data.retryUntilCondition?.value || '',
                        })}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                      >
                        <option value="selector">Selector</option>
                        <option value="url">URL Pattern</option>
                        <option value="javascript">JavaScript Condition</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Condition Value
                      </label>
                      {data.retryUntilCondition?.type === 'javascript' ? (
                        <textarea
                          value={data.retryUntilCondition?.value || ''}
                          onChange={(e) => onChange('retryUntilCondition', {
                            ...data.retryUntilCondition,
                            value: e.target.value,
                          })}
                          placeholder="() => document.querySelector('.loaded') !== null"
                          rows={3}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm font-mono text-xs"
                        />
                      ) : (
                        <input
                          type="text"
                          value={data.retryUntilCondition?.value || ''}
                          onChange={(e) => onChange('retryUntilCondition', {
                            ...data.retryUntilCondition,
                            value: e.target.value,
                          })}
                          placeholder={data.retryUntilCondition?.type === 'url' ? '/pattern/ or exact-url' : '.my-class or //div[@id="myId"]'}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                        />
                      )}
                    </div>
                    {data.retryUntilCondition?.type === 'selector' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Selector Type</label>
                        <select
                          value={data.retryUntilCondition?.selectorType || 'css'}
                          onChange={(e) => onChange('retryUntilCondition', {
                            ...data.retryUntilCondition,
                            selectorType: e.target.value,
                          })}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                        >
                          <option value="css">CSS</option>
                          <option value="xpath">XPath</option>
                        </select>
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Max Retry Timeout (ms)</label>
                      <input
                        type="number"
                        value={data.retryUntilCondition?.timeout || 30000}
                        onChange={(e) => onChange('retryUntilCondition', {
                          ...data.retryUntilCondition,
                          timeout: parseInt(e.target.value, 10) || 30000,
                        })}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                      />
                      <div className="mt-1 text-xs text-gray-400">
                        Maximum time to keep retrying before giving up
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Retry Delay (ms)</label>
                  <input
                    type="number"
                    value={data.retryDelay || 1000}
                    onChange={(e) => onChange('retryDelay', parseInt(e.target.value, 10) || 1000)}
                    min="0"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                  />
                  <div className="mt-1 text-xs text-gray-400">
                    Base delay between retries
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Delay Strategy</label>
                  <select
                    value={data.retryDelayStrategy || 'fixed'}
                    onChange={(e) => onChange('retryDelayStrategy', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                  >
                    <option value="fixed">Fixed - Constant delay</option>
                    <option value="exponential">Exponential - Delay increases with each retry</option>
                  </select>
                </div>

                {data.retryDelayStrategy === 'exponential' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Max Delay (ms) - Optional</label>
                    <input
                      type="number"
                      value={data.retryMaxDelay || ''}
                      onChange={(e) => onChange('retryMaxDelay', e.target.value ? parseInt(e.target.value, 10) : undefined)}
                      placeholder="No limit"
                      min="0"
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                    />
                    <div className="mt-1 text-xs text-gray-400">
                      Maximum delay cap for exponential backoff (leave empty for no limit)
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

