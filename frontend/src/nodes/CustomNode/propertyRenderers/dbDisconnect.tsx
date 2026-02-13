import { InlineTextInput } from '../../../components/InlinePropertyEditor';
import { PropertyRenderer } from './types';

export const renderDbDisconnectProperties: PropertyRenderer = ({ renderData, handlePropertyChange, handleOpenPopup, renderPropertyRow }) => {
  return (
    <div className="mt-2 space-y-1">
      {renderPropertyRow('connectionKey', (
        <InlineTextInput
          label="Connection Key"
          value={renderData.connectionKey || 'dbConnection'}
          onChange={(value) => handlePropertyChange('connectionKey', value)}
          placeholder="dbConnection"
          onOpenPopup={handleOpenPopup}
        />
      ), 0)}
    </div>
  );
};
