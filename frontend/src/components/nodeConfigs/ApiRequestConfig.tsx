import { Node } from 'reactflow';
import { useState } from 'react';
import RetryConfigSection from '../RetryConfigSection';

interface ApiRequestConfigProps {
  node: Node;
  onChange: (field: string, value: any) => void;
}

export default function ApiRequestConfig({ node, onChange }: ApiRequestConfigProps) {
  const data = node.data;
  const [showAdvanced, setShowAdvanced] = useState(false);
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
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">HTTP Method</label>
        <select
          value={data.method || 'GET'}
          onChange={(e) => onChange('method', e.target.value)}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
        >
          <option value="GET">GET</option>
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
          <option value="DELETE">DELETE</option>
          <option value="PATCH">PATCH</option>
          <option value="HEAD">HEAD</option>
          <option value="OPTIONS">OPTIONS</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          URL
          <span className="ml-2 text-xs text-gray-400">(supports ${'{data.key.path}'})</span>
        </label>
        <input
          type="text"
          value={data.url || ''}
          onChange={(e) => onChange('url', e.target.value)}
          placeholder="https://api.example.com/users/${data.api1.body.userId}"
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
        />
        <div className="mt-1 text-xs text-gray-400">
          Supports variable interpolation: ${'{data.key.path}'} or ${'{variables.key.path}'}
        </div>
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
        <div className="mt-1 text-xs text-gray-400">
          Header values support variable interpolation: ${'{data.key.path}'}
        </div>
      </div>

      {['POST', 'PUT', 'PATCH'].includes(data.method || 'GET') && (
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
              <option value="url-encoded">URL Encoded</option>
              <option value="raw">Raw</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Request Body
              <span className="ml-2 text-xs text-gray-400">(supports ${'{data.key.path}'})</span>
            </label>
            <textarea
              value={data.body || ''}
              onChange={(e) => onChange('body', e.target.value)}
              placeholder={data.bodyType === 'json' ? '{"key": "value"}' : 'key=value&key2=value2'}
              rows={6}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm font-mono"
            />
            <div className="mt-1 text-xs text-gray-400">
              Supports variable interpolation: ${'{data.key.path}'} or ${'{variables.key.path}'}
            </div>
          </div>
        </>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Context Key</label>
        <input
          type="text"
          value={data.contextKey || 'apiResponse'}
          onChange={(e) => onChange('contextKey', e.target.value)}
          placeholder="apiResponse"
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
        />
        <div className="mt-1 text-xs text-gray-400">
          Key to store API response in context (accessible via ${'{data.'}contextKey{'}'})
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Timeout (ms)</label>
        <input
          type="number"
          value={data.timeout || 30000}
          onChange={(e) => onChange('timeout', parseInt(e.target.value, 10) || 30000)}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
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
          <span className="text-sm text-gray-400">
            Fail Silently - Continue execution even if request fails
          </span>
        </label>
      </div>

      <RetryConfigSection data={data} onChange={onChange} />
    </div>
  );
}
