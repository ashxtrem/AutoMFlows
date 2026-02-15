import { useCallback, useRef, useEffect, useMemo, useState } from 'react';
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  useReactFlow,
  Node,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { RefreshCw } from 'lucide-react';
import { useWorkflowStore } from '../store/workflowStore';
import { useSettingsStore } from '../store/settingsStore';
import { useNotificationStore } from '../store/notificationStore';
import Tooltip from './Tooltip';
import CustomNode from '../nodes/CustomNode';
import CustomEdge from './CustomEdge';
import ContextMenu from './ContextMenu';
import CanvasSearchOverlay from './CanvasSearchOverlay';
import NodeSearchOverlay from './NodeSearchOverlay';
import GroupBoundary from './GroupBoundary';
import { useShortcutNavigation } from '../hooks/useShortcutNavigation';
import { filterValidEdges, suppressReactFlowWarnings } from '../utils/edgeValidation';
import { getEffectiveTheme } from '../utils/theme';
import { useCanvasHandlers } from './Canvas/handlers';
import { useNavigation } from './Canvas/navigation';
import { useNodeSearch } from './Canvas/nodeSearch';
import { useShortcuts } from './Canvas/shortcuts';
import {
  saveViewportToStorage,
  getLastKnownViewport,
  setLastKnownViewport,
  getHasRunInitialFitView,
  setHasRunInitialFitView,
} from './Canvas/viewport';
import { CanvasInnerProps } from './Canvas/types';

const nodeTypes = {
  custom: CustomNode,
};

const edgeTypes = {
  default: CustomEdge,
};

// Module-level variable to store ReactFlow's setNodes function so workflowStore can use it
// ReactFlow's setNodes accepts either Node[] or a function (nodes: Node[]) => Node[]
type SetNodesFunction = (nodes: Node[] | ((nodes: Node[]) => Node[])) => void;
let reactFlowSetNodes: SetNodesFunction | null = null;

// Export getter function for workflowStore to access ReactFlow's setNodes
export const getReactFlowSetNodes = (): SetNodesFunction | null => {
  return reactFlowSetNodes;
};

// Custom FPS Counter Component - shows only current FPS
function FPSCounterDisplay() {
  const [fps, setFps] = useState(0);
  const animationFrameRef = useRef<number>(0);

  useEffect(() => {
    let lastTime = performance.now();
    let frameCount = 0;

    const measureFPS = (currentTime: number) => {
      frameCount++;
      const elapsed = currentTime - lastTime;

      // Update every 1 second for better stability/readability
      if (elapsed >= 1000) {
        const calculatedFps = Math.round((frameCount * 1000) / elapsed);
        
        // Remove the 75 cap to support 144Hz+ monitors
        setFps(calculatedFps);
        
        frameCount = 0;
        lastTime = currentTime;
      }

      animationFrameRef.current = requestAnimationFrame(measureFPS);
    };

    animationFrameRef.current = requestAnimationFrame(measureFPS);

    return () => cancelAnimationFrame(animationFrameRef.current);
  }, []);

  // Use memoization or a simple div to ensure the counter itself doesn't lag the UI
  return (
    <div 
      className="fps-counter-wrapper"
      title="FPS Counter - Disable in Settings > Canvas > Show FPS Counter"
    >
      <div className="fps-counter-display">FPS: {fps}</div>
    </div>
  );
}

