import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Node } from 'reactflow';
import { usePropertyInput } from '../../hooks/usePropertyInput';
import PropertyEditorPopup from '../PropertyEditorPopup';
import { SwitchCondition } from '@automflows/shared';

interface LoopConfigProps {
  node: Node;
  onChange: (field: string, value: any) => void;
}

const CONDITION_TYPES = [
  { value: 'ui-element', label: 'UI Element' },
  { value: 'api-status', label: 'API Status' },
  { value: 'api-json-path', label: 'API JSON Path' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'variable', label: 'Variable' },
];

const ELEMENT_CHECKS = [
  { value: 'visible', label: 'Visible' },
  { value: 'hidden', label: 'Hidden' },
  { value: 'exists', label: 'Exists' },
];

const API_MATCH_TYPES = [
  { value: 'equals', label: 'Equals' },
  { value: 'contains', label: 'Contains' },
  { value: 'startsWith', label: 'Starts With' },
  { value: 'endsWith', label: 'Ends With' },
  { value: 'regex', label: 'Regex' },
];

const COMPARISON_OPERATORS = [
  { value: 'equals', label: 'Equals (=)' },
  { value: 'greaterThan', label: 'Greater Than (>)' },
  { value: 'lessThan', label: 'Less Than (<)' },
  { value: 'greaterThanOrEqual', label: 'Greater Than or Equal (>=)' },
  { value: 'lessThanOrEqual', label: 'Less Than or Equal (<=)' },
];

