import { useState } from 'react';
import { NodeType } from '@automflows/shared';

interface RetryConfigSectionProps {
  data: any;
  onChange: (field: string, value: any) => void;
}

export default function RetryConfigSection({ data, onChange }: RetryConfigSectionProps) {
  const [showRetry, setShowRetry] = useState(false);
  
  // Check if this is an API node
  const isApiNode = data.type === NodeType.API_REQUEST || data.type === NodeType.API_CURL;

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
                      value={data.retryUntilCondition?.type || (isApiNode ? 'api-status' : 'selector')}
                      onChange={(e) => {
                        const newCondition: any = {
                          ...data.retryUntilCondition,
                          type: e.target.value,
                        };
                        // Reset condition-specific fields when type changes
                        if (e.target.value === 'api-status') {
                          newCondition.expectedStatus = data.retryUntilCondition?.expectedStatus || 200;
                          delete newCondition.value;
                          delete newCondition.jsonPath;
                          delete newCondition.expectedValue;
                          delete newCondition.matchType;
                        } else if (e.target.value === 'api-json-path') {
                          newCondition.jsonPath = data.retryUntilCondition?.jsonPath || '';
                          newCondition.expectedValue = data.retryUntilCondition?.expectedValue || '';
                          newCondition.matchType = data.retryUntilCondition?.matchType || 'equals';
                          delete newCondition.value;
                          delete newCondition.expectedStatus;
                        } else if (e.target.value === 'api-javascript') {
                          newCondition.value = data.retryUntilCondition?.value || '';
                          newCondition.contextKey = data.retryUntilCondition?.contextKey || data.contextKey || 'apiResponse';
                          delete newCondition.expectedStatus;
                          delete newCondition.jsonPath;
                          delete newCondition.expectedValue;
                          delete newCondition.matchType;
                        } else {
                          // Browser conditions
                          newCondition.value = data.retryUntilCondition?.value || '';
                          delete newCondition.expectedStatus;
                          delete newCondition.jsonPath;
                          delete newCondition.expectedValue;
                          delete newCondition.matchType;
                          delete newCondition.contextKey;
                        }
                        onChange('retryUntilCondition', newCondition);
                      }}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                    >
                      {isApiNode ? (
                        <>
                          <option value="api-status">Status Code - Retry until status code matches</option>
                          <option value="api-json-path">JSON Path - Retry until JSON path matches</option>
                          <option value="api-javascript">JavaScript - Retry until JavaScript condition</option>
                        </>
                      ) : (
                        <>
                          <option value="selector">Selector</option>
                          <option value="url">URL Pattern</option>
                          <option value="javascript">JavaScript Condition</option>
                        </>
                      )}
                    </select>
                  </div>
                  
                  {/* API Status Condition */}
                  {data.retryUntilCondition?.type === 'api-status' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Expected Status Code</label>
                      <input
                        type="number"
                        value={data.retryUntilCondition?.expectedStatus || 200}
                        onChange={(e) => onChange('retryUntilCondition', {
                          ...data.retryUntilCondition,
                          expectedStatus: parseInt(e.target.value, 10) || 200,
                        })}
                        placeholder="200"
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                      />
                      <div className="mt-1 text-xs text-gray-400">
                        Retry until API response status code matches this value
                      </div>
                    </div>
                  )}
                  
                  {/* API JSON Path Condition */}
                  {data.retryUntilCondition?.type === 'api-json-path' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">JSON Path</label>
                        <input
                          type="text"
                          value={data.retryUntilCondition?.jsonPath || ''}
                          onChange={(e) => onChange('retryUntilCondition', {
                            ...data.retryUntilCondition,
                            jsonPath: e.target.value,
                          })}
                          placeholder="customer.id or data.items[0].status"
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                        />
                        <div className="mt-1 text-xs text-gray-400">
                          JSON path to check in API response body (dot notation)
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Expected Value</label>
                        <input
                          type="text"
                          value={data.retryUntilCondition?.expectedValue || ''}
                          onChange={(e) => onChange('retryUntilCondition', {
                            ...data.retryUntilCondition,
                            expectedValue: e.target.value,
                          })}
                          placeholder="active or 123"
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                        />
                        <div className="mt-1 text-xs text-gray-400">
                          Expected value to match against the JSON path result (compared using Match Type)
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Match Type</label>
                        <select
                          value={data.retryUntilCondition?.matchType || 'equals'}
                          onChange={(e) => onChange('retryUntilCondition', {
                            ...data.retryUntilCondition,
                            matchType: e.target.value,
                          })}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                        >
                          <option value="equals">Equals</option>
                          <option value="contains">Contains</option>
                          <option value="startsWith">Starts With</option>
                          <option value="endsWith">Ends With</option>
                          <option value="regex">Regex</option>
                        </select>
                      </div>
                    </>
                  )}
                  
                  {/* API JavaScript Condition */}
                  {data.retryUntilCondition?.type === 'api-javascript' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">JavaScript Condition</label>
                        <textarea
                          value={data.retryUntilCondition?.value || ''}
                          onChange={(e) => onChange('retryUntilCondition', {
                            ...data.retryUntilCondition,
                            value: e.target.value,
                          })}
                          placeholder="response.status === 200 || response.body.customerId !== null"
                          rows={4}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm font-mono text-xs"
                        />
                        <div className="mt-1 text-xs text-gray-400">
                          JavaScript code that returns true when condition is met. Available: <code className="text-blue-400">response</code> (API response object), <code className="text-blue-400">context</code> (context manager)
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Context Key (Optional)</label>
                        <input
                          type="text"
                          value={data.retryUntilCondition?.contextKey || data.contextKey || 'apiResponse'}
                          onChange={(e) => onChange('retryUntilCondition', {
                            ...data.retryUntilCondition,
                            contextKey: e.target.value,
                          })}
                          placeholder="apiResponse"
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                        />
                        <div className="mt-1 text-xs text-gray-400">
                          Which API response to check (defaults to node's context key)
                        </div>
                      </div>
                    </>
                  )}
                  
                  {/* Browser Conditions */}
                  {!isApiNode && (
                    <>
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
                    </>
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

