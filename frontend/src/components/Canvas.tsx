import { useCallback, useRef, useState, useEffect, useMemo } from 'react';
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  useReactFlow,
  Node,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useWorkflowStore } from '../store/workflowStore';
import CustomNode from '../nodes/CustomNode';
import CustomEdge from './CustomEdge';
import ContextMenu from './ContextMenu';
import CanvasSearchOverlay from './CanvasSearchOverlay';
import { useShortcutNavigation } from '../hooks/useShortcutNavigation';

const nodeTypes = {
  custom: CustomNode,
};

const edgeTypes = {
  default: CustomEdge,
};

// Module-level variable to track if initial fitView has run (persists across component remounts)
// This is necessary because React.StrictMode in development causes remounts which reset refs
let hasRunInitialFitViewGlobal = false;
// Module-level variable to store the last known viewport (persists across StrictMode remounts)
// This prevents viewport reset when React.StrictMode causes unexpected remounts
let lastKnownViewport: { x: number; y: number; zoom: number } | null = null;

// LocalStorage key for persisting viewport across page refreshes
const VIEWPORT_STORAGE_KEY = 'reactflow-viewport';

// Helper functions for localStorage persistence
const saveViewportToStorage = (viewport: { x: number; y: number; zoom: number }) => {
  try {
    localStorage.setItem(VIEWPORT_STORAGE_KEY, JSON.stringify(viewport));
  } catch (error) {
    // Ignore localStorage errors (e.g., quota exceeded, private browsing)
    console.warn('Failed to save viewport to localStorage:', error);
  }
};

const loadViewportFromStorage = (): { x: number; y: number; zoom: number } | null => {
  try {
    const stored = localStorage.getItem(VIEWPORT_STORAGE_KEY);
    if (stored) {
      const viewport = JSON.parse(stored);
      // Validate viewport structure
      if (viewport && typeof viewport.x === 'number' && typeof viewport.y === 'number' && typeof viewport.zoom === 'number') {
        return viewport;
      }
    }
  } catch (error) {
    // Ignore localStorage errors
    console.warn('Failed to load viewport from localStorage:', error);
  }
  return null;
};

interface CanvasInnerProps {
  savedViewportRef: React.MutableRefObject<{ x: number; y: number; zoom: number } | null>;
  reactFlowInstanceRef: React.MutableRefObject<ReturnType<typeof useReactFlow> | null>;
  isFirstMountRef: React.MutableRefObject<boolean>;
  hasRunInitialFitViewRef: React.MutableRefObject<boolean>;
}

