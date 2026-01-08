import { BaseNode, JavaScriptCodeNodeData, LoopNodeData } from '@automflows/shared';
import { NodeHandler } from './base';
import { ContextManager } from '../engine/context';
import { WorkflowParser } from '../engine/parser';
import { Workflow } from '@automflows/shared';

export class JavaScriptCodeHandler implements NodeHandler {
  async execute(node: BaseNode, context: ContextManager): Promise<void> {
    const data = node.data as JavaScriptCodeNodeData;
    const page = context.getPage();

    if (!data.code) {
      throw new Error('Code is required for JavaScript Code node');
    }

    // Security warning: This executes arbitrary code
    // In production, this should be sandboxed or restricted
    try {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/9e444106-9553-445b-b71d-eeb363325ed2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'logic.ts:18',message:'JavaScriptCodeHandler.execute - entry',data:{nodeId:node.id,codeLength:data.code?.length,hasAwait:data.code?.includes('await')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      
      // Create a safe execution context
      const contextData = {
        page,
        data: context.getAllData(),
        variables: context.getAllVariables(),
        setData: (key: string, value: any) => context.setData(key, value),
        setVariable: (key: string, value: any) => context.setVariable(key, value),
        getData: (key: string) => context.getData(key),
        getVariable: (key: string) => context.getVariable(key),
      };

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/9e444106-9553-445b-b71d-eeb363325ed2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'logic.ts:30',message:'Before Function constructor',data:{codePreview:data.code?.substring(0,100),hasAwait:data.code?.includes('await')},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'B'})}).catch(()=>{});
      // #endregion

      // Execute user code - wrap in async function to support await
      // eslint-disable-next-line @typescript-eslint/no-implied-eval
      const fn = new Function('context', `return (async function(context) { ${data.code} })(context);`);
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/9e444106-9553-445b-b71d-eeb363325ed2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'logic.ts:35',message:'After Function constructor, before await',data:{fnType:typeof fn,isAsync:fn.constructor.name === 'AsyncFunction'},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      
      const result = await fn(contextData);
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/9e444106-9553-445b-b71d-eeb363325ed2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'logic.ts:38',message:'After fn execution',data:{resultType:typeof result,hasResult:result !== undefined},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion

      // Store result in context
      if (result !== undefined) {
        context.setData('result', result);
      }
    } catch (error: any) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/9e444106-9553-445b-b71d-eeb363325ed2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'logic.ts:45',message:'JavaScript execution error caught',data:{errorMessage:error.message,errorStack:error.stack?.substring(0,200),failSilently:data.failSilently},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      
      if (data.failSilently) {
        console.warn(`JavaScript execution failed silently: ${error.message}`);
        return;
      }
      throw new Error(`JavaScript execution error: ${error.message}`);
    }
  }
}

export class LoopHandler implements NodeHandler {
  async execute(node: BaseNode, context: ContextManager): Promise<void> {
    const data = node.data as LoopNodeData;

    if (!data.arrayVariable) {
      throw new Error('Array variable is required for Loop node');
    }

    try {
      const array = context.getData(data.arrayVariable);

      if (!Array.isArray(array)) {
        throw new Error(`Variable ${data.arrayVariable} is not an array`);
      }

      // Store loop items in context for child nodes
      context.setVariable('loopItems', array);
      context.setVariable('loopIndex', 0);
      context.setVariable('loopCurrent', array[0] || null);

      // Note: Actual iteration over child nodes would be handled by the executor
      // This node just prepares the loop context
    } catch (error: any) {
      if (data.failSilently) {
        console.warn(`Loop failed silently: ${error.message}`);
        return;
      }
      throw error;
    }
  }
}

