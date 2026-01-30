/**
 * Utility for generating multiple selector options (CSS, XPath, and Playwright locators)
 */

import { SelectorOption, SelectorType } from '@automflows/shared';

export class SelectorGenerator {
  /**
   * Generate multiple selector options for an element
   * This will be called from the browser context via exposeFunction
   */
  static generateSelectors(element: Element): SelectorOption[] {
    const selectors: SelectorOption[] = [];

    // Generate CSS selector using @medv/finder (injected in browser)
    const cssSelector = this.generateCSSSelector(element);
    if (cssSelector) {
      selectors.push({
        selector: cssSelector,
        type: 'css',
        quality: this.assessCSSQuality(element, cssSelector),
        reason: this.getCSSReason(element),
      });
    }

    // Generate XPath alternatives
    const xpathSelectors = this.generateXPathSelectors(element);
    selectors.push(...xpathSelectors);

    // Generate Playwright locator alternatives
    const playwrightSelectors = this.generatePlaywrightSelectors(element);
    selectors.push(...playwrightSelectors);

    // Sort by quality (high first)
    return selectors.sort((a, b) => {
      const qualityOrder = { high: 3, medium: 2, low: 1 };
      return qualityOrder[b.quality] - qualityOrder[a.quality];
    });
  }

  /**
   * Generate CSS selector using @medv/finder
   * Note: This assumes @medv/finder is available in the browser context
   */
  private static generateCSSSelector(element: Element): string | null {
    try {
      // @medv/finder should be available as window.finder or imported
      // We'll inject it via addInitScript
      const finder = (window as any).finder;
      if (finder && typeof finder === 'function') {
        return finder(element);
      }
      // Fallback: try to use it directly if it's available
      if ((window as any).__finder) {
        return (window as any).__finder(element);
      }
      return null;
    } catch (error) {
      console.error('Error generating CSS selector:', error);
      return null;
    }
  }

  /**
   * Generate multiple XPath selector options
   */
  private static generateXPathSelectors(element: Element): SelectorOption[] {
    const selectors: SelectorOption[] = [];

    // 1. ID-based XPath (highest quality)
    if (element.id) {
      selectors.push({
        selector: `//*[@id='${element.id}']`,
        type: 'xpath',
        quality: 'high',
        reason: 'Unique ID attribute',
      });
    }

    // 2. Tag + ID combination
    if (element.id) {
      selectors.push({
        selector: `//${element.tagName.toLowerCase()}[@id='${element.id}']`,
        type: 'xpath',
        quality: 'high',
        reason: 'Tag name with unique ID',
      });
    }

    // 3. Text-based XPath (if element has text)
    const textContent = element.textContent?.trim();
    if (textContent && textContent.length > 0 && textContent.length < 100) {
      const escapedText = textContent.replace(/'/g, "\\'");
      selectors.push({
        selector: `//${element.tagName.toLowerCase()}[text()='${escapedText}']`,
        type: 'xpath',
        quality: 'medium',
        reason: 'Text content match',
      });
    }

    // 4. Attribute-based XPath
    const attributes = Array.from(element.attributes);
    for (const attr of attributes) {
      if (attr.name === 'id' || attr.name === 'class') continue; // Already handled
      if (attr.name.startsWith('data-') || attr.name === 'name' || attr.name === 'type') {
        selectors.push({
          selector: `//${element.tagName.toLowerCase()}[@${attr.name}='${attr.value}']`,
          type: 'xpath',
          quality: attr.name.startsWith('data-') ? 'high' : 'medium',
          reason: `${attr.name} attribute`,
        });
      }
    }

    // 5. Class-based XPath (if has classes)
    if (element.classList && element.classList.length > 0) {
      const classes = Array.from(element.classList);
      if (classes.length === 1) {
        selectors.push({
          selector: `//${element.tagName.toLowerCase()}[@class='${classes[0]}']`,
          type: 'xpath',
          quality: 'medium',
          reason: 'Single class name',
        });
      } else if (classes.length > 1) {
        // Use contains for multiple classes
        selectors.push({
          selector: `//${element.tagName.toLowerCase()}[contains(@class, '${classes[0]}')]`,
          type: 'xpath',
          quality: 'medium',
          reason: 'Class combination',
        });
      }
    }

    // 6. Position-based XPath (lowest quality, fallback)
    const parent = element.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children);
      const index = siblings.indexOf(element) + 1;
      selectors.push({
        selector: `//${element.tagName.toLowerCase()}[${index}]`,
        type: 'xpath',
        quality: 'low',
        reason: `Position-based (${index}th ${element.tagName.toLowerCase()})`,
      });
    }

