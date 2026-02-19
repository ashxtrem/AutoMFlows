/**
 * LocatorHelper utility for creating Playwright locators from selector strings
 * Supports CSS, XPath, and Playwright locator methods (getByRole, getByText, etc.)
 * 
 * Note: Selector strings should already be interpolated (variables resolved)
 * before calling this utility. Variable interpolation happens in handlers.
 */

import { Page, Locator } from 'playwright';
import { SelectorType, SelectorModifiers } from '@automflows/shared';

export class LocatorHelper {
  /**
   * Create a Playwright locator from a selector string and selector type
   * @param page - Playwright page object
   * @param selector - Selector string (already interpolated)
   * @param selectorType - Type of selector (css, xpath, or Playwright locator method)
   * @param modifiers - Optional selector modifiers (nth, filterText, filterSelector, chainSelector, pierceShadow)
   * @returns Playwright Locator
   */
  static createLocator(
    page: Page,
    selector: string,
    selectorType: SelectorType | string = 'css',
    modifiers?: SelectorModifiers
  ): Locator {
    if (!selector || selector.trim() === '') {
      throw new Error('Selector cannot be empty');
    }

    // pierceShadow: false = restrict to light DOM (css:light=); true/undefined = default (CSS pierces shadow)
    if (modifiers?.pierceShadow === false && selectorType !== 'css') {
      console.warn('[LocatorHelper] pierceShadow only applies to CSS selectors; XPath never pierces shadow DOM');
    }

    let locator: Locator;
    switch (selectorType) {
      case 'css': {
        const cssSelector = modifiers?.pierceShadow === false ? `css:light=${selector}` : selector;
        locator = page.locator(cssSelector);
        break;
      }

      case 'xpath':
        locator = page.locator(`xpath=${selector}`);
        break;

      case 'getByRole': {
        const parts = selector.split(',');
        let role: string | undefined;
        let name: string | undefined;
        const options: any = {};

        parts.forEach(part => {
          const trimmedPart = part.trim();
          const colonIndex = trimmedPart.indexOf(':');
          if (colonIndex === -1) {
            throw new Error(`Invalid getByRole format. Expected "role:value" or "role:value,name:value", got: ${trimmedPart}`);
          }
          const key = trimmedPart.substring(0, colonIndex).trim();
          const value = trimmedPart.substring(colonIndex + 1).trim();

          if (key === 'role') {
            role = value;
          } else if (key === 'name') {
            name = value;
          } else {
            // Support other Playwright role options like exact, hidden, etc.
            // Try to parse as boolean or number
            if (value === 'true') {
              options[key] = true;
            } else if (value === 'false') {
              options[key] = false;
            } else if (!isNaN(Number(value))) {
              options[key] = Number(value);
            } else {
              options[key] = value;
            }
          }
        });

        if (!role) {
          throw new Error('Role is required for getByRole. Format: "role:button,name:Submit"');
        }

        locator = page.getByRole(role as any, name ? { name, ...options } : options);
        break;
      }

      case 'getByText': {
        // Support regex format: "text:/pattern/" or exact: "text:exact text"
        const match = selector.match(/^text:(.+)$/);
        if (!match) {
          throw new Error('Invalid getByText format. Expected "text:value" or "text:/regex/"');
        }
        const textValue = match[1].trim();
        if (textValue.startsWith('/') && textValue.endsWith('/')) {
          // Regex format
          const pattern = textValue.slice(1, -1);
          try {
            locator = page.getByText(new RegExp(pattern));
          } catch (error: any) {
            throw new Error(`Invalid regex pattern in getByText: ${pattern}. Error: ${error.message}`);
          }
        } else {
          locator = page.getByText(textValue);
        }
        break;
      }

      case 'getByLabel': {
        const match = selector.match(/^label:(.+)$/);
        if (!match) {
          throw new Error('Invalid getByLabel format. Expected "label:value"');
        }
        const labelValue = match[1].trim();
        locator = page.getByLabel(labelValue);
        break;
      }

      case 'getByPlaceholder': {
        const match = selector.match(/^placeholder:(.+)$/);
        if (!match) {
          throw new Error('Invalid getByPlaceholder format. Expected "placeholder:value"');
        }
        const placeholderValue = match[1].trim();
        locator = page.getByPlaceholder(placeholderValue);
        break;
      }

      case 'getByTestId': {
        const match = selector.match(/^testid:(.+)$/);
        if (!match) {
          throw new Error('Invalid getByTestId format. Expected "testid:value"');
        }
        const testIdValue = match[1].trim();
        locator = page.getByTestId(testIdValue);
        break;
      }

      case 'getByTitle': {
        const match = selector.match(/^title:(.+)$/);
        if (!match) {
          throw new Error('Invalid getByTitle format. Expected "title:value"');
        }
        const titleValue = match[1].trim();
        locator = page.getByTitle(titleValue);
        break;
      }

      case 'getByAltText': {
        // Support regex format: "alt:/pattern/" or exact: "alt:exact text"
        const match = selector.match(/^alt:(.+)$/);
        if (!match) {
          throw new Error('Invalid getByAltText format. Expected "alt:value" or "alt:/regex/"');
        }
        const altValue = match[1].trim();
        if (altValue.startsWith('/') && altValue.endsWith('/')) {
          // Regex format
          const pattern = altValue.slice(1, -1);
          try {
            locator = page.getByAltText(new RegExp(pattern));
          } catch (error: any) {
            throw new Error(`Invalid regex pattern in getByAltText: ${pattern}. Error: ${error.message}`);
          }
        } else {
          locator = page.getByAltText(altValue);
        }
        break;
      }

      default:
        // Default to CSS selector for unknown types (backward compatibility)
        console.warn(`Unknown selector type "${selectorType}", defaulting to CSS selector`);
        locator = page.locator(selector);
    }

    return this.applyModifiers(page, locator, modifiers);
  }

