import { SmartExtractorHandler } from '../smartExtractor';
import { NodeType } from '@automflows/shared';
import { createMockContextManager, createMockNode, createMockPage } from '../../../__tests__/helpers/mocks';

jest.mock('../../../utils/patternDetector', () => ({
  detectRepeatedPatterns: jest.fn().mockResolvedValue([
    { heading: 'Item 1', linkText: 'Details', linkHref: '/item/1' },
    { heading: 'Item 2', linkText: 'Details', linkHref: '/item/2' },
  ]),
}));

describe('SmartExtractorHandler', () => {
  let handler: SmartExtractorHandler;
  let mockPage: ReturnType<typeof createMockPage>;
  let mockContext: ReturnType<typeof createMockContextManager>;

  beforeEach(() => {
    handler = new SmartExtractorHandler();
    mockPage = createMockPage();
    mockContext = createMockContextManager(mockPage);
    jest.spyOn(mockContext, 'setData');
  });

  it('should throw when no page is available', async () => {
    const context = createMockContextManager();
    const node = createMockNode(NodeType.SMART_EXTRACTOR, { mode: 'allLinks' });
    await expect(handler.execute(node, context)).rejects.toThrow('No page available');
  });

  it('should extract all links', async () => {
    const mockLinks = [
      { text: 'Home', href: '/' },
      { text: 'About', href: '/about' },
    ];
    mockPage.evaluate.mockResolvedValue(mockLinks);

    const node = createMockNode(NodeType.SMART_EXTRACTOR, { mode: 'allLinks' });
    await handler.execute(node, mockContext);

    expect(mockContext.setData).toHaveBeenCalledWith('extractedData', mockLinks);
  });

  it('should extract all images', async () => {
    const mockImages = [
      { src: '/img/logo.png', alt: 'Logo' },
    ];
    mockPage.evaluate.mockResolvedValue(mockImages);

    const node = createMockNode(NodeType.SMART_EXTRACTOR, { mode: 'allImages' });
    await handler.execute(node, mockContext);

    expect(mockContext.setData).toHaveBeenCalledWith('extractedData', mockImages);
  });

  it('should extract table data', async () => {
    mockPage.waitForSelector.mockResolvedValue(undefined);
    const mockTableData = [
      { Name: 'Alice', Age: '30' },
      { Name: 'Bob', Age: '25' },
    ];
    mockPage.evaluate.mockResolvedValue(mockTableData);

    const node = createMockNode(NodeType.SMART_EXTRACTOR, { mode: 'tables', tableIndex: 0 });
    await handler.execute(node, mockContext);

    expect(mockContext.setData).toHaveBeenCalledWith('extractedData', mockTableData);
  });

  it('should extract repeated items', async () => {
    const node = createMockNode(NodeType.SMART_EXTRACTOR, { mode: 'repeatedItems' });
    await handler.execute(node, mockContext);

    expect(mockContext.setData).toHaveBeenCalledWith('extractedData', [
      { heading: 'Item 1', linkText: 'Details', linkHref: '/item/1' },
      { heading: 'Item 2', linkText: 'Details', linkHref: '/item/2' },
    ]);
  });

  it('should use custom output variable', async () => {
    mockPage.evaluate.mockResolvedValue([]);

    const node = createMockNode(NodeType.SMART_EXTRACTOR, {
      mode: 'allLinks',
      outputVariable: 'myLinks',
    });
    await handler.execute(node, mockContext);

    expect(mockContext.setData).toHaveBeenCalledWith('myLinks', []);
  });

  it('should handle errors with failSilently', async () => {
    mockPage.evaluate.mockRejectedValue(new Error('Page crashed'));

    const node = createMockNode(NodeType.SMART_EXTRACTOR, {
      mode: 'allLinks',
      failSilently: true,
    });
    await handler.execute(node, mockContext);

    expect(mockContext.setData).toHaveBeenCalledWith('extractedData', []);
  });

  it('should throw on error when failSilently is false', async () => {
    mockPage.evaluate.mockRejectedValue(new Error('Page crashed'));

    const node = createMockNode(NodeType.SMART_EXTRACTOR, {
      mode: 'allLinks',
      failSilently: false,
    });
    await expect(handler.execute(node, mockContext)).rejects.toThrow('Page crashed');
  });

  it('should throw on unknown mode', async () => {
    const node = createMockNode(NodeType.SMART_EXTRACTOR, { mode: 'unknown' });
    await expect(handler.execute(node, mockContext)).rejects.toThrow('Unknown extraction mode');
  });
});
