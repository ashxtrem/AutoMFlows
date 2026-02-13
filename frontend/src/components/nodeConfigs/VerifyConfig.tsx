import { Node } from 'reactflow';
import RetryConfigSection from '../RetryConfigSection';
import { VerificationDomain, BrowserVerificationType, MatchType, ComparisonOperator } from '@automflows/shared';
import { usePropertyInput } from '../../hooks/usePropertyInput';
import SelectorFinderButton from '../SelectorFinderButton';
import { getSelectorPlaceholder, getSelectorHelpText, SELECTOR_TYPE_OPTIONS } from '../../utils/selectorHelpers';

interface VerifyConfigProps {
  node: Node;
  onChange: (field: string, value: any) => void;
}

const BROWSER_VERIFICATION_TYPES: { value: BrowserVerificationType; label: string }[] = [
  { value: 'url', label: 'URL' },
  { value: 'text', label: 'Text' },
  { value: 'element', label: 'Element' },
  { value: 'attribute', label: 'Attribute' },
  { value: 'formField', label: 'Form Field' },
  { value: 'cookie', label: 'Cookie' },
  { value: 'storage', label: 'Storage' },
  { value: 'css', label: 'CSS' },
];

const API_VERIFICATION_TYPES: { value: string; label: string }[] = [
  { value: 'status', label: 'Status Code' },
  { value: 'header', label: 'Header' },
  { value: 'bodyPath', label: 'Body Path (JSON)' },
  { value: 'bodyValue', label: 'Body Value' },
];

const DATABASE_VERIFICATION_TYPES: { value: string; label: string }[] = [
  { value: 'rowCount', label: 'Row Count' },
  { value: 'columnValue', label: 'Column Value' },
  { value: 'rowExists', label: 'Row Exists' },
  { value: 'queryResult', label: 'Query Result' },
];

const MATCH_TYPES: { value: MatchType; label: string }[] = [
  { value: 'equals', label: 'Equals' },
  { value: 'contains', label: 'Contains' },
  { value: 'startsWith', label: 'Starts With' },
  { value: 'endsWith', label: 'Ends With' },
  { value: 'regex', label: 'Regex' },
];

const COMPARISON_OPERATORS: { value: ComparisonOperator; label: string }[] = [
  { value: 'equals', label: 'Equals (=)' },
  { value: 'greaterThan', label: 'Greater Than (>)' },
  { value: 'lessThan', label: 'Less Than (<)' },
  { value: 'greaterThanOrEqual', label: 'Greater Than or Equal (>=)' },
  { value: 'lessThanOrEqual', label: 'Less Than or Equal (<=)' },
];

const ELEMENT_CHECKS = [
  { value: 'visible', label: 'Visible' },
  { value: 'hidden', label: 'Hidden' },
  { value: 'exists', label: 'Exists' },
  { value: 'notExists', label: 'Not Exists' },
  { value: 'count', label: 'Count' },
  { value: 'enabled', label: 'Enabled' },
  { value: 'disabled', label: 'Disabled' },
  { value: 'selected', label: 'Selected' },
  { value: 'checked', label: 'Checked' },
];

