import { chromium, Browser, Page } from 'playwright';
import path from 'path';
import { TypeHandler } from '../../nodes/handlers/type';
import { ContextManager } from '../../engine/context';
import { NodeType, BaseNode } from '@automflows/shared';

const FIXTURE = 'file://' + path.resolve(__dirname, '../fixtures/inputs.html').replace(/\\/g, '/');

function makeNode(data: Record<string, unknown>): BaseNode {
  return { id: 'test', type: NodeType.TYPE, data, position: { x: 0, y: 0 } };
}

describe('TypeHandler integration', () => {
  let browser: Browser;
  let page: Page;
  let handler: TypeHandler;
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
    handler = new TypeHandler();
    ctx = new ContextManager();
    ctx.setPage(page);
  });

  afterEach(async () => {
    await page.context().close();
  });

  it('fills an input with text (default inputMethod)', async () => {
    const node = makeNode({ selector: '#username', text: 'alice' });
    await handler.execute(node, ctx);

    expect(await page.locator('#username').inputValue()).toBe('alice');
  });

  it('fills using inputMethod=fill explicitly', async () => {
    const node = makeNode({
      selector: '#email',
      text: 'a@b.com',
      inputMethod: 'fill',
    });
    await handler.execute(node, ctx);

    expect(await page.locator('#email').inputValue()).toBe('a@b.com');
  });

  it('types character by character with inputMethod=type', async () => {
    const node = makeNode({
      selector: '#username',
      text: 'bob',
      inputMethod: 'type',
      delay: 0,
    });
    await handler.execute(node, ctx);

    expect(await page.locator('#username').inputValue()).toBe('bob');
  });

  it('types with pressSequentially', async () => {
    const node = makeNode({
      selector: '#username',
      text: 'xyz',
      inputMethod: 'pressSequentially',
      delay: 0,
    });
    await handler.execute(node, ctx);

    expect(await page.locator('#username').inputValue()).toBe('xyz');
  });

  it('appends text to existing value', async () => {
    const node = makeNode({
      selector: '#prefilled',
      text: '-added',
      inputMethod: 'append',
    });
    await handler.execute(node, ctx);

    expect(await page.locator('#prefilled').inputValue()).toBe('initial-added');
  });

  it('prepends text to existing value', async () => {
    const node = makeNode({
      selector: '#prefilled',
      text: 'pre-',
      inputMethod: 'prepend',
    });
    await handler.execute(node, ctx);

    expect(await page.locator('#prefilled').inputValue()).toBe('pre-initial');
  });

  it('sets value directly via DOM with inputMethod=direct', async () => {
    const node = makeNode({
      selector: '#username',
      text: 'direct-value',
      inputMethod: 'direct',
    });
    await handler.execute(node, ctx);

    expect(await page.locator('#username').inputValue()).toBe('direct-value');
  });

  it('clears field before typing when clearFirst is set', async () => {
    await page.locator('#username').fill('old-text');

    const node = makeNode({
      selector: '#username',
      text: 'new',
      inputMethod: 'type',
      clearFirst: true,
      delay: 0,
    });
    await handler.execute(node, ctx);

    expect(await page.locator('#username').inputValue()).toBe('new');
  });

  it('fills a textarea', async () => {
    const node = makeNode({ selector: '#notes', text: 'Some notes here' });
    await handler.execute(node, ctx);

    expect(await page.locator('#notes').inputValue()).toBe('Some notes here');
  });

  it('uses variable interpolation in text', async () => {
    ctx.setData('user', 'carol');
    const node = makeNode({ selector: '#username', text: '${data.user}' });
    await handler.execute(node, ctx);

    expect(await page.locator('#username').inputValue()).toBe('carol');
  });

  it('uses variable interpolation in selector', async () => {
    ctx.setData('field', 'email');
    const node = makeNode({ selector: '#${data.field}', text: 'test@test.com' });
    await handler.execute(node, ctx);

    expect(await page.locator('#email').inputValue()).toBe('test@test.com');
  });

  it('types into an input found by xpath', async () => {
    const node = makeNode({
      selector: '//input[@id="username"]',
      selectorType: 'xpath',
      text: 'xpath-user',
    });
    await handler.execute(node, ctx);

    expect(await page.locator('#username').inputValue()).toBe('xpath-user');
  });

  it('types into an input found by placeholder', async () => {
    const node = makeNode({
      selector: 'placeholder:Enter username',
      selectorType: 'getByPlaceholder',
      text: 'placeholder-user',
    });
    await handler.execute(node, ctx);

    expect(await page.locator('#username').inputValue()).toBe('placeholder-user');
  });

  it('throws when selector is missing', async () => {
    const node = makeNode({ text: 'hello' });
    await expect(handler.execute(node, ctx)).rejects.toThrow('Selector is required');
  });

  it('throws when text is missing', async () => {
    const node = makeNode({ selector: '#username' });
    await expect(handler.execute(node, ctx)).rejects.toThrow('Text is required');
  });

  it('throws for non-existent selector', async () => {
    const node = makeNode({
      selector: '#does-not-exist',
      text: 'hi',
      timeout: 1000,
    });
    await expect(handler.execute(node, ctx)).rejects.toThrow();
  });
});
