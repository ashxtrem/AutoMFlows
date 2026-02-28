import { InlineTextInput } from '../../../components/InlinePropertyEditor';
import { PropertyRenderer } from './types';

export const renderDataExtractorProperties: PropertyRenderer = ({ renderData, handlePropertyChange, handleOpenPopup, renderPropertyRow }) => {
  const fields = Array.isArray(renderData.fields) ? renderData.fields : [];
  const fieldCount = fields.length;

  return (
    <div className="mt-2 space-y-1">
      {renderPropertyRow('containerSelector', (
        <InlineTextInput
          label="Container"
          value={renderData.containerSelector || ''}
          onChange={(value) => handlePropertyChange('containerSelector', value)}
          placeholder=".product-card"
          field="containerSelector"
          onOpenPopup={handleOpenPopup}
        />
      ), 0)}
      {renderPropertyRow('outputVariable', (
        <InlineTextInput
          label="Output"
          value={renderData.outputVariable || 'extractedData'}
          onChange={(value) => handlePropertyChange('outputVariable', value)}
          placeholder="extractedData"
          field="outputVariable"
          onOpenPopup={handleOpenPopup}
        />
      ), 1)}
      {renderPropertyRow('fields', (
        <div className="text-xs text-gray-400 px-1">
          {fieldCount} field{fieldCount !== 1 ? 's' : ''} configured
        </div>
      ), 2)}
      {renderData.saveToCSV && renderData.csvFilePath && (
        <div className="text-xs text-green-400 px-1 truncate" title={renderData.csvFilePath}>
          CSV: {renderData.csvFilePath}
        </div>
      )}
    </div>
  );
};
