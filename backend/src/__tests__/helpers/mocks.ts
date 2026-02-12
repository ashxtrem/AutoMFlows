import { ContextManager } from '../../engine/context';
import { BaseNode, NodeType } from '@automflows/shared';

/**
 * Create a mock Playwright Page object
 */
export function createMockPage(): any {
  const mockPage = {
    // Locator methods
    locator: jest.fn((selector: string) => ({
      fill: jest.fn().mockResolvedValue(undefined),
      type: jest.fn().mockResolvedValue(undefined),
      pressSequentially: jest.fn().mockResolvedValue(undefined),
      click: jest.fn().mockResolvedValue(undefined),
      dblclick: jest.fn().mockResolvedValue(undefined),
      hover: jest.fn().mockResolvedValue(undefined),
      selectOption: jest.fn().mockResolvedValue(undefined),
      selectText: jest.fn().mockResolvedValue(undefined),
      check: jest.fn().mockResolvedValue(undefined),
      uncheck: jest.fn().mockResolvedValue(undefined),
      setChecked: jest.fn().mockResolvedValue(undefined),
      scrollIntoViewIfNeeded: jest.fn().mockResolvedValue(undefined),
      textContent: jest.fn().mockResolvedValue(''),
      innerText: jest.fn().mockResolvedValue(''),
      getAttribute: jest.fn().mockResolvedValue(null),
      count: jest.fn().mockResolvedValue(0),
      isVisible: jest.fn().mockResolvedValue(true),
      isEnabled: jest.fn().mockResolvedValue(true),
      isChecked: jest.fn().mockResolvedValue(false),
      boundingBox: jest.fn().mockResolvedValue({ x: 0, y: 0, width: 100, height: 100 }),
      inputValue: jest.fn().mockResolvedValue(''),
      allTextContents: jest.fn().mockResolvedValue([]),
    })),
    
    // Page methods
    goto: jest.fn().mockResolvedValue(undefined),
    waitForSelector: jest.fn().mockResolvedValue(undefined),
    waitForURL: jest.fn().mockResolvedValue(undefined),
    waitForFunction: jest.fn().mockResolvedValue(undefined),
    screenshot: jest.fn().mockResolvedValue(Buffer.from('mock-screenshot')),
    evaluate: jest.fn().mockResolvedValue(undefined),
    evaluateHandle: jest.fn().mockResolvedValue(undefined),
    addInitScript: jest.fn().mockResolvedValue(undefined),
    setViewportSize: jest.fn().mockResolvedValue(undefined),
    setContent: jest.fn().mockResolvedValue(undefined),
    content: jest.fn().mockResolvedValue('<html></html>'),
    title: jest.fn().mockResolvedValue('Mock Page'),
    url: jest.fn().mockReturnValue('https://example.com'),
    
    // Event listeners
    on: jest.fn(),
    once: jest.fn(),
    off: jest.fn(),
    removeListener: jest.fn(),
    
    // Dialog handling
    dialog: jest.fn(),
    
    // Context
    context: jest.fn().mockReturnValue({
      pages: jest.fn().mockReturnValue([]),
      addInitScript: jest.fn().mockResolvedValue(undefined),
      setGeolocation: jest.fn().mockResolvedValue(undefined),
      setPermissions: jest.fn().mockResolvedValue(undefined),
      grantPermissions: jest.fn().mockResolvedValue(undefined),
      clearPermissions: jest.fn().mockResolvedValue(undefined),
      setExtraHTTPHeaders: jest.fn().mockResolvedValue(undefined),
      setOffline: jest.fn().mockResolvedValue(undefined),
      addCookies: jest.fn().mockResolvedValue(undefined),
      clearCookies: jest.fn().mockResolvedValue(undefined),
      storageState: jest.fn().mockResolvedValue({}),
    }),
    
    // Keyboard
    keyboard: {
      press: jest.fn().mockResolvedValue(undefined),
      type: jest.fn().mockResolvedValue(undefined),
      down: jest.fn().mockResolvedValue(undefined),
      up: jest.fn().mockResolvedValue(undefined),
      insertText: jest.fn().mockResolvedValue(undefined),
    },
    
    // Mouse
    mouse: {
      click: jest.fn().mockResolvedValue(undefined),
      dblclick: jest.fn().mockResolvedValue(undefined),
      move: jest.fn().mockResolvedValue(undefined),
      down: jest.fn().mockResolvedValue(undefined),
      up: jest.fn().mockResolvedValue(undefined),
      wheel: jest.fn().mockResolvedValue(undefined),
    },
    
    // Storage
    evaluateOnNewDocument: jest.fn().mockResolvedValue(undefined),
    
    // Download
    waitForEvent: jest.fn().mockResolvedValue({
      url: jest.fn().mockReturnValue('https://example.com/file.pdf'),
      path: jest.fn().mockResolvedValue('/tmp/file.pdf'),
      saveAs: jest.fn().mockResolvedValue('/tmp/file.pdf'),
    }),
    
    // Frame
    frames: jest.fn().mockReturnValue([]),
    frame: jest.fn().mockReturnValue(null),
  };
  
  return mockPage;
}

