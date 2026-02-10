import { Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Inject finder library (similar to FinderInjector)
 */
export async function injectFinderLibrary(page: Page): Promise<void> {
  // Try to load from node_modules first
  let finderPath = path.join(process.cwd(), 'node_modules', '@medv', 'finder', 'finder.js');
  if (!fs.existsSync(finderPath)) {
    finderPath = path.join(process.cwd(), 'backend', 'node_modules', '@medv', 'finder', 'finder.js');
  }
  
  if (fs.existsSync(finderPath)) {
    try {
      const finderCode = fs.readFileSync(finderPath, 'utf-8');
      await page.evaluate(async (code) => {
        if (window.__finder || window.finder) {
          return;
        }
        try {
          const blob = new Blob([code], { type: 'application/javascript' });
          const url = URL.createObjectURL(blob);
          const finderModule = await import(url);
          if (finderModule.finder) {
            window.__finder = finderModule.finder;
            window.finder = finderModule.finder;
          }
          URL.revokeObjectURL(url);
        } catch (e) {
          // Fallback to CDN
          const script = document.createElement('script');
          script.type = 'module';
          script.textContent = 'import { finder } from "https://unpkg.com/@medv/finder@4.0.2/finder.js"; window.__finder = finder; window.finder = finder;';
          document.head.appendChild(script);
        }
      }, finderCode);
      return;
    } catch (error) {
      // Fall through to CDN
    }
  }
  
  // Fallback to CDN
  await page.evaluate(() => {
    if (window.__finder || window.finder) {
      return;
    }
    const script = document.createElement('script');
    script.type = 'module';
    script.textContent = 'import { finder } from "https://unpkg.com/@medv/finder@4.0.2/finder.js"; window.__finder = finder; window.finder = finder;';
    document.head.appendChild(script);
  });
}
