import { Node } from 'reactflow';
import RetryConfigSection from '../RetryConfigSection';
import { usePropertyInput } from '../../hooks/usePropertyInput';
import SelectorFinderButton from '../SelectorFinderButton';

interface WaitConfigProps {
  node: Node;
  onChange: (field: string, value: any) => void;
}

export default function WaitConfig({ node, onChange }: WaitConfigProps) {
  const data = node.data;
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

  const isUrlPatternValid = data.waitType === 'url' && typeof data.value === 'string' ? validateRegex(data.value) : true;

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Wait Type</label>
        <select
          value={getPropertyValue('waitType', 'timeout')}
          onChange={(e) => {
            onChange('waitType', e.target.value);
            // Reset API wait config when switching away from api-response
            if (e.target.value !== 'api-response') {
              onChange('apiWaitConfig', undefined);
            }
          }}
          disabled={isPropertyDisabled('waitType')}
          className={getInputClassName('waitType', 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm')}
        >
          <option value="timeout">Timeout (milliseconds)</option>
          <option value="selector">Wait for Selector</option>
          <option value="url">Wait for URL Pattern</option>
          <option value="condition">Wait for JavaScript Condition</option>
          <option value="api-response">Wait for API Response</option>
        </select>
      </div>
      {data.waitType === 'timeout' ? (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Timeout (ms)</label>
          <input
            type="number"
            value={typeof getPropertyValue('value', 1000) === 'number' ? getPropertyValue('value', 1000) : parseInt(String(getPropertyValue('value', 1000) || 1000), 10)}
            onChange={(e) => onChange('value', parseInt(e.target.value, 10))}
            disabled={isPropertyDisabled('value')}
            className={getInputClassName('value', 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm')}
          />
          {isPropertyDisabled('value') && (
            <div className="mt-1 text-xs text-gray-500 italic">
              This property is converted to input. Connect a node to provide the value.
            </div>
          )}
        </div>
      ) : data.waitType === 'selector' ? (
        <>
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
                value={typeof getPropertyValue('value', '') === 'string' ? getPropertyValue('value', '') : ''}
                onChange={(e) => onChange('value', e.target.value)}
                placeholder="#element or //div[@class='element']"
                disabled={isPropertyDisabled('value')}
                className={getInputClassName('value', 'flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm')}
              />
              {!isPropertyDisabled('value') && (
                <SelectorFinderButton nodeId={node.id} fieldName="value" />
              )}
            </div>
            {isPropertyDisabled('value') && (
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
        </>
      ) : data.waitType === 'url' ? (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">URL Pattern</label>
            <input
              type="text"
              value={typeof getPropertyValue('value', '') === 'string' ? getPropertyValue('value', '') : ''}
              onChange={(e) => onChange('value', e.target.value)}
              placeholder="/pattern/ or exact-url"
              disabled={isPropertyDisabled('value')}
              className={`${getInputClassName('value', 'w-full px-3 py-2 bg-gray-700 border rounded text-sm')} ${
                typeof getPropertyValue('value', '') === 'string' && getPropertyValue('value', '') && !isUrlPatternValid
                  ? 'border-red-500'
                  : 'border-gray-600'
              }`}
            />
            {typeof getPropertyValue('value', '') === 'string' && getPropertyValue('value', '') && !isUrlPatternValid && (
              <div className="mt-1 text-xs text-red-400">
                Invalid regex pattern. Use /pattern/ for regex or plain text for exact match.
              </div>
            )}
            {isPropertyDisabled('value') && (
              <div className="mt-1 text-xs text-gray-500 italic">
                This property is converted to input. Connect a node to provide the value.
              </div>
            )}
            <div className="mt-1 text-xs text-gray-400">
              Use /pattern/ for regex (e.g., /\/dashboard\/.*/) or plain text for exact match.
            </div>
          </div>
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
        </>
      ) : data.waitType === 'api-response' ? (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Context Key</label>
            <input
              type="text"
              value={data.apiWaitConfig?.contextKey || typeof data.value === 'string' ? data.value : ''}
              onChange={(e) => {
                onChange('apiWaitConfig', {
                  ...data.apiWaitConfig,
                  contextKey: e.target.value,
                });
                onChange('value', e.target.value);
              }}
              placeholder="apiResponse"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
            />
            <div className="mt-1 text-xs text-gray-400">
              Context key where API response is stored (from API Request or API cURL node)
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Check Type</label>
            <select
              value={data.apiWaitConfig?.checkType || 'status'}
              onChange={(e) => onChange('apiWaitConfig', {
                ...data.apiWaitConfig,
                checkType: e.target.value,
              })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
            >
              <option value="status">Status Code</option>
              <option value="header">Header Value</option>
              <option value="body-path">Body Path (JSON)</option>
              <option value="body-value">Body Value</option>
            </select>
          </div>
          {(data.apiWaitConfig?.checkType === 'header' || data.apiWaitConfig?.checkType === 'body-path') && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                {data.apiWaitConfig?.checkType === 'header' ? 'Header Name' : 'JSON Path'}
              </label>
              <input
                type="text"
                value={data.apiWaitConfig?.path || ''}
                onChange={(e) => onChange('apiWaitConfig', {
                  ...data.apiWaitConfig,
                  path: e.target.value,
                })}
                placeholder={data.apiWaitConfig?.checkType === 'header' ? 'content-type' : 'body.customer.id'}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
              />
              <div className="mt-1 text-xs text-gray-400">
                {data.apiWaitConfig?.checkType === 'header' 
                  ? 'Name of the header to check'
                  : 'Dot-notation path to check in response body (e.g., body.customer.id)'}
              </div>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Expected Value</label>
            <input
              type="text"
              value={data.apiWaitConfig?.expectedValue !== undefined ? String(data.apiWaitConfig.expectedValue) : ''}
              onChange={(e) => {
                // Try to parse as number if it looks like a number
                let value: any = e.target.value;
                if (/^\d+$/.test(value)) {
                  value = parseInt(value, 10);
                } else if (/^\d+\.\d+$/.test(value)) {
                  value = parseFloat(value);
                }
                onChange('apiWaitConfig', {
                  ...data.apiWaitConfig,
                  expectedValue: value,
                });
              }}
              placeholder={data.apiWaitConfig?.checkType === 'status' ? '200' : 'Expected value'}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Match Type</label>
            <select
              value={data.apiWaitConfig?.matchType || 'equals'}
              onChange={(e) => onChange('apiWaitConfig', {
                ...data.apiWaitConfig,
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
      ) : (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">JavaScript Condition</label>
            <textarea
              value={typeof getPropertyValue('value', '') === 'string' ? getPropertyValue('value', '') : ''}
              onChange={(e) => onChange('value', e.target.value)}
              placeholder="() => document.querySelector('.loaded') !== null"
              rows={3}
              disabled={isPropertyDisabled('value')}
              className={getInputClassName('value', 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm font-mono text-xs')}
            />
            {isPropertyDisabled('value') && (
              <div className="mt-1 text-xs text-gray-500 italic">
                This property is converted to input. Connect a node to provide the value.
              </div>
            )}
            <div className="mt-1 text-xs text-gray-400">
              JavaScript expression that returns a truthy value when condition is met. Executed in page context.
            </div>
          </div>
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
        </>
      )}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Pause</label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={data.pause || false}
            onChange={(e) => onChange('pause', e.target.checked)}
            className="rounded"
          />
          <span className="text-sm text-gray-400">
            Pause execution at this wait node
          </span>
        </label>
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

      <RetryConfigSection data={data} onChange={onChange} />
    </div>
  );
}

