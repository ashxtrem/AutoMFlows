import { InlineTextInput, InlineSelect } from '../../../components/InlinePropertyEditor';
import { PropertyRenderer } from './types';

const MODE_OPTIONS = [
  { label: 'All Links', value: 'allLinks' },
  { label: 'All Images', value: 'allImages' },
  { label: 'Table Data', value: 'tables' },
  { label: 'Repeated Items', value: 'repeatedItems' },
];

export const renderSmartExtractorProperties: PropertyRenderer = ({ renderData, handlePropertyChange, handleOpenPopup, renderPropertyRow }) => {
  const mode = renderData.mode || 'allLinks';

  return (
    <div className="mt-2 space-y-1">
      {renderPropertyRow('mode', (
        <InlineSelect
          label="Mode"
          value={mode}
          onChange={(value) => handlePropertyChange('mode', value)}
          options={MODE_OPTIONS}
        />
      ), 0)}
      {renderPropertyRow('outputVariable', (
        <InlineTextInput
          label="Output"
          value={renderData.outputVariable || 'extractedData'}
          onChange={(value) => handlePropertyChange('outputVariable', value)}
          placeholder="extractedData"
          field="outputVariable"
          onOpenPopup={handleOpenPopup}
        />
      ), 1)}
    </div>
  );
};
