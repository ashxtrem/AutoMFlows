import { Page } from 'playwright';

/**
 * Get overlay injection script (for init script)
 */
export function getOverlayScript(): string {
  return `
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
}

/**
 * Inject finder overlay UI (floating icon) via init script
 */
export async function injectFinderOverlay(page: Page): Promise<void> {
  const overlayScript = getOverlayScript();
  await page.addInitScript(overlayScript);
}

/**
 * Get overlay direct injection script (for already-loaded pages)
 */
export function getOverlayDirectScript(): string {
  return `
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
  `;
}

/**
 * Inject finder overlay directly into current page (for already-loaded pages)
 * Simplified version that just triggers overlay creation if DOM is ready
 */
export async function injectFinderOverlayDirect(page: Page): Promise<void> {
  try {
    // Use addScriptTag instead of evaluate to avoid serialization issues
    await page.addScriptTag({
      content: getOverlayDirectScript()
    });
    
    // Skip the problematic page.evaluate() - it causes __name serialization errors
    // The addScriptTag above and addInitScript will handle overlay creation
  } catch (error: any) {
    // Silently fail
  }
}
