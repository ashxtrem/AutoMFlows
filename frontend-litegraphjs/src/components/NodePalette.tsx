import { NodeType } from '@automflows/shared';
import { getLiteGraph } from '../utils/litegraphLoader';

interface NodePaletteProps {
  graph: any | null;
  onNodeAdd?: () => void;
}

const AVAILABLE_NODES = [
  { type: NodeType.START, label: 'Start', category: 'Control' },
  // More nodes will be added as migration progresses
];

export default function NodePalette({ graph, onNodeAdd }: NodePaletteProps) {
  const handleAddNode = (nodeType: string) => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/9e444106-9553-445b-b71d-eeb363325ed2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'NodePalette.tsx:16',message:'handleAddNode called',data:{nodeType,hasGraph:!!graph,graphType:typeof graph},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    if (!graph) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/9e444106-9553-445b-b71d-eeb363325ed2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'NodePalette.tsx:18',message:'Early return: graph is null',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      return;
    }

    try {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/9e444106-9553-445b-b71d-eeb363325ed2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'NodePalette.tsx:22',message:'Before getLiteGraph call',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      const LiteGraph = getLiteGraph();
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/9e444106-9553-445b-b71d-eeb363325ed2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'NodePalette.tsx:25',message:'After getLiteGraph',data:{hasLiteGraph:!!LiteGraph,hasCreateNode:!!LiteGraph?.createNode,hasRegisteredTypes:!!LiteGraph?.registered_node_types,registeredTypesKeys:LiteGraph?.registered_node_types ? Object.keys(LiteGraph.registered_node_types).slice(0,10) : [],liteGraphKeys:LiteGraph ? Object.keys(LiteGraph).slice(0,20) : []},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      
      // Use createNode directly - LiteGraph.createNode handles node type lookup internally
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/9e444106-9553-445b-b71d-eeb363325ed2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'NodePalette.tsx:28',message:'Before createNode',data:{nodeType,hasCreateNode:!!LiteGraph?.createNode},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      
      if (!LiteGraph.createNode) {
        console.error('LiteGraph.createNode not found');
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/9e444106-9553-445b-b71d-eeb363325ed2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'NodePalette.tsx:32',message:'createNode not found',data:{liteGraphKeys:LiteGraph ? Object.keys(LiteGraph).slice(0,20) : []},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
        // #endregion
        return;
      }
      
      let node;
      try {
        node = LiteGraph.createNode(nodeType);
      } catch (createError) {
        console.error(`Error creating node of type ${nodeType}:`, createError);
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/9e444106-9553-445b-b71d-eeb363325ed2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'NodePalette.tsx:36',message:'createNode threw error',data:{nodeType,errorMessage:createError instanceof Error ? createError.message : String(createError)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
        // #endregion
        return;
      }
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/9e444106-9553-445b-b71d-eeb363325ed2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'NodePalette.tsx:42',message:'After createNode',data:{hasNode:!!node,nodeType:node?.type,nodeId:node?.id,nodeConstructor:node?.constructor?.name},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      
      if (!node) {
        console.error(`Failed to create node of type ${nodeType} - createNode returned null/undefined`);
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/9e444106-9553-445b-b71d-eeb363325ed2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'NodePalette.tsx:47',message:'createNode returned null',data:{nodeType},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
        // #endregion
        return;
      }

    // Position node in center of canvas
    const canvas = graph.list_of_graphcanvas?.[0];
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/9e444106-9553-445b-b71d-eeb363325ed2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'NodePalette.tsx:71',message:'Canvas lookup',data:{hasCanvas:!!canvas,canvasListLength:graph?.list_of_graphcanvas?.length || 0,graphNodes:graph?.nodes?.length || 0,graphMethods:graph ? Object.keys(graph).filter(k => typeof graph[k] === 'function').slice(0,20) : []},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    
    // Set node position - ensure it's an array, not an object
    let nodePos: [number, number];
    if (canvas && canvas.canvas) {
      const centerX = (canvas.canvas.width / 2 / (canvas.scale || 1)) - (canvas.offset?.[0] || 0);
      const centerY = (canvas.canvas.height / 2 / (canvas.scale || 1)) - (canvas.offset?.[1] || 0);
      nodePos = [centerX, centerY];
    } else {
      nodePos = [100, 100];
    }
    
    // Set position using array assignment - ensure it's a proper array
    if (!Array.isArray(nodePos)) {
      nodePos = [100, 100];
    }
    const finalPos = [nodePos[0], nodePos[1]]; // Create a new array to ensure it's not an object
    
    // #region agent log
    const beforeAddData = {
      nodePos: finalPos,
      nodePosType: 'array',
      graphNodesCount: graph?.nodes?.length || 0,
      hasGraphAdd: typeof graph?.add === 'function',
    };
    fetch('http://127.0.0.1:7242/ingest/9e444106-9553-445b-b71d-eeb363325ed2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'NodePalette.tsx:85',message:'Before graph.add',data:beforeAddData,timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

      // Add node to graph
      // #region agent log
      const nodeBeforeAdd = {
        nodeId: node.id,
        nodeType: node.type,
        nodePos: Array.isArray((node as any).pos) ? [(node as any).pos[0], (node as any).pos[1]] : [0, 0],
        hasGraphNodes: !!graph.nodes,
        graphNodesLength: graph.nodes?.length || 0,
        graphNodesType: Array.isArray(graph.nodes) ? 'array' : typeof graph.nodes,
      };
      fetch('http://127.0.0.1:7242/ingest/9e444106-9553-445b-b71d-eeb363325ed2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'NodePalette.tsx:88',message:'Node before add',data:nodeBeforeAdd,timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      
      try {
        // Try graph.add() first - but don't rely on it setting position correctly
        const addResult = graph.add(node);
        
        // CRITICAL: Fix position after graph.add() - it might convert pos to an object
        // Check if we can redefine the property
        const posDescriptor1 = Object.getOwnPropertyDescriptor(node, 'pos');
        const canRedefine1 = !posDescriptor1 || posDescriptor1.configurable !== false;
        
        if (canRedefine1 && posDescriptor1?.configurable) {
          // Try to delete and redefine with getter/setter
          try {
            delete (node as any).pos;
            const posValue = [finalPos[0], finalPos[1]];
            Object.defineProperty(node, 'pos', {
              get: () => posValue,
              set: (val: any) => {
                if (Array.isArray(val)) {
                  posValue[0] = val[0];
                  posValue[1] = val[1];
                } else if (val && typeof val === 'object') {
                  posValue[0] = val[0] || val['0'] || 0;
                  posValue[1] = val[1] || val['1'] || 0;
                }
              },
              enumerable: true,
              configurable: true,
            });
          } catch (e) {
            // If defineProperty fails, use direct assignment
            (node as any).pos = finalPos;
          }
        } else {
          // Property is non-configurable or non-writable, update it directly
          const currentPos = (node as any).pos;
          if (currentPos && typeof currentPos === 'object') {
            if (Array.isArray(currentPos)) {
              currentPos[0] = finalPos[0];
              currentPos[1] = finalPos[1];
            } else {
              // Update object keys
              currentPos[0] = finalPos[0];
              currentPos['0'] = finalPos[0];
              currentPos[1] = finalPos[1];
              currentPos['1'] = finalPos[1];
            }
          } else {
            (node as any).pos = finalPos;
          }
        }
        
        // #region agent log
        const addResultData = {
          addResult: addResult !== undefined ? String(addResult) : 'undefined',
          addResultType: typeof addResult,
          graphNodesCount: graph?.nodes?.length || 0,
          nodeAdded: graph?.nodes?.some((n:any)=>n.id===node.id) || false,
          nodeId: node.id,
          allNodeIds: graph?.nodes?.map((n:any)=>n.id) || [],
          graphNodesArray: graph?.nodes ? Array.isArray(graph.nodes) : false,
          nodePosAfterAdd: Array.isArray((node as any).pos) ? [(node as any).pos[0], (node as any).pos[1]] : 'not-array',
        };
        fetch('http://127.0.0.1:7242/ingest/9e444106-9553-445b-b71d-eeb363325ed2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'NodePalette.tsx:93',message:'graph.add result',data:addResultData,timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        
        // If graph.add didn't work, try manually adding to graph.nodes
        if (!graph.nodes || graph.nodes.length === 0 || !graph.nodes.some((n: any) => n.id === node.id)) {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/9e444106-9553-445b-b71d-eeb363325ed2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'NodePalette.tsx:99',message:'graph.add failed, trying manual add',data:{graphNodesCount:graph?.nodes?.length || 0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
          // #endregion
          
          // Ensure graph.nodes exists and is an array
          if (!graph.nodes) {
            graph.nodes = [];
          }
          if (!Array.isArray(graph.nodes)) {
            graph.nodes = [];
          }
          
          // Manually add node
          graph.nodes.push(node);
          
          // Set node graph reference - this is important for LiteGraph
          (node as any).graph = graph;
          
          // CRITICAL: Fix position after manual add - ensure it's an array
          // LiteGraph converts pos to an object, so we need to force it to be an array
          const posArray = [finalPos[0], finalPos[1]];
          
          // Check if pos property descriptor allows redefinition
          const posDescriptor = Object.getOwnPropertyDescriptor(node, 'pos');
          const canRedefine = !posDescriptor || posDescriptor.configurable !== false;
          
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/9e444106-9553-445b-b71d-eeb363325ed2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'NodePalette.tsx:190',message:'Checking pos property',data:{hasDescriptor:!!posDescriptor,configurable:posDescriptor?.configurable,writable:posDescriptor?.writable,canRedefine},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
          // #endregion
          
          if (canRedefine) {
            // Try to delete and redefine
            try {
              // Only delete if configurable
              if (posDescriptor?.configurable) {
                delete (node as any).pos;
              }
              // Create a getter/setter that always returns an array
              Object.defineProperty(node, 'pos', {
                get: function() {
                  return posArray;
                },
                set: function(val: any) {
                  if (Array.isArray(val)) {
                    posArray[0] = val[0];
                    posArray[1] = val[1];
                  } else if (val && typeof val === 'object') {
                    // Convert object with numeric keys to array
                    posArray[0] = val[0] || val['0'] || 0;
                    posArray[1] = val[1] || val['1'] || 0;
                  }
                },
                enumerable: true,
                configurable: true,
              });
            } catch (e) {
              // If defineProperty fails (e.g., property is non-configurable), use direct assignment
              // #region agent log
              fetch('http://127.0.0.1:7242/ingest/9e444106-9553-445b-b71d-eeb363325ed2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'NodePalette.tsx:220',message:'defineProperty failed, using direct assignment',data:{error:e instanceof Error ? e.message : String(e)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
              // #endregion
              // Try to set it directly or update object keys
              const currentPos = (node as any).pos;
              if (currentPos && typeof currentPos === 'object' && !Array.isArray(currentPos)) {
                // Update object keys
                currentPos[0] = posArray[0];
                currentPos['0'] = posArray[0];
                currentPos[1] = posArray[1];
                currentPos['1'] = posArray[1];
              } else {
                (node as any).pos = posArray;
              }
            }
          } else {
            // Property is non-configurable, just set the values directly
            // If it's an object, update the numeric keys
            const currentPos = (node as any).pos;
            if (currentPos && typeof currentPos === 'object') {
              if (Array.isArray(currentPos)) {
                currentPos[0] = posArray[0];
                currentPos[1] = posArray[1];
              } else {
                // It's an object with numeric keys - update them
                currentPos[0] = posArray[0];
                currentPos['0'] = posArray[0];
                currentPos[1] = posArray[1];
                currentPos['1'] = posArray[1];
              }
            } else {
              // Try direct assignment anyway
              try {
                (node as any).pos = posArray;
              } catch (e) {
                // If that fails, update the object keys
                if (currentPos && typeof currentPos === 'object') {
                  currentPos[0] = posArray[0];
                  currentPos['0'] = posArray[0];
                  currentPos[1] = posArray[1];
                  currentPos['1'] = posArray[1];
                }
              }
            }
          }
          
          // Ensure it's set
          (node as any).pos = posArray;
          
          // #region agent log
          const posAfterSet = {
            posValue: (node as any).pos,
            posType: typeof (node as any).pos,
            isArray: Array.isArray((node as any).pos),
            posArray: posArray,
            finalPos: finalPos,
          };
          fetch('http://127.0.0.1:7242/ingest/9e444106-9553-445b-b71d-eeb363325ed2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'NodePalette.tsx:150',message:'Position after manual set',data:posAfterSet,timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
          // #endregion
          
          // Call onNodeAdded callback if it exists
          if (graph.onNodeAdded) {
            graph.onNodeAdded(node);
          }
          
          // Check position again after callback and fix if needed
          if (!Array.isArray((node as any).pos)) {
            (node as any).pos = posArray;
          }
          
          // #region agent log
          const posAfterCallback = {
            posValue: (node as any).pos,
            posType: typeof (node as any).pos,
            isArray: Array.isArray((node as any).pos),
            posArray: posArray,
          };
          fetch('http://127.0.0.1:7242/ingest/9e444106-9553-445b-b71d-eeb363325ed2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'NodePalette.tsx:165',message:'Position after callback',data:posAfterCallback,timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
          // #endregion
          
          // #region agent log
          const nodeState = {
            nodeId: node.id,
            nodeType: node.type,
            nodePos: Array.isArray((node as any).pos) ? [(node as any).pos[0], (node as any).pos[1]] : 'not-array',
            nodeSize: Array.isArray((node as any).size) ? [(node as any).size[0], (node as any).size[1]] : 'not-array',
            nodeTitle: (node as any).title,
            nodeColor: (node as any).color,
            nodeShape: (node as any).shape,
            hasGraph: !!(node as any).graph,
            graphNodesCount: graph?.nodes?.length || 0,
            nodeAdded: graph?.nodes?.some((n:any)=>n.id===node.id) || false,
          };
          fetch('http://127.0.0.1:7242/ingest/9e444106-9553-445b-b71d-eeb363325ed2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'NodePalette.tsx:115',message:'After manual add',data:nodeState,timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
          // #endregion
        } else {
          // graph.add worked, but ensure position is still correct
          // CRITICAL: Fix position even if graph.add worked
          // Delete the property first if it exists, then set it as an array
          try {
            delete (node as any).pos;
          } catch (e) {
            // Ignore if delete fails
          }
          
          // Set position as a proper array
          (node as any).pos = finalPos;
          
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/9e444106-9553-445b-b71d-eeb363325ed2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'NodePalette.tsx:155',message:'graph.add worked, position fixed',data:{nodePos:finalPos,nodePosAfterFix:Array.isArray((node as any).pos) ? [(node as any).pos[0], (node as any).pos[1]] : 'not-array'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
          // #endregion
        }
        
        // Force canvas to redraw if it exists
        const canvasToDraw = canvas || (graph.list_of_graphcanvas && graph.list_of_graphcanvas[0]);
        if (canvasToDraw && typeof canvasToDraw.draw === 'function') {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/9e444106-9553-445b-b71d-eeb363325ed2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'NodePalette.tsx:165',message:'Calling canvas.draw',data:{hasCanvas:!!canvasToDraw,graphNodesCount:graph?.nodes?.length || 0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
          // #endregion
          canvasToDraw.draw();
        }
      } catch (addError) {
        console.error('Error adding node to graph:', addError);
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/9e444106-9553-445b-b71d-eeb363325ed2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'NodePalette.tsx:125',message:'graph.add threw error',data:{errorMessage:addError instanceof Error ? addError.message : String(addError),errorStack:addError instanceof Error ? addError.stack : undefined},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        return;
      }
      onNodeAdd?.();
    } catch (error) {
      console.error('Failed to add node:', error);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/9e444106-9553-445b-b71d-eeb363325ed2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'NodePalette.tsx:55',message:'Error in handleAddNode',data:{errorMessage:error instanceof Error ? error.message : String(error),errorStack:error instanceof Error ? error.stack : undefined},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B,C,D,E'})}).catch(()=>{});
      // #endregion
    }
  };

  return (
    <div className="node-palette" style={{
      width: '200px',
      backgroundColor: '#2d2d2d',
      borderRight: '1px solid #404040',
      padding: '16px',
      overflowY: 'auto',
      height: '100%',
    }}>
      <h3 style={{ 
        color: '#ffffff', 
        fontSize: '14px', 
        fontWeight: 'bold', 
        marginBottom: '16px',
        textTransform: 'uppercase',
      }}>
        Nodes
      </h3>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {AVAILABLE_NODES.map((node) => (
          <button
            key={node.type}
            onClick={() => handleAddNode(node.type)}
            disabled={!graph}
            style={{
              padding: '12px',
              backgroundColor: '#3d3d3d',
              border: '1px solid #404040',
              borderRadius: '4px',
              color: '#ffffff',
              cursor: graph ? 'pointer' : 'not-allowed',
              textAlign: 'left',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => {
              if (graph) {
                e.currentTarget.style.backgroundColor = '#4d4d4d';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#3d3d3d';
            }}
          >
            <div style={{ fontWeight: '500', marginBottom: '4px' }}>{node.label}</div>
            <div style={{ fontSize: '12px', color: '#999999' }}>{node.category}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
