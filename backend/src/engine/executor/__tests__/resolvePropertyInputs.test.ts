import { resolvePropertyInputs } from '../resolvePropertyInputs';
import { BaseNode, NodeType, PropertyDataType, Workflow, Edge } from '@automflows/shared';
import { WorkflowParser } from '../../parser';
import { ContextManager } from '../../context';
import { TypeConverter } from '../../../utils/typeConverter';

jest.mock('../../../utils/typeConverter');

describe('resolvePropertyInputs', () => {
  let mockWorkflow: Workflow;
  let mockParser: WorkflowParser;
  let mockContext: ContextManager;
  let mockTraceLog: jest.Mock;

  beforeEach(() => {
    mockTraceLog = jest.fn();
    mockWorkflow = {
      nodes: [],
      edges: [],
    };

    mockParser = {
      getAllNodes: jest.fn().mockReturnValue([]),
    } as any;

    mockContext = {
      getVariable: jest.fn(),
    } as any;

    (TypeConverter.convert as jest.Mock).mockImplementation((value) => value);
    (TypeConverter.inferType as jest.Mock).mockReturnValue(PropertyDataType.STRING);
  });

  it('should return node unchanged if no input connections', () => {
    const node: BaseNode = {
      id: 'node-1',
      type: NodeType.ACTION,
      position: { x: 0, y: 0 },
      data: {},
    };

    const result = resolvePropertyInputs(node, mockWorkflow, mockParser, mockContext, mockTraceLog);

    expect(result).toEqual(node);
  });

  it('should resolve property input from INT_VALUE node', () => {
    const sourceNode: BaseNode = {
      id: 'source-1',
      type: NodeType.INT_VALUE,
      position: { x: 0, y: 0 },
      data: { value: 42 },
    };

    const targetNode: BaseNode = {
      id: 'target-1',
      type: NodeType.ACTION,
      position: { x: 0, y: 0 },
      data: {
        _inputConnections: {
          count: { isInput: true },
        },
      },
    };

    mockWorkflow.nodes = [sourceNode, targetNode];
    mockWorkflow.edges = [
      {
        id: 'edge-1',
        source: 'source-1',
        target: 'target-1',
        targetHandle: 'count-input',
      },
    ];

    (mockParser.getAllNodes as jest.Mock).mockReturnValue([sourceNode, targetNode]);
    (mockContext.getVariable as jest.Mock).mockReturnValue(42);
    (TypeConverter.convert as jest.Mock).mockReturnValue(42);

    const result = resolvePropertyInputs(targetNode, mockWorkflow, mockParser, mockContext, mockTraceLog);

    expect((result.data as any).count).toBe(42);
    expect(mockTraceLog).toHaveBeenCalledWith(
      expect.stringContaining('Resolved property count')
    );
  });

  it('should resolve property input from STRING_VALUE node', () => {
    const sourceNode: BaseNode = {
      id: 'source-1',
      type: NodeType.STRING_VALUE,
      position: { x: 0, y: 0 },
      data: { value: 'test' },
    };

    const targetNode: BaseNode = {
      id: 'target-1',
      type: NodeType.ACTION,
      position: { x: 0, y: 0 },
      data: {
        _inputConnections: {
          text: { isInput: true },
        },
      },
    };

    mockWorkflow.nodes = [sourceNode, targetNode];
    mockWorkflow.edges = [
      {
        id: 'edge-1',
        source: 'source-1',
        target: 'target-1',
        targetHandle: 'text-input',
      },
    ];

    (mockParser.getAllNodes as jest.Mock).mockReturnValue([sourceNode, targetNode]);
    (mockContext.getVariable as jest.Mock).mockReturnValue('test');

    const result = resolvePropertyInputs(targetNode, mockWorkflow, mockParser, mockContext, mockTraceLog);

    expect((result.data as any).text).toBe('test');
  });

  it('should skip properties that are not inputs', () => {
    const targetNode: BaseNode = {
      id: 'target-1',
      type: NodeType.ACTION,
      position: { x: 0, y: 0 },
      data: {
        _inputConnections: {
          count: { isInput: false },
        },
      },
    };

    const result = resolvePropertyInputs(targetNode, mockWorkflow, mockParser, mockContext, mockTraceLog);

    expect((result.data as any).count).toBeUndefined();
  });

  it('should handle missing source value gracefully', () => {
    const sourceNode: BaseNode = {
      id: 'source-1',
      type: NodeType.INT_VALUE,
      position: { x: 0, y: 0 },
      data: {},
    };

    const targetNode: BaseNode = {
      id: 'target-1',
      type: NodeType.ACTION,
      position: { x: 0, y: 0 },
      data: {
        _inputConnections: {
          count: { isInput: true },
        },
      },
    };

    mockWorkflow.nodes = [sourceNode, targetNode];
    mockWorkflow.edges = [
      {
        id: 'edge-1',
        source: 'source-1',
        target: 'target-1',
        targetHandle: 'count-input',
      },
    ];

    (mockParser.getAllNodes as jest.Mock).mockReturnValue([sourceNode, targetNode]);
    (mockContext.getVariable as jest.Mock).mockReturnValue(undefined);

    const result = resolvePropertyInputs(targetNode, mockWorkflow, mockParser, mockContext, mockTraceLog);

    expect((result.data as any).count).toBeUndefined();
    expect(mockTraceLog).toHaveBeenCalledWith(
      expect.stringContaining('Warning: Source value not found')
    );
  });

  it('should handle missing edge gracefully', () => {
    const targetNode: BaseNode = {
      id: 'target-1',
      type: NodeType.ACTION,
      position: { x: 0, y: 0 },
      data: {
        _inputConnections: {
          count: { isInput: true },
        },
      },
    };

    mockWorkflow.edges = [];

    const result = resolvePropertyInputs(targetNode, mockWorkflow, mockParser, mockContext, mockTraceLog);

    expect((result.data as any).count).toBeUndefined();
    expect(mockTraceLog).toHaveBeenCalledWith(
      expect.stringContaining('Warning: No edge found')
    );
  });
});
