import { Node } from 'reactflow';
import { useState } from 'react';
import RetryConfigSection from '../RetryConfigSection';
import { usePropertyInput } from '../../hooks/usePropertyInput';
import SelectorFinderButton from '../SelectorFinderButton';

interface ScreenshotConfigProps {
  node: Node;
  onChange: (field: string, value: any) => void;
}

export default function ScreenshotConfig({ node, onChange }: ScreenshotConfigProps) {
  const data = node.data;
  const [showAdvanced, setShowAdvanced] = useState(false);
  const { getPropertyValue, isPropertyDisabled, getInputClassName } = usePropertyInput(node);

  // Validate regex pattern
  const validateRegex = (pattern: string): boolean => {
    if (!pattern) return true;
    try {
      if (pattern.startsWith('/') && pattern.endsWith('/')) {
        new RegExp(pattern.slice(1, -1));
      } else {
        new RegExp(pattern);
      }
      return true;
    } catch {
      return false;
    }
  };

  const isUrlPatternValid = validateRegex(data.waitForUrl || '');
  const action = data.action || (data.fullPage ? 'fullPage' : 'viewport'); // Support legacy fullPage property

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Action</label>
        <select
          value={getPropertyValue('action', action)}
          onChange={(e) => {
            const newAction = e.target.value;
            onChange('action', newAction);
            // Clear action-specific properties when action changes
            if (newAction !== 'element') {
              onChange('selector', undefined);
              onChange('selectorType', undefined);
            }
            if (newAction !== 'pdf') {
              onChange('format', undefined);
              onChange('margin', undefined);
              onChange('printBackground', undefined);
              onChange('landscape', undefined);
            }
            // Legacy: update fullPage for backward compatibility
            if (newAction === 'fullPage') {
              onChange('fullPage', true);
            } else if (newAction === 'viewport') {
              onChange('fullPage', false);
            }
          }}
          disabled={isPropertyDisabled('action')}
          className={getInputClassName('action', 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm')}
        >
          <option value="fullPage">Full Page</option>
          <option value="viewport">Viewport</option>
          <option value="element">Element</option>
          <option value="pdf">PDF</option>
        </select>
        {isPropertyDisabled('action') && (
          <div className="mt-1 text-xs text-gray-500 italic">
            This property is converted to input. Connect a node to provide the value.
          </div>
        )}
      </div>

      {/* Legacy: Keep fullPage checkbox for backward compatibility */}
      {!data.action && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Full Page</label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={data.fullPage || false}
              onChange={(e) => {
                onChange('fullPage', e.target.checked);
                onChange('action', e.target.checked ? 'fullPage' : 'viewport');
              }}
              className="rounded"
            />
            <span className="text-sm text-gray-400">Capture full page (not just viewport)</span>
          </label>
        </div>
      )}

      {/* Action-specific properties */}
      {action === 'element' && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Selector</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={getPropertyValue('selector', '')}
                onChange={(e) => onChange('selector', e.target.value)}
                placeholder="#element or //div[@id='element']"
                disabled={isPropertyDisabled('selector')}
                className={getInputClassName('selector', 'flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm')}
              />
              {!isPropertyDisabled('selector') && (
                <SelectorFinderButton nodeId={node.id} fieldName="selector" />
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Selector Type</label>
            <select
              value={getPropertyValue('selectorType', 'css')}
              onChange={(e) => onChange('selectorType', e.target.value)}
              disabled={isPropertyDisabled('selectorType')}
              className={getInputClassName('selectorType', 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm')}
            >
              <option value="css">CSS Selector</option>
              <option value="xpath">XPath</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Mask Selectors (optional)</label>
            <textarea
              value={Array.isArray(data.mask) ? data.mask.join('\n') : (data.mask || '')}
              onChange={(e) => {
                const masks = e.target.value.split('\n').filter(m => m.trim());
                onChange('mask', masks.length > 0 ? masks : undefined);
              }}
              placeholder="One selector per line"
              rows={3}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm"
            />
            <div className="mt-1 text-xs text-gray-400">
              Selectors to mask in screenshot (one per line)
            </div>
          </div>
        </>
      )}

      {(action === 'fullPage' || action === 'viewport') && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Mask Selectors (optional)</label>
          <textarea
            value={Array.isArray(data.mask) ? data.mask.join('\n') : (data.mask || '')}
            onChange={(e) => {
              const masks = e.target.value.split('\n').filter(m => m.trim());
              onChange('mask', masks.length > 0 ? masks : undefined);
            }}
            placeholder="One selector per line"
            rows={3}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm"
          />
          <div className="mt-1 text-xs text-gray-400">
            Selectors to mask in screenshot (one per line)
          </div>
        </div>
      )}

      {action === 'pdf' && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Format</label>
            <select
              value={getPropertyValue('format', 'A4')}
              onChange={(e) => onChange('format', e.target.value)}
              disabled={isPropertyDisabled('format')}
              className={getInputClassName('format', 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm')}
            >
              <option value="A4">A4</option>
              <option value="Letter">Letter</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Margins (optional)</label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                value={data.margin?.top || ''}
                onChange={(e) => onChange('margin', { ...data.margin, top: e.target.value ? parseInt(e.target.value, 10) : undefined })}
                placeholder="Top"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm"
              />
              <input
                type="number"
                value={data.margin?.right || ''}
                onChange={(e) => onChange('margin', { ...data.margin, right: e.target.value ? parseInt(e.target.value, 10) : undefined })}
                placeholder="Right"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm"
              />
              <input
                type="number"
                value={data.margin?.bottom || ''}
                onChange={(e) => onChange('margin', { ...data.margin, bottom: e.target.value ? parseInt(e.target.value, 10) : undefined })}
                placeholder="Bottom"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm"
              />
              <input
                type="number"
                value={data.margin?.left || ''}
                onChange={(e) => onChange('margin', { ...data.margin, left: e.target.value ? parseInt(e.target.value, 10) : undefined })}
                placeholder="Left"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm"
              />
            </div>
          </div>
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={data.printBackground !== false}
                onChange={(e) => onChange('printBackground', e.target.checked)}
                className="rounded"
              />
              <span className="text-sm text-gray-300">Print Background</span>
            </label>
          </div>
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={data.landscape || false}
                onChange={(e) => onChange('landscape', e.target.checked)}
                className="rounded"
              />
              <span className="text-sm text-gray-300">Landscape</span>
            </label>
          </div>
        </>
      )}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">File Path (Optional)</label>
        <input
          type="text"
          value={getPropertyValue('path', '')}
          onChange={(e) => onChange('path', e.target.value)}
          placeholder="screenshot.png (leave empty for auto-generated name)"
          disabled={isPropertyDisabled('path')}
          className={getInputClassName('path', 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm')}
        />
        {isPropertyDisabled('path') && (
          <div className="mt-1 text-xs text-gray-500 italic">
            This property is converted to input. Connect a node to provide the value.
          </div>
        )}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Fail Silently</label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={data.failSilently || false}
            onChange={(e) => onChange('failSilently', e.target.checked)}
            className="rounded"
          />
          <span className="text-sm text-gray-400">
            Continue execution even if this node fails
          </span>
        </label>
      </div>

      {/* Advanced Waiting Options */}
      <div className="border-t border-gray-600 pt-4">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full flex items-center justify-between text-sm font-medium text-gray-300 hover:text-white transition-colors"
        >
          <span>Advanced Waiting Options</span>
          <span className="text-gray-400">{showAdvanced ? '▼' : '▶'}</span>
        </button>

        {showAdvanced && (
          <div className="mt-4 space-y-4">
            {/* Wait After Operation Checkbox */}
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={data.waitAfterOperation || false}
                  onChange={(e) => onChange('waitAfterOperation', e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm font-medium text-gray-300">
                  Wait After Operation
                </span>
              </label>
              <div className="mt-1 text-xs text-gray-400 ml-6">
                {data.waitAfterOperation
                  ? 'Wait conditions will execute after taking screenshot'
                  : 'Wait conditions will execute before taking screenshot (default)'}
              </div>
            </div>

            {/* Wait for Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Wait for Selector (Optional)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={data.waitForSelector || ''}
                  onChange={(e) => onChange('waitForSelector', e.target.value)}
                  placeholder=".my-class or //div[@id='myId']"
                  className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                />
                <select
                  value={data.waitForSelectorType || 'css'}
                  onChange={(e) => onChange('waitForSelectorType', e.target.value)}
                  className="px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                >
                  <option value="css">CSS</option>
                  <option value="xpath">XPath</option>
                </select>
                <SelectorFinderButton nodeId={node.id} fieldName="waitForSelector" />
              </div>
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="number"
                  value={data.waitForSelectorTimeout || 30000}
                  onChange={(e) => onChange('waitForSelectorTimeout', parseInt(e.target.value, 10) || undefined)}
                  placeholder="Timeout (ms)"
                  className="w-32 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-xs"
                />
                <span className="text-xs text-gray-400">Timeout for selector wait</span>
              </div>
              <div className="mt-1 text-xs text-gray-400">
                Wait for a specific element to appear before taking screenshot. Useful for ensuring content is loaded.
              </div>
            </div>

            {/* Wait for URL Pattern */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Wait for URL Pattern (Optional)
              </label>
              <input
                type="text"
                value={data.waitForUrl || ''}
                onChange={(e) => onChange('waitForUrl', e.target.value)}
                placeholder="/pattern/ or exact-url"
                className={`w-full px-3 py-2 bg-gray-700 border rounded text-white text-sm ${
                  data.waitForUrl && !isUrlPatternValid
                    ? 'border-red-500'
                    : 'border-gray-600'
                }`}
              />
              {data.waitForUrl && !isUrlPatternValid && (
                <div className="mt-1 text-xs text-red-400">
                  Invalid regex pattern. Use /pattern/ for regex or plain text for exact match.
                </div>
              )}
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="number"
                  value={data.waitForUrlTimeout || 30000}
                  onChange={(e) => onChange('waitForUrlTimeout', parseInt(e.target.value, 10) || undefined)}
                  placeholder="Timeout (ms)"
                  className="w-32 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-xs"
                />
                <span className="text-xs text-gray-400">Timeout for URL pattern wait</span>
              </div>
              <div className="mt-1 text-xs text-gray-400">
                Wait until URL matches pattern before taking screenshot. Use /pattern/ for regex (e.g., /\/dashboard\/.*/) or plain text for exact match.
              </div>
            </div>

            {/* Wait for JavaScript Condition */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Wait for JavaScript Condition (Optional)
              </label>
              <textarea
                value={data.waitForCondition || ''}
                onChange={(e) => onChange('waitForCondition', e.target.value)}
                placeholder="() => document.querySelector('.loaded') !== null"
                rows={3}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm font-mono text-xs"
              />
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="number"
                  value={data.waitForConditionTimeout || 30000}
                  onChange={(e) => onChange('waitForConditionTimeout', parseInt(e.target.value, 10) || undefined)}
                  placeholder="Timeout (ms)"
                  className="w-32 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-xs"
                />
                <span className="text-xs text-gray-400">Timeout for condition wait</span>
              </div>
              <div className="mt-1 text-xs text-gray-400">
                JavaScript expression that returns a truthy value when condition is met. Executed in page context. Useful for waiting for animations or content to load.
              </div>
            </div>

            {/* Wait Strategy */}
            {(data.waitForSelector || data.waitForUrl || data.waitForCondition) && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Wait Strategy
                </label>
                <select
                  value={data.waitStrategy || 'parallel'}
                  onChange={(e) => onChange('waitStrategy', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                >
                  <option value="parallel">Parallel - Wait for all conditions simultaneously</option>
                  <option value="sequential">Sequential - Wait for each condition in order</option>
                </select>
                <div className="mt-1 text-xs text-gray-400">
                  {data.waitStrategy === 'sequential'
                    ? 'Conditions are checked one after another. Useful when conditions depend on each other.'
                    : 'All conditions are checked at the same time. Faster but conditions must be independent.'}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <RetryConfigSection data={data} onChange={onChange} />
    </div>
  );
}

