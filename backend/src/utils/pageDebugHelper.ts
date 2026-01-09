/**
 * PageDebugHelper utility for capturing debug information when UI nodes fail
 * Provides page source, URL, and smart selector suggestions
 */

export interface SelectorSuggestion {
  selector: string;
  selectorType: 'css' | 'xpath';
  reason: string; // e.g., "Similar ID found", "Class match", etc.
  elementInfo?: string; // e.g., "button#submit-btn.login-button"
}

export interface PageDebugInfo {
  pageUrl?: string;
  pageSource?: string;
  similarSelectors?: SelectorSuggestion[];
}

export class PageDebugHelper {
  /**
   * Calculate Levenshtein distance between two strings
   */
  private static levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];
    const len1 = str1.length;
    const len2 = str2.length;

    if (len1 === 0) return len2;
    if (len2 === 0) return len1;

    for (let i = 0; i <= len2; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= len1; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= len2; i++) {
      for (let j = 1; j <= len1; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[len2][len1];
  }

  /**
   * Calculate similarity score between two strings (0-1, higher is more similar)
   */
  private static similarity(str1: string, str2: string): number {
    const maxLen = Math.max(str1.length, str2.length);
    if (maxLen === 0) return 1;
    const distance = PageDebugHelper.levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
    return 1 - distance / maxLen;
  }

  /**
   * Extract selector parts from CSS selector
   */
  private static parseCSSSelector(selector: string): {
    id?: string;
    classes?: string[];
    tag?: string;
    attributes?: Array<{ name: string; value?: string }>;
  } {
    const result: {
      id?: string;
      classes?: string[];
      tag?: string;
      attributes?: Array<{ name: string; value?: string }>;
    } = {};

    // Extract ID (#id)
    const idMatch = selector.match(/#([a-zA-Z0-9_-]+)/);
    if (idMatch) {
      result.id = idMatch[1];
    }

    // Extract classes (.class)
    const classMatches = selector.match(/\.([a-zA-Z0-9_-]+)/g);
    if (classMatches) {
      result.classes = classMatches.map(m => m.substring(1));
    }

    // Extract tag name (first word if it's not # or .)
    const tagMatch = selector.match(/^([a-zA-Z][a-zA-Z0-9]*)/);
    if (tagMatch && !selector.startsWith('#') && !selector.startsWith('.')) {
      result.tag = tagMatch[1];
    }

    // Extract attributes [attr=value] or [attr]
    const attrMatches = selector.match(/\[([^\]]+)\]/g);
    if (attrMatches) {
      result.attributes = attrMatches.map(m => {
        const attrStr = m.slice(1, -1);
        const eqIndex = attrStr.indexOf('=');
        if (eqIndex > 0) {
          const name = attrStr.substring(0, eqIndex).trim();
          let value = attrStr.substring(eqIndex + 1).trim();
          // Remove quotes
          if ((value.startsWith('"') && value.endsWith('"')) || 
              (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
          }
          return { name, value };
        }
        return { name: attrStr.trim() };
      });
    }

    return result;
  }

  /**
   * Extract key parts from XPath selector
   */
  private static parseXPathSelector(xpath: string): {
    id?: string;
    classes?: string[];
    tag?: string;
    attributes?: Array<{ name: string; value?: string }>;
  } {
    const result: {
      id?: string;
      classes?: string[];
      tag?: string;
      attributes?: Array<{ name: string; value?: string }>;
    } = {};

    // Extract @id='value'
    const idMatch = xpath.match(/@id=['"]([^'"]+)['"]/);
    if (idMatch) {
      result.id = idMatch[1];
    }

    // Extract @class='value'
    const classMatch = xpath.match(/@class=['"]([^'"]+)['"]/);
    if (classMatch) {
      result.classes = classMatch[1].split(/\s+/).filter(c => c);
    }

    // Extract tag name (e.g., //button, //div)
    const tagMatch = xpath.match(/\/(\/?)([a-zA-Z][a-zA-Z0-9]*)/);
    if (tagMatch) {
      result.tag = tagMatch[2];
    }

    // Extract other attributes
    const attrMatches = xpath.match(/@([a-zA-Z-]+)=['"]([^'"]+)['"]/g);
    if (attrMatches) {
      result.attributes = attrMatches.map(m => {
        const match = m.match(/@([a-zA-Z-]+)=['"]([^'"]+)['"]/);
        if (match) {
          return { name: match[1], value: match[2] };
        }
        return { name: m };
      });
    }

    return result;
  }

  /**
   * Find similar selectors on the page
   */
  static async findSimilarSelectors(
    page: any,
    failedSelector: string,
    selectorType: 'css' | 'xpath'
  ): Promise<SelectorSuggestion[]> {
    const suggestions: SelectorSuggestion[] = [];
    const maxSuggestions = 10;

    try {
      // Parse the failed selector
      const parsed = selectorType === 'css' 
        ? this.parseCSSSelector(failedSelector)
        : this.parseXPathSelector(failedSelector);

      // Get all elements and their attributes from the page
      const pageData = await page.evaluate(() => {
        const elements: Array<{
          tag: string;
          id?: string;
          classes?: string[];
          attributes: Array<{ name: string; value: string }>;
          text?: string;
        }> = [];

        const allElements = document.querySelectorAll('*');
        allElements.forEach((el: Element) => {
          const tag = el.tagName.toLowerCase();
          const id = el.id || undefined;
          const classList = el.classList ? Array.from(el.classList) as string[] : [];
          const attributes: Array<{ name: string; value: string }> = [];
          
          Array.from(el.attributes).forEach((attr: Attr) => {
            if (attr.name !== 'id' && attr.name !== 'class') {
              attributes.push({ name: attr.name, value: attr.value });
            }
          });

          elements.push({
            tag,
            id,
            classes: classList.length > 0 ? classList : undefined,
            attributes,
            text: el.textContent?.trim().substring(0, 50),
          });
        });

        return elements;
      });

      // Find similar IDs
      if (parsed.id) {
        const parsedId = parsed.id;
        const similarIds = pageData
          .filter((el: { id?: string }) => el.id && el.id !== parsedId)
          .map((el: { id?: string }) => ({
            id: el.id!,
            similarity: PageDebugHelper.similarity(parsedId, el.id!),
            element: el,
          }))
          .filter((item: { similarity: number }) => item.similarity > 0.3) // At least 30% similar
          .sort((a: { similarity: number }, b: { similarity: number }) => b.similarity - a.similarity)
          .slice(0, 3);

        similarIds.forEach((item: { id: string; similarity: number; element: any }) => {
          const selector = `#${item.id}`;
          const elementInfo = this.buildElementInfo(item.element);
          suggestions.push({
            selector,
            selectorType: 'css',
            reason: `Similar ID found (${Math.round(item.similarity * 100)}% match)`,
            elementInfo,
          });
        });
      }

      // Find similar classes
      if (parsed.classes && parsed.classes.length > 0) {
        const classSet = new Set<string>();
        pageData.forEach((el: { classes?: string[] }) => {
          if (el.classes) {
            el.classes.forEach((cls: string) => classSet.add(cls));
          }
        });

        parsed.classes.forEach(targetClass => {
          const similarClasses = Array.from(classSet)
            .map(cls => ({
              class: cls,
              similarity: PageDebugHelper.similarity(targetClass, cls),
            }))
            .filter(item => item.similarity > 0.3 && item.class !== targetClass)
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, 2);

          similarClasses.forEach(item => {
            const selector = `.${item.class}`;
            suggestions.push({
              selector,
              selectorType: 'css',
              reason: `Similar class found (${Math.round(item.similarity * 100)}% match to "${targetClass}")`,
            });
          });
        });
      }

      // Find elements with similar attributes
      if (parsed.attributes && parsed.attributes.length > 0) {
        parsed.attributes.forEach((targetAttr: { name: string; value?: string }) => {
          const matchingElements = pageData
            .filter((el: { tag: string; id?: string; classes?: string[]; attributes: Array<{ name: string; value: string }>; text?: string }) => {
              return el.attributes.some((attr: { name: string; value: string }) => {
                if (targetAttr.value) {
                  return attr.name === targetAttr.name && 
                         PageDebugHelper.similarity(attr.value, targetAttr.value) > 0.5;
                }
                return attr.name === targetAttr.name;
              });
            })
            .slice(0, 3);

          matchingElements.forEach((el: { tag: string; id?: string; classes?: string[]; attributes: Array<{ name: string; value: string }>; text?: string }) => {
            const attr = el.attributes.find((a: { name: string; value: string }) => a.name === targetAttr.name);
            if (attr) {
              const selector = `[${attr.name}="${attr.value}"]`;
              const elementInfo = this.buildElementInfo(el);
              suggestions.push({
                selector,
                selectorType: 'css',
                reason: `Similar ${targetAttr.name} attribute found`,
                elementInfo,
              });
            }
          });
        });
      }

      // Find elements with same tag
      if (parsed.tag) {
        const tagElements = pageData
          .filter((el: { tag: string }) => el.tag === parsed.tag)
          .slice(0, 2);

        tagElements.forEach((el: { tag: string; id?: string; classes?: string[]; attributes: Array<{ name: string; value: string }>; text?: string }) => {
          let selector = el.tag;
          if (el.id) {
            selector = `#${el.id}`;
          } else if (el.classes && el.classes.length > 0) {
            selector = `.${el.classes[0]}`;
          }
          const elementInfo = this.buildElementInfo(el);
          suggestions.push({
            selector,
            selectorType: 'css',
            reason: `Same tag "${parsed.tag}" found`,
            elementInfo,
          });
        });
      }

      // Generate XPath alternatives for CSS selectors
      if (selectorType === 'css' && suggestions.length < maxSuggestions) {
        const topSuggestions = suggestions.slice(0, 3);
        topSuggestions.forEach(suggestion => {
          if (suggestion.selectorType === 'css') {
            const parsed = this.parseCSSSelector(suggestion.selector);
            let xpath = '//';
            if (parsed.tag) {
              xpath += parsed.tag;
            } else {
              xpath += '*';
            }
            if (parsed.id) {
              xpath += `[@id='${parsed.id}']`;
            }
            if (parsed.classes && parsed.classes.length > 0) {
              xpath += `[contains(@class, '${parsed.classes[0]}')]`;
            }
            suggestions.push({
              selector: xpath,
              selectorType: 'xpath',
              reason: `XPath alternative for "${suggestion.selector}"`,
            });
          }
        });
      }

      // Remove duplicates and limit results
      const uniqueSuggestions = Array.from(
        new Map(suggestions.map(s => [s.selector, s])).values()
      ).slice(0, maxSuggestions);

      return uniqueSuggestions;
    } catch (error: any) {
      console.warn(`Failed to find similar selectors: ${error.message}`);
      return [];
    }
  }

  /**
   * Build element info string
   */
  private static buildElementInfo(element: {
    tag: string;
    id?: string;
    classes?: string[];
    text?: string;
  }): string {
    const parts: string[] = [element.tag];
    if (element.id) {
      parts.push(`#${element.id}`);
    }
    if (element.classes && element.classes.length > 0) {
      parts.push(`.${element.classes.join('.')}`);
    }
    return parts.join('');
  }

  /**
   * Capture debug information for a failed UI node
   */
  static async captureDebugInfo(
    page: any,
    failedSelector?: string,
    selectorType: 'css' | 'xpath' = 'css'
  ): Promise<PageDebugInfo> {
    const debugInfo: PageDebugInfo = {};

    try {
      // Get page URL
      debugInfo.pageUrl = page.url();

      // Get page source (limit to 1MB to avoid memory issues)
      try {
        const content = await page.content();
        const maxSize = 1024 * 1024; // 1MB
        if (content.length > maxSize) {
          debugInfo.pageSource = content.substring(0, maxSize) + '\n\n... (truncated, page source exceeds 1MB)';
        } else {
          debugInfo.pageSource = content;
        }
      } catch (error: any) {
        console.warn(`Failed to capture page source: ${error.message}`);
      }

      // Find similar selectors if a selector failed
      if (failedSelector) {
        debugInfo.similarSelectors = await this.findSimilarSelectors(
          page,
          failedSelector,
          selectorType
        );
      }
    } catch (error: any) {
      console.warn(`Failed to capture debug info: ${error.message}`);
    }

    return debugInfo;
  }
}

