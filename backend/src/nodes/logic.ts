import { BaseNode, JavaScriptCodeNodeData, LoopNodeData } from '@automflows/shared';
import { NodeHandler } from './base';
import { ContextManager } from '../engine/context';

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

      // Execute user code - wrap in async function to support await
      // eslint-disable-next-line @typescript-eslint/no-implied-eval
      const fn = new Function('context', `return (async function(context) { ${data.code} })(context);`);
      
      const result = await fn(contextData);

      // Store result in context
      if (result !== undefined) {
        context.setData('result', result);
      }
    } catch (error: any) {
      // Always throw error - let executor handle failSilently logic
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

