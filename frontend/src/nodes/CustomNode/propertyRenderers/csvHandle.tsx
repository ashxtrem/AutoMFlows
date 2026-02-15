import { InlineTextInput, InlineSelect } from '../../../components/InlinePropertyEditor';
import { PropertyRenderer } from './types';

export const renderCsvHandleProperties: PropertyRenderer = ({ renderData, handlePropertyChange, handleOpenPopup, renderPropertyRow }) => {
  const action = renderData.action || 'write';

  return (
    <div className="mt-2 space-y-1">
      {renderPropertyRow('action', (
        <InlineSelect
          label="Action"
          value={action}
          onChange={(value) => handlePropertyChange('action', value)}
          options={[
            { label: 'Write', value: 'write' },
            { label: 'Append', value: 'append' },
            { label: 'Read', value: 'read' },
          ]}
        />
      ), 0)}
      {renderPropertyRow('filePath', (
        <InlineTextInput
          label="File path"
          value={renderData.filePath || ''}
          onChange={(value) => handlePropertyChange('filePath', value)}
          placeholder={action === 'read' ? 'path/to/file.csv' : '${data.outputDirectory}/out.csv'}
          onOpenPopup={handleOpenPopup}
        />
      ), 1)}
      {(action === 'write' || action === 'append') && renderPropertyRow('dataSource', (
        <InlineTextInput
          label="Data source"
          value={renderData.dataSource || ''}
          onChange={(value) => handlePropertyChange('dataSource', value)}
          placeholder="products"
          onOpenPopup={handleOpenPopup}
        />
      ), 2)}
      {action === 'read' && renderPropertyRow('contextKey', (
        <InlineTextInput
          label="Context key"
          value={renderData.contextKey || 'csvData'}
          onChange={(value) => handlePropertyChange('contextKey', value)}
          placeholder="csvData"
          onOpenPopup={handleOpenPopup}
        />
      ), 2)}
    </div>
  );
};
