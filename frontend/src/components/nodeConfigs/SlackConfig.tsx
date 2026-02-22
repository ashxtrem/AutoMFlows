import { Node } from 'reactflow';
import { usePropertyInput } from '../../hooks/usePropertyInput';

interface SlackConfigProps {
  node: Node;
  onChange: (field: string, value: any) => void;
}

export default function SlackConfig({ node, onChange }: SlackConfigProps) {
  const data = node.data;
  const { getPropertyValue, isPropertyDisabled, getInputClassName } = usePropertyInput(node);

  return (
    <div className="space-y-4">
      <div className="text-xs text-gray-400 bg-gray-800 p-2 rounded">
        Send messages to Slack via Incoming Webhooks. All fields support variable interpolation: ${'{data.key.path}'}.
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Webhook URL</label>
        <input
          type="text"
          value={getPropertyValue('webhookUrl', '')}
          onChange={(e) => onChange('webhookUrl', e.target.value)}
          placeholder="https://hooks.slack.com/services/T.../B.../..."
          disabled={isPropertyDisabled('webhookUrl')}
          className={getInputClassName('webhookUrl', 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm')}
        />
        <div className="mt-1 text-xs text-gray-400">
          Create an Incoming Webhook in your Slack workspace settings
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Message</label>
        <textarea
          value={data.message || ''}
          onChange={(e) => onChange('message', e.target.value)}
          placeholder="Hello from AutoMFlows! Workflow completed successfully."
          rows={4}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
        />
        <div className="mt-1 text-xs text-gray-400">
          Supports Slack mrkdwn formatting: *bold*, _italic_, ~strikethrough~, `code`
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Channel (optional)</label>
        <input
          type="text"
          value={getPropertyValue('channel', '')}
          onChange={(e) => onChange('channel', e.target.value)}
          placeholder="#general"
          disabled={isPropertyDisabled('channel')}
          className={getInputClassName('channel', 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm')}
        />
        <div className="mt-1 text-xs text-gray-400">
          Override the webhook's default channel
        </div>
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-300 mb-1">Username (optional)</label>
          <input
            type="text"
            value={getPropertyValue('username', '')}
            onChange={(e) => onChange('username', e.target.value)}
            placeholder="AutoMFlows Bot"
            disabled={isPropertyDisabled('username')}
            className={getInputClassName('username', 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm')}
          />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-300 mb-1">Icon Emoji (optional)</label>
          <input
            type="text"
            value={getPropertyValue('iconEmoji', '')}
            onChange={(e) => onChange('iconEmoji', e.target.value)}
            placeholder=":robot_face:"
            disabled={isPropertyDisabled('iconEmoji')}
            className={getInputClassName('iconEmoji', 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm')}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Blocks JSON (optional)</label>
        <textarea
          value={data.blocks || ''}
          onChange={(e) => onChange('blocks', e.target.value)}
          placeholder={'[\n  {\n    "type": "section",\n    "text": {\n      "type": "mrkdwn",\n      "text": "Hello!"\n    }\n  }\n]'}
          rows={6}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm font-mono"
        />
        <div className="mt-1 text-xs text-gray-400">
          Slack Block Kit JSON array for rich message formatting
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

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Context Key</label>
        <input
          type="text"
          value={getPropertyValue('contextKey', 'slackResult')}
          onChange={(e) => onChange('contextKey', e.target.value)}
          placeholder="slackResult"
          disabled={isPropertyDisabled('contextKey')}
          className={getInputClassName('contextKey', 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm')}
        />
        <div className="mt-1 text-xs text-gray-400">
          Stores the Slack API response in context
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
            Fail Silently - Continue execution even if Slack message fails
          </span>
        </label>
      </div>
    </div>
  );
}
