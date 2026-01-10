import { Copy, Trash2, SkipForward, AlertCircle, Minimize2, Maximize2, Files, CheckSquare, Wrench } from 'lucide-react';
import { useWorkflowStore } from '../store/workflowStore';
import Tooltip from './Tooltip';

interface NodeMenuBarProps {
  nodeId: string;
  bypass?: boolean;
  failSilently?: boolean;
  isMinimized?: boolean;
  isTest?: boolean;
}

export default function NodeMenuBar({ nodeId, bypass, failSilently, isMinimized, isTest }: NodeMenuBarProps) {
  const {
    copyNode,
    duplicateNode,
    deleteNode,
    toggleBypass,
    toggleMinimize,
    updateNodeData,
  } = useWorkflowStore();

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    copyNode(nodeId);
  };

  const handleDuplicate = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    duplicateNode(nodeId);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    deleteNode(nodeId);
  };

  const handleBypass = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    toggleBypass(nodeId);
  };

  const handleFailSilently = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    updateNodeData(nodeId, { failSilently: !failSilently });
  };

  const handleMinMax = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    toggleMinimize(nodeId);
  };

  const handleToggleIsTest = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    updateNodeData(nodeId, { isTest: !isTest });
  };

  return (
    <div
      className="absolute -top-8 left-1/2 transform -translate-x-1/2 flex items-center gap-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 shadow-lg z-10"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      style={{ zIndex: 1000, pointerEvents: 'auto' }}
    >
      <Tooltip content="Bypass">
        <button
          onClick={handleBypass}
          className={`p-1.5 rounded hover:bg-gray-700 transition-colors ${
            bypass ? 'text-yellow-400' : 'text-gray-400'
          }`}
        >
          <SkipForward size={14} />
        </button>
      </Tooltip>
      <Tooltip content="Fail Silently">
        <button
          onClick={handleFailSilently}
          className={`p-1.5 rounded hover:bg-gray-700 transition-colors ${
            failSilently ? 'text-orange-400' : 'text-gray-400'
          }`}
        >
          <AlertCircle size={14} />
        </button>
      </Tooltip>
      <Tooltip content={isTest ? 'Test Case' : 'Support Case'}>
        <button
          onClick={handleToggleIsTest}
          className={`p-1.5 rounded hover:bg-gray-700 transition-colors ${
            isTest ? 'text-green-400' : 'text-gray-400'
          }`}
        >
          {isTest ? <CheckSquare size={14} /> : <Wrench size={14} />}
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
      <Tooltip content={isMinimized ? 'Maximize' : 'Minimize'}>
        <button
          onClick={handleMinMax}
          className="p-1.5 rounded hover:bg-gray-700 transition-colors text-gray-400 hover:text-purple-400"
        >
          {isMinimized ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
        </button>
      </Tooltip>
      <div className="w-px h-4 bg-gray-700 mx-0.5" />
      <Tooltip content="Delete">
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

