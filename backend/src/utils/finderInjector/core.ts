import { Page, BrowserContext } from 'playwright';
import { Server } from 'socket.io';
import { injectFinderLibrary, injectFinderLibraryDirect } from './finderLibrary';
import { injectFinderOverlay, injectFinderOverlayDirect } from './overlay';
import { exposeFinderFunctions } from './functions';

/**
 * Injects @medv/finder library and finder overlay UI into browser pages
 */
export class FinderInjector {
  /**
   * Inject finder library and overlay into a page
   * @param page The Playwright page object
   * @param io The Socket.IO server instance
   * @param nodeId The node ID requesting the selector
   * @param fieldName The field name requesting the selector
   * @param context Optional browser context (for exposing functions across navigations)
   */
  static async injectFinder(
    page: Page,
    io?: Server,
    nodeId?: string,
    fieldName?: string,
    context?: BrowserContext
  ): Promise<void> {
    // Store nodeId and fieldName in page context
    try {
      await page.evaluate(({ nId, fName }) => {
        (window as any).__automflowsNodeId = nId;
        (window as any).__automflowsFieldName = fName;
      }, { nId: nodeId, fName: fieldName });
    } catch (error: any) {
      // Silently fail
    }

    // Inject @medv/finder library
    try {
      await injectFinderLibrary(page);
    } catch (error: any) {
      // Silently fail
    }
    
    // Also inject directly into current page (for already-loaded pages)
    try {
      await injectFinderLibraryDirect(page);
    } catch (error: any) {
      // Silently fail
    }

    // Inject finder overlay UI
    try {
      await injectFinderOverlay(page);
      // Also inject directly into current page (for already-loaded pages)
      await injectFinderOverlayDirect(page);
    } catch (error: any) {
      // Silently fail
    }

    // Expose functions for selector generation (use context if available for cross-navigation support)
    try {
      const targetContext = context || page.context();
      await exposeFinderFunctions(page, io, targetContext);
    } catch (error: any) {
      // Silently fail
    }
    
    // Verify overlay exists and is visible after a delay using Playwright's isVisible()
    setTimeout(async () => {
      try {
        // Use Playwright's isVisible() which is more reliable
        const playwrightVisible = await page.locator('#automflows-finder-overlay').isVisible().catch(() => false);
        
        const overlayInfo = await page.evaluate(() => {
          const overlay = document.getElementById('automflows-finder-overlay');
          if (!overlay) {
            return { exists: false, visible: false };
          }
          const rect = overlay.getBoundingClientRect();
          const computedStyle = window.getComputedStyle(overlay);
          const isVisible = rect.width > 0 && rect.height > 0 && 
                            computedStyle.display !== 'none' && 
                            computedStyle.visibility !== 'hidden' && 
                            computedStyle.opacity !== '0';
          return {
            exists: true,
            visible: isVisible,
            display: computedStyle.display,
            visibility: computedStyle.visibility,
            opacity: computedStyle.opacity,
            width: rect.width,
            height: rect.height,
            top: rect.top,
            left: rect.left,
            zIndex: computedStyle.zIndex,
            backgroundColor: computedStyle.backgroundColor
          };
        });
        
        
        // If Playwright says it's not visible but DOM says it is, force visibility
        if (!playwrightVisible && overlayInfo.exists && overlayInfo.visible) {
          console.warn('[FinderInjector] Overlay exists in DOM but Playwright says not visible - forcing visibility');
          await page.evaluate(() => {
            const overlay = document.getElementById('automflows-finder-overlay');
            if (overlay) {
              overlay.style.setProperty('position', 'fixed', 'important');
              overlay.style.setProperty('bottom', '20px', 'important');
              overlay.style.setProperty('left', '20px', 'important');
              overlay.style.setProperty('z-index', '2147483647', 'important');
              overlay.style.setProperty('visibility', 'visible', 'important');
              overlay.style.setProperty('opacity', '1', 'important');
              overlay.style.setProperty('display', 'flex', 'important');
              overlay.style.setProperty('background-color', 'red', 'important'); // Make it super obvious
              overlay.style.setProperty('border', '5px solid yellow', 'important');
              overlay.style.setProperty('width', '100px', 'important');
              overlay.style.setProperty('height', '100px', 'important');
            }
          });
          
          // Take a screenshot to verify browser window is visible
          try {
            await page.screenshot({ path: '/tmp/overlay-debug.png', fullPage: false });
            console.log('[FinderInjector] Screenshot saved to /tmp/overlay-debug.png');
          } catch (e) {
            console.warn('[FinderInjector] Could not take screenshot:', e);
          }
        }
      } catch (error: any) {
        // Silently fail
      }
    }, 2000);
  }
}
