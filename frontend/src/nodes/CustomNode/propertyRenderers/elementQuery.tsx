import { InlineTextInput, InlineNumberInput, InlineSelect } from '../../../components/InlinePropertyEditor';
import { getSelectorPlaceholder, SELECTOR_TYPE_OPTIONS } from '../../../utils/selectorHelpers';
import { PropertyRenderer } from './types';

export const renderElementQueryProperties: PropertyRenderer = ({ renderData, handlePropertyChange, handleOpenPopup, renderPropertyRow }) => {
  const elementQueryAction = renderData.action || 'getText';
  const getDefaultOutputVar = (actionType: string): string => {
    switch (actionType) {
      case 'getText':
      case 'getAllText':
        return 'text';
      case 'getAttribute':
        return 'attribute';
      case 'getCount':
        return 'count';
      case 'isVisible':
        return 'isVisible';
      case 'isEnabled':
        return 'isEnabled';
      case 'isChecked':
        return 'isChecked';
      case 'getBoundingBox':
        return 'boundingBox';
      default:
        return 'result';
    }
  };
  
  return (
    <div className="mt-2 space-y-1">
      {renderPropertyRow('action', (
        <InlineSelect
          label="Action"
          value={elementQueryAction}
          onChange={(value) => {
            handlePropertyChange('action', value);
            // Clear action-specific properties when action changes
            if (value !== 'getAttribute') {
              handlePropertyChange('attributeName', undefined);
            }
            // Set default output variable
            handlePropertyChange('outputVariable', getDefaultOutputVar(value));
          }}
          options={[
            { label: 'Get Text', value: 'getText' },
            { label: 'Get Attribute', value: 'getAttribute' },
            { label: 'Get Count', value: 'getCount' },
            { label: 'Is Visible', value: 'isVisible' },
            { label: 'Is Enabled', value: 'isEnabled' },
            { label: 'Is Checked', value: 'isChecked' },
            { label: 'Get Bounding Box', value: 'getBoundingBox' },
            { label: 'Get All Text', value: 'getAllText' },
          ]}
        />
      ), 0)}
      {renderPropertyRow('selectorType', (
        <InlineSelect
          label="Selector Type"
          value={renderData.selectorType || 'css'}
          onChange={(value) => handlePropertyChange('selectorType', value)}
          options={SELECTOR_TYPE_OPTIONS.map(opt => ({ label: opt.label, value: opt.value }))}
        />
      ), 1)}
      {renderPropertyRow('selector', (
        <InlineTextInput
          label="Selector"
          value={renderData.selector || ''}
          onChange={(value) => handlePropertyChange('selector', value)}
          placeholder={getSelectorPlaceholder(renderData.selectorType || 'css')}
          field="selector"
          onOpenPopup={handleOpenPopup}
        />
      ), 2)}
      {elementQueryAction === 'getAttribute' && renderPropertyRow('attributeName', (
        <InlineTextInput
          label="Attribute Name"
          value={renderData.attributeName || ''}
          onChange={(value) => handlePropertyChange('attributeName', value)}
          placeholder="id, class, href, etc."
          field="attributeName"
          onOpenPopup={handleOpenPopup}
        />
      ), 3)}
      {renderPropertyRow('outputVariable', (
        <InlineTextInput
          label="Output Variable"
          value={renderData.outputVariable || getDefaultOutputVar(elementQueryAction)}
          onChange={(value) => handlePropertyChange('outputVariable', value)}
          placeholder={getDefaultOutputVar(elementQueryAction)}
          field="outputVariable"
          onOpenPopup={handleOpenPopup}
        />
      ), 4)}
      {renderPropertyRow('timeout', (
        <InlineNumberInput
          label="Timeout"
          value={renderData.timeout || 30000}
          onChange={(value) => handlePropertyChange('timeout', value)}
          placeholder="30000"
          field="timeout"
          onOpenPopup={handleOpenPopup}
        />
      ), 5)}
    </div>
  );
};
