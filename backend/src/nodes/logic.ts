import { BaseNode, JavaScriptCodeNodeData, LoopNodeData } from '@automflows/shared';
import { NodeHandler } from './base';
import { ContextManager } from '../engine/context';
import { ConditionEvaluator } from '../utils/conditionEvaluator';

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

    // Validate mode is provided
    if (!data.mode) {
      throw new Error('Loop mode is required. Must be either "forEach" or "doWhile"');
    }

    try {
      if (data.mode === 'forEach') {
        // Mode A: For Each (Array Iterator)
        if (!data.arrayVariable) {
          throw new Error('Array variable is required for forEach mode');
        }

        const array = context.getData(data.arrayVariable);

        if (!Array.isArray(array)) {
          throw new Error(`Variable ${data.arrayVariable} is not an array`);
        }

        // Set initial loop variables
        context.setVariable('index', 0);
        context.setVariable('item', array[0] || null);
        // Store array for executor to iterate over
        context.setData('_loopArray', array);
        context.setData('_loopMode', 'forEach');
      } else if (data.mode === 'doWhile') {
        // Mode B: Do While (Condition Based)
        if (!data.condition) {
          throw new Error('Condition is required for doWhile mode');
        }

        // Set initial loop variables
        context.setVariable('index', 0);
        context.setVariable('item', null);
        
        // Store configuration for executor
        context.setData('_loopMode', 'doWhile');
        context.setData('_loopCondition', data.condition);
        context.setData('_loopMaxIterations', data.maxIterations || 1000);
        context.setData('_loopUpdateStep', data.updateStep || null);

        // Evaluate initial condition to determine if loop should start
        const initialConditionResult = await ConditionEvaluator.evaluate(data.condition, context);
        context.setData('_loopShouldStart', initialConditionResult.passed);
      } else {
        throw new Error(`Invalid loop mode: ${data.mode}. Must be either "forEach" or "doWhile"`);
      }
    } catch (error: any) {
      if (data.failSilently) {
        console.warn(`Loop failed silently: ${error.message}`);
        return;
      }
      throw error;
    }
  }
}

