import { Node } from 'reactflow';
import RetryConfigSection from '../RetryConfigSection';
import { usePropertyInput } from '../../hooks/usePropertyInput';

interface ApiCurlConfigProps {
  node: Node;
  onChange: (field: string, value: any) => void;
}

export default function ApiCurlConfig({ node, onChange }: ApiCurlConfigProps) {
  const data = node.data;
  const { getPropertyValue, isPropertyDisabled, getInputClassName } = usePropertyInput(node);

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          cURL Command
          <span className="ml-2 text-xs text-gray-400">(supports ${'{data.key.path}'})</span>
        </label>
        <textarea
          value={getPropertyValue('curlCommand', '')}
          onChange={(e) => onChange('curlCommand', e.target.value)}
          placeholder={`curl -X POST https://api.example.com/users -H "Content-Type: application/json" -d '{"name": "John"}'`}
          rows={8}
          disabled={isPropertyDisabled('curlCommand')}
          className={getInputClassName('curlCommand', 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm font-mono whitespace-pre-wrap break-words')}
          style={{ wordBreak: 'break-all' }}
        />
        {isPropertyDisabled('curlCommand') && (
          <div className="mt-1 text-xs text-gray-500 italic">
            This property is converted to input. Connect a node to provide the value.
          </div>
        )}
        <div className="mt-1 text-xs text-gray-400">
          Supports variable interpolation: ${'{data.key.path}'} or ${'{variables.key.path}'}
        </div>
        <div className="mt-2 space-y-2">
          <div className="p-3 bg-gray-800 rounded text-xs text-gray-400">
            <div className="font-semibold mb-1">Example (JSON):</div>
            <div className="font-mono whitespace-pre-wrap">
{`curl -X POST https://api.example.com/users/${'{data.api1.body.userId}'} \\
  -H "Authorization: Bearer ${'{data.auth.token}'}" \\
  -H "Content-Type: application/json" \\
  -d '{"name": "${'{data.user.name}'}"}'`}
            </div>
          </div>
          <div className="p-3 bg-gray-800 rounded text-xs text-gray-400">
            <div className="font-semibold mb-1">Example (multipart/form-data with file upload):</div>
            <div className="font-mono whitespace-pre-wrap">
{`curl --location 'https://api.example.com/upload' \\
  --header 'Accept: multipart/form-data' \\
  --form 'name="John"' \\
  --form 'file=@"/path/to/file.csv"' \\
  --form 'description="${'{data.description}'}"'`}
            </div>
            <div className="mt-2 text-gray-500 italic">
              Note: Use --form or -F flags for multipart/form-data. File paths use @ prefix (e.g., file=@"path/to/file").
            </div>
          </div>
        </div>
      </div>

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
        <div className="mt-1 text-xs text-gray-400">
          Overrides --max-time if specified in cURL command
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
            Fail Silently - Continue execution even if request fails
          </span>
        </label>
      </div>

      <RetryConfigSection data={data} onChange={onChange} />
    </div>
  );
}
