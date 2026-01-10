import { Node } from 'reactflow';
import RetryConfigSection from '../RetryConfigSection';

interface ApiCurlConfigProps {
  node: Node;
  onChange: (field: string, value: any) => void;
}

export default function ApiCurlConfig({ node, onChange }: ApiCurlConfigProps) {
  const data = node.data;

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          cURL Command
          <span className="ml-2 text-xs text-gray-400">(supports ${'{data.key.path}'})</span>
        </label>
        <textarea
          value={data.curlCommand || ''}
          onChange={(e) => onChange('curlCommand', e.target.value)}
          placeholder={`curl -X POST https://api.example.com/users -H "Content-Type: application/json" -d '{"name": "John"}'`}
          rows={8}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm font-mono"
        />
        <div className="mt-1 text-xs text-gray-400">
          Supports variable interpolation: ${'{data.key.path}'} or ${'{variables.key.path}'}
        </div>
        <div className="mt-2 p-3 bg-gray-800 rounded text-xs text-gray-400">
          <div className="font-semibold mb-1">Example:</div>
          <div className="font-mono whitespace-pre-wrap">
{`curl -X POST https://api.example.com/users/${'{data.api1.body.userId}'} \\
  -H "Authorization: Bearer ${'{data.auth.token}'}" \\
  -H "Content-Type: application/json" \\
  -d '{"name": "${'{data.user.name}'}"}'`}
          </div>
        </div>
      </div>

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
