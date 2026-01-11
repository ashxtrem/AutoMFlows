"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlaywrightManager = void 0;
const playwright_1 = require("playwright");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const pathUtils_1 = require("./pathUtils");
class PlaywrightManager {
    constructor(screenshotsDirectory) {
        this.browser = null;
        this.context = null;
        this.page = null;
        // Use provided directory or fallback to default
        if (screenshotsDirectory) {
            this.screenshotsDir = screenshotsDirectory;
        }
        else {
            // Create default screenshots directory in project root
            // Note: This fallback is rarely used since ExecutionTracker provides screenshots directory
            this.screenshotsDir = (0, pathUtils_1.resolveFromProjectRoot)('./output/screenshots');
        }
        if (!fs.existsSync(this.screenshotsDir)) {
            fs.mkdirSync(this.screenshotsDir, { recursive: true });
        }
    }
    setScreenshotsDirectory(directory) {
        this.screenshotsDir = directory;
        if (!fs.existsSync(this.screenshotsDir)) {
            fs.mkdirSync(this.screenshotsDir, { recursive: true });
        }
    }
    /**
     * Check if a browser is installed
     */
    async checkBrowserInstallation(browserType) {
        try {
            let executablePath;
            switch (browserType) {
                case 'chromium':
                    executablePath = playwright_1.chromium.executablePath();
                    break;
                case 'firefox':
                    executablePath = playwright_1.firefox.executablePath();
                    break;
                case 'webkit':
                    executablePath = playwright_1.webkit.executablePath();
                    break;
            }
            if (!executablePath || !fs.existsSync(executablePath)) {
                throw new Error(`Browser executable not found for ${browserType}`);
            }
        }
        catch (error) {
            const browserName = browserType.charAt(0).toUpperCase() + browserType.slice(1);
            throw new Error(`${browserName} is not installed. Please install it using: npx playwright install ${browserType}`);
        }
    }
    /**
     * Apply stealth mode to context
     */
    async applyStealthMode(context) {
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
            window.navigator.permissions.query = (parameters) => (parameters.name === 'notifications' ?
                Promise.resolve({ state: Notification.permission }) :
                originalQuery(parameters));
        });
    }
    async launch(headless = true, viewport, browserType = 'chromium', maxWindow = true, capabilities, stealthMode = false, launchOptions, jsScript) {
        if (this.browser) {
            throw new Error('Browser already launched');
        }
        // Check browser installation
        await this.checkBrowserInstallation(browserType);
        // Launch browser based on type
        let browserLauncher;
        switch (browserType) {
            case 'chromium':
                browserLauncher = playwright_1.chromium;
                break;
            case 'firefox':
                browserLauncher = playwright_1.firefox;
                break;
            case 'webkit':
                browserLauncher = playwright_1.webkit;
                break;
            default:
                throw new Error(`Unsupported browser type: ${browserType}`);
        }
        try {
            // Merge launch options with default headless option
            const launchOpts = {
                headless,
                ...launchOptions, // User-provided launch options override defaults
            };
            this.browser = await browserLauncher.launch(launchOpts);
        }
        catch (error) {
            const browserName = browserType.charAt(0).toUpperCase() + browserType.slice(1);
            if (error.message.includes('Executable doesn\'t exist') || error.message.includes('executable')) {
                throw new Error(`${browserName} is not installed. Please install it using: npx playwright install ${browserType}`);
            }
            throw error;
        }
        const browserContextOptions = {};
        // Helper function to remove comments from JavaScript code
        const removeComments = (code) => {
            // Remove single-line comments (// ...)
            let result = code.replace(/\/\/.*$/gm, '');
            // Remove multi-line comments (/* ... */)
            result = result.replace(/\/\*[\s\S]*?\*\//g, '');
            return result.trim();
        };
        // Detect mobile script by checking for mobile user agent patterns in executable code only
        // (ignore commented code)
        const executableCode = jsScript ? removeComments(jsScript) : '';
        const isMobileScript = executableCode && executableCode.length > 0 && (executableCode.includes('Mobile') ||
            executableCode.includes('iPhone') ||
            executableCode.includes('Android') ||
            executableCode.toLowerCase().includes('mobile'));
        // Extract viewport dimensions from script if defined (look for innerWidth/innerHeight patterns)
        // Pattern: innerWidth: 412 or innerWidth = 412 or get: () => 412
        // Use executable code (without comments) for extraction
        let scriptViewport;
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
            let widthMatch = widthMatchDefineProp;
            let heightMatch = heightMatchDefineProp;
            if (!widthMatch) {
                for (const pattern of widthPatterns) {
                    widthMatch = codeToAnalyze.match(pattern);
                    if (widthMatch)
                        break;
                }
            }
            if (!heightMatch) {
                for (const pattern of heightPatterns) {
                    heightMatch = codeToAnalyze.match(pattern);
                    if (heightMatch)
                        break;
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
        }
        else if (isMobileScript && viewport && viewport.width < 800) {
            // If mobile script and viewport is already mobile-sized, use it
            browserContextOptions.viewport = viewport;
        }
        else if (isMobileScript && !viewport) {
            // If mobile script but no viewport specified, use default mobile dimensions
            browserContextOptions.viewport = { width: 412, height: 915 };
        }
        else if (maxWindow && !headless && !isMobileScript) {
            // When maxWindow is true and not headless and not mobile, use large viewport
            browserContextOptions.viewport = { width: 1920, height: 1080 };
        }
        else if (!maxWindow && viewport) {
            // When maxWindow is false, use provided viewport
            browserContextOptions.viewport = viewport;
        }
        else if (isMobileScript && viewport && viewport.width >= 800) {
            // If mobile script but viewport is desktop-sized, override with mobile dimensions from script or default
            browserContextOptions.viewport = scriptViewport || { width: 412, height: 915 };
        }
        // If maxWindow is true and headless, don't set viewport (let Playwright use default)
        // Apply capabilities to context options
        if (capabilities && Object.keys(capabilities).length > 0) {
            Object.assign(browserContextOptions, capabilities);
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
            }
            catch (error) {
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
                    if (browserWindow && browserWindow.moveTo && browserWindow.resizeTo) {
                        // This is a fallback - Playwright doesn't directly support window.maximize()
                        // The browser should use full screen when no viewport is set
                    }
                }
            }
            catch (e) {
                // Ignore errors - maximization is best effort
            }
        }
        return this.page;
    }
    getPage() {
        return this.page;
    }
    getBrowser() {
        return this.browser;
    }
    async close() {
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
    async takeScreenshot(filePath, fullPage = false) {
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
    getScreenshotsDir() {
        return this.screenshotsDir;
    }
}
exports.PlaywrightManager = PlaywrightManager;
