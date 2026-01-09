import { useCallback, useRef, useState, useEffect, useMemo } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useReactFlow,
  Node,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useWorkflowStore } from '../store/workflowStore';
import CustomNode from '../nodes/CustomNode';
import CustomEdge from './CustomEdge';
import ContextMenu from './ContextMenu';

const nodeTypes = {
  custom: CustomNode,
};

const edgeTypes = {
  default: CustomEdge,
};


function CanvasInner() {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, setSelectedNode, executingNodeId, onConnectStart, onConnectEnd, onEdgeUpdate, failedNodes, showErrorPopupForNode, selectedNode } = useWorkflowStore();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const reactFlowInstance = useReactFlow();
  const { screenToFlowPosition, fitView } = reactFlowInstance;
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; nodeId?: string } | null>(null);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();

      const type = e.dataTransfer.getData('application/reactflow') as any;
      if (!type || !reactFlowWrapper.current) {
        return;
      }

      const position = screenToFlowPosition({
        x: e.clientX,
        y: e.clientY,
      });

      const addNode = useWorkflowStore.getState().addNode;
      addNode(type, position);
    },
    [screenToFlowPosition]
  );

  const onNodeClick = useCallback((_e: React.MouseEvent, node: any) => {
    // If node has failed, show error popup
    if (failedNodes.has(node.id)) {
      showErrorPopupForNode(node.id);
    }
    // Node click no longer opens property panel - use context menu instead
  }, [failedNodes, showErrorPopupForNode]);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setContextMenu(null);
  }, [setSelectedNode]);

  const onNodeContextMenu = useCallback((e: React.MouseEvent, node: any) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      nodeId: node.id,
    });
  }, []);

  const onPaneContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
    });
  }, []);

  // Prevent ReactFlow from creating connections starting from input handles
  const isValidConnection = useCallback((connection: any) => {
    // Only allow connections starting from source handles (outputs)
    return connection.source && connection.sourceHandle;
  }, []);


  // Track ReactFlow's current selection
  const reactFlowSelectionRef = useRef<string | null>(null);
  
  // Track if we're currently processing a nodes change to prevent loops
  const isProcessingNodesChangeRef = useRef(false);
  
  // Use a ref to track the last nodes array to prevent unnecessary re-renders
  const lastNodesRef = useRef<Node[]>(nodes);
  const nodesContentKeyRef = useRef<string>('');
  const nodesMapRef = useRef<Map<string, Node>>(new Map());
  
  // Compare nodes by content (IDs, positions, selected state, AND data) rather than reference
  // This prevents ReactFlow from detecting changes when arrays are recreated with same content
  // Include a hash of node data to detect data changes (use a subset of important fields to avoid performance issues)
  const currentNodesContentKey = nodes.map(n => {
    const dataHash = JSON.stringify({
      url: n.data.url,
      timeout: n.data.timeout,
      selector: n.data.selector,
      text: n.data.text,
      code: n.data.code,
      value: n.data.value,
      arrayVariable: n.data.arrayVariable,
      outputVariable: n.data.outputVariable,
      waitType: n.data.waitType,
      selectorType: n.data.selectorType,
      fullPage: n.data.fullPage,
      path: n.data.path,
      browser: n.data.browser,
      maxWindow: n.data.maxWindow,
      viewportWidth: n.data.viewportWidth,
      viewportHeight: n.data.viewportHeight,
      headless: n.data.headless,
      stealthMode: n.data.stealthMode,
      userAgent: n.data.userAgent,
      waitUntil: n.data.waitUntil,
      referer: n.data.referer,
      dataType: n.data.dataType,
      label: n.data.label,
      backgroundColor: n.data.backgroundColor,
      bypass: n.data.bypass,
      isMinimized: n.data.isMinimized,
      failSilently: n.data.failSilently,
    });
    return `${n.id}:${n.position.x},${n.position.y}:${n.selected ? '1' : '0'}:${dataHash}`;
  }).join('|');
  const nodesContentChanged = nodesContentKeyRef.current !== currentNodesContentKey;
  
  // Build a map of node IDs to node objects from the last render for efficient lookup
  if (nodesContentChanged) {
    nodesMapRef.current = new Map(lastNodesRef.current.map(n => [n.id, n]));
  }
  
  // Check if node object references changed (but content is the same)
  // This happens when ReactFlow recreates node objects internally
  let nodesRefsChanged = false;
  if (!nodesContentChanged && lastNodesRef.current.length === nodes.length) {
    // Content is the same, check if any node object reference changed
    for (let i = 0; i < nodes.length; i++) {
      const currentNode = nodes[i];
      const lastNode = nodesMapRef.current.get(currentNode.id);
      if (!lastNode || currentNode !== lastNode) {
        nodesRefsChanged = true;
        break;
      }
    }
  }
  
  const mappedNodes = useMemo(() => {
    // If content hasn't changed AND node references are stable, return the previous array reference
    // This prevents ReactFlow from detecting false changes
    if (!nodesContentChanged && !nodesRefsChanged && lastNodesRef.current.length === nodes.length) {
      return lastNodesRef.current;
    }
    
    // Content or references changed, update refs and return new nodes
    lastNodesRef.current = nodes;
    nodesContentKeyRef.current = currentNodesContentKey;
    nodesMapRef.current = new Map(nodes.map(n => [n.id, n]));
    return nodes;
  }, [nodes, nodesContentChanged, nodesRefsChanged, currentNodesContentKey]);

  return (
    <div className="flex-1 relative" ref={reactFlowWrapper}>
      <ReactFlow
        nodes={mappedNodes}
        edges={edges}
        onNodesChange={(changes) => {
          // Prevent infinite loops - if we're already processing a change, ignore it
          if (isProcessingNodesChangeRef.current) {
            return;
          }
          
          // Set flag to prevent re-entry
          isProcessingNodesChangeRef.current = true;
          
          try {
            onNodesChange(changes);
          } finally {
            // Clear flag after a short delay to allow ReactFlow to finish processing
            setTimeout(() => {
              isProcessingNodesChangeRef.current = false;
            }, 10);
          }
        }}
        onSelectionChange={(params) => {
          const newSelectedId = params.nodes.length > 0 ? params.nodes[0].id : null;
          const lastReactFlowSelection = reactFlowSelectionRef.current;
          
          // Update ReactFlow's selection ref
          reactFlowSelectionRef.current = newSelectedId;
          
          // Ignore if ReactFlow's selection hasn't actually changed (prevents duplicate events)
          if (newSelectedId === lastReactFlowSelection) {
            return;
          }
          
          // Don't automatically open properties panel on node click
          // Properties panel should only open via context menu "Properties" option
          // Clear selection only when clicking on pane (handled by onPaneClick)
        }}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onConnectStart={onConnectStart}
        onConnectEnd={onConnectEnd}
        onEdgeUpdate={onEdgeUpdate}
        isValidConnection={isValidConnection}
        connectionMode="loose"
        edgesUpdatable={true}
        edgesFocusable={true}
        deleteKeyCode="Delete"
        onDrop={onDrop}
        onDragOver={onDragOver}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onNodeContextMenu={onNodeContextMenu}
        onPaneContextMenu={onPaneContextMenu}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        className="bg-gray-900"
      >
        <Background color="#4a4a4a" gap={16} />
        <Controls className="bg-gray-800 border border-gray-700" />
        <MiniMap
          className="bg-gray-800 border border-gray-700"
          nodeColor="#4a9eff"
          maskColor="rgba(0, 0, 0, 0.5)"
        />
      </ReactFlow>
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          nodeId={contextMenu.nodeId}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}

export default function Canvas() {
  const canvasReloading = useWorkflowStore((state) => state.canvasReloading);
  // Use a ref to track the reload key to ensure it changes when reloading starts
  const reloadKeyRef = useRef(0);
  
  useEffect(() => {
    if (canvasReloading) {
      reloadKeyRef.current += 1;
    }
  }, [canvasReloading]);
  
  return <CanvasInner key={`canvas-${reloadKeyRef.current}`} />;
}

