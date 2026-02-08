import { Page, BrowserContext } from 'playwright';
import { Server } from 'socket.io';
import { RecordedAction } from '@automflows/shared';
import * as fs from 'fs';
import * as path from 'path';
import { ActionRecorderSessionManager } from './actionRecorderSessionManager';

// Extend Window interface
declare global {
  interface Window {
    __actionRecorderInjected?: boolean;
    __actionRecorderActive?: boolean;
    __webhookListenersActive?: boolean;
    __finder?: (element: Element) => string;
    finder?: (element: Element) => string;
    __startActionRecording?: () => void;
    __stopActionRecording?: () => void;
  }
}

/**
 * Injects action recorder overlay and webhook listeners into browser pages
 */
export class ActionRecorderInjector {
  /**
   * Inject capture icon overlay and webhook setup into a page
   */
  static async injectActionRecorderOverlay(page: Page, io: Server): Promise<void> {
    const sessionManager = ActionRecorderSessionManager.getInstance();
    
    // Inject finder library first
    await this.injectFinderLibrary(page);
    
    // Expose function for page to call to send actions (wrap in try-catch to handle already registered)
    try {
      await page.exposeFunction('__sendActionToBackend', (action: RecordedAction) => {
        sessionManager.addAction(action);
      });
    } catch (error: any) {
      // Function already exposed, ignore
      if (!error.message?.includes('already registered')) {
        throw error;
      }
    }
    
    // Expose functions for overlay to call to start/stop webhook
    try {
      await page.exposeFunction('__startWebhookFromPage', async () => {
        // Activate webhook listeners
        await page.evaluate(() => {
          if (window.__startActionRecording) {
            window.__startActionRecording();
          }
        });
        sessionManager.startRecording();
      });
    } catch (error: any) {
      // Function already exposed, ignore
      if (!error.message?.includes('already registered')) {
        throw error;
      }
    }
    
    try {
      await page.exposeFunction('__stopWebhookFromPage', async () => {
        await page.evaluate(() => {
          if (window.__stopActionRecording) {
            window.__stopActionRecording();
          }
        });
        sessionManager.stopRecording('user');
      });
    } catch (error: any) {
      // Function already exposed, ignore
      if (!error.message?.includes('already registered')) {
        throw error;
      }
    }
    const overlayScript = `
      (function() {
        if (window.__actionRecorderInjected) {
          return;
        }
        window.__actionRecorderInjected = true;
        window.__actionRecorderActive = false;
        
        let recording = false;
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
          const existing = document.getElementById('automflows-action-recorder-overlay');
          if (existing) {
            existing.remove();
          }
          
          overlayElement = document.createElement('div');
          overlayElement.id = 'automflows-action-recorder-overlay';
          overlayElement.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" stroke="white" stroke-width="2" fill="none"/><circle cx="12" cy="12" r="3" fill="white"/></svg>';
          
          overlayElement.style.setProperty('position', 'fixed', 'important');
          overlayElement.style.setProperty('bottom', '20px', 'important');
          overlayElement.style.setProperty('left', '20px', 'important');
          overlayElement.style.setProperty('right', 'auto', 'important');
          overlayElement.style.setProperty('top', 'auto', 'important');
          overlayElement.style.setProperty('width', '48px', 'important');
          overlayElement.style.setProperty('height', '48px', 'important');
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
          
          overlayElement.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            toggleRecording();
          });
          
          // Fix 1: Append to documentElement (<html>) to avoid body stacking contexts
          if (document.documentElement) {
            document.documentElement.appendChild(overlayElement);
          } else if (document.body) {
            document.body.appendChild(overlayElement);
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
        
        function startRecording() {
          // This will be called by backend when webhook starts
          window.__actionRecorderActive = true;
          recording = true;
          console.log('[ActionRecorder] Recording started');
          if (overlayElement) {
            overlayElement.style.backgroundColor = '#EF4444';
            overlayElement.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="6" y="6" width="12" height="12" rx="2" fill="white"/></svg>';
          }
        }
        
        function stopRecording() {
          // This will be called by backend when webhook stops
          window.__actionRecorderActive = false;
          recording = false;
          console.log('[ActionRecorder] Recording stopped');
          if (overlayElement) {
            overlayElement.style.backgroundColor = '#3B82F6';
            overlayElement.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" stroke="white" stroke-width="2" fill="none"/><circle cx="12" cy="12" r="3" fill="white"/></svg>';
          }
        }
        
        function toggleRecording() {
          if (recording) {
            // Stop recording - call exposed function
            if (window.__stopWebhookFromPage) {
              window.__stopWebhookFromPage().then(function() {
                stopRecording();
              }).catch(function(err) {
                console.error('[ActionRecorder] Failed to stop webhook:', err);
              });
            } else {
              stopRecording();
            }
          } else {
            // Start recording - call exposed function
            if (window.__startWebhookFromPage) {
              window.__startWebhookFromPage().then(function() {
                startRecording();
              }).catch(function(err) {
                console.error('[ActionRecorder] Failed to start webhook:', err);
              });
            } else {
              startRecording();
            }
          }
        }
        
        // Expose functions for backend to call
        window.__startActionRecording = startRecording;
        window.__stopActionRecording = stopRecording;
        
        // Webhook listeners setup (inactive until recording starts)
        function setupWebhookListeners() {
          if (window.__webhookListenersActive) {
            return;
          }
          window.__webhookListenersActive = true;
          
          let actionIdCounter = 0;
          
          function generateSelector(element) {
            if (!window.__finder && !window.finder) {
              return '';
            }
            try {
              const finder = window.__finder || window.finder;
              return finder(element);
            } catch (e) {
              return '';
            }
          }
          
          function getElementInfo(element) {
            return {
              tagName: element.tagName.toLowerCase(),
              id: element.id || undefined,
              className: element.className || undefined,
              text: (element.textContent || '').trim().substring(0, 100) || undefined,
            };
          }
          
          function recordAction(type, element, data) {
            if (!window.__actionRecorderActive) {
              return;
            }
            
            const action = {
              id: 'action-' + Date.now() + '-' + (actionIdCounter++),
              type: type,
              timestamp: Date.now(),
            };
            
            if (element) {
              const selector = generateSelector(element);
              if (selector) {
                action.selector = selector;
                action.selectorType = selector.startsWith('//') ? 'xpath' : 'css';
              }
              action.elementInfo = getElementInfo(element);
            }
            
            if (data) {
              Object.assign(action, data);
            }
            
            // Call exposed function
            if (window.__sendActionToBackend) {
              window.__sendActionToBackend(action);
            }
          }
          
          // Click listener
          document.addEventListener('click', function(e) {
            if (e.target instanceof Element) {
              recordAction('click', e.target);
            }
          }, true);
          
          // Input/textarea change listener
          document.addEventListener('input', function(e) {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
              recordAction('type', e.target, { value: e.target.value });
            }
          }, true);
          
          // Keyboard listener
          document.addEventListener('keydown', function(e) {
            if (e.target instanceof Element && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
              recordAction('keyboard', e.target, { key: e.key });
            }
          }, true);
          
          // Form input listener (select, checkbox, radio)
          document.addEventListener('change', function(e) {
            if (e.target instanceof HTMLSelectElement) {
              recordAction('form-input', e.target, { value: e.target.value });
            } else if (e.target instanceof HTMLInputElement && (e.target.type === 'checkbox' || e.target.type === 'radio')) {
              recordAction('form-input', e.target, { value: e.target.checked ? 'checked' : 'unchecked' });
            }
          }, true);
          
          // Navigation listener
          let lastUrl = window.location.href;
          const checkNavigation = function() {
            if (window.location.href !== lastUrl) {
              lastUrl = window.location.href;
              recordAction('navigation', undefined, { url: lastUrl });
            }
          };
          window.addEventListener('popstate', checkNavigation);
          setInterval(checkNavigation, 1000);
          
          // Scroll listener
          let scrollTimeout;
          window.addEventListener('scroll', function() {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(function() {
              recordAction('scroll');
            }, 100);
          }, true);
          
          // Hover listener (with debounce)
          let hoverTimeout;
          document.addEventListener('mouseover', function(e) {
            if (e.target instanceof Element) {
              clearTimeout(hoverTimeout);
              hoverTimeout = setTimeout(function() {
                recordAction('hover', e.target);
              }, 300);
            }
          }, true);
        }
        
        createOverlay();
        
        // Listen for navigation events to recreate overlay
        window.addEventListener('popstate', function() {
          setTimeout(function() {
            const overlay = document.getElementById('automflows-action-recorder-overlay');
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
            const overlay = document.getElementById('automflows-action-recorder-overlay');
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
        
        // Monitor for body replacement (SPA navigation)
        const observer = new MutationObserver(function(mutations) {
          const overlayExists = !!document.getElementById('automflows-action-recorder-overlay');
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
        
        // Periodic check (fallback)
        setInterval(function() {
          const overlay = document.getElementById('automflows-action-recorder-overlay');
          if (!overlay && (document.body || document.documentElement)) {
            createOverlay();
          }
        }, 2000);
        
        // Set up webhook listeners (but inactive until recording starts)
        setupWebhookListeners();
      })();
    `;
    
    await page.addInitScript(overlayScript);
    
    // Also inject directly into current page
    try {
      // Check if already injected before evaluating
      const alreadyInjected = await page.evaluate(() => {
        return !!window.__actionRecorderInjected;
      });
      
      // If not already injected, evaluate the script
      if (!alreadyInjected) {
        await page.evaluate(overlayScript);
        
        // Verify overlay was created
        const overlayExists = await page.evaluate(() => {
          return !!document.getElementById('automflows-action-recorder-overlay');
        });
      } else {
        // Already injected - check if overlay exists
        const overlayExists = await page.evaluate(() => {
          return !!document.getElementById('automflows-action-recorder-overlay');
        });
        
        // If overlay doesn't exist, force recreate it
        if (!overlayExists) {
          // Reset flag and re-evaluate
          await page.evaluate(() => {
            window.__actionRecorderInjected = false;
          });
          await page.evaluate(overlayScript);
        }
      }
    } catch (error: any) {
      console.warn('Failed to inject overlay directly:', error.message);
    }
  }
  
