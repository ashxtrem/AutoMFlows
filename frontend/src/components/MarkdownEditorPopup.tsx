import { useState, useEffect, useRef, useCallback } from 'react';
import { X } from 'lucide-react';

interface MarkdownEditorPopupProps {
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
}

export default function MarkdownEditorPopup({
  value,
  onChange,
  onClose,
}: MarkdownEditorPopupProps) {
  const [editValue, setEditValue] = useState<string>(value || '');
  const [isResizing, setIsResizing] = useState(false);
  const [popupWidth, setPopupWidth] = useState(600); // Default width in pixels
  const [popupHeight, setPopupHeight] = useState(400); // Default height in pixels
  const popupRef = useRef<HTMLDivElement>(null);
  const resizeHandleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setEditValue(value || '');
  }, [value]);

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
    onChange(editValue);
    onClose();
  };

  const handleCancel = () => {
    setEditValue(value || '');
    onClose();
  };

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!popupRef.current) return;
      
      const rect = popupRef.current.getBoundingClientRect();
      const newWidth = e.clientX - rect.left;
      const newHeight = e.clientY - rect.top;
      
      // Constrain minimum size
      const constrainedWidth = Math.max(400, Math.min(1200, newWidth));
      const constrainedHeight = Math.max(300, Math.min(800, newHeight));
      
      setPopupWidth(constrainedWidth);
      setPopupHeight(constrainedHeight);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div 
        ref={popupRef}
        className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden flex flex-col relative"
        style={{ width: `${popupWidth}px`, height: `${popupHeight}px` }}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">
            Edit Comment
          </h2>
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="flex-1 overflow-hidden p-4">
          <textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            placeholder="Enter your comment text here..."
            className="w-full h-full bg-gray-900 border border-gray-600 rounded text-white text-sm p-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            style={{ minHeight: '100%' }}
          />
        </div>

        {/* Resize Handle */}
        <div
          ref={resizeHandleRef}
          onMouseDown={handleResizeStart}
          className={`absolute bottom-0 right-0 w-4 h-4 bg-blue-500 border-2 border-gray-800 rounded-tl-lg cursor-nwse-resize hover:bg-blue-400 ${
            isResizing ? 'bg-blue-400' : ''
          }`}
          style={{ zIndex: 10 }}
        />

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
