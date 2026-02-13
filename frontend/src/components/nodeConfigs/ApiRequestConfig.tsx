import { Node } from 'reactflow';
import { useState, useRef } from 'react';
import RetryConfigSection from '../RetryConfigSection';
import { usePropertyInput } from '../../hooks/usePropertyInput';

interface ApiRequestConfigProps {
  node: Node;
  onChange: (field: string, value: any) => void;
}

export default function ApiRequestConfig({ node, onChange }: ApiRequestConfigProps) {
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
  
  const [formFields, setFormFields] = useState<Array<{ key: string; value: string; type: 'text' }>>(() => {
    return data.formFields || [];
  });
  
  const [formFiles, setFormFiles] = useState<Array<{ key: string; filePath: string }>>(() => {
    return data.formFiles || [];
  });
  
  const fileInputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});

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

  const updateFormFields = (newFields: Array<{ key: string; value: string; type: 'text' }>) => {
    setFormFields(newFields);
    onChange('formFields', newFields.length > 0 ? newFields : undefined);
    // Clear body if formFields are being used
    if (newFields.length > 0 && data.bodyType === 'form-data') {
      onChange('body', undefined);
    }
  };

  const updateFormFiles = (newFiles: Array<{ key: string; filePath: string }>) => {
    setFormFiles(newFiles);
    onChange('formFiles', newFiles.length > 0 ? newFiles : undefined);
    // Clear body if formFiles are being used
    if (newFiles.length > 0 && data.bodyType === 'form-data') {
      onChange('body', undefined);
    }
  };

  const addFormField = () => {
    updateFormFields([...formFields, { key: '', value: '', type: 'text' }]);
  };

  const removeFormField = (index: number) => {
    const newFields = formFields.filter((_, i) => i !== index);
    updateFormFields(newFields.length > 0 ? newFields : []);
  };

  const updateFormField = (index: number, field: 'key' | 'value' | 'type', value: string) => {
    const newFields = [...formFields];
    newFields[index] = { ...newFields[index], [field]: value };
    updateFormFields(newFields);
  };

  const addFormFile = () => {
    updateFormFiles([...formFiles, { key: '', filePath: '' }]);
  };

  const removeFormFile = (index: number) => {
    const newFiles = formFiles.filter((_, i) => i !== index);
    updateFormFiles(newFiles.length > 0 ? newFiles : []);
  };

  const updateFormFile = (index: number, field: 'key' | 'filePath', value: string) => {
    const newFiles = [...formFiles];
    newFiles[index] = { ...newFiles[index], [field]: value };
    updateFormFiles(newFiles);
  };

  const handleFileSelect = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Store file name as path (will be resolved server-side)
      updateFormFile(index, 'filePath', file.name);
    }
  };

  const handleSelectFile = (index: number) => {
    fileInputRefs.current[index]?.click();
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">HTTP Method</label>
        <select
          value={getPropertyValue('method', 'GET')}
          onChange={(e) => onChange('method', e.target.value)}
          disabled={isPropertyDisabled('method')}
          className={getInputClassName('method', 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm')}
        >
          <option value="GET">GET</option>
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
          <option value="DELETE">DELETE</option>
          <option value="PATCH">PATCH</option>
          <option value="HEAD">HEAD</option>
          <option value="OPTIONS">OPTIONS</option>
        </select>
        {isPropertyDisabled('method') && (
          <div className="mt-1 text-xs text-gray-500 italic">
            This property is converted to input. Connect a node to provide the value.
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          URL
          <span className="ml-2 text-xs text-gray-400">(supports ${'{data.key.path}'})</span>
        </label>
        <input
          type="text"
          value={getPropertyValue('url', '')}
          onChange={(e) => onChange('url', e.target.value)}
          placeholder="https://api.example.com/users/${data.api1.body.userId}"
          disabled={isPropertyDisabled('url')}
          className={getInputClassName('url', 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm')}
        />
        {isPropertyDisabled('url') && (
          <div className="mt-1 text-xs text-gray-500 italic">
            This property is converted to input. Connect a node to provide the value.
          </div>
        )}
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
              onChange={(e) => {
                onChange('bodyType', e.target.value);
                // Clear formFields/formFiles when switching away from form-data
                if (e.target.value !== 'form-data') {
                  onChange('formFields', undefined);
                  onChange('formFiles', undefined);
                  setFormFields([]);
                  setFormFiles([]);
                }
              }}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
            >
              <option value="json">JSON</option>
              <option value="form-data">Form Data (multipart/form-data)</option>
              <option value="url-encoded">URL Encoded</option>
              <option value="raw">Raw</option>
            </select>
          </div>

          {data.bodyType === 'form-data' ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Form Fields
                  <span className="ml-2 text-xs text-gray-400">(multipart/form-data)</span>
                </label>
                <div className="space-y-2">
                  {formFields.map((field, index) => (
                    <div key={`field-${index}`} className="flex gap-2 items-start">
                      <input
                        type="text"
                        value={field.key}
                        onChange={(e) => updateFormField(index, 'key', e.target.value)}
                        placeholder="Field name"
                        className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                      />
                      <input
                        type="text"
                        value={field.value}
                        onChange={(e) => updateFormField(index, 'value', e.target.value)}
                        placeholder="Field value (supports ${'{data.key.path}'})"
                        className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => removeFormField(index)}
                        className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addFormField}
                    className="w-full px-3 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded text-sm"
                  >
                    Add Text Field
                  </button>
                </div>
                <div className="mt-1 text-xs text-gray-400">
                  Text field values support variable interpolation: ${'{data.key.path}'}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  File Fields
                  <span className="ml-2 text-xs text-gray-400">(file uploads)</span>
                </label>
                <div className="space-y-2">
                  {formFiles.map((fileField, index) => (
                    <div key={`file-${index}`} className="flex gap-2 items-start">
                      <input
                        type="text"
                        value={fileField.key}
                        onChange={(e) => updateFormFile(index, 'key', e.target.value)}
                        placeholder="Field name (e.g., 'file')"
                        className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                      />
                      <input
                        type="text"
                        value={fileField.filePath}
                        onChange={(e) => updateFormFile(index, 'filePath', e.target.value)}
                        placeholder="File path (supports ${'{data.key.path}'})"
                        className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                      />
                      <input
                        ref={(el) => {
                          fileInputRefs.current[index] = el;
                        }}
                        type="file"
                        onChange={(e) => handleFileSelect(index, e)}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => handleSelectFile(index)}
                        className="px-3 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded text-sm whitespace-nowrap"
                      >
                        Browse
                      </button>
                      <button
                        type="button"
                        onClick={() => removeFormFile(index)}
                        className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addFormFile}
                    className="w-full px-3 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded text-sm"
                  >
                    Add File Field
                  </button>
                </div>
                <div className="mt-1 text-xs text-gray-400">
                  File paths support variable interpolation: ${'{data.key.path}'}. Files are read server-side during execution.
                </div>
              </div>

              {(formFields.length === 0 && formFiles.length === 0) && (
                <div className="p-3 bg-gray-800 rounded text-xs text-gray-400">
                  <div className="font-semibold mb-1">No form fields configured</div>
                  <div>Add text fields or file fields above to create multipart/form-data request.</div>
                </div>
              )}
            </>
          ) : (
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
          )}
        </>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Context Key</label>
        <input
          type="text"
          value={getPropertyValue('contextKey', 'apiResponse')}
          onChange={(e) => onChange('contextKey', e.target.value)}
          placeholder="apiResponse"
          disabled={isPropertyDisabled('contextKey')}
          className={getInputClassName('contextKey', 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm')}
        />
        {isPropertyDisabled('contextKey') && (
          <div className="mt-1 text-xs text-gray-500 italic">
            This property is converted to input. Connect a node to provide the value.
          </div>
        )}
        <div className="mt-1 text-xs text-gray-400">
          Key to store API response in context (accessible via ${'{data.'}contextKey{'}'})
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
          <span className="text-sm text-gray-400">
            Fail Silently - Continue execution even if request fails
          </span>
        </label>
      </div>

      <RetryConfigSection data={data} onChange={onChange} />
    </div>
  );
}
