import { CsvHandleHandler } from '../csvHandle';
import { NodeType } from '@automflows/shared';
import { createMockContextManager, createMockNode } from '../../../__tests__/helpers/mocks';
import { VariableInterpolator } from '../../../utils/variableInterpolator';
import fs from 'fs/promises';

jest.mock('../../../utils/variableInterpolator');
jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
  writeFile: jest.fn(),
  mkdir: jest.fn().mockResolvedValue(undefined),
}));

describe('CsvHandleHandler', () => {
  let handler: CsvHandleHandler;
  let mockContext: ReturnType<typeof createMockContextManager>;

  beforeEach(() => {
    handler = new CsvHandleHandler();
    mockContext = createMockContextManager();
    jest.spyOn(mockContext, 'setData');
    (VariableInterpolator.interpolateString as jest.Mock).mockImplementation((s: string) => s ?? '');
    (fs.readFile as jest.Mock).mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
    (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
  });

  describe('execute', () => {
    it('should throw when action is missing', async () => {
      const node = createMockNode(NodeType.CSV_HANDLE, { filePath: '/tmp/out.csv' });
      await expect(handler.execute(node, mockContext)).rejects.toThrow(
        'CSV Handle node requires an action (write, append, or read).'
      );
    });

    it('should throw for read when filePath is empty', async () => {
      const node = createMockNode(NodeType.CSV_HANDLE, { action: 'read' });
      await expect(handler.execute(node, mockContext)).rejects.toThrow(
        'CSV Handle read action requires filePath.'
      );
    });

    it('should throw for write when dataSource is missing', async () => {
      const node = createMockNode(NodeType.CSV_HANDLE, {
        action: 'write',
        filePath: '/tmp/out.csv',
      });
      await expect(handler.execute(node, mockContext)).rejects.toThrow(
        'CSV Handle write/append action requires dataSource (context key).'
      );
    });

    it('should throw when dataSource is not an array', async () => {
      mockContext.setData('products', 'not-an-array');
      const node = createMockNode(NodeType.CSV_HANDLE, {
        action: 'write',
        filePath: '/tmp/out.csv',
        dataSource: 'products',
      });
      await expect(handler.execute(node, mockContext)).rejects.toThrow(
        'Data source "products" is not an array.'
      );
    });

    it('should throw when dataSource key is not in context', async () => {
      const node = createMockNode(NodeType.CSV_HANDLE, {
        action: 'write',
        filePath: '/tmp/out.csv',
        dataSource: 'missingKey',
      });
      await expect(handler.execute(node, mockContext)).rejects.toThrow(
        'Data source "missingKey" not found in context.'
      );
    });

    it('should write CSV from array of objects', async () => {
      mockContext.setData('products', [
        { name: 'A', price: '1', url: 'https://a.com' },
        { name: 'B', price: '2', url: 'https://b.com' },
      ]);
      const node = createMockNode(NodeType.CSV_HANDLE, {
        action: 'write',
        filePath: '/tmp/products.csv',
        dataSource: 'products',
      });
      await handler.execute(node, mockContext);
      expect(fs.writeFile).toHaveBeenCalledWith(
        '/tmp/products.csv',
        expect.stringContaining('name'),
        'utf-8'
      );
      expect(fs.writeFile).toHaveBeenCalledWith(
        '/tmp/products.csv',
        expect.stringContaining('A'),
        'utf-8'
      );
    });

    it('should write CSV with explicit headers', async () => {
      mockContext.setData('data', [{ a: '1', b: '2' }]);
      const node = createMockNode(NodeType.CSV_HANDLE, {
        action: 'write',
        filePath: '/tmp/x.csv',
        dataSource: 'data',
        headers: ['b', 'a'],
      });
      await handler.execute(node, mockContext);
      const calls = (fs.writeFile as jest.Mock).mock.calls;
      const content = calls[calls.length - 1][1];
      expect(content).toContain('b,a');
      expect(content).toContain('2,1');
    });

    it('should read CSV and set context', async () => {
      const csvContent = 'col1,col2\nv1,v2\nv3,v4';
      (fs.readFile as jest.Mock).mockResolvedValue(csvContent);
      const node = createMockNode(NodeType.CSV_HANDLE, {
        action: 'read',
        filePath: '/tmp/input.csv',
        contextKey: 'parsed',
      });
      await handler.execute(node, mockContext);
      expect(mockContext.setData).toHaveBeenCalledWith('parsed', [
        { col1: 'v1', col2: 'v2' },
        { col1: 'v3', col2: 'v4' },
      ]);
    });

    it('should use default contextKey csvData for read', async () => {
      (fs.readFile as jest.Mock).mockResolvedValue('h\nv');
      const node = createMockNode(NodeType.CSV_HANDLE, {
        action: 'read',
        filePath: '/tmp/in.csv',
      });
      await handler.execute(node, mockContext);
      expect(mockContext.setData).toHaveBeenCalledWith('csvData', expect.any(Array));
    });

    it('should throw when read file not found', async () => {
      (fs.readFile as jest.Mock).mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
      const node = createMockNode(NodeType.CSV_HANDLE, {
        action: 'read',
        filePath: '/tmp/missing.csv',
      });
      await expect(handler.execute(node, mockContext)).rejects.toThrow('CSV file not found');
    });

    it('should append rows to existing file', async () => {
      mockContext.setData('more', [{ name: 'C', price: '3' }]);
      (fs.readFile as jest.Mock).mockResolvedValue('name,price\nA,1\nB,2\n');
      const node = createMockNode(NodeType.CSV_HANDLE, {
        action: 'append',
        filePath: '/tmp/app.csv',
        dataSource: 'more',
      });
      await handler.execute(node, mockContext);
      const calls = (fs.writeFile as jest.Mock).mock.calls;
      const written = calls[calls.length - 1][1];
      expect(written).toContain('name,price');
      expect(written).toContain('A,1');
      expect(written).toContain('B,2');
      expect(written).toContain('C,3');
    });

    it('should interpolate filePath via VariableInterpolator', async () => {
      mockContext.setData('outputDirectory', '/run/123');
      mockContext.setData('rows', [{ x: '1' }]);
      (VariableInterpolator.interpolateString as jest.Mock).mockImplementation((s: string, ctx: any) => {
        const outDir = ctx.getData('outputDirectory');
        return s.replace('${data.outputDirectory}', outDir ?? '');
      });
      const node = createMockNode(NodeType.CSV_HANDLE, {
        action: 'write',
        filePath: '${data.outputDirectory}/out.csv',
        dataSource: 'rows',
      });
      await handler.execute(node, mockContext);
      expect(VariableInterpolator.interpolateString).toHaveBeenCalled();
      expect(fs.writeFile).toHaveBeenCalled();
    });
  });
});
