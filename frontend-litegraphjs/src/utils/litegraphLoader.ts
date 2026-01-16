/**
 * Load LiteGraph.js
 * LiteGraph.js is a CommonJS module that may expose a global or be imported directly
 */

declare global {
  interface Window {
    LiteGraph?: any;
  }
}

let liteGraphLoaded = false;
let LiteGraphModule: any = null;

export async function loadLiteGraph(): Promise<any> {
  if (liteGraphLoaded && LiteGraphModule) {
    return LiteGraphModule;
  }

  // Check if LiteGraph is already available on window (loaded via script tag)
  if (typeof window !== 'undefined' && (window as any).LiteGraph) {
    LiteGraphModule = (window as any).LiteGraph;
    liteGraphLoaded = true;
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/9e444106-9553-445b-b71d-eeb363325ed2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'litegraphLoader.ts:35',message:'LiteGraph found on window',data:{hasLGraph:!!LiteGraphModule.LGraph,hasLGraphNode:!!LiteGraphModule.LGraphNode,hasLGraphCanvas:!!LiteGraphModule.LGraphCanvas},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    return LiteGraphModule;
  }
  
  // Wait for LiteGraph to be available on window (script tag loads asynchronously)
  if (typeof window !== 'undefined') {
    try {
      await new Promise<void>((resolve, reject) => {
        let attempts = 0;
        const maxAttempts = 200; // 20 seconds max wait
        const checkInterval = setInterval(() => {
          attempts++;
          if ((window as any).LiteGraph) {
            clearInterval(checkInterval);
            LiteGraphModule = (window as any).LiteGraph;
            liteGraphLoaded = true;
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/9e444106-9553-445b-b71d-eeb363325ed2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'litegraphLoader.ts:32',message:'LiteGraph loaded from window (polled)',data:{hasLGraph:!!LiteGraphModule.LGraph,hasLGraphNode:!!LiteGraphModule.LGraphNode,hasLGraphCanvas:!!LiteGraphModule.LGraphCanvas,attempts},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'B'})}).catch(()=>{});
            // #endregion
            resolve();
          } else if (attempts >= maxAttempts) {
            clearInterval(checkInterval);
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/9e444106-9553-445b-b71d-eeb363325ed2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'litegraphLoader.ts:40',message:'LiteGraph not found on window after polling, trying module import',data:{attempts},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'B'})}).catch(()=>{});
            // #endregion
            resolve(); // Continue to module import
          }
        }, 100);
      });
      
      if (LiteGraphModule) {
        return LiteGraphModule;
      }
    } catch (error) {
      // If polling fails, fall through to module import
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/9e444106-9553-445b-b71d-eeb363325ed2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'litegraphLoader.ts:50',message:'Error waiting for window.LiteGraph, trying module import',data:{error:error instanceof Error ? error.message : String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
    }
  }

  try {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/9e444106-9553-445b-b71d-eeb363325ed2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'litegraphLoader.ts:26',message:'Attempting to import LiteGraph module',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    
    // Import LiteGraph.js as a module - Vite will handle CommonJS conversion
    // The webpack bundle exports LGraph and LGraphNode as named exports
    // Use ?url to get the raw file URL and load it as a script
    let module: any = null;
    
    try {
      // Try importing the raw file and executing it
      const litegraphUrl = new URL('litegraph.js', import.meta.url).href;
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/9e444106-9553-445b-b71d-eeb363325ed2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'litegraphLoader.ts:74',message:'Trying URL import',data:{litegraphUrl},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      
      // Fallback to regular import
      module = await import('litegraph.js');
    } catch (e) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/9e444106-9553-445b-b71d-eeb363325ed2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'litegraphLoader.ts:82',message:'URL import failed, trying regular import',data:{error:e instanceof Error ? e.message : String(e)},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      module = await import('litegraph.js');
    }
    
    // #region agent log
    // Log what we actually got from the import - check all possible access patterns
    const importResult = {
      hasLGraph: !!(module as any).LGraph,
      hasLGraphNode: !!(module as any).LGraphNode,
      hasLGraphCanvas: !!(module as any).LGraphCanvas,
      hasLiteGraph: !!(module as any).LiteGraph,
      hasDefault: !!(module as any).default,
      moduleKeys: Object.keys(module),
      moduleType: typeof module,
      // Try to get the actual values
      lGraphType: typeof (module as any).LGraph,
      lGraphNodeType: typeof (module as any).LGraphNode,
      defaultType: typeof (module as any).default,
      // Check if it's a Proxy
      isProxy: module && typeof module === 'object' && Object.getPrototypeOf(module) !== Object.prototype,
      // Try accessing via bracket notation
      bracketLGraph: !!(module as any)['LGraph'],
      bracketLGraphNode: !!(module as any)['LGraphNode'],
      // Check if default is actually an object with properties
      defaultIsObject: (module as any).default && typeof (module as any).default === 'object',
      defaultKeys: (module as any).default && typeof (module as any).default === 'object' ? Object.keys((module as any).default).slice(0,30) : [],
    };
    fetch('http://127.0.0.1:7242/ingest/9e444106-9553-445b-b71d-eeb363325ed2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'litegraphLoader.ts:100',message:'Import result detailed',data:importResult,timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    
    // Check if module itself has LiteGraph properties (CommonJS modules sometimes expose directly)
    const moduleHasLGraphDirect = !!(module as any).LGraph;
    const moduleHasLGraphNodeDirect = !!(module as any).LGraphNode;
    const moduleHasLGraphCanvasDirect = !!(module as any).LGraphCanvas;
    const moduleHasLiteGraphDirect = !!(module as any).LiteGraph;
    
    // Also check if it's the LiteGraph namespace itself
    const isLiteGraphNamespace = !!(module as any).LGraph && !!(module as any).LGraphNode;
    
    // #region agent log
    const sampleModuleKeys = Object.keys(module).slice(0, 50);
    const moduleValues = sampleModuleKeys.map(k => ({key: k, type: typeof (module as any)[k], value: (module as any)[k]}));
    fetch('http://127.0.0.1:7242/ingest/9e444106-9553-445b-b71d-eeb363325ed2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'litegraphLoader.ts:95',message:'After initial import',data:{moduleKeys:sampleModuleKeys,moduleValues:moduleValues.slice(0,10),moduleHasLGraphDirect,moduleHasLGraphNodeDirect,moduleHasLGraphCanvasDirect,moduleHasLiteGraphDirect,isLiteGraphNamespace,moduleHasDefault:'default' in module,moduleDefaultValue:(module as any).default,moduleType:typeof module},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    
    // If module itself has LGraph, use it directly
    if (moduleHasLGraphDirect || moduleHasLiteGraphDirect || isLiteGraphNamespace) {
      LiteGraphModule = module;
      liteGraphLoaded = true;
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/9e444106-9553-445b-b71d-eeb363325ed2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'litegraphLoader.ts:105',message:'Found LiteGraph directly on module',data:{hasLGraph:!!LiteGraphModule.LGraph,hasLGraphNode:!!LiteGraphModule.LGraphNode,hasLGraphCanvas:!!LiteGraphModule.LGraphCanvas},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      return LiteGraphModule;
    }
    
    // #region agent log
    // Check all possible ways to access the default
    const default1 = (module as any).default;
    const default2 = (module as any)['default'];
    const default3 = 'default' in module ? (module as any)['default'] : null;
    const descriptor = Object.getOwnPropertyDescriptor(module, 'default');
    const descriptorValue = descriptor?.value;
    const descriptorGet = descriptor?.get;
    const isESModule = !!(module as any).__esModule;
    
    // Try calling the getter if it exists
    let getterValue = null;
    if (descriptorGet) {
      try {
        getterValue = descriptorGet.call(module);
      } catch (e) {
        // Ignore
      }
    }
    
    // Also try accessing default via a function that forces evaluation
    let forcedDefault = null;
    try {
      // Try accessing it as a function call
      if (typeof (module as any).default === 'function') {
        forcedDefault = (module as any).default();
      } else {
        // Force access by creating a new reference
        const mod = module;
        forcedDefault = mod.default;
        // Also try with await if it's a promise
        if (forcedDefault && typeof forcedDefault.then === 'function') {
          forcedDefault = await forcedDefault;
        }
      }
    } catch (e) {
      // Ignore
    }
    
    // Try accessing via Object.getOwnPropertyDescriptor's getter
    let descriptorGetterValue = null;
    if (descriptor && descriptor.get) {
      try {
        descriptorGetterValue = descriptor.get.call(module);
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/9e444106-9553-445b-b71d-eeb363325ed2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'litegraphLoader.ts:142',message:'Descriptor getter called',data:{hasGetterValue:!!descriptorGetterValue,getterValueType:typeof descriptorGetterValue,getterValueKeys:descriptorGetterValue && typeof descriptorGetterValue === 'object' ? Object.keys(descriptorGetterValue).slice(0,30) : [],hasLGraph:!!descriptorGetterValue?.LGraph},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
      } catch (e) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/9e444106-9553-445b-b71d-eeb363325ed2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'litegraphLoader.ts:148',message:'Descriptor getter error',data:{error:e instanceof Error ? e.message : String(e)},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
      }
    }
    
    // Also try accessing via Reflect
    let reflectDefault = null;
    try {
      reflectDefault = Reflect.get(module, 'default');
    } catch (e) {
      // Ignore
    }
    
    // Try accessing via Proxy if module is a proxy
    let proxyTarget = null;
    try {
      if (module && typeof module === 'object') {
        // Check if it's a proxy by trying to access internal properties
        const proto = Object.getPrototypeOf(module);
        if (proto) {
          proxyTarget = proto;
        }
      }
    } catch (e) {
      // Ignore
    }
    
    const moduleKeys = Object.keys(module);
    const allKeys = Object.getOwnPropertyNames(module);
    const getterKeys = getterValue && typeof getterValue === 'object' ? Object.keys(getterValue).slice(0, 30) : [];
    const reflectKeys = reflectDefault && typeof reflectDefault === 'object' ? Object.keys(reflectDefault).slice(0, 30) : [];
    
    // Try to actually evaluate the default by accessing it in a try-catch
    let evaluatedDefault = null;
    try {
      // Force evaluation by accessing it
      evaluatedDefault = (module as any).default;
      // If it's still undefined, try waiting a tick (for lazy-loaded modules)
      if (!evaluatedDefault && descriptorGet) {
        // Call getter again
        evaluatedDefault = descriptorGet.call(module);
      }
    } catch (e) {
      // Ignore
    }
    
    const forcedDefaultKeys = forcedDefault && typeof forcedDefault === 'object' ? Object.keys(forcedDefault).slice(0, 30) : [];
    const descriptorGetterKeys = descriptorGetterValue && typeof descriptorGetterValue === 'object' ? Object.keys(descriptorGetterValue).slice(0, 30) : [];
    fetch('http://127.0.0.1:7242/ingest/9e444106-9553-445b-b71d-eeb363325ed2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'litegraphLoader.ts:30',message:'After import - detailed default check',data:{moduleKeys,allKeys,isESModule,hasDefault1:default1 !== undefined,default1Type:typeof default1,hasDefault2:default2 !== undefined,default2Type:typeof default2,hasDefault3:default3 !== undefined,hasDescriptor:!!descriptor,descriptorValueType:typeof descriptorValue,hasGetter:!!descriptorGet,getterValueType:typeof getterValue,getterKeys,getterHasLGraph:!!getterValue?.LGraph,hasReflectDefault:!!reflectDefault,reflectDefaultType:typeof reflectDefault,reflectKeys,reflectHasLGraph:!!reflectDefault?.LGraph,hasEvaluatedDefault:!!evaluatedDefault,evaluatedDefaultType:typeof evaluatedDefault,evaluatedDefaultKeys:evaluatedDefault && typeof evaluatedDefault === 'object' ? Object.keys(evaluatedDefault).slice(0,30) : [],hasForcedDefault:!!forcedDefault,forcedDefaultType:typeof forcedDefault,forcedDefaultKeys,forcedDefaultHasLGraph:!!forcedDefault?.LGraph,hasDescriptorGetterValue:!!descriptorGetterValue,descriptorGetterValueType:typeof descriptorGetterValue,descriptorGetterKeys,descriptorGetterHasLGraph:!!descriptorGetterValue?.LGraph},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    
    // Use the values we already computed above
    const actualDefault = descriptorValue;
    const defaultKeys = getterValue ? Object.keys(getterValue).slice(0, 30) : (actualDefault ? Object.keys(actualDefault).slice(0, 30) : []);
    // Use the direct check we did earlier
    const defaultHasLGraph = !!(getterValue?.LGraph || actualDefault?.LGraph || evaluatedDefault?.LGraph);
    
    // LiteGraph.js exports as CommonJS, try different export patterns
    // Try accessing default export in multiple ways
    let resolvedModule = null;
    
    // Try descriptorGetterValue first (most reliable getter call)
    if (descriptorGetterValue && typeof descriptorGetterValue === 'object' && descriptorGetterValue.LGraph) {
      resolvedModule = descriptorGetterValue;
    } else if (forcedDefault && typeof forcedDefault === 'object' && forcedDefault.LGraph) {
      resolvedModule = forcedDefault;
    } else if (evaluatedDefault && typeof evaluatedDefault === 'object' && evaluatedDefault.LGraph) {
      resolvedModule = evaluatedDefault;
    } else if (reflectDefault && typeof reflectDefault === 'object' && reflectDefault.LGraph) {
      resolvedModule = reflectDefault;
    } else if (getterValue && typeof getterValue === 'object' && getterValue.LGraph) {
      resolvedModule = getterValue;
    } else if (descriptorValue && typeof descriptorValue === 'object' && descriptorValue.LGraph) {
      resolvedModule = descriptorValue;
    } else if (default1 && typeof default1 === 'object' && default1.LGraph) {
      resolvedModule = default1;
    } else if (default2 && typeof default2 === 'object' && default2.LGraph) {
      resolvedModule = default2;
    } else if (moduleHasLGraphDirect) {
      resolvedModule = module;
    } else if (actualDefault && typeof actualDefault === 'object' && defaultHasLGraph) {
      resolvedModule = actualDefault;
    } else if ((module as any).LiteGraph) {
      resolvedModule = (module as any).LiteGraph;
    } else if (descriptorGetterValue && typeof descriptorGetterValue === 'object') {
      // Use descriptorGetterValue even if we're not sure about LGraph
      resolvedModule = descriptorGetterValue;
    } else if (forcedDefault && typeof forcedDefault === 'object') {
      // Use forcedDefault even if we're not sure about LGraph
      resolvedModule = forcedDefault;
    } else if (evaluatedDefault && typeof evaluatedDefault === 'object') {
      // Use evaluatedDefault even if we're not sure about LGraph
      resolvedModule = evaluatedDefault;
    } else if (reflectDefault && typeof reflectDefault === 'object') {
      // Use reflectDefault even if we're not sure about LGraph
      resolvedModule = reflectDefault;
    } else if (getterValue && typeof getterValue === 'object') {
      // Use getter value even if we're not sure about LGraph
      resolvedModule = getterValue;
    } else if (moduleKeys.includes('default')) {
      // Try to access default via descriptor or direct access
      try {
        const defaultVal = Object.getOwnPropertyDescriptor(module, 'default')?.value || (module as any)['default'] || Reflect.get(module, 'default');
        if (defaultVal && typeof defaultVal === 'object') {
          resolvedModule = defaultVal;
        }
      } catch (e) {
        // Ignore
      }
    } else if (actualDefault) {
      resolvedModule = actualDefault;
    } else if (default1) {
      resolvedModule = default1;
    } else {
      // The module itself might be LiteGraph (if it's already the namespace)
      resolvedModule = module;
    }
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/9e444106-9553-445b-b71d-eeb363325ed2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'litegraphLoader.ts:75',message:'Before final resolution check',data:{hasResolvedModule:!!resolvedModule,resolvedModuleType:typeof resolvedModule,resolvedModuleKeys:resolvedModule ? Object.keys(resolvedModule).slice(0,30) : [],resolvedHasLGraph:!!resolvedModule?.LGraph,resolvedHasLiteGraph:!!resolvedModule?.LiteGraph},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/9e444106-9553-445b-b71d-eeb363325ed2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'litegraphLoader.ts:40',message:'Module resolution attempt',data:{hasResolvedModule:!!resolvedModule,resolvedModuleKeys:resolvedModule ? Object.keys(resolvedModule).slice(0,30) : [],hasLGraph:!!resolvedModule?.LGraph,hasLGraphNode:!!resolvedModule?.LGraphNode,hasLGraphCanvas:!!resolvedModule?.LGraphCanvas},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    
    LiteGraphModule = resolvedModule;
    
    // Also check if it's attached to window (some builds do this)
    if (typeof window !== 'undefined' && (window as any).LiteGraph) {
      LiteGraphModule = (window as any).LiteGraph;
    }
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/9e444106-9553-445b-b71d-eeb363325ed2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'litegraphLoader.ts:45',message:'LiteGraph module resolved',data:{hasLGraph:!!LiteGraphModule?.LGraph,hasLGraphNode:!!LiteGraphModule?.LGraphNode,hasLGraphCanvas:!!LiteGraphModule?.LGraphCanvas,LGraphType:typeof LiteGraphModule?.LGraph,moduleKeys:LiteGraphModule ? Object.keys(LiteGraphModule).slice(0,30) : []},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/9e444106-9553-445b-b71d-eeb363325ed2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'litegraphLoader.ts:130',message:'Final check before error',data:{hasLiteGraphModule:!!LiteGraphModule,LiteGraphModuleType:typeof LiteGraphModule,LiteGraphModuleKeys:LiteGraphModule ? Object.keys(LiteGraphModule).slice(0,30) : [],hasReflectDefault:!!reflectDefault,reflectDefaultKeys:reflectDefault ? Object.keys(reflectDefault).slice(0,30) : [],hasGetterValue:!!getterValue,getterValueKeys:getterValue ? Object.keys(getterValue).slice(0,30) : []},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    
    if (!LiteGraphModule) {
      // Last resort: try using all the access methods even if they don't have LGraph
      if (descriptorGetterValue && typeof descriptorGetterValue === 'object') {
        LiteGraphModule = descriptorGetterValue;
      } else if (forcedDefault && typeof forcedDefault === 'object') {
        LiteGraphModule = forcedDefault;
      } else if (evaluatedDefault && typeof evaluatedDefault === 'object') {
        LiteGraphModule = evaluatedDefault;
      } else if (reflectDefault && typeof reflectDefault === 'object') {
        LiteGraphModule = reflectDefault;
      } else if (getterValue && typeof getterValue === 'object') {
        LiteGraphModule = getterValue;
      } else {
        // Final fallback: use the module itself
        // Even if it doesn't have LGraph directly, we'll try to access it via default later
        LiteGraphModule = module;
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/9e444106-9553-445b-b71d-eeb363325ed2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'litegraphLoader.ts:145',message:'Using module as fallback',data:{moduleKeys:Object.keys(module),hasDefault:'default' in module,willTryDefaultAccess:true},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
      }
    }
    
    // If we have the module but it doesn't have LGraph, try accessing default dynamically
    if (LiteGraphModule && !LiteGraphModule.LGraph && 'default' in LiteGraphModule) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/9e444106-9553-445b-b71d-eeb363325ed2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'litegraphLoader.ts:160',message:'Trying to access default dynamically via Proxy',data:{hasDefault:'default' in LiteGraphModule,moduleType:typeof LiteGraphModule,defaultType:typeof LiteGraphModule.default,defaultIsNull:LiteGraphModule.default === null,defaultIsUndefined:LiteGraphModule.default === undefined},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      
      // Try to force-evaluate the default export
      let evaluatedDefault = null;
      try {
        // Try accessing via descriptor getter first
        const desc = Object.getOwnPropertyDescriptor(LiteGraphModule, 'default');
        if (desc) {
          if (desc.get) {
            evaluatedDefault = desc.get.call(LiteGraphModule);
          } else if (desc.value !== undefined) {
            evaluatedDefault = desc.value;
          }
        }
        
        // Also try direct access
        if (!evaluatedDefault) {
          evaluatedDefault = LiteGraphModule.default;
        }
        
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/9e444106-9553-445b-b71d-eeb363325ed2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'litegraphLoader.ts:180',message:'Evaluated default',data:{hasEvaluatedDefault:!!evaluatedDefault,evaluatedDefaultType:typeof evaluatedDefault,evaluatedDefaultKeys:evaluatedDefault && typeof evaluatedDefault === 'object' ? Object.keys(evaluatedDefault).slice(0,30) : [],hasLGraph:!!evaluatedDefault?.LGraph},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        
        // If evaluated default has LGraph, use it
        if (evaluatedDefault && typeof evaluatedDefault === 'object' && evaluatedDefault.LGraph) {
          LiteGraphModule = evaluatedDefault;
          liteGraphLoaded = true;
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/9e444106-9553-445b-b71d-eeb363325ed2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'litegraphLoader.ts:190',message:'Using evaluated default',data:{hasLGraph:!!LiteGraphModule.LGraph,hasLGraphNode:!!LiteGraphModule.LGraphNode,hasLGraphCanvas:!!LiteGraphModule.LGraphCanvas},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'B'})}).catch(()=>{});
          // #endregion
          return LiteGraphModule;
        }
      } catch (e) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/9e444106-9553-445b-b71d-eeb363325ed2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'litegraphLoader.ts:195',message:'Error evaluating default',data:{error:e instanceof Error ? e.message : String(e)},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
      }
      
      // Create a proxy that accesses default when properties are accessed
      // The default might be a getter that needs to be called
      LiteGraphModule = new Proxy(LiteGraphModule, {
        get(target, prop) {
          // Try direct property first
          if (prop in target && target[prop] !== undefined) {
            return target[prop];
          }
          
          // Try to get from default - might be a getter
          try {
            const defaultVal = target.default;
            if (defaultVal && typeof defaultVal === 'object') {
              if (prop in defaultVal) {
                return defaultVal[prop];
              }
            }
          } catch (e) {
            // Ignore getter errors
          }
          
          // Try accessing via descriptor getter
          try {
            const desc = Object.getOwnPropertyDescriptor(target, 'default');
            if (desc && desc.get) {
              const defaultVal = desc.get.call(target);
              if (defaultVal && typeof defaultVal === 'object' && prop in defaultVal) {
                return defaultVal[prop];
              }
            }
          } catch (e) {
            // Ignore
          }
          
          return undefined;
        }
      });
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/9e444106-9553-445b-b71d-eeb363325ed2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'litegraphLoader.ts:230',message:'After Proxy creation',data:{hasLGraph:!!LiteGraphModule.LGraph,hasLGraphNode:!!LiteGraphModule.LGraphNode,hasLGraphCanvas:!!LiteGraphModule.LGraphCanvas},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
    }
    
    liteGraphLoaded = true;
    return LiteGraphModule;
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/9e444106-9553-445b-b71d-eeb363325ed2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'litegraphLoader.ts:47',message:'Error loading LiteGraph module',data:{errorMessage:error instanceof Error ? error.message : String(error),errorStack:error instanceof Error ? error.stack : undefined},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    throw error;
  }
}

export function getLiteGraph(): any {
  if (!liteGraphLoaded || !LiteGraphModule) {
    throw new Error('LiteGraph not loaded. Call loadLiteGraph() first.');
  }
  return LiteGraphModule;
}
