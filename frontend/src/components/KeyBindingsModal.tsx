import { useEffect } from 'react';
import { X } from 'lucide-react';
import {
  KEY_BINDINGS,
  getKeyBindingsByCategory,
  getCategoryName,
  getCategoryOrder,
  formatKeyCombination,
  type KeyBindingCategory,
} from '../utils/keyBindings';

interface KeyBindingsModalProps {
  onClose: () => void;
}

export default function KeyBindingsModal({ onClose }: KeyBindingsModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const bindingsByCategory = getKeyBindingsByCategory();
  const categoryOrder = getCategoryOrder();

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div>
            <h2 className="text-lg font-semibold text-white">Key Bindings</h2>
            <p className="text-xs text-gray-400 mt-1">
              All available keyboard shortcuts in AutoMFlows
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-4 flex-1">
          <div className="space-y-6">
            {categoryOrder.map((category) => {
              const bindings = bindingsByCategory[category];
              if (bindings.length === 0) return null;

              return (
                <div key={category}>
                  <h3 className="text-sm font-semibold text-white mb-3 pb-2 border-b border-gray-700">
                    {getCategoryName(category)}
                  </h3>
                  <div className="space-y-3">
                    {bindings.map((binding) => {
                      const keyCombination = formatKeyCombination(binding);
                      const keys = keyCombination.split(' + ');

                      return (
                        <div
                          key={binding.id}
                          className="flex items-start justify-between gap-4 p-3 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-colors"
                        >
                          <div className="flex-1">
                            <p className="text-sm text-white font-medium">
                              {binding.description}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {keys.map((key, index) => (
                              <span key={index}>
                                <kbd className="px-2 py-1 text-xs font-semibold text-gray-200 bg-gray-800 border border-gray-600 rounded shadow-sm">
                                  {key}
                                </kbd>
                                {index < keys.length - 1 && (
                                  <span className="text-gray-500 mx-1">+</span>
                                )}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Future customization note */}
          <div className="mt-6 pt-4 border-t border-gray-700">
            <p className="text-xs text-gray-400 italic">
              Note: Customization of key bindings will be available in a future update.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
