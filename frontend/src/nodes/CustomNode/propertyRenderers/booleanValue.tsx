import { InlineSelect } from '../../../components/InlinePropertyEditor';
import { PropertyRenderer } from './types';

export const renderBooleanValueProperties: PropertyRenderer = ({ renderData, handlePropertyChange }) => {
  return (
    <div className="mt-2 space-y-1">
      <InlineSelect
        label="Value"
        value={String(renderData.value ?? false)}
        onChange={(value) => handlePropertyChange('value', value === 'true')}
        options={[
          { label: 'True', value: 'true' },
          { label: 'False', value: 'false' },
        ]}
      />
    </div>
  );
};
