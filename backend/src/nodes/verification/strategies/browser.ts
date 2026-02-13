import { VerifyNodeData } from '@automflows/shared';
import { ContextManager } from '../../../engine/context';
import { BaseVerificationStrategy, VerificationResult } from './base';
import { LocatorHelper } from '../../../utils/locatorHelper';

/**
 * Browser URL Verification Strategy
 */
export class BrowserUrlStrategy extends BaseVerificationStrategy {
  async execute(context: ContextManager, config: VerifyNodeData): Promise<VerificationResult> {
    const page = context.getPage();
    if (!page) {
      throw new Error('No page available. Ensure Open Browser node is executed first.');
    }

    const urlPattern = this.resolveValue(config.urlPattern, context, config, 'urlPattern');
    const matchType = config.matchType || 'contains';

    if (!urlPattern) {
      throw new Error('URL pattern is required for URL verification');
    }

    const currentUrl = page.url();

    const passed = this.matchValue(currentUrl, urlPattern, matchType, false);

    return {
      passed,
      message: passed
        ? `URL verification passed: Current URL "${currentUrl}" matches pattern "${urlPattern}"`
        : `URL verification failed: Current URL "${currentUrl}" does not match pattern "${urlPattern}" (match type: ${matchType})`,
      actualValue: currentUrl,
      expectedValue: urlPattern,
    };
  }

  validateConfig(config: VerifyNodeData): { valid: boolean; error?: string } {
    if (!config.urlPattern) {
      return { valid: false, error: 'URL pattern is required' };
    }
    return { valid: true };
  }

  getRequiredFields(): string[] {
    return ['urlPattern'];
  }
}

/**
 * Browser Text Verification Strategy
 */
export class BrowserTextStrategy extends BaseVerificationStrategy {
  async execute(context: ContextManager, config: VerifyNodeData): Promise<VerificationResult> {
    const page = context.getPage();
    if (!page) {
      throw new Error('No page available. Ensure Open Browser node is executed first.');
    }

    const expectedText = this.resolveValue(config.expectedText, context, config, 'expectedText');
    const matchType = config.matchType || 'contains';
    const caseSensitive = config.caseSensitive || false;
    const timeout = config.timeout || 30000;
    const selector = config.selector;
    const selectorType = config.selectorType || 'css';

    if (!expectedText) {
      throw new Error('Expected text is required for text verification');
    }

    let actualText: string;
    if (selector) {
      // Get text from specific element
      const locator = LocatorHelper.createLocator(page, selector, selectorType);
      actualText = (await locator.first().textContent({ timeout })) || '';
    } else {
      // Get text from entire page body
      actualText = (await page.textContent('body', { timeout })) || '';
    }

    const passed = this.matchValue(actualText, expectedText, matchType, caseSensitive);

    // Build detailed message showing original config value and resolved value if different
    const originalValue = config.expectedText;
    const resolvedValue = expectedText;
    const valueInfo = originalValue !== resolvedValue 
      ? ` (resolved from "${originalValue}")`
      : '';

    return {
      passed,
      message: passed
        ? `Text verification passed: Found expected text "${resolvedValue}"${valueInfo}`
        : `Text verification failed: Expected text "${resolvedValue}"${valueInfo} not found. Actual text: "${actualText.substring(0, 200)}${actualText.length > 200 ? '...' : ''}"`,
      actualValue: actualText,
      expectedValue: resolvedValue,
      details: {
        originalExpectedValue: originalValue,
        resolvedExpectedValue: resolvedValue,
        matchType,
        caseSensitive,
      },
    };
  }

  validateConfig(config: VerifyNodeData): { valid: boolean; error?: string } {
    if (!config.expectedText) {
      return { valid: false, error: 'Expected text is required' };
    }
    return { valid: true };
  }

  getRequiredFields(): string[] {
    return ['expectedText'];
  }
}

/**
 * Browser Element Verification Strategy
 */
