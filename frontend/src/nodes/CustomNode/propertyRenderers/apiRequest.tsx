import { InlineTextInput, InlineNumberInput, InlineSelect } from '../../../components/InlinePropertyEditor';
import { PropertyRenderer } from './types';

export const renderApiRequestProperties: PropertyRenderer = ({ renderData, handlePropertyChange, handleOpenPopup, renderPropertyRow }) => {
  return (
    <div className="mt-2 space-y-1">
      {renderPropertyRow('method', (
        <InlineSelect
          label="Method"
          value={renderData.method || 'GET'}
          onChange={(value) => handlePropertyChange('method', value)}
          options={[
            { label: 'GET', value: 'GET' },
            { label: 'POST', value: 'POST' },
            { label: 'PUT', value: 'PUT' },
            { label: 'DELETE', value: 'DELETE' },
            { label: 'PATCH', value: 'PATCH' },
            { label: 'HEAD', value: 'HEAD' },
            { label: 'OPTIONS', value: 'OPTIONS' },
          ]}
        />
      ), 0)}
      {renderPropertyRow('url', (
        <InlineTextInput
          label="URL"
          value={renderData.url || ''}
          onChange={(value) => handlePropertyChange('url', value)}
          placeholder="https://api.example.com/users"
          field="url"
          onOpenPopup={handleOpenPopup}
        />
      ), 1)}
      {renderPropertyRow('contextKey', (
        <InlineTextInput
          label="Context Key"
          value={renderData.contextKey || 'apiResponse'}
          onChange={(value) => handlePropertyChange('contextKey', value)}
          placeholder="apiResponse"
          field="contextKey"
          onOpenPopup={handleOpenPopup}
        />
      ), 2)}
      {renderPropertyRow('timeout', (
        <InlineNumberInput
          label="Timeout"
          value={renderData.timeout || 30000}
          onChange={(value) => handlePropertyChange('timeout', value)}
          placeholder="30000"
          field="timeout"
          onOpenPopup={handleOpenPopup}
        />
      ), 3)}
    </div>
  );
};
