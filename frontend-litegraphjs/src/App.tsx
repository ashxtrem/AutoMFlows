import { useEffect } from 'react';
import LiteGraphCanvas from './components/LiteGraphCanvas';
import NodePalette from './components/NodePalette';
import PropertyPanel from './components/PropertyPanel';
import Toolbar from './components/Toolbar';
import { useWorkflowStore } from './store/workflowStore';
import { loadLiteGraph, getLiteGraph } from './utils/litegraphLoader';

function App() {
  const { graph, setGraph, selectedNode, setSelectedNode } = useWorkflowStore();

  useEffect(() => {
    // Load LiteGraph.js first, then initialize graph
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/9e444106-9553-445b-b71d-eeb363325ed2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:13',message:'App useEffect: starting LiteGraph load',data:{hasGraph:!!graph},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    loadLiteGraph().then(() => {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/9e444106-9553-445b-b71d-eeb363325ed2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:16',message:'LiteGraph loaded successfully',data:{hasGraph:!!graph},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      // Initialize graph if not already set
      if (!graph) {
        const LiteGraph = getLiteGraph();
        
        // Access LGraph constructor from LiteGraph namespace
        // Try LiteGraph.LGraph first, then LiteGraph.default.LGraph
        let LGraph = LiteGraph.LGraph;
        let LiteGraphNamespace = LiteGraph;
        
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/9e444106-9553-445b-b71d-eeb363325ed2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:22',message:'LGraph constructor check',data:{hasLGraph:!!LGraph,lGraphType:typeof LGraph,hasDefault:!!LiteGraph.default,defaultType:typeof LiteGraph.default,defaultKeys:LiteGraph.default && typeof LiteGraph.default === 'object' ? Object.keys(LiteGraph.default).slice(0,20) : []},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        
        // If LGraph is not found, try accessing via default
        if (!LGraph && LiteGraph.default) {
          LiteGraphNamespace = LiteGraph.default;
          LGraph = LiteGraphNamespace.LGraph;
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/9e444106-9553-445b-b71d-eeb363325ed2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:32',message:'Tried default export',data:{hasLGraph:!!LGraph,lGraphType:typeof LGraph,namespaceKeys:LiteGraphNamespace && typeof LiteGraphNamespace === 'object' ? Object.keys(LiteGraphNamespace).slice(0,20) : []},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
          // #endregion
        }
        
        // Try accessing via Proxy if LiteGraph is a Proxy
        if (!LGraph && LiteGraphNamespace && typeof LiteGraphNamespace === 'object') {
          try {
            // Try accessing LGraph property - Proxy might handle it
            LGraph = LiteGraphNamespace.LGraph;
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/9e444106-9553-445b-b71d-eeb363325ed2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:42',message:'Tried Proxy access',data:{hasLGraph:!!LGraph,lGraphType:typeof LGraph},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
            // #endregion
          } catch (e) {
            // Ignore
          }
        }
        
        if (!LGraph || typeof LGraph !== 'function') {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/9e444106-9553-445b-b71d-eeb363325ed2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:50',message:'LGraph not found, checking all keys',data:{liteGraphKeys:Object.keys(LiteGraph).slice(0,30),liteGraphNamespaceKeys:LiteGraphNamespace && typeof LiteGraphNamespace === 'object' ? Object.keys(LiteGraphNamespace).slice(0,30) : []},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
          // #endregion
          throw new Error('LGraph constructor not found. Available keys: ' + Object.keys(LiteGraph).slice(0, 20).join(', '));
        }
        
        const newGraph = new LGraph();
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/9e444106-9553-445b-b71d-eeb363325ed2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:28',message:'Graph created',data:{graphId:newGraph?.id || 'unknown',graphNodesCount:newGraph?.nodes?.length || 0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        setGraph(newGraph);
        
        // Try to load from localStorage
        useWorkflowStore.getState().loadFromLocalStorage();
        // Ensure graph is started
        newGraph.start();
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/9e444106-9553-445b-b71d-eeb363325ed2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:33',message:'Graph started',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
      }
    }).catch((error) => {
      console.error('Failed to load LiteGraph:', error);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/9e444106-9553-445b-b71d-eeb363325ed2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:36',message:'Failed to load LiteGraph',data:{errorMessage:error instanceof Error ? error.message : String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
    });

    return () => {
      // Cleanup is handled by LiteGraphCanvas component
    };
  }, [graph, setGraph]);

  const handleGraphChange = (updatedGraph: any) => {
    // Graph changed, update store
    setGraph(updatedGraph);
  };

  const handleNodeAdd = () => {
    // Node added, graph will be updated via handleGraphChange
  };

  // Handle node selection from canvas
  useEffect(() => {
    if (!graph) return;

    // Listen for node selection events
    const canvas = graph.list_of_graphcanvas?.[0];
    if (canvas) {
      const originalOnNodeSelected = canvas.onNodeSelected?.bind(canvas);
      canvas.onNodeSelected = (node: any) => {
        setSelectedNode(node);
        originalOnNodeSelected?.(node);
      };

      const originalOnNodeDeselected = canvas.onNodeDeselected?.bind(canvas);
      canvas.onNodeDeselected = () => {
        setSelectedNode(null);
        originalOnNodeDeselected?.();
      };
    }
  }, [graph, setSelectedNode]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw' }}>
      <Toolbar />
      
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <NodePalette graph={graph} onNodeAdd={handleNodeAdd} />
        
        <div style={{ flex: 1, position: 'relative' }}>
          {graph && (
            <LiteGraphCanvas 
              graph={graph} 
              onGraphChange={handleGraphChange}
            />
          )}
        </div>
        
        <PropertyPanel node={selectedNode} />
      </div>
    </div>
  );
}

export default App;
