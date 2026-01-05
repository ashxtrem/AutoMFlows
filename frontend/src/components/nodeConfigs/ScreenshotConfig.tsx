import { Node } from 'reactflow';

interface ScreenshotConfigProps {
  node: Node;
  onChange: (field: string, value: any) => void;
}

export default function ScreenshotConfig({ node, onChange }: ScreenshotConfigProps) {
  const data = node.data;

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Full Page</label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={data.fullPage || false}
            onChange={(e) => onChange('fullPage', e.target.checked)}
            className="rounded"
          />
          <span className="text-sm text-gray-400">Capture full page (not just viewport)</span>
        </label>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">File Path (Optional)</label>
        <input
          type="text"
          value={data.path || ''}
          onChange={(e) => onChange('path', e.target.value)}
          placeholder="screenshot.png (leave empty for auto-generated name)"
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
        />
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
    </div>
  );
}

