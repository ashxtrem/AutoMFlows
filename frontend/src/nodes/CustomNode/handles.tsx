import React from 'react';
import { Handle, Position } from 'reactflow';
import { NodeType } from '@automflows/shared';
import { Edge } from 'reactflow';

export interface HandleRenderingProps {
  nodeId: string;
  nodeType: NodeType | string;
  isUtilityNode: boolean;
  isSwitchNode: boolean;
  switchCases: any[];
  switchDefaultCase: any;
  hasProperties: boolean;
  isMinimized: boolean;
  currentHeight?: number;
  edgesRaw: Edge[];
  connectingHandleId: string | null;
  setConnectingHandleId: (id: string | null) => void;
  textColor: string;
  hasDriverConnection: boolean;
  hasOutputConnection: boolean;
}

export function renderDriverHandle(props: HandleRenderingProps): React.ReactNode {
  const { nodeType, isUtilityNode, connectingHandleId, setConnectingHandleId, hasDriverConnection } = props;
  
  if (isUtilityNode) return null;
  
  return (
    <Handle
      type="target"
      position={Position.Left}
      id="driver"
      className={`transition-all duration-200 ${
        connectingHandleId === 'driver' 
          ? 'connecting' 
          : hasDriverConnection 
            ? 'handle-connected' 
            : ''
      }`}
      style={{ 
        display: nodeType === NodeType.START || nodeType === 'start' ? 'none' : 'block',
        top: '50%',
        transform: 'translateY(-50%)',
        borderColor: connectingHandleId === 'driver' 
          ? '#22c55e' 
          : hasDriverConnection 
            ? '#22c55e' 
            : '#4a9eff',
      }}
      onMouseEnter={() => setConnectingHandleId('driver')}
      onMouseLeave={() => setConnectingHandleId(null)}
    />
  );
}

export function renderOutputHandles(props: HandleRenderingProps): React.ReactNode {
  const {
    nodeId,
    nodeType,
    isUtilityNode,
    isSwitchNode,
    switchCases,
    switchDefaultCase,
    hasProperties,
    isMinimized,
    currentHeight,
    edgesRaw,
    connectingHandleId,
    setConnectingHandleId,
    textColor,
    hasOutputConnection,
  } = props;

  if (isSwitchNode) {
    // Switch node: render multiple output handles
    const totalHeight = currentHeight || (hasProperties && !isMinimized ? 200 : 50);
    const totalHandles = switchCases.length + (switchDefaultCase ? 1 : 0);
    const handleSpacing = totalHeight / (totalHandles + 1);

    return (
      <>
        {/* Case handles */}
        {switchCases.map((caseItem: any, index: number) => {
          const handleId = caseItem.id || `case-${index + 1}`;
          const hasCaseConnection = edgesRaw.some(e => e.source === nodeId && e.sourceHandle === handleId);
          const caseLabel = caseItem.label || `Case ${index + 1}`;
          const topPercent = ((index + 1) * handleSpacing / totalHeight) * 100;
          
          return (
            <div key={handleId} className="absolute inset-0 pointer-events-none">
              {/* Case label */}
              <div 
                className="absolute text-xs text-gray-400 text-right pr-2"
                style={{ 
                  right: '20px',
                  top: `${topPercent}%`,
                  transform: 'translateY(-50%)',
                  color: textColor,
                }}
              >
                {caseLabel}
              </div>
              {/* Handle */}
              <Handle
                type="source"
                position={Position.Right}
                id={handleId}
                className={`transition-all duration-200 pointer-events-auto ${
                  connectingHandleId === handleId
                    ? 'connecting'
                    : hasCaseConnection
                      ? 'handle-connected'
                      : ''
                }`}
                style={{
                  top: `${topPercent}%`,
                  borderColor: connectingHandleId === handleId
                    ? '#22c55e'
                    : hasCaseConnection
                      ? '#22c55e'
                      : '#4a9eff',
                }}
                onMouseEnter={() => setConnectingHandleId(handleId)}
                onMouseLeave={() => setConnectingHandleId(null)}
              />
            </div>
          );
        })}
        {/* Default case handle */}
        {switchDefaultCase && (() => {
          const handleId = 'default';
          const hasDefaultConnection = edgesRaw.some(e => e.source === nodeId && e.sourceHandle === handleId);
          const topPercent = ((switchCases.length + 1) * handleSpacing / totalHeight) * 100;
          
          return (
            <div key={handleId} className="absolute inset-0 pointer-events-none">
              {/* Default label */}
              <div 
                className="absolute text-xs text-gray-400 text-right pr-2"
                style={{ 
                  right: '20px',
                  top: `${topPercent}%`,
                  transform: 'translateY(-50%)',
                  color: textColor,
                }}
              >
                {switchDefaultCase.label || 'Default'}
              </div>
              {/* Handle */}
              <Handle
                type="source"
                position={Position.Right}
                id={handleId}
                className={`transition-all duration-200 pointer-events-auto ${
                  connectingHandleId === handleId
                    ? 'connecting'
                    : hasDefaultConnection
                      ? 'handle-connected'
                      : ''
                }`}
                style={{
                  top: `${topPercent}%`,
                  borderColor: connectingHandleId === handleId
                    ? '#22c55e'
                    : hasDefaultConnection
                      ? '#22c55e'
                      : '#4a9eff',
                }}
                onMouseEnter={() => setConnectingHandleId(handleId)}
                onMouseLeave={() => setConnectingHandleId(null)}
              />
            </div>
          );
        })()}
      </>
    );
  }

  // Regular node: render single output handle - skip for utility nodes
  if (isUtilityNode) return null;

  return (
    <Handle
      type="source"
      position={Position.Right}
      id="output"
      className={`transition-all duration-200 ${
        connectingHandleId === 'output' 
          ? 'connecting' 
          : hasOutputConnection 
            ? 'handle-connected' 
            : ''
      }`}
      style={{ 
        display: nodeType === NodeType.START ? 'block' : 'block',
        borderColor: connectingHandleId === 'output' 
          ? '#22c55e' 
          : hasOutputConnection 
            ? '#22c55e' 
            : '#4a9eff',
      }}
      onMouseEnter={() => setConnectingHandleId('output')}
      onMouseLeave={() => setConnectingHandleId(null)}
    />
  );
}
