import { Node } from 'reactflow';
import { useState } from 'react';
import { usePropertyInput } from '../../hooks/usePropertyInput';
import SelectorFinderButton from '../SelectorFinderButton';
import SelectorModifiersEditor from '../SelectorModifiersEditor';
import { getSelectorPlaceholder, getSelectorHelpText, SELECTOR_TYPE_OPTIONS } from '../../utils/selectorHelpers';

interface ActionConfigProps {
  node: Node;
  onChange: (field: string, value: any) => void;
}

export default function ActionConfig({ node, onChange }: ActionConfigProps) {
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
  const action = data.action || 'click';

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-primary mb-1">Action</label>
        <select
          value={getPropertyValue('action', 'click')}
          onChange={(e) => {
            const newAction = e.target.value;
            onChange('action', newAction);
            // Clear action-specific properties when action changes
            if (newAction !== 'click' && newAction !== 'rightClick') {
              onChange('button', undefined);
            }
            if (newAction !== 'hover' && newAction !== 'doubleClick') {
              onChange('delay', undefined);
            }
            if (newAction !== 'dragAndDrop') {
              onChange('targetSelector', undefined);
              onChange('targetSelectorType', undefined);
              onChange('targetX', undefined);
              onChange('targetY', undefined);
            }
          }}
          disabled={isPropertyDisabled('action')}
          className={getInputClassName('action', 'w-full px-3 py-2 bg-surfaceHighlight border border-border rounded text-sm')}
        >
          <option value="click">Click</option>
          <option value="doubleClick">Double Click</option>
          <option value="rightClick">Right Click</option>
          <option value="hover">Hover</option>
          <option value="dragAndDrop">Drag and Drop</option>
        </select>
        {isPropertyDisabled('action') && (
          <div className="mt-1 text-xs text-secondary italic">
            This property is converted to input. Connect a node to provide the value.
          </div>
        )}
      </div>
      <div>
        <label className="block text-sm font-medium text-primary mb-1">Selector Type</label>
        <select
          value={getPropertyValue('selectorType', 'css')}
          onChange={(e) => onChange('selectorType', e.target.value)}
          disabled={isPropertyDisabled('selectorType')}
          className={getInputClassName('selectorType', 'w-full px-3 py-2 bg-surfaceHighlight border border-border rounded text-sm')}
        >
          {SELECTOR_TYPE_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        {isPropertyDisabled('selectorType') && (
          <div className="mt-1 text-xs text-secondary italic">
            This property is converted to input. Connect a node to provide the value.
          </div>
        )}
      </div>
      <div>
        <label className="block text-sm font-medium text-primary mb-1">Selector</label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={getPropertyValue('selector', '')}
            onChange={(e) => onChange('selector', e.target.value)}
            placeholder={getSelectorPlaceholder(getPropertyValue('selectorType', 'css'))}
            disabled={isPropertyDisabled('selector')}
            className={getInputClassName('selector', 'flex-1 px-3 py-2 bg-surfaceHighlight border border-border rounded text-sm')}
          />
          {!isPropertyDisabled('selector') && (
            <SelectorFinderButton nodeId={node.id} fieldName="selector" />
          )}
        </div>
        {isPropertyDisabled('selector') && (
          <div className="mt-1 text-xs text-secondary italic">
            This property is converted to input. Connect a node to provide the value.
          </div>
        )}
        {getSelectorHelpText(getPropertyValue('selectorType', 'css')) && (
          <div className="mt-1 text-xs text-gray-400">
            {getSelectorHelpText(getPropertyValue('selectorType', 'css'))}
          </div>
        )}
      </div>
      <SelectorModifiersEditor
        value={data.selectorModifiers}
        onChange={(v) => onChange('selectorModifiers', v)}
      />

      {/* Action-specific properties */}
      {(action === 'click' || action === 'rightClick') && (
        <div>
          <label className="block text-sm font-medium text-primary mb-1">Button</label>
          <select
            value={data.button || 'left'}
            onChange={(e) => onChange('button', e.target.value)}
            className="w-full px-3 py-2 bg-surfaceHighlight border border-border rounded text-sm"
          >
            <option value="left">Left</option>
            <option value="right">Right</option>
            <option value="middle">Middle</option>
          </select>
        </div>
      )}
      
      {(action === 'hover' || action === 'doubleClick') && (
        <div>
          <label className="block text-sm font-medium text-primary mb-1">Delay (ms)</label>
          <input
            type="number"
            value={data.delay || 0}
            onChange={(e) => onChange('delay', parseInt(e.target.value, 10) || 0)}
            placeholder="0"
            min="0"
            className="w-full px-3 py-2 bg-surfaceHighlight border border-border rounded text-sm"
          />
          <div className="mt-1 text-xs text-gray-400">
            {action === 'hover' ? 'Delay before hover operation' : 'Delay between clicks for double click'}
          </div>
        </div>
      )}

      {action === 'dragAndDrop' && (
        <>
          <div>
            <label className="block text-sm font-medium text-primary mb-1">Target Selector Type</label>
            <select
              value={data.targetSelectorType || 'css'}
              onChange={(e) => onChange('targetSelectorType', e.target.value)}
              className="w-full px-3 py-2 bg-surfaceHighlight border border-border rounded text-sm"
            >
              {SELECTOR_TYPE_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <div className="mt-1 text-xs text-gray-400">
              Selector type for the target element
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-primary mb-1">Target Selector</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={data.targetSelector || ''}
                onChange={(e) => onChange('targetSelector', e.target.value)}
                placeholder="#target or //div[@id='target']"
                className="flex-1 px-3 py-2 bg-surfaceHighlight border border-border rounded text-sm"
              />
              <SelectorFinderButton nodeId={node.id} fieldName="targetSelector" />
            </div>
            <div className="mt-1 text-xs text-gray-400">
              Selector for the target element to drop on. Leave empty to use coordinates instead.
            </div>
          </div>
          <SelectorModifiersEditor
            value={data.targetSelectorModifiers}
            onChange={(v) => onChange('targetSelectorModifiers', v)}
          />
          <div className="border-t border-gray-600 pt-2 mt-2">
            <div className="text-xs text-gray-400 mb-2">Or use coordinates (if target selector is empty):</div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium text-primary mb-1">Target X</label>
                <input
                  type="number"
                  value={data.targetX !== undefined ? data.targetX : ''}
                  onChange={(e) => onChange('targetX', e.target.value ? parseInt(e.target.value, 10) : undefined)}
                  placeholder="X coordinate"
                  className="w-full px-3 py-2 bg-surfaceHighlight border border-border rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-primary mb-1">Target Y</label>
                <input
                  type="number"
                  value={data.targetY !== undefined ? data.targetY : ''}
                  onChange={(e) => onChange('targetY', e.target.value ? parseInt(e.target.value, 10) : undefined)}
                  placeholder="Y coordinate"
                  className="w-full px-3 py-2 bg-surfaceHighlight border border-border rounded text-sm"
                />
              </div>
            </div>
            <div className="mt-1 text-xs text-gray-400">
              Absolute coordinates (in pixels) to drop at. Requires both X and Y if target selector is not provided.
            </div>
          </div>
        </>
      )}

      <div>
        <label className="block text-sm font-medium text-primary mb-1">Timeout (ms)</label>
        <input
          type="number"
          value={getPropertyValue('timeout', 30000)}
          onChange={(e) => onChange('timeout', parseInt(e.target.value, 10))}
          disabled={isPropertyDisabled('timeout')}
          className={getInputClassName('timeout', 'w-full px-3 py-2 bg-surfaceHighlight border border-border rounded text-sm')}
        />
        {isPropertyDisabled('timeout') && (
          <div className="mt-1 text-xs text-secondary italic">
            This property is converted to input. Connect a node to provide the value.
          </div>
        )}
      </div>
      <div>
        <label className="block text-sm font-medium text-primary mb-1">Fail Silently</label>
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
          className="w-full flex items-center justify-between text-sm font-medium text-primary hover:text-white transition-colors"
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
                <span className="text-sm font-medium text-primary">
                  Wait After Operation
                </span>
              </label>
              <div className="mt-1 text-xs text-gray-400 ml-6">
                {data.waitAfterOperation
                  ? `Wait conditions will execute after the ${action} operation`
                  : `Wait conditions will execute before the ${action} operation (default)`}
              </div>
            </div>

            {/* Wait for Selector */}
            <div>
              <label className="block text-sm font-medium text-primary mb-1">
                Wait for Selector (Optional)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={data.waitForSelector || ''}
                  onChange={(e) => onChange('waitForSelector', e.target.value)}
                  placeholder=".my-class or //div[@id='myId']"
                  className="flex-1 px-3 py-2 bg-surfaceHighlight border border-border rounded text-white text-sm"
                />
                <select
                  value={data.waitForSelectorType || 'css'}
                  onChange={(e) => onChange('waitForSelectorType', e.target.value)}
                  className="px-3 py-2 bg-surfaceHighlight border border-border rounded text-white text-sm"
                >
                  {SELECTOR_TYPE_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="number"
                  value={data.waitForSelectorTimeout || data.timeout || 30000}
                  onChange={(e) => onChange('waitForSelectorTimeout', parseInt(e.target.value, 10) || undefined)}
                  placeholder="Timeout (ms)"
                  className="w-32 px-2 py-1 bg-surfaceHighlight border border-border rounded text-white text-xs"
                />
                <span className="text-xs text-gray-400">Timeout for selector wait</span>
              </div>
              <div className="mt-1 text-xs text-gray-400">
                Wait for a specific element to appear before performing the action. Useful for elements that appear after AJAX loads.
              </div>
            </div>

            {/* Wait for URL Pattern */}
            <div>
              <label className="block text-sm font-medium text-primary mb-1">
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
                  className="w-32 px-2 py-1 bg-surfaceHighlight border border-border rounded text-white text-xs"
                />
                <span className="text-xs text-gray-400">Timeout for URL pattern wait</span>
              </div>
              <div className="mt-1 text-xs text-gray-400">
                Wait until URL matches pattern before performing the action. Use /pattern/ for regex (e.g., /\/dashboard\/.*/) or plain text for exact match.
              </div>
            </div>

            {/* Wait for JavaScript Condition */}
            <div>
              <label className="block text-sm font-medium text-primary mb-1">
                Wait for JavaScript Condition (Optional)
              </label>
              <textarea
                value={data.waitForCondition || ''}
                onChange={(e) => onChange('waitForCondition', e.target.value)}
                placeholder="() => document.querySelector('.loaded') !== null"
                rows={3}
                className="w-full px-3 py-2 bg-surfaceHighlight border border-border rounded text-white text-sm font-mono text-xs"
              />
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="number"
                  value={data.waitForConditionTimeout || data.timeout || 30000}
                  onChange={(e) => onChange('waitForConditionTimeout', parseInt(e.target.value, 10) || undefined)}
                  placeholder="Timeout (ms)"
                  className="w-32 px-2 py-1 bg-surfaceHighlight border border-border rounded text-white text-xs"
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
                <label className="block text-sm font-medium text-primary mb-1">
                  Wait Strategy
                </label>
                <select
                  value={data.waitStrategy || 'parallel'}
                  onChange={(e) => onChange('waitStrategy', e.target.value)}
                  className="w-full px-3 py-2 bg-surfaceHighlight border border-border rounded text-white text-sm"
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
          className="w-full flex items-center justify-between text-sm font-medium text-primary hover:text-white transition-colors"
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
                <span className="text-sm text-primary">Enable Retry</span>
              </label>
            </div>

            {data.retryEnabled && (
              <>
                <div>
                  <label className="block text-sm font-medium text-primary mb-1">Retry Strategy</label>
                  <select
                    value={data.retryStrategy || 'count'}
                    onChange={(e) => onChange('retryStrategy', e.target.value)}
                    className="w-full px-3 py-2 bg-surfaceHighlight border border-border rounded text-white text-sm"
                  >
                    <option value="count">Retry Count - Retry fixed number of times</option>
                    <option value="untilCondition">Retry Until Condition - Retry until condition is met</option>
                  </select>
                </div>

                {data.retryStrategy === 'count' ? (
                  <div>
                    <label className="block text-sm font-medium text-primary mb-1">
                      Retry Count
                      <span className="ml-2 text-xs text-gray-400">(supports ${'{variables.key}'})</span>
                    </label>
                    {(() => {
                      const valueStr = typeof data.retryCount === 'string' ? data.retryCount : (data.retryCount?.toString() ?? '');
                      const containsInterpolation = typeof data.retryCount === 'string' && valueStr.includes('${');
                      return (
                        <>
                          <input
                            type={containsInterpolation ? "text" : "number"}
                            value={valueStr || '3'}
                            onChange={(e) => {
                              const inputValue = e.target.value;
                              if (inputValue.includes('${')) {
                                onChange('retryCount', inputValue);
                              } else if (inputValue === '') {
                                onChange('retryCount', 3);
                              } else {
                                const numValue = parseInt(inputValue, 10);
                                onChange('retryCount', isNaN(numValue) ? 3 : numValue);
                              }
                            }}
                            min="1"
                            className="w-full px-3 py-2 bg-surfaceHighlight border border-border rounded text-white text-sm"
                            placeholder="3 or ${variables.key}"
                          />
                          <div className="mt-1 text-xs text-gray-400">
                            Number of times to retry on failure (excluding initial attempt). Supports variable interpolation: ${'{variables.key}'} or ${'{data.key.path}'}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-primary mb-1">Condition Type</label>
                      <select
                        value={data.retryUntilCondition?.type || 'selector'}
                        onChange={(e) => onChange('retryUntilCondition', {
                          ...data.retryUntilCondition,
                          type: e.target.value,
                          value: data.retryUntilCondition?.value || '',
                        })}
                        className="w-full px-3 py-2 bg-surfaceHighlight border border-border rounded text-white text-sm"
                      >
                        <option value="selector">Selector</option>
                        <option value="url">URL Pattern</option>
                        <option value="javascript">JavaScript Condition</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary mb-1">
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
                          className="w-full px-3 py-2 bg-surfaceHighlight border border-border rounded text-white text-sm font-mono text-xs"
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
                          className="w-full px-3 py-2 bg-surfaceHighlight border border-border rounded text-white text-sm"
                        />
                      )}
                    </div>
                    {data.retryUntilCondition?.type === 'selector' && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-primary mb-1">Selector Type</label>
                          <select
                            value={data.retryUntilCondition?.selectorType || 'css'}
                            onChange={(e) => onChange('retryUntilCondition', {
                              ...data.retryUntilCondition,
                              selectorType: e.target.value,
                            })}
                            className="w-full px-3 py-2 bg-surfaceHighlight border border-border rounded text-white text-sm"
                          >
                            {SELECTOR_TYPE_OPTIONS.map(option => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-primary mb-1">Visibility</label>
                          <select
                            value={data.retryUntilCondition?.visibility || 'visible'}
                            onChange={(e) => onChange('retryUntilCondition', {
                              ...data.retryUntilCondition,
                              visibility: e.target.value,
                            })}
                            className="w-full px-3 py-2 bg-surfaceHighlight border border-border rounded text-white text-sm"
                          >
                            <option value="visible">Visible - Retry until element becomes visible</option>
                            <option value="invisible">Invisible - Retry until element becomes invisible</option>
                          </select>
                          <div className="mt-1 text-xs text-gray-400">
                            {data.retryUntilCondition?.visibility === 'invisible'
                              ? 'Retry until the element disappears or becomes hidden'
                              : 'Retry until the element appears and becomes visible'}
                          </div>
                        </div>
                      </>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-primary mb-1">
                        Max Retry Timeout (ms)
                        <span className="ml-2 text-xs text-gray-400">(supports ${'{variables.key}'})</span>
                      </label>
                      {(() => {
                        const valueStr = typeof data.retryUntilCondition?.timeout === 'string' 
                          ? data.retryUntilCondition.timeout 
                          : (data.retryUntilCondition?.timeout?.toString() ?? '');
                        const containsInterpolation = typeof data.retryUntilCondition?.timeout === 'string' && valueStr.includes('${');
                        return (
                          <>
                            <input
                              type={containsInterpolation ? "text" : "number"}
                              value={valueStr || '30000'}
                              onChange={(e) => {
                                const inputValue = e.target.value;
                                if (inputValue.includes('${')) {
                                  onChange('retryUntilCondition', {
                                    ...data.retryUntilCondition,
                                    timeout: inputValue,
                                  });
                                } else if (inputValue === '') {
                                  onChange('retryUntilCondition', {
                                    ...data.retryUntilCondition,
                                    timeout: 30000,
                                  });
                                } else {
                                  const numValue = parseInt(inputValue, 10);
                                  onChange('retryUntilCondition', {
                                    ...data.retryUntilCondition,
                                    timeout: isNaN(numValue) ? 30000 : numValue,
                                  });
                                }
                              }}
                              className="w-full px-3 py-2 bg-surfaceHighlight border border-border rounded text-white text-sm"
                              placeholder="30000 or ${variables.key}"
                            />
                            <div className="mt-1 text-xs text-gray-400">
                              Maximum time to keep retrying before giving up. Supports variable interpolation: ${'{variables.key}'} or ${'{data.key.path}'}
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-medium text-primary mb-1">
                    Retry Delay (ms)
                    <span className="ml-2 text-xs text-gray-400">(supports ${'{variables.key}'})</span>
                  </label>
                  {(() => {
                    const valueStr = typeof data.retryDelay === 'string' ? data.retryDelay : (data.retryDelay?.toString() ?? '');
                    const containsInterpolation = typeof data.retryDelay === 'string' && valueStr.includes('${');
                    return (
                      <>
                        <input
                          type={containsInterpolation ? "text" : "number"}
                          value={valueStr || '1000'}
                          onChange={(e) => {
                            const inputValue = e.target.value;
                            if (inputValue.includes('${')) {
                              onChange('retryDelay', inputValue);
                            } else if (inputValue === '') {
                              onChange('retryDelay', 1000);
                            } else {
                              const numValue = parseInt(inputValue, 10);
                              onChange('retryDelay', isNaN(numValue) ? 1000 : numValue);
                            }
                          }}
                          min="0"
                          className="w-full px-3 py-2 bg-surfaceHighlight border border-border rounded text-white text-sm"
                          placeholder="1000 or ${variables.key}"
                        />
                        <div className="mt-1 text-xs text-gray-400">
                          Base delay between retries. Supports variable interpolation: ${'{variables.key}'} or ${'{data.key.path}'}
                        </div>
                      </>
                    );
                  })()}
                </div>

                <div>
                  <label className="block text-sm font-medium text-primary mb-1">Delay Strategy</label>
                  <select
                    value={data.retryDelayStrategy || 'fixed'}
                    onChange={(e) => onChange('retryDelayStrategy', e.target.value)}
                    className="w-full px-3 py-2 bg-surfaceHighlight border border-border rounded text-white text-sm"
                  >
                    <option value="fixed">Fixed - Constant delay</option>
                    <option value="exponential">Exponential - Delay increases with each retry</option>
                  </select>
                </div>

                {data.retryDelayStrategy === 'exponential' && (
                  <div>
                    <label className="block text-sm font-medium text-primary mb-1">
                      Max Delay (ms) - Optional
                      <span className="ml-2 text-xs text-gray-400">(supports ${'{variables.key}'})</span>
                    </label>
                    {(() => {
                      const valueStr = typeof data.retryMaxDelay === 'string' ? data.retryMaxDelay : (data.retryMaxDelay?.toString() ?? '');
                      const containsInterpolation = typeof data.retryMaxDelay === 'string' && valueStr.includes('${');
                      return (
                        <>
                          <input
                            type={containsInterpolation ? "text" : "number"}
                            value={valueStr}
                            onChange={(e) => {
                              const inputValue = e.target.value;
                              if (inputValue.includes('${')) {
                                onChange('retryMaxDelay', inputValue);
                              } else if (inputValue === '') {
                                onChange('retryMaxDelay', undefined);
                              } else {
                                const numValue = parseInt(inputValue, 10);
                                onChange('retryMaxDelay', isNaN(numValue) ? undefined : numValue);
                              }
                            }}
                            placeholder="No limit or ${variables.key}"
                            min="0"
                            className="w-full px-3 py-2 bg-surfaceHighlight border border-border rounded text-white text-sm"
                          />
                          <div className="mt-1 text-xs text-gray-400">
                            Maximum delay cap for exponential backoff (leave empty for no limit). Supports variable interpolation: ${'{variables.key}'} or ${'{data.key.path}'}
                          </div>
                        </>
                      );
                    })()}
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
