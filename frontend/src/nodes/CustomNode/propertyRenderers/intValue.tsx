import { InlineNumberInput } from '../../../components/InlinePropertyEditor';
import { PropertyRenderer } from './types';

export const renderIntValueProperties: PropertyRenderer = ({ renderData, handlePropertyChange, handleOpenPopup }) => {
  return (
    <div className="mt-2 space-y-1">
      <InlineNumberInput
        label="Value"
        value={renderData.value ?? 0}
        onChange={(value) => handlePropertyChange('value', value)}
        placeholder="0"
        field="value"
        onOpenPopup={handleOpenPopup}
      />
    </div>
  );
};
