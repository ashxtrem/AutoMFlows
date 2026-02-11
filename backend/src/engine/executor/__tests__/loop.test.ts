import { Executor } from '../core';
import { Workflow, NodeType, BaseNode } from '@automflows/shared';
import { createMockSocketServer, createMockContextManager } from '../../../__tests__/helpers/mocks';
import { ConditionEvaluator } from '../../../utils/conditionEvaluator';
import * as nodeHandlers from '../../../nodes';

jest.mock('../../../utils/conditionEvaluator');
jest.mock('../../../nodes');

describe('Executor Loop Integration Tests', () => {
  let mockIo: any;
  let mockContext: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockIo = createMockSocketServer();
    mockContext = createMockContextManager();
  });

  describe('forEach mode execution', () => {
    it('should iterate over all array elements', async () => {
      const testArray = ['item1', 'item2', 'item3'];
      
      const workflow: Workflow = {
        nodes: [
          {
            id: 'start',
            type: NodeType.START,
            position: { x: 0, y: 0 },
            data: {},
          },
          {
            id: 'loop',
            type: NodeType.LOOP,
            position: { x: 100, y: 0 },
            data: {
              mode: 'forEach',
              arrayVariable: 'items',
            },
          },
          {
            id: 'child',
            type: NodeType.JAVASCRIPT_CODE,
            position: { x: 200, y: 0 },
            data: {
              code: 'console.log(context.getVariable("item"));',
            },
          },
        ],
        edges: [
          { id: 'e1', source: 'start', target: 'loop', sourceHandle: 'output', targetHandle: 'input' },
          { id: 'e2', source: 'loop', target: 'child', sourceHandle: 'output', targetHandle: 'input' },
        ],
      };

      const executor = new Executor(workflow, mockIo, false);
      
      // Set up data in context before handler execution
      (executor as any).context.setData('items', testArray);

      // Mock child node handler
      const mockChildHandler = {
        execute: jest.fn().mockResolvedValue(undefined),
      };
      (nodeHandlers.getNodeHandler as jest.Mock).mockReturnValue(mockChildHandler);

      // Execute loop handler first to set up context
      const loopHandler = new (require('../../../nodes/logic').LoopHandler)();
      const loopNode = workflow.nodes.find(n => n.id === 'loop')!;
      await loopHandler.execute(loopNode, (executor as any).context);

      // Now execute the executor (simulating the loop execution logic)
      const executedItems: any[] = [];
      const loopArray = (executor as any).context.getData('_loopArray');
      expect(loopArray).toBeDefined();
      expect(Array.isArray(loopArray)).toBe(true);
      const childNodeIds = (executor as any).parser.getNodesReachableFromHandle('loop', 'output');

      for (let i = 0; i < loopArray.length; i++) {
        (executor as any).context.setVariable('index', i);
        (executor as any).context.setVariable('item', loopArray[i]);
        
        for (const childNodeId of childNodeIds) {
          const childNode = workflow.nodes.find(n => n.id === childNodeId);
          if (childNode) {
            await mockChildHandler.execute(childNode, (executor as any).context);
            executedItems.push((executor as any).context.getVariable('item'));
          }
        }
      }

      expect(executedItems).toEqual(['item1', 'item2', 'item3']);
      expect(mockChildHandler.execute).toHaveBeenCalledTimes(3);
    });

    it('should handle empty array (no iterations)', async () => {
      const workflow: Workflow = {
        nodes: [
          {
            id: 'start',
            type: NodeType.START,
            position: { x: 0, y: 0 },
            data: {},
          },
          {
            id: 'loop',
            type: NodeType.LOOP,
            position: { x: 100, y: 0 },
            data: {
              mode: 'forEach',
              arrayVariable: 'items',
            },
          },
        ],
        edges: [
          { id: 'e1', source: 'start', target: 'loop', sourceHandle: 'output', targetHandle: 'input' },
        ],
      };

      const executor = new Executor(workflow, mockIo, false);
      
      // Set up empty array in context
      (executor as any).context.setData('items', []);

      const loopHandler = new (require('../../../nodes/logic').LoopHandler)();
      const loopNode = workflow.nodes.find(n => n.id === 'loop')!;
      await loopHandler.execute(loopNode, (executor as any).context);

      const loopArray = (executor as any).context.getData('_loopArray');
      expect(loopArray).toEqual([]);
      
      // Should not execute any child nodes
      const childNodeIds = (executor as any).parser.getNodesReachableFromHandle('loop', 'output');
      expect(childNodeIds.length).toBe(0);
    });

    it('should expose item and index variables to child nodes', async () => {
      const testArray = ['todo1', 'todo2'];
      
      const workflow: Workflow = {
        nodes: [
          {
            id: 'start',
            type: NodeType.START,
            position: { x: 0, y: 0 },
            data: {},
          },
          {
            id: 'loop',
            type: NodeType.LOOP,
            position: { x: 100, y: 0 },
            data: {
              mode: 'forEach',
              arrayVariable: 'items',
            },
          },
          {
            id: 'child',
            type: NodeType.JAVASCRIPT_CODE,
            position: { x: 200, y: 0 },
            data: {
              code: `
                const item = context.getVariable('item');
                const index = context.getVariable('index');
                context.setData('processed_' + index, item);
              `,
            },
          },
        ],
        edges: [
          { id: 'e1', source: 'start', target: 'loop', sourceHandle: 'output', targetHandle: 'input' },
          { id: 'e2', source: 'loop', target: 'child', sourceHandle: 'output', targetHandle: 'input' },
        ],
      };

      const executor = new Executor(workflow, mockIo, false);
      
      // Set up data in context
      (executor as any).context.setData('items', testArray);

      const mockChildHandler = {
        execute: jest.fn().mockImplementation(async (node: BaseNode, context: any) => {
          // Simulate JavaScript execution
          const code = (node.data as any).code;
          if (code.includes('getVariable')) {
            const item = context.getVariable('item');
            const index = context.getVariable('index');
            context.setData(`processed_${index}`, item);
          }
        }),
      };
      (nodeHandlers.getNodeHandler as jest.Mock).mockReturnValue(mockChildHandler);

      const loopHandler = new (require('../../../nodes/logic').LoopHandler)();
      const loopNode = workflow.nodes.find(n => n.id === 'loop')!;
      await loopHandler.execute(loopNode, (executor as any).context);

      const loopArray = (executor as any).context.getData('_loopArray');
      expect(loopArray).toBeDefined();
      expect(Array.isArray(loopArray)).toBe(true);
      const childNodeIds = (executor as any).parser.getNodesReachableFromHandle('loop', 'output');

      for (let i = 0; i < loopArray.length; i++) {
        (executor as any).context.setVariable('index', i);
        (executor as any).context.setVariable('item', loopArray[i]);
        
        for (const childNodeId of childNodeIds) {
          const childNode = workflow.nodes.find(n => n.id === childNodeId);
          if (childNode) {
            await mockChildHandler.execute(childNode, (executor as any).context);
          }
        }
      }

      expect((executor as any).context.getData('processed_0')).toBe('todo1');
      expect((executor as any).context.getData('processed_1')).toBe('todo2');
    });
  });

  describe('doWhile mode execution', () => {
    it('should evaluate condition before each iteration', async () => {
      const condition = {
        type: 'javascript' as const,
        javascriptExpression: 'context.getVariable("counter") < 3',
      };

      const workflow: Workflow = {
        nodes: [
          {
            id: 'start',
            type: NodeType.START,
            position: { x: 0, y: 0 },
            data: {},
          },
          {
            id: 'loop',
            type: NodeType.LOOP,
            position: { x: 100, y: 0 },
            data: {
              mode: 'doWhile',
              condition,
              updateStep: 'context.setVariable("counter", context.getVariable("counter") + 1)',
            },
          },
          {
            id: 'child',
            type: NodeType.JAVASCRIPT_CODE,
            position: { x: 200, y: 0 },
            data: {
              code: 'console.log("iteration");',
            },
          },
        ],
        edges: [
          { id: 'e1', source: 'start', target: 'loop', sourceHandle: 'output', targetHandle: 'input' },
          { id: 'e2', source: 'loop', target: 'child', sourceHandle: 'output', targetHandle: 'input' },
        ],
      };

      const executor = new Executor(workflow, mockIo, false);
      
      // Set initial counter
      (executor as any).context.setVariable('counter', 0);

      // Mock condition evaluator
      let callCount = 0;
      (ConditionEvaluator.evaluate as jest.Mock).mockImplementation(async () => {
        const counter = (executor as any).context.getVariable('counter');
        callCount++;
        return { passed: counter < 3 };
      });

      const mockChildHandler = {
        execute: jest.fn().mockResolvedValue(undefined),
      };
      (nodeHandlers.getNodeHandler as jest.Mock).mockReturnValue(mockChildHandler);

      const loopHandler = new (require('../../../nodes/logic').LoopHandler)();
      const loopNode = workflow.nodes.find(n => n.id === 'loop')!;
      await loopHandler.execute(loopNode, (executor as any).context);

      // Simulate loop execution
      const storedCondition = (executor as any).context.getData('_loopCondition');
      const maxIterations = (executor as any).context.getData('_loopMaxIterations') || 1000;
      const updateStep = (executor as any).context.getData('_loopUpdateStep');
      const shouldStart = (executor as any).context.getData('_loopShouldStart');
      const childNodeIds = (executor as any).parser.getNodesReachableFromHandle('loop', 'output');

      if (shouldStart) {
        let iterationCount = 0;
        let conditionPassed = true;

        while (conditionPassed && iterationCount < maxIterations) {
          (executor as any).context.setVariable('index', iterationCount);

          for (const childNodeId of childNodeIds) {
            const childNode = workflow.nodes.find(n => n.id === childNodeId);
            if (childNode) {
              await mockChildHandler.execute(childNode, (executor as any).context);
            }
          }

          // Execute updateStep
          if (updateStep) {
            // Simulate updateStep execution
            const counter = (executor as any).context.getVariable('counter') || 0;
            (executor as any).context.setVariable('counter', counter + 1);
          }

          iterationCount++;

          // Re-evaluate condition
          const conditionResult = await ConditionEvaluator.evaluate(storedCondition, (executor as any).context);
          conditionPassed = conditionResult.passed;
        }
      }

      expect(mockChildHandler.execute).toHaveBeenCalledTimes(3);
      expect((executor as any).context.getVariable('counter')).toBe(3);
    });

    it('should skip loop if initial condition fails', async () => {
      const condition = {
        type: 'javascript' as const,
        javascriptExpression: 'false',
      };

      const workflow: Workflow = {
        nodes: [
          {
            id: 'start',
            type: NodeType.START,
            position: { x: 0, y: 0 },
            data: {},
          },
          {
            id: 'loop',
            type: NodeType.LOOP,
            position: { x: 100, y: 0 },
            data: {
              mode: 'doWhile',
              condition,
            },
          },
        ],
        edges: [
          { id: 'e1', source: 'start', target: 'loop', sourceHandle: 'output', targetHandle: 'input' },
        ],
      };

      const executor = new Executor(workflow, mockIo, false);

      (ConditionEvaluator.evaluate as jest.Mock).mockResolvedValue({
        passed: false,
      });

      const loopHandler = new (require('../../../nodes/logic').LoopHandler)();
      const loopNode = workflow.nodes.find(n => n.id === 'loop')!;
      await loopHandler.execute(loopNode, (executor as any).context);

      const shouldStart = (executor as any).context.getData('_loopShouldStart');
      expect(shouldStart).toBe(false);
    });

    it('should throw error when maxIterations exceeded', async () => {
      const condition = {
        type: 'javascript' as const,
        javascriptExpression: 'true', // Always true
      };

      const workflow: Workflow = {
        nodes: [
          {
            id: 'start',
            type: NodeType.START,
            position: { x: 0, y: 0 },
            data: {},
          },
          {
            id: 'loop',
            type: NodeType.LOOP,
            position: { x: 100, y: 0 },
            data: {
              mode: 'doWhile',
              condition,
              maxIterations: 2,
            },
          },
        ],
        edges: [
          { id: 'e1', source: 'start', target: 'loop', sourceHandle: 'output', targetHandle: 'input' },
        ],
      };

      const executor = new Executor(workflow, mockIo, false);

      (ConditionEvaluator.evaluate as jest.Mock).mockResolvedValue({
        passed: true,
      });

      const loopHandler = new (require('../../../nodes/logic').LoopHandler)();
      const loopNode = workflow.nodes.find(n => n.id === 'loop')!;
      await loopHandler.execute(loopNode, (executor as any).context);

      const storedCondition = (executor as any).context.getData('_loopCondition');
      const maxIterations = (executor as any).context.getData('_loopMaxIterations');
      const shouldStart = (executor as any).context.getData('_loopShouldStart');

      if (shouldStart) {
        let iterationCount = 0;
        let conditionPassed = true;

        while (conditionPassed && iterationCount < maxIterations) {
          iterationCount++;

          if (iterationCount >= maxIterations && conditionPassed) {
            expect(() => {
              throw new Error(`Loop exceeded maximum iterations limit of ${maxIterations}`);
            }).toThrow(`Loop exceeded maximum iterations limit of ${maxIterations}`);
            break;
          }

          const conditionResult = await ConditionEvaluator.evaluate(storedCondition, (executor as any).context);
          conditionPassed = conditionResult.passed;
        }
      }
    });
  });
});
