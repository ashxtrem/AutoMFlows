/**
 * LocatorHelper utility for creating Playwright locators from selector strings
 * Supports CSS, XPath, and Playwright locator methods (getByRole, getByText, etc.)
 * 
 * Note: Selector strings should already be interpolated (variables resolved)
 * before calling this utility. Variable interpolation happens in handlers.
 */

import { Page, Locator } from 'playwright';
import { SelectorType } from '@automflows/shared';

export class LocatorHelper {
  /**
   * Create a Playwright locator from a selector string and selector type
   * @param page - Playwright page object
   * @param selector - Selector string (already interpolated)
   * @param selectorType - Type of selector (css, xpath, or Playwright locator method)
   * @returns Playwright Locator
   */
  static createLocator(page: Page, selector: string, selectorType: SelectorType | string = 'css'): Locator {
    if (!selector || selector.trim() === '') {
      throw new Error('Selector cannot be empty');
    }

    switch (selectorType) {
      case 'css':
        return page.locator(selector);

      case 'xpath':
        return page.locator(`xpath=${selector}`);

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

        return page.getByRole(role as any, name ? { name, ...options } : options);
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
            return page.getByText(new RegExp(pattern));
          } catch (error: any) {
            throw new Error(`Invalid regex pattern in getByText: ${pattern}. Error: ${error.message}`);
          }
        }
        return page.getByText(textValue);
      }

      case 'getByLabel': {
        const match = selector.match(/^label:(.+)$/);
        if (!match) {
          throw new Error('Invalid getByLabel format. Expected "label:value"');
        }
        const labelValue = match[1].trim();
        return page.getByLabel(labelValue);
      }

      case 'getByPlaceholder': {
        const match = selector.match(/^placeholder:(.+)$/);
        if (!match) {
          throw new Error('Invalid getByPlaceholder format. Expected "placeholder:value"');
        }
        const placeholderValue = match[1].trim();
        return page.getByPlaceholder(placeholderValue);
      }

      case 'getByTestId': {
        const match = selector.match(/^testid:(.+)$/);
        if (!match) {
          throw new Error('Invalid getByTestId format. Expected "testid:value"');
        }
        const testIdValue = match[1].trim();
        return page.getByTestId(testIdValue);
      }

      case 'getByTitle': {
        const match = selector.match(/^title:(.+)$/);
        if (!match) {
          throw new Error('Invalid getByTitle format. Expected "title:value"');
        }
        const titleValue = match[1].trim();
        return page.getByTitle(titleValue);
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
            return page.getByAltText(new RegExp(pattern));
          } catch (error: any) {
            throw new Error(`Invalid regex pattern in getByAltText: ${pattern}. Error: ${error.message}`);
          }
        }
        return page.getByAltText(altValue);
      }

      default:
        // Default to CSS selector for unknown types (backward compatibility)
        console.warn(`Unknown selector type "${selectorType}", defaulting to CSS selector`);
        return page.locator(selector);
    }
  }
}
