import { PropertyRenderer } from './types';
import { useWorkflowStore } from '../../../store/workflowStore';
import { validateShortcut } from '../../../utils/shortcutValidator';

export const renderShortcutProperties: PropertyRenderer = ({ renderData, handlePropertyChange, id }) => {
  const shortcut = renderData.shortcut || '';
  const nodes = useWorkflowStore.getState().nodes;
  
  // Get existing shortcuts for validation
  const existingShortcuts = nodes
    .filter(n => n.data.type === 'shortcut.shortcut' && n.id !== id)
    .map(n => (n.data.shortcut || '').toLowerCase())
    .filter(s => s.length === 1);

  // Validate current shortcut
  const validation = shortcut ? validateShortcut(shortcut.toLowerCase(), existingShortcuts) : { isValid: true, error: null };
  const shortcutError = validation.isValid ? null : (validation.error || 'Invalid shortcut');

  const handleShortcutChange = (value: string) => {
    // Only allow single character
    const newShortcut = value.slice(-1).toLowerCase();
    handlePropertyChange('shortcut', newShortcut);
  };

  // Get text color based on theme
  const theme = useWorkflowStore.getState().theme;
  const textColor = theme === 'light' ? '#1F2937' : '#e5e7eb';

  return (
    <div className="mt-2">
      <div>
        <label className="text-xs mb-1 block" style={{ color: textColor, opacity: 0.7 }}>
          Shortcut Key
        </label>
        <div className="relative">
          <input
            type="text"
            value={shortcut}
            onChange={(e) => handleShortcutChange(e.target.value)}
            maxLength={1}
            placeholder="a-z, 0-9"
            className={`w-full px-2 py-1.5 bg-gray-700 border rounded text-sm ${
              shortcutError ? 'border-red-500' : 'border-gray-600'
            }`}
            style={{ color: textColor }}
          />
          {shortcut && !shortcutError && (
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs font-mono bg-blue-600 px-2 py-0.5 rounded">
              {shortcut.toUpperCase()}
            </div>
          )}
        </div>
        {shortcutError && (
          <div className="text-xs text-red-400 mt-1">{shortcutError}</div>
        )}
        {shortcut && !shortcutError && (
          <div className="text-xs text-gray-400 mt-1">
            Press "{shortcut.toUpperCase()}" to navigate to this node
          </div>
        )}
      </div>
    </div>
  );
};
