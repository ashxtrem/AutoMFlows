import { Node } from 'reactflow';
import { usePropertyInput } from '../../hooks/usePropertyInput';

interface EmailConfigProps {
  node: Node;
  onChange: (field: string, value: any) => void;
}

export default function EmailConfig({ node, onChange }: EmailConfigProps) {
  const data = node.data;
  const { getPropertyValue, isPropertyDisabled, getInputClassName } = usePropertyInput(node);

  return (
    <div className="space-y-4">
      <div className="text-xs text-gray-400 bg-gray-800 p-2 rounded">
        Send emails via SMTP. All fields support variable interpolation: ${'{data.key.path}'}.
      </div>

      <div className="border-b border-gray-700 pb-2">
        <h4 className="text-sm font-medium text-gray-300 mb-3">SMTP Configuration</h4>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">SMTP Host</label>
            <input
              type="text"
              value={getPropertyValue('smtpHost', '')}
              onChange={(e) => onChange('smtpHost', e.target.value)}
              placeholder="smtp.gmail.com"
              disabled={isPropertyDisabled('smtpHost')}
              className={getInputClassName('smtpHost', 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm')}
            />
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-300 mb-1">SMTP Port</label>
              <input
                type="number"
                value={getPropertyValue('smtpPort', 587)}
                onChange={(e) => onChange('smtpPort', parseInt(e.target.value, 10) || 587)}
                disabled={isPropertyDisabled('smtpPort')}
                className={getInputClassName('smtpPort', 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm')}
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-300 mb-1">Secure (TLS)</label>
              <select
                value={data.smtpSecure ? 'true' : 'false'}
                onChange={(e) => onChange('smtpSecure', e.target.value === 'true')}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
              >
                <option value="false">No (STARTTLS)</option>
                <option value="true">Yes (TLS)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">SMTP User</label>
            <input
              type="text"
              value={getPropertyValue('smtpUser', '')}
              onChange={(e) => onChange('smtpUser', e.target.value)}
              placeholder="user@gmail.com"
              disabled={isPropertyDisabled('smtpUser')}
              className={getInputClassName('smtpUser', 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">SMTP Password</label>
            <input
              type="password"
              value={getPropertyValue('smtpPass', '')}
              onChange={(e) => onChange('smtpPass', e.target.value)}
              placeholder="App password or SMTP password"
              disabled={isPropertyDisabled('smtpPass')}
              className={getInputClassName('smtpPass', 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm')}
            />
          </div>
        </div>
      </div>

      <div className="border-b border-gray-700 pb-2">
        <h4 className="text-sm font-medium text-gray-300 mb-3">Email Details</h4>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">From</label>
            <input
              type="text"
              value={getPropertyValue('from', '')}
              onChange={(e) => onChange('from', e.target.value)}
              placeholder="sender@example.com"
              disabled={isPropertyDisabled('from')}
              className={getInputClassName('from', 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm')}
            />
            <div className="mt-1 text-xs text-gray-400">Defaults to SMTP User if not set</div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">To</label>
            <input
              type="text"
              value={getPropertyValue('to', '')}
              onChange={(e) => onChange('to', e.target.value)}
              placeholder="recipient@example.com (comma-separated for multiple)"
              disabled={isPropertyDisabled('to')}
              className={getInputClassName('to', 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm')}
            />
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-300 mb-1">CC</label>
              <input
                type="text"
                value={getPropertyValue('cc', '')}
                onChange={(e) => onChange('cc', e.target.value)}
                placeholder="cc@example.com"
                disabled={isPropertyDisabled('cc')}
                className={getInputClassName('cc', 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm')}
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-300 mb-1">BCC</label>
              <input
                type="text"
                value={getPropertyValue('bcc', '')}
                onChange={(e) => onChange('bcc', e.target.value)}
                placeholder="bcc@example.com"
                disabled={isPropertyDisabled('bcc')}
                className={getInputClassName('bcc', 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm')}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Subject</label>
            <input
              type="text"
              value={getPropertyValue('subject', '')}
              onChange={(e) => onChange('subject', e.target.value)}
              placeholder="Email subject line"
              disabled={isPropertyDisabled('subject')}
              className={getInputClassName('subject', 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Body Type</label>
            <select
              value={data.bodyType || 'text'}
              onChange={(e) => onChange('bodyType', e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
            >
              <option value="text">Plain Text</option>
              <option value="html">HTML</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Body</label>
            <textarea
              value={data.body || ''}
              onChange={(e) => onChange('body', e.target.value)}
              placeholder={data.bodyType === 'html' ? '<h1>Hello</h1><p>Message body</p>' : 'Email body text'}
              rows={6}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm font-mono"
            />
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Context Key</label>
        <input
          type="text"
          value={getPropertyValue('contextKey', 'emailResult')}
          onChange={(e) => onChange('contextKey', e.target.value)}
          placeholder="emailResult"
          disabled={isPropertyDisabled('contextKey')}
          className={getInputClassName('contextKey', 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm')}
        />
        <div className="mt-1 text-xs text-gray-400">
          Stores email result (messageId, accepted, rejected) in context
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
            Fail Silently - Continue execution even if email fails
          </span>
        </label>
      </div>
    </div>
  );
}
