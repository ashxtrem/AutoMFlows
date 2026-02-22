import { InlineTextInput, InlineNumberInput, InlineSelect } from '../../../components/InlinePropertyEditor';
import { PropertyRenderer } from './types';

export const renderEmailProperties: PropertyRenderer = ({ renderData, handlePropertyChange, handleOpenPopup, renderPropertyRow }) => {
  return (
    <div className="mt-2 space-y-1">
      {renderPropertyRow('to', (
        <InlineTextInput
          label="To"
          value={renderData.to || ''}
          onChange={(value) => handlePropertyChange('to', value)}
          placeholder="recipient@example.com"
          field="to"
          onOpenPopup={handleOpenPopup}
        />
      ), 0)}
      {renderPropertyRow('subject', (
        <InlineTextInput
          label="Subject"
          value={renderData.subject || ''}
          onChange={(value) => handlePropertyChange('subject', value)}
          placeholder="Email subject"
          field="subject"
          onOpenPopup={handleOpenPopup}
        />
      ), 1)}
      {renderPropertyRow('bodyType', (
        <InlineSelect
          label="Body Type"
          value={renderData.bodyType || 'text'}
          onChange={(value) => handlePropertyChange('bodyType', value)}
          options={[
            { label: 'Plain Text', value: 'text' },
            { label: 'HTML', value: 'html' },
          ]}
        />
      ), 2)}
      {renderPropertyRow('smtpHost', (
        <InlineTextInput
          label="SMTP Host"
          value={renderData.smtpHost || ''}
          onChange={(value) => handlePropertyChange('smtpHost', value)}
          placeholder="smtp.gmail.com"
          field="smtpHost"
          onOpenPopup={handleOpenPopup}
        />
      ), 3)}
      {renderPropertyRow('smtpPort', (
        <InlineNumberInput
          label="SMTP Port"
          value={renderData.smtpPort || 587}
          onChange={(value) => handlePropertyChange('smtpPort', value)}
          placeholder="587"
          field="smtpPort"
          onOpenPopup={handleOpenPopup}
        />
      ), 4)}
      {renderPropertyRow('contextKey', (
        <InlineTextInput
          label="Context Key"
          value={renderData.contextKey || 'emailResult'}
          onChange={(value) => handlePropertyChange('contextKey', value)}
          placeholder="emailResult"
          field="contextKey"
          onOpenPopup={handleOpenPopup}
        />
      ), 5)}
    </div>
  );
};
