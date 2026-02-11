import { LoopHandler } from '../../logic';
import { NodeType } from '@automflows/shared';
import { createMockContextManager, createMockNode } from '../../../__tests__/helpers/mocks';
import { ConditionEvaluator } from '../../../utils/conditionEvaluator';

jest.mock('../../../utils/conditionEvaluator');

describe('LoopHandler', () => {
  let handler: LoopHandler;
  let mockContext: any;

  beforeEach(() => {
    handler = new LoopHandler();
    mockContext = createMockContextManager();
    // Spy on context methods
    jest.spyOn(mockContext, 'getData');
    jest.spyOn(mockContext, 'setData');
    jest.spyOn(mockContext, 'setVariable');
    jest.spyOn(mockContext, 'getVariable');
    jest.clearAllMocks();
  });

  describe('forEach mode', () => {
    it('should validate arrayVariable is provided', async () => {
      const node = createMockNode(NodeType.LOOP, {
        mode: 'forEach',
      });

      await expect(handler.execute(node, mockContext)).rejects.toThrow(
        'Array variable is required for forEach mode'
      );
    });

    it('should get array from context and set initial variables', async () => {
      const testArray = ['item1', 'item2', 'item3'];
      (mockContext.getData as jest.Mock).mockReturnValue(testArray);
      mockContext.setData('items', testArray);

      const node = createMockNode(NodeType.LOOP, {
        mode: 'forEach',
        arrayVariable: 'items',
      });

      await handler.execute(node, mockContext);

      expect(mockContext.getData).toHaveBeenCalledWith('items');
      expect(mockContext.setVariable).toHaveBeenCalledWith('index', 0);
      expect(mockContext.setVariable).toHaveBeenCalledWith('item', 'item1');
      expect(mockContext.setData).toHaveBeenCalledWith('_loopArray', testArray);
      expect(mockContext.setData).toHaveBeenCalledWith('_loopMode', 'forEach');
    });

    it('should handle empty array', async () => {
      (mockContext.getData as jest.Mock).mockReturnValue([]);
      mockContext.setData('items', []);

      const node = createMockNode(NodeType.LOOP, {
        mode: 'forEach',
        arrayVariable: 'items',
      });

      await handler.execute(node, mockContext);

      expect(mockContext.setVariable).toHaveBeenCalledWith('index', 0);
      expect(mockContext.setVariable).toHaveBeenCalledWith('item', null);
    });

    it('should throw error if arrayVariable is not an array', async () => {
      (mockContext.getData as jest.Mock).mockReturnValue('not an array');

      const node = createMockNode(NodeType.LOOP, {
        mode: 'forEach',
        arrayVariable: 'items',
      });

      await expect(handler.execute(node, mockContext)).rejects.toThrow(
        'Variable items is not an array'
      );
    });

    it('should handle failSilently option', async () => {
      (mockContext.getData as jest.Mock).mockImplementation(() => {
        throw new Error('Variable not found');
      });

      const node = createMockNode(NodeType.LOOP, {
        mode: 'forEach',
        arrayVariable: 'items',
        failSilently: true,
      });

      await handler.execute(node, mockContext);

      // Should not throw, just return
      expect(mockContext.setVariable).not.toHaveBeenCalled();
    });
  });

  describe('doWhile mode', () => {
    it('should validate condition is provided', async () => {
      const node = createMockNode(NodeType.LOOP, {
        mode: 'doWhile',
      });

      await expect(handler.execute(node, mockContext)).rejects.toThrow(
        'Condition is required for doWhile mode'
      );
    });

    it('should set initial variables and store configuration', async () => {
      const condition = {
        type: 'javascript' as const,
        javascriptExpression: 'context.getVariable("counter") < 10',
      };

      (ConditionEvaluator.evaluate as jest.Mock).mockResolvedValue({
        passed: true,
      });

      const node = createMockNode(NodeType.LOOP, {
        mode: 'doWhile',
        condition,
        maxIterations: 100,
        updateStep: 'context.setVariable("counter", counter + 1)',
      });

      await handler.execute(node, mockContext);

      expect(mockContext.setVariable).toHaveBeenCalledWith('index', 0);
      expect(mockContext.setVariable).toHaveBeenCalledWith('item', null);
      expect(mockContext.setData).toHaveBeenCalledWith('_loopMode', 'doWhile');
      expect(mockContext.setData).toHaveBeenCalledWith('_loopCondition', condition);
      expect(mockContext.setData).toHaveBeenCalledWith('_loopMaxIterations', 100);
      expect(mockContext.setData).toHaveBeenCalledWith('_loopUpdateStep', 'context.setVariable("counter", counter + 1)');
      expect(mockContext.setData).toHaveBeenCalledWith('_loopShouldStart', true);
      expect(ConditionEvaluator.evaluate).toHaveBeenCalledWith(condition, mockContext);
    });

    it('should use default maxIterations if not provided', async () => {
      const condition = {
        type: 'javascript' as const,
        javascriptExpression: 'true',
      };

      (ConditionEvaluator.evaluate as jest.Mock).mockResolvedValue({
        passed: true,
      });

      const node = createMockNode(NodeType.LOOP, {
        mode: 'doWhile',
        condition,
      });

      await handler.execute(node, mockContext);

      expect(mockContext.setData).toHaveBeenCalledWith('_loopMaxIterations', 1000);
    });

    it('should set _loopShouldStart to false if initial condition fails', async () => {
      const condition = {
        type: 'javascript' as const,
        javascriptExpression: 'false',
      };

      (ConditionEvaluator.evaluate as jest.Mock).mockResolvedValue({
        passed: false,
      });

      const node = createMockNode(NodeType.LOOP, {
        mode: 'doWhile',
        condition,
      });

      await handler.execute(node, mockContext);

      expect(mockContext.setData).toHaveBeenCalledWith('_loopShouldStart', false);
    });

    it('should handle failSilently option', async () => {
      const condition = {
        type: 'javascript' as const,
        javascriptExpression: 'true',
      };

      (ConditionEvaluator.evaluate as jest.Mock).mockImplementation(() => {
        throw new Error('Condition evaluation failed');
      });

      const node = createMockNode(NodeType.LOOP, {
        mode: 'doWhile',
        condition,
        failSilently: true,
      });

      await handler.execute(node, mockContext);

      // Variables are set before condition evaluation, so they will be called
      // But the handler should catch the error and return without throwing
      expect(mockContext.setVariable).toHaveBeenCalledWith('index', 0);
      expect(mockContext.setVariable).toHaveBeenCalledWith('item', null);
      // But condition evaluation should fail and handler should return early
      // So _loopShouldStart should not be set
      expect(mockContext.setData).not.toHaveBeenCalledWith('_loopShouldStart', expect.anything());
    });
  });

  describe('validation', () => {
    it('should throw error if mode is not provided', async () => {
      const node = createMockNode(NodeType.LOOP, {});

      await expect(handler.execute(node, mockContext)).rejects.toThrow(
        'Loop mode is required. Must be either "forEach" or "doWhile"'
      );
    });

    it('should throw error if mode is invalid', async () => {
      const node = createMockNode(NodeType.LOOP, {
        mode: 'invalidMode',
      });

      await expect(handler.execute(node, mockContext)).rejects.toThrow(
        'Invalid loop mode: invalidMode. Must be either "forEach" or "doWhile"'
      );
    });
  });
});
