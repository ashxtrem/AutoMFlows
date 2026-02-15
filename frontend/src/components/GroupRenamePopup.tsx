import { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface GroupRenamePopupProps {
  currentName: string;
  onSave: (newName: string) => void;
  onClose: () => void;
}

export default function GroupRenamePopup({
  currentName,
  onSave,
  onClose,
}: GroupRenamePopupProps) {
  const [name, setName] = useState(currentName);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    const trimmedName = name.trim();
    if (trimmedName) {
      onSave(trimmedName);
    } else {
      // If empty, reset to original name
      setName(currentName);
      onClose();
    }
  };

  useEffect(() => {
    // Focus input when popup opens
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, []); // Only run on mount

  useEffect(() => {
    // Handle Escape key to close
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        // Ctrl+Enter or Cmd+Enter to save
        e.preventDefault();
        const trimmedName = name.trim();
        if (trimmedName) {
          onSave(trimmedName);
        } else {
          setName(currentName);
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, onSave, name, currentName]);

  const handleCancel = () => {
    setName(currentName);
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      handleCancel();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
      data-modal="true"
    >
      <div
        className="bg-surface border border-border rounded-lg shadow-xl max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-white">Rename Group</h2>
          <button
            onClick={handleCancel}
            className="text-secondary hover:text-primary transition-colors"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4">
          <label className="block text-sm font-medium text-primary mb-2">
            Group Name
          </label>
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey) {
                handleSave();
              }
            }}
            className="w-full px-3 py-2 bg-surfaceHighlight border border-border rounded text-primary placeholder-secondary focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter group name"
          />
          <p className="text-xs text-secondary mt-2">
            Press Enter to save, Escape to cancel
          </p>
        </div>

        <div className="p-4 border-t border-border flex justify-end gap-2">
          <button
            onClick={handleCancel}
            className="px-4 py-2 bg-surfaceHighlight hover:bg-surfaceHighlight text-primary rounded transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
