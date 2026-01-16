import { useState, useRef, useEffect } from 'react';
import { PropertyEditorType } from './PropertyEditorPopup';

interface InlinePropertyEditorProps {
  label: string;
  value: any;
  type: 'text' | 'number' | 'select' | 'textarea' | 'checkbox';
  onChange: (value: any) => void;
  options?: { label: string; value: string }[];
  placeholder?: string;
  min?: number;
  max?: number;
  field?: string; // Field name for reading latest value from store
  onOpenPopup?: (type: PropertyEditorType, label: string, value: any, onChange: (value: any) => void, placeholder?: string, min?: number, max?: number, field?: string) => void;
}

export function InlineTextInput({ label, value, onChange, placeholder, onOpenPopup, field }: Omit<InlinePropertyEditorProps, 'type'>) {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onOpenPopup) {
      onOpenPopup('text', label, value, onChange, placeholder, undefined, undefined, field);
    }
  };

  return (
    <div 
      className="flex items-center gap-1 cursor-text hover:bg-gray-700/50 rounded px-1 py-0.5"
      onClick={handleClick}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <span className="text-xs text-gray-400 min-w-[60px]">{label}:</span>
      <span className="text-xs text-gray-200 flex-1 truncate" title={value || placeholder || 'empty'}>{value || <span className="text-gray-500 italic">{placeholder || 'empty'}</span>}</span>
    </div>
  );
}

export function InlineNumberInput({ label, value, onChange, placeholder, min, max, onOpenPopup, field }: Omit<InlinePropertyEditorProps, 'type'>) {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onOpenPopup) {
      onOpenPopup('number', label, value, onChange, placeholder, min, max, field);
    }
  };

  return (
    <div 
      className="flex items-center gap-1 cursor-text hover:bg-gray-700/50 rounded px-1 py-0.5"
      onClick={handleClick}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <span className="text-xs text-gray-400 min-w-[60px]">{label}:</span>
      <span className="text-xs text-gray-200 flex-1">{value ?? <span className="text-gray-500 italic">{placeholder || '0'}</span>}</span>
    </div>
  );
}

export function InlineSelect({ label, value, onChange, options = [] }: Omit<InlinePropertyEditorProps, 'type'>) {
  const [isEditing, setIsEditing] = useState(false);
  const selectRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    if (isEditing && selectRef.current) {
      selectRef.current.focus();
    }
  }, [isEditing]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(e.target.value);
    setIsEditing(false);
  };

  const handleBlur = () => {
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-1">
        <span className="text-xs text-gray-400 min-w-[60px]">{label}:</span>
        <select
          ref={selectRef}
          value={value || ''}
          onChange={handleChange}
          onBlur={handleBlur}
          className="flex-1 px-2 py-1 bg-gray-700 border border-blue-500 rounded text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div 
      className="flex items-center gap-1 cursor-pointer hover:bg-gray-700/50 rounded px-1 py-0.5"
      onClick={(e) => {
        e.stopPropagation();
        setIsEditing(true);
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <span className="text-xs text-gray-400 min-w-[60px]">{label}:</span>
      <span className="text-xs text-gray-200 flex-1">{selectedOption?.label || value || <span className="text-gray-500 italic">select</span>}</span>
    </div>
  );
}

export function InlineTextarea({ label, value, onChange, placeholder, onOpenPopup, field }: Omit<InlinePropertyEditorProps, 'type'>) {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onOpenPopup) {
      onOpenPopup('textarea', label, value, onChange, placeholder, undefined, undefined, field);
    }
  };

  const displayValue = value || '';
  const truncatedValue = displayValue.length > 50 ? displayValue.substring(0, 50) + '...' : displayValue;

  return (
    <div 
      className="flex flex-col gap-1 cursor-text hover:bg-gray-700/50 rounded px-1 py-0.5"
      onClick={handleClick}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <span className="text-xs text-gray-400">{label}:</span>
      <span className="text-xs text-gray-200 break-words" title={value || placeholder || 'empty'}>{truncatedValue || <span className="text-gray-500 italic">{placeholder || 'empty'}</span>}</span>
    </div>
  );
}

export function InlineCheckbox({ label, value, onChange }: Omit<InlinePropertyEditorProps, 'type'>) {
  return (
    <div 
      className="flex items-center gap-2 cursor-pointer hover:bg-gray-700/50 rounded px-1 py-0.5"
      onClick={(e) => {
        e.stopPropagation();
        onChange(!value);
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="relative">
        <input
          type="checkbox"
          checked={value || false}
          onChange={(e) => {
            e.stopPropagation();
            onChange(e.target.checked);
          }}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          className="custom-checkbox"
        />
      </div>
      <span className="text-xs text-gray-400">{label}</span>
    </div>
  );
}

