import { InlineTextInput } from '../../../components/InlinePropertyEditor';
import { PropertyRenderer } from './types';

export const renderSlackProperties: PropertyRenderer = ({ renderData, handlePropertyChange, handleOpenPopup, renderPropertyRow }) => {
  return (
    <div className="mt-2 space-y-1">
      {renderPropertyRow('webhookUrl', (
        <InlineTextInput
          label="Webhook URL"
          value={renderData.webhookUrl || ''}
          onChange={(value) => handlePropertyChange('webhookUrl', value)}
          placeholder="https://hooks.slack.com/services/..."
          field="webhookUrl"
          onOpenPopup={handleOpenPopup}
        />
      ), 0)}
      {renderPropertyRow('message', (
        <InlineTextInput
          label="Message"
          value={renderData.message || ''}
          onChange={(value) => handlePropertyChange('message', value)}
          placeholder="Hello from AutoMFlows!"
          field="message"
          onOpenPopup={handleOpenPopup}
        />
      ), 1)}
      {renderPropertyRow('channel', (
        <InlineTextInput
          label="Channel"
          value={renderData.channel || ''}
          onChange={(value) => handlePropertyChange('channel', value)}
          placeholder="#general"
          field="channel"
          onOpenPopup={handleOpenPopup}
        />
      ), 2)}
      {renderPropertyRow('contextKey', (
        <InlineTextInput
          label="Context Key"
          value={renderData.contextKey || 'slackResult'}
          onChange={(value) => handlePropertyChange('contextKey', value)}
          placeholder="slackResult"
          field="contextKey"
          onOpenPopup={handleOpenPopup}
        />
      ), 3)}
    </div>
  );
};
