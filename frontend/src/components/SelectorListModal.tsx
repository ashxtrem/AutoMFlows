import { useState } from 'react';
import { X, CheckCircle } from 'lucide-react';
import { SelectorOption } from '@automflows/shared';

interface SelectorListModalProps {
  selectors: SelectorOption[];
  nodeId: string;
  fieldName: string;
  onAccept: (selectedSelector: SelectorOption) => void;
  onCancel: () => void;
}

export default function SelectorListModal({
  selectors,
  nodeId,
  fieldName,
  onAccept,
  onCancel,
}: SelectorListModalProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const handleAccept = () => {
    if (selectedIndex >= 0 && selectedIndex < selectors.length) {
      onAccept(selectors[selectedIndex]);
    }
  };

  const getQualityColor = (quality: 'high' | 'medium' | 'low') => {
    switch (quality) {
      case 'high':
        return 'text-green-400 bg-green-900/30 border-green-600';
      case 'medium':
        return 'text-yellow-400 bg-yellow-900/30 border-yellow-600';
      case 'low':
        return 'text-red-400 bg-red-900/30 border-red-600';
    }
  };

  const getQualityLabel = (quality: 'high' | 'medium' | 'low') => {
    switch (quality) {
      case 'high':
        return 'High';
      case 'medium':
        return 'Medium';
      case 'low':
        return 'Low';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">Select Selector</h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-white p-1"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Selector List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {selectors.length === 0 ? (
            <div className="text-gray-400 text-center py-8">No selectors generated</div>
          ) : (
            selectors.map((selector, index) => (
              <div
                key={index}
                onClick={() => setSelectedIndex(index)}
                className={`p-3 rounded border cursor-pointer transition-colors ${
                  selectedIndex === index
                    ? 'border-blue-500 bg-blue-900/30'
                    : 'border-gray-600 hover:border-gray-500 bg-gray-700/50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    checked={selectedIndex === index}
                    onChange={() => setSelectedIndex(index)}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium border ${getQualityColor(
                          selector.quality
                        )}`}
                      >
                        {getQualityLabel(selector.quality)}
                      </span>
                      <span className="px-2 py-0.5 rounded text-xs font-mono bg-gray-900 text-gray-300 border border-gray-600">
                        {selector.type.toUpperCase()}
                      </span>
                    </div>
                    <div className="font-mono text-sm text-gray-200 break-all mb-1">
                      {selector.selector}
                    </div>
                    <div className="text-xs text-gray-400">{selector.reason}</div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-700">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white bg-gray-700 hover:bg-gray-600 rounded transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleAccept}
            disabled={selectors.length === 0}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <CheckCircle size={16} />
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
