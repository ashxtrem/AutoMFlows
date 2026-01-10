import { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import Editor from '@monaco-editor/react';

export type PropertyEditorType = 'text' | 'number' | 'textarea' | 'code';

interface PropertyEditorPopupProps {
  label: string;
  value: any;
  type: PropertyEditorType;
  onChange: (value: any) => void;
  onClose: () => void;
  placeholder?: string;
  min?: number;
  max?: number;
  options?: { label: string; value: string }[];
}

export default function PropertyEditorPopup({
  label,
  value,
  type,
  onChange,
  onClose,
  placeholder,
  min,
  max,
}: PropertyEditorPopupProps) {
  const [editValue, setEditValue] = useState<string>(String(value || ''));
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setEditValue(String(value || ''));
  }, [value]);

  useEffect(() => {
    // Auto-focus and select text on open
    if (type === 'text' && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    } else if (type === 'number' && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    } else if (type === 'textarea' && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [type]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      handleCancel();
    }
  };

  const handleSave = () => {
    if (type === 'number') {
      const numValue = editValue === '' ? 0 : parseFloat(editValue);
      if (!isNaN(numValue)) {
        const finalValue = min !== undefined && numValue < min ? min : (max !== undefined && numValue > max ? max : numValue);
        onChange(finalValue);
      } else {
        onChange(value);
      }
    } else {
      onChange(editValue);
    }
    onClose();
  };

  const handleCancel = () => {
    setEditValue(String(value || ''));
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleCancel();
    } else if (e.key === 'Enter' && (type === 'text' || type === 'number')) {
      if (!e.shiftKey) {
        e.preventDefault();
        handleSave();
      }
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && type === 'textarea') {
      e.preventDefault();
      handleSave();
    }
  };

  const getMaxWidth = () => {
    if (type === 'code') return 'max-w-4xl';
    if (type === 'textarea') return 'max-w-2xl';
    return 'max-w-lg';
  };

  const renderEditor = () => {
    if (type === 'code') {
      return (
        <div className="bg-gray-900 border border-gray-700 rounded overflow-hidden">
          <Editor
            height="400px"
            defaultLanguage="javascript"
            value={editValue}
            onChange={(value) => setEditValue(value || '')}
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
              fontSize: 12,
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              automaticLayout: true,
            }}
          />
        </div>
      );
    }

    if (type === 'textarea') {
      return (
        <textarea
          ref={textareaRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={10}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono"
        />
      );
    }

    if (type === 'number') {
      return (
        <input
          ref={inputRef}
          type="number"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          min={min}
          max={max}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      );
    }

    // Default to text
    return (
      <input
        ref={inputRef}
        type="text"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    );
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div className={`bg-gray-800 border border-gray-700 rounded-lg shadow-xl ${getMaxWidth()} w-full mx-4 overflow-hidden flex flex-col`}>
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">
            Edit {label}
          </h2>
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="p-4 flex-1">
          {renderEditor()}
          {type === 'textarea' && (
            <p className="text-xs text-gray-400 mt-2">
              Press Ctrl+Enter (Cmd+Enter on Mac) to save
            </p>
          )}
          {type === 'code' && (
            <p className="text-xs text-gray-400 mt-2">
              Press Escape to cancel
            </p>
          )}
        </div>

        <div className="p-4 border-t border-gray-700 flex justify-end gap-2">
          <button
            onClick={handleCancel}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
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

