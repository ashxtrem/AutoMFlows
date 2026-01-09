import { chromium, firefox, webkit, Browser, Page, BrowserContext } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

type BrowserType = 'chromium' | 'firefox' | 'webkit';

export class PlaywrightManager {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private screenshotsDir: string;

  constructor() {
    // Create screenshots directory
    this.screenshotsDir = path.join(process.cwd(), 'screenshots');
    if (!fs.existsSync(this.screenshotsDir)) {
      fs.mkdirSync(this.screenshotsDir, { recursive: true });
    }
  }

  /**
   * Check if a browser is installed
   */
  private async checkBrowserInstallation(browserType: BrowserType): Promise<void> {
    try {
      let executablePath: string;
      switch (browserType) {
        case 'chromium':
          executablePath = chromium.executablePath();
          break;
        case 'firefox':
          executablePath = firefox.executablePath();
          break;
        case 'webkit':
          executablePath = webkit.executablePath();
          break;
      }
      
      if (!executablePath || !fs.existsSync(executablePath)) {
        throw new Error(`Browser executable not found for ${browserType}`);
      }
    } catch (error: any) {
      const browserName = browserType.charAt(0).toUpperCase() + browserType.slice(1);
      throw new Error(
        `${browserName} is not installed. Please install it using: npx playwright install ${browserType}`
      );
    }
  }

  /**
   * Apply stealth mode to context
   */
  private async applyStealthMode(context: BrowserContext): Promise<void> {
    // Remove webdriver traces
    await context.addInitScript(() => {
      // Remove webdriver property
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });

      // Override plugins
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5],
      });

      // Override languages
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en'],
      });

      // Override permissions
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters: any) => (
        parameters.name === 'notifications' ?
          Promise.resolve({ state: Notification.permission } as PermissionStatus) :
          originalQuery(parameters)
      );
    });
  }

  async launch(
    headless: boolean = true,
    viewport?: { width: number; height: number },
    userAgent?: string,
    browserType: BrowserType = 'chromium',
    maxWindow: boolean = true,
    capabilities?: Record<string, any>,
    stealthMode: boolean = false,
    launchOptions?: Record<string, any>
  ): Promise<Page> {
    if (this.browser) {
      throw new Error('Browser already launched');
    }

    // Check browser installation
    await this.checkBrowserInstallation(browserType);

    // Launch browser based on type
    let browserLauncher;
    switch (browserType) {
      case 'chromium':
        browserLauncher = chromium;
        break;
      case 'firefox':
        browserLauncher = firefox;
        break;
      case 'webkit':
        browserLauncher = webkit;
        break;
      default:
        throw new Error(`Unsupported browser type: ${browserType}`);
    }

    try {
      // Merge launch options with default headless option
      const launchOpts: any = {
        headless,
        ...launchOptions, // User-provided launch options override defaults
      };
      
      this.browser = await browserLauncher.launch(launchOpts);
    } catch (error: any) {
      const browserName = browserType.charAt(0).toUpperCase() + browserType.slice(1);
      if (error.message.includes('Executable doesn\'t exist') || error.message.includes('executable')) {
        throw new Error(
          `${browserName} is not installed. Please install it using: npx playwright install ${browserType}`
        );
      }
      throw error;
    }

    const browserContextOptions: any = {};
    
    // Set viewport based on maxWindow setting
    if (maxWindow && !headless) {
      // When maxWindow is true and not headless, use large viewport to simulate maximized window
      // Use common large screen size (1920x1080) or get actual screen size if available
      browserContextOptions.viewport = { width: 1920, height: 1080 };
    } else if (!maxWindow && viewport) {
      // When maxWindow is false, use provided viewport
      browserContextOptions.viewport = viewport;
    }
    // If maxWindow is true and headless, don't set viewport (let Playwright use default)
    
    if (userAgent) {
      browserContextOptions.userAgent = userAgent;
    }

    // Apply capabilities to context options
    if (capabilities && Object.keys(capabilities).length > 0) {
      Object.assign(browserContextOptions, capabilities);
    }

    this.context = await this.browser.newContext(browserContextOptions);

    // Apply stealth mode if enabled
    if (stealthMode) {
      await this.applyStealthMode(this.context);
    }

    this.page = await this.context.newPage();

    // Note: When maxWindow is true, we don't set viewport in browserContextOptions
    // This allows the browser to use its default/full screen size
    // However, Playwright may need explicit window maximization for non-headless mode
    if (maxWindow && !headless && this.browser) {
      try {
        // Get all pages and maximize the first one
        const pages = this.context.pages();
        if (pages.length > 0) {
          const browserWindow = await pages[0].evaluate(() => window);
          // Try to maximize using browser window API if available
          if (browserWindow && (browserWindow as any).moveTo && (browserWindow as any).resizeTo) {
            // This is a fallback - Playwright doesn't directly support window.maximize()
            // The browser should use full screen when no viewport is set
          }
        }
      } catch (e) {
        // Ignore errors - maximization is best effort
      }
    }

    return this.page;
  }

  getPage(): Page | null {
    return this.page;
  }

  getBrowser(): Browser | null {
    return this.browser;
  }

  async close(): Promise<void> {
    if (this.page) {
      await this.page.close();
      this.page = null;
    }
    if (this.context) {
      await this.context.close();
      this.context = null;
    }
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  async takeScreenshot(filePath?: string, fullPage: boolean = false): Promise<string> {
    if (!this.page) {
      throw new Error('No page available. Launch browser first.');
    }

    const fileName = filePath || `screenshot-${Date.now()}.png`;
    const fullPath = path.join(this.screenshotsDir, fileName);

    await this.page.screenshot({
      path: fullPath,
      fullPage,
    });

    return fullPath;
  }

  getScreenshotsDir(): string {
    return this.screenshotsDir;
  }
}

