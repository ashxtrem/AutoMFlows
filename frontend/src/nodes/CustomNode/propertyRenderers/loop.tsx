import { InlineTextInput, InlineSelect } from '../../../components/InlinePropertyEditor';
import { PropertyRenderer } from './types';
import { SwitchCondition } from '@automflows/shared';

export const renderLoopProperties: PropertyRenderer = ({ renderData, handlePropertyChange, handleOpenPopup, renderPropertyRow }) => {
  const mode = renderData.mode || 'forEach';
  const condition: SwitchCondition | undefined = renderData.condition;

  const getConditionSummary = (cond: SwitchCondition): string => {
    switch (cond.type) {
      case 'javascript':
        return cond.javascriptExpression ? `JS: ${cond.javascriptExpression.substring(0, 30)}...` : 'JS condition';
      case 'ui-element':
        return cond.selector ? `UI: ${cond.selector}` : 'UI element';
      case 'api-status':
        return cond.statusCode ? `API: ${cond.statusCode}` : 'API status';
      case 'api-json-path':
        return cond.jsonPath ? `JSON: ${cond.jsonPath}` : 'API JSON path';
      case 'variable':
        return cond.variableName ? `Var: ${cond.variableName}` : 'Variable';
      default:
        return 'Condition';
    }
  };

  return (
    <div className="mt-2 space-y-1">
      {renderPropertyRow('mode', (
        <InlineSelect
          label="Mode"
          value={mode}
          onChange={(value) => {
            const newMode = value as 'forEach' | 'doWhile';
            handlePropertyChange('mode', newMode);
            // Clear mode-specific fields when switching modes
            if (newMode === 'forEach') {
              handlePropertyChange('condition', undefined);
              handlePropertyChange('updateStep', undefined);
              handlePropertyChange('maxIterations', undefined);
            } else {
              handlePropertyChange('arrayVariable', undefined);
            }
          }}
          options={[
            { label: 'For Each', value: 'forEach' },
            { label: 'Do While', value: 'doWhile' },
          ]}
        />
      ), 0)}
      {mode === 'forEach' && (
        renderPropertyRow('arrayVariable', (
          <InlineTextInput
            label="Array Var"
            value={renderData.arrayVariable || ''}
            onChange={(value) => handlePropertyChange('arrayVariable', value)}
            placeholder="items (variable name)"
            onOpenPopup={handleOpenPopup}
          />
        ), 1)
      )}
      {mode === 'doWhile' && condition && (
        <>
          <div className="text-xs text-gray-400">
            Condition: <span className="text-gray-300">{getConditionSummary(condition)}</span>
          </div>
          {renderData.maxIterations && (
            <div className="text-xs text-gray-400">
              Max: <span className="text-gray-300">{renderData.maxIterations}</span>
            </div>
          )}
          {renderData.updateStep && (
            <div className="text-xs text-gray-400 italic">
              Has update step
            </div>
          )}
        </>
      )}
    </div>
  );
};
