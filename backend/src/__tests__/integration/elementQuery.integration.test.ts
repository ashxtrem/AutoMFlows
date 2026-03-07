import { chromium, Browser, Page } from 'playwright';
import path from 'path';
import { ElementQueryHandler } from '../../nodes/handlers/elementQuery';
import { ContextManager } from '../../engine/context';
import { NodeType, BaseNode } from '@automflows/shared';

const FIXTURE = 'file://' + path.resolve(__dirname, '../fixtures/table.html').replace(/\\/g, '/');

function makeNode(data: Record<string, unknown>): BaseNode {
  return { id: 'test', type: NodeType.ELEMENT_QUERY, data, position: { x: 0, y: 0 } };
}

describe('ElementQueryHandler integration', () => {
  let browser: Browser;
  let page: Page;
  let handler: ElementQueryHandler;
  let ctx: ContextManager;

  beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
  });

  afterAll(async () => {
    await browser.close();
  });

  beforeEach(async () => {
    const context = await browser.newContext();
    page = await context.newPage();
    await page.goto(FIXTURE);
    handler = new ElementQueryHandler();
    ctx = new ContextManager();
    ctx.setPage(page);
  });

  afterEach(async () => {
    await page.context().close();
  });

  // --- getText ---

  it('gets text content of an element', async () => {
    const node = makeNode({
      selector: '#page-title',
      action: 'getText',
      outputVariable: 'title',
    });
    await handler.execute(node, ctx);

    expect(ctx.getData('title')).toBe('Product Catalog');
  });

  it('gets text from a table cell', async () => {
    const node = makeNode({
      selector: '.product-row[data-id="1"] .product-price',
      action: 'getText',
      outputVariable: 'price',
    });
    await handler.execute(node, ctx);

    expect(ctx.getData('price')).toBe('$19.99');
  });

  it('uses default outputVariable for getText', async () => {
    const node = makeNode({
      selector: '#page-title',
      action: 'getText',
    });
    await handler.execute(node, ctx);

    expect(ctx.getData('text')).toBe('Product Catalog');
  });

  // --- getAttribute ---

  it('gets an attribute value', async () => {
    const node = makeNode({
      selector: '#page-title',
      action: 'getAttribute',
      attributeName: 'data-version',
      outputVariable: 'ver',
    });
    await handler.execute(node, ctx);

    expect(ctx.getData('ver')).toBe('2.0');
  });

  it('returns null for a missing attribute', async () => {
    const node = makeNode({
      selector: '#page-title',
      action: 'getAttribute',
      attributeName: 'data-nonexistent',
      outputVariable: 'val',
    });
    await handler.execute(node, ctx);

    expect(ctx.getData('val')).toBeNull();
  });

  it('throws when attributeName is missing for getAttribute', async () => {
    const node = makeNode({
      selector: '#page-title',
      action: 'getAttribute',
      outputVariable: 'val',
    });
    await expect(handler.execute(node, ctx)).rejects.toThrow('Attribute name is required');
  });

  // --- getCount ---

  it('counts matching elements', async () => {
    const node = makeNode({
      selector: '.product-row',
      action: 'getCount',
      outputVariable: 'rowCount',
    });
    await handler.execute(node, ctx);

    expect(ctx.getData('rowCount')).toBe(3);
  });

  it('returns 0 for no matches', async () => {
    const node = makeNode({
      selector: '.nonexistent-class',
      action: 'getCount',
      outputVariable: 'cnt',
    });
    await handler.execute(node, ctx);

    expect(ctx.getData('cnt')).toBe(0);
  });

  // --- isVisible ---

  it('returns true for a visible element', async () => {
    const node = makeNode({
      selector: '#visible-text',
      action: 'isVisible',
      outputVariable: 'vis',
    });
    await handler.execute(node, ctx);

    expect(ctx.getData('vis')).toBe(true);
  });

  it('returns false for a hidden element', async () => {
    const node = makeNode({
      selector: '#hidden-text',
      action: 'isVisible',
      outputVariable: 'vis',
      timeout: 1000,
    });
    await handler.execute(node, ctx);

    expect(ctx.getData('vis')).toBe(false);
  });

  // --- isEnabled ---

  it('returns true for an enabled input', async () => {
    const node = makeNode({
      selector: '#enabled-input',
      action: 'isEnabled',
      outputVariable: 'en',
    });
    await handler.execute(node, ctx);

    expect(ctx.getData('en')).toBe(true);
  });

  it('returns false for a disabled input', async () => {
    const node = makeNode({
      selector: '#disabled-input',
      action: 'isEnabled',
      outputVariable: 'en',
    });
    await handler.execute(node, ctx);

    expect(ctx.getData('en')).toBe(false);
  });

  // --- isChecked ---

  it('returns true for a checked checkbox', async () => {
    const node = makeNode({
      selector: '#checked-box',
      action: 'isChecked',
      outputVariable: 'chk',
    });
    await handler.execute(node, ctx);

    expect(ctx.getData('chk')).toBe(true);
  });

  it('returns false for an unchecked checkbox', async () => {
    const node = makeNode({
      selector: '#unchecked-box',
      action: 'isChecked',
      outputVariable: 'chk',
    });
    await handler.execute(node, ctx);

    expect(ctx.getData('chk')).toBe(false);
  });

  // --- getBoundingBox ---

  it('returns bounding box with real dimensions', async () => {
    const node = makeNode({
      selector: '#page-title',
      action: 'getBoundingBox',
      outputVariable: 'box',
    });
    await handler.execute(node, ctx);

    const box = ctx.getData('box');
    expect(box).toHaveProperty('x');
    expect(box).toHaveProperty('y');
    expect(box.width).toBeGreaterThan(0);
    expect(box.height).toBeGreaterThan(0);
  });

  // --- getAllText ---

  it('gets all text from multiple matching elements', async () => {
    const node = makeNode({
      selector: '.product-name',
      action: 'getAllText',
      outputVariable: 'names',
    });
    await handler.execute(node, ctx);

    const names = ctx.getData('names');
    expect(names).toEqual(['Widget A', 'Widget B', 'Widget C']);
  });

  // --- xpath selector ---

  it('queries using xpath selector', async () => {
    const node = makeNode({
      selector: '//h1[@id="page-title"]',
      selectorType: 'xpath',
      action: 'getText',
      outputVariable: 'h1',
    });
    await handler.execute(node, ctx);

    expect(ctx.getData('h1')).toBe('Product Catalog');
  });

  // --- variable interpolation ---

  it('interpolates variables in selector', async () => {
    ctx.setData('rowId', '2');
    const node = makeNode({
      selector: '.product-row[data-id="${data.rowId}"] .product-name',
      action: 'getText',
      outputVariable: 'name',
    });
    await handler.execute(node, ctx);

    expect(ctx.getData('name')).toBe('Widget B');
  });

  it('interpolates variables in attributeName', async () => {
    ctx.setData('attr', 'data-version');
    const node = makeNode({
      selector: '#page-title',
      action: 'getAttribute',
      attributeName: '${data.attr}',
      outputVariable: 'ver',
    });
    await handler.execute(node, ctx);

    expect(ctx.getData('ver')).toBe('2.0');
  });

  // --- error cases ---

  it('throws when selector is missing', async () => {
    const node = makeNode({ action: 'getText' });
    await expect(handler.execute(node, ctx)).rejects.toThrow('Selector is required');
  });

  it('throws when action is missing', async () => {
    const node = makeNode({ selector: '#page-title' });
    await expect(handler.execute(node, ctx)).rejects.toThrow('Action is required');
  });
});
