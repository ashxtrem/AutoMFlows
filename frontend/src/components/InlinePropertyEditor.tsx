import { useState, useRef, useEffect } from 'react';

interface InlinePropertyEditorProps {
  label: string;
  value: any;
  type: 'text' | 'number' | 'select' | 'textarea' | 'checkbox';
  onChange: (value: any) => void;
  options?: { label: string; value: string }[];
  placeholder?: string;
  min?: number;
  max?: number;
}

export function InlineTextInput({ label, value, onChange, placeholder }: Omit<InlinePropertyEditorProps, 'type'>) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(String(value || ''));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditValue(String(value || ''));
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleBlur = () => {
    onChange(editValue);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBlur();
    } else if (e.key === 'Escape') {
      setEditValue(String(value || ''));
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-1">
        <span className="text-xs text-gray-400 min-w-[60px]">{label}:</span>
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 px-2 py-1 bg-gray-700 border border-blue-500 rounded text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        />
      </div>
    );
  }

  return (
    <div 
      className="flex items-center gap-1 cursor-text hover:bg-gray-700/50 rounded px-1 py-0.5"
      onClick={(e) => {
        e.stopPropagation();
        setIsEditing(true);
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <span className="text-xs text-gray-400 min-w-[60px]">{label}:</span>
      <span className="text-xs text-gray-200 flex-1 truncate">{value || <span className="text-gray-500 italic">{placeholder || 'empty'}</span>}</span>
    </div>
  );
}

export function InlineNumberInput({ label, value, onChange, placeholder, min, max }: Omit<InlinePropertyEditorProps, 'type'>) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(String(value || ''));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditValue(String(value || ''));
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleBlur = () => {
    const numValue = editValue === '' ? 0 : parseInt(editValue, 10);
    if (!isNaN(numValue)) {
      const finalValue = min !== undefined && numValue < min ? min : (max !== undefined && numValue > max ? max : numValue);
      onChange(finalValue);
      setEditValue(String(finalValue));
    } else {
      setEditValue(String(value || ''));
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBlur();
    } else if (e.key === 'Escape') {
      setEditValue(String(value || ''));
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-1">
        <span className="text-xs text-gray-400 min-w-[60px]">{label}:</span>
        <input
          ref={inputRef}
          type="number"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          min={min}
          max={max}
          className="flex-1 px-2 py-1 bg-gray-700 border border-blue-500 rounded text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        />
      </div>
    );
  }

  return (
    <div 
      className="flex items-center gap-1 cursor-text hover:bg-gray-700/50 rounded px-1 py-0.5"
      onClick={(e) => {
        e.stopPropagation();
        setIsEditing(true);
      }}
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

export function InlineTextarea({ label, value, onChange, placeholder }: Omit<InlinePropertyEditorProps, 'type'>) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(String(value || ''));
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setEditValue(String(value || ''));
  }, [value]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing]);

  const handleBlur = () => {
    onChange(editValue);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setEditValue(String(value || ''));
      setIsEditing(false);
    }
    // Allow Enter for multiline
    e.stopPropagation();
  };

  if (isEditing) {
    return (
      <div className="flex flex-col gap-1">
        <span className="text-xs text-gray-400">{label}:</span>
        <textarea
          ref={textareaRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={3}
          className="w-full px-2 py-1 bg-gray-700 border border-blue-500 rounded text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        />
      </div>
    );
  }

  const displayValue = value || '';
  const truncatedValue = displayValue.length > 50 ? displayValue.substring(0, 50) + '...' : displayValue;

  return (
    <div 
      className="flex flex-col gap-1 cursor-text hover:bg-gray-700/50 rounded px-1 py-0.5"
      onClick={(e) => {
        e.stopPropagation();
        setIsEditing(true);
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <span className="text-xs text-gray-400">{label}:</span>
      <span className="text-xs text-gray-200 break-words">{truncatedValue || <span className="text-gray-500 italic">{placeholder || 'empty'}</span>}</span>
    </div>
  );
}

export function InlineCheckbox({ label, value, onChange }: Omit<InlinePropertyEditorProps, 'type'>) {
  return (
    <div 
      className="flex items-center gap-1 cursor-pointer hover:bg-gray-700/50 rounded px-1 py-0.5"
      onClick={(e) => {
        e.stopPropagation();
        onChange(!value);
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <input
        type="checkbox"
        checked={value || false}
        onChange={(e) => {
          e.stopPropagation();
          onChange(e.target.checked);
        }}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        className="w-3 h-3 rounded"
      />
      <span className="text-xs text-gray-400">{label}</span>
    </div>
  );
}

