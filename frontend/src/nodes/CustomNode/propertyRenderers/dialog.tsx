import { InlineNumberInput, InlineSelect } from '../../../components/InlinePropertyEditor';
import { PropertyRenderer } from './types';

export const renderDialogProperties: PropertyRenderer = ({ renderData, handlePropertyChange, handleOpenPopup, renderPropertyRow }) => {
  const dialogAction = renderData.action || 'accept';
  
  return (
    <div className="mt-2 space-y-1">
      {renderPropertyRow('action', (
        <InlineSelect
          label="Action"
          value={dialogAction}
          onChange={(value) => handlePropertyChange('action', value)}
          options={[
            { label: 'Accept', value: 'accept' },
            { label: 'Dismiss', value: 'dismiss' },
            { label: 'Prompt', value: 'prompt' },
            { label: 'Wait', value: 'waitForDialog' },
          ]}
        />
      ), 0)}
      {renderPropertyRow('timeout', (
        <InlineNumberInput
          label="Timeout"
          value={renderData.timeout || 30000}
          onChange={(value) => handlePropertyChange('timeout', value)}
          placeholder="30000"
          onOpenPopup={handleOpenPopup}
        />
      ), 1)}
    </div>
  );
};
