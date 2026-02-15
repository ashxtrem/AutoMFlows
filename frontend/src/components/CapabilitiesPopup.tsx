import { useState, useEffect } from 'react';
import { X, Plus, Trash2, HelpCircle } from 'lucide-react';
import { Node } from 'reactflow';
import { OpenBrowserNodeData } from '@automflows/shared';

interface CapabilitiesPopupProps {
  node: Node;
  onSave: (data: { capabilities?: Record<string, any>, launchOptions?: Record<string, any> }) => void;
  onClose: () => void;
}

interface CapabilityRow {
  id: string;
  key: string;
  value: string;
  type: 'context' | 'launch'; // 'context' for browser.newContext(), 'launch' for browser.launch()
}

export default function CapabilitiesPopup({ node, onSave, onClose }: CapabilitiesPopupProps) {
  const data = node.data as OpenBrowserNodeData;
  const browserName = data.browser ? data.browser.charAt(0).toUpperCase() + data.browser.slice(1) : 'Chromium';
  const existingCapabilities = data.capabilities || {};
  const existingLaunchOptions = data.launchOptions || {};

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

  // Initialize state from existing capabilities and launch options
  const [capabilities, setCapabilities] = useState<CapabilityRow[]>(() => {
    const contextEntries = Object.entries(existingCapabilities).map(([key, value], index) => ({
      id: `context-${index + 1}`,
      key,
      value: typeof value === 'string' ? value : JSON.stringify(value),
      type: 'context' as const,
    }));
    
    const launchEntries = Object.entries(existingLaunchOptions).map(([key, value], index) => ({
      id: `launch-${index + 1}`,
      key,
      value: typeof value === 'string' ? value : JSON.stringify(value),
      type: 'launch' as const,
    }));
    
    const allEntries = [...contextEntries, ...launchEntries];
    if (allEntries.length === 0) {
      return [{ id: '1', key: '', value: '', type: 'context' }];
    }
    return allEntries;
  });

  const [nextId, setNextId] = useState(capabilities.length + 1);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleAddRow = (type: 'context' | 'launch' = 'context') => {
    setCapabilities([...capabilities, { id: `${type}-${nextId}`, key: '', value: '', type }]);
    setNextId(nextId + 1);
  };

  const handleDeleteRow = (id: string) => {
    setCapabilities(capabilities.filter(row => row.id !== id));
  };

  const handleKeyChange = (id: string, key: string) => {
    setCapabilities(capabilities.map(row => row.id === id ? { ...row, key } : row));
  };

  const handleValueChange = (id: string, value: string) => {
    setCapabilities(capabilities.map(row => row.id === id ? { ...row, value } : row));
  };

  const handleTypeChange = (id: string, type: 'context' | 'launch') => {
    setCapabilities(capabilities.map(row => row.id === id ? { ...row, type } : row));
  };

  const handleSave = () => {
    const capabilitiesObj: Record<string, any> = {};
    const launchOptionsObj: Record<string, any> = {};
    
    capabilities.forEach(row => {
      if (row.key.trim()) {
        // Try to parse value as JSON, otherwise use as string
        let parsedValue: any = row.value.trim();
        try {
          parsedValue = JSON.parse(row.value.trim());
        } catch {
          // If not valid JSON, use as string
          parsedValue = row.value.trim();
        }
        
        if (row.type === 'launch') {
          launchOptionsObj[row.key.trim()] = parsedValue;
        } else {
          capabilitiesObj[row.key.trim()] = parsedValue;
        }
      }
    });

    // Save both capabilities and launchOptions
    // Include launchOptions even if empty so we can remove it from node if it was previously set
    const saveData: { capabilities?: Record<string, any>, launchOptions?: Record<string, any> } = {
      capabilities: capabilitiesObj,
      launchOptions: launchOptionsObj
    };
    
    onSave(saveData);
    onClose();
  };

  const handleHelpClick = () => {
    window.open('/playwright-capabilities.html', '_blank');
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-surface border border-border rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-white">
              Capabilities for {browserName}
            </h2>
            <div className="relative group">
              <HelpCircle 
                className="text-secondary hover:text-blue-400 cursor-pointer transition-colors" 
                size={18}
                onClick={handleHelpClick}
              />
              <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-10">
                <div className="bg-canvas text-primary text-xs rounded py-1 px-2 whitespace-nowrap shadow-lg border border-border">
                  Click to see Playwright browser capabilities
                  <div className="absolute left-2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                </div>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-secondary hover:text-primary transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="overflow-y-auto p-4 flex-1">
          <div className="mb-4 flex gap-2">
            <button
              onClick={() => handleAddRow('context')}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors text-sm"
            >
              <Plus size={16} />
              Add Context Option
            </button>
            <button
              onClick={() => handleAddRow('launch')}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors text-sm"
            >
              <Plus size={16} />
              Add Launch Option
            </button>
          </div>
          
          <div className="space-y-3">
            {capabilities.map((row) => (
              <div key={row.id} className="flex items-center gap-2 p-2 border border-border rounded" style={{ backgroundColor: row.type === 'launch' ? 'rgba(147, 51, 234, 0.1)' : 'rgba(59, 130, 246, 0.1)' }}>
                <select
                  value={row.type}
                  onChange={(e) => handleTypeChange(row.id, e.target.value as 'context' | 'launch')}
                  className="px-2 py-2 bg-surfaceHighlight border border-border rounded text-primary text-xs"
                  style={{ minWidth: '100px' }}
                >
                  <option value="context">Context</option>
                  <option value="launch">Launch</option>
                </select>
                <div className="flex-1 flex gap-2">
                  <input
                    type="text"
                    placeholder="Key"
                    value={row.key}
                    onChange={(e) => handleKeyChange(row.id, e.target.value)}
                    className="flex-1 px-3 py-2 bg-surfaceHighlight border border-border rounded text-primary text-sm placeholder-secondary"
                  />
                  <input
                    type="text"
                    placeholder="Value"
                    value={row.value}
                    onChange={(e) => handleValueChange(row.id, e.target.value)}
                    className="flex-1 px-3 py-2 bg-surfaceHighlight border border-border rounded text-primary text-sm placeholder-secondary"
                  />
                </div>
                <button
                  onClick={() => handleDeleteRow(row.id)}
                  className="p-2 text-secondary hover:text-red-400 transition-colors"
                  title="Delete row"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
          
          {capabilities.length === 0 && (
            <div className="text-center text-secondary py-8">
              <p className="mb-2">No options configured</p>
              <p className="text-xs">Click "Add Context Option" or "Add Launch Option" to get started</p>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-border flex justify-end gap-2">
          <button
            onClick={onClose}
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