export class BrowserElementStrategy extends BaseVerificationStrategy {
  async execute(context: ContextManager, config: VerifyNodeData): Promise<VerificationResult> {
    const page = context.getPage();
    if (!page) {
      throw new Error('No page available. Ensure Open Browser node is executed first.');
    }

    const selector = config.selector;
    const selectorType = config.selectorType || 'css';
    const elementCheck = config.elementCheck || 'visible';
    const timeout = config.timeout || 30000;

    if (!selector) {
      throw new Error('Selector is required for element verification');
    }

    const locator = LocatorHelper.createLocator(page, selector, selectorType);

    let passed: boolean;
    let actualValue: any;
    let message: string;

    switch (elementCheck) {
      case 'visible':
        const isVisible = await locator.first().isVisible({ timeout }).catch(() => false);
        passed = isVisible;
        actualValue = isVisible;
        message = passed
          ? `Element verification passed: Element "${selector}" is visible`
          : `Element verification failed: Element "${selector}" is not visible`;
        break;

      case 'hidden':
        const isHidden = await locator.first().isHidden({ timeout }).catch(() => false);
        passed = isHidden;
        actualValue = !isHidden;
        message = passed
          ? `Element verification passed: Element "${selector}" is hidden`
          : `Element verification failed: Element "${selector}" is not hidden`;
        break;

      case 'exists':
        const count = await locator.count();
        passed = count > 0;
        actualValue = count;
        message = passed
          ? `Element verification passed: Element "${selector}" exists (count: ${count})`
          : `Element verification failed: Element "${selector}" does not exist`;
        break;

      case 'notExists':
        const notExistsCount = await locator.count();
        passed = notExistsCount === 0;
        actualValue = notExistsCount;
        message = passed
          ? `Element verification passed: Element "${selector}" does not exist`
          : `Element verification failed: Element "${selector}" exists (count: ${notExistsCount})`;
        break;

      case 'count':
        const elementCount = await locator.count();
        const expectedCount = this.resolveValue(config.expectedValue, context, config, 'expectedValue');
        const operator = config.comparisonOperator || 'equals';
        
        if (typeof expectedCount !== 'number') {
          throw new Error(`Expected count must be a number, got: ${typeof expectedCount}`);
        }

        passed = this.compareValues(elementCount, expectedCount, operator);
        actualValue = elementCount;
        message = passed
          ? `Element count verification passed: Found ${elementCount} elements (expected: ${operator} ${expectedCount})`
          : `Element count verification failed: Found ${elementCount} elements (expected: ${operator} ${expectedCount})`;
        break;

      case 'enabled':
        const isEnabled = await locator.first().isEnabled({ timeout }).catch(() => false);
        passed = isEnabled;
        actualValue = isEnabled;
        message = passed
          ? `Element verification passed: Element "${selector}" is enabled`
          : `Element verification failed: Element "${selector}" is not enabled`;
        break;

      case 'disabled':
        const isDisabled = !(await locator.first().isEnabled({ timeout }).catch(() => true));
        passed = isDisabled;
        actualValue = !isDisabled;
        message = passed
          ? `Element verification passed: Element "${selector}" is disabled`
          : `Element verification failed: Element "${selector}" is not disabled`;
        break;

      case 'selected':
        const isSelected = await locator.first().isChecked({ timeout }).catch(() => false);
        passed = isSelected;
        actualValue = isSelected;
        message = passed
          ? `Element verification passed: Element "${selector}" is selected`
          : `Element verification failed: Element "${selector}" is not selected`;
        break;

      case 'checked':
        const isChecked = await locator.first().isChecked({ timeout }).catch(() => false);
        passed = isChecked;
        actualValue = isChecked;
        message = passed
          ? `Element verification passed: Element "${selector}" is checked`
          : `Element verification failed: Element "${selector}" is not checked`;
        break;

      default:
        throw new Error(`Unknown element check type: ${elementCheck}`);
    }

    return {
      passed,
      message,
      actualValue,
      expectedValue: elementCheck === 'count' ? config.expectedValue : undefined,
    };
  }

  validateConfig(config: VerifyNodeData): { valid: boolean; error?: string } {
    if (!config.selector) {
      return { valid: false, error: 'Selector is required' };
    }
    if (config.elementCheck === 'count' && config.expectedValue === undefined) {
      return { valid: false, error: 'Expected value is required for count verification' };
    }
    return { valid: true };
  }

  getRequiredFields(): string[] {
    return ['selector'];
  }
}

/**
 * Browser Attribute Verification Strategy
 */
