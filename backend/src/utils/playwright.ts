import { chromium, firefox, webkit, Browser, Page, BrowserContext } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import { resolveFromProjectRoot } from './pathUtils';

type BrowserType = 'chromium' | 'firefox' | 'webkit';

export class PlaywrightManager {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private screenshotsDir: string;
  private videosDir: string | null = null;
  private recordSession: boolean = false;

  constructor(screenshotsDirectory?: string, videosDirectory?: string, recordSession: boolean = false) {
    // Use provided directory or fallback to default
    if (screenshotsDirectory) {
      this.screenshotsDir = screenshotsDirectory;
    } else {
      // Create default screenshots directory in project root
      // Note: This fallback is rarely used since ExecutionTracker provides screenshots directory
      this.screenshotsDir = resolveFromProjectRoot('./output/screenshots');
    }
    if (!fs.existsSync(this.screenshotsDir)) {
      fs.mkdirSync(this.screenshotsDir, { recursive: true });
    }
    
    // Set video recording options
    this.recordSession = recordSession;
    if (videosDirectory) {
      this.videosDir = videosDirectory;
      if (!fs.existsSync(this.videosDir)) {
        fs.mkdirSync(this.videosDir, { recursive: true });
      }
    }
  }

  setScreenshotsDirectory(directory: string): void {
    this.screenshotsDir = directory;
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
      try {
        // Remove webdriver property - delete first, then redefine
        try {
          delete (navigator as any).webdriver;
        } catch (e) {
          // Ignore if deletion fails
        }
        
        // Redefine webdriver property to return undefined
        Object.defineProperty(navigator, 'webdriver', {
          get: () => undefined,
          configurable: true,
          enumerable: false,
        });

        // Override plugins
        Object.defineProperty(navigator, 'plugins', {
          get: () => [1, 2, 3, 4, 5],
          configurable: true,
        });

        // Override languages
        Object.defineProperty(navigator, 'languages', {
          get: () => ['en-US', 'en'],
          configurable: true,
        });

        // Override permissions
        const originalQuery = window.navigator.permissions.query;
        window.navigator.permissions.query = (parameters: any) => (
          parameters.name === 'notifications' ?
            Promise.resolve({ state: Notification.permission } as PermissionStatus) :
            originalQuery(parameters)
        );
      } catch (e) {
        // Silently fail - don't break page load
        console.error('Stealth mode init script error:', e);
      }
    });
  }

  async launch(
    headless: boolean = true,
    viewport?: { width: number; height: number },
    browserType: BrowserType = 'chromium',
    maxWindow: boolean = true,
    capabilities?: Record<string, any>,
    stealthMode: boolean = false,
    launchOptions?: Record<string, any>,
    jsScript?: string
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
      
      // Add stealth mode launch args for Chromium
      if (stealthMode && browserType === 'chromium') {
        if (!launchOpts.args) {
          launchOpts.args = [];
        }
        // Disable automation controlled features
        if (!launchOpts.args.includes('--disable-blink-features=AutomationControlled')) {
          launchOpts.args.push('--disable-blink-features=AutomationControlled');
        }
        // Remove the "Chrome is being controlled by automated test software" banner
        if (!launchOpts.ignoreDefaultArgs) {
          launchOpts.ignoreDefaultArgs = [];
        }
        if (Array.isArray(launchOpts.ignoreDefaultArgs) && !launchOpts.ignoreDefaultArgs.includes('--enable-automation')) {
          launchOpts.ignoreDefaultArgs.push('--enable-automation');
        }
      }
      
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
    
    // Helper function to remove comments from JavaScript code
    const removeComments = (code: string): string => {
      // Remove single-line comments (// ...)
      let result = code.replace(/\/\/.*$/gm, '');
      // Remove multi-line comments (/* ... */)
      result = result.replace(/\/\*[\s\S]*?\*\//g, '');
      return result.trim();
    };
    
    // Detect mobile script by checking for mobile user agent patterns in executable code only
    // (ignore commented code)
    const executableCode = jsScript ? removeComments(jsScript) : '';
    const isMobileScript = executableCode && executableCode.length > 0 && (
      executableCode.includes('Mobile') || 
      executableCode.includes('iPhone') || 
      executableCode.includes('Android') ||
      executableCode.toLowerCase().includes('mobile')
    );
    
    // Extract viewport dimensions from script if defined (look for innerWidth/innerHeight patterns)
    // Pattern: innerWidth: 412 or innerWidth = 412 or get: () => 412
    // Use executable code (without comments) for extraction
    let scriptViewport: { width: number; height: number } | undefined;
    const codeToAnalyze = executableCode || jsScript || '';
    if (codeToAnalyze) {
      // Try multiple patterns to extract width
      // Priority: Object.defineProperty pattern first, then simpler patterns
      const widthPatterns = [
        /innerWidth['"]?\s*,\s*\{[^}]*get:\s*\(\)\s*=>\s*(\d+)/, // Object.defineProperty(window, 'innerWidth', { get: () => 412 })
        /innerWidth['"]?\s*[:=]\s*(\d+)/, // innerWidth: 412 or innerWidth = 412
        /innerWidth['"]?\s*=>\s*(\d+)/, // innerWidth => 412
        /get:\s*\(\)\s*=>\s*(\d+).*\/\/.*Mobile width/i,
        /get:\s*\(\)\s*=>\s*(\d+).*\/\/.*width/i
      ];
      
      // Try multiple patterns to extract height
      const heightPatterns = [
        /innerHeight['"]?\s*,\s*\{[^}]*get:\s*\(\)\s*=>\s*(\d+)/, // Object.defineProperty(window, 'innerHeight', { get: () => 915 })
        /innerHeight['"]?\s*[:=]\s*(\d+)/, // innerHeight: 915 or innerHeight = 915
        /innerHeight['"]?\s*=>\s*(\d+)/, // innerHeight => 915
        /get:\s*\(\)\s*=>\s*(\d+).*\/\/.*Mobile height/i,
        /get:\s*\(\)\s*=>\s*(\d+).*\/\/.*height/i
      ];
      
      // Also try a more flexible pattern for Object.defineProperty that handles nested braces
      const widthMatchDefineProp = codeToAnalyze.match(/innerWidth['"]?\s*,\s*\{[\s\S]*?get:\s*\(\)\s*=>\s*(\d+)/);
      const heightMatchDefineProp = codeToAnalyze.match(/innerHeight['"]?\s*,\s*\{[\s\S]*?get:\s*\(\)\s*=>\s*(\d+)/);
      
      // Use Object.defineProperty matches if found, otherwise try other patterns
      let widthMatch: RegExpMatchArray | null = widthMatchDefineProp;
      let heightMatch: RegExpMatchArray | null = heightMatchDefineProp;
      
      if (!widthMatch) {
        for (const pattern of widthPatterns) {
          widthMatch = codeToAnalyze.match(pattern);
          if (widthMatch) break;
        }
      }
      
      if (!heightMatch) {
        for (const pattern of heightPatterns) {
          heightMatch = codeToAnalyze.match(pattern);
          if (heightMatch) break;
        }
      }
      
      // Also check for screen.width/height patterns
      if (!widthMatch) {
        widthMatch = codeToAnalyze.match(/screen['"]?\.width['"]?\s*[:=]\s*(\d+)/);
      }
      if (!heightMatch) {
        heightMatch = codeToAnalyze.match(/screen['"]?\.height['"]?\s*[:=]\s*(\d+)/);
      }
      
      if (widthMatch && heightMatch) {
        scriptViewport = {
          width: parseInt(widthMatch[1], 10),
          height: parseInt(heightMatch[1], 10)
        };
      }
    }
    
    // Set viewport based on maxWindow setting and mobile script detection
    if (isMobileScript && scriptViewport) {
      // If mobile script with explicit viewport dimensions in script, use those (highest priority)
      browserContextOptions.viewport = scriptViewport;
    } else if (isMobileScript && viewport && viewport.width < 800) {
      // If mobile script and viewport is already mobile-sized, use it
      browserContextOptions.viewport = viewport;
    } else if (isMobileScript && !viewport) {
      // If mobile script but no viewport specified, use default mobile dimensions
      browserContextOptions.viewport = { width: 412, height: 915 };
    } else if (maxWindow && !headless && !isMobileScript) {
      // When maxWindow is true and not headless and not mobile, use large viewport
      browserContextOptions.viewport = { width: 1920, height: 1080 };
    } else if (!maxWindow && viewport) {
      // When maxWindow is false, use provided viewport
      browserContextOptions.viewport = viewport;
    } else if (isMobileScript && viewport && viewport.width >= 800) {
      // If mobile script but viewport is desktop-sized, override with mobile dimensions from script or default
      browserContextOptions.viewport = scriptViewport || { width: 412, height: 915 };
    }
    // If maxWindow is true and headless, don't set viewport (let Playwright use default)

    // Apply capabilities to context options
    if (capabilities && Object.keys(capabilities).length > 0) {
      Object.assign(browserContextOptions, capabilities);
    }

    // Add video recording if enabled
    if (this.recordSession && this.videosDir) {
      browserContextOptions.recordVideo = {
        dir: this.videosDir,
      };
    }

    this.context = await this.browser.newContext(browserContextOptions);

    // Apply stealth mode if enabled
    if (stealthMode) {
      await this.applyStealthMode(this.context);
    }

    // Inject custom JavaScript script if provided
    if (jsScript && jsScript.trim().length > 0) {
      try {
        await this.context.addInitScript(jsScript);
      } catch (error: any) {
        // Log warning but don't fail browser launch
        console.warn('Failed to inject JavaScript script:', error.message);
      }
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

  async close(): Promise<string[]> {
    const videoPaths: string[] = [];
    
    // Get video paths from all pages before closing
    if (this.context) {
      const pages = this.context.pages();
      for (const page of pages) {
        try {
          const video = page.video();
          if (video) {
            const videoPath = await video.path();
            if (videoPath && fs.existsSync(videoPath)) {
              videoPaths.push(videoPath);
            }
          }
        } catch (error) {
          // Video might not be available, ignore
        }
      }
    }
    
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
    
    return videoPaths;
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

