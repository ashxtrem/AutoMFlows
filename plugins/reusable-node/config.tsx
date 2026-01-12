import { useMemo } from 'react';
import { Node } from 'reactflow';
import { useWorkflowStore } from '../../frontend/src/store/workflowStore';

interface ReusableConfigProps {
  node: Node;
  onChange: (field: string, value: any) => void;
}

interface RunReusableConfigProps {
  node: Node;
  onChange: (field: string, value: any) => void;
}

export function ReusableConfig({ node, onChange }: ReusableConfigProps) {
  const data = node.data;
  const contextName = data.contextName || '';
  
  // Get all nodes to check for duplicate context names
  const nodes = useWorkflowStore((state) => state.nodes);
  const otherReusableNodes = nodes.filter(
    (n) => n.id !== node.id && n.data.type === 'reusable.reusable'
  );
  const duplicateContextName = otherReusableNodes.find(
    (n) => n.data.contextName === contextName && contextName.trim() !== ''
  );
  
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Context Name <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={contextName}
          onChange={(e) => onChange('contextName', e.target.value)}
          placeholder="e.g., login, setup, cleanup"
          className={`w-full px-3 py-2 bg-gray-700 border rounded text-gray-200 ${
            duplicateContextName
              ? 'border-red-500'
              : 'border-gray-600'
          }`}
        />
        {duplicateContextName && (
          <p className="mt-1 text-xs text-red-400">
            Warning: Another Reusable node ({duplicateContextName.id}) uses this context name
          </p>
        )}
        {!contextName.trim() && (
          <p className="mt-1 text-xs text-yellow-400">
            Context name is required
          </p>
        )}
        <p className="mt-1 text-xs text-gray-400">
          This name identifies the reusable flow. It must be unique within the workflow.
        </p>
      </div>
    </div>
  );
}

export function RunReusableConfig({ node, onChange }: RunReusableConfigProps) {
  const data = node.data;
  const contextName = data.contextName || '';
  
  // Get all Reusable nodes to populate the dropdown
  const nodes = useWorkflowStore((state) => state.nodes);
  const reusableNodes = nodes.filter(
    (n) => n.data.type === 'reusable.reusable'
  );
  
  const availableContextNames = useMemo(() => {
    return reusableNodes
      .map((n) => n.data.contextName)
      .filter((name) => name && name.trim() !== '')
      .sort();
  }, [reusableNodes]);
  
  const isValidContextName = contextName && availableContextNames.includes(contextName);
  
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Reusable Flow <span className="text-red-400">*</span>
        </label>
        {availableContextNames.length === 0 ? (
          <div className="px-3 py-2 bg-gray-700 border border-gray-600 rounded text-gray-400 text-sm">
            No reusable flows available. Create a Reusable node first.
          </div>
        ) : (
          <>
            <select
              value={contextName}
              onChange={(e) => onChange('contextName', e.target.value)}
              className={`w-full px-3 py-2 bg-gray-700 border rounded text-gray-200 ${
                !isValidContextName && contextName
                  ? 'border-red-500'
                  : 'border-gray-600'
              }`}
            >
              <option value="">Select a reusable flow...</option>
              {availableContextNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
            {!isValidContextName && contextName && (
              <p className="mt-1 text-xs text-red-400">
                Warning: Reusable flow "{contextName}" not found
              </p>
            )}
            {!contextName && (
              <p className="mt-1 text-xs text-yellow-400">
                Please select a reusable flow to execute
              </p>
            )}
          </>
        )}
        <p className="mt-1 text-xs text-gray-400">
          Select the reusable flow to execute at this point in the workflow.
        </p>
      </div>
    </div>
  );
}

// Default export that handles both node types
export default function ReusableNodeConfig({ node, onChange }: ReusableConfigProps | RunReusableConfigProps) {
  const nodeType = node.data.type;
  
  if (nodeType === 'reusable.reusable') {
    return <ReusableConfig node={node} onChange={onChange} />;
  } else if (nodeType === 'reusable.runReusable') {
    return <RunReusableConfig node={node} onChange={onChange} />;
  }
  
  return null;
}
