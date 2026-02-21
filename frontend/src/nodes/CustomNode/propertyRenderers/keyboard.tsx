import { InlineTextInput, InlineNumberInput, InlineSelect, InlineTextarea } from '../../../components/InlinePropertyEditor';
import { PropertyRenderer } from './types';

export const renderKeyboardProperties: PropertyRenderer = ({ renderData, handlePropertyChange, handleOpenPopup, renderPropertyRow }) => {
  const keyboardAction = renderData.action || 'press';
  
  return (
    <div className="mt-2 space-y-1">
      {renderPropertyRow('action', (
        <InlineSelect
          label="Action"
          value={keyboardAction}
          onChange={(value) => {
            handlePropertyChange('action', value);
            if (value !== 'press' && value !== 'down' && value !== 'up') {
              handlePropertyChange('key', undefined);
            }
            if (value !== 'type' && value !== 'insertText') {
              handlePropertyChange('text', undefined);
            }
            if (value !== 'shortcut') {
              handlePropertyChange('shortcut', undefined);
            }
          }}
          options={[
            { label: 'Press', value: 'press' },
            { label: 'Type', value: 'type' },
            { label: 'Insert Text', value: 'insertText' },
            { label: 'Shortcut', value: 'shortcut' },
            { label: 'Hold Down', value: 'down' },
            { label: 'Release', value: 'up' },
          ]}
        />
      ), 0)}
      {(keyboardAction === 'press' || keyboardAction === 'down' || keyboardAction === 'up') && renderPropertyRow('key', (
        <InlineTextInput
          label="Key"
          value={renderData.key || ''}
          onChange={(value) => handlePropertyChange('key', value)}
          placeholder="Enter, Tab"
          field="key"
          onOpenPopup={handleOpenPopup}
        />
      ), 1)}
      {(keyboardAction === 'type' || keyboardAction === 'insertText') && renderPropertyRow('text', (
        <InlineTextarea
          label="Text"
          value={renderData.text || ''}
          onChange={(value) => handlePropertyChange('text', value)}
          placeholder="Text to type"
          field="text"
          onOpenPopup={handleOpenPopup}
        />
      ), 1)}
      {keyboardAction === 'shortcut' && renderPropertyRow('shortcut', (
        <InlineTextInput
          label="Shortcut"
          value={renderData.shortcut || ''}
          onChange={(value) => handlePropertyChange('shortcut', value)}
          placeholder="Control+C"
          field="shortcut"
          onOpenPopup={handleOpenPopup}
        />
      ), 1)}
      {renderPropertyRow('timeout', (
        <InlineNumberInput
          label="Timeout"
          value={renderData.timeout || 30000}
          onChange={(value) => handlePropertyChange('timeout', value)}
          placeholder="30000"
          field="timeout"
          onOpenPopup={handleOpenPopup}
        />
      ), 2)}
    </div>
  );
};
