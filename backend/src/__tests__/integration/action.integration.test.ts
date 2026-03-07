import { chromium, Browser, Page } from 'playwright';
import path from 'path';
import { ActionHandler } from '../../nodes/handlers/action';
import { ContextManager } from '../../engine/context';
import { NodeType, BaseNode } from '@automflows/shared';

const FIXTURE = 'file://' + path.resolve(__dirname, '../fixtures/buttons.html').replace(/\\/g, '/');

function makeNode(data: Record<string, unknown>): BaseNode {
  return { id: 'test', type: NodeType.ACTION, data, position: { x: 0, y: 0 } };
}

describe('ActionHandler integration', () => {
  let browser: Browser;
  let page: Page;
  let handler: ActionHandler;
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
    handler = new ActionHandler();
    ctx = new ContextManager();
    ctx.setPage(page);
  });

  afterEach(async () => {
    await page.context().close();
  });

  it('clicks a button and the DOM updates', async () => {
    const node = makeNode({ selector: '#click-btn', action: 'click' });
    await handler.execute(node, ctx);

    const text = await page.locator('#click-result').textContent();
    expect(text).toBe('clicked');
  });

  it('double-clicks a button', async () => {
    const node = makeNode({ selector: '#dblclick-btn', action: 'doubleClick' });
    await handler.execute(node, ctx);

    const text = await page.locator('#dblclick-result').textContent();
    expect(text).toBe('double-clicked');
  });

  it('right-clicks a button', async () => {
    const node = makeNode({ selector: '#rightclick-btn', action: 'rightClick' });
    await handler.execute(node, ctx);

    const text = await page.locator('#rightclick-result').textContent();
    expect(text).toBe('right-clicked');
  });

  it('hovers over an element', async () => {
    const node = makeNode({ selector: '#hover-btn', action: 'hover' });
    await handler.execute(node, ctx);

    const text = await page.locator('#hover-result').textContent();
    expect(text).toBe('hovered');
  });

  it('clicks using a css selector type', async () => {
    const node = makeNode({
      selector: 'button#click-btn',
      selectorType: 'css',
      action: 'click',
    });
    await handler.execute(node, ctx);

    const text = await page.locator('#click-result').textContent();
    expect(text).toBe('clicked');
  });

  it('clicks using an xpath selector', async () => {
    const node = makeNode({
      selector: '//button[@id="click-btn"]',
      selectorType: 'xpath',
      action: 'click',
    });
    await handler.execute(node, ctx);

    const text = await page.locator('#click-result').textContent();
    expect(text).toBe('clicked');
  });

  it('clicks using getByRole selector', async () => {
    const node = makeNode({
      selector: 'role:button,name:Click Me',
      selectorType: 'getByRole',
      action: 'click',
    });
    await handler.execute(node, ctx);

    const text = await page.locator('#click-result').textContent();
    expect(text).toBe('clicked');
  });

  it('clicks using getByTestId selector', async () => {
    const node = makeNode({
      selector: 'testid:submit-action',
      selectorType: 'getByTestId',
      action: 'click',
    });
    await handler.execute(node, ctx);
    // No DOM side-effect for this button, just verify no error
  });

  it('uses variable interpolation in selector', async () => {
    ctx.setData('btnId', 'click-btn');
    const node = makeNode({ selector: '#${data.btnId}', action: 'click' });
    await handler.execute(node, ctx);

    const text = await page.locator('#click-result').textContent();
    expect(text).toBe('clicked');
  });

  it('throws when selector does not match any element', async () => {
    const node = makeNode({
      selector: '#nonexistent-button',
      action: 'click',
      timeout: 1000,
    });

    await expect(handler.execute(node, ctx)).rejects.toThrow();
  });

  it('throws when action is missing', async () => {
    const node = makeNode({ selector: '#click-btn' });
    await expect(handler.execute(node, ctx)).rejects.toThrow('Action is required');
  });

  it('throws when selector is missing', async () => {
    const node = makeNode({ action: 'click' });
    await expect(handler.execute(node, ctx)).rejects.toThrow('Selector is required');
  });
});