  /**
   * Inject webhook listeners setup (called from overlay script)
   */
  private static getWebhookListenersScript(): string {
    return `
      function setupWebhookListeners() {
        if (window.__webhookListenersActive) {
          return;
        }
        window.__webhookListenersActive = true;
        
        let actionIdCounter = 0;
        
        function generateSelector(element) {
          if (!window.__finder && !window.finder) {
            return '';
          }
          try {
            const finder = window.__finder || window.finder;
            return finder(element);
          } catch (e) {
            return '';
          }
        }
        
        function getElementInfo(element) {
          return {
            tagName: element.tagName.toLowerCase(),
            id: element.id || undefined,
            className: element.className || undefined,
            text: (element.textContent || '').trim().substring(0, 100) || undefined,
          };
        }
        
        function recordAction(type, element, data) {
          if (!window.__actionRecorderActive) {
            return;
          }
          
          const action = {
            id: 'action-' + Date.now() + '-' + (actionIdCounter++),
            type: type,
            timestamp: Date.now(),
          };
          
          if (element) {
            const selector = generateSelector(element);
            if (selector) {
              action.selector = selector;
              action.selectorType = selector.startsWith('//') ? 'xpath' : 'css';
            }
            action.elementInfo = getElementInfo(element);
          }
          
          if (data) {
            Object.assign(action, data);
          }
          
          // Call exposed function
          if (window.__sendActionToBackend) {
            window.__sendActionToBackend(action);
          }
        }
        
        // Click listener
        document.addEventListener('click', function(e) {
          if (e.target instanceof Element) {
            recordAction('click', e.target);
          }
        }, true);
        
        // Input/textarea change listener
        document.addEventListener('input', function(e) {
          if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
            recordAction('type', e.target, { value: e.target.value });
          }
        }, true);
        
        // Keyboard listener
        document.addEventListener('keydown', function(e) {
          if (e.target instanceof Element && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
            recordAction('keyboard', e.target, { key: e.key });
          }
        }, true);
        
        // Form input listener (select, checkbox, radio)
        document.addEventListener('change', function(e) {
          if (e.target instanceof HTMLSelectElement) {
            recordAction('form-input', e.target, { value: e.target.value });
          } else if (e.target instanceof HTMLInputElement && (e.target.type === 'checkbox' || e.target.type === 'radio')) {
            recordAction('form-input', e.target, { value: e.target.checked ? 'checked' : 'unchecked' });
          }
        }, true);
        
        // Navigation listener
        let lastUrl = window.location.href;
        const checkNavigation = function() {
          if (window.location.href !== lastUrl) {
            lastUrl = window.location.href;
            recordAction('navigation', undefined, { url: lastUrl });
          }
        };
        window.addEventListener('popstate', checkNavigation);
        setInterval(checkNavigation, 1000);
        
        // Scroll listener
        let scrollTimeout;
        window.addEventListener('scroll', function() {
          clearTimeout(scrollTimeout);
          scrollTimeout = setTimeout(function() {
            recordAction('scroll');
          }, 100);
        }, true);
        
        // Hover listener (with debounce)
        let hoverTimeout;
        document.addEventListener('mouseover', function(e) {
          if (e.target instanceof Element) {
            clearTimeout(hoverTimeout);
            hoverTimeout = setTimeout(function() {
              recordAction('hover', e.target);
            }, 300);
          }
        }, true);
      }
    `;
  }

