import { InlineNumberInput, InlineSelect } from '../../../components/InlinePropertyEditor';
import { PropertyRenderer } from './types';

export const renderDownloadProperties: PropertyRenderer = ({ renderData, handlePropertyChange, handleOpenPopup, renderPropertyRow }) => {
  const downloadAction = renderData.action || 'waitForDownload';
  
  return (
    <div className="mt-2 space-y-1">
      {renderPropertyRow('action', (
        <InlineSelect
          label="Action"
          value={downloadAction}
          onChange={(value) => handlePropertyChange('action', value)}
          options={[
            { label: 'Wait', value: 'waitForDownload' },
            { label: 'Save', value: 'saveDownload' },
            { label: 'Get Path', value: 'getDownloadPath' },
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
