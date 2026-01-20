import { ChevronLeft } from 'lucide-react';
import { useSettingsStore } from '../store/settingsStore';
import { useWorkflowStore } from '../store/workflowStore';
import { useNotificationStore } from '../store/notificationStore';

interface CanvasSettingsSubmenuProps {
  onBack: () => void;
}

export default function CanvasSettingsSubmenu({ onBack }: CanvasSettingsSubmenuProps) {
  const canvas = useSettingsStore((state) => state.canvas);
  const setCanvasSetting = useSettingsStore((state) => state.setCanvasSetting);
  const arrangeNodes = useWorkflowStore((state) => state.arrangeNodes);
  const addNotification = useNotificationStore((state) => state.addNotification);

  const handleAutoArrangeChange = (mode: 'none' | 'vertical' | 'horizontal') => {
    setCanvasSetting('autoArrangeNodes', mode);
    if (mode !== 'none') {
      arrangeNodes(mode);
      addNotification({
        type: 'settings',
        title: 'Nodes Arranged',
        details: [`Arranged nodes in ${mode} stack`],
      });
    }
  };

  const handleGridSizeChange = (value: number) => {
    const clampedValue = Math.max(4, Math.min(100, value));
    setCanvasSetting('gridSize', clampedValue);
    addNotification({
      type: 'settings',
      title: 'Grid Size Updated',
      details: [`Grid size set to ${clampedValue}px`],
    });
  };

  const handleToggle = (key: 'showGrid' | 'snapToGrid' | 'autoConnect' | 'lazyLoading', value: boolean) => {
    setCanvasSetting(key, value);
    const labels: Record<string, string> = {
      showGrid: 'Grid',
      snapToGrid: 'Snap to Grid',
      autoConnect: 'Auto-connect',
      lazyLoading: 'Lazy Loading',
    };
    addNotification({
      type: 'settings',
      title: 'Settings Applied',
      details: [`${labels[key]} ${value ? 'enabled' : 'disabled'}`],
    });
  };

  const handleConnectionStyleChange = (style: 'curved' | 'straight' | 'stepped') => {
    setCanvasSetting('connectionStyle', style);
    addNotification({
      type: 'settings',
      title: 'Connection Style Updated',
      details: [`Connection style set to ${style}`],
    });
  };

  return (
    <div className="p-3 space-y-3">
      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={onBack}
          className="text-gray-400 hover:text-white transition-colors p-1"
          aria-label="Back to settings"
        >
          <ChevronLeft size={16} />
        </button>
        <h3 className="text-sm font-medium text-white">Canvas Settings</h3>
      </div>

      {/* Auto Arrange Nodes */}
      <div>
        <label className="block text-xs text-gray-400 mb-1">Auto Arrange Nodes</label>
        <select
          value={canvas.autoArrangeNodes}
          onChange={(e) => handleAutoArrangeChange(e.target.value as 'none' | 'vertical' | 'horizontal')}
          className="w-full px-3 py-1.5 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="none">None</option>
          <option value="vertical">Vertical Stack</option>
          <option value="horizontal">Horizontal Stack</option>
        </select>
      </div>

      {/* Grid Size */}
      <div>
        <label className="block text-xs text-gray-400 mb-1">Grid Size: {canvas.gridSize}px</label>
        <input
          type="range"
          min="4"
          max="100"
          value={canvas.gridSize}
          onChange={(e) => handleGridSizeChange(Number(e.target.value))}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>4px</span>
          <span>100px</span>
        </div>
      </div>

      {/* Show Grid Toggle */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-white font-medium">Show Grid</span>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={canvas.showGrid}
            onChange={(e) => handleToggle('showGrid', e.target.checked)}
            className="sr-only"
          />
          <div
            className={`w-14 h-7 rounded-lg transition-colors flex items-center px-1 cursor-pointer ${
              canvas.showGrid ? 'bg-green-600' : 'bg-gray-700'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-md bg-white transition-transform duration-200 ${
                canvas.showGrid ? 'translate-x-7' : 'translate-x-0'
              }`}
            />
          </div>
        </label>
      </div>

      {/* Snap to Grid Toggle */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-white font-medium">Snap to Grid</span>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={canvas.snapToGrid}
            onChange={(e) => handleToggle('snapToGrid', e.target.checked)}
            className="sr-only"
          />
          <div
            className={`w-14 h-7 rounded-lg transition-colors flex items-center px-1 cursor-pointer ${
              canvas.snapToGrid ? 'bg-green-600' : 'bg-gray-700'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-md bg-white transition-transform duration-200 ${
                canvas.snapToGrid ? 'translate-x-7' : 'translate-x-0'
              }`}
            />
          </div>
        </label>
      </div>

      {/* Connection Lines */}
      <div>
        <label className="block text-xs text-gray-400 mb-1">Connection Lines</label>
        <select
          value={canvas.connectionStyle}
          onChange={(e) => handleConnectionStyleChange(e.target.value as 'curved' | 'straight' | 'stepped')}
          className="w-full px-3 py-1.5 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="curved">Curved</option>
          <option value="straight">Straight</option>
          <option value="stepped">Stepped</option>
        </select>
      </div>

      {/* Auto-connect Toggle */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-white font-medium">Auto-connect</span>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={canvas.autoConnect}
            onChange={(e) => handleToggle('autoConnect', e.target.checked)}
            className="sr-only"
          />
          <div
            className={`w-14 h-7 rounded-lg transition-colors flex items-center px-1 cursor-pointer ${
              canvas.autoConnect ? 'bg-green-600' : 'bg-gray-700'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-md bg-white transition-transform duration-200 ${
                canvas.autoConnect ? 'translate-x-7' : 'translate-x-0'
              }`}
            />
          </div>
        </label>
      </div>

      {/* Lazy Loading Toggle */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-white font-medium">Lazy Loading</span>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={canvas.lazyLoading}
            onChange={(e) => handleToggle('lazyLoading', e.target.checked)}
            className="sr-only"
          />
          <div
            className={`w-14 h-7 rounded-lg transition-colors flex items-center px-1 cursor-pointer ${
              canvas.lazyLoading ? 'bg-green-600' : 'bg-gray-700'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-md bg-white transition-transform duration-200 ${
                canvas.lazyLoading ? 'translate-x-7' : 'translate-x-0'
              }`}
            />
          </div>
        </label>
      </div>
    </div>
  );
}
