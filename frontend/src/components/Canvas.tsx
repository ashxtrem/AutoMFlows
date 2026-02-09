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
import { useNotificationStore } from '../store/notificationStore';
import { useSettingsStore } from '../store/settingsStore';
import CustomNode from '../nodes/CustomNode';
import CustomEdge from './CustomEdge';
import ContextMenu from './ContextMenu';
import CanvasSearchOverlay from './CanvasSearchOverlay';
import NodeSearchOverlay from './NodeSearchOverlay';
import GroupBoundary from './GroupBoundary';
import { useShortcutNavigation } from '../hooks/useShortcutNavigation';
import { searchNodes } from '../utils/nodeSearch';
import { filterValidEdges, suppressReactFlowWarnings } from '../utils/edgeValidation';

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
  hideSidebar?: () => void;
}

function CanvasInner({ savedViewportRef, reactFlowInstanceRef, isFirstMountRef, hasRunInitialFitViewRef, hideSidebar }: CanvasInnerProps) {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, setSelectedNodeIds, clearSelection, selectAllNodes, deleteNode, duplicateNode, copyNode, pasteNode, onConnectStart, onConnectEnd, onEdgeUpdate, failedNodes, showErrorPopupForNode, canvasReloading, executingNodeId, executionStatus, followModeEnabled, setFollowModeEnabled, pausedNodeId, pauseReason, selectedNodeIds, workflowFileName, hasUnsavedChanges, groups, addNodesToGroup, setSelectedGroupId } = useWorkflowStore();
  const addNotification = useNotificationStore((state) => state.addNotification);
  const { showGrid, gridSize, snapToGrid } = useSettingsStore((state) => ({
    showGrid: state.canvas.showGrid,
    gridSize: state.canvas.gridSize,
    snapToGrid: state.canvas.snapToGrid,
  }));
  const theme = useSettingsStore((state) => state.appearance.theme);
  
  // Get grid color based on theme
  const getGridColor = () => {
    if (theme === 'light') {
      return '#E5E7EB'; // Light theme grid color with opacity handled by CSS
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
  // Ref to access setContextMenu in event handlers
  const setContextMenuRef = useRef(setContextMenu);
  useEffect(() => {
    setContextMenuRef.current = setContextMenu;
  }, [setContextMenu]);
  const [searchOverlay, setSearchOverlay] = useState<{ screen: { x: number; y: number }; flow: { x: number; y: number } } | null>(null);
  
  // Node search overlay state
  const [nodeSearchOverlayOpen, setNodeSearchOverlayOpen] = useState<boolean>(false);
  const [nodeSearchQuery, setNodeSearchQuery] = useState<string>('');
  const [matchingNodeIds, setMatchingNodeIds] = useState<string[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState<number>(0);
  const [searchExecuted, setSearchExecuted] = useState<boolean>(false);
  
  // Double-click detection using timing
  const lastClickRef = useRef<{ time: number; x: number; y: number } | null>(null);
  const doubleClickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isClearingSelectionRef = useRef(false);
  const lastSelectionChangeTimeRef = useRef<number>(0);
  const mouseDownRef = useRef<{ time: number; x: number; y: number } | null>(null);
  
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
  }, [screenToFlowPosition, selectedNodeIds, nodes]);

  // Prevent ReactFlow from creating connections starting from input handles
  const isValidConnection = useCallback((connection: any) => {
    // Only allow connections starting from source handles (outputs)
    return connection.source && connection.sourceHandle;
  }, []);


  // Track ReactFlow's current selection
  const reactFlowSelectionRef = useRef<string | null>(null);
  
  // Track if we're currently processing a nodes change to prevent loops
  const isProcessingNodesChangeRef = useRef(false);

  // Track if Shift key is held during drag
  const shiftKeyHeldRef = useRef(false);
  
  // Track drag state for multi-node movement
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        shiftKeyHeldRef.current = true;
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        shiftKeyHeldRef.current = false;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);
  
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

  // Track last searched query to detect when query changes
  const lastSearchedQueryRef = useRef<string>('');
  
  // Node search handlers
  const handleNodeSearch = useCallback(() => {
    if (nodeSearchQuery.trim().length < 3) {
      setMatchingNodeIds([]);
      setSearchExecuted(false);
      return;
    }
    const matches = searchNodes(nodeSearchQuery, nodes);
    setMatchingNodeIds(matches);
    setCurrentMatchIndex(0);
    setSearchExecuted(true);
    lastSearchedQueryRef.current = nodeSearchQuery.trim();
  }, [nodeSearchQuery, nodes]);

  const handleNodeSearchNavigate = useCallback(() => {
    if (matchingNodeIds.length === 0) {
      return;
    }
    
    const nodeId = matchingNodeIds[currentMatchIndex];
    const node = nodes.find(n => n.id === nodeId);
    
    if (node) {
      fitView({
        nodes: [{ id: nodeId }],
        padding: 0.2,
        duration: 300,
      });
      
      // Cycle to next match
      setCurrentMatchIndex((prev) => (prev + 1) % matchingNodeIds.length);
    }
  }, [matchingNodeIds, currentMatchIndex, nodes, fitView]);

  const handleNodeSearchClose = useCallback(() => {
    setNodeSearchOverlayOpen(false);
    setNodeSearchQuery('');
    setMatchingNodeIds([]);
    setCurrentMatchIndex(0);
    setSearchExecuted(false);
    lastSearchedQueryRef.current = '';
  }, []);
  
  // Reset search executed state when query changes (user is typing a new search)
  // Clear highlights only when query is too short (< 3 chars)
  useEffect(() => {
    const trimmedQuery = nodeSearchQuery.trim();
    if (trimmedQuery !== lastSearchedQueryRef.current) {
      setSearchExecuted(false);
      // Clear highlights only when query is cleared or too short
      if (trimmedQuery.length < 3) {
        setMatchingNodeIds([]);
      }
      // If query is >= 3 chars but different from last searched, keep old highlights
      // until user executes new search (they'll update when handleNodeSearch is called)
    }
  }, [nodeSearchQuery]);

  // Navigate to executing node function (for follow mode)
  const navigateToExecutingNode = useCallback(() => {
    if (!executingNodeId) {
      return;
    }
    
    const executingNode = nodes.find(n => n.id === executingNodeId);
    
    if (executingNode) {
      // Use fitView to focus on the executing node
      fitView({
        nodes: [{ id: executingNodeId }],
        padding: 0.2,
        duration: 300,
      });
    }
  }, [executingNodeId, nodes, fitView]);

  // Follow mode: automatically navigate to executing node when it changes
  // Also navigate when breakpoint is triggered (paused node)
  useEffect(() => {
    if (!followModeEnabled) {
      return;
    }
    
    // Navigate to executing node during normal execution
    if (executionStatus === 'running' && executingNodeId) {
      navigateToExecutingNode();
    }
    
    // Navigate to paused node when breakpoint is triggered
    if (pausedNodeId && pauseReason === 'breakpoint') {
      const pausedNode = nodes.find(n => n.id === pausedNodeId);
      if (pausedNode) {
        fitView({
          nodes: [{ id: pausedNodeId }],
          padding: 0.2,
          duration: 300,
        });
      }
    }
  }, [followModeEnabled, executionStatus, executingNodeId, pausedNodeId, pauseReason, nodes, fitView, navigateToExecutingNode]);

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

  // Keyboard shortcut for follow mode toggle (Ctrl/Cmd + Shift + L)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isModifierPressed = e.metaKey || e.ctrlKey;
      if (isModifierPressed && e.shiftKey && e.key === 'L') {
        e.preventDefault();
        const newValue = !followModeEnabled;
        setFollowModeEnabled(newValue);
        addNotification({
          type: 'info',
          title: 'Follow Mode',
          message: newValue ? 'Follow mode enabled' : 'Follow mode disabled',
        });
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [followModeEnabled, setFollowModeEnabled, addNotification]);

  // Keyboard shortcut for node search (Ctrl/Cmd + F)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isModifierPressed = e.metaKey || e.ctrlKey;
      // Only trigger if Ctrl+F (Cmd+F on Mac) and not Shift+F (which is for failed node navigation)
      if (isModifierPressed && !e.shiftKey && e.key === 'f') {
        // Check if user is typing in an input/textarea (don't override browser find)
        const activeElement = document.activeElement;
        const isInputFocused = activeElement && (
          activeElement.tagName === 'INPUT' ||
          activeElement.tagName === 'TEXTAREA' ||
          activeElement.tagName === 'SELECT'
        );
        
        // If search overlay is already open, just focus the input
        if (nodeSearchOverlayOpen) {
          // Don't prevent default if user is typing in the search input itself
          if (!isInputFocused || !(activeElement as HTMLElement).closest('[data-search-overlay]')) {
            e.preventDefault();
            // Focus will be handled by the overlay component
          }
          return;
        }
        
        // Only open if not typing in an input (allow browser find in other contexts)
        // But allow opening even when other UI elements are open (sidebars, popups, etc.)
        if (!isInputFocused) {
          e.preventDefault();
          setNodeSearchOverlayOpen(true);
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [nodeSearchOverlayOpen]);

  // Keyboard shortcuts for multi-selection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isModifierPressed = e.metaKey || e.ctrlKey;
      const activeElement = document.activeElement;
      const isInputFocused = activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.tagName === 'SELECT' ||
        (activeElement as HTMLElement).isContentEditable
      );

      // Don't handle shortcuts if user is typing in an input
      if (isInputFocused) {
        return;
      }

      // Don't handle if canvas is reloading or properties panel is open
      const selectedNode = useWorkflowStore.getState().selectedNode;
      
      // Check if any modal/popup is open (prevent shortcuts when modals are active)
      const hasModal = document.querySelector('.fixed.inset-0.bg-black.bg-opacity-50') !== null ||
                      document.querySelector('[role="dialog"]') !== null ||
                      document.querySelector('[role="alertdialog"]') !== null ||
                      document.querySelector('[data-modal="true"]') !== null;
      
      if (canvasReloading || selectedNode || hasModal) {
        return;
      }

      // Ctrl/Cmd + A: Select all nodes
      if (isModifierPressed && e.key === 'a' && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        selectAllNodes();
        // Also update ReactFlow's node selection state
        const allNodeIds = nodes.map((n) => n.id);
        setNodes((nds) =>
          nds.map((node) => ({
            ...node,
            selected: allNodeIds.includes(node.id),
          }))
        );
        return;
      }

      // Delete or Backspace: Delete selected nodes
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNodeIds.size > 0) {
        e.preventDefault();
        e.stopPropagation();
        deleteNode(Array.from(selectedNodeIds));
        return;
      }

      // Ctrl/Cmd + D: Duplicate selected nodes
      if (isModifierPressed && e.key === 'd' && !e.shiftKey && selectedNodeIds.size > 0) {
        e.preventDefault();
        e.stopPropagation();
        duplicateNode(Array.from(selectedNodeIds));
        return;
      }

      // Ctrl/Cmd + C: Copy selected nodes
      if (isModifierPressed && e.key === 'c' && !e.shiftKey && selectedNodeIds.size > 0) {
        e.preventDefault();
        e.stopPropagation();
        copyNode(Array.from(selectedNodeIds));
        return;
      }

      // Ctrl/Cmd + V: Paste nodes (at mouse position or center)
      if (isModifierPressed && e.key === 'v' && !e.shiftKey) {
        const clipboard = useWorkflowStore.getState().clipboard;
        if (clipboard && reactFlowWrapper.current) {
          e.preventDefault();
          e.stopPropagation();
          const rect = reactFlowWrapper.current.getBoundingClientRect();
          const centerX = rect.width / 2;
          const centerY = rect.height / 2;
          const flowPosition = screenToFlowPosition({ x: centerX, y: centerY });
          pasteNode(flowPosition);
        }
        return;
      }

      // Escape: Clear selection
      if (e.key === 'Escape') {
        const currentState = useWorkflowStore.getState();
        const hasSelection = currentState.selectedNodeIds.size > 0;
        if (hasSelection) {
          e.preventDefault();
          e.stopPropagation();
          clearSelection();
          // Also clear ReactFlow selection
          setNodes((nds) =>
            nds.map((node) => ({
              ...node,
              selected: false,
            }))
          );
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [selectedNodeIds, canvasReloading, selectAllNodes, deleteNode, duplicateNode, copyNode, pasteNode, clearSelection, screenToFlowPosition, nodes, setNodes]);
  
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
  const matchingNodeIdsChanged = JSON.stringify(lastMatchingNodeIdsRef.current.sort()) !== JSON.stringify(matchingNodeIds.slice().sort());
  if (matchingNodeIdsChanged) {
    lastMatchingNodeIdsRef.current = matchingNodeIds.slice();
  }
  
  const mappedNodes = useMemo(() => {
    const matchingIdsSet = new Set(matchingNodeIds);
    
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
  }, [nodes, nodesContentChanged, nodesRefsChanged, currentNodesContentKey, matchingNodeIds, matchingNodeIdsChanged]);

  // Map edges with hidden property and animated prop based on edgesHidden state
  // Also filter out invalid edges to prevent React Flow warnings
  const mappedEdges = useMemo(() => {
    const validEdges = filterValidEdges(edges, nodes);
    return validEdges.map(edge => ({
      ...edge,
      hidden: edgesHidden,
      animated: true, // Enable animation for all edges
    }));
  }, [edges, nodes, edgesHidden]);
  
  // Suppress React Flow console warnings for invalid edges
  useEffect(() => {
    suppressReactFlowWarnings();
  }, []);

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
              setContextMenuRef.current({
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
  }, [selectedNodeIds, nodes, getViewport]);

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
  }, [screenToFlowPosition]);

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

  return (
    <div 
      className="flex-1 relative canvas-vignette" 
      ref={reactFlowWrapper} 
      data-tour="canvas"
      onMouseDown={handleWrapperMouseDown}
      onClick={handleWrapperClick}
      onDoubleClick={handleWrapperDoubleClick}
      onContextMenu={handleWrapperContextMenu}
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
          lastSelectionChangeTimeRef.current = Date.now();
          
          // If we're clearing selection from pane click, ignore this event
          if (isClearingSelectionRef.current) {
            return;
          }
          
          const selectedIds = params.nodes.map((n) => n.id);
          const newSelectedId = selectedIds.length > 0 ? selectedIds[0] : null;
          const lastReactFlowSelection = reactFlowSelectionRef.current;
          
          // If ReactFlow cleared selection (0 nodes) but store still has selection, clear selectedNodeIds only
          // Preserve selectedNode (Properties panel) - it should only be cleared when explicitly closing the sidebar
          if (selectedIds.length === 0 && selectedNodeIds.size > 0) {
            setSelectedNodeIds([]);
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
          setSelectedNodeIds(selectedIds);
          
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
        onDrop={onDrop}
        onDragOver={onDragOver}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onNodeContextMenu={onNodeContextMenu}
        onPaneContextMenu={onPaneContextMenu}
        onNodeDragStop={(_event, node) => {
          const { removeNodesFromGroup } = useWorkflowStore.getState();
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
              removeNodesFromGroup(group.id, [node.id]);
            }
          });
        }}
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
        className="bg-gray-900 react-flow-canvas"
        proOptions={{ hideAttribution: true }}
      >
        {showGrid && (
          <Background 
            color={getGridColor()} 
            gap={gridSize} 
            variant={BackgroundVariant.Lines}
          />
        )}
        <Controls className="bg-gray-800 border border-gray-700" />
        {/* Render group boundaries inside ReactFlow so they follow pan/zoom */}
        {groups.map((group) => (
          <GroupBoundary key={group.id} group={group} />
        ))}
      </ReactFlow>
      {/* Filename display - fixed position in top left */}
      <div className="fixed top-0 left-0 z-10 p-2 text-gray-100 text-sm font-mono flex items-center gap-2">
        <span className="drop-shadow-lg">{workflowFileName}</span>
        {hasUnsavedChanges && (
          <span className="text-yellow-400 text-xs drop-shadow-lg" title="Unsaved changes">●</span>
        )}
      </div>
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
      {nodeSearchOverlayOpen && (
        <NodeSearchOverlay
          searchQuery={nodeSearchQuery}
          matchingNodeIds={matchingNodeIds}
          currentMatchIndex={currentMatchIndex}
          searchExecuted={searchExecuted}
          onSearchQueryChange={setNodeSearchQuery}
          onSearch={handleNodeSearch}
          onNavigate={handleNodeSearchNavigate}
          onClose={handleNodeSearchClose}
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

