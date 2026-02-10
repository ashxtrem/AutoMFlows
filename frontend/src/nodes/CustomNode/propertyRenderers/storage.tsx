import { InlineTextInput, InlineSelect } from '../../../components/InlinePropertyEditor';
import { PropertyRenderer } from './types';

export const renderStorageProperties: PropertyRenderer = ({ renderData, handlePropertyChange, handleOpenPopup, renderPropertyRow }) => {
  const storageAction = renderData.action || 'getCookie';
  
  return (
    <div className="mt-2 space-y-1">
      {renderPropertyRow('action', (
        <InlineSelect
          label="Action"
          value={storageAction}
          onChange={(value) => handlePropertyChange('action', value)}
          options={[
            { label: 'Get Cookie', value: 'getCookie' },
            { label: 'Set Cookie', value: 'setCookie' },
            { label: 'Clear Cookies', value: 'clearCookies' },
            { label: 'Get Local Storage', value: 'getLocalStorage' },
            { label: 'Set Local Storage', value: 'setLocalStorage' },
            { label: 'Clear Local Storage', value: 'clearLocalStorage' },
            { label: 'Get Session Storage', value: 'getSessionStorage' },
            { label: 'Set Session Storage', value: 'setSessionStorage' },
            { label: 'Clear Session Storage', value: 'clearSessionStorage' },
          ]}
        />
      ), 0)}
      {renderPropertyRow('contextKey', (
        <InlineTextInput
          label="Context Key"
          value={renderData.contextKey || 'storageResult'}
          onChange={(value) => handlePropertyChange('contextKey', value)}
          placeholder="storageResult"
          onOpenPopup={handleOpenPopup}
        />
      ), 1)}
    </div>
  );
};