export default function VerifyConfig({ node, onChange }: VerifyConfigProps) {
  const data = node.data;
  const { getPropertyValue, isPropertyDisabled, getInputClassName } = usePropertyInput(node);
  const domain = (data.domain as VerificationDomain) || 'browser';
  const verificationType = data.verificationType || 'url';

  const renderBrowserConfig = () => {
    switch (verificationType) {
      case 'url':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">URL Pattern</label>
              <input
                type="text"
                value={getPropertyValue('urlPattern', '')}
                onChange={(e) => onChange('urlPattern', e.target.value)}
                placeholder="practicetestautomation.com/logged-in-successfully/"
                disabled={isPropertyDisabled('urlPattern')}
                className={getInputClassName('urlPattern', 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm')}
              />
              {isPropertyDisabled('urlPattern') && (
                <div className="mt-1 text-xs text-gray-500 italic">
                  This property is converted to input. Connect a node to provide the value.
                </div>
              )}
              <div className="mt-1 text-xs text-gray-400">
                Supports context references: {'${data.keyName}'} or {'${variables.varName}'}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Match Type</label>
              <select
                value={data.matchType || 'contains'}
                onChange={(e) => onChange('matchType', e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
              >
                {MATCH_TYPES.map((mt) => (
                  <option key={mt.value} value={mt.value}>
                    {mt.label}
                  </option>
                ))}
              </select>
            </div>
          </>
        );

      case 'text':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Expected Text</label>
              <textarea
                value={data.expectedText || ''}
                onChange={(e) => onChange('expectedText', e.target.value)}
                placeholder="Congratulations"
                rows={3}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
              />
              <div className="mt-1 text-xs text-gray-400">
                Supports context references: {'${data.keyName}'} or {'${variables.varName}'}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Match Type</label>
              <select
                value={data.matchType || 'contains'}
                onChange={(e) => onChange('matchType', e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
              >
                {MATCH_TYPES.map((mt) => (
                  <option key={mt.value} value={mt.value}>
                    {mt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Selector (Optional)</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={data.selector || ''}
                  onChange={(e) => onChange('selector', e.target.value)}
                  placeholder={data.selector ? getSelectorPlaceholder(data.selectorType || 'css') : "Leave empty to check entire page"}
                  className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                />
                <SelectorFinderButton nodeId={node.id} fieldName="selector" />
              </div>
              <div className="mt-1 text-xs text-gray-400">
                If provided, checks text from this element only
              </div>
            </div>
            {data.selector && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Selector Type</label>
                <select
                  value={data.selectorType || 'css'}
                  onChange={(e) => onChange('selectorType', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                >
                  {SELECTOR_TYPE_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                {getSelectorHelpText(data.selectorType || 'css') && (
                  <div className="mt-1 text-xs text-gray-400">
                    {getSelectorHelpText(data.selectorType || 'css')}
                  </div>
                )}
              </div>
            )}
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={data.caseSensitive || false}
                  onChange={(e) => onChange('caseSensitive', e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm text-gray-300">Case Sensitive</span>
              </label>
            </div>
          </>
        );

      case 'element':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Selector</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={data.selector || ''}
                  onChange={(e) => onChange('selector', e.target.value)}
                  placeholder={getSelectorPlaceholder(data.selectorType || 'css')}
                  className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                />
                <SelectorFinderButton nodeId={node.id} fieldName="selector" />
              </div>
              {getSelectorHelpText(data.selectorType || 'css') && (
                <div className="mt-1 text-xs text-gray-400">
                  {getSelectorHelpText(data.selectorType || 'css')}
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Selector Type</label>
              <select
                value={data.selectorType || 'css'}
                onChange={(e) => onChange('selectorType', e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
              >
                {SELECTOR_TYPE_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Element Check</label>
              <select
                value={data.elementCheck || 'visible'}
                onChange={(e) => onChange('elementCheck', e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
              >
                {ELEMENT_CHECKS.map((ec) => (
                  <option key={ec.value} value={ec.value}>
                    {ec.label}
                  </option>
                ))}
              </select>
            </div>
            {data.elementCheck === 'count' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Comparison Operator</label>
                  <select
                    value={data.comparisonOperator || 'equals'}
                    onChange={(e) => onChange('comparisonOperator', e.target.value)}
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
                  <label className="block text-sm font-medium text-gray-300 mb-1">Expected Count</label>
                  <input
                    type="number"
                    value={data.expectedValue || ''}
                    onChange={(e) => onChange('expectedValue', parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                  />
                  <div className="mt-1 text-xs text-gray-400">
                    Supports context references: {'${data.keyName}'} or {'${variables.varName}'}
                  </div>
                </div>
              </>
            )}
          </>
        );

      case 'attribute':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Selector</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={data.selector || ''}
                  onChange={(e) => onChange('selector', e.target.value)}
                  placeholder={getSelectorPlaceholder(data.selectorType || 'css')}
                  className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                />
                <SelectorFinderButton nodeId={node.id} fieldName="selector" />
              </div>
              {getSelectorHelpText(data.selectorType || 'css') && (
                <div className="mt-1 text-xs text-gray-400">
                  {getSelectorHelpText(data.selectorType || 'css')}
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Selector Type</label>
              <select
                value={data.selectorType || 'css'}
                onChange={(e) => onChange('selectorType', e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
              >
                {SELECTOR_TYPE_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Attribute Name</label>
              <input
                type="text"
                value={data.attributeName || ''}
                onChange={(e) => onChange('attributeName', e.target.value)}
                placeholder="disabled"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Expected Value (Optional)</label>
              <input
                type="text"
                value={data.expectedValue || ''}
                onChange={(e) => onChange('expectedValue', e.target.value)}
                placeholder="Leave empty to just check existence"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
              />
              <div className="mt-1 text-xs text-gray-400">
                Supports context references: {'${data.keyName}'} or {'${variables.varName}'}
              </div>
            </div>
            {data.expectedValue && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Match Type</label>
                <select
                  value={data.matchType || 'equals'}
                  onChange={(e) => onChange('matchType', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                >
                  {MATCH_TYPES.map((mt) => (
                    <option key={mt.value} value={mt.value}>
                      {mt.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </>
        );

      case 'formField':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Selector</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={data.selector || ''}
                  onChange={(e) => onChange('selector', e.target.value)}
                  placeholder={getSelectorPlaceholder(data.selectorType || 'css')}
                  className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                />
                <SelectorFinderButton nodeId={node.id} fieldName="selector" />
              </div>
              {getSelectorHelpText(data.selectorType || 'css') && (
                <div className="mt-1 text-xs text-gray-400">
                  {getSelectorHelpText(data.selectorType || 'css')}
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Selector Type</label>
              <select
                value={data.selectorType || 'css'}
                onChange={(e) => onChange('selectorType', e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
              >
                {SELECTOR_TYPE_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Expected Value</label>
              <input
                type="text"
                value={data.expectedValue || ''}
                onChange={(e) => onChange('expectedValue', e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
              />
              <div className="mt-1 text-xs text-gray-400">
                Supports context references: {'${data.keyName}'} or {'${variables.varName}'}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Match Type</label>
              <select
                value={data.matchType || 'equals'}
                onChange={(e) => onChange('matchType', e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
              >
                {MATCH_TYPES.map((mt) => (
                  <option key={mt.value} value={mt.value}>
                    {mt.label}
                  </option>
                ))}
              </select>
            </div>
          </>
        );

      case 'cookie':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Cookie Name</label>
              <input
                type="text"
                value={data.cookieName || ''}
                onChange={(e) => onChange('cookieName', e.target.value)}
                placeholder="sessionId"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Expected Value (Optional)</label>
              <input
                type="text"
                value={data.expectedValue || ''}
                onChange={(e) => onChange('expectedValue', e.target.value)}
                placeholder="Leave empty to just check existence"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
              />
              <div className="mt-1 text-xs text-gray-400">
                Supports context references: {'${data.keyName}'} or {'${variables.varName}'}
              </div>
            </div>
            {data.expectedValue && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Match Type</label>
                <select
                  value={data.matchType || 'equals'}
                  onChange={(e) => onChange('matchType', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                >
                  {MATCH_TYPES.map((mt) => (
                    <option key={mt.value} value={mt.value}>
                      {mt.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </>
        );

      case 'storage':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Storage Type</label>
              <select
                value={data.storageType || 'local'}
                onChange={(e) => onChange('storageType', e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
              >
                <option value="local">Local Storage</option>
                <option value="session">Session Storage</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Storage Key</label>
              <input
                type="text"
                value={data.storageKey || ''}
                onChange={(e) => onChange('storageKey', e.target.value)}
                placeholder="userToken"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Expected Value (Optional)</label>
              <input
                type="text"
                value={data.expectedValue || ''}
                onChange={(e) => onChange('expectedValue', e.target.value)}
                placeholder="Leave empty to just check existence"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
              />
              <div className="mt-1 text-xs text-gray-400">
                Supports context references: {'${data.keyName}'} or {'${variables.varName}'}
              </div>
            </div>
            {data.expectedValue && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Match Type</label>
                <select
                  value={data.matchType || 'equals'}
                  onChange={(e) => onChange('matchType', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                >
                  {MATCH_TYPES.map((mt) => (
                    <option key={mt.value} value={mt.value}>
                      {mt.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </>
        );

      case 'css':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Selector</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={data.selector || ''}
                  onChange={(e) => onChange('selector', e.target.value)}
                  placeholder={getSelectorPlaceholder(data.selectorType || 'css')}
                  className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                />
                <SelectorFinderButton nodeId={node.id} fieldName="selector" />
              </div>
              {getSelectorHelpText(data.selectorType || 'css') && (
                <div className="mt-1 text-xs text-gray-400">
                  {getSelectorHelpText(data.selectorType || 'css')}
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Selector Type</label>
              <select
                value={data.selectorType || 'css'}
                onChange={(e) => onChange('selectorType', e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
              >
                {SELECTOR_TYPE_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">CSS Property</label>
              <input
                type="text"
                value={data.cssProperty || ''}
                onChange={(e) => onChange('cssProperty', e.target.value)}
                placeholder="background-color"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Expected Value</label>
              <input
                type="text"
                value={data.expectedValue || ''}
                onChange={(e) => onChange('expectedValue', e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
              />
              <div className="mt-1 text-xs text-gray-400">
                Supports context references: {'${data.keyName}'} or {'${variables.varName}'}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Match Type</label>
              <select
                value={data.matchType || 'equals'}
                onChange={(e) => onChange('matchType', e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
              >
                {MATCH_TYPES.map((mt) => (
                  <option key={mt.value} value={mt.value}>
                    {mt.label}
                  </option>
                ))}
              </select>
            </div>
          </>
        );

      default:
        return <div className="text-gray-400 text-sm">Select a verification type</div>;
    }
  };

  const renderApiConfig = () => {
    switch (verificationType) {
      case 'status':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">API Context Key</label>
              <input
                type="text"
                value={data.apiContextKey || 'apiResponse'}
                onChange={(e) => onChange('apiContextKey', e.target.value)}
                placeholder="apiResponse"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
              />
              <div className="mt-1 text-xs text-gray-400">
                Context key where API response is stored (from API Request or API cURL node)
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Expected Status Code</label>
              <input
                type="number"
                value={data.statusCode || 200}
                onChange={(e) => onChange('statusCode', parseInt(e.target.value, 10) || 200)}
                placeholder="200"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
              />
              <div className="mt-1 text-xs text-gray-400">
                Supports context references: {'${data.keyName}'} or {'${variables.varName}'}
              </div>
            </div>
          </>
        );

      case 'header':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">API Context Key</label>
              <input
                type="text"
                value={data.apiContextKey || 'apiResponse'}
                onChange={(e) => onChange('apiContextKey', e.target.value)}
                placeholder="apiResponse"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Header Name</label>
              <input
                type="text"
                value={data.headerName || ''}
                onChange={(e) => onChange('headerName', e.target.value)}
                placeholder="content-type"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Expected Header Value</label>
              <input
                type="text"
                value={data.expectedValue || ''}
                onChange={(e) => onChange('expectedValue', e.target.value)}
                placeholder="application/json"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
              />
              <div className="mt-1 text-xs text-gray-400">
                Supports context references: {'${data.keyName}'} or {'${variables.varName}'}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Match Type</label>
              <select
                value={data.matchType || 'equals'}
                onChange={(e) => onChange('matchType', e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
              >
                {MATCH_TYPES.map((mt) => (
                  <option key={mt.value} value={mt.value}>
                    {mt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={data.caseSensitive || false}
                  onChange={(e) => onChange('caseSensitive', e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm text-gray-400">Case Sensitive</span>
              </label>
            </div>
          </>
        );

      case 'bodyPath':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">API Context Key</label>
              <input
                type="text"
                value={data.apiContextKey || 'apiResponse'}
                onChange={(e) => onChange('apiContextKey', e.target.value)}
                placeholder="apiResponse"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">JSON Path</label>
              <input
                type="text"
                value={data.jsonPath || ''}
                onChange={(e) => onChange('jsonPath', e.target.value)}
                placeholder="body.customer.id"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
              />
              <div className="mt-1 text-xs text-gray-400">
                Dot-notation path to check in response body (e.g., body.customer.id)
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Expected Value</label>
              <input
                type="text"
                value={data.expectedValue !== undefined ? String(data.expectedValue) : ''}
                onChange={(e) => onChange('expectedValue', e.target.value)}
                placeholder="Expected value"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
              />
              <div className="mt-1 text-xs text-gray-400">
                Supports context references: {'${data.keyName}'} or {'${variables.varName}'}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Match Type</label>
              <select
                value={data.matchType || 'equals'}
                onChange={(e) => onChange('matchType', e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
              >
                {MATCH_TYPES.map((mt) => (
                  <option key={mt.value} value={mt.value}>
                    {mt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={data.caseSensitive || false}
                  onChange={(e) => onChange('caseSensitive', e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm text-gray-400">Case Sensitive</span>
              </label>
            </div>
          </>
        );

      case 'bodyValue':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">API Context Key</label>
              <input
                type="text"
                value={data.apiContextKey || 'apiResponse'}
                onChange={(e) => onChange('apiContextKey', e.target.value)}
                placeholder="apiResponse"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Expected Body Value</label>
              <textarea
                value={data.expectedValue !== undefined ? (typeof data.expectedValue === 'object' ? JSON.stringify(data.expectedValue, null, 2) : String(data.expectedValue)) : ''}
                onChange={(e) => {
                  try {
                    const parsed = JSON.parse(e.target.value);
                    onChange('expectedValue', parsed);
                  } catch {
                    onChange('expectedValue', e.target.value);
                  }
                }}
                placeholder='{"key": "value"}'
                rows={6}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm font-mono"
              />
              <div className="mt-1 text-xs text-gray-400">
                JSON object or string. Supports context references: {'${data.keyName}'} or {'${variables.varName}'}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Match Type</label>
              <select
                value={data.matchType || 'equals'}
                onChange={(e) => onChange('matchType', e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
              >
                {MATCH_TYPES.map((mt) => (
                  <option key={mt.value} value={mt.value}>
                    {mt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={data.caseSensitive || false}
                  onChange={(e) => onChange('caseSensitive', e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm text-gray-400">Case Sensitive</span>
              </label>
            </div>
          </>
        );

      default:
        return <div className="text-gray-400 text-sm">Select a verification type</div>;
    }
  };

  const renderDatabaseConfig = () => {
    switch (verificationType) {
      case 'rowCount':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">DB Context Key</label>
              <input
                type="text"
                value={getPropertyValue('dbContextKey', 'dbResult')}
                onChange={(e) => onChange('dbContextKey', e.target.value)}
                placeholder="dbResult"
                disabled={isPropertyDisabled('dbContextKey')}
                className={getInputClassName('dbContextKey', 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm')}
              />
              {isPropertyDisabled('dbContextKey') && (
                <div className="mt-1 text-xs text-gray-500 italic">
                  This property is converted to input. Connect a node to provide the value.
                </div>
              )}
              <div className="mt-1 text-xs text-gray-400">
                Context key where query results are stored. Supports: {'${data.key.path}'} or {'${variables.key}'}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Expected Count</label>
              <input
                type="number"
                value={data.expectedValue !== undefined ? Number(data.expectedValue) : ''}
                onChange={(e) => onChange('expectedValue', parseInt(e.target.value, 10) || 0)}
                placeholder="10"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
              />
              <div className="mt-1 text-xs text-gray-400">
                Supports: {'${data.key.path}'} or {'${variables.key}'}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Comparison Operator</label>
              <select
                value={data.comparisonOperator || 'equals'}
                onChange={(e) => onChange('comparisonOperator', e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
              >
                {COMPARISON_OPERATORS.map((op) => (
                  <option key={op.value} value={op.value}>
                    {op.label}
                  </option>
                ))}
              </select>
            </div>
          </>
        );

      case 'columnValue':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">DB Context Key</label>
              <input
                type="text"
                value={getPropertyValue('dbContextKey', 'dbResult')}
                onChange={(e) => onChange('dbContextKey', e.target.value)}
                placeholder="dbResult"
                disabled={isPropertyDisabled('dbContextKey')}
                className={getInputClassName('dbContextKey', 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm')}
              />
              {isPropertyDisabled('dbContextKey') && (
                <div className="mt-1 text-xs text-gray-500 italic">
                  This property is converted to input. Connect a node to provide the value.
                </div>
              )}
              <div className="mt-1 text-xs text-gray-400">
                Context key where query results are stored. Supports: {'${data.key.path}'} or {'${variables.key}'}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Column Name</label>
              <input
                type="text"
                value={data.columnName || ''}
                onChange={(e) => onChange('columnName', e.target.value)}
                placeholder="id"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
              />
              <div className="mt-1 text-xs text-gray-400">
                Supports: {'${data.key.path}'} or {'${variables.key}'}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Row Index</label>
              <input
                type="number"
                value={data.rowIndex !== undefined ? Number(data.rowIndex) : 0}
                onChange={(e) => onChange('rowIndex', parseInt(e.target.value, 10) || 0)}
                placeholder="0"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
              />
              <div className="mt-1 text-xs text-gray-400">
                Zero-based index of the row to check. Supports: {'${data.key.path}'} or {'${variables.key}'}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Expected Value</label>
              <input
                type="text"
                value={data.expectedValue !== undefined ? String(data.expectedValue) : ''}
                onChange={(e) => onChange('expectedValue', e.target.value)}
                placeholder="Expected value"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
              />
              <div className="mt-1 text-xs text-gray-400">
                Supports: {'${data.key.path}'} or {'${variables.key}'}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Match Type</label>
              <select
                value={data.matchType || 'equals'}
                onChange={(e) => onChange('matchType', e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
              >
                {MATCH_TYPES.map((mt) => (
                  <option key={mt.value} value={mt.value}>
                    {mt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">JSON Path (Optional)</label>
              <input
                type="text"
                value={data.jsonPath || ''}
                onChange={(e) => onChange('jsonPath', e.target.value)}
                placeholder="nested.field"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
              />
              <div className="mt-1 text-xs text-gray-400">
                Dot-notation path for nested values in column. Supports: {'${data.key.path}'} or {'${variables.key}'}
              </div>
            </div>
          </>
        );

      case 'rowExists':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">DB Context Key</label>
              <input
                type="text"
                value={getPropertyValue('dbContextKey', 'dbResult')}
                onChange={(e) => onChange('dbContextKey', e.target.value)}
                placeholder="dbResult"
                disabled={isPropertyDisabled('dbContextKey')}
                className={getInputClassName('dbContextKey', 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm')}
              />
              {isPropertyDisabled('dbContextKey') && (
                <div className="mt-1 text-xs text-gray-500 italic">
                  This property is converted to input. Connect a node to provide the value.
                </div>
              )}
              <div className="mt-1 text-xs text-gray-400">
                Context key where query results are stored. Verifies that at least one row exists. Supports: {'${data.key.path}'} or {'${variables.key}'}
              </div>
            </div>
          </>
        );

      case 'queryResult':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">DB Context Key</label>
              <input
                type="text"
                value={getPropertyValue('dbContextKey', 'dbResult')}
                onChange={(e) => onChange('dbContextKey', e.target.value)}
                placeholder="dbResult"
                disabled={isPropertyDisabled('dbContextKey')}
                className={getInputClassName('dbContextKey', 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm')}
              />
              {isPropertyDisabled('dbContextKey') && (
                <div className="mt-1 text-xs text-gray-500 italic">
                  This property is converted to input. Connect a node to provide the value.
                </div>
              )}
              <div className="mt-1 text-xs text-gray-400">
                Context key where query results are stored. Supports: {'${data.key.path}'} or {'${variables.key}'}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Expected Value</label>
              <textarea
                value={data.expectedValue !== undefined ? (typeof data.expectedValue === 'object' ? JSON.stringify(data.expectedValue, null, 2) : String(data.expectedValue)) : ''}
                onChange={(e) => {
                  try {
                    const parsed = JSON.parse(e.target.value);
                    onChange('expectedValue', parsed);
                  } catch {
                    onChange('expectedValue', e.target.value);
                  }
                }}
                placeholder='{"key": "value"}'
                rows={6}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm font-mono"
              />
              <div className="mt-1 text-xs text-gray-400">
                JSON object or string. Supports: {'${data.key.path}'} or {'${variables.key}'}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Match Type</label>
              <select
                value={data.matchType || 'equals'}
                onChange={(e) => onChange('matchType', e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
              >
                {MATCH_TYPES.map((mt) => (
                  <option key={mt.value} value={mt.value}>
                    {mt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">JSON Path (Optional)</label>
              <input
                type="text"
                value={data.jsonPath || ''}
                onChange={(e) => onChange('jsonPath', e.target.value)}
                placeholder="rows[0].id"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
              />
              <div className="mt-1 text-xs text-gray-400">
                Dot-notation path for nested value matching. Supports: {'${data.key.path}'} or {'${variables.key}'}
              </div>
            </div>
          </>
        );

      default:
        return <div className="text-gray-400 text-sm">Select a verification type</div>;
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Domain</label>
        <select
          value={domain}
          onChange={(e) => onChange('domain', e.target.value)}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
        >
          <option value="browser">Browser</option>
          <option value="api">API</option>
          <option value="database">Database</option>
        </select>
      </div>

      {domain === 'browser' && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Verification Type</label>
          <select
            value={verificationType}
            onChange={(e) => onChange('verificationType', e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
          >
            {BROWSER_VERIFICATION_TYPES.map((vt) => (
              <option key={vt.value} value={vt.value}>
                {vt.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {domain === 'api' && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Verification Type</label>
          <select
            value={verificationType}
            onChange={(e) => onChange('verificationType', e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
          >
            {API_VERIFICATION_TYPES.map((vt) => (
              <option key={vt.value} value={vt.value}>
                {vt.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {domain === 'database' && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Verification Type</label>
          <select
            value={verificationType}
            onChange={(e) => onChange('verificationType', e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
          >
            {DATABASE_VERIFICATION_TYPES.map((vt) => (
              <option key={vt.value} value={vt.value}>
                {vt.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {domain === 'browser' && renderBrowserConfig()}
      {domain === 'api' && renderApiConfig()}
      {domain === 'database' && renderDatabaseConfig()}

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Timeout (ms)</label>
        <input
          type="number"
          value={data.timeout || 30000}
          onChange={(e) => onChange('timeout', parseInt(e.target.value, 10) || 30000)}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
        />
      </div>

      <div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={data.failSilently || false}
            onChange={(e) => onChange('failSilently', e.target.checked)}
            className="rounded"
          />
          <span className="text-sm text-gray-300">Fail Silently</span>
        </label>
        <div className="mt-1 text-xs text-gray-400">
          Continue execution even if verification fails
        </div>
      </div>

      {domain !== 'api' && domain !== 'database' && <RetryConfigSection data={data} onChange={onChange} />}
      {domain === 'api' && (
        <div className="border-t border-gray-600 pt-4">
          <div className="text-xs text-gray-400">
            Retry configuration is not available for API domain verify nodes. 
            Retries are handled by the API execution node when the API request is made.
          </div>
        </div>
      )}
      {domain === 'database' && (
        <div className="border-t border-gray-600 pt-4">
          <div className="text-xs text-gray-400">
            Retry configuration is not available for database domain verify nodes. 
            Retries should be handled at the query execution level if needed.
          </div>
        </div>
      )}
    </div>
  );
}
