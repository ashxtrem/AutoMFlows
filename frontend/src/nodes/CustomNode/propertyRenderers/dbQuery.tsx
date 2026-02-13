import { InlineTextInput, InlineNumberInput, InlineSelect, InlineTextarea } from '../../../components/InlinePropertyEditor';
import { PropertyRenderer } from './types';

export const renderDbQueryProperties: PropertyRenderer = ({ renderData, handlePropertyChange, handleOpenPopup, renderPropertyRow }) => {
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
      {renderPropertyRow('queryType', (
        <InlineSelect
          label="Query Type"
          value={renderData.queryType || 'sql'}
          onChange={(value) => handlePropertyChange('queryType', value)}
          options={[
            { label: 'SQL', value: 'sql' },
            { label: 'MongoDB', value: 'mongodb' },
            { label: 'Raw', value: 'raw' },
          ]}
        />
      ), 1)}
      {renderData.queryKey ? (
        renderPropertyRow('queryKey', (
          <InlineTextInput
            label="Query Key"
            value={renderData.queryKey || ''}
            onChange={(value) => handlePropertyChange('queryKey', value)}
            placeholder="queryFromContext"
            onOpenPopup={handleOpenPopup}
          />
        ), 2)
      ) : (
        renderPropertyRow('query', (
          <InlineTextarea
            label="Query"
            value={typeof renderData.query === 'string' ? renderData.query : JSON.stringify(renderData.query || '')}
            onChange={(value) => handlePropertyChange('query', value)}
            placeholder="SELECT * FROM users"
            onOpenPopup={handleOpenPopup}
          />
        ), 2)
      )}
      {renderPropertyRow('contextKey', (
        <InlineTextInput
          label="Context Key"
          value={renderData.contextKey || 'dbResult'}
          onChange={(value) => handlePropertyChange('contextKey', value)}
          placeholder="dbResult"
          onOpenPopup={handleOpenPopup}
        />
      ), 3)}
      {renderPropertyRow('timeout', (
        <InlineNumberInput
          label="Timeout"
          value={renderData.timeout || 30000}
          onChange={(value) => handlePropertyChange('timeout', value)}
          placeholder="30000"
          onOpenPopup={handleOpenPopup}
        />
      ), 4)}
    </div>
  );
};
