import { Node } from 'reactflow';
import { useState } from 'react';
import { usePropertyInput } from '../../hooks/usePropertyInput';
import { ContextManipulateNodeData } from '@automflows/shared';

interface ContextManipulateConfigProps {
  node: Node;
  onChange: (field: string, value: any) => void;
}

// Common Playwright devices for device emulation
const PLAYWRIGHT_DEVICES = [
  'iPhone 12',
  'iPhone 12 Pro',
  'iPhone 13',
  'iPhone 13 Pro',
  'iPhone 14',
  'iPhone 14 Pro',
  'iPhone SE',
  'iPad Pro',
  'iPad Air',
  'Pixel 5',
  'Pixel 7',
  'Galaxy S8',
  'Galaxy S9+',
  'Galaxy Tab S4',
  'Desktop Chrome HiDPI',
  'Desktop Firefox HiDPI',
  'Desktop Safari',
];

export default function ContextManipulateConfig({ node, onChange }: ContextManipulateConfigProps) {
  const data = node.data as ContextManipulateNodeData;
  const { getPropertyValue, isPropertyDisabled, getInputClassName } = usePropertyInput(node);
  const action = getPropertyValue('action', 'setGeolocation') as string;

  const handleActionChange = (newAction: string) => {
    onChange('action', newAction);
    // Clear action-specific properties when action changes
    const fieldsToClear: (keyof ContextManipulateNodeData)[] = [
      'geolocation',
      'permissions',
      'revokePermissions',
      'viewportWidth',
      'viewportHeight',
      'userAgent',
      'locale',
      'timezoneId',
      'colorScheme',
      'extraHTTPHeaders',
      'contextKey',
      'contextOptions',
      'stateFilePath',
      'device',
      'initScript',
    ];
    fieldsToClear.forEach((field) => onChange(field, undefined));
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Action</label>
        <select
          value={action}
          onChange={(e) => handleActionChange(e.target.value)}
          disabled={isPropertyDisabled('action')}
          className={getInputClassName('action', 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm')}
        >
          <optgroup label="Context Settings">
            <option value="setGeolocation">Set Geolocation</option>
            <option value="setPermissions">Set Permissions</option>
            <option value="clearPermissions">Clear Permissions</option>
            <option value="setViewportSize">Set Viewport Size</option>
            <option value="setUserAgent">Set User Agent</option>
            <option value="setLocale">Set Locale</option>
            <option value="setTimezone">Set Timezone</option>
            <option value="setColorScheme">Set Color Scheme</option>
            <option value="setExtraHTTPHeaders">Set Extra HTTP Headers</option>
            <option value="addInitScript">Add Init Script</option>
          </optgroup>
          <optgroup label="Context Management">
            <option value="createContext">Create Context</option>
            <option value="switchContext">Switch Context</option>
            <option value="saveState">Save State</option>
            <option value="loadState">Load State</option>
            <option value="emulateDevice">Emulate Device</option>
          </optgroup>
        </select>
        {isPropertyDisabled('action') && (
          <div className="mt-1 text-xs text-gray-500 italic">
            This property is converted to input. Connect a node to provide the value.
          </div>
        )}
      </div>

      {/* Action-specific fields */}
      {action === 'setGeolocation' && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Latitude</label>
            <input
              type="number"
              step="any"
              value={data.geolocation?.latitude ?? ''}
              onChange={(e) => {
                const current = data.geolocation || {};
                onChange('geolocation', { ...current, latitude: parseFloat(e.target.value) || 0 });
              }}
              placeholder="40.7128"
              disabled={isPropertyDisabled('geolocation')}
              className={getInputClassName('geolocation', 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Longitude</label>
            <input
              type="number"
              step="any"
              value={data.geolocation?.longitude ?? ''}
              onChange={(e) => {
                const current = data.geolocation || {};
                onChange('geolocation', { ...current, longitude: parseFloat(e.target.value) || 0 });
              }}
              placeholder="-74.0060"
              disabled={isPropertyDisabled('geolocation')}
              className={getInputClassName('geolocation', 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Accuracy (optional)</label>
            <input
              type="number"
              step="any"
              value={data.geolocation?.accuracy ?? ''}
              onChange={(e) => {
                const current = data.geolocation || {};
                onChange('geolocation', { ...current, accuracy: parseFloat(e.target.value) || undefined });
              }}
              placeholder="Optional"
              disabled={isPropertyDisabled('geolocation')}
              className={getInputClassName('geolocation', 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm')}
            />
          </div>
        </>
      )}

      {action === 'setPermissions' && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Permissions</label>
          <div className="space-y-2">
            {['geolocation', 'notifications', 'camera', 'microphone', 'persistent-storage', 'push', 'background-sync'].map((perm) => (
              <label key={perm} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={(data.permissions || []).includes(perm)}
                  onChange={(e) => {
                    const current = data.permissions || [];
                    if (e.target.checked) {
                      onChange('permissions', [...current, perm]);
                    } else {
                      onChange('permissions', current.filter((p) => p !== perm));
                    }
                  }}
                  disabled={isPropertyDisabled('permissions')}
                  className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded"
                />
                <span className="text-sm text-gray-300">{perm}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {action === 'setViewportSize' && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Width</label>
            <input
              type="number"
              value={getPropertyValue('viewportWidth', '')}
              onChange={(e) => onChange('viewportWidth', parseInt(e.target.value) || 0)}
              placeholder="1920"
              disabled={isPropertyDisabled('viewportWidth')}
              className={getInputClassName('viewportWidth', 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Height</label>
            <input
              type="number"
              value={getPropertyValue('viewportHeight', '')}
              onChange={(e) => onChange('viewportHeight', parseInt(e.target.value) || 0)}
              placeholder="1080"
              disabled={isPropertyDisabled('viewportHeight')}
              className={getInputClassName('viewportHeight', 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm')}
            />
          </div>
        </>
      )}

      {action === 'setUserAgent' && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">User Agent</label>
          <textarea
            value={getPropertyValue('userAgent', '')}
            onChange={(e) => onChange('userAgent', e.target.value)}
            placeholder="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            disabled={isPropertyDisabled('userAgent')}
            rows={3}
            className={getInputClassName('userAgent', 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm')}
          />
        </div>
      )}

      {action === 'setLocale' && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Locale</label>
          <input
            type="text"
            value={getPropertyValue('locale', '')}
            onChange={(e) => onChange('locale', e.target.value)}
            placeholder="en-US"
            disabled={isPropertyDisabled('locale')}
            className={getInputClassName('locale', 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm')}
          />
          <div className="mt-1 text-xs text-gray-500">Example: en-US, fr-FR, de-DE</div>
        </div>
      )}

      {action === 'setTimezone' && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Timezone ID</label>
          <input
            type="text"
            value={getPropertyValue('timezoneId', '')}
            onChange={(e) => onChange('timezoneId', e.target.value)}
            placeholder="America/New_York"
            disabled={isPropertyDisabled('timezoneId')}
            className={getInputClassName('timezoneId', 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm')}
          />
          <div className="mt-1 text-xs text-gray-500">IANA timezone database name (e.g., America/New_York, Europe/London)</div>
        </div>
      )}

      {action === 'setColorScheme' && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Color Scheme</label>
          <select
            value={getPropertyValue('colorScheme', 'light')}
            onChange={(e) => onChange('colorScheme', e.target.value)}
            disabled={isPropertyDisabled('colorScheme')}
            className={getInputClassName('colorScheme', 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm')}
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="no-preference">No Preference</option>
          </select>
        </div>
      )}

      {action === 'setExtraHTTPHeaders' && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">HTTP Headers (JSON)</label>
          <textarea
            value={JSON.stringify(data.extraHTTPHeaders || {}, null, 2)}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                onChange('extraHTTPHeaders', parsed);
              } catch {
                // Invalid JSON, ignore
              }
            }}
            placeholder='{"Authorization": "Bearer token123", "X-Custom-Header": "value"}'
            disabled={isPropertyDisabled('extraHTTPHeaders')}
            rows={5}
            className={getInputClassName('extraHTTPHeaders', 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm font-mono')}
          />
          <div className="mt-1 text-xs text-gray-500">Enter as JSON object with key-value pairs</div>
        </div>
      )}

      {(action === 'createContext' || action === 'switchContext') && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Context Key</label>
          <input
            type="text"
            value={getPropertyValue('contextKey', '')}
            onChange={(e) => onChange('contextKey', e.target.value)}
            placeholder={action === 'createContext' ? 'myContext' : 'default'}
            disabled={isPropertyDisabled('contextKey')}
            className={getInputClassName('contextKey', 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm')}
          />
          <div className="mt-1 text-xs text-gray-500">
            {action === 'createContext' ? 'Unique key to identify this context' : 'Key of the context to switch to'}
          </div>
        </div>
      )}

      {action === 'createContext' && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Context Options (JSON)</label>
          <textarea
            value={JSON.stringify(data.contextOptions || {}, null, 2)}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                onChange('contextOptions', parsed);
              } catch {
                // Invalid JSON, ignore
              }
            }}
            placeholder='{"viewport": {"width": 1920, "height": 1080}, "locale": "en-US"}'
            disabled={isPropertyDisabled('contextOptions')}
            rows={5}
            className={getInputClassName('contextOptions', 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm font-mono')}
          />
          <div className="mt-1 text-xs text-gray-500">Optional: Browser context options as JSON</div>
        </div>
      )}

      {(action === 'saveState' || action === 'loadState') && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">State File Path</label>
          <input
            type="text"
            value={getPropertyValue('stateFilePath', '')}
            onChange={(e) => onChange('stateFilePath', e.target.value)}
            placeholder="./state/auth-state.json"
            disabled={isPropertyDisabled('stateFilePath')}
            className={getInputClassName('stateFilePath', 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm')}
          />
          <div className="mt-1 text-xs text-gray-500">
            {action === 'saveState' ? 'Path to save context state (cookies, storage)' : 'Path to load context state from'}
          </div>
        </div>
      )}

      {action === 'loadState' && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Context Key (optional)</label>
          <input
            type="text"
            value={getPropertyValue('contextKey', '')}
            onChange={(e) => onChange('contextKey', e.target.value)}
            placeholder="default"
            disabled={isPropertyDisabled('contextKey')}
            className={getInputClassName('contextKey', 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm')}
          />
          <div className="mt-1 text-xs text-gray-500">Key for the newly created context (defaults to timestamp)</div>
        </div>
      )}

      {action === 'emulateDevice' && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Device</label>
            <select
              value={getPropertyValue('device', '')}
              onChange={(e) => onChange('device', e.target.value)}
              disabled={isPropertyDisabled('device')}
              className={getInputClassName('device', 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm')}
            >
              <option value="">Select a device</option>
              {PLAYWRIGHT_DEVICES.map((device) => (
                <option key={device} value={device}>
                  {device}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Context Key (optional)</label>
            <input
              type="text"
              value={getPropertyValue('contextKey', '')}
              onChange={(e) => onChange('contextKey', e.target.value)}
              placeholder="default"
              disabled={isPropertyDisabled('contextKey')}
              className={getInputClassName('contextKey', 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm')}
            />
            <div className="mt-1 text-xs text-gray-500">Key for the newly created context (defaults to timestamp)</div>
          </div>
        </>
      )}

      {action === 'addInitScript' && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Init Script (JavaScript)</label>
          <textarea
            value={getPropertyValue('initScript', '')}
            onChange={(e) => onChange('initScript', e.target.value)}
            placeholder="// JavaScript code to run before page loads"
            disabled={isPropertyDisabled('initScript')}
            rows={8}
            className={getInputClassName('initScript', 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm font-mono')}
          />
          <div className="mt-1 text-xs text-gray-500">JavaScript code that runs before each page loads in this context</div>
        </div>
      )}

      <div>
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={data.failSilently || false}
            onChange={(e) => onChange('failSilently', e.target.checked)}
            className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded"
          />
          <span className="text-sm text-gray-300">Fail Silently</span>
        </label>
        <div className="mt-1 text-xs text-gray-500">Continue execution even if this operation fails</div>
      </div>
    </div>
  );
}
