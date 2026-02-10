export interface ContextMenuState {
  x: number;
  y: number;
  nodeId?: string;
  flowPosition?: { x: number; y: number };
  screenPosition?: { x: number; y: number };
}

export interface SearchOverlayState {
  screen: { x: number; y: number };
  flow: { x: number; y: number };
}

export interface MouseDownState {
  time: number;
  x: number;
  y: number;
}

export interface ViewportState {
  x: number;
  y: number;
  zoom: number;
}

export interface CanvasInnerProps {
  savedViewportRef: React.MutableRefObject<ViewportState | null>;
  reactFlowInstanceRef: React.MutableRefObject<any>;
  isFirstMountRef: React.MutableRefObject<boolean>;
  hasRunInitialFitViewRef: React.MutableRefObject<boolean>;
  hideSidebar?: () => void;
}
