/**
 * TextSelectorResolver - auto-detects the best Playwright locator strategy
 * for plain text input. Tries strategies in priority order and validates
 * that exactly one element matches (unless modifiers like nth are provided).
 */

import { Page, Locator } from 'playwright';
import { SelectorModifiers } from '@automflows/shared';

interface ResolvedLocator {
  locator: Locator;
  strategy: string;
  count: number;
}

export class TextSelectorResolver {
  /**
   * Resolve plain text to a Playwright locator by trying multiple strategies.
   * Throws if no match found or if multiple matches found without disambiguation modifiers.
   */
  static async resolve(
    page: Page,
    text: string,
    modifiers?: SelectorModifiers
  ): Promise<Locator> {
    if (!text || text.trim() === '') {
      throw new Error('Selector text cannot be empty');
    }

    const trimmedText = text.trim();
    const hasDisambiguation = modifiers && (
      modifiers.nth !== undefined ||
      modifiers.filterText !== undefined ||
      modifiers.filterSelector !== undefined
    );

    const strategies = await this.tryStrategies(page, trimmedText);

    if (strategies.length === 0) {
      throw new Error(
        `No element found matching text "${trimmedText}". ` +
        `Tried: getByRole (with name), getByLabel, getByPlaceholder, getByText. ` +
        `Verify the text is visible on the page, or use a different selector type (CSS, XPath, etc.).`
      );
    }

    // Pick the first strategy that found matches (priority order)
    const best = strategies[0];

    if (best.count > 1 && !hasDisambiguation) {
      throw new Error(
        `Found ${best.count} elements matching text "${trimmedText}" (matched via ${best.strategy}). ` +
        `Use selector modifiers to select a specific element:\n` +
        `  - nth: 0  (first element)\n` +
        `  - nth: -1 (last element)\n` +
        `  - nth: N  (Nth element, 0-based)\n` +
        `  - filterText: "some text"  (filter by additional text content)\n` +
        `  - filterSelector: ".some-class"  (filter by child selector)\n` +
        `You can configure these in the Selector Modifiers section of the node settings.`
      );
    }

    return best.locator;
  }

  /**
   * Try each locator strategy in priority order.
   * Returns all strategies that found at least one match, sorted by priority.
   */
  private static async tryStrategies(
    page: Page,
    text: string
  ): Promise<ResolvedLocator[]> {
    const results: ResolvedLocator[] = [];

    // Strategy 1: getByRole with name (most robust for interactive elements)
    for (const role of ['button', 'link', 'menuitem', 'tab', 'option'] as const) {
      try {
        const locator = page.getByRole(role, { name: text });
        const count = await locator.count();
        if (count > 0) {
          results.push({
            locator,
            strategy: `getByRole('${role}', { name: '${text}' })`,
            count,
          });
          break;
        }
      } catch {
        // Role not found, try next
      }
    }
    if (results.length > 0) return results;

    // Strategy 2: getByLabel (for form fields)
    try {
      const locator = page.getByLabel(text);
      const count = await locator.count();
      if (count > 0) {
        results.push({
          locator,
          strategy: `getByLabel('${text}')`,
          count,
        });
      }
    } catch {
      // Label not found
    }
    if (results.length > 0) return results;

    // Strategy 3: getByPlaceholder (for input fields)
    try {
      const locator = page.getByPlaceholder(text);
      const count = await locator.count();
      if (count > 0) {
        results.push({
          locator,
          strategy: `getByPlaceholder('${text}')`,
          count,
        });
      }
    } catch {
      // Placeholder not found
    }
    if (results.length > 0) return results;

    // Strategy 4: getByText (general fallback)
    try {
      const locator = page.getByText(text, { exact: true });
      const count = await locator.count();
      if (count > 0) {
        results.push({
          locator,
          strategy: `getByText('${text}', { exact: true })`,
          count,
        });
      }
    } catch {
      // Text not found with exact match
    }

    // Strategy 5: getByText with substring match as last resort
    if (results.length === 0) {
      try {
        const locator = page.getByText(text);
        const count = await locator.count();
        if (count > 0) {
          results.push({
            locator,
            strategy: `getByText('${text}')`,
            count,
          });
        }
      } catch {
        // Text not found at all
      }
    }

    return results;
  }
}
