import { useState } from 'react';
import { Node } from 'reactflow';
import { DataExtractorNodeData, DataExtractorFieldDefinition, SelectorType } from '@automflows/shared';
import { usePropertyInput } from '../../hooks/usePropertyInput';
import DataExtractorFieldsModal from '../DataExtractorFieldsModal';

const SELECTOR_TYPE_OPTIONS: { label: string; value: SelectorType }[] = [
  { label: 'CSS', value: 'css' },
  { label: 'XPath', value: 'xpath' },
  { label: 'Text (auto-detect)', value: 'text' },
  { label: 'Get By Role', value: 'getByRole' },
  { label: 'Get By Text', value: 'getByText' },
  { label: 'Get By Label', value: 'getByLabel' },
  { label: 'Get By Test ID', value: 'getByTestId' },
];

interface DataExtractorConfigProps {
  node: Node;
  onChange: (field: string, value: any) => void;
}

export default function DataExtractorConfig({ node, onChange }: DataExtractorConfigProps) {
  const data = node.data as DataExtractorNodeData;
  const { getPropertyValue, isPropertyDisabled, getInputClassName } = usePropertyInput(node);
  const [showFieldsModal, setShowFieldsModal] = useState(false);

  const fields: DataExtractorFieldDefinition[] = Array.isArray(data.fields) ? data.fields : [];

  const handleFieldsSave = (newFields: DataExtractorFieldDefinition[]) => {
    onChange('fields', newFields);
    setShowFieldsModal(false);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-primary mb-1">Container Selector</label>
        <input
          type="text"
          value={getPropertyValue('containerSelector', '')}
          onChange={(e) => onChange('containerSelector', e.target.value)}
          placeholder="e.g. .product-card"
          disabled={isPropertyDisabled('containerSelector')}
          className={getInputClassName('containerSelector', 'w-full px-3 py-2 bg-surfaceHighlight border border-border rounded text-sm')}
        />
        <p className="text-xs text-secondary mt-1">Selector matching each repeating item on the page.</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-primary mb-1">Container Selector Type</label>
        <select
          value={getPropertyValue('containerSelectorType', 'css')}
          onChange={(e) => onChange('containerSelectorType', e.target.value)}
          disabled={isPropertyDisabled('containerSelectorType')}
          className={getInputClassName('containerSelectorType', 'w-full px-3 py-2 bg-surfaceHighlight border border-border rounded text-sm')}
        >
          {SELECTOR_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-primary mb-1">
          Fields ({fields.length} configured)
        </label>
        <button
          onClick={() => setShowFieldsModal(true)}
          className="w-full px-3 py-2 text-sm font-medium text-blue-400 bg-blue-900/20 hover:bg-blue-900/30 border border-blue-800/50 rounded transition-colors text-left"
        >
          Configure Fields...
        </button>
        {fields.length > 0 && (
          <div className="mt-2 text-xs text-secondary space-y-0.5">
            {fields.slice(0, 5).map((f, i) => (
              <div key={i} className="truncate">
                <span className="text-primary font-medium">{f.name}</span>
                <span className="mx-1 text-gray-500">&larr;</span>
                <span className="font-mono">{f.selector}</span>
                <span className="ml-1 text-gray-500">({f.extract})</span>
              </div>
            ))}
            {fields.length > 5 && (
              <div className="text-gray-500">...and {fields.length - 5} more</div>
            )}
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-primary mb-1">Output Variable</label>
        <input
          type="text"
          value={getPropertyValue('outputVariable', 'extractedData')}
          onChange={(e) => onChange('outputVariable', e.target.value)}
          placeholder="extractedData"
          disabled={isPropertyDisabled('outputVariable')}
          className={getInputClassName('outputVariable', 'w-full px-3 py-2 bg-surfaceHighlight border border-border rounded text-sm')}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-primary mb-1">Limit (0 = all)</label>
        <input
          type="number"
          value={getPropertyValue('limit', 0)}
          onChange={(e) => onChange('limit', parseInt(e.target.value) || 0)}
          min={0}
          disabled={isPropertyDisabled('limit')}
          className={getInputClassName('limit', 'w-full px-3 py-2 bg-surfaceHighlight border border-border rounded text-sm')}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-primary mb-1">Timeout (ms)</label>
        <input
          type="number"
          value={getPropertyValue('timeout', 30000)}
          onChange={(e) => onChange('timeout', parseInt(e.target.value) || 30000)}
          min={0}
          disabled={isPropertyDisabled('timeout')}
          className={getInputClassName('timeout', 'w-full px-3 py-2 bg-surfaceHighlight border border-border rounded text-sm')}
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="waitForSelector"
          checked={getPropertyValue('waitForSelector', true)}
          onChange={(e) => onChange('waitForSelector', e.target.checked)}
          disabled={isPropertyDisabled('waitForSelector')}
          className="rounded border-border"
        />
        <label htmlFor="waitForSelector" className="text-sm text-primary">Wait for container to appear</label>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="failSilently"
          checked={getPropertyValue('failSilently', false)}
          onChange={(e) => onChange('failSilently', e.target.checked)}
          disabled={isPropertyDisabled('failSilently')}
          className="rounded border-border"
        />
        <label htmlFor="failSilently" className="text-sm text-primary">Fail Silently</label>
      </div>

      <div className="border-t border-border pt-4 mt-2">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="saveToCSV"
            checked={getPropertyValue('saveToCSV', false)}
            onChange={(e) => onChange('saveToCSV', e.target.checked)}
            disabled={isPropertyDisabled('saveToCSV')}
            className="rounded border-border"
          />
          <label htmlFor="saveToCSV" className="text-sm font-medium text-primary">Save to CSV</label>
        </div>
        {data.saveToCSV && (
          <div className="mt-3 space-y-3 pl-1">
            <div>
              <label className="block text-sm font-medium text-primary mb-1">CSV File Path</label>
              <input
                type="text"
                value={getPropertyValue('csvFilePath', '')}
                onChange={(e) => onChange('csvFilePath', e.target.value)}
                placeholder="e.g. tests/output/data.csv"
                disabled={isPropertyDisabled('csvFilePath')}
                className={getInputClassName('csvFilePath', 'w-full px-3 py-2 bg-surfaceHighlight border border-border rounded text-sm')}
              />
              <p className="text-xs text-secondary mt-1">Relative to project root or absolute path. Supports variables.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-primary mb-1">Delimiter</label>
              <input
                type="text"
                value={getPropertyValue('csvDelimiter', ',')}
                onChange={(e) => onChange('csvDelimiter', e.target.value)}
                placeholder=","
                disabled={isPropertyDisabled('csvDelimiter')}
                className={getInputClassName('csvDelimiter', 'w-24 px-3 py-2 bg-surfaceHighlight border border-border rounded text-sm')}
              />
            </div>
          </div>
        )}
      </div>

      {showFieldsModal && (
        <DataExtractorFieldsModal
          fields={fields}
          onSave={handleFieldsSave}
          onCancel={() => setShowFieldsModal(false)}
        />
      )}
    </div>
  );
}
