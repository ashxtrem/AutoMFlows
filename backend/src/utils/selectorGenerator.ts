/**
 * Utility for generating multiple selector options (CSS and XPath)
 */

export interface SelectorOption {
  selector: string;
  type: 'css' | 'xpath';
  quality: 'high' | 'medium' | 'low';
  reason: string;
}

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
}
