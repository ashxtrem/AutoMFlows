import { InlineTextInput } from '../../../components/InlinePropertyEditor';
import { PropertyRenderer } from './types';

export const renderLoopProperties: PropertyRenderer = ({ renderData, handlePropertyChange, handleOpenPopup, renderPropertyRow }) => {
  return (
    <div className="mt-2 space-y-1">
      {renderPropertyRow('arrayVariable', (
        <InlineTextInput
          label="Array Var"
          value={renderData.arrayVariable || ''}
          onChange={(value) => handlePropertyChange('arrayVariable', value)}
          placeholder="items (variable name)"
          onOpenPopup={handleOpenPopup}
        />
      ), 0)}
    </div>
  );
};
