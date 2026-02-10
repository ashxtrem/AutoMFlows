import { IntValueHandler, StringValueHandler, BooleanValueHandler, InputValueHandler } from '../value';
import { NodeType } from '@automflows/shared';
import { createMockContextManager, createMockNode } from '../../../__tests__/helpers/mocks';
import { VariableInterpolator } from '../../../utils/variableInterpolator';

jest.mock('../../../utils/variableInterpolator');

describe('IntValueHandler', () => {
  let handler: IntValueHandler;
  let mockContext: any;

  beforeEach(() => {
    handler = new IntValueHandler();
    mockContext = createMockContextManager();
    (VariableInterpolator.interpolateString as jest.Mock).mockImplementation((str: string) => str.replace('${variables.test}', '42'));
  });

  it('should store integer value', async () => {
    const node = createMockNode(NodeType.INT_VALUE, {
      value: 42,
    });

    await handler.execute(node, mockContext);

    expect(mockContext.setVariable).toHaveBeenCalledWith(node.id, 42);
    expect(mockContext.setData).toHaveBeenCalledWith('value', 42);
  });

  it('should parse string to integer', async () => {
    const node = createMockNode(NodeType.INT_VALUE, {
      value: '42',
    });

    await handler.execute(node, mockContext);

    expect(mockContext.setVariable).toHaveBeenCalledWith(node.id, 42);
  });

  it('should interpolate variables before parsing', async () => {
    const node = createMockNode(NodeType.INT_VALUE, {
      value: '${variables.test}',
    });

    await handler.execute(node, mockContext);

    expect(VariableInterpolator.interpolateString).toHaveBeenCalled();
    expect(mockContext.setVariable).toHaveBeenCalledWith(node.id, 42);
  });

  it('should use custom variableName', async () => {
    const node = createMockNode(NodeType.INT_VALUE, {
      value: 42,
      variableName: 'myVar',
    });

    await handler.execute(node, mockContext);

    expect(mockContext.setVariable).toHaveBeenCalledWith('myVar', 42);
  });
});

describe('StringValueHandler', () => {
  let handler: StringValueHandler;
  let mockContext: any;

  beforeEach(() => {
    handler = new StringValueHandler();
    mockContext = createMockContextManager();
    (VariableInterpolator.interpolateString as jest.Mock).mockImplementation((str: string) => str.replace('${variables.test}', 'interpolated'));
  });

  it('should store string value', async () => {
    const node = createMockNode(NodeType.STRING_VALUE, {
      value: 'test',
    });

    await handler.execute(node, mockContext);

    expect(mockContext.setVariable).toHaveBeenCalledWith(node.id, 'test');
    expect(mockContext.setData).toHaveBeenCalledWith('value', 'test');
  });

  it('should interpolate variables', async () => {
    const node = createMockNode(NodeType.STRING_VALUE, {
      value: '${variables.test}',
    });

    await handler.execute(node, mockContext);

    expect(VariableInterpolator.interpolateString).toHaveBeenCalled();
    expect(mockContext.setVariable).toHaveBeenCalledWith(node.id, 'interpolated');
  });
});

describe('BooleanValueHandler', () => {
  let handler: BooleanValueHandler;
  let mockContext: any;

  beforeEach(() => {
    handler = new BooleanValueHandler();
    mockContext = createMockContextManager();
    (VariableInterpolator.interpolateString as jest.Mock).mockImplementation((str: string) => str.replace('${variables.test}', 'true'));
  });

  it('should store boolean value', async () => {
    const node = createMockNode(NodeType.BOOLEAN_VALUE, {
      value: true,
    });

    await handler.execute(node, mockContext);

    expect(mockContext.setVariable).toHaveBeenCalledWith(node.id, true);
  });

  it('should parse string "true" to boolean', async () => {
    const node = createMockNode(NodeType.BOOLEAN_VALUE, {
      value: 'true',
    });

    await handler.execute(node, mockContext);

    expect(mockContext.setVariable).toHaveBeenCalledWith(node.id, true);
  });

  it('should parse string "1" to boolean', async () => {
    const node = createMockNode(NodeType.BOOLEAN_VALUE, {
      value: '1',
    });

    await handler.execute(node, mockContext);

    expect(mockContext.setVariable).toHaveBeenCalledWith(node.id, true);
  });
});

describe('InputValueHandler', () => {
  let handler: InputValueHandler;
  let mockContext: any;

  beforeEach(() => {
    handler = new InputValueHandler();
    mockContext = createMockContextManager();
  });

  it('should convert to int', async () => {
    const node = createMockNode(NodeType.INPUT_VALUE, {
      value: '42',
      dataType: 'int',
    });

    await handler.execute(node, mockContext);

    expect(mockContext.setVariable).toHaveBeenCalledWith(node.id, 42);
  });

  it('should convert to float', async () => {
    const node = createMockNode(NodeType.INPUT_VALUE, {
      value: '42.5',
      dataType: 'float',
    });

    await handler.execute(node, mockContext);

    expect(mockContext.setVariable).toHaveBeenCalledWith(node.id, 42.5);
  });

  it('should convert to boolean', async () => {
    const node = createMockNode(NodeType.INPUT_VALUE, {
      value: 'true',
      dataType: 'boolean',
    });

    await handler.execute(node, mockContext);

    expect(mockContext.setVariable).toHaveBeenCalledWith(node.id, true);
  });

  it('should convert to string', async () => {
    const node = createMockNode(NodeType.INPUT_VALUE, {
      value: 42,
      dataType: 'string',
    });

    await handler.execute(node, mockContext);

    expect(mockContext.setVariable).toHaveBeenCalledWith(node.id, '42');
  });
});
