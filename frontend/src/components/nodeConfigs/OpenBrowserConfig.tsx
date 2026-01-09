import { useState } from 'react';
import { Node } from 'reactflow';
import { OpenBrowserNodeData } from '@automflows/shared';
import CapabilitiesPopup from '../CapabilitiesPopup';

interface OpenBrowserConfigProps {
  node: Node;
  onChange: (field: string, value: any) => void;
}

export default function OpenBrowserConfig({ node, onChange }: OpenBrowserConfigProps) {
  const data = node.data as OpenBrowserNodeData;
  const [showCapabilitiesPopup, setShowCapabilitiesPopup] = useState(false);
  
  const maxWindow = data.maxWindow !== false; // Default to true
  const capabilitiesCount = data.capabilities ? Object.keys(data.capabilities).length : 0;

  const handleCapabilitiesSave = (capabilities: Record<string, any>) => {
    onChange('capabilities', capabilities);
  };

  return (
    <>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Browser</label>
          <select
            value={data.browser || 'chromium'}
            onChange={(e) => onChange('browser', e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
          >
            <option value="chromium">Chromium</option>
            <option value="firefox">Firefox</option>
            <option value="webkit">WebKit</option>
          </select>
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
            value={data.viewportWidth || 1280}
            onChange={(e) => onChange('viewportWidth', parseInt(e.target.value, 10))}
            disabled={maxWindow}
            className={`w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm ${
              maxWindow ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Viewport Height</label>
          <input
            type="number"
            value={data.viewportHeight || 720}
            onChange={(e) => onChange('viewportHeight', parseInt(e.target.value, 10))}
            disabled={maxWindow}
            className={`w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm ${
              maxWindow ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          />
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
          <label className="block text-sm font-medium text-gray-300 mb-1">User Agent (Optional)</label>
          <input
            type="text"
            value={data.userAgent || ''}
            onChange={(e) => onChange('userAgent', e.target.value)}
            placeholder="Mozilla/5.0..."
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
          />
        </div>
      </div>

      {showCapabilitiesPopup && (
        <CapabilitiesPopup
          node={node}
          onSave={handleCapabilitiesSave}
          onClose={() => setShowCapabilitiesPopup(false)}
        />
      )}
    </>
  );
}