function CanvasInner({ savedViewportRef, reactFlowInstanceRef, isFirstMountRef, hasRunInitialFitViewRef, hideSidebar }: CanvasInnerProps) {
  const { 
    nodes, 
    edges, 
    onNodesChange, 
    onEdgesChange, 
    onConnect, 
    onConnectStart, 
    onConnectEnd, 
    onEdgeUpdate, 
    canvasReloading, 
    executingNodeId, 
    executionStatus, 
    followModeEnabled, 
    pausedNodeId, 
    pauseReason, 
    workflowFileName, 
    hasUnsavedChanges, 
    groups, 
    addNodesToGroup,
    fitViewRequested,
    setFitViewRequested,
    refreshCanvas,
  } = useWorkflowStore();
  const addNotification = useNotificationStore((state) => state.addNotification);
  
  const { showGrid, gridSize, snapToGrid, showFPSCounter } = useSettingsStore((state) => ({
    showGrid: state.canvas.showGrid,
    gridSize: state.canvas.gridSize,
    snapToGrid: state.canvas.snapToGrid,
    showFPSCounter: state.canvas.showFPSCounter,
  }));
  const theme = useSettingsStore((state) => state.appearance.theme);
  
  // Get grid color based on theme
  const getGridColor = () => {
    if (getEffectiveTheme(theme) === 'light') {
      return '#9CA3AF'; // Gray-400, visible on light canvas
    }
    return '#4a4a4a'; // Dark theme default
  };
  
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const reactFlowInstance = useReactFlow();
  const { screenToFlowPosition, getViewport, setViewport: originalSetViewport, fitView, setNodes, getNodes } = reactFlowInstance;
  
  // Enable shortcut navigation
  useShortcutNavigation();
  
  // Wrap setViewport to update lastKnownViewport and localStorage
  const setViewport = useCallback((viewport: { x: number; y: number; zoom: number }, options?: { duration?: number }) => {
    // Update module-level lastKnownViewport to persist across remounts
    // Only update if viewport is not default (0,0,1) to avoid overwriting with default during remounts
    if (!(viewport.x === 0 && viewport.y === 0 && viewport.zoom === 1)) {
      setLastKnownViewport(viewport);
      // Save to localStorage for page refresh persistence
      saveViewportToStorage(viewport);
    }
    originalSetViewport(viewport, options);
  }, [originalSetViewport]);
  
  // Store ReactFlow instance in parent's ref so it can save viewport before remount
  useEffect(() => {
    reactFlowInstanceRef.current = reactFlowInstance;
    // Store setNodes globally so workflowStore can use it
    reactFlowSetNodes = setNodes;
  }, [reactFlowInstance, reactFlowInstanceRef, setNodes]);
  
  // Use extracted hooks
  const handlers = useCanvasHandlers({
    screenToFlowPosition,
    setNodes,
    getNodes,
    reactFlowWrapper,
    hideSidebar,
  });
  
  const navigation = useNavigation({
    fitView,
    nodes,
  });
  
  const nodeSearch = useNodeSearch({
    fitView,
    nodes,
  });
  
  // Use shortcuts hook
  useShortcuts({
    screenToFlowPosition,
    setNodes,
    reactFlowWrapper,
    nodeSearchOverlayOpen: nodeSearch.nodeSearchOverlayOpen,
    setNodeSearchOverlayOpen: nodeSearch.setNodeSearchOverlayOpen,
    navigateToFailedNode: navigation.navigateToFailedNode,
  });
  
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
      const lastKnownViewport = getLastKnownViewport();
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
    const lastKnownViewport = getLastKnownViewport();
    const hasRunInitialFitView = getHasRunInitialFitView();
    if (!savedViewportRef.current && !hasRunInitialFitView && !lastKnownViewport && 
        nodesLengthChanged && previousNodesLength === 0 && nodes.length > 0) {
      setHasRunInitialFitView(true);
      isFirstMountRef.current = false;
      hasRunInitialFitViewRef.current = true;
      // Small delay to ensure ReactFlow is ready
      setTimeout(() => {
        fitView({ duration: 0 });
      }, 100);
    }
  }, [nodes.length, fitView]);
  
  // When fitViewRequested is set (e.g. after Reset or loading template on first load), run fitView once
  useEffect(() => {
    if (!fitViewRequested || nodes.length === 0) return;
    const timeoutId = setTimeout(() => {
      fitView({ duration: 300 });
      setFitViewRequested(false);
    }, 150);
    return () => clearTimeout(timeoutId);
  }, [fitViewRequested, nodes.length, fitView, setFitViewRequested]);
  
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
  
  // Follow mode: automatically navigate to executing node when it changes
  // Also navigate when breakpoint is triggered (paused node) - but only once
  const lastPausedNodeRef = useRef<string | null>(null);
  
  useEffect(() => {
    if (!followModeEnabled) {
      return;
    }
    
    // Navigate to executing node during normal execution
    if (executionStatus === 'running' && executingNodeId) {
      navigation.navigateToExecutingNode();
    }
    
    // Navigate to paused node when breakpoint is triggered - but only once per pause
    if (pausedNodeId && pauseReason === 'breakpoint' && lastPausedNodeRef.current !== pausedNodeId) {
      lastPausedNodeRef.current = pausedNodeId;
      const pausedNode = nodes.find(n => n.id === pausedNodeId);
      if (pausedNode) {
        fitView({
          nodes: [{ id: pausedNodeId }],
          padding: 0.2,
          duration: 300,
        });
      }
    }
    
    // Reset the ref when no longer paused
    if (!pausedNodeId) {
      lastPausedNodeRef.current = null;
    }
  }, [followModeEnabled, executionStatus, executingNodeId, pausedNodeId, pauseReason, nodes, fitView, navigation]);
  
  // Load viewport from localStorage on mount
  useEffect(() => {
    const storedViewport = localStorage.getItem('reactflow-viewport');
    if (storedViewport) {
      try {
        const parsed = JSON.parse(storedViewport);
        if (parsed && typeof parsed.x === 'number' && typeof parsed.y === 'number' && typeof parsed.zoom === 'number') {
          setLastKnownViewport(parsed);
        }
      } catch (error) {
        // Ignore parse errors
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
      setLastKnownViewport(viewportToRestore); // Update module-level variable
      // Use requestAnimationFrame to ensure ReactFlow is fully ready
      requestAnimationFrame(() => {
        setViewport(viewportToRestore, { duration: 0 });
      });
    }
    // Priority 2: If no savedViewportRef but we have lastKnownViewport (StrictMode remount or page refresh), restore it
    else if (!savedViewportRef.current && !hasRestoredViewportRef.current) {
      const lastKnownViewport = getLastKnownViewport();
      if (lastKnownViewport && 
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
    }
  }, [setViewport, getViewport]);

  // Prevent system context menu - use both capture and bubble phases
  // Capture phase prevents default early, bubble phase catches any that slip through
  useEffect(() => {
    const handleContextMenuCapture = (e: MouseEvent) => {
      // Only prevent if clicking within the canvas wrapper
      const target = e.target as HTMLElement;
      if (target && reactFlowWrapper.current && reactFlowWrapper.current.contains(target)) {
        // Check if it's the ReactFlow pane or a node
        const isReactFlowPane = target.closest('.react-flow__pane');
        const isNode = target.closest('.react-flow__node');
        const isReactFlowElement = target.closest('.react-flow') !== null;
        const isSelectionBox = target.closest('.react-flow__nodesselection') !== null;
        
        // If clicking on selection box and we have selected nodes, find node under cursor
        const selectedNodeIds = useWorkflowStore.getState().selectedNodeIds;
        if (isSelectionBox && selectedNodeIds.size > 0) {
          // Convert click position to flow coordinates for accurate comparison
          const flowPosition = screenToFlowPosition({
            x: e.clientX,
            y: e.clientY,
          });
          
          // Find node under cursor - check all selected nodes
          let clickedNode = null;
          let closestNode = null;
          let closestDistance = Infinity;
          
          for (const node of nodes) {
            if (!selectedNodeIds.has(node.id)) continue;
            
            const nodeX = node.position.x;
            const nodeY = node.position.y;
            const nodeWidth = node.width || node.data?.width || 200;
            const nodeHeight = node.height || node.data?.height || 100;
            
            // Check if click is within node bounds in flow coordinates
            const isOverNode = flowPosition.x >= nodeX && flowPosition.x <= nodeX + nodeWidth &&
                              flowPosition.y >= nodeY && flowPosition.y <= nodeY + nodeHeight;
            
            if (isOverNode) {
              clickedNode = node;
              break;
            }
            
            // Also track closest node for fallback
            const nodeCenterX = nodeX + nodeWidth / 2;
            const nodeCenterY = nodeY + nodeHeight / 2;
            const distance = Math.sqrt(
              Math.pow(flowPosition.x - nodeCenterX, 2) + 
              Math.pow(flowPosition.y - nodeCenterY, 2)
            );
            
            if (distance < closestDistance) {
              closestDistance = distance;
              closestNode = node;
            }
          }
          
          // Use clicked node if found, otherwise use closest node as fallback
          const targetNode = clickedNode || closestNode;
          if (targetNode) {
            e.preventDefault();
            e.stopPropagation();
            // Trigger context menu for the node
            setTimeout(() => {
              handlers.setContextMenu({
                x: e.clientX,
                y: e.clientY,
                nodeId: targetNode.id,
              });
            }, 0);
            return;
          }
        }
        
        if (isReactFlowPane || isNode || isReactFlowElement) {
          // Prevent default to stop system menu, but DON'T stop propagation
          // so ReactFlow's handlers can still fire to show our custom menu
          e.preventDefault();
        }
      }
    };

    const handleContextMenuBubble = (e: MouseEvent) => {
      // Catch any events that weren't prevented in capture phase
      const target = e.target as HTMLElement;
      if (target && reactFlowWrapper.current && reactFlowWrapper.current.contains(target)) {
        const isReactFlowPane = target.closest('.react-flow__pane');
        const isNode = target.closest('.react-flow__node');
        const isReactFlowElement = target.closest('.react-flow') !== null;
        if ((isReactFlowPane || isNode || isReactFlowElement) && !e.defaultPrevented) {
          e.preventDefault();
          e.stopPropagation();
        }
      }
    };
    
    // Use capture phase on document to catch the event early and prevent system menu
    // We don't stop propagation so ReactFlow's handlers can still fire
    document.addEventListener('contextmenu', handleContextMenuCapture, true);
    // Also add bubble phase handler as backup
    document.addEventListener('contextmenu', handleContextMenuBubble, false);
    return () => {
      document.removeEventListener('contextmenu', handleContextMenuCapture, true);
      document.removeEventListener('contextmenu', handleContextMenuBubble, false);
    };
  }, [nodes, screenToFlowPosition, handlers]);

  // Also prevent contextmenu directly on ReactFlow viewport after it mounts
  // This catches events at the source before they bubble up
  useEffect(() => {
    if (!reactFlowWrapper.current) return;
    
    const reactFlowViewport = reactFlowWrapper.current.querySelector('.react-flow__viewport');
    if (!reactFlowViewport) return;
    
    const handleViewportContextMenu = (e: Event) => {
      // Prevent default but don't stop propagation so ReactFlow's handlers can fire
      const mouseEvent = e as MouseEvent;
      mouseEvent.preventDefault();
    };
    
    reactFlowViewport.addEventListener('contextmenu', handleViewportContextMenu, true);
    return () => {
      reactFlowViewport.removeEventListener('contextmenu', handleViewportContextMenu, true);
    };
  }, [nodes.length]); // Re-run when nodes change (ReactFlow might recreate viewport)

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
  
  // Track last matchingNodeIds to detect changes
  const lastMatchingNodeIdsRef = useRef<string[]>([]);
  const matchingNodeIdsChanged = JSON.stringify(lastMatchingNodeIdsRef.current.sort()) !== JSON.stringify(nodeSearch.matchingNodeIds.slice().sort());
  if (matchingNodeIdsChanged) {
    lastMatchingNodeIdsRef.current = nodeSearch.matchingNodeIds.slice();
  }
  
  // Only update nodes if content actually changed (not just reference)
  // This prevents ReactFlow from re-rendering when nodes array is recreated with same content
  const mappedNodes = useMemo(() => {
    const matchingIdsSet = new Set(nodeSearch.matchingNodeIds);
    
    // If content hasn't changed AND node references are stable AND matchingNodeIds haven't changed,
    // return the previous array reference to prevent ReactFlow from detecting false changes
    if (!nodesContentChanged && !nodesRefsChanged && !matchingNodeIdsChanged && lastNodesRef.current.length === nodes.length) {
      return lastNodesRef.current;
    }
    
    // Content, references, or matchingNodeIds changed - update nodes
    const nodesWithDraggable = nodes.map(node => ({
      ...node,
      draggable: !node.data.isPinned,
      data: {
        ...node.data,
        searchHighlighted: matchingIdsSet.has(node.id),
      },
    }));
    lastNodesRef.current = nodesWithDraggable;
    nodesContentKeyRef.current = currentNodesContentKey;
    nodesMapRef.current = new Map(nodes.map(n => [n.id, n]));
    return nodesWithDraggable;
  }, [nodes, nodesContentChanged, nodesRefsChanged, currentNodesContentKey, nodeSearch.matchingNodeIds, matchingNodeIdsChanged]);
  
  // Filter edges based on visibility setting
  const mappedEdges = useMemo(() => {
    if (edgesHidden) {
      return [];
    }
    const validEdges = filterValidEdges(edges, nodes);
    return validEdges.map(edge => ({
      ...edge,
      hidden: edgesHidden,
      animated: true, // Enable animation for all edges
    }));
  }, [edges, nodes, edgesHidden]);
  
  // Suppress ReactFlow warnings in console
  suppressReactFlowWarnings();

  return (
    <div 
      className="flex-1 relative canvas-vignette" 
      ref={reactFlowWrapper} 
      data-tour="canvas"
      onMouseDown={handlers.handleWrapperMouseDown}
      onClick={handlers.handleWrapperClick}
      onDoubleClick={handlers.handleWrapperDoubleClick}
      onContextMenu={handlers.handleWrapperContextMenu}
    >
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
            // Apply snap-to-grid if enabled
            if (snapToGrid && gridSize > 0) {
              const processedChanges = changes.map((change) => {
                if (change.type === 'position' && change.position) {
                  return {
                    ...change,
                    position: {
                      x: Math.round(change.position.x / gridSize) * gridSize,
                      y: Math.round(change.position.y / gridSize) * gridSize,
                    },
                  };
                }
                return change;
              });
              onNodesChange(processedChanges);
            } else {
              onNodesChange(changes);
            }
          } finally {
            // Clear flag after a short delay to allow ReactFlow to finish processing
            setTimeout(() => {
              isProcessingNodesChangeRef.current = false;
            }, 10);
          }
        }}
        onSelectionChange={(params) => {
          // Track when selection changes (for detecting drag selection completion)
          handlers.lastSelectionChangeTimeRef.current = Date.now();
          
          // If we're clearing selection from pane click, ignore this event
          if (handlers.isClearingSelectionRef.current) {
            return;
          }
          
          const selectedIds = params.nodes.map((n) => n.id);
          const newSelectedId = selectedIds.length > 0 ? selectedIds[0] : null;
          const lastReactFlowSelection = reactFlowSelectionRef.current;
          
          // If ReactFlow cleared selection (0 nodes) but store still has selection, clear selectedNodeIds only
          // Preserve selectedNode (Properties panel) - it should only be cleared when explicitly closing the sidebar
          const selectedNodeIds = useWorkflowStore.getState().selectedNodeIds;
          if (selectedIds.length === 0 && selectedNodeIds.size > 0) {
            useWorkflowStore.getState().setSelectedNodeIds([]);
            reactFlowSelectionRef.current = null;
            return;
          }
          
          // Update ReactFlow's selection ref
          reactFlowSelectionRef.current = newSelectedId;
          
          // Ignore if ReactFlow's selection hasn't actually changed (prevents duplicate events)
          if (newSelectedId === lastReactFlowSelection && selectedIds.length === selectedNodeIds.size) {
            return;
          }
          
          // Sync ReactFlow selection with store
          useWorkflowStore.getState().setSelectedNodeIds(selectedIds);
          
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
        isValidConnection={handlers.isValidConnection}
        edgesUpdatable={true}
        edgesFocusable={true}
        deleteKeyCode="Delete"
        multiSelectionKeyCode={(() => {
          const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPod|iPad/i.test(navigator.platform);
          // ReactFlow: 'Meta' for Mac, 'Control' for Windows/Linux
          return isMac ? 'Meta' : 'Control';
        })()}
        selectionKeyCode={(() => {
          const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPod|iPad/i.test(navigator.platform);
          // ReactFlow: Use same key for drag selection (Ctrl/Cmd + Drag)
          return isMac ? 'Meta' : 'Control';
        })()}
        selectionOnDrag={true}
        panOnDrag={((event: MouseEvent | TouchEvent) => {
          // Allow panning only when selection key (Cmd/Ctrl) is NOT pressed
          // When selection key is pressed, ReactFlow will handle selection drag instead
          const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPod|iPad/i.test(navigator.platform);
          if (event instanceof MouseEvent) {
            const selectionKeyPressed = isMac ? event.metaKey : event.ctrlKey;
            return !selectionKeyPressed;
          }
          // For touch events, allow panning
          return true;
        }) as any}
        onDrop={handlers.onDrop}
        onDragOver={handlers.onDragOver}
        onNodeClick={handlers.onNodeClick}
        onPaneClick={handlers.onPaneClick}
        onNodeContextMenu={handlers.onNodeContextMenu}
        onPaneContextMenu={handlers.onPaneContextMenu}
        onNodeDragStop={(_event, node) => {
          // Check if node overlaps with any group boundary
          const nodeRect = {
            x: node.position.x,
            y: node.position.y,
            width: node.width || node.data?.width || 200,
            height: node.height || node.data?.height || 100,
          };

          // Calculate node center point for more accurate detection
          const nodeCenterX = nodeRect.x + nodeRect.width / 2;
          const nodeCenterY = nodeRect.y + nodeRect.height / 2;

          groups.forEach((group) => {
            const groupRect = {
              x: group.position.x,
              y: group.position.y,
              width: group.width,
              height: group.height,
            };

            // Check if node center is inside group boundary
            const centerInside =
              nodeCenterX >= groupRect.x &&
              nodeCenterX <= groupRect.x + groupRect.width &&
              nodeCenterY >= groupRect.y &&
              nodeCenterY <= groupRect.y + groupRect.height;

            // Also check if node overlaps with group (even partially) for adding
            const overlaps =
              nodeRect.x < groupRect.x + groupRect.width &&
              nodeRect.x + nodeRect.width > groupRect.x &&
              nodeRect.y < groupRect.y + groupRect.height &&
              nodeRect.y + nodeRect.height > groupRect.y;

            if (overlaps && !group.nodeIds.includes(node.id)) {
              // Add node to group if it overlaps
              addNodesToGroup(group.id, [node.id]);
            } else if (!centerInside && group.nodeIds.includes(node.id)) {
              // Remove node from group if center is outside (more lenient removal)
              useWorkflowStore.getState().removeNodesFromGroup(group.id, [node.id]);
            }
          });
        }}
        onMove={(_event, viewport) => {
          // Update lastKnownViewport on every move to persist across remounts
          // Only update if viewport is not default (0,0,1) to avoid overwriting with default during remounts
          if (!(viewport.x === 0 && viewport.y === 0 && viewport.zoom === 1)) {
            setLastKnownViewport(viewport);
            // Save to localStorage for page refresh persistence
            saveViewportToStorage(viewport);
          }
        }}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        minZoom={0.1}
        maxZoom={2}
        zoomOnDoubleClick={false}
        className="bg-canvas react-flow-canvas"
        proOptions={{ hideAttribution: true }}
      >
        {showGrid && (
          <Background 
            color={getGridColor()} 
            gap={gridSize} 
            variant={BackgroundVariant.Lines}
          />
        )}
        <Controls className="bg-surface border border-border !left-3 !bottom-3" />
        {/* Render group boundaries inside ReactFlow so they follow pan/zoom */}
        {groups.map((group) => (
          <GroupBoundary key={group.id} group={group} />
        ))}
      </ReactFlow>
      {/* Refresh canvas - above zoom controls, centered over the control stack */}
      <div className="fixed left-7 z-10 w-15 flex flex-col items-center gap-2" style={{ bottom: 'calc(1rem + 108px + 10px)' }}>
        <Tooltip content="Refresh canvas">
          <button
            type="button"
            onClick={() => {
              refreshCanvas();
              addNotification({ type: 'info', title: 'Canvas refreshed', message: 'Canvas has been refreshed.' });
            }}
            className="w-8 h-8 rounded flex items-center justify-center bg-transparent text-primary hover:bg-surfaceHighlight/40 transition-colors drop-shadow-lg"
            aria-label="Refresh canvas"
          >
            <RefreshCw size={16} className="flex-shrink-0" />
          </button>
        </Tooltip>
      </div>
      {/* Filename display - fixed position in top left */}
      <div className="fixed top-0 left-0 z-10 p-2 text-primary text-sm font-mono flex items-center gap-2">
        <span className="drop-shadow-lg">{workflowFileName}</span>
        {hasUnsavedChanges && (
          <span className="text-yellow-400 text-xs drop-shadow-lg" title="Unsaved changes">●</span>
        )}
      </div>
      {/* FPS Counter - positioned below filename in top left */}
      {showFPSCounter && <FPSCounterDisplay />}
      {handlers.contextMenu && (
        <ContextMenu
            x={handlers.contextMenu.x}
            y={handlers.contextMenu.y}
            nodeId={handlers.contextMenu.nodeId}
            flowPosition={handlers.contextMenu.flowPosition}
            screenPosition={handlers.contextMenu.screenPosition}
            onClose={() => handlers.setContextMenu(null)}
            onAddNode={() => {
              if (handlers.contextMenu?.flowPosition && handlers.contextMenu?.screenPosition) {
                handlers.setSearchOverlay({
                  screen: handlers.contextMenu.screenPosition,
                  flow: handlers.contextMenu.flowPosition,
                });
                handlers.setContextMenu(null);
              }
            }}
          />
      )}
      {handlers.searchOverlay && (
        <CanvasSearchOverlay
          position={handlers.searchOverlay.screen}
          flowPosition={handlers.searchOverlay.flow}
          onClose={() => handlers.setSearchOverlay(null)}
          onNodeSelect={handlers.handleNodeSelect}
        />
      )}
      {nodeSearch.nodeSearchOverlayOpen && (
        <NodeSearchOverlay
          searchQuery={nodeSearch.nodeSearchQuery}
          matchingNodeIds={nodeSearch.matchingNodeIds}
          currentMatchIndex={nodeSearch.currentMatchIndex}
          searchExecuted={nodeSearch.searchExecuted}
          onSearchQueryChange={nodeSearch.setNodeSearchQuery}
          onSearch={nodeSearch.handleNodeSearch}
          onNavigate={nodeSearch.handleNodeSearchNavigate}
          onClose={nodeSearch.handleNodeSearchClose}
        />
      )}
    </div>
  );
}

interface CanvasProps {
  hideSidebar?: () => void;
}

export default function Canvas({ hideSidebar }: CanvasProps) {
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
  
  return <CanvasInner key={`canvas-${reloadKeyRef.current}`} savedViewportRef={savedViewportRef} reactFlowInstanceRef={reactFlowInstanceRef} isFirstMountRef={isFirstMountRef} hasRunInitialFitViewRef={hasRunInitialFitViewRef} hideSidebar={hideSidebar} />;
}
