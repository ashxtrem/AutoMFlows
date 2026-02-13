import { Page, BrowserContext } from 'playwright';
import { Server } from 'socket.io';
import { SelectorOption } from '@automflows/shared';
import { SelectorSessionManager } from '../selectorSessionManager';
// Selector generation logic is inline in page.evaluate() below

/**
 * Expose functions for selector generation
 */
export async function exposeFinderFunctions(
  page: Page,
  io?: Server,
  context?: BrowserContext
): Promise<void> {
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
    
    // Generate selectors using the extracted logic
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
      const xpathSelectors: Array<{ selector: string; quality: string; reason: string }> = [];
      
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
      const result: any[] = [];
      
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
      const playwrightSelectors: any[] = [];
      
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
  await (context || page).exposeFunction('sendSelectorsToBackend', async (
    selectors: SelectorOption[],
    targetNodeId?: string,
    targetFieldName?: string
  ) => {
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
    // Silently fail
  }
}
