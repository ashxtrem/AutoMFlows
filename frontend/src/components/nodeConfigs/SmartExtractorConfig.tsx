import { useState } from 'react';
import { Node } from 'reactflow';
import { SmartExtractorNodeData } from '@automflows/shared';
import { usePropertyInput } from '../../hooks/usePropertyInput';
import SmartExtractorConfigModal from '../SmartExtractorConfigModal';

const MODE_OPTIONS = [
  { value: 'allLinks', label: 'All Links', description: 'Extract all links (text + href)' },
  { value: 'allImages', label: 'All Images', description: 'Extract all images (src + alt)' },
  { value: 'tables', label: 'Table Data', description: 'Extract HTML table rows' },
  { value: 'repeatedItems', label: 'Repeated Items', description: 'Auto-detect repeated patterns' },
];

interface SmartExtractorConfigProps {
  node: Node;
  onChange: (field: string, value: any) => void;
}

export default function SmartExtractorConfig({ node, onChange }: SmartExtractorConfigProps) {
  const data = node.data as SmartExtractorNodeData;
  const { getPropertyValue, isPropertyDisabled, getInputClassName } = usePropertyInput(node);
  const [showConfigModal, setShowConfigModal] = useState(false);

  const mode = data.mode || 'allLinks';

  const handleConfigSave = (config: { tableIndex: number; includeMetadata: boolean; limit: number }) => {
    onChange('tableIndex', config.tableIndex);
    onChange('includeMetadata', config.includeMetadata);
    onChange('limit', config.limit);
    setShowConfigModal(false);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-primary mb-1">Extraction Mode</label>
        <select
          value={getPropertyValue('mode', 'allLinks')}
          onChange={(e) => onChange('mode', e.target.value)}
          disabled={isPropertyDisabled('mode')}
          className={getInputClassName('mode', 'w-full px-3 py-2 bg-surfaceHighlight border border-border rounded text-sm')}
        >
          {MODE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <p className="text-xs text-secondary mt-1">
          {MODE_OPTIONS.find(o => o.value === mode)?.description}
        </p>
      </div>

      <div>
        <button
          onClick={() => setShowConfigModal(true)}
          className="w-full px-3 py-2 text-sm font-medium text-blue-400 bg-blue-900/20 hover:bg-blue-900/30 border border-blue-800/50 rounded transition-colors text-left"
        >
          Configure Extraction...
        </button>
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
          id="failSilently"
          checked={getPropertyValue('failSilently', false)}
          onChange={(e) => onChange('failSilently', e.target.checked)}
          disabled={isPropertyDisabled('failSilently')}
          className="rounded border-border"
        />
        <label htmlFor="failSilently" className="text-sm text-primary">Fail Silently</label>
      </div>

      {showConfigModal && (
        <SmartExtractorConfigModal
          mode={mode}
          tableIndex={data.tableIndex || 0}
          includeMetadata={data.includeMetadata || false}
          limit={data.limit || 0}
          onSave={handleConfigSave}
          onCancel={() => setShowConfigModal(false)}
        />
      )}
    </div>
  );
}
