import { useState } from 'react';
import { Node } from 'reactflow';
import { OpenBrowserNodeData } from '@automflows/shared';
import CapabilitiesPopup from '../CapabilitiesPopup';
import ScriptEditorPopup from '../ScriptEditorPopup';
import { usePropertyInput } from '../../hooks/usePropertyInput';

interface OpenBrowserConfigProps {
  node: Node;
  onChange: (field: string, value: any) => void;
}

export default function OpenBrowserConfig({ node, onChange }: OpenBrowserConfigProps) {
  const data = node.data as OpenBrowserNodeData;
  const [showCapabilitiesPopup, setShowCapabilitiesPopup] = useState(false);
  const [showScriptEditorPopup, setShowScriptEditorPopup] = useState(false);
  const { getPropertyValue, isPropertyDisabled, getInputClassName } = usePropertyInput(node);
  
  const maxWindow = data.maxWindow !== false; // Default to true
  const capabilitiesCount = data.capabilities ? Object.keys(data.capabilities).length : 0;
  const hasScript = data.jsScript && data.jsScript.trim().length > 0;

  const handleCapabilitiesSave = (capabilities: Record<string, any>) => {
    onChange('capabilities', capabilities);
  };

  const handleScriptSave = (script: string) => {
    onChange('jsScript', script);
  };

  return (
    <>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Browser</label>
          <select
            value={getPropertyValue('browser', 'chromium')}
            onChange={(e) => onChange('browser', e.target.value)}
            disabled={isPropertyDisabled('browser')}
            className={getInputClassName('browser', 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm')}
          >
            <option value="chromium">Chromium</option>
            <option value="firefox">Firefox</option>
            <option value="webkit">WebKit</option>
          </select>
          {isPropertyDisabled('browser') && (
            <div className="mt-1 text-xs text-gray-500 italic">
              This property is converted to input. Connect a node to provide the value.
            </div>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Max Window</label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={maxWindow}
              onChange={(e) => {
                onChange('maxWindow', e.target.checked);
                // If disabling max window, set default viewport if not set
                if (!e.target.checked && !data.viewportWidth && !data.viewportHeight) {
                  onChange('viewportWidth', 1280);
                  onChange('viewportHeight', 720);
                }
              }}
              className="rounded"
            />
            <span className="text-sm text-gray-400">Maximize browser window</span>
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Viewport Width</label>
          <input
            type="number"
            value={getPropertyValue('viewportWidth', 1280)}
            onChange={(e) => onChange('viewportWidth', parseInt(e.target.value, 10))}
            disabled={maxWindow || isPropertyDisabled('viewportWidth')}
            className={`${getInputClassName('viewportWidth', 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm')} ${
              maxWindow ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          />
          {isPropertyDisabled('viewportWidth') && (
            <div className="mt-1 text-xs text-gray-500 italic">
              This property is converted to input. Connect a node to provide the value.
            </div>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Viewport Height</label>
          <input
            type="number"
            value={getPropertyValue('viewportHeight', 720)}
            onChange={(e) => onChange('viewportHeight', parseInt(e.target.value, 10))}
            disabled={maxWindow || isPropertyDisabled('viewportHeight')}
            className={`${getInputClassName('viewportHeight', 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm')} ${
              maxWindow ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          />
          {isPropertyDisabled('viewportHeight') && (
            <div className="mt-1 text-xs text-gray-500 italic">
              This property is converted to input. Connect a node to provide the value.
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Headless Mode</label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={data.headless !== false}
              onChange={(e) => onChange('headless', e.target.checked)}
              className="rounded"
            />
            <span className="text-sm text-gray-400">Run browser in headless mode</span>
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Stealth Mode</label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={data.stealthMode || false}
              onChange={(e) => onChange('stealthMode', e.target.checked)}
              className="rounded"
            />
            <span className="text-sm text-gray-400">Make automation undetectable</span>
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Capabilities</label>
          <button
            onClick={() => setShowCapabilitiesPopup(true)}
            className="w-full px-3 py-2 bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded text-white text-sm transition-colors"
          >
            View/Add Capabilities{capabilitiesCount > 0 ? ` (${capabilitiesCount})` : ''}
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">JavaScript Script (Optional)</label>
          <button
            onClick={() => setShowScriptEditorPopup(true)}
            className="w-full px-3 py-2 bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded text-white text-sm transition-colors"
          >
            Edit JavaScript Script{hasScript ? ' (Configured)' : ''}
          </button>
        </div>
      </div>

      {showCapabilitiesPopup && (
        <CapabilitiesPopup
          node={node}
          onSave={handleCapabilitiesSave}
          onClose={() => setShowCapabilitiesPopup(false)}
        />
      )}

      {showScriptEditorPopup && (
        <ScriptEditorPopup
          node={node}
          onSave={handleScriptSave}
          onClose={() => setShowScriptEditorPopup(false)}
        />
      )}
    </>
  );
}