export class BrowserAttributeStrategy extends BaseVerificationStrategy {
  async execute(context: ContextManager, config: VerifyNodeData): Promise<VerificationResult> {
    const page = context.getPage();
    if (!page) {
      throw new Error('No page available. Ensure Open Browser node is executed first.');
    }

    const selector = config.selector;
    const selectorType = config.selectorType || 'css';
    const attributeName = config.attributeName;
    const expectedValue = this.resolveValue(config.expectedValue, context, config, 'expectedValue');
    const matchType = config.matchType || 'equals';
    const timeout = config.timeout || 30000;

    if (!selector) {
      throw new Error('Selector is required for attribute verification');
    }
    if (!attributeName) {
      throw new Error('Attribute name is required for attribute verification');
    }

    const locator = LocatorHelper.createLocator(page, selector, selectorType).first();

    const actualValue = await locator.getAttribute(attributeName, { timeout });

    if (actualValue === null) {
      return {
        passed: false,
        message: `Attribute verification failed: Attribute "${attributeName}" does not exist on element "${selector}"`,
        actualValue: null,
        expectedValue,
      };
    }

    const passed = expectedValue === undefined 
      ? actualValue !== null // Just check existence
      : this.matchValue(actualValue, expectedValue, matchType, false);

    return {
      passed,
      message: passed
        ? `Attribute verification passed: Attribute "${attributeName}" has value "${actualValue}"`
        : `Attribute verification failed: Attribute "${attributeName}" has value "${actualValue}" but expected "${expectedValue}" (match type: ${matchType})`,
      actualValue,
      expectedValue,
    };
  }

  validateConfig(config: VerifyNodeData): { valid: boolean; error?: string } {
    if (!config.selector) {
      return { valid: false, error: 'Selector is required' };
    }
    if (!config.attributeName) {
      return { valid: false, error: 'Attribute name is required' };
    }
    return { valid: true };
  }

  getRequiredFields(): string[] {
    return ['selector', 'attributeName'];
  }
}

/**
 * Browser Form Field Verification Strategy
 */
export class BrowserFormFieldStrategy extends BaseVerificationStrategy {
  async execute(context: ContextManager, config: VerifyNodeData): Promise<VerificationResult> {
    const page = context.getPage();
    if (!page) {
      throw new Error('No page available. Ensure Open Browser node is executed first.');
    }

    const selector = config.selector;
    const selectorType = config.selectorType || 'css';
    const expectedValue = this.resolveValue(config.expectedValue, context, config, 'expectedValue');
    const matchType = config.matchType || 'equals';
    const timeout = config.timeout || 30000;

    if (!selector) {
      throw new Error('Selector is required for form field verification');
    }
    if (expectedValue === undefined) {
      throw new Error('Expected value is required for form field verification');
    }

    const locator = LocatorHelper.createLocator(page, selector, selectorType).first();

    const actualValue = await locator.inputValue({ timeout });

    const passed = this.matchValue(actualValue, expectedValue, matchType, false);

    return {
      passed,
      message: passed
        ? `Form field verification passed: Field "${selector}" has value "${actualValue}"`
        : `Form field verification failed: Field "${selector}" has value "${actualValue}" but expected "${expectedValue}" (match type: ${matchType})`,
      actualValue,
      expectedValue,
    };
  }

  validateConfig(config: VerifyNodeData): { valid: boolean; error?: string } {
    if (!config.selector) {
      return { valid: false, error: 'Selector is required' };
    }
    if (config.expectedValue === undefined) {
      return { valid: false, error: 'Expected value is required' };
    }
    return { valid: true };
  }

  getRequiredFields(): string[] {
    return ['selector', 'expectedValue'];
  }
}

/**
 * Browser Cookie Verification Strategy
 */
export class BrowserCookieStrategy extends BaseVerificationStrategy {
  async execute(context: ContextManager, config: VerifyNodeData): Promise<VerificationResult> {
    const page = context.getPage();
    if (!page) {
      throw new Error('No page available. Ensure Open Browser node is executed first.');
    }

    const cookieName = config.cookieName;
    const expectedValue = this.resolveValue(config.expectedValue, context, config, 'expectedValue');
    const matchType = config.matchType || 'equals';

    if (!cookieName) {
      throw new Error('Cookie name is required for cookie verification');
    }

    const cookies = await page.context().cookies();
    const cookie = cookies.find((c: { name: string; value: string }) => c.name === cookieName);

    if (!cookie) {
      return {
        passed: false,
        message: `Cookie verification failed: Cookie "${cookieName}" not found`,
        actualValue: null,
        expectedValue,
      };
    }

    const actualValue = cookie.value;

    const passed = expectedValue === undefined 
      ? cookie !== undefined // Just check existence
      : this.matchValue(actualValue, expectedValue, matchType, false);

    return {
      passed,
      message: passed
        ? `Cookie verification passed: Cookie "${cookieName}" has value "${actualValue}"`
        : `Cookie verification failed: Cookie "${cookieName}" has value "${actualValue}" but expected "${expectedValue}" (match type: ${matchType})`,
      actualValue,
      expectedValue,
    };
  }