/**
 * Create a mock ContextManager
 */
export function createMockContextManager(page?: any): ContextManager {
  const context = new ContextManager();
  
  // Don't mock setVariable and setData - use real implementation so data is actually stored
  // Tests can spy on them using jest.spyOn(context, 'setData') if needed
  
  if (page) {
    // Ensure page has a proper context mock with pages() method
    if (!page.context || typeof page.context !== 'function') {
      const mockBrowserContext = {
        pages: jest.fn().mockReturnValue([page]),
        addInitScript: jest.fn().mockResolvedValue(undefined),
        setGeolocation: jest.fn().mockResolvedValue(undefined),
        setPermissions: jest.fn().mockResolvedValue(undefined),
        grantPermissions: jest.fn().mockResolvedValue(undefined),
        clearPermissions: jest.fn().mockResolvedValue(undefined),
        setExtraHTTPHeaders: jest.fn().mockResolvedValue(undefined),
        setOffline: jest.fn().mockResolvedValue(undefined),
        addCookies: jest.fn().mockResolvedValue(undefined),
        clearCookies: jest.fn().mockResolvedValue(undefined),
        storageState: jest.fn().mockResolvedValue({}),
        cookies: jest.fn().mockResolvedValue([]),
      };
      page.context = jest.fn().mockReturnValue(mockBrowserContext);
    } else {
      // If context already exists, ensure it has pages() method
      const existingContext = page.context();
      if (existingContext && typeof existingContext.pages !== 'function') {
        existingContext.pages = jest.fn().mockReturnValue([page]);
      }
    }
    context.setPage(page);
  }
  return context;
}

/**
 * Create a mock BaseNode
 */
export function createMockNode(
  type: NodeType,
  data: any,
  id: string = 'test-node-id'
): BaseNode {
  return {
    id,
    type,
    data,
    position: { x: 0, y: 0 },
  };
}

/**
 * Create a mock Socket.IO server
 */
export function createMockSocketServer(): any {
  return {
    emit: jest.fn(),
    to: jest.fn().mockReturnThis(),
    on: jest.fn(),
    once: jest.fn(),
    off: jest.fn(),
    removeListener: jest.fn(),
  };
}

/**
 * Create a mock Socket.IO client
 */
export function createMockSocketClient(): any {
  return {
    emit: jest.fn(),
    on: jest.fn(),
    once: jest.fn(),
    off: jest.fn(),
    removeListener: jest.fn(),
    disconnect: jest.fn(),
    connected: true,
    id: 'mock-socket-id',
  };
}

/**
 * Create a mock Playwright Browser object
 */
export function createMockBrowser(): any {
  return {
    newContext: jest.fn().mockResolvedValue({
      newPage: jest.fn().mockResolvedValue(createMockPage()),
      pages: jest.fn().mockReturnValue([]),
      addInitScript: jest.fn().mockResolvedValue(undefined),
      setGeolocation: jest.fn().mockResolvedValue(undefined),
      setPermissions: jest.fn().mockResolvedValue(undefined),
      grantPermissions: jest.fn().mockResolvedValue(undefined),
      clearPermissions: jest.fn().mockResolvedValue(undefined),
      setExtraHTTPHeaders: jest.fn().mockResolvedValue(undefined),
      setOffline: jest.fn().mockResolvedValue(undefined),
      addCookies: jest.fn().mockResolvedValue(undefined),
      clearCookies: jest.fn().mockResolvedValue(undefined),
      storageState: jest.fn().mockResolvedValue({}),
    }),
    contexts: jest.fn().mockReturnValue([]),
    close: jest.fn().mockResolvedValue(undefined),
  };
}

/**
 * Create a mock PlaywrightManager
 */
export function createMockPlaywrightManager(): any {
  return {
    launch: jest.fn().mockResolvedValue(createMockPage()),
    getBrowser: jest.fn().mockReturnValue(createMockBrowser()),
    getContext: jest.fn().mockReturnValue({
      pages: jest.fn().mockReturnValue([]),
    }),
    close: jest.fn().mockResolvedValue(undefined),
  };
}

/**
 * Mock file system operations
 */
export const mockFs = {
  writeFileSync: jest.fn(),
  readFileSync: jest.fn().mockReturnValue(''),
  existsSync: jest.fn().mockReturnValue(true),
  mkdirSync: jest.fn(),
  readdirSync: jest.fn().mockReturnValue([]),
  statSync: jest.fn().mockReturnValue({
    isFile: jest.fn().mockReturnValue(true),
    isDirectory: jest.fn().mockReturnValue(false),
    size: 0,
  }),
  unlinkSync: jest.fn(),
  rmdirSync: jest.fn(),
};

/**
 * Mock path utilities
 */
export const mockPath = {
  join: jest.fn((...args: string[]) => args.join('/')),
  resolve: jest.fn((...args: string[]) => args.join('/')),
  dirname: jest.fn((path: string) => path.split('/').slice(0, -1).join('/')),
  basename: jest.fn((path: string) => path.split('/').pop() || ''),
  extname: jest.fn((path: string) => {
    const parts = path.split('.');
    return parts.length > 1 ? `.${parts.pop()}` : '';
  }),
};
