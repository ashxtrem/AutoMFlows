import { PropertyDataType } from '@automflows/shared';
import { InlineTextInput, InlineNumberInput, InlineSelect } from '../../../components/InlinePropertyEditor';
import { PropertyRenderer } from './types';

export const renderInputValueProperties: PropertyRenderer = ({ renderData, handlePropertyChange, handleOpenPopup }) => {
  const inputDataType = renderData.dataType || PropertyDataType.STRING;
  const inputValue = renderData.value ?? (inputDataType === PropertyDataType.BOOLEAN ? false : inputDataType === PropertyDataType.INT ? 0 : '');
  
  return (
    <div className="mt-2 space-y-1">
      <InlineSelect
        label="Data Type"
        value={inputDataType}
        onChange={(value) => {
          const newDataType = value as PropertyDataType;
          // Reset value when type changes
          let newValue: string | number | boolean;
          if (newDataType === PropertyDataType.BOOLEAN) {
            newValue = false;
          } else if (newDataType === PropertyDataType.INT || newDataType === PropertyDataType.FLOAT || newDataType === PropertyDataType.DOUBLE) {
            newValue = 0;
          } else {
            newValue = '';
          }
          handlePropertyChange('dataType', newDataType);
          handlePropertyChange('value', newValue);
        }}
        options={[
          { label: 'String', value: PropertyDataType.STRING },
          { label: 'Int', value: PropertyDataType.INT },
          { label: 'Float', value: PropertyDataType.FLOAT },
          { label: 'Double', value: PropertyDataType.DOUBLE },
          { label: 'Boolean', value: PropertyDataType.BOOLEAN },
        ]}
      />
      <InlineTextInput
        label="Variable Name (optional)"
        value={renderData.variableName ?? ''}
        onChange={(value) => handlePropertyChange('variableName', value)}
        placeholder="Leave empty to use node ID"
        field="variableName"
        onOpenPopup={handleOpenPopup}
      />
      {inputDataType === PropertyDataType.STRING && (
        <InlineTextInput
          label="Value"
          value={String(inputValue)}
          onChange={(value) => handlePropertyChange('value', value)}
          placeholder="Enter string value"
          field="value"
          onOpenPopup={handleOpenPopup}
        />
      )}
      {(inputDataType === PropertyDataType.INT || inputDataType === PropertyDataType.FLOAT || inputDataType === PropertyDataType.DOUBLE) && (
        <InlineNumberInput
          label="Value"
          value={typeof inputValue === 'number' ? inputValue : parseFloat(String(inputValue)) || 0}
          onChange={(value) => handlePropertyChange('value', value)}
          placeholder="0"
          field="value"
          onOpenPopup={handleOpenPopup}
        />
      )}
      {inputDataType === PropertyDataType.BOOLEAN && (
        <InlineSelect
          label="Value"
          value={inputValue ? '1' : '0'}
          onChange={(value) => handlePropertyChange('value', value === '1')}
          options={[
            { label: '0', value: '0' },
            { label: '1', value: '1' },
          ]}
        />
      )}
    </div>
  );
};