function CanvasInner({ savedViewportRef, reactFlowInstanceRef, isFirstMountRef, hasRunInitialFitViewRef }: CanvasInnerProps) {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, setSelectedNode, onConnectStart, onConnectEnd, onEdgeUpdate, failedNodes, showErrorPopupForNode, canvasReloading } = useWorkflowStore();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const reactFlowInstance = useReactFlow();
  const { screenToFlowPosition, getViewport, setViewport: originalSetViewport, fitView } = reactFlowInstance;
  
  // Enable shortcut navigation
  useShortcutNavigation();
  
  // Wrap setViewport to update lastKnownViewport and localStorage
  const setViewport = useCallback((viewport: { x: number; y: number; zoom: number }, options?: { duration?: number }) => {
    // Update module-level lastKnownViewport to persist across remounts
    // Only update if viewport is not default (0,0,1) to avoid overwriting with default during remounts
    if (!(viewport.x === 0 && viewport.y === 0 && viewport.zoom === 1)) {
      lastKnownViewport = viewport;
      // Save to localStorage for page refresh persistence
      saveViewportToStorage(viewport);
    }
    originalSetViewport(viewport, options);
  }, [originalSetViewport, getViewport]);
  
  // Store ReactFlow instance in parent's ref so it can save viewport before remount
  useEffect(() => {
    reactFlowInstanceRef.current = reactFlowInstance;
  }, [reactFlowInstance, reactFlowInstanceRef]);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; nodeId?: string; flowPosition?: { x: number; y: number }; screenPosition?: { x: number; y: number } } | null>(null);
  const [searchOverlay, setSearchOverlay] = useState<{ screen: { x: number; y: number }; flow: { x: number; y: number } } | null>(null);
  
  // Double-click detection using timing
  const lastClickRef = useRef<{ time: number; x: number; y: number } | null>(null);
  const doubleClickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Edge visibility state from store
  const edgesHidden = useWorkflowStore((state) => state.edgesHidden);
  
  // Track if we've restored viewport after remount (local to this instance)
  const hasRestoredViewportRef = useRef(false);
  
  // Watch for viewport resets and restore from lastKnownViewport if needed
  // This handles cases where ReactFlow resets viewport to default (0,0,1) unexpectedly
  useEffect(() => {
    const checkAndRestoreViewport = () => {
      const currentViewport = getViewport();
      const isDefaultViewport = currentViewport.x === 0 && currentViewport.y === 0 && currentViewport.zoom === 1;
      
      // If viewport is default but we have a lastKnownViewport that's not default, restore it
      if (isDefaultViewport && lastKnownViewport && 
          !(lastKnownViewport.x === 0 && lastKnownViewport.y === 0 && lastKnownViewport.zoom === 1)) {
        setViewport(lastKnownViewport, { duration: 0 });
      }
    };
    
    // Check immediately and then periodically
    checkAndRestoreViewport();
    const interval = setInterval(checkAndRestoreViewport, 50); // Check every 50ms
    return () => clearInterval(interval);
  }, [getViewport, setViewport]);
  
  // Restore viewport after remount (if we have a saved viewport)
  useEffect(() => {
    if (savedViewportRef.current && !hasRestoredViewportRef.current) {
      hasRestoredViewportRef.current = true;
      const viewportToRestore = savedViewportRef.current;
      // DO NOT clear savedViewportRef.current here - keep it until restore completes
      // This prevents the save effect from overwriting it with default viewport
      // Small delay to ensure ReactFlow is ready after remount
      setTimeout(() => {
        // Check if viewport is still the one we want to restore (hasn't been overwritten)
        if (savedViewportRef.current === viewportToRestore) {
          setViewport(viewportToRestore, { duration: 0 });
          // Clear saved viewport AFTER restore completes
          savedViewportRef.current = null;
        }
      }, 150);
    }
  }, [setViewport, getViewport]);
  
  // Track the last nodes.length to detect actual changes (not just effect re-runs)
  const lastNodesLengthRef = useRef<number>(0);
  
  // Fit view on first mount only (when canvas first loads with nodes, not on remounts)
  // IMPORTANT: Only run if we DON'T have a saved viewport (which means this is a true first mount, not a remount)
  // Use module-level variable to persist across component remounts (React.StrictMode in dev causes remounts)
  useEffect(() => {
    const previousNodesLength = lastNodesLengthRef.current;
    const nodesLengthChanged = previousNodesLength !== nodes.length;
    lastNodesLengthRef.current = nodes.length;
    
    // Only fitView on first mount, and only if we don't have a saved viewport to restore
    // If savedViewportRef.current exists, this is a remount and we should restore instead
    // Also skip fitView if we have a lastKnownViewport (from localStorage or previous session)
    // Check both ref and module-level variable to prevent re-running
    // Only run if nodes.length changed from 0 to >0 (true initial load, not a remount or update)
    if (!savedViewportRef.current && !hasRunInitialFitViewGlobal && !lastKnownViewport && 
        nodesLengthChanged && previousNodesLength === 0 && nodes.length > 0) {
      hasRunInitialFitViewGlobal = true;
      isFirstMountRef.current = false;
      hasRunInitialFitViewRef.current = true;
      // Small delay to ensure ReactFlow is ready
      setTimeout(() => {
        fitView({ duration: 0 });
      }, 100);
    }
  }, [nodes.length]); // Removed fitView and getViewport from dependencies to prevent re-runs

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
        
        // Convert screen coordinates to flow coordinates for node placement
        const flowPosition = screenToFlowPosition({
          x: clickX,
          y: clickY,
        });
        
        // Calculate position relative to canvas container for overlay display
        if (reactFlowWrapper.current) {
          const rect = reactFlowWrapper.current.getBoundingClientRect();
          const relativeX = clickX - rect.left;
          const relativeY = clickY - rect.top;
          
          setSearchOverlay({
            screen: { x: relativeX, y: relativeY },
            flow: flowPosition,
          });
        }
        
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
    
    // Normal single-click behavior
    setSelectedNode(null);
    setContextMenu(null);
    setSearchOverlay(null);
  }, [setSelectedNode, screenToFlowPosition]);


  const handleNodeSelect = useCallback((nodeType: string, flowPosition: { x: number; y: number }) => {
    const addNode = useWorkflowStore.getState().addNode;
    addNode(nodeType, flowPosition);
    setSearchOverlay(null);
  }, []);

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
    
    // Calculate flow position for node placement
    const flowPosition = screenToFlowPosition({
      x: e.clientX,
      y: e.clientY,
    });
    
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
  }, [screenToFlowPosition]);

  // Prevent ReactFlow from creating connections starting from input handles
  const isValidConnection = useCallback((connection: any) => {
    // Only allow connections starting from source handles (outputs)
    return connection.source && connection.sourceHandle;
  }, []);


  // Track ReactFlow's current selection
  const reactFlowSelectionRef = useRef<string | null>(null);
  
  // Track if we're currently processing a nodes change to prevent loops
  const isProcessingNodesChangeRef = useRef(false);
  
  // Save viewport BEFORE remount happens (when canvasReloading becomes true)
  // CRITICAL: Only save if we don't already have a saved viewport (prevents new instance from overwriting)
  useEffect(() => {
    // Only save if canvasReloading is true AND we don't already have a saved viewport
    // This prevents the new instance (after remount) from overwriting the viewport saved by the old instance
    if (canvasReloading && !savedViewportRef.current) {
      const viewport = getViewport();
      // Only save if viewport is not the default (0,0,1) - this means we're on the old instance, not a new mount
      if (viewport.x !== 0 || viewport.y !== 0 || viewport.zoom !== 1) {
        savedViewportRef.current = viewport;
        hasRestoredViewportRef.current = false; // Reset restore flag for next remount
      }
    }
  }, [canvasReloading, getViewport]);
  
  // Navigate to failed node function
  const navigateToFailedNode = useCallback(() => {
    if (failedNodes.size === 0) {
      return;
    }
    
    // Get the first failed node ID
    const firstFailedNodeId = Array.from(failedNodes.keys())[0];
    const failedNode = nodes.find(n => n.id === firstFailedNodeId);
    
    if (failedNode) {
      // Use fitView to focus on the failed node
      fitView({
        nodes: [{ id: firstFailedNodeId }],
        padding: 0.2,
        duration: 300,
      });
    }
  }, [failedNodes, nodes, fitView]);
  
  // Expose navigation function to store for TopBar access
  useEffect(() => {
    useWorkflowStore.getState().setNavigateToFailedNode(navigateToFailedNode);
  }, [navigateToFailedNode]);
  
  // Navigate to paused node function
  const navigateToPausedNode = useCallback(() => {
    const pausedNodeId = useWorkflowStore.getState().pausedNodeId;
    if (!pausedNodeId) {
      return;
    }
    
    const pausedNode = nodes.find(n => n.id === pausedNodeId);
    
    if (pausedNode) {
      // Use fitView to focus on the paused node
      fitView({
        nodes: [{ id: pausedNodeId }],
        padding: 0.2,
        duration: 300,
      });
    }
  }, [nodes, fitView]);
  
  // Expose navigation function to store for FloatingRunButton access
  useEffect(() => {
    useWorkflowStore.getState().setNavigateToPausedNode(navigateToPausedNode);
  }, [navigateToPausedNode]);
  
  // Keyboard shortcut for failed node navigation (Ctrl/Cmd + Shift + F)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isModifierPressed = e.metaKey || e.ctrlKey;
      if (isModifierPressed && e.shiftKey && e.key === 'F') {
        e.preventDefault();
        navigateToFailedNode();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [navigateToFailedNode]);
  
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
      waitUntil: n.data.waitUntil,
      referer: n.data.referer,
      dataType: n.data.dataType,
      label: n.data.label,
      backgroundColor: n.data.backgroundColor,
      bypass: n.data.bypass,
      isMinimized: n.data.isMinimized,
      failSilently: n.data.failSilently,
      isPinned: n.data.isPinned,
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
    
    // Content or references changed, update refs and return new nodes with draggable property
    const nodesWithDraggable = nodes.map(node => ({
      ...node,
      draggable: !node.data.isPinned,
    }));
    lastNodesRef.current = nodesWithDraggable;
    nodesContentKeyRef.current = currentNodesContentKey;
    nodesMapRef.current = new Map(nodes.map(n => [n.id, n]));
    return nodesWithDraggable;
  }, [nodes, nodesContentChanged, nodesRefsChanged, currentNodesContentKey]);

  // Map edges with hidden property and animated prop based on edgesHidden state
  const mappedEdges = useMemo(() => {
    return edges.map(edge => ({
      ...edge,
      hidden: edgesHidden,
      animated: true, // Enable animation for all edges
    }));
  }, [edges, edgesHidden]);

  // Load viewport from localStorage on mount (for page refresh persistence)
  useEffect(() => {
    // Only load from localStorage if we don't have a saved viewport from remount
    // and if lastKnownViewport is not already set (first mount after page refresh)
    if (!savedViewportRef.current && !lastKnownViewport) {
      const storedViewport = loadViewportFromStorage();
      if (storedViewport && !(storedViewport.x === 0 && storedViewport.y === 0 && storedViewport.zoom === 1)) {
        lastKnownViewport = storedViewport;
      }
    }
  }, []);

  // Handle ReactFlow initialization - restore viewport if we have one saved
  const onInit = useCallback(() => {
    // Priority 1: Restore from savedViewportRef (from canvasReloading remount)
    if (savedViewportRef.current && !hasRestoredViewportRef.current) {
      const viewportToRestore = savedViewportRef.current;
      savedViewportRef.current = null;
      hasRestoredViewportRef.current = true;
      lastKnownViewport = viewportToRestore; // Update module-level variable
      // Use requestAnimationFrame to ensure ReactFlow is fully ready
      requestAnimationFrame(() => {
        setViewport(viewportToRestore, { duration: 0 });
      });
    }
    // Priority 2: If no savedViewportRef but we have lastKnownViewport (StrictMode remount or page refresh), restore it
    else if (!savedViewportRef.current && !hasRestoredViewportRef.current && lastKnownViewport && 
             !(lastKnownViewport.x === 0 && lastKnownViewport.y === 0 && lastKnownViewport.zoom === 1)) {
      const currentViewport = getViewport();
      // Only restore if current viewport is default (0,0,1) - don't overwrite if already restored
      if (currentViewport.x === 0 && currentViewport.y === 0 && currentViewport.zoom === 1) {
        hasRestoredViewportRef.current = true;
        const viewportToRestore = lastKnownViewport;
        // Use requestAnimationFrame to ensure ReactFlow is fully ready
        requestAnimationFrame(() => {
          setViewport(viewportToRestore, { duration: 0 });
        });
      }
    }
  }, [setViewport, getViewport]);

  return (
    <div className="flex-1 relative canvas-vignette" ref={reactFlowWrapper}>
      <ReactFlow
        nodes={mappedNodes}
        edges={mappedEdges}
        onInit={onInit}
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
        onEdgeUpdateStart={(_event, edge, handleType) => {
          // Track edge update start - ReactFlow v11+ might support this
          // If not supported, onConnectStart will handle it
          if (handleType === 'target') {
            const { updatingEdgeId } = useWorkflowStore.getState();
            if (!updatingEdgeId) {
              useWorkflowStore.setState({ updatingEdgeId: edge.id });
            }
          }
        }}
        onEdgeUpdateEnd={(_event, _edge, _handleType) => {
          // Edge update ended - ReactFlow v11+ might support this
          // Clear tracking if update didn't complete (handled by onEdgeUpdate or onConnectEnd)
          // This handler is optional and may not be called in all cases
        }}
        isValidConnection={isValidConnection}
        edgesUpdatable={true}
        edgesFocusable={true}
        deleteKeyCode="Delete"
        onDrop={onDrop}
        onDragOver={onDragOver}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onNodeContextMenu={onNodeContextMenu}
        onPaneContextMenu={onPaneContextMenu}
        onMove={(_event, viewport) => {
          // Update lastKnownViewport on every move to persist across remounts
          // Only update if viewport is not default (0,0,1) to avoid overwriting with default during remounts
          if (!(viewport.x === 0 && viewport.y === 0 && viewport.zoom === 1)) {
            lastKnownViewport = viewport;
            // Save to localStorage for page refresh persistence
            saveViewportToStorage(viewport);
          }
        }}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        minZoom={0.1}
        maxZoom={2}
        zoomOnDoubleClick={false}
        className="bg-gray-900"
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#4a4a4a" gap={16} variant={BackgroundVariant.Lines} />
        <Controls className="bg-gray-800 border border-gray-700" />
      </ReactFlow>
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          nodeId={contextMenu.nodeId}
          flowPosition={contextMenu.flowPosition}
          screenPosition={contextMenu.screenPosition}
          onClose={() => setContextMenu(null)}
          onAddNode={() => {
            if (contextMenu.flowPosition && contextMenu.screenPosition) {
              setSearchOverlay({
                screen: contextMenu.screenPosition,
                flow: contextMenu.flowPosition,
              });
              setContextMenu(null);
            }
          }}
        />
      )}
      {searchOverlay && (
        <CanvasSearchOverlay
          position={searchOverlay.screen}
          flowPosition={searchOverlay.flow}
          onClose={() => setSearchOverlay(null)}
          onNodeSelect={handleNodeSelect}
        />
      )}
    </div>
  );
}

export default function Canvas() {
  const canvasReloading = useWorkflowStore((state) => state.canvasReloading);
  // Use a ref to track the reload key to ensure it changes when reloading starts
  const reloadKeyRef = useRef(0);
  // Store viewport in parent component so it persists across remounts
  const savedViewportRef = useRef<{ x: number; y: number; zoom: number } | null>(null);
  // Store a ref to the ReactFlow instance so we can save viewport before remount
  const reactFlowInstanceRef = useRef<ReturnType<typeof useReactFlow> | null>(null);
  // Track if this is the first mount ever (persists across remounts)
  const isFirstMountRef = useRef(true);
  // Track if we've already run the initial fitView (persists across remounts)
  const hasRunInitialFitViewRef = useRef(false);
  useEffect(() => {
    if (canvasReloading) {
      reloadKeyRef.current += 1;
    }
  }, [canvasReloading]);
  
  return <CanvasInner key={`canvas-${reloadKeyRef.current}`} savedViewportRef={savedViewportRef} reactFlowInstanceRef={reactFlowInstanceRef} isFirstMountRef={isFirstMountRef} hasRunInitialFitViewRef={hasRunInitialFitViewRef} />;
}