    return selectors;
  }

  /**
   * Assess CSS selector quality
   */
  private static assessCSSQuality(element: Element, selector: string): 'high' | 'medium' | 'low' {
    // High quality: ID-based, data attributes, stable class combinations
    if (element.id || selector.includes('[data-') || selector.match(/^#[a-zA-Z]/)) {
      return 'high';
    }

    // Medium quality: Class combinations, attribute selectors
    if (selector.includes('.') || selector.includes('[')) {
      return 'medium';
    }

    // Low quality: Position-based, complex selectors
    return 'low';
  }

  /**
   * Get reason for CSS selector
   */
  private static getCSSReason(element: Element): string {
    if (element.id) {
      return 'Unique ID attribute';
    }
    if (element.classList && element.classList.length > 0) {
      return 'Class combination';
    }
    if (Array.from(element.attributes).some(attr => attr.name.startsWith('data-'))) {
      return 'Data attribute';
    }
    return 'Element structure';
  }

  /**
   * Generate Playwright locator selector options
   */
  private static generatePlaywrightSelectors(element: Element): SelectorOption[] {
    const selectors: SelectorOption[] = [];

    // 1. getByRole - if element has a semantic role
    const role = this.getElementRole(element);
    if (role) {
      const textContent = element.textContent?.trim();
      if (textContent && textContent.length > 0 && textContent.length < 100) {
        const escapedName = textContent.replace(/:/g, '\\:').substring(0, 50);
        selectors.push({
          selector: `role:${role},name:${escapedName}`,
          type: 'getByRole',
          quality: 'high',
          reason: `Role "${role}" with accessible name`,
        });
      } else {
        selectors.push({
          selector: `role:${role}`,
          type: 'getByRole',
          quality: 'high',
          reason: `Role "${role}"`,
        });
      }
    }

    // 2. getByTestId - if element has data-testid
    const testId = element.getAttribute('data-testid');
    if (testId) {
      selectors.push({
        selector: `testid:${testId}`,
        type: 'getByTestId',
        quality: 'high',
        reason: 'Test ID attribute',
      });
    }

    // 3. getByLabel - if element is associated with a label
    const labelText = this.getAssociatedLabelText(element);
    if (labelText) {
      selectors.push({
        selector: `label:${labelText}`,
        type: 'getByLabel',
        quality: 'high',
        reason: `Associated with label "${labelText}"`,
      });
    }

    // 4. getByPlaceholder - if element has placeholder
    const placeholder = element.getAttribute('placeholder');
    if (placeholder) {
      selectors.push({
        selector: `placeholder:${placeholder}`,
        type: 'getByPlaceholder',
        quality: 'medium',
        reason: 'Placeholder attribute',
      });
    }

    // 5. getByText - if element has visible text
    const textContent = element.textContent?.trim();
    if (textContent && textContent.length > 0 && textContent.length < 100 && !role) {
      // Only suggest getByText if not already covered by getByRole
      selectors.push({
        selector: `text:${textContent.substring(0, 50)}`,
        type: 'getByText',
        quality: 'medium',
        reason: 'Text content',
      });
    }

    // 6. getByTitle - if element has title attribute
    const title = element.getAttribute('title');
    if (title) {
      selectors.push({
        selector: `title:${title}`,
        type: 'getByTitle',
        quality: 'medium',
        reason: 'Title attribute',
      });
    }

    // 7. getByAltText - if element is an image with alt text
    if (element.tagName.toLowerCase() === 'img') {
      const alt = element.getAttribute('alt');
      if (alt) {
        selectors.push({
          selector: `alt:${alt}`,
          type: 'getByAltText',
          quality: 'high',
          reason: 'Image alt text',
        });
      }
    }

    return selectors;
  }

  /**
   * Get semantic role of an element
   */
  private static getElementRole(element: Element): string | null {
    const tagName = element.tagName.toLowerCase();
    const role = element.getAttribute('role');
    
    if (role) {
      return role;
    }

    // Map common HTML elements to ARIA roles
    const roleMap: Record<string, string> = {
      'button': 'button',
      'a': element.getAttribute('href') ? 'link' : 'button',
      'input': this.getInputRole(element as HTMLInputElement),
      'select': 'combobox',
      'textarea': 'textbox',
      'img': 'img',
      'h1': 'heading',
      'h2': 'heading',
      'h3': 'heading',
      'h4': 'heading',
      'h5': 'heading',
      'h6': 'heading',
      'nav': 'navigation',
      'main': 'main',
      'article': 'article',
      'aside': 'complementary',
      'header': 'banner',
      'footer': 'contentinfo',
    };

    return roleMap[tagName] || null;
  }

  /**
   * Get role for input elements based on type
   */
  private static getInputRole(input: HTMLInputElement): string {
    const type = input.type?.toLowerCase() || 'text';
    if (type === 'button' || type === 'submit' || type === 'reset') {
      return 'button';
    }
    if (type === 'checkbox') {
      return 'checkbox';
    }
    if (type === 'radio') {
      return 'radio';
    }
    return 'textbox';
  }

  /**
   * Get associated label text for an element
   */
  private static getAssociatedLabelText(element: Element): string | null {
    // Check for explicit label association via 'for' attribute
    const id = element.id;
    if (id) {
      const label = document.querySelector(`label[for="${id}"]`);
      if (label) {
        return label.textContent?.trim() || null;
      }
    }

    // Check if element is inside a label
    let parent = element.parentElement;
    while (parent) {
      if (parent.tagName.toLowerCase() === 'label') {
        return parent.textContent?.trim() || null;
      }
      parent = parent.parentElement;
    }

    // Check for aria-label
    const ariaLabel = element.getAttribute('aria-label');
    if (ariaLabel) {
      return ariaLabel;
    }

    return null;
  }
}
