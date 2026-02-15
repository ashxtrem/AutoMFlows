import { Copy, Trash2, SkipForward, AlertCircle, Minimize2, Maximize2, Files, CheckSquare, Wrench, Pin, CircleDot } from 'lucide-react';
import { useWorkflowStore } from '../store/workflowStore';
import Tooltip from './Tooltip';

interface NodeMenuBarProps {
  nodeId: string;
  bypass?: boolean;
  failSilently?: boolean;
  isMinimized?: boolean;
  isTest?: boolean;
  isPinned?: boolean;
  breakpoint?: boolean;
  isUtilityNode?: boolean;
}

export default function NodeMenuBar({ nodeId, bypass, failSilently, isMinimized, isTest, isPinned, breakpoint, isUtilityNode }: NodeMenuBarProps) {
  // Ensure isPinned is always a boolean
  const pinned = isPinned ?? false;
  const hasBreakpoint = breakpoint ?? false;
  const {
    copyNode,
    duplicateNode,
    deleteNode,
    toggleBypass,
    toggleMinimize,
    togglePin,
    toggleBreakpoint,
    updateNodeData,
    selectedNodeIds,
  } = useWorkflowStore();

  // Check if multiple nodes are selected
  const hasMultipleSelection = selectedNodeIds.size > 1;
  const isNodeSelected = selectedNodeIds.has(nodeId);
  
  // If multiple nodes are selected, use all selected node IDs; otherwise use just this node
  const getTargetNodeIds = (): string[] => {
    if (hasMultipleSelection && isNodeSelected) {
      return Array.from(selectedNodeIds);
    }
    return [nodeId];
  };

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const targetIds = getTargetNodeIds();
    copyNode(targetIds.length > 1 ? targetIds : targetIds[0]);
  };

  const handleDuplicate = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const targetIds = getTargetNodeIds();
    duplicateNode(targetIds.length > 1 ? targetIds : targetIds[0]);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const targetIds = getTargetNodeIds();
    deleteNode(targetIds.length > 1 ? targetIds : targetIds[0]);
  };

  const handleBypass = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const targetIds = getTargetNodeIds();
    toggleBypass(targetIds.length > 1 ? targetIds : targetIds[0]);
  };

  const handleFailSilently = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const targetIds = getTargetNodeIds();
    // For bulk operations, toggle based on current node's state
    targetIds.forEach((id) => {
      const node = useWorkflowStore.getState().nodes.find((n) => n.id === id);
      if (node) {
        const currentFailSilently = node.data.failSilently || false;
        updateNodeData(id, { failSilently: !currentFailSilently });
      }
    });
  };

  const handleMinMax = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const targetIds = getTargetNodeIds();
    toggleMinimize(targetIds.length > 1 ? targetIds : targetIds[0]);
  };

  const handleToggleIsTest = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const targetIds = getTargetNodeIds();
    // For bulk operations, toggle based on current node's state
    targetIds.forEach((id) => {
      const node = useWorkflowStore.getState().nodes.find((n) => n.id === id);
      if (node) {
        const currentIsTest = node.data.isTest || false;
        updateNodeData(id, { isTest: !currentIsTest });
      }
    });
  };

  const handlePin = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const targetIds = getTargetNodeIds();
    togglePin(targetIds.length > 1 ? targetIds : targetIds[0]);
  };

  const handleBreakpoint = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const targetIds = getTargetNodeIds();
    toggleBreakpoint(targetIds.length > 1 ? targetIds : targetIds[0]);
  };

  return (
    <div
      className="absolute -top-8 left-1/2 transform -translate-x-1/2 flex items-center gap-1 bg-surface border border-border rounded px-2 py-1 shadow-lg z-10"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      style={{ zIndex: 1000, pointerEvents: 'auto' }}
    >
      {!isUtilityNode && (
        <>
          <Tooltip content="Bypass">
            <button
              onClick={handleBypass}
              className={`p-1.5 rounded hover:bg-surfaceHighlight transition-colors ${
                bypass ? 'text-yellow-400' : 'text-secondary'
              }`}
            >
              <SkipForward size={14} />
            </button>
          </Tooltip>
          <Tooltip content="Fail Silently">
            <button
              onClick={handleFailSilently}
              className={`p-1.5 rounded hover:bg-surfaceHighlight transition-colors ${
                failSilently ? 'text-orange-400' : 'text-secondary'
              }`}
            >
              <AlertCircle size={14} />
            </button>
          </Tooltip>
          <Tooltip content={isTest ? 'Test Case' : 'Support Case'}>
            <button
              onClick={handleToggleIsTest}
              className={`p-1.5 rounded hover:bg-surfaceHighlight transition-colors ${
                isTest ? 'text-green-400' : 'text-secondary'
              }`}
            >
              {isTest ? <CheckSquare size={14} /> : <Wrench size={14} />}
            </button>
          </Tooltip>
        </>
      )}
      <Tooltip content={pinned ? 'Unpin' : 'Pin'}>
        <button
          onClick={handlePin}
          className={`p-1.5 rounded hover:bg-surfaceHighlight transition-colors ${
            pinned ? 'text-red-500' : 'text-secondary'
          }`}
        >
          <Pin size={14} />
        </button>
      </Tooltip>
      {!isUtilityNode && (
        <Tooltip content={hasBreakpoint ? 'Remove Breakpoint' : 'Add Breakpoint'}>
          <button
            onClick={handleBreakpoint}
            className={`p-1.5 rounded hover:bg-surfaceHighlight transition-colors ${
              hasBreakpoint ? 'text-orange-500' : 'text-secondary'
            }`}
          >
            <CircleDot size={14} />
          </button>
        </Tooltip>
      )}
      <div className="w-px h-4 bg-border mx-0.5" />
      <Tooltip content="Copy">
        <button
          onClick={handleCopy}
          className="p-1.5 rounded hover:bg-surfaceHighlight transition-colors text-secondary hover:text-blue-400"
        >
          <Copy size={14} />
        </button>
      </Tooltip>
      <Tooltip content="Duplicate">
        <button
          onClick={handleDuplicate}
          className="p-1.5 rounded hover:bg-surfaceHighlight transition-colors text-secondary hover:text-green-400"
        >
          <Files size={14} />
        </button>
      </Tooltip>
      <div className="w-px h-4 bg-border mx-0.5" />
      <Tooltip content={isMinimized ? 'Maximize' : 'Minimize'}>
        <button
          onClick={handleMinMax}
          className="p-1.5 rounded hover:bg-surfaceHighlight transition-colors text-secondary hover:text-purple-400"
        >
          {isMinimized ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
        </button>
      </Tooltip>
      <div className="w-px h-4 bg-border mx-0.5" />
      <Tooltip content="Delete">
        <button
          onClick={handleDelete}
          className="p-1.5 rounded hover:bg-surfaceHighlight transition-colors text-secondary hover:text-red-400"
        >
          <Trash2 size={14} />
        </button>
      </Tooltip>
    </div>
  );
}

