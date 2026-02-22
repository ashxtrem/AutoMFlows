import { Node } from 'reactflow';
import { useState } from 'react';
import { usePropertyInput } from '../../hooks/usePropertyInput';

interface WebhookConfigProps {
  node: Node;
  onChange: (field: string, value: any) => void;
}

export default function WebhookConfig({ node, onChange }: WebhookConfigProps) {
  const data = node.data;
  const { getPropertyValue, isPropertyDisabled, getInputClassName } = usePropertyInput(node);
  const [headers, setHeaders] = useState<Array<{ key: string; value: string }>>(() => {
    if (data.headers && typeof data.headers === 'object') {
      return Object.entries(data.headers).map(([key, value]) => ({
        key,
        value: String(value),
      }));
    }
    return [{ key: '', value: '' }];
  });

  const updateHeaders = (newHeaders: Array<{ key: string; value: string }>) => {
    setHeaders(newHeaders);
    const headersObj: Record<string, string> = {};
    newHeaders.forEach(({ key, value }) => {
      if (key.trim()) {
        headersObj[key.trim()] = value;
      }
    });
    onChange('headers', Object.keys(headersObj).length > 0 ? headersObj : undefined);
  };

  const addHeader = () => {
    updateHeaders([...headers, { key: '', value: '' }]);
  };

  const removeHeader = (index: number) => {
    const newHeaders = headers.filter((_, i) => i !== index);
    updateHeaders(newHeaders.length > 0 ? newHeaders : [{ key: '', value: '' }]);
  };

  const updateHeader = (index: number, field: 'key' | 'value', value: string) => {
    const newHeaders = [...headers];
    newHeaders[index] = { ...newHeaders[index], [field]: value };
    updateHeaders(newHeaders);
  };

  return (
    <div className="space-y-4">
      <div className="text-xs text-gray-400 bg-gray-800 p-2 rounded">
        Send HTTP requests to external webhook endpoints. All fields support variable interpolation: ${'{data.key.path}'}.
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">HTTP Method</label>
        <select
          value={getPropertyValue('method', 'POST')}
          onChange={(e) => onChange('method', e.target.value)}
          disabled={isPropertyDisabled('method')}
          className={getInputClassName('method', 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm')}
        >
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
          <option value="PATCH">PATCH</option>
          <option value="GET">GET</option>
          <option value="DELETE">DELETE</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">URL</label>
        <input
          type="text"
          value={getPropertyValue('url', '')}
          onChange={(e) => onChange('url', e.target.value)}
          placeholder="https://example.com/webhook"
          disabled={isPropertyDisabled('url')}
          className={getInputClassName('url', 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm')}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Headers</label>
        <div className="space-y-2">
          {headers.map((header, index) => (
            <div key={index} className="flex gap-2">
              <input
                type="text"
                value={header.key}
                onChange={(e) => updateHeader(index, 'key', e.target.value)}
                placeholder="Header name"
                className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
              />
              <input
                type="text"
                value={header.value}
                onChange={(e) => updateHeader(index, 'value', e.target.value)}
                placeholder="Header value"
                className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
              />
              <button
                type="button"
                onClick={() => removeHeader(index)}
                className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addHeader}
            className="w-full px-3 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded text-sm"
          >
            Add Header
          </button>
        </div>
      </div>

      {['POST', 'PUT', 'PATCH'].includes(data.method || 'POST') && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Body Type</label>
            <select
              value={data.bodyType || 'json'}
              onChange={(e) => onChange('bodyType', e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
            >
              <option value="json">JSON</option>
              <option value="form-data">Form Data</option>
              <option value="raw">Raw</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Request Body</label>
            <textarea
              value={data.body || ''}
              onChange={(e) => onChange('body', e.target.value)}
              placeholder={data.bodyType === 'json' ? '{"event": "workflow_complete", "status": "success"}' : 'key=value'}
              rows={6}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm font-mono"
            />
          </div>
        </>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Context Key</label>
        <input
          type="text"
          value={getPropertyValue('contextKey', 'webhookResult')}
          onChange={(e) => onChange('contextKey', e.target.value)}
          placeholder="webhookResult"
          disabled={isPropertyDisabled('contextKey')}
          className={getInputClassName('contextKey', 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm')}
        />
        <div className="mt-1 text-xs text-gray-400">
          Stores webhook response (status, headers, body) in context
        </div>
      </div>

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

      <div className="border-t border-gray-700 pt-3">
        <h4 className="text-sm font-medium text-gray-300 mb-3">Retry Configuration</h4>
        <div className="space-y-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={data.retryEnabled || false}
              onChange={(e) => onChange('retryEnabled', e.target.checked)}
              className="rounded"
            />
            <span className="text-sm text-gray-400">Enable Retry</span>
          </label>

          {data.retryEnabled && (
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-300 mb-1">Retry Count</label>
                <input
                  type="number"
                  value={data.retryCount || 3}
                  onChange={(e) => onChange('retryCount', parseInt(e.target.value, 10) || 3)}
                  min={1}
                  max={10}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-300 mb-1">Retry Delay (ms)</label>
                <input
                  type="number"
                  value={data.retryDelay || 1000}
                  onChange={(e) => onChange('retryDelay', parseInt(e.target.value, 10) || 1000)}
                  min={100}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                />
              </div>
            </div>
          )}
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
          <span className="text-sm text-gray-400">
            Fail Silently - Continue execution even if webhook fails
          </span>
        </label>
      </div>
    </div>
  );
}
