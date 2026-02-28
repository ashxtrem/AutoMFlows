import { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { DataExtractorFieldDefinition, SelectorType } from '@automflows/shared';

const SELECTOR_TYPE_OPTIONS: { label: string; value: SelectorType }[] = [
  { label: 'CSS', value: 'css' },
  { label: 'XPath', value: 'xpath' },
  { label: 'Text', value: 'text' },
];

const EXTRACT_TYPE_OPTIONS = [
  { label: 'Text', value: 'text' },
  { label: 'Attribute', value: 'attribute' },
  { label: 'Inner HTML', value: 'innerHTML' },
];

interface DataExtractorFieldsModalProps {
  fields: DataExtractorFieldDefinition[];
  onSave: (fields: DataExtractorFieldDefinition[]) => void;
  onCancel: () => void;
}

export default function DataExtractorFieldsModal({
  fields: initialFields,
  onSave,
  onCancel,
}: DataExtractorFieldsModalProps) {
  const [fields, setFields] = useState<DataExtractorFieldDefinition[]>(
    initialFields.length > 0 ? [...initialFields] : [{ name: '', selector: '', extract: 'text' }]
  );

  const addField = () => {
    setFields([...fields, { name: '', selector: '', extract: 'text' }]);
  };

  const removeField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const updateField = (index: number, key: keyof DataExtractorFieldDefinition, value: any) => {
    const updated = [...fields];
    updated[index] = { ...updated[index], [key]: value };
    if (key === 'extract' && value !== 'attribute') {
      delete updated[index].attribute;
    }
    setFields(updated);
  };

  const handleSave = () => {
    const validFields = fields.filter(f => f.name.trim() && f.selector.trim());
    onSave(validFields);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl w-full max-w-4xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">Field Mappings</h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-white p-1"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="mb-3">
            <div className="grid grid-cols-[1fr_1fr_120px_120px_120px_auto] gap-2 text-xs font-medium text-gray-400 uppercase tracking-wider px-1">
              <div>Field Name</div>
              <div>Selector</div>
              <div>Selector Type</div>
              <div>Extract</div>
              <div>Attribute</div>
              <div className="w-8"></div>
            </div>
          </div>

          <div className="space-y-2">
            {fields.map((field, index) => (
              <div
                key={index}
                className="grid grid-cols-[1fr_1fr_120px_120px_120px_auto] gap-2 items-center bg-gray-700/50 rounded p-2"
              >
                <input
                  type="text"
                  value={field.name}
                  onChange={(e) => updateField(index, 'name', e.target.value)}
                  placeholder="e.g. title"
                  className="px-2 py-1.5 bg-gray-900 border border-gray-600 rounded text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                />
                <input
                  type="text"
                  value={field.selector}
                  onChange={(e) => updateField(index, 'selector', e.target.value)}
                  placeholder="e.g. .product-title"
                  className="px-2 py-1.5 bg-gray-900 border border-gray-600 rounded text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                />
                <select
                  value={field.selectorType || 'css'}
                  onChange={(e) => updateField(index, 'selectorType', e.target.value)}
                  className="px-2 py-1.5 bg-gray-900 border border-gray-600 rounded text-sm text-white focus:border-blue-500 focus:outline-none"
                >
                  {SELECTOR_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <select
                  value={field.extract}
                  onChange={(e) => updateField(index, 'extract', e.target.value)}
                  className="px-2 py-1.5 bg-gray-900 border border-gray-600 rounded text-sm text-white focus:border-blue-500 focus:outline-none"
                >
                  {EXTRACT_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={field.attribute || ''}
                  onChange={(e) => updateField(index, 'attribute', e.target.value)}
                  placeholder={field.extract === 'attribute' ? 'e.g. href' : ''}
                  disabled={field.extract !== 'attribute'}
                  className="px-2 py-1.5 bg-gray-900 border border-gray-600 rounded text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed"
                />
                <button
                  onClick={() => removeField(index)}
                  disabled={fields.length <= 1}
                  className="text-gray-400 hover:text-red-400 p-1 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label="Remove field"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={addField}
            className="mt-3 flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-400 hover:text-blue-300 bg-blue-900/20 hover:bg-blue-900/30 border border-blue-800/50 rounded transition-colors"
          >
            <Plus size={14} />
            Add Field
          </button>
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
            Save Fields
          </button>
        </div>
      </div>
    </div>
  );
}