  /**
   * Start webhook listening for actions
   */
  static async startWebhookListening(page: Page, io: Server): Promise<void> {
    const sessionManager = ActionRecorderSessionManager.getInstance();
    
    // Inject finder library if not already injected
    await this.injectFinderLibrary(page);
    
    // Expose function for page to call to send actions (wrap in try-catch to handle already registered)
    try {
      await page.exposeFunction('__sendActionToBackend', (action: RecordedAction) => {
        sessionManager.addAction(action);
      });
    } catch (error: any) {
      // Function already exposed, ignore
      if (!error.message?.includes('already registered')) {
        throw error;
      }
    }
    
    // Expose functions for overlay to call to start/stop webhook
    try {
      await page.exposeFunction('__startWebhookFromPage', async () => {
        // Webhook listeners are already set up, just need to activate them
        await page.evaluate(() => {
          if (window.__startActionRecording) {
            window.__startActionRecording();
          }
        });
        sessionManager.startRecording();
      });
    } catch (error: any) {
      // Function already exposed, ignore
      if (!error.message?.includes('already registered')) {
        throw error;
      }
    }
    
    try {
      await page.exposeFunction('__stopWebhookFromPage', async () => {
        await page.evaluate(() => {
          if (window.__stopActionRecording) {
            window.__stopActionRecording();
          }
        });
        sessionManager.stopRecording('user');
      });
    } catch (error: any) {
      // Function already exposed, ignore
      if (!error.message?.includes('already registered')) {
        throw error;
      }
    }
    
    const webhookScript = `
      (function() {
        if (window.__webhookListenersActive) {
          return;
        }
        window.__webhookListenersActive = true;
        
        let actionIdCounter = 0;
        
        function generateSelector(element) {
          if (!window.__finder && !window.finder) {
            return '';
          }
          try {
            const finder = window.__finder || window.finder;
            return finder(element);
          } catch (e) {
            return '';
          }
        }
        
        function getElementInfo(element) {
          return {
            tagName: element.tagName.toLowerCase(),
            id: element.id || undefined,
            className: element.className || undefined,
            text: (element.textContent || '').trim().substring(0, 100) || undefined,
          };
        }
        
        function recordAction(type, element, data) {
          if (!window.__actionRecorderActive) {
            return;
          }
          
          const action = {
            id: 'action-' + Date.now() + '-' + (actionIdCounter++),
            type: type,
            timestamp: Date.now(),
          };
          
          if (element) {
            const selector = generateSelector(element);
            if (selector) {
              action.selector = selector;
              action.selectorType = selector.startsWith('//') ? 'xpath' : 'css';
            }
            action.elementInfo = getElementInfo(element);
          }
          
          if (data) {
            Object.assign(action, data);
          }
          
          // Call exposed function
          if (window.__sendActionToBackend) {
            window.__sendActionToBackend(action);
          }
        }
        
        // Store recordAction globally so it can be called from event listeners
        window.__recordAction = recordAction;
        
        // Click listener
        document.addEventListener('click', function(e) {
          if (e.target instanceof Element) {
            recordAction('click', e.target);
          }
        }, true);
        
        // Input/textarea change listener
        document.addEventListener('input', function(e) {
          if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
            recordAction('type', e.target, { value: e.target.value });
          }
        }, true);
        
        // Keyboard listener
        document.addEventListener('keydown', function(e) {
          if (e.target instanceof Element && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
            recordAction('keyboard', e.target, { key: e.key });
          }
        }, true);
        
        // Form input listener (select, checkbox, radio)
        document.addEventListener('change', function(e) {
          if (e.target instanceof HTMLSelectElement) {
            recordAction('form-input', e.target, { value: e.target.value });
          } else if (e.target instanceof HTMLInputElement && (e.target.type === 'checkbox' || e.target.type === 'radio')) {
            recordAction('form-input', e.target, { value: e.target.checked ? 'checked' : 'unchecked' });
          }
        }, true);
        
        // Navigation listener
        let lastUrl = window.location.href;
        const checkNavigation = function() {
          if (window.location.href !== lastUrl) {
            lastUrl = window.location.href;
            recordAction('navigation', undefined, { url: lastUrl });
          }
        };
        window.addEventListener('popstate', checkNavigation);
        setInterval(checkNavigation, 1000);
        
        // Scroll listener
        let scrollTimeout;
        window.addEventListener('scroll', function() {
          clearTimeout(scrollTimeout);
          scrollTimeout = setTimeout(function() {
            recordAction('scroll');
          }, 100);
        }, true);
        
        // Hover listener (with debounce)
        let hoverTimeout;
        document.addEventListener('mouseover', function(e) {
          if (e.target instanceof Element) {
            clearTimeout(hoverTimeout);
            hoverTimeout = setTimeout(function() {
              recordAction('hover', e.target);
            }, 300);
          }
        }, true);
        
        // Update overlay to show recording state
        window.__startActionRecording = function() {
          window.__actionRecorderActive = true;
          const overlay = document.getElementById('automflows-action-recorder-overlay');
          if (overlay) {
            overlay.style.backgroundColor = '#EF4444';
            overlay.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="6" y="6" width="12" height="12" rx="2" fill="white"/></svg>';
          }
        };
        
        window.__stopActionRecording = function() {
          window.__actionRecorderActive = false;
          const overlay = document.getElementById('automflows-action-recorder-overlay');
          if (overlay) {
            overlay.style.backgroundColor = '#3B82F6';
            overlay.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" stroke="white" stroke-width="2" fill="none"/><circle cx="12" cy="12" r="3" fill="white"/></svg>';
          }
        };
      })();
    `;
    
    await page.evaluate(webhookScript);
    
    // Update overlay to show recording started
    await page.evaluate(() => {
      if (window.__startActionRecording) {
        window.__startActionRecording();
      }
    });
  }

  /**
   * Stop webhook listening
   */
  static async stopWebhookListening(page: Page): Promise<void> {
    await page.evaluate(() => {
      window.__actionRecorderActive = false;
      window.__webhookListenersActive = false;
      if (window.__stopActionRecording) {
        window.__stopActionRecording();
      }
    });
  }

  /**
   * Inject finder library (similar to FinderInjector)
   */
  private static async injectFinderLibrary(page: Page): Promise<void> {
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
}
