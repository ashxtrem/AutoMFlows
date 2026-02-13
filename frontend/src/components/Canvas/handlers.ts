import { useCallback, useRef, useState, useEffect } from 'react';
import { Node } from 'reactflow';
import { useWorkflowStore } from '../../store/workflowStore';
import { ContextMenuState, SearchOverlayState, MouseDownState } from './types';

export interface UseCanvasHandlersProps {
  screenToFlowPosition: (position: { x: number; y: number }) => { x: number; y: number };
  setNodes: (nodes: Node[] | ((nodes: Node[]) => Node[])) => void;
  getNodes: () => Node[];
  reactFlowWrapper: React.RefObject<HTMLDivElement>;
  hideSidebar?: () => void;
}

export interface UseCanvasHandlersReturn {
  contextMenu: ContextMenuState | null;
  setContextMenu: React.Dispatch<React.SetStateAction<ContextMenuState | null>>;
  searchOverlay: SearchOverlayState | null;
  setSearchOverlay: React.Dispatch<React.SetStateAction<SearchOverlayState | null>>;
  onNodeClick: (e: React.MouseEvent, node: any) => void;
  onPaneClick: (e: React.MouseEvent) => void;
  onNodeContextMenu: (e: React.MouseEvent, node: any) => void;
  onPaneContextMenu: (e: React.MouseEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  handleNodeSelect: (nodeType: string, flowPosition: { x: number; y: number }) => void;
  handleWrapperClick: (e: React.MouseEvent<HTMLDivElement>) => void;
  handleWrapperDoubleClick: (e: React.MouseEvent<HTMLDivElement>) => void;
  handleWrapperMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void;
  handleWrapperContextMenu: (e: React.MouseEvent<HTMLDivElement>) => void;
  isValidConnection: (connection: any) => boolean;
  lastClickRef: React.MutableRefObject<{ time: number; x: number; y: number } | null>;
  doubleClickTimeoutRef: React.MutableRefObject<NodeJS.Timeout | null>;
  isClearingSelectionRef: React.MutableRefObject<boolean>;
  lastSelectionChangeTimeRef: React.MutableRefObject<number>;
  mouseDownRef: React.MutableRefObject<MouseDownState | null>;
}

export function useCanvasHandlers({
  screenToFlowPosition,
  setNodes,
  getNodes,
  reactFlowWrapper,
  hideSidebar,
}: UseCanvasHandlersProps): UseCanvasHandlersReturn {
  const { 
    setSelectedNodeIds, 
    setSelectedGroupId,
    failedNodes,
    showErrorPopupForNode,
    selectedNodeIds,
    nodes,
  } = useWorkflowStore();

  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [searchOverlay, setSearchOverlay] = useState<SearchOverlayState | null>(null);
  
  // Refs for double-click detection and selection management
  const lastClickRef = useRef<{ time: number; x: number; y: number } | null>(null);
  const doubleClickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isClearingSelectionRef = useRef(false);
  const lastSelectionChangeTimeRef = useRef<number>(0);
  const mouseDownRef = useRef<MouseDownState | null>(null);
  
  // Ref to access setContextMenu in event handlers
  const setContextMenuRef = useRef(setContextMenu);
  useEffect(() => {
    setContextMenuRef.current = setContextMenu;
  }, [setContextMenu]);

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
    [screenToFlowPosition, reactFlowWrapper]
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const onNodeClick = useCallback((e: React.MouseEvent, node: any) => {
    // If node has failed, show error popup
    if (failedNodes.has(node.id)) {
      showErrorPopupForNode(node.id);
    }
    
    // Handle Ctrl/Cmd+Click for toggle selection
    const isModifierPressed = e.metaKey || e.ctrlKey;
    if (isModifierPressed) {
      e.preventDefault();
      e.stopPropagation();
      
      const currentState = useWorkflowStore.getState();
      const currentSelectedIds = Array.from(currentState.selectedNodeIds);
      
      if (currentSelectedIds.includes(node.id)) {
        // Deselect this node
        const newSelectedIds = currentSelectedIds.filter((id) => id !== node.id);
        setSelectedNodeIds(newSelectedIds);
        // Update ReactFlow selection
        setNodes((nds) =>
          nds.map((n) => ({
            ...n,
            selected: newSelectedIds.includes(n.id),
          }))
        );
      } else {
        // Add this node to selection
        const newSelectedIds = [...currentSelectedIds, node.id];
        setSelectedNodeIds(newSelectedIds);
        // Update ReactFlow selection
        setNodes((nds) =>
          nds.map((n) => ({
            ...n,
            selected: newSelectedIds.includes(n.id),
          }))
        );
      }
    }
    // Node click no longer opens property panel - use context menu instead
  }, [failedNodes, showErrorPopupForNode, setSelectedNodeIds, setNodes]);

  const onPaneClick = useCallback((e: React.MouseEvent) => {
    const now = Date.now();
    const clickX = e.clientX;
    const clickY = e.clientY;
    
    // Check if this is a double-click (within 300ms and 10px distance)
    if (lastClickRef.current) {
      const timeDiff = now - lastClickRef.current.time;
      const distance = Math.sqrt(
        Math.pow(clickX - lastClickRef.current.x, 2) + 
        Math.pow(clickY - lastClickRef.current.y, 2)
      );
      
      if (timeDiff < 300 && distance < 10) {
        // Clear timeout if exists
        if (doubleClickTimeoutRef.current) {
          clearTimeout(doubleClickTimeoutRef.current);
          doubleClickTimeoutRef.current = null;
        }
        
        // Reset last click
        lastClickRef.current = null;
        
        // Prevent default behavior
        e.preventDefault();
        e.stopPropagation();
        
        // Note: Double-click detection in onPaneClick is kept for compatibility,
        // but actual double-click handling is done via handleWrapperDoubleClick
        // which opens CanvasSearchOverlay
        
        return;
      }
    }
    
    // Clear any existing timeout
    if (doubleClickTimeoutRef.current) {
      clearTimeout(doubleClickTimeoutRef.current);
    }
    
    // Set timeout to clear lastClickRef after delay
    doubleClickTimeoutRef.current = setTimeout(() => {
      lastClickRef.current = null;
    }, 300);
    
    // Store this click for potential double-click detection
    lastClickRef.current = { time: now, x: clickX, y: clickY };
    
    // Normal single-click behavior - clear selection
    // Set flag to prevent onSelectionChange from interfering
    isClearingSelectionRef.current = true;
    
    // Clear selectedNodeIds but preserve selectedNode (Properties panel should stay open)
    // selectedNode should only be cleared when explicitly closing the sidebar, not when clicking on pane
    setSelectedNodeIds([]);
    
    // Also clear ReactFlow selection state - use getNodes() to get current ReactFlow state
    const currentNodes = getNodes();
    const nodesToUpdate = currentNodes.filter(n => n.selected);
    
    if (nodesToUpdate.length > 0) {
      setNodes((nds) =>
        nds.map((node) => ({
          ...node,
          selected: false,
        }))
      );
    }
    
    // Clear flag after a short delay to allow ReactFlow to process
    setTimeout(() => {
      isClearingSelectionRef.current = false;
    }, 50);
    setSelectedGroupId(null);
    setContextMenu(null);
    setSearchOverlay(null);
    
    // Hide sidebar if unpinned
    if (hideSidebar) {
      hideSidebar();
    }
  }, [setSelectedNodeIds, screenToFlowPosition, hideSidebar, setSelectedGroupId, setNodes, getNodes]);

  const handleNodeSelect = useCallback((nodeType: string, flowPosition: { x: number; y: number }) => {
    const addNode = useWorkflowStore.getState().addNode;
    addNode(nodeType, flowPosition);
    setSearchOverlay(null);
  }, []);

  const onNodeContextMenu = useCallback((e: React.MouseEvent, node: any) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      nodeId: node.id,
    });
  }, []);

  const onPaneContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Calculate flow position for node placement
    const flowPosition = screenToFlowPosition({
      x: e.clientX,
      y: e.clientY,
    });
    
    // If we have selected nodes, check if right-click is over one of them
    // This handles right-click on selection box overlay or selected nodes
    if (selectedNodeIds.size > 0) {
      // Find the node under the cursor position (check all selected nodes)
      const clickedNode = nodes.find(node => {
        if (!selectedNodeIds.has(node.id)) return false;
        const nodeX = node.position.x;
        const nodeY = node.position.y;
        const nodeWidth = node.width || node.data?.width || 200;
        const nodeHeight = node.height || node.data?.height || 100;
        
        return flowPosition.x >= nodeX && flowPosition.x <= nodeX + nodeWidth &&
               flowPosition.y >= nodeY && flowPosition.y <= nodeY + nodeHeight;
      });
      
      if (clickedNode) {
        setContextMenu({
          x: e.clientX,
          y: e.clientY,
          nodeId: clickedNode.id,
        });
        return;
      }
    }
    
    // Calculate position relative to canvas container for overlay display
    let screenPosition = { x: e.clientX, y: e.clientY };
    if (reactFlowWrapper.current) {
      const rect = reactFlowWrapper.current.getBoundingClientRect();
      screenPosition = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
    
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      flowPosition,
      screenPosition,
    });
  }, [screenToFlowPosition, selectedNodeIds, nodes, reactFlowWrapper]);

  // Prevent ReactFlow from creating connections starting from input handles
  const isValidConnection = useCallback((connection: any) => {
    // Only allow connections starting from source handles (outputs)
    return connection.source && connection.sourceHandle;
  }, []);

  // Track mouse down to detect drag vs click
  const handleWrapperMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    mouseDownRef.current = {
      time: Date.now(),
      x: e.clientX,
      y: e.clientY,
    };
  }, []);

  // Handle click on wrapper div to clear selection when clicking on pane
  const handleWrapperClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Only handle if clicking directly on the wrapper or pane (not on nodes or other elements)
    const target = e.target as HTMLElement;
    const isNode = target.closest('.react-flow__node');
    const isControl = target.closest('.react-flow__controls');
    const isGroupBoundary = target.closest('.react-flow__group-boundary');
    // Check for selection box - ReactFlow creates this during drag selection
    // Only check for the actual selection box element, not just any element with "selection" in className
    const isSelectionBox = target.closest('.react-flow__nodesselection');
    
    // If clicking on node, control, group boundary, or selection box, let ReactFlow handle it
    if (isNode || isControl || isGroupBoundary || isSelectionBox) {
      return;
    }
    
    // Check if we have selected nodes
    const currentSelectedIds = Array.from(useWorkflowStore.getState().selectedNodeIds);
    if (currentSelectedIds.length === 0) {
      return;
    }
    
    // Check if this was a drag (mouse moved significantly) vs a click
    const mouseDown = mouseDownRef.current;
    if (mouseDown) {
      const distance = Math.sqrt(
        Math.pow(e.clientX - mouseDown.x, 2) + 
        Math.pow(e.clientY - mouseDown.y, 2)
      );
      const timeDiff = Date.now() - mouseDown.time;
      
      // If mouse moved more than 5px or took more than 200ms, it was likely a drag
      if (distance > 5 || timeDiff > 200) {
        mouseDownRef.current = null;
        return;
      }
    }
    
    // Also check if selection just changed (likely from drag selection completion)
    // If selection changed within the last 500ms, this click is probably from drag selection release
    const timeSinceLastSelectionChange = Date.now() - lastSelectionChangeTimeRef.current;
    if (timeSinceLastSelectionChange < 500) {
      mouseDownRef.current = null;
      return;
    }
    
    mouseDownRef.current = null;
    
    // Set flag to prevent onSelectionChange from interfering
    isClearingSelectionRef.current = true;
    
    // Clear selectedNodeIds but preserve selectedNode (Properties panel should stay open)
    setSelectedNodeIds([]);
    
    // Clear ReactFlow selection state
    const currentNodes = getNodes();
    const nodesToUpdate = currentNodes.filter(n => n.selected);
    if (nodesToUpdate.length > 0) {
      setNodes((nds) =>
        nds.map((node) => ({
          ...node,
          selected: false,
        }))
      );
    }
    
    // Clear flag after a short delay
    setTimeout(() => {
      isClearingSelectionRef.current = false;
    }, 50);
  }, [setSelectedNodeIds, getNodes, setNodes]);

  // Handle double-click on wrapper div (ReactFlow's onPaneClick doesn't fire for double-clicks)
  const handleWrapperDoubleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    // Only handle if clicking on the pane (not on nodes, groups, or other elements)
    const isNode = target.closest('.react-flow__node');
    const isControl = target.closest('.react-flow__controls');
    const isGroupBoundary = target.closest('.react-flow__group-boundary');
    const isSelectionBox = target.closest('.react-flow__nodesselection');
    const isContextMenu = target.closest('[role="menu"]') || target.closest('.fixed.bg-gray-800');
    
    // If clicking on node, control, group boundary, selection box, or context menu, ignore
    if (isNode || isControl || isGroupBoundary || isSelectionBox || isContextMenu) {
      return;
    }
    
    e.preventDefault();
    e.stopPropagation();
    
    // Convert screen coordinates to flow coordinates for node placement
    const flowPosition = screenToFlowPosition({
      x: e.clientX,
      y: e.clientY,
    });
    
    // Calculate position relative to canvas container for overlay display
    if (reactFlowWrapper.current) {
      const rect = reactFlowWrapper.current.getBoundingClientRect();
      const relativeX = e.clientX - rect.left;
      const relativeY = e.clientY - rect.top;
      
      // Open CanvasSearchOverlay (node menu) - same as right-click "Add Node"
      setSearchOverlay({
        screen: { x: relativeX, y: relativeY },
        flow: flowPosition,
      });
    }
  }, [screenToFlowPosition, reactFlowWrapper]);

  // Handle contextmenu directly on wrapper div using oncontextmenu attribute
  // This fires early and prevents system menu, but doesn't stop propagation
  // so ReactFlow's handlers can still fire to show our custom menu
  const handleWrapperContextMenu = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target) {
      const isReactFlowPane = target.closest('.react-flow__pane');
      const isNode = target.closest('.react-flow__node');
      const isReactFlowElement = target.closest('.react-flow') !== null;
      if (isReactFlowPane || isNode || isReactFlowElement) {
        // Prevent default to stop system menu, but DON'T stop propagation
        // so ReactFlow's handlers can still fire
        e.preventDefault();
      }
    }
    return false; // Additional prevention for older browsers
  }, []);

  return {
    contextMenu,
    setContextMenu,
    searchOverlay,
    setSearchOverlay,
    onNodeClick,
    onPaneClick,
    onNodeContextMenu,
    onPaneContextMenu,
    onDrop,
    onDragOver,
    handleNodeSelect,
    handleWrapperClick,
    handleWrapperDoubleClick,
    handleWrapperMouseDown,
    handleWrapperContextMenu,
    isValidConnection,
    lastClickRef,
    doubleClickTimeoutRef,
    isClearingSelectionRef,
    lastSelectionChangeTimeRef,
    mouseDownRef,
  };
}
