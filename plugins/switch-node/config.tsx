import { Node } from 'reactflow';
import { SwitchCondition, SelectorModifiers } from '@automflows/shared';
import { getSelectorPlaceholder, getSelectorHelpText, SELECTOR_TYPE_OPTIONS } from '../../frontend/src/utils/selectorHelpers';
import SelectorModifiersEditor from '../../frontend/src/components/SelectorModifiersEditor';

interface SwitchConfigProps {
  node: Node;
  onChange: (field: string, value: any) => void;
}

interface SwitchCase {
  id: string;
  label: string;
  condition: SwitchCondition;
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

// Match types for API JSON path (string matching only)
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

export default function SwitchConfig({ node, onChange }: SwitchConfigProps) {
  const data = node.data;
  const cases: SwitchCase[] = data.cases || [];
  const defaultCase = data.defaultCase || { label: 'Default' };

  const updateCases = (newCases: SwitchCase[]) => {
    onChange('cases', newCases);
  };

  const updateCase = (index: number, updates: Partial<SwitchCase>) => {
    const newCases = [...cases];
    newCases[index] = { ...newCases[index], ...updates };
    updateCases(newCases);
  };

  const updateCaseCondition = (index: number, conditionUpdates: Partial<SwitchCase['condition']>) => {
    const newCases = [...cases];
    newCases[index] = {
      ...newCases[index],
      condition: { ...newCases[index].condition, ...conditionUpdates },
    };
    updateCases(newCases);
  };

  const addCase = () => {
    const newCase: SwitchCase = {
      id: `case-${cases.length + 1}`,
      label: `Case ${cases.length + 1}`,
      condition: {
        type: 'ui-element',
        selector: '',
        selectorType: 'css',
        elementCheck: 'visible',
      },
    };
    updateCases([...cases, newCase]);
  };

  const removeCase = (index: number) => {
    if (cases.length <= 1) {
      alert('Switch node must have at least one case');
      return;
    }
    const newCases = cases.filter((_, i) => i !== index);
    updateCases(newCases);
  };

  const renderConditionConfig = (caseItem: SwitchCase, index: number) => {
    const condition = caseItem.condition;
    if (!condition) return null;

    switch (condition.type) {
      case 'ui-element':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Selector Type</label>
              <select
                value={condition.selectorType || 'css'}
                onChange={(e) => updateCaseCondition(index, { selectorType: e.target.value as any })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
              >
                {SELECTOR_TYPE_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              {getSelectorHelpText(condition.selectorType || 'css') && (
                <div className="mt-1 text-xs text-gray-400">
                  {getSelectorHelpText(condition.selectorType || 'css')}
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Selector</label>
              <input
                type="text"
                value={condition.selector || ''}
                onChange={(e) => updateCaseCondition(index, { selector: e.target.value })}
                placeholder={getSelectorPlaceholder(condition.selectorType || 'css')}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
              />
            </div>
            <SelectorModifiersEditor
              value={condition.selectorModifiers}
              onChange={(v) => updateCaseCondition(index, { selectorModifiers: v })}
            />
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Element Check</label>
              <select
                value={condition.elementCheck || 'visible'}
                onChange={(e) => updateCaseCondition(index, { elementCheck: e.target.value as 'visible' | 'hidden' | 'exists' })}
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
                  onChange={(e) => updateCaseCondition(index, { timeout: parseInt(e.target.value) || 30000 })}
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
                onChange={(e) => updateCaseCondition(index, { apiContextKey: e.target.value })}
                placeholder="apiResponse"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Status Code</label>
              <input
                type="number"
                value={condition.statusCode || ''}
                onChange={(e) => updateCaseCondition(index, { statusCode: parseInt(e.target.value) || undefined })}
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
                onChange={(e) => updateCaseCondition(index, { apiContextKey: e.target.value })}
                placeholder="apiResponse"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">JSON Path</label>
              <input
                type="text"
                value={condition.jsonPath || ''}
                onChange={(e) => updateCaseCondition(index, { jsonPath: e.target.value })}
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
                  // Try to parse as number, otherwise keep as string
                  const numValue = parseFloat(value);
                  updateCaseCondition(index, { expectedValue: isNaN(numValue) ? value : numValue });
                }}
                placeholder="123"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Match Type</label>
              <select
                value={condition.matchType || 'equals'}
                onChange={(e) => updateCaseCondition(index, { matchType: e.target.value as any })}
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
              onChange={(e) => updateCaseCondition(index, { javascriptExpression: e.target.value })}
              placeholder="document.querySelector('.loaded') !== null"
              rows={3}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
            />
            <div className="mt-1 text-xs text-gray-400">
              Expression should evaluate to true/false
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
                onChange={(e) => updateCaseCondition(index, { variableName: e.target.value })}
                placeholder="myVariable"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Comparison Operator</label>
              <select
                value={condition.comparisonOperator || 'equals'}
                onChange={(e) => updateCaseCondition(index, { comparisonOperator: e.target.value as any })}
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
                  updateCaseCondition(index, { comparisonValue: isNaN(numValue) ? value : numValue });
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
    <div className="space-y-4">
      <div className="text-gray-400 text-sm mb-4">
        Configure switch cases. Each case is evaluated in order, and the first matching case is executed.
      </div>

      {/* Cases */}
      <div className="space-y-4">
        {cases.map((caseItem, index) => (
          <div key={caseItem.id} className="border border-gray-600 rounded p-4 bg-gray-800">
            <div className="flex items-center justify-between mb-3">
              <div className="flex-1">
                <input
                  type="text"
                  value={caseItem.label}
                  onChange={(e) => updateCase(index, { label: e.target.value })}
                  placeholder="Case Label"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm font-medium"
                />
              </div>
              <button
                onClick={() => removeCase(index)}
                className="ml-2 px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded"
                disabled={cases.length <= 1}
              >
                Remove
              </button>
            </div>

            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-300 mb-1">Condition Type</label>
              <select
                value={caseItem.condition?.type || 'ui-element'}
                onChange={(e) => updateCaseCondition(index, { type: e.target.value as any })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
              >
                {CONDITION_TYPES.map((ct) => (
                  <option key={ct.value} value={ct.value}>
                    {ct.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-3">
              {renderConditionConfig(caseItem, index)}
            </div>
          </div>
        ))}
      </div>

      {/* Add Case Button */}
      <button
        onClick={addCase}
        className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded"
      >
        Add Case
      </button>

      {/* Default Case */}
      <div className="border border-gray-600 rounded p-4 bg-gray-800">
        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-300 mb-1">Default Case Label</label>
          <input
            type="text"
            value={defaultCase.label || 'Default'}
            onChange={(e) => onChange('defaultCase', { ...defaultCase, label: e.target.value })}
            placeholder="Default"
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
          />
        </div>
        <div className="text-xs text-gray-400">
          The default case is executed when no other case matches.
        </div>
      </div>
    </div>
  );
}
