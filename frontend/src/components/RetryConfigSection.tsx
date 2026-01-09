import { useState } from 'react';

interface RetryConfigSectionProps {
  data: any;
  onChange: (field: string, value: any) => void;
}

export default function RetryConfigSection({ data, onChange }: RetryConfigSectionProps) {
  const [showRetry, setShowRetry] = useState(false);

  return (
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
  );
}