  /**
   * Apply selector modifiers (filterText, filterSelector, chainSelector, nth) to a locator
   * Order: filter(hasText) -> filter(has) -> chain(.locator()) -> nth
   */
  private static applyModifiers(page: Page, locator: Locator, modifiers?: SelectorModifiers): Locator {
    if (!modifiers) return locator;

    if (modifiers.filterText) {
      const hasText = modifiers.filterTextRegex
        ? new RegExp(modifiers.filterText)
        : modifiers.filterText;
      locator = locator.filter({ hasText });
    }
    if (modifiers.filterSelector) {
      const child = this.createLocator(page, modifiers.filterSelector, modifiers.filterSelectorType || 'css');
      locator = locator.filter({ has: child });
    }
    if (modifiers.chainSelector) {
      const chainSelector = modifiers.chainSelectorType === 'xpath'
        ? `xpath=${modifiers.chainSelector}`
        : modifiers.chainSelector;
      locator = locator.locator(chainSelector);
    }
    if (modifiers.nth !== undefined) {
      locator = locator.nth(modifiers.nth);
    }
    return locator;
  }

  /**
   * Smoothly scroll to an element if it's not already in viewport
   * Handles errors gracefully - never throws, only logs warnings
   * @param page - Playwright page object
   * @param selector - Selector string (already interpolated)
   * @param selectorType - Type of selector (css, xpath, etc.)
   * @param timeout - Timeout in milliseconds
   * @param modifiers - Optional selector modifiers
   */
  static async scrollToElementSmooth(
    page: Page,
    selector: string,
    selectorType: SelectorType | string = 'css',
    timeout: number = 30000,
    modifiers?: SelectorModifiers
  ): Promise<void> {
    try {
      if (!selector || selector.trim() === '') {
        return; // No selector, nothing to scroll to
      }

      const locator = this.createLocator(page, selector, selectorType, modifiers);

      // Check if element is already centered in viewport (more strict check)
      // We want to scroll to center the element even if it's partially visible
      try {
        const boundingBox = await locator.boundingBox({ timeout: Math.min(timeout, 5000) }).catch(() => null);
        if (boundingBox) {
          // Element exists, check if it's already centered in viewport
          const viewportSize = page.viewportSize();
          if (viewportSize) {
            // Check if element center is near viewport center (within 20% margin)
            const elementCenterX = boundingBox.x + boundingBox.width / 2;
            const elementCenterY = boundingBox.y + boundingBox.height / 2;
            const viewportCenterX = viewportSize.width / 2;
            const viewportCenterY = viewportSize.height / 2;
            const centerMarginX = viewportSize.width * 0.2; // 20% margin
            const centerMarginY = viewportSize.height * 0.2; // 20% margin
            
            const isCentered = 
              Math.abs(elementCenterX - viewportCenterX) <= centerMarginX &&
              Math.abs(elementCenterY - viewportCenterY) <= centerMarginY;
            
            if (isCentered) {
              // Element is already centered, no need to scroll
              return;
            }
          }
        }
      } catch (error: any) {
        // If we can't check viewport, continue with scroll attempt
        // This handles cases where element might not be visible yet
      }

      // Scroll element into view if needed
      try {
        await locator.scrollIntoViewIfNeeded({ timeout });
        console.log(`[ScrollHelper] Scrolled element into view: "${selector}"`);
      } catch (error: any) {
        console.warn(`[ScrollHelper] Failed to scroll element into view with selector "${selector}": ${error.message}`);
        return; // Don't throw, just return
      }

      // Perform smooth scroll using JavaScript
      try {
        await locator.evaluate((element: Element) => {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
        console.log(`[ScrollHelper] Applied smooth scroll to element: "${selector}"`);
      } catch (error: any) {
        console.warn(`[ScrollHelper] Failed to perform smooth scroll for selector "${selector}": ${error.message}`);
        // Don't throw, scrollIntoViewIfNeeded already handled the basic scroll
      }
    } catch (error: any) {
      // Catch any unexpected errors and log them without throwing
      console.warn(`[ScrollHelper] Unexpected error while scrolling to element with selector "${selector}": ${error.message}`);
    }
  }
}
