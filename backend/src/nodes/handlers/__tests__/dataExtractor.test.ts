import { DataExtractorHandler } from '../dataExtractor';
import { NodeType } from '@automflows/shared';
import { createMockContextManager, createMockNode, createMockPage } from '../../../__tests__/helpers/mocks';
import fs from 'fs/promises';
import { stringify } from 'csv-stringify/sync';

jest.mock('fs/promises');
jest.mock('csv-stringify/sync');
jest.mock('../../../utils/textSelectorResolver', () => ({
  TextSelectorResolver: {
    resolve: jest.fn().mockImplementation(async (page: any, text: string) => page.locator(text)),
  },
}));

describe('DataExtractorHandler', () => {
  let handler: DataExtractorHandler;
  let mockPage: ReturnType<typeof createMockPage>;
  let mockContext: ReturnType<typeof createMockContextManager>;

  beforeEach(() => {
    handler = new DataExtractorHandler();
    mockPage = createMockPage();
    mockContext = createMockContextManager(mockPage);
    jest.spyOn(mockContext, 'setData');
    (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
    (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
    (stringify as jest.Mock).mockImplementation((rows: any[][]) => rows.map(r => r.join(',')).join('\n') + '\n');
  });

  it('should throw when no page is available', async () => {
    const context = createMockContextManager();
    const node = createMockNode(NodeType.DATA_EXTRACTOR, {
      containerSelector: '.item',
      fields: [{ name: 'title', selector: '.title', extract: 'text' }],
    });
    await expect(handler.execute(node, context)).rejects.toThrow('No page available');
  });

  it('should throw when containerSelector is missing', async () => {
    const node = createMockNode(NodeType.DATA_EXTRACTOR, {
      containerSelector: '',
      fields: [{ name: 'title', selector: '.title', extract: 'text' }],
    });
    await expect(handler.execute(node, mockContext)).rejects.toThrow('Container selector is required');
  });

  it('should throw when fields are empty', async () => {
    const node = createMockNode(NodeType.DATA_EXTRACTOR, {
      containerSelector: '.item',
      fields: [],
    });
    await expect(handler.execute(node, mockContext)).rejects.toThrow('At least one field definition is required');
  });

  it('should extract text fields from containers', async () => {
    const mockFieldLocator = {
      count: jest.fn().mockResolvedValue(1),
      first: jest.fn().mockReturnValue({
        textContent: jest.fn().mockResolvedValue('Product 1'),
        getAttribute: jest.fn().mockResolvedValue(null),
        innerHTML: jest.fn().mockResolvedValue('<span>Product 1</span>'),
      }),
    };

    const mockContainer = {
      locator: jest.fn().mockReturnValue(mockFieldLocator),
    };

    const mockContainerLocator = {
      all: jest.fn().mockResolvedValue([mockContainer]),
      first: jest.fn().mockReturnValue({
        waitFor: jest.fn().mockResolvedValue(undefined),
      }),
      filter: jest.fn().mockReturnThis(),
      nth: jest.fn().mockReturnThis(),
      locator: jest.fn().mockReturnThis(),
    };

    mockPage.locator.mockReturnValue(mockContainerLocator);

    const node = createMockNode(NodeType.DATA_EXTRACTOR, {
      containerSelector: '.product',
      fields: [{ name: 'title', selector: '.title', extract: 'text' }],
    });

    await handler.execute(node, mockContext);
    expect(mockContext.setData).toHaveBeenCalledWith('extractedData', [{ title: 'Product 1' }]);
  });

  it('should extract attribute fields', async () => {
    const mockFieldLocator = {
      count: jest.fn().mockResolvedValue(1),
      first: jest.fn().mockReturnValue({
        textContent: jest.fn().mockResolvedValue('Link'),
        getAttribute: jest.fn().mockResolvedValue('/product/1'),
        innerHTML: jest.fn().mockResolvedValue(''),
      }),
    };

    const mockContainer = {
      locator: jest.fn().mockReturnValue(mockFieldLocator),
    };

    const mockContainerLocator = {
      all: jest.fn().mockResolvedValue([mockContainer]),
      first: jest.fn().mockReturnValue({
        waitFor: jest.fn().mockResolvedValue(undefined),
      }),
      filter: jest.fn().mockReturnThis(),
      nth: jest.fn().mockReturnThis(),
      locator: jest.fn().mockReturnThis(),
    };

    mockPage.locator.mockReturnValue(mockContainerLocator);

    const node = createMockNode(NodeType.DATA_EXTRACTOR, {
      containerSelector: '.product',
      fields: [{ name: 'link', selector: 'a', extract: 'attribute', attribute: 'href' }],
    });

    await handler.execute(node, mockContext);
    expect(mockContext.setData).toHaveBeenCalledWith('extractedData', [{ link: '/product/1' }]);
  });

  it('should handle missing elements with null when field not found', async () => {
    const mockFieldLocator = {
      count: jest.fn().mockResolvedValue(0),
    };

    const mockContainer = {
      locator: jest.fn().mockReturnValue(mockFieldLocator),
    };

    const mockContainerLocator = {
      all: jest.fn().mockResolvedValue([mockContainer]),
      first: jest.fn().mockReturnValue({
        waitFor: jest.fn().mockResolvedValue(undefined),
      }),
      filter: jest.fn().mockReturnThis(),
      nth: jest.fn().mockReturnThis(),
      locator: jest.fn().mockReturnThis(),
    };

    mockPage.locator.mockReturnValue(mockContainerLocator);

    const node = createMockNode(NodeType.DATA_EXTRACTOR, {
      containerSelector: '.product',
      fields: [{ name: 'price', selector: '.price', extract: 'text' }],
    });

    await handler.execute(node, mockContext);
    expect(mockContext.setData).toHaveBeenCalledWith('extractedData', [{ price: null }]);
  });

  it('should respect the limit parameter', async () => {
    const createMockContainerItem = (text: string) => ({
      locator: jest.fn().mockReturnValue({
        count: jest.fn().mockResolvedValue(1),
        first: jest.fn().mockReturnValue({
          textContent: jest.fn().mockResolvedValue(text),
        }),
      }),
    });

    const mockContainerLocator = {
      all: jest.fn().mockResolvedValue([
        createMockContainerItem('Item 1'),
        createMockContainerItem('Item 2'),
        createMockContainerItem('Item 3'),
      ]),
      first: jest.fn().mockReturnValue({
        waitFor: jest.fn().mockResolvedValue(undefined),
      }),
      filter: jest.fn().mockReturnThis(),
      nth: jest.fn().mockReturnThis(),
      locator: jest.fn().mockReturnThis(),
    };

    mockPage.locator.mockReturnValue(mockContainerLocator);

    const node = createMockNode(NodeType.DATA_EXTRACTOR, {
      containerSelector: '.item',
      fields: [{ name: 'text', selector: 'span', extract: 'text' }],
      limit: 2,
    });

    await handler.execute(node, mockContext);
    const result = (mockContext.setData as jest.Mock).mock.calls[0][1];
    expect(result).toHaveLength(2);
  });

  it('should use custom output variable', async () => {
    const mockContainerLocator = {
      all: jest.fn().mockResolvedValue([]),
      first: jest.fn().mockReturnValue({
        waitFor: jest.fn().mockResolvedValue(undefined),
      }),
      filter: jest.fn().mockReturnThis(),
      nth: jest.fn().mockReturnThis(),
      locator: jest.fn().mockReturnThis(),
    };

    mockPage.locator.mockReturnValue(mockContainerLocator);

    const node = createMockNode(NodeType.DATA_EXTRACTOR, {
      containerSelector: '.item',
      fields: [{ name: 'x', selector: 'span', extract: 'text' }],
      outputVariable: 'products',
    });

    await handler.execute(node, mockContext);
    expect(mockContext.setData).toHaveBeenCalledWith('products', []);
  });

  it('should parse fields from JSON string', async () => {
    const mockContainerLocator = {
      all: jest.fn().mockResolvedValue([]),
      first: jest.fn().mockReturnValue({
        waitFor: jest.fn().mockResolvedValue(undefined),
      }),
      filter: jest.fn().mockReturnThis(),
      nth: jest.fn().mockReturnThis(),
      locator: jest.fn().mockReturnThis(),
    };

    mockPage.locator.mockReturnValue(mockContainerLocator);

    const node = createMockNode(NodeType.DATA_EXTRACTOR, {
      containerSelector: '.item',
      fields: JSON.stringify([{ name: 'title', selector: '.t', extract: 'text' }]),
    });

    await handler.execute(node, mockContext);
    expect(mockContext.setData).toHaveBeenCalledWith('extractedData', []);
  });

  it('should not write CSV when saveToCSV is false or absent', async () => {
    const mockContainerLocator = {
      all: jest.fn().mockResolvedValue([]),
      first: jest.fn().mockReturnValue({
        waitFor: jest.fn().mockResolvedValue(undefined),
      }),
      filter: jest.fn().mockReturnThis(),
      nth: jest.fn().mockReturnThis(),
      locator: jest.fn().mockReturnThis(),
    };

    mockPage.locator.mockReturnValue(mockContainerLocator);

    const node = createMockNode(NodeType.DATA_EXTRACTOR, {
      containerSelector: '.item',
      fields: [{ name: 'title', selector: '.title', extract: 'text' }],
    });

    await handler.execute(node, mockContext);
    expect(fs.writeFile).not.toHaveBeenCalled();
  });

  it('should write CSV when saveToCSV is true', async () => {
    const mockFieldLocator = {
      count: jest.fn().mockResolvedValue(1),
      first: jest.fn().mockReturnValue({
        textContent: jest.fn().mockResolvedValue('Product 1'),
      }),
    };

    const mockContainer = {
      locator: jest.fn().mockReturnValue(mockFieldLocator),
    };

    const mockContainerLocator = {
      all: jest.fn().mockResolvedValue([mockContainer]),
      first: jest.fn().mockReturnValue({
        waitFor: jest.fn().mockResolvedValue(undefined),
      }),
      filter: jest.fn().mockReturnThis(),
      nth: jest.fn().mockReturnThis(),
      locator: jest.fn().mockReturnThis(),
    };

    mockPage.locator.mockReturnValue(mockContainerLocator);

    const node = createMockNode(NodeType.DATA_EXTRACTOR, {
      containerSelector: '.product',
      fields: [{ name: 'title', selector: '.title', extract: 'text' }],
      saveToCSV: true,
      csvFilePath: 'tests/output/test.csv',
    });

    await handler.execute(node, mockContext);

    expect(stringify).toHaveBeenCalledWith(
      [['title'], ['Product 1']],
      { delimiter: ',' }
    );
    expect(fs.mkdir).toHaveBeenCalled();
    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.stringContaining('test.csv'),
      expect.any(String),
      'utf-8'
    );
  });

  it('should throw when saveToCSV is true but csvFilePath is empty', async () => {
    const mockContainerLocator = {
      all: jest.fn().mockResolvedValue([]),
      first: jest.fn().mockReturnValue({
        waitFor: jest.fn().mockResolvedValue(undefined),
      }),
      filter: jest.fn().mockReturnThis(),
      nth: jest.fn().mockReturnThis(),
      locator: jest.fn().mockReturnThis(),
    };

    mockPage.locator.mockReturnValue(mockContainerLocator);

    const node = createMockNode(NodeType.DATA_EXTRACTOR, {
      containerSelector: '.item',
      fields: [{ name: 'title', selector: '.title', extract: 'text' }],
      saveToCSV: true,
      csvFilePath: '',
    });

    await expect(handler.execute(node, mockContext)).rejects.toThrow('CSV file path is required');
  });
});
