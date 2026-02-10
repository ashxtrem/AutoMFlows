import { InlineNumberInput, InlineSelect } from '../../../components/InlinePropertyEditor';
import { PropertyRenderer } from './types';

export const renderIframeProperties: PropertyRenderer = ({ renderData, handlePropertyChange, handleOpenPopup, renderPropertyRow }) => {
  const iframeAction = renderData.action || 'switchToIframe';
  
  return (
    <div className="mt-2 space-y-1">
      {renderPropertyRow('action', (
        <InlineSelect
          label="Action"
          value={iframeAction}
          onChange={(value) => handlePropertyChange('action', value)}
          options={[
            { label: 'Switch To', value: 'switchToIframe' },
            { label: 'Switch Back', value: 'switchToMainFrame' },
            { label: 'Get Content', value: 'getIframeContent' },
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
