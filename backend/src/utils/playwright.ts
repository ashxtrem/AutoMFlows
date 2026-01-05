import { chromium, Browser, Page, BrowserContext } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

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

  async launch(headless: boolean = true, viewport?: { width: number; height: number }, userAgent?: string): Promise<Page> {
    if (this.browser) {
      throw new Error('Browser already launched');
    }

    this.browser = await chromium.launch({
      headless,
    });

    const browserContextOptions: any = {};
    if (viewport) {
      browserContextOptions.viewport = viewport;
    }
    if (userAgent) {
      browserContextOptions.userAgent = userAgent;
    }

    this.context = await this.browser.newContext(browserContextOptions);
    this.page = await this.context.newPage();

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

