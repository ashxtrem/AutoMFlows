import { Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Get finder library injection script (for init script)
 */
export function getFinderLibraryScript(): string {
  return `
    (function() {
      console.log('[FinderInjector] Starting finder library injection');
      if (window.__finderInjected) {
        console.log('[FinderInjector] Finder already injected, skipping');
        return;
      }
      window.__finderInjected = true;
      
      function injectFinderScript() {
        console.log('[FinderInjector] injectFinderScript called, document.head:', !!document.head);
        if (!document.head) {
          console.log('[FinderInjector] document.head not ready, retrying...');
          setTimeout(injectFinderScript, 50);
          return;
        }
        
        console.log('[FinderInjector] Creating script element for @medv/finder');
        // Load @medv/finder from CDN as ES module
        const script = document.createElement('script');
        script.type = 'module';
        script.textContent = 'import { finder } from "https://unpkg.com/@medv/finder@4.0.2/finder.js"; window.__finder = finder; window.finder = finder; console.log("[FinderInjector] @medv/finder module loaded");';
        script.onerror = function() {
          console.error('[FinderInjector] Failed to load @medv/finder module');
        };
        document.head.appendChild(script);
        console.log('[FinderInjector] Module script appended to document.head');
      }
      
      if (document.head) {
        console.log('[FinderInjector] document.head exists, injecting immediately');
        injectFinderScript();
      } else {
        console.log('[FinderInjector] document.head not ready, readyState:', document.readyState);
        if (document.readyState === 'loading') {
          console.log('[FinderInjector] Waiting for DOMContentLoaded');
          document.addEventListener('DOMContentLoaded', injectFinderScript);
        } else {
          console.log('[FinderInjector] Using setTimeout fallback');
          setTimeout(injectFinderScript, 50);
        }
      }
    })();
  `;
}

/**
 * Inject finder library via CDN (init script)
 */
export async function injectFinderLibrary(page: Page): Promise<void> {
  const finderScript = getFinderLibraryScript();
  await page.addInitScript(finderScript);
}

/**
 * Get finder library direct injection script (for already-loaded pages)
 */
export function getFinderLibraryDirectScript(): string {
  return `
    (function() {
      if (window.__finderInjected) return;
      window.__finderInjected = true;
      
      function injectFinderScript() {
        if (!document.head) {
          setTimeout(injectFinderScript, 50);
          return;
        }
        
        const existingScript = document.querySelector('script[src*="@medv/finder"]');
        if (existingScript) {
          if (window.finder) {
            window.__finder = window.finder;
          }
          return;
        }
        
        const script = document.createElement('script');
        script.type = 'module';
        script.textContent = 'import { finder } from "https://unpkg.com/@medv/finder@4.0.2/finder.js"; window.__finder = finder; window.finder = finder;';
        script.onerror = function() {
          console.error('[FinderInjector] Failed to load @medv/finder module from CDN');
        };
        document.head.appendChild(script);
      }
      
      if (document.head) {
        injectFinderScript();
      } else if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectFinderScript);
      } else {
        setTimeout(injectFinderScript, 50);
      }
    })();
  `;
}

/**
 * Inject finder library directly into current page (for already-loaded pages)
 * Reads from node_modules instead of CDN for reliability
 */
export async function injectFinderLibraryDirect(page: Page): Promise<void> {
  try {
    // Read finder library from node_modules (check both root and backend/node_modules)
    let finderPath = path.join(process.cwd(), 'node_modules', '@medv', 'finder', 'finder.js');
    if (!fs.existsSync(finderPath)) {
      // Try backend/node_modules if root doesn't exist
      finderPath = path.join(process.cwd(), 'backend', 'node_modules', '@medv', 'finder', 'finder.js');
    }
    if (!fs.existsSync(finderPath)) {
      // Try going up one level (if running from backend directory)
      finderPath = path.join(process.cwd(), '..', 'node_modules', '@medv', 'finder', 'finder.js');
    }
    let finderCode: string;
    
    try {
      finderCode = fs.readFileSync(finderPath, 'utf-8');
    } catch (readError: any) {
      // Fallback to CDN injection
      const cdnScript = getFinderLibraryDirectScript();
      await page.evaluate(cdnScript);
      return;
    }
    
    // Inject the code directly using dynamic import (since it's an ES module)
    await page.evaluate(async (code) => {
      if (window.__finderInjected) {
        console.log('[FinderInjector] Finder already injected, skipping direct injection');
        return;
      }
      window.__finderInjected = true;
      
      try {
        // Create a blob URL from the module code
        const blob = new Blob([code], { type: 'application/javascript' });
        const url = URL.createObjectURL(blob);
        
        // Import the module dynamically
        const finderModule = await import(url);
        
        // The finder function is a named export
        if (finderModule.finder && typeof finderModule.finder === 'function') {
          window.__finder = finderModule.finder;
          window.finder = finderModule.finder;
          console.log('[FinderInjector] Finder function available at window.__finder (direct from node_modules)');
        } else if (finderModule.default && typeof finderModule.default === 'function') {
          window.__finder = finderModule.default;
          window.finder = finderModule.default;
          console.log('[FinderInjector] Finder function available at window.__finder (direct from node_modules, default export)');
        } else {
          // Try to find any exported function
          const exports = Object.keys(finderModule);
          console.warn('[FinderInjector] Finder module loaded but finder export not found. Exports:', exports);
          if (exports.length > 0 && typeof finderModule[exports[0]] === 'function') {
            window.__finder = finderModule[exports[0]];
            window.finder = finderModule[exports[0]];
            console.log('[FinderInjector] Using first export as finder function:', exports[0]);
          }
        }
        
        // Clean up blob URL
        URL.revokeObjectURL(url);
      } catch (e) {
        console.error('[FinderInjector] Error importing finder module:', e);
        // Fallback: try to use CDN with named import
        console.log('[FinderInjector] Falling back to CDN');
        const script = document.createElement('script');
        script.type = 'module';
        script.textContent = `import { finder } from 'https://unpkg.com/@medv/finder@4.0.2/finder.js'; window.__finder = finder; window.finder = finder;`;
        document.head.appendChild(script);
      }
    }, finderCode);
    
  } catch (error: any) {
    // Silently fail - CDN fallback will be used
  }
}
