import { InlineTextarea } from '../../../components/InlinePropertyEditor';
import { PropertyRenderer } from './types';

export const renderJavascriptCodeProperties: PropertyRenderer = ({ renderData, handlePropertyChange, handleOpenPopup, renderPropertyRow }) => {
  return (
    <div className="mt-2 space-y-1">
      {renderPropertyRow('code', (
        <InlineTextarea
          label="Code"
          value={renderData.code || ''}
          onChange={(value) => handlePropertyChange('code', value)}
          placeholder="// Your code here"
          field="code"
          onOpenPopup={(_type, label, value, onChange, placeholder, min, max, field) => {
            handleOpenPopup('code', label, value, onChange, placeholder, min, max, field);
          }}
        />
      ), 0)}
    </div>
  );
};
