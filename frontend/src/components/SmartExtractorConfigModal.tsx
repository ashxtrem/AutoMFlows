import { useState } from 'react';
import { X } from 'lucide-react';

interface SmartExtractorConfigModalProps {
  mode: string;
  tableIndex: number;
  includeMetadata: boolean;
  limit: number;
  onSave: (config: { tableIndex: number; includeMetadata: boolean; limit: number }) => void;
  onCancel: () => void;
}

export default function SmartExtractorConfigModal({
  mode,
  tableIndex: initialTableIndex,
  includeMetadata: initialIncludeMetadata,
  limit: initialLimit,
  onSave,
  onCancel,
}: SmartExtractorConfigModalProps) {
  const [tableIndex, setTableIndex] = useState(initialTableIndex);
  const [includeMetadata, setIncludeMetadata] = useState(initialIncludeMetadata);
  const [limit, setLimit] = useState(initialLimit);

  const handleSave = () => {
    onSave({ tableIndex, includeMetadata, limit });
  };

  const getModeDescription = (m: string): string => {
    switch (m) {
      case 'allLinks': return 'Extracts all links on the page with their text and href attributes.';
      case 'allImages': return 'Extracts all images on the page with their src and alt attributes.';
      case 'tables': return 'Extracts data from an HTML table, using header cells as column names.';
      case 'repeatedItems': return 'Auto-detects repeated DOM patterns (product cards, list items) and extracts their content.';
      default: return '';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">Extraction Settings</h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-white p-1"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="p-3 bg-gray-700/50 rounded text-sm text-gray-300">
            {getModeDescription(mode)}
          </div>

          {mode === 'tables' && (
            <div>
              <label className="block text-sm font-medium text-white mb-1">Table Index</label>
              <input
                type="number"
                value={tableIndex}
                onChange={(e) => setTableIndex(parseInt(e.target.value) || 0)}
                min={0}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded text-sm text-white focus:border-blue-500 focus:outline-none"
              />
              <p className="text-xs text-gray-400 mt-1">0-based index of the table to extract (0 = first table on the page).</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-white mb-1">Limit (0 = all)</label>
            <input
              type="number"
              value={limit}
              onChange={(e) => setLimit(parseInt(e.target.value) || 0)}
              min={0}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded text-sm text-white focus:border-blue-500 focus:outline-none"
            />
          </div>

          {(mode === 'allLinks' || mode === 'allImages') && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="includeMetadata"
                checked={includeMetadata}
                onChange={(e) => setIncludeMetadata(e.target.checked)}
                className="rounded border-gray-600"
              />
              <label htmlFor="includeMetadata" className="text-sm text-white">
                Include metadata (visibility, dimensions)
              </label>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-700">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white bg-gray-700 hover:bg-gray-600 rounded transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
