import { InlineTextInput, InlineNumberInput, InlineSelect } from '../../../components/InlinePropertyEditor';
import { getSelectorPlaceholder, SELECTOR_TYPE_OPTIONS } from '../../../utils/selectorHelpers';
import { PropertyRenderer } from './types';

export const renderFormInputProperties: PropertyRenderer = ({ renderData, handlePropertyChange, handleOpenPopup, renderPropertyRow }) => {
  const formInputAction = renderData.action || 'select';
  
  return (
    <div className="mt-2 space-y-1">
      {renderPropertyRow('action', (
        <InlineSelect
          label="Action"
          value={formInputAction}
          onChange={(value) => {
            handlePropertyChange('action', value);
            // Clear action-specific properties when action changes
            if (value !== 'select') {
              handlePropertyChange('values', undefined);
              handlePropertyChange('selectBy', undefined);
              handlePropertyChange('multiple', undefined);
            }
            if (value !== 'check' && value !== 'uncheck') {
              handlePropertyChange('force', undefined);
            }
            if (value !== 'upload') {
              handlePropertyChange('filePaths', undefined);
              handlePropertyChange('multiple', undefined);
            }
          }}
          options={[
            { label: 'Select', value: 'select' },
            { label: 'Check', value: 'check' },
            { label: 'Uncheck', value: 'uncheck' },
            { label: 'Upload', value: 'upload' },
          ]}
        />
      ), 0)}
      {renderPropertyRow('selectorType', (
        <InlineSelect
          label="Selector Type"
          value={renderData.selectorType || 'css'}
          onChange={(value) => handlePropertyChange('selectorType', value)}
          options={SELECTOR_TYPE_OPTIONS.map(opt => ({ label: opt.label, value: opt.value }))}
        />
      ), 1)}
      {renderPropertyRow('selector', (
        <InlineTextInput
          label="Selector"
          value={renderData.selector || ''}
          onChange={(value) => handlePropertyChange('selector', value)}
          placeholder={getSelectorPlaceholder(renderData.selectorType || 'css')}
          onOpenPopup={handleOpenPopup}
        />
      ), 2)}
      {formInputAction === 'select' && renderPropertyRow('values', (
        <InlineTextInput
          label="Values"
          value={Array.isArray(renderData.values) ? renderData.values.join(', ') : (renderData.values || '')}
          onChange={(value) => {
            // Handle comma-separated or single value
            const values = value.includes(',') ? value.split(',').map((v: string) => v.trim()) : value;
            handlePropertyChange('values', values);
          }}
          placeholder="option1, option2"
          onOpenPopup={handleOpenPopup}
        />
      ), 3)}
      {formInputAction === 'upload' && renderPropertyRow('filePaths', (
        <InlineTextInput
          label="File Paths"
          value={Array.isArray(renderData.filePaths) ? renderData.filePaths.join(', ') : (renderData.filePaths || '')}
          onChange={(value) => {
            // Handle comma-separated or single value
            const paths = value.includes(',') ? value.split(',').map((p: string) => p.trim()) : value;
            handlePropertyChange('filePaths', paths);
          }}
          placeholder="/path/to/file.txt"
          onOpenPopup={handleOpenPopup}
        />
      ), 3)}
      {renderPropertyRow('timeout', (
        <InlineNumberInput
          label="Timeout"
          value={renderData.timeout || 30000}
          onChange={(value) => handlePropertyChange('timeout', value)}
          placeholder="30000"
          onOpenPopup={handleOpenPopup}
        />
      ), 4)}
    </div>
  );
};
