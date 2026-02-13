import { InlineTextInput, InlineNumberInput, InlineTextarea } from '../../../components/InlinePropertyEditor';
import { PropertyRenderer } from './types';

export const renderApiCurlProperties: PropertyRenderer = ({ renderData, handlePropertyChange, handleOpenPopup, renderPropertyRow }) => {
  return (
    <div className="mt-2 space-y-1">
      {renderPropertyRow('curlCommand', (
        <InlineTextarea
          label="cURL Command"
          value={renderData.curlCommand || ''}
          onChange={(value) => handlePropertyChange('curlCommand', value)}
          placeholder="curl -X POST https://api.example.com/users"
          onOpenPopup={handleOpenPopup}
        />
      ), 0)}
      {renderPropertyRow('contextKey', (
        <InlineTextInput
          label="Context Key"
          value={renderData.contextKey || 'apiResponse'}
          onChange={(value) => handlePropertyChange('contextKey', value)}
          placeholder="apiResponse"
          onOpenPopup={handleOpenPopup}
        />
      ), 1)}
      {renderPropertyRow('timeout', (
        <InlineNumberInput
          label="Timeout"
          value={renderData.timeout || 30000}
          onChange={(value) => handlePropertyChange('timeout', value)}
          placeholder="30000"
          onOpenPopup={handleOpenPopup}
        />
      ), 2)}
    </div>
  );
};
