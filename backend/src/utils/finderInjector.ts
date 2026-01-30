import { Page, BrowserContext } from 'playwright';
import { Server } from 'socket.io';
import { SelectorOption } from '@automflows/shared';
import * as fs from 'fs';
import * as path from 'path';
import { SelectorSessionManager } from './selectorSessionManager';

// Extend Window interface to include custom properties
declare global {
  interface Window {
    __finderInjected?: boolean;
    __finder?: (element: Element) => string;
    finder?: (element: Element) => string;
    generateSelectors?: (elementHandle: any) => Promise<SelectorOption[]>;
    sendSelectorsToBackend?: (selectors: SelectorOption[], targetNodeId?: string, targetFieldName?: string) => Promise<SelectorOption[]>;
  }
}

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
  static async injectFinder(page: Page, io?: Server, nodeId?: string, fieldName?: string, context?: BrowserContext): Promise<void> {
    
    // Store nodeId and fieldName in page context
    try {
      await page.evaluate(({ nId, fName }) => {
        (window as any).__automflowsNodeId = nId;
        (window as any).__automflowsFieldName = fName;
      }, { nId: nodeId, fName: fieldName });
    } catch (error: any) {
    }

    // Inject @medv/finder library
    try {
      await this.injectFinderLibrary(page);
    } catch (error: any) {
    }
    
    // Also inject directly into current page (for already-loaded pages)
    try {
      await this.injectFinderLibraryDirect(page);
    } catch (error: any) {
    }

    // Inject finder overlay UI
    try {
      await this.injectFinderOverlay(page, io);
      // Also inject directly into current page (for already-loaded pages)
      await this.injectFinderOverlayDirect(page, io);
    } catch (error: any) {
    }

    // Expose functions for selector generation (use context if available for cross-navigation support)
    try {
      const targetContext = context || page.context();
      await this.exposeFinderFunctions(page, io, targetContext);
    } catch (error: any) {
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
      }
    }, 2000);
  }

  /**
   * Inject @medv/finder library via CDN
   */
  private static async injectFinderLibrary(page: Page): Promise<void> {
    const finderScript = `
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

    await page.addInitScript(finderScript);
  }

  /**
   * Inject finder library directly into current page (for already-loaded pages)
   * Reads from node_modules instead of CDN for reliability
   */
  private static async injectFinderLibraryDirect(page: Page): Promise<void> {
    
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
        await page.evaluate(() => {
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
        });
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
    }
  }

  /**
   * Inject finder overlay UI (floating icon)
   */
  private static async injectFinderOverlay(page: Page, io?: Server): Promise<void> {
    const overlayScript = `
      (function() {
        console.log('[FinderInjector] Starting overlay injection, url:', window.location.href);
        // Check if overlay actually exists, not just if flag is set
        const existingOverlay = document.getElementById('automflows-finder-overlay');
        if (window.__finderOverlayInjected && existingOverlay) {
          console.log('[FinderInjector] Overlay already injected and exists, skipping');
          return;
        }
        // Reset flag if overlay doesn't exist (e.g., after navigation)
        if (!existingOverlay) {
          console.log('[FinderInjector] Overlay flag set but overlay missing, resetting flag');
          window.__finderOverlayInjected = false;
        }
        window.__finderOverlayInjected = true;
        
        let finderActive = false;
        let overlayElement = null;
        
        // Robust viewport calculation function
        function getViewportDimensions() {
          const vw1 = window.innerWidth || 0;
          const vh1 = window.innerHeight || 0;
          const vw2 = document.documentElement.clientWidth || 0;
          const vh2 = document.documentElement.clientHeight || 0;
          const vw3 = document.body?.clientWidth || 0;
          const vh3 = document.body?.clientHeight || 0;
          
          return {
            width: Math.max(vw1, vw2, vw3),
            height: Math.max(vh1, vh2, vh3)
          };
        }
        
        function createOverlay() {
          if (!document.body && !document.documentElement) {
            setTimeout(createOverlay, 50);
            return;
          }
          
          // Wait for viewport to be ready (not 0x0) using robust calculation
          const viewport = getViewportDimensions();
          if (viewport.width === 0 || viewport.height === 0) {
            requestAnimationFrame(function checkViewport() {
              const vp = getViewportDimensions();
              if (vp.width > 0 && vp.height > 0) {
                createOverlay();
              } else {
                requestAnimationFrame(checkViewport);
              }
            });
            return;
          }
          
          // Remove existing overlay if any
          const existing = document.getElementById('automflows-finder-overlay');
          if (existing) {
            existing.remove();
          }
          
          overlayElement = document.createElement('div');
          overlayElement.id = 'automflows-finder-overlay';
          overlayElement.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
          
          const overlayWidth = 48;
          const overlayHeight = 48;
          const margin = 20;
          
          // Clear any inset property first to avoid conflicts
          overlayElement.style.removeProperty('inset');
          overlayElement.style.removeProperty('inset-block');
          overlayElement.style.removeProperty('inset-inline');
          
          // Core positioning properties
          overlayElement.style.setProperty('position', 'fixed', 'important');
          overlayElement.style.setProperty('bottom', margin + 'px', 'important');
          overlayElement.style.setProperty('left', margin + 'px', 'important');
          overlayElement.style.setProperty('right', 'auto', 'important');
          overlayElement.style.setProperty('top', 'auto', 'important');
          overlayElement.style.setProperty('width', overlayWidth + 'px', 'important');
          overlayElement.style.setProperty('height', overlayHeight + 'px', 'important');
          
          // Visual styling
          overlayElement.style.setProperty('background-color', '#3B82F6', 'important');
          overlayElement.style.setProperty('border-radius', '50%', 'important');
          overlayElement.style.setProperty('display', 'flex', 'important');
          overlayElement.style.setProperty('align-items', 'center', 'important');
          overlayElement.style.setProperty('justify-content', 'center', 'important');
          overlayElement.style.setProperty('cursor', 'pointer', 'important');
          overlayElement.style.setProperty('box-shadow', '0 4px 6px rgba(0, 0, 0, 0.3)', 'important');
          overlayElement.style.setProperty('z-index', '2147483647', 'important');
          overlayElement.style.setProperty('transition', 'all 0.2s', 'important');
          overlayElement.style.setProperty('visibility', 'visible', 'important');
          overlayElement.style.setProperty('opacity', '1', 'important');
          overlayElement.style.setProperty('pointer-events', 'auto', 'important');
          overlayElement.style.setProperty('margin', '0', 'important');
          overlayElement.style.setProperty('padding', '0', 'important');
          
          // Robust CSS reset - isolate from page layout and ensure top compositing layer
          overlayElement.style.setProperty('contain', 'layout style paint', 'important');
          overlayElement.style.setProperty('transform', 'none', 'important');
          overlayElement.style.setProperty('will-change', 'transform', 'important');
          overlayElement.style.setProperty('backface-visibility', 'hidden', 'important');
          
          overlayElement.addEventListener('mouseenter', function() {
            this.style.transform = 'scale(1.1)';
            this.style.backgroundColor = '#2563EB';
          });
          
          overlayElement.addEventListener('mouseleave', function() {
            if (!finderActive) {
              this.style.transform = 'scale(1)';
              this.style.backgroundColor = '#3B82F6';
            }
          });
          
          overlayElement.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            toggleFinderMode();
          });
          
          // Fix 1: Append to documentElement (<html>) to avoid body stacking contexts
          function appendOverlay() {
            if (document.documentElement) {
              document.documentElement.appendChild(overlayElement);
            } else if (document.body) {
              document.body.appendChild(overlayElement);
            } else {
              setTimeout(appendOverlay, 50);
              return;
            }
            
            // Fix 2: Simplified repaint logic without remove/re-add
            requestAnimationFrame(function() {
              // Toggle display to force layout calculation without detaching DOM node
              overlayElement.style.display = 'none';
              overlayElement.offsetHeight; // Force reflow
              overlayElement.style.setProperty('display', 'flex', 'important');
              
              // Fix 3: Delayed resize dispatch to allow main thread to clear
              setTimeout(() => {
                window.dispatchEvent(new Event('resize'));
                window.dispatchEvent(new Event('scroll'));
              }, 250);
            });
          }
          
          appendOverlay();
        }
        
        function toggleFinderMode() {
          finderActive = !finderActive;
          console.log('[FinderInjector] toggleFinderMode called, finderActive:', finderActive);
          
          if (finderActive) {
            overlayElement.style.backgroundColor = '#10B981';
            overlayElement.style.boxShadow = '0 0 0 4px rgba(16, 185, 129, 0.3)';
            document.body.style.cursor = 'crosshair';
            
            console.log('[FinderInjector] Activating finder mode, adding event listeners');
            // Add click listener to document
            document.addEventListener('click', handleElementClick, true);
            
            // Add hover effect
            document.addEventListener('mouseover', highlightElement, true);
            console.log('[FinderInjector] Event listeners added, finder mode active');
          } else {
            overlayElement.style.backgroundColor = '#3B82F6';
            overlayElement.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.3)';
            document.body.style.cursor = 'default';
            
            console.log('[FinderInjector] Deactivating finder mode, removing event listeners');
            // Remove listeners
            document.removeEventListener('click', handleElementClick, true);
            document.removeEventListener('mouseover', highlightElement, true);
            
            // Remove any highlights
            const highlights = document.querySelectorAll('.automflows-finder-highlight');
            highlights.forEach(el => el.remove());
          }
        }
        
        let highlightedElement = null;
        
        function highlightElement(e) {
          if (!finderActive || !document.body) return;
          
          e.preventDefault();
          e.stopPropagation();
          
          // Remove previous highlight
          if (highlightedElement) {
            const prevHighlight = document.querySelector('.automflows-finder-highlight');
            if (prevHighlight) prevHighlight.remove();
          }
          
          // Add highlight to current element
          const target = e.target;
          if (target && target !== overlayElement && document.body) {
            highlightedElement = target;
            const highlight = document.createElement('div');
            highlight.className = 'automflows-finder-highlight';
            highlight.style.cssText = 'position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 2px solid #10B981; background-color: rgba(16, 185, 129, 0.1); pointer-events: none; z-index: 999998; box-sizing: border-box;';
            
            const rect = target.getBoundingClientRect();
            highlight.style.top = (rect.top + window.scrollY) + 'px';
            highlight.style.left = (rect.left + window.scrollX) + 'px';
            highlight.style.width = rect.width + 'px';
            highlight.style.height = rect.height + 'px';
            
            document.body.appendChild(highlight);
          }
        }
        
        async function handleElementClick(e) {
          console.log('[FinderInjector] handleElementClick called, finderActive:', finderActive, 'target:', e.target?.tagName);
          if (!finderActive) {
            console.log('[FinderInjector] Finder not active, ignoring click');
            return;
          }
          
          e.preventDefault();
          e.stopPropagation();
          
          const target = e.target;
          console.log('[FinderInjector] Click target:', target?.tagName, 'is overlay:', target === overlayElement, 'closest overlay:', target?.closest('#automflows-finder-overlay'));
          if (target && target !== overlayElement && !target.closest('#automflows-finder-overlay')) {
            // Generate selectors for clicked element
            console.log('[FinderInjector] Element clicked, checking for generateSelectors function:', typeof window.generateSelectors, 'window keys:', Object.keys(window).filter(k => k.includes('generate') || k.includes('finder')));
            
            // Wait for generateSelectors to be available (in case it's not exposed yet)
            let attempts = 0;
            while (!window.generateSelectors && attempts < 10) {
              console.log('[FinderInjector] Waiting for generateSelectors function, attempt:', attempts + 1);
              await new Promise(resolve => setTimeout(resolve, 100));
              attempts++;
            }
            
            // Generate selectors entirely in browser context to avoid serialization issues
            const currentNodeId = window.__automflowsNodeId || '';
            const currentFieldName = window.__automflowsFieldName || 'selector';
            console.log('[FinderInjector] Generating selectors for element:', target?.tagName, 'nodeId:', currentNodeId, 'fieldName:', currentFieldName);
            
            // Generate selectors in browser context (no serialization needed)
            try {
              if (!target || !target.tagName) {
                console.error('[FinderInjector] Invalid target element:', target);
                return;
              }
              
              // Get element info
              const elementInfo = {
                id: target.id || null,
                tagName: target.tagName ? target.tagName.toLowerCase() : 'unknown',
                className: target.className || '',
                textContent: target.textContent ? target.textContent.trim().substring(0, 100) : '',
                attributes: {},
              };
              
              // Get all attributes
              Array.from(target.attributes).forEach(function(attr) {
                elementInfo.attributes[attr.name] = attr.value;
              });
              
              // Generate CSS selector using @medv/finder
              let cssSelector = null;
              try {
                const finder = window.__finder || window.finder;
                if (finder && typeof finder === 'function') {
                  cssSelector = finder(target);
                }
              } catch (e) {
                console.error('[FinderInjector] Error calling finder:', e);
              }
              
              // Generate XPath selector
              let xpathSelector = null;
              try {
                xpathSelector = getXPath(target);
              } catch (e) {
                console.error('[FinderInjector] Error generating XPath:', e);
              }
              
              // Build selector options (must match SelectorOption interface: selector, type, quality, reason)
              const selectors = [];
              if (cssSelector) {
                selectors.push({ 
                  type: 'css', 
                  selector: cssSelector, 
                  quality: 'high',
                  reason: 'Generated by @medv/finder library'
                });
              }
              if (xpathSelector) {
                selectors.push({ 
                  type: 'xpath', 
                  selector: xpathSelector, 
                  quality: 'high',
                  reason: 'Generated XPath selector'
                });
              }
              if (elementInfo.id) {
                selectors.push({ 
                  type: 'css', 
                  selector: '#' + elementInfo.id, 
                  quality: 'high',
                  reason: 'Element has unique ID'
                });
              }
              if (elementInfo.className) {
                const classes = elementInfo.className.split(' ').filter(c => c.trim()).join('.');
                if (classes) {
                  selectors.push({ 
                    type: 'css', 
                    selector: elementInfo.tagName + '.' + classes, 
                    quality: 'medium',
                    reason: 'Element has class name'
                  });
                }
              }
              selectors.push({ 
                type: 'css', 
                selector: elementInfo.tagName, 
                quality: 'low',
                reason: 'Tag name only (may match multiple elements)'
              });
              
              // Send selectors to backend via Socket.IO
              if (window.sendSelectorsToBackend) {
                window.sendSelectorsToBackend(selectors, currentNodeId, currentFieldName);
              } else {
                console.error('[FinderInjector] sendSelectorsToBackend function not available');
              }
            } catch (err) {
              console.error('[FinderInjector] Error generating selectors:', err, err.stack);
            }
            
            // Helper function to generate XPath
            function getXPath(element) {
              if (element.id) {
                return '//*[@id="' + element.id + '"]';
              }
              if (element === document.body) {
                return '/html/body';
              }
              if (element === document.documentElement) {
                return '/html';
              }
              
              let ix = 0;
              const siblings = element.parentNode ? element.parentNode.childNodes : [];
              for (let i = 0; i < siblings.length; i++) {
                const sibling = siblings[i];
                if (sibling === element) {
                  return getXPath(element.parentNode) + '/' + element.tagName.toLowerCase() + '[' + (ix + 1) + ']';
                }
                if (sibling.nodeType === 1 && sibling.tagName === element.tagName) {
                  ix++;
                }
              }
            }
            
            // Deactivate finder mode
            toggleFinderMode();
          } else {
            console.log('[FinderInjector] Click was on overlay or invalid target, ignoring');
          }
        }
        
        // Create overlay when DOM is ready
        function initOverlay() {
          console.log('[FinderInjector] initOverlay called, document.body:', !!document.body, 'readyState:', document.readyState, 'url:', window.location.href);
          if (document.body) {
            console.log('[FinderInjector] document.body exists, creating overlay');
            createOverlay();
            
            // Recreate overlay on navigation (when body is replaced)
            const observer = new MutationObserver(function(mutations) {
              const overlayExists = !!document.getElementById('automflows-finder-overlay');
              if (!overlayExists && (document.body || document.documentElement)) {
                setTimeout(function() {
                  const viewport = getViewportDimensions();
                  if (viewport.width > 0 && viewport.height > 0) {
                    createOverlay();
                  } else {
                    requestAnimationFrame(function checkViewport() {
                      const vp = getViewportDimensions();
                      if (vp.width > 0 && vp.height > 0) {
                        createOverlay();
                      } else {
                        requestAnimationFrame(checkViewport);
                      }
                    });
                  }
                }, 100);
              }
            });
            
            observer.observe(document.body || document.documentElement, {
              childList: true,
              subtree: true
            });
            
            // Listen for navigation events
            window.addEventListener('popstate', function() {
              setTimeout(function() {
                const overlay = document.getElementById('automflows-finder-overlay');
                if (!overlay && (document.body || document.documentElement)) {
                  createOverlay();
                }
              }, 100);
            });
            
            // Listen for viewport resize (mobile/desktop switch)
            let resizeTimeout;
            window.addEventListener('resize', function() {
              clearTimeout(resizeTimeout);
              resizeTimeout = setTimeout(function() {
                const overlay = document.getElementById('automflows-finder-overlay');
                if (overlay) {
                  const rect = overlay.getBoundingClientRect();
                  if (rect.width === 0 || rect.height === 0 || rect.top < 0 || rect.left < 0) {
                    overlay.style.setProperty('position', 'fixed', 'important');
                    overlay.style.setProperty('bottom', '20px', 'important');
                    overlay.style.setProperty('left', '20px', 'important');
                    overlay.style.setProperty('display', 'flex', 'important');
                    overlay.style.setProperty('visibility', 'visible', 'important');
                    overlay.style.setProperty('opacity', '1', 'important');
                  }
                } else if (document.body || document.documentElement) {
                  createOverlay();
                }
              }, 100);
            });
            
            // Check overlay periodically (fallback)
            setInterval(function() {
              const overlay = document.getElementById('automflows-finder-overlay');
              if (!overlay && (document.body || document.documentElement)) {
                createOverlay();
              }
            }, 2000);
          } else {
            console.log('[FinderInjector] document.body not ready, retrying in 50ms');
            setTimeout(initOverlay, 50);
          }
        }
        
        console.log('[FinderInjector] Initializing overlay, readyState:', document.readyState, 'url:', window.location.href);
        
        // Wait for both DOMContentLoaded AND load event to ensure page is fully painted
        function waitForFullLoad() {
          if (document.readyState === 'complete') {
            console.log('[FinderInjector] Page fully loaded, initializing overlay');
            // Wait one more frame to ensure browser has painted
            requestAnimationFrame(function() {
              requestAnimationFrame(function() {
                initOverlay();
              });
            });
          } else {
            console.log('[FinderInjector] Waiting for load event, current readyState:', document.readyState);
            window.addEventListener('load', function() {
              console.log('[FinderInjector] Load event fired, initializing overlay');
              // Wait for browser to complete initial paint
              requestAnimationFrame(function() {
                requestAnimationFrame(function() {
                  initOverlay();
                });
              });
            }, { once: true });
          }
        }
        
        if (document.readyState === 'loading') {
          console.log('[FinderInjector] Waiting for DOMContentLoaded');
          document.addEventListener('DOMContentLoaded', function() {
            console.log('[FinderInjector] DOMContentLoaded fired, url:', window.location.href);
            // Wait for load event instead of initializing immediately
            waitForFullLoad();
          });
        } else {
          console.log('[FinderInjector] DOM already ready, waiting for full load');
          waitForFullLoad();
        }
      })();
    `;

    await page.addInitScript(overlayScript);
  }

  /**
   * Inject finder overlay directly into current page (for already-loaded pages)
   * Simplified version that just triggers overlay creation if DOM is ready
   */
  private static async injectFinderOverlayDirect(page: Page, io?: Server): Promise<void> {
    
    try {
      // Use addScriptTag instead of evaluate to avoid serialization issues
      await page.addScriptTag({
        content: `
          (function() {
            if (window.__finderOverlayInjectedDirect) return;
            window.__finderOverlayInjectedDirect = true;
            
            function initOverlayDirect() {
              if (!document.body) {
                setTimeout(initOverlayDirect, 100);
                return;
              }
              
              // Check if overlay already exists (from addInitScript)
              if (document.getElementById('automflows-finder-overlay')) {
                console.log('[FinderInjector] Overlay already exists from addInitScript');
                return;
              }
              
              // Create overlay
              const overlay = document.createElement('div');
              overlay.id = 'automflows-finder-overlay';
              overlay.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
              overlay.style.cssText = 'position: fixed; bottom: 20px; left: 20px; width: 48px; height: 48px; background-color: #3B82F6; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3); z-index: 999999; transition: all 0.2s;';
              
              overlay.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                if (window.toggleFinderMode) {
                  window.toggleFinderMode();
                }
              });
              
              // Append to documentElement to avoid body stacking contexts
              if (document.documentElement) {
                document.documentElement.appendChild(overlay);
              } else if (document.body) {
                document.body.appendChild(overlay);
              }
              console.log('[FinderInjector] Overlay created via direct injection');
            }
            
            if (document.readyState === 'loading') {
              document.addEventListener('DOMContentLoaded', initOverlayDirect);
            } else {
              initOverlayDirect();
            }
          })();
        `
      });
      
      // Skip the problematic page.evaluate() - it causes __name serialization errors
      // The addScriptTag above and addInitScript will handle overlay creation
    } catch (error: any) {
    }
  }

  /**
   * Expose functions for selector generation
   */
  private static async exposeFinderFunctions(page: Page, io?: Server, context?: BrowserContext): Promise<void> {
    
    // Expose selector generation function
    // Note: DOM elements can't be serialized, so we need to use evaluateHandle
    await (context || page).exposeFunction('generateSelectors', async (elementHandle: any) => {
      // This will be called from browser context
      // The element is passed as a handle, but we need to evaluate it in browser context
      // Use evaluateHandle to get a proper handle, then evaluate with it
      let handle = elementHandle;
      if (!handle || typeof handle !== 'object' || !('asElement' in handle)) {
        // If it's not a handle, try to evaluate it as an element
        try {
          handle = await page.evaluateHandle((el) => el, elementHandle);
        } catch (e) {
          console.error('[FinderInjector] Error getting element handle:', e);
          return [];
        }
      }
      
      const selectors = await page.evaluate((el) => {
        // Validate element exists
        if (!el || !el.tagName) {
          console.error('[FinderInjector] Invalid element passed to generateSelectors:', el, typeof el);
          return [];
        }
        
        // Get element info
        const elementInfo: {
          id: string | null;
          tagName: string;
          className: string;
          textContent: string;
          attributes: Record<string, string>;
        } = {
          id: el.id || null,
          tagName: el.tagName ? el.tagName.toLowerCase() : 'unknown',
          className: el.className || '',
          textContent: el.textContent ? el.textContent.trim().substring(0, 100) : '',
          attributes: {},
        };

        // Get all attributes
        (Array.from(el.attributes) as Attr[]).forEach(function(attr: Attr) {
          elementInfo.attributes[attr.name] = attr.value;
        });

        // Generate CSS selector using @medv/finder
        let cssSelector = null;
        try {
          console.log('[FinderInjector] Checking for finder function, window.__finder:', typeof window.__finder, 'window.finder:', typeof window.finder);
          const finder = window.__finder || window.finder;
          if (finder && typeof finder === 'function') {
            console.log('[FinderInjector] Calling finder function for element:', el.tagName, el.id || el.className);
            cssSelector = finder(el);
            console.log('[FinderInjector] Generated CSS selector:', cssSelector);
          } else {
            console.warn('[FinderInjector] Finder function not available. window.__finder:', typeof window.__finder, 'window.finder:', typeof window.finder);
          }
        } catch (e) {
          console.error('[FinderInjector] Error using finder:', e);
        }

        // Generate XPath selectors
        const xpathSelectors = [];

        // ID-based
        if (elementInfo.id) {
          xpathSelectors.push({
            selector: '//*[@id=\'' + elementInfo.id + '\']',
            quality: 'high',
            reason: 'Unique ID attribute',
          });
          xpathSelectors.push({
            selector: '//' + elementInfo.tagName + '[@id=\'' + elementInfo.id + '\']',
            quality: 'high',
            reason: 'Tag name with unique ID',
          });
        }

        // Text-based
        if (elementInfo.textContent && elementInfo.textContent.length > 0 && elementInfo.textContent.length < 100) {
          const escapedText = elementInfo.textContent.replace(/'/g, "\\'");
          xpathSelectors.push({
            selector: '//' + elementInfo.tagName + '[text()=\'' + escapedText + '\']',
            quality: 'medium',
            reason: 'Text content match',
          });
        }

        // Attribute-based
        for (const name in elementInfo.attributes) {
          if (name === 'id' || name === 'class') continue;
          if (name.indexOf('data-') === 0 || name === 'name' || name === 'type') {
            const value = elementInfo.attributes[name];
            xpathSelectors.push({
              selector: '//' + elementInfo.tagName + '[@' + name + '=\'' + value + '\']',
              quality: name.indexOf('data-') === 0 ? 'high' : 'medium',
              reason: name + ' attribute',
            });
          }
        }

        // Class-based
        if (elementInfo.className) {
          const classes = elementInfo.className.split(/\s+/).filter(function(c: string) { return c; });
          if (classes.length === 1) {
            xpathSelectors.push({
              selector: '//' + elementInfo.tagName + '[@class=\'' + classes[0] + '\']',
              quality: 'medium',
              reason: 'Single class name',
            });
          } else if (classes.length > 1) {
            xpathSelectors.push({
              selector: '//' + elementInfo.tagName + '[contains(@class, \'' + classes[0] + '\')]',
              quality: 'medium',
              reason: 'Class combination',
            });
          }
        }

        // Position-based (fallback)
        const parent = el.parentElement;
        if (parent) {
          const siblings = Array.from(parent.children);
          const index = siblings.indexOf(el) + 1;
          xpathSelectors.push({
            selector: '//' + elementInfo.tagName + '[' + index + ']',
            quality: 'low',
            reason: 'Position-based (' + index + 'th ' + elementInfo.tagName + ')',
          });
        }

        // Build result array
        const result = [];

        // Add CSS selector if available
        if (cssSelector) {
          let cssQuality = 'medium';
          if (elementInfo.id || cssSelector.indexOf('[data-') !== -1 || /^#[a-zA-Z]/.test(cssSelector)) {
            cssQuality = 'high';
          } else if (cssSelector.indexOf('.') !== -1 || cssSelector.indexOf('[') !== -1) {
            cssQuality = 'medium';
          } else {
            cssQuality = 'low';
          }

          let cssReason = 'Element structure';
          if (elementInfo.id) {
            cssReason = 'Unique ID attribute';
          } else if (elementInfo.className) {
            cssReason = 'Class combination';
          } else {
            let hasDataAttr = false;
            for (const key in elementInfo.attributes) {
              if (key.indexOf('data-') === 0) {
                hasDataAttr = true;
                break;
              }
            }
            if (hasDataAttr) {
              cssReason = 'Data attribute';
            }
          }

          result.push({
            selector: cssSelector,
            type: 'css',
            quality: cssQuality,
            reason: cssReason,
          });
        }

        // Add XPath selectors
        xpathSelectors.forEach(function(xp) {
          result.push({
            selector: xp.selector,
            type: 'xpath',
            quality: xp.quality,
            reason: xp.reason,
          });
        });

        // Generate Playwright locator selectors
        const playwrightSelectors = [];

        // 1. getByRole
        const tagName = elementInfo.tagName;
        const roleMap: Record<string, string> = {
          'button': 'button',
          'a': el.getAttribute('href') ? 'link' : 'button',
          'input': (() => {
            const inputType = el.getAttribute('type')?.toLowerCase() || 'text';
            if (inputType === 'button' || inputType === 'submit' || inputType === 'reset') return 'button';
            if (inputType === 'checkbox') return 'checkbox';
            if (inputType === 'radio') return 'radio';
            return 'textbox';
          })(),
          'select': 'combobox',
          'textarea': 'textbox',
          'img': 'img',
          'h1': 'heading',
          'h2': 'heading',
          'h3': 'heading',
          'h4': 'heading',
          'h5': 'heading',
          'h6': 'heading',
        };
        const role = el.getAttribute('role') || roleMap[tagName];
        if (role) {
          const textContent = elementInfo.textContent;
          if (textContent && textContent.length > 0 && textContent.length < 100) {
            playwrightSelectors.push({
              selector: 'role:' + role + ',name:' + textContent.substring(0, 50),
              type: 'getByRole',
              quality: 'high',
              reason: 'Role "' + role + '" with accessible name',
            });
          } else {
            playwrightSelectors.push({
              selector: 'role:' + role,
              type: 'getByRole',
              quality: 'high',
              reason: 'Role "' + role + '"',
            });
          }
        }

        // 2. getByTestId
        const testId = el.getAttribute('data-testid');
        if (testId) {
          playwrightSelectors.push({
            selector: 'testid:' + testId,
            type: 'getByTestId',
            quality: 'high',
            reason: 'Test ID attribute',
          });
        }

        // 3. getByLabel
        const id = elementInfo.id;
        let labelText = null;
        if (id) {
          const label = document.querySelector('label[for="' + id + '"]');
          if (label) {
            labelText = label.textContent?.trim() || null;
          }
        }
        if (!labelText) {
          let parent = el.parentElement;
          while (parent && parent.tagName.toLowerCase() !== 'label') {
            parent = parent.parentElement;
          }
          if (parent) {
            labelText = parent.textContent?.trim() || null;
          }
        }
        if (!labelText) {
          labelText = el.getAttribute('aria-label');
        }
        if (labelText) {
          playwrightSelectors.push({
            selector: 'label:' + labelText,
            type: 'getByLabel',
            quality: 'high',
            reason: 'Associated with label',
          });
        }

        // 4. getByPlaceholder
        const placeholder = el.getAttribute('placeholder');
        if (placeholder) {
          playwrightSelectors.push({
            selector: 'placeholder:' + placeholder,
            type: 'getByPlaceholder',
            quality: 'medium',
            reason: 'Placeholder attribute',
          });
        }

        // 5. getByText (if not already covered by getByRole)
        if (elementInfo.textContent && elementInfo.textContent.length > 0 && elementInfo.textContent.length < 100 && !role) {
          playwrightSelectors.push({
            selector: 'text:' + elementInfo.textContent.substring(0, 50),
            type: 'getByText',
            quality: 'medium',
            reason: 'Text content',
          });
        }

        // 6. getByTitle
        const title = el.getAttribute('title');
        if (title) {
          playwrightSelectors.push({
            selector: 'title:' + title,
            type: 'getByTitle',
            quality: 'medium',
            reason: 'Title attribute',
          });
        }

        // 7. getByAltText
        if (tagName === 'img') {
          const alt = el.getAttribute('alt');
          if (alt) {
            playwrightSelectors.push({
              selector: 'alt:' + alt,
              type: 'getByAltText',
              quality: 'high',
              reason: 'Image alt text',
            });
          }
        }

        // Add Playwright selectors
        playwrightSelectors.forEach(function(ps) {
          result.push(ps);
        });

        // Sort by quality
        const qualityOrder: Record<string, number> = { high: 3, medium: 2, low: 1 };
        result.sort(function(a, b) {
          return qualityOrder[b.quality] - qualityOrder[a.quality];
        });

        return result;
      }, handle);

      return selectors;
    });

    // Expose function to send selectors to backend
    await (context || page).exposeFunction('sendSelectorsToBackend', async (selectors: SelectorOption[], targetNodeId?: string, targetFieldName?: string) => {
      
      // Get nodeId and fieldName from session manager (persistent across navigations)
      // First try provided values, then page context, then session manager
      let nodeId = targetNodeId;
      let fieldName = targetFieldName;
      
      if (!nodeId || !fieldName) {
        // Get from session manager (persistent across navigations)
        const sessionManager = SelectorSessionManager.getInstance();
        const target = sessionManager.getCurrentTarget();
        
        if (!nodeId) {
          // Try page context first (for backward compatibility)
          nodeId = await page.evaluate(() => (window as any).__automflowsNodeId);
          // If still not found, get from session manager
          if (!nodeId) {
            nodeId = target.nodeId || undefined;
          }
        }
        
        if (!fieldName) {
          // Try page context first (for backward compatibility)
          fieldName = await page.evaluate(() => (window as any).__automflowsFieldName);
          // If still not found, get from session manager
          if (!fieldName) {
            fieldName = target.fieldName || 'selector';
          }
        }
      }
      
      // Ensure we have valid values
      if (!nodeId || !fieldName) {
        console.error('[FinderInjector] Missing nodeId or fieldName:', { nodeId, fieldName });
        return selectors;
      }
      
      
      // Emit Socket.IO event with selectors
      if (io) {
        const eventData = {
          event: 'selectors-generated',
          selectors,
          nodeId,
          fieldName,
        };
        io.emit('selector-finder-event', eventData);
      } else {
      }
      return selectors;
    });
    
    // Verify functions are accessible in browser context
    try {
      const functionsAvailable = await page.evaluate(() => {
        return {
          generateSelectors: typeof window.generateSelectors,
          sendSelectorsToBackend: typeof window.sendSelectorsToBackend,
          finder: typeof window.__finder,
          finder2: typeof window.finder,
        };
      });
    } catch (error: any) {
    }
  }
}
