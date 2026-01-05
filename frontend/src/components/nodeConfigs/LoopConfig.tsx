import { Node } from 'reactflow';

interface LoopConfigProps {
  node: Node;
  onChange: (field: string, value: any) => void;
}

export default function LoopConfig({ node, onChange }: LoopConfigProps) {
  const data = node.data;

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Array Variable Name</label>
        <input
          type="text"
          value={data.arrayVariable || ''}
          onChange={(e) => onChange('arrayVariable', e.target.value)}
          placeholder="items (variable name from previous node output)"
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
        />
        <p className="mt-1 text-xs text-gray-400">
          Name of the variable containing the array to iterate over (from a previous node's output)
        </p>
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

