import { InlineTextInput, InlineNumberInput, InlineSelect } from '../../../components/InlinePropertyEditor';
import { PropertyRenderer } from './types';

export const renderWebhookProperties: PropertyRenderer = ({ renderData, handlePropertyChange, handleOpenPopup, renderPropertyRow }) => {
  return (
    <div className="mt-2 space-y-1">
      {renderPropertyRow('method', (
        <InlineSelect
          label="Method"
          value={renderData.method || 'POST'}
          onChange={(value) => handlePropertyChange('method', value)}
          options={[
            { label: 'POST', value: 'POST' },
            { label: 'PUT', value: 'PUT' },
            { label: 'PATCH', value: 'PATCH' },
            { label: 'GET', value: 'GET' },
            { label: 'DELETE', value: 'DELETE' },
          ]}
        />
      ), 0)}
      {renderPropertyRow('url', (
        <InlineTextInput
          label="URL"
          value={renderData.url || ''}
          onChange={(value) => handlePropertyChange('url', value)}
          placeholder="https://example.com/webhook"
          field="url"
          onOpenPopup={handleOpenPopup}
        />
      ), 1)}
      {renderPropertyRow('bodyType', (
        <InlineSelect
          label="Body Type"
          value={renderData.bodyType || 'json'}
          onChange={(value) => handlePropertyChange('bodyType', value)}
          options={[
            { label: 'JSON', value: 'json' },
            { label: 'Form Data', value: 'form-data' },
            { label: 'Raw', value: 'raw' },
          ]}
        />
      ), 2)}
      {renderPropertyRow('contextKey', (
        <InlineTextInput
          label="Context Key"
          value={renderData.contextKey || 'webhookResult'}
          onChange={(value) => handlePropertyChange('contextKey', value)}
          placeholder="webhookResult"
          field="contextKey"
          onOpenPopup={handleOpenPopup}
        />
      ), 3)}
      {renderPropertyRow('timeout', (
        <InlineNumberInput
          label="Timeout"
          value={renderData.timeout || 30000}
          onChange={(value) => handlePropertyChange('timeout', value)}
          placeholder="30000"
          field="timeout"
          onOpenPopup={handleOpenPopup}
        />
      ), 4)}
    </div>
  );
};
