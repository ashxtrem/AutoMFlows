import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { getContrastTextColor, getContrastRatio, meetsWCAGAA } from '../utils/colorContrast';

interface ColorPickerProps {
  x: number;
  y: number;
  initialBorderColor?: string;
  initialBackgroundColor?: string;
  onColorChange: (borderColor?: string, backgroundColor?: string) => void;
  onClose: () => void;
  containerRef?: React.RefObject<HTMLDivElement>;
}

const PRESET_COLORS = [
  '#ef4444', '#f59e0b', '#eab308', '#22c55e',
  '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899',
  '#f97316', '#14b8a6', '#06b6d4', '#a855f7',
];

export default function ColorPicker({ 
  x, 
  y, 
  initialBorderColor = '#3b82f6',
  initialBackgroundColor = '#1f2937',
  onColorChange, 
  onClose,
  containerRef
}: ColorPickerProps) {
  const pickerRef = useRef<HTMLDivElement>(null);
  const actualRef = containerRef || pickerRef;
  const [borderColor, setBorderColor] = useState(initialBorderColor);
  const [backgroundColor, setBackgroundColor] = useState(initialBackgroundColor);
  
  // Update state when initial colors change
  useEffect(() => {
    setBorderColor(initialBorderColor);
    setBackgroundColor(initialBackgroundColor);
  }, [initialBorderColor, initialBackgroundColor]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (actualRef.current && !actualRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose, actualRef]);

  const handleApply = () => {
    onColorChange(borderColor, backgroundColor);
  };

  // Calculate adjusted position to keep picker within viewport
  const PICKER_WIDTH = 280;
  const PICKER_HEIGHT = 400; // Approximate height
  const [adjustedX, setAdjustedX] = useState(x);
  const [adjustedY, setAdjustedY] = useState(y);

  useEffect(() => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    let newX = x;
    let newY = y;
    
    // Check right edge
    if (x + PICKER_WIDTH > viewportWidth) {
      newX = viewportWidth - PICKER_WIDTH - 10;
    }
    
    // Check left edge
    if (newX < 10) {
      newX = 10;
    }
    
    // Check bottom edge
    if (y + PICKER_HEIGHT > viewportHeight) {
      newY = viewportHeight - PICKER_HEIGHT - 10;
    }
    
    // Check top edge
    if (newY < 10) {
      newY = 10;
    }
    
    setAdjustedX(newX);
    setAdjustedY(newY);
  }, [x, y]);

  return (
    <div
      ref={actualRef}
      className="fixed bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 p-4 min-w-[280px]"
      style={{ left: `${adjustedX}px`, top: `${adjustedY}px` }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-white">Node Colors</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white"
        >
          <X size={16} />
        </button>
      </div>

      <div className="space-y-4">
        {/* Border Color */}
        <div>
          <label className="block text-xs text-gray-400 mb-2">Border Color</label>
          <div className="flex gap-2 mb-2">
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                onClick={(e) => {
                  e.stopPropagation();
                  setBorderColor(color);
                }}
                className={`w-8 h-8 rounded border-2 ${
                  borderColor === color ? 'border-white' : 'border-gray-600'
                }`}
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
          <input
            type="color"
            value={borderColor}
            onChange={(e) => setBorderColor(e.target.value)}
            className="w-full h-8 rounded cursor-pointer"
          />
        </div>

        {/* Background Color */}
        <div>
          <label className="block text-xs text-gray-400 mb-2">Background Color</label>
          <div className="flex gap-2 mb-2">
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                onClick={(e) => {
                  e.stopPropagation();
                  setBackgroundColor(color);
                }}
                className={`w-8 h-8 rounded border-2 ${
                  backgroundColor === color ? 'border-white' : 'border-gray-600'
                }`}
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
          <input
            type="color"
            value={backgroundColor}
            onChange={(e) => setBackgroundColor(e.target.value)}
            className="w-full h-8 rounded cursor-pointer"
          />
        </div>

        {/* Text Color Preview */}
        <div>
          <label className="block text-xs text-gray-400 mb-2">Text Preview</label>
          <div
            className="w-full p-3 rounded border border-gray-600"
            style={{ backgroundColor: backgroundColor }}
          >
            <div
              className="text-sm font-medium"
              style={{ color: getContrastTextColor(backgroundColor) }}
            >
              Sample Node Label
            </div>
            <div className="mt-2 text-xs opacity-75" style={{ color: getContrastTextColor(backgroundColor) }}>
              Property text preview
            </div>
          </div>
          <div className="mt-1 text-xs text-gray-500">
            Text color: {getContrastTextColor(backgroundColor) === '#ffffff' ? 'White' : 'Black'}
            {meetsWCAGAA(backgroundColor, getContrastTextColor(backgroundColor)) && (
              <span className="ml-2 text-green-400">✓ WCAG AA compliant</span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t border-gray-700">
          <button
            onClick={handleApply}
            className="flex-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded"
          >
            Apply
          </button>
          <button
            onClick={() => {
              setBorderColor('#3b82f6');
              setBackgroundColor('#1f2937');
            }}
            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}

