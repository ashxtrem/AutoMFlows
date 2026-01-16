declare module 'litegraph.js' {
  export const LGraph: {
    new (): LGraph;
  };
  
  export interface LGraph {
    constructor();
    nodes: LGraphNode[];
    links: LGraphLink[];
    last_node_id: number;
    last_link_id: number;
    list_of_graphcanvas: LGraphCanvas[];
    
    add(node: LGraphNode): void;
    remove(node: LGraphNode): void;
    start(): void;
    stop(): void;
    serialize(): any;
    configure(data: any): void;
    
    onNodeAdded?: (node: LGraphNode) => void;
    onNodeRemoved?: (node: LGraphNode) => void;
    onConnectionChange?: () => void;
    onNodePropertyChanged?: () => void;
  }

  export const LGraphNode: {
    new (): LGraphNode;
  };
  
  export interface LGraphNode {
    id: number;
    type: string;
    pos: [number, number];
    size?: [number, number];
    title?: string;
    color?: string;
    bgcolor?: string;
    properties: Record<string, any>;
    inputs?: Array<{ name: string; type: string; link?: number | null }>;
    outputs?: Array<{ name: string; type: string; links?: number[] }>;
    
    addInput(name: string, type: string): void;
    addOutput(name: string, type: string): void;
    setOutputData(slot: number, data: any): void;
    getInputData(slot: number): any;
    setDirtyCanvas(dirty: boolean): void;
    onExecute?(): void;
    onGetInputs?(): [string, string][];
    onGetOutputs?(): [string, string][];
    onConfigure?(): void;
  }

  export const LGraphLink: {
    new (): LGraphLink;
  };
  
  export interface LGraphLink {
    id: number;
    origin_id: number;
    origin_slot: number;
    target_id: number;
    target_slot: number;
    type?: string;
  }

  export const LGraphCanvas: {
    new (canvas: HTMLCanvasElement, graph: LGraph): LGraphCanvas;
  };
  
  export interface LGraphCanvas {
    canvas: HTMLCanvasElement;
    graph: LGraph;
    scale: number;
    offset: [number, number];
    background_image: string;
    show_info: boolean;
    allow_searchbox: boolean;
    destroy(): void;
    onNodeSelected?: (node: LGraphNode) => void;
    onNodeDeselected?: () => void;
  }

  export const LiteGraph: {
    registered_node_types: Record<string, any>;
    createNode(type: string): LGraphNode | null;
    registerNodeType(type: string, nodeClass: any): void;
  };
}
