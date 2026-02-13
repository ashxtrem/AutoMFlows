import { InlineTextInput } from '../../../components/InlinePropertyEditor';
import { PropertyRenderer } from './types';

export const renderStringValueProperties: PropertyRenderer = ({ renderData, handlePropertyChange, handleOpenPopup }) => {
  return (
    <div className="mt-2 space-y-1">
      <InlineTextInput
        label="Value"
        value={renderData.value ?? ''}
        onChange={(value) => handlePropertyChange('value', value)}
        placeholder="Enter string value"
        field="value"
        onOpenPopup={handleOpenPopup}
      />
    </div>
  );
};