export default function LoopConfig({ node, onChange }: LoopConfigProps) {
  const data = node.data;
  const { getPropertyValue, isPropertyDisabled, getInputClassName } = usePropertyInput(node);
  const [showPopup, setShowPopup] = useState(false);
  const mode = data.mode || 'forEach';

  const handleOpenPopup = () => {
    setShowPopup(true);
  };

  const handlePopupChange = (value: any) => {
    onChange('arrayVariable', value);
  };

  const updateCondition = (updates: Partial<SwitchCondition>) => {
    const currentCondition = data.condition || { type: 'javascript' };
    onChange('condition', { ...currentCondition, ...updates });
  };

  const renderConditionConfig = () => {
    const condition: SwitchCondition = data.condition || { type: 'javascript' };

    switch (condition.type) {
      case 'ui-element':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Selector</label>
              <input
                type="text"
                value={condition.selector || ''}
                onChange={(e) => updateCondition({ selector: e.target.value })}
                placeholder="#button or //button[@id='button']"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Selector Type</label>
              <select
                value={condition.selectorType || 'css'}
                onChange={(e) => updateCondition({ selectorType: e.target.value as 'css' | 'xpath' })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
              >
                <option value="css">CSS</option>
                <option value="xpath">XPath</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Element Check</label>
              <select
                value={condition.elementCheck || 'visible'}
                onChange={(e) => updateCondition({ elementCheck: e.target.value as 'visible' | 'hidden' | 'exists' })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
              >
                {ELEMENT_CHECKS.map((ec) => (
                  <option key={ec.value} value={ec.value}>
                    {ec.label}
                  </option>
                ))}
              </select>
            </div>
            {condition.timeout !== undefined && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Timeout (ms)</label>
                <input
                  type="number"
                  value={condition.timeout || 30000}
                  onChange={(e) => updateCondition({ timeout: parseInt(e.target.value) || 30000 })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                />
              </div>
            )}
          </>
        );

      case 'api-status':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">API Context Key</label>
              <input
                type="text"
                value={condition.apiContextKey || 'apiResponse'}
                onChange={(e) => updateCondition({ apiContextKey: e.target.value })}
                placeholder="apiResponse"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Status Code</label>
              <input
                type="number"
                value={condition.statusCode || ''}
                onChange={(e) => updateCondition({ statusCode: parseInt(e.target.value) || undefined })}
                placeholder="200"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
              />
            </div>
          </>
        );

      case 'api-json-path':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">API Context Key</label>
              <input
                type="text"
                value={condition.apiContextKey || 'apiResponse'}
                onChange={(e) => updateCondition({ apiContextKey: e.target.value })}
                placeholder="apiResponse"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">JSON Path</label>
              <input
                type="text"
                value={condition.jsonPath || ''}
                onChange={(e) => updateCondition({ jsonPath: e.target.value })}
                placeholder="data.user.id"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Expected Value</label>
              <input
                type="text"
                value={condition.expectedValue !== undefined ? String(condition.expectedValue) : ''}
                onChange={(e) => {
                  const value = e.target.value;
                  const numValue = parseFloat(value);
                  updateCondition({ expectedValue: isNaN(numValue) ? value : numValue });
                }}
                placeholder="123"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Match Type</label>
              <select
                value={condition.matchType || 'equals'}
                onChange={(e) => updateCondition({ matchType: e.target.value as any })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
              >
                {API_MATCH_TYPES.map((mt) => (
                  <option key={mt.value} value={mt.value}>
                    {mt.label}
                  </option>
                ))}
              </select>
            </div>
          </>
        );

      case 'javascript':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">JavaScript Expression</label>
            <textarea
              value={condition.javascriptExpression || ''}
              onChange={(e) => updateCondition({ javascriptExpression: e.target.value })}
              placeholder="context.getVariable('counter') < 10"
              rows={3}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm font-mono"
            />
            <div className="mt-1 text-xs text-gray-400">
              Expression should evaluate to true/false. Loop continues while condition is true.
            </div>
          </div>
        );

      case 'variable':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Variable Name</label>
              <input
                type="text"
                value={condition.variableName || ''}
                onChange={(e) => updateCondition({ variableName: e.target.value })}
                placeholder="myVariable"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Comparison Operator</label>
              <select
                value={condition.comparisonOperator || 'equals'}
                onChange={(e) => updateCondition({ comparisonOperator: e.target.value as any })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
              >
                {COMPARISON_OPERATORS.map((op) => (
                  <option key={op.value} value={op.value}>
                    {op.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Comparison Value</label>
              <input
                type="text"
                value={condition.comparisonValue !== undefined ? String(condition.comparisonValue) : ''}
                onChange={(e) => {
                  const value = e.target.value;
                  const numValue = parseFloat(value);
                  updateCondition({ comparisonValue: isNaN(numValue) ? value : numValue });
                }}
                placeholder="100"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
              />
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Loop Mode</label>
          <select
            value={mode}
            onChange={(e) => {
              const newMode = e.target.value as 'forEach' | 'doWhile';
              onChange('mode', newMode);
              // Clear mode-specific fields when switching modes
              if (newMode === 'forEach') {
                onChange('condition', undefined);
                onChange('updateStep', undefined);
                onChange('maxIterations', undefined);
              } else {
                onChange('arrayVariable', undefined);
              }
            }}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm"
          >
            <option value="forEach">For Each (Array Iterator)</option>
            <option value="doWhile">Do While (Condition Based)</option>
          </select>
          <p className="mt-1 text-xs text-gray-400">
            {mode === 'forEach'
              ? 'Iterate over each item in an array'
              : 'Repeat while a condition is true'}
          </p>
        </div>

        {mode === 'forEach' && (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Array Variable Name</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={getPropertyValue('arrayVariable', '')}
                onChange={(e) => onChange('arrayVariable', e.target.value)}
                placeholder="items (variable name from previous node output)"
                disabled={isPropertyDisabled('arrayVariable')}
                className={getInputClassName('arrayVariable', 'flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm')}
              />
              {!isPropertyDisabled('arrayVariable') && (
                <button
                  type="button"
                  onClick={handleOpenPopup}
                  className="px-3 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded text-sm transition-colors"
                  title="Open in popup editor"
                >
                  ⋯
                </button>
              )}
            </div>
            {isPropertyDisabled('arrayVariable') && (
              <div className="mt-1 text-xs text-gray-500 italic">
                This property is converted to input. Connect a node to provide the value.
              </div>
            )}
            <p className="mt-1 text-xs text-gray-400">
              Name of the variable containing the array to iterate over (from a previous node's output).
              Exposed variables: <code className="text-gray-300">item</code> (current array element), <code className="text-gray-300">index</code> (0-based index).
            </p>
          </div>
        )}

        {mode === 'doWhile' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Condition Type</label>
              <select
                value={data.condition?.type || 'javascript'}
                onChange={(e) => updateCondition({ type: e.target.value as any })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
              >
                {CONDITION_TYPES.map((ct) => (
                  <option key={ct.value} value={ct.value}>
                    {ct.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-400">
                Loop continues while condition evaluates to true
              </p>
            </div>

            <div className="space-y-3">
              {renderConditionConfig()}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Update Step (Optional)</label>
              <textarea
                value={data.updateStep || ''}
                onChange={(e) => onChange('updateStep', e.target.value)}
                placeholder="context.setVariable('counter', context.getVariable('counter') + 1);"
                rows={3}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm font-mono"
              />
              <p className="mt-1 text-xs text-gray-400">
                Optional JavaScript code to execute at the end of each iteration (e.g., increment a counter).
                Exposed variables: <code className="text-gray-300">item</code> (can be set by child nodes), <code className="text-gray-300">index</code> (iteration count).
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Max Iterations</label>
              <input
                type="number"
                value={data.maxIterations || 1000}
                onChange={(e) => onChange('maxIterations', parseInt(e.target.value) || 1000)}
                min={1}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm"
              />
              <p className="mt-1 text-xs text-gray-400">
                Safety limit to prevent infinite loops (default: 1000)
              </p>
            </div>
          </>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Fail Silently</label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={data.failSilently || false}
              onChange={(e) => onChange('failSilently', e.target.checked)}
              className="rounded"
            />
            <span className="text-sm text-gray-400">
              Continue execution even if this node fails
            </span>
          </label>
        </div>
      </div>
      {showPopup && typeof document !== 'undefined' && createPortal(
        <PropertyEditorPopup
          label="Array Variable Name"
          value={getPropertyValue('arrayVariable', '')}
          type="text"
          onChange={handlePopupChange}
          onClose={() => setShowPopup(false)}
          placeholder="items (variable name from previous node output)"
        />,
        document.body
      )}
    </>
  );
}