  validateConfig(config: VerifyNodeData): { valid: boolean; error?: string } {
    if (!config.cookieName) {
      return { valid: false, error: 'Cookie name is required' };
    }
    return { valid: true };
  }

  getRequiredFields(): string[] {
    return ['cookieName'];
  }
}

/**
 * Browser Storage Verification Strategy
 */
export class BrowserStorageStrategy extends BaseVerificationStrategy {
  async execute(context: ContextManager, config: VerifyNodeData): Promise<VerificationResult> {
    const page = context.getPage();
    if (!page) {
      throw new Error('No page available. Ensure Open Browser node is executed first.');
    }

    const storageType = config.storageType || 'local';
    const storageKey = config.storageKey;
    const expectedValue = this.resolveValue(config.expectedValue, context, config, 'expectedValue');
    const matchType = config.matchType || 'equals';

    if (!storageKey) {
      throw new Error('Storage key is required for storage verification');
    }

    const actualValue = await page.evaluate(({ type, key }: { type: string; key: string }) => {
      if (type === 'local') {
        return localStorage.getItem(key);
      } else {
        return sessionStorage.getItem(key);
      }
    }, { type: storageType, key: storageKey });

    if (actualValue === null) {
      return {
        passed: false,
        message: `Storage verification failed: ${storageType}Storage key "${storageKey}" not found`,
        actualValue: null,
        expectedValue,
      };
    }

    const passed = expectedValue === undefined 
      ? actualValue !== null // Just check existence
      : this.matchValue(actualValue, expectedValue, matchType, false);

    return {
      passed,
      message: passed
        ? `${storageType}Storage verification passed: Key "${storageKey}" has value "${actualValue}"`
        : `${storageType}Storage verification failed: Key "${storageKey}" has value "${actualValue}" but expected "${expectedValue}" (match type: ${matchType})`,
      actualValue,
      expectedValue,
    };
  }

  validateConfig(config: VerifyNodeData): { valid: boolean; error?: string } {
    if (!config.storageKey) {
      return { valid: false, error: 'Storage key is required' };
    }
    return { valid: true };
  }

  getRequiredFields(): string[] {
    return ['storageKey'];
  }
}

/**
 * Browser CSS Verification Strategy
 */
export class BrowserCssStrategy extends BaseVerificationStrategy {
  async execute(context: ContextManager, config: VerifyNodeData): Promise<VerificationResult> {
    const page = context.getPage();
    if (!page) {
      throw new Error('No page available. Ensure Open Browser node is executed first.');
    }

    const selector = config.selector;
    const selectorType = config.selectorType || 'css';
    const cssProperty = config.cssProperty;
    const expectedValue = this.resolveValue(config.expectedValue, context, config, 'expectedValue');
    const matchType = config.matchType || 'equals';

    if (!selector) {
      throw new Error('Selector is required for CSS verification');
    }
    if (!cssProperty) {
      throw new Error('CSS property is required for CSS verification');
    }

    const locator = LocatorHelper.createLocator(page, selector, selectorType).first();

    const actualValue = await locator.evaluate((el: HTMLElement, prop: string) => {
      return window.getComputedStyle(el).getPropertyValue(prop);
    }, cssProperty);

    const passed = expectedValue === undefined 
      ? actualValue !== null && actualValue !== ''
      : this.matchValue(actualValue.trim(), expectedValue, matchType, false);

    return {
      passed,
      message: passed
        ? `CSS verification passed: Property "${cssProperty}" has value "${actualValue}"`
        : `CSS verification failed: Property "${cssProperty}" has value "${actualValue}" but expected "${expectedValue}" (match type: ${matchType})`,
      actualValue: actualValue.trim(),
      expectedValue,
    };
  }

  validateConfig(config: VerifyNodeData): { valid: boolean; error?: string } {
    if (!config.selector) {
      return { valid: false, error: 'Selector is required' };
    }
    if (!config.cssProperty) {
      return { valid: false, error: 'CSS property is required' };
    }
    return { valid: true };
  }

  getRequiredFields(): string[] {
    return ['selector', 'cssProperty'];
  }
}
