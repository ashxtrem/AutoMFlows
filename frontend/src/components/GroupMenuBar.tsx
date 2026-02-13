import { useEffect, useRef } from 'react';
import { Copy, Trash2, SkipForward, AlertCircle, Minimize2, Maximize2, Files, CheckSquare, Wrench, Pin, CircleDot, XSquare } from 'lucide-react';
import { useReactFlow } from 'reactflow';
import { useWorkflowStore } from '../store/workflowStore';
import Tooltip from './Tooltip';

interface GroupMenuBarProps {
  groupId: string;
}

export default function GroupMenuBar({ groupId }: GroupMenuBarProps) {
  const menuBarRef = useRef<HTMLDivElement>(null);
  const {
    groups,
    nodes,
    copyNode,
    duplicateNode,
    deleteNode,
    toggleBypass,
    toggleMinimize,
    togglePin,
    toggleBreakpoint,
    updateNodeData,
    deleteGroup,
    setSelectedGroupId,
  } = useWorkflowStore();
  const { flowToScreenPosition } = useReactFlow();

  const group = groups.find((g) => g.id === groupId);
  if (!group) return null;

  const groupNodes = nodes.filter((n) => group.nodeIds.includes(n.id));
  if (groupNodes.length === 0) return null;

  // Get aggregate states from group nodes
  const allBypassed = groupNodes.every((n) => n.data.bypass === true);
  const allMinimized = groupNodes.every((n) => n.data.isMinimized === true);
  const allPinned = groupNodes.every((n) => n.data.isPinned === true);
  const allHaveBreakpoint = groupNodes.every((n) => n.data.breakpoint === true);
  const allTest = groupNodes.every((n) => n.data.isTest === true);
  const allFailSilently = groupNodes.every((n) => n.data.failSilently === true);

  const getTargetNodeIds = (): string[] => {
    return group.nodeIds;
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
    // Show confirmation dialog
    if (window.confirm(`Delete group "${group.name}" and all ${targetIds.length} nodes?`)) {
      deleteNode(targetIds);
      deleteGroup(groupId);
    }
  };

  const handleUngroup = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    // Delete group without deleting nodes
    deleteGroup(groupId);
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
    // For bulk operations, toggle based on current state
    targetIds.forEach((id) => {
      const node = nodes.find((n) => n.id === id);
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
    // For bulk operations, toggle based on current state
    targetIds.forEach((id) => {
      const node = nodes.find((n) => n.id === id);
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

  // Handle click outside to close menu bar
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (menuBarRef.current && !menuBarRef.current.contains(target)) {
        // Check if clicking on group header or boundary - don't close in that case
        const isGroupElement = (target as HTMLElement)?.closest('.group-header') || 
                              (target as HTMLElement)?.closest('.react-flow__group-boundary');
        if (!isGroupElement) {
          setSelectedGroupId(null);
        }
      }
    };

    // Use capture phase to catch events before ReactFlow handles them
    document.addEventListener('mousedown', handleClickOutside, true);
    document.addEventListener('touchstart', handleClickOutside, true);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
      document.removeEventListener('touchstart', handleClickOutside, true);
    };
  }, [groupId]);

  // Calculate position for menu bar (above group header) in screen coordinates
  const screenPos = flowToScreenPosition({
    x: group.position.x + group.width / 2,
    y: group.position.y - 40,
  });
  
  const menuBarStyle: React.CSSProperties = {
    position: 'fixed',
    left: `${screenPos.x}px`,
    top: `${screenPos.y}px`,
    transform: 'translateX(-50%)',
    zIndex: 1000,
    pointerEvents: 'auto',
  };

  return (
    <div
      ref={menuBarRef}
      className="flex items-center gap-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 shadow-lg"
      style={menuBarStyle}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <Tooltip content="Bypass">
        <button
          onClick={handleBypass}
          className={`p-1.5 rounded hover:bg-gray-700 transition-colors ${
            allBypassed ? 'text-yellow-400' : 'text-gray-400'
          }`}
        >
          <SkipForward size={14} />
        </button>
      </Tooltip>
      <Tooltip content="Fail Silently">
        <button
          onClick={handleFailSilently}
          className={`p-1.5 rounded hover:bg-gray-700 transition-colors ${
            allFailSilently ? 'text-orange-400' : 'text-gray-400'
          }`}
        >
          <AlertCircle size={14} />
        </button>
      </Tooltip>
      <Tooltip content={allTest ? 'Test Case' : 'Support Case'}>
        <button
          onClick={handleToggleIsTest}
          className={`p-1.5 rounded hover:bg-gray-700 transition-colors ${
            allTest ? 'text-green-400' : 'text-gray-400'
          }`}
        >
          {allTest ? <CheckSquare size={14} /> : <Wrench size={14} />}
        </button>
      </Tooltip>
      <Tooltip content={allPinned ? 'Unpin' : 'Pin'}>
        <button
          onClick={handlePin}
          className={`p-1.5 rounded hover:bg-gray-700 transition-colors ${
            allPinned ? 'text-red-500' : 'text-gray-400'
          }`}
        >
          <Pin size={14} />
        </button>
      </Tooltip>
      <Tooltip content={allHaveBreakpoint ? 'Remove Breakpoint' : 'Add Breakpoint'}>
        <button
          onClick={handleBreakpoint}
          className={`p-1.5 rounded hover:bg-gray-700 transition-colors ${
            allHaveBreakpoint ? 'text-orange-500' : 'text-gray-400'
          }`}
        >
          <CircleDot size={14} />
        </button>
      </Tooltip>
      <div className="w-px h-4 bg-gray-700 mx-0.5" />
      <Tooltip content="Copy">
        <button
          onClick={handleCopy}
          className="p-1.5 rounded hover:bg-gray-700 transition-colors text-gray-400 hover:text-blue-400"
        >
          <Copy size={14} />
        </button>
      </Tooltip>
      <Tooltip content="Duplicate">
        <button
          onClick={handleDuplicate}
          className="p-1.5 rounded hover:bg-gray-700 transition-colors text-gray-400 hover:text-green-400"
        >
          <Files size={14} />
        </button>
      </Tooltip>
      <div className="w-px h-4 bg-gray-700 mx-0.5" />
      <Tooltip content={allMinimized ? 'Maximize' : 'Minimize'}>
        <button
          onClick={handleMinMax}
          className="p-1.5 rounded hover:bg-gray-700 transition-colors text-gray-400 hover:text-purple-400"
        >
          {allMinimized ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
        </button>
      </Tooltip>
      <div className="w-px h-4 bg-gray-700 mx-0.5" />
      <Tooltip content="Ungroup (remove group, keep nodes)">
        <button
          onClick={handleUngroup}
          className="p-1.5 rounded hover:bg-gray-700 transition-colors text-gray-400 hover:text-yellow-400"
        >
          <XSquare size={14} />
        </button>
      </Tooltip>
      <Tooltip content="Delete group and nodes">
        <button
          onClick={handleDelete}
          className="p-1.5 rounded hover:bg-gray-700 transition-colors text-gray-400 hover:text-red-400"
        >
          <Trash2 size={14} />
        </button>
      </Tooltip>
    </div>
  );
}
