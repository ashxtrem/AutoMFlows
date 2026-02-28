import { Page } from 'playwright';

/**
 * Detects repeated DOM structures on a page by analyzing parent elements
 * with 3+ structurally similar children.
 */
export async function detectRepeatedPatterns(page: Page, limit: number = 0): Promise<Record<string, any>[]> {
  return await page.evaluate((maxItems) => {
    function getStructuralSignature(el: Element): string {
      const childTags = Array.from(el.children).map(c => c.tagName).join(',');
      return `${el.tagName}[${childTags}]`;
    }

    function findRepeatingParents(): { parent: Element; children: Element[] }[] {
      const results: { parent: Element; children: Element[] }[] = [];
      const candidates = document.querySelectorAll('ul, ol, div, section, main, table > tbody, [role="list"]');

      for (const parent of Array.from(candidates)) {
        const directChildren = Array.from(parent.children).filter(
          c => c.tagName !== 'SCRIPT' && c.tagName !== 'STYLE' && (c as HTMLElement).offsetParent !== null
        );
        if (directChildren.length < 3) continue;

        const signatures = directChildren.map(c => getStructuralSignature(c));
        const mostCommon = signatures.sort(
          (a, b) => signatures.filter(s => s === b).length - signatures.filter(s => s === a).length
        )[0];
        const matchingChildren = directChildren.filter(
          (_c, i) => signatures[i] === mostCommon
        );

        if (matchingChildren.length >= 3) {
          results.push({ parent, children: matchingChildren });
        }
      }

      // Sort by count (largest groups first) and deduplicate nested parents
      results.sort((a, b) => b.children.length - a.children.length);
      const filtered: typeof results = [];
      for (const r of results) {
        const isNested = filtered.some(f => f.parent.contains(r.parent) || r.parent.contains(f.parent));
        if (!isNested) {
          filtered.push(r);
        }
      }
      return filtered;
    }

    function extractSchema(items: Element[]): { name: string; selector: string; type: 'text' | 'link' | 'image'; attribute?: string }[] {
      const sample = items[0];
      if (!sample) return [];

      const schema: { name: string; selector: string; type: 'text' | 'link' | 'image'; attribute?: string }[] = [];

      const links = sample.querySelectorAll('a[href]');
      if (links.length > 0) {
        schema.push({ name: 'linkText', selector: 'a', type: 'link' });
        schema.push({ name: 'linkHref', selector: 'a', type: 'link', attribute: 'href' });
      }

      const imgs = sample.querySelectorAll('img[src]');
      if (imgs.length > 0) {
        schema.push({ name: 'imageSrc', selector: 'img', type: 'image', attribute: 'src' });
        schema.push({ name: 'imageAlt', selector: 'img', type: 'image', attribute: 'alt' });
      }

      const headings = sample.querySelectorAll('h1, h2, h3, h4, h5, h6');
      if (headings.length > 0) {
        const h = headings[0];
        schema.push({ name: 'heading', selector: h.tagName.toLowerCase(), type: 'text' });
      }

      // If no structured content found, fall back to full text
      if (schema.length === 0) {
        schema.push({ name: 'text', selector: '*', type: 'text' });
      }

      return schema;
    }

    function extractData(items: Element[], schema: ReturnType<typeof extractSchema>): Record<string, any>[] {
      const toProcess = maxItems > 0 ? items.slice(0, maxItems) : items;
      return toProcess.map(item => {
        const row: Record<string, any> = {};
        for (const field of schema) {
          const el = field.selector === '*' ? item : item.querySelector(field.selector);
          if (!el) {
            row[field.name] = null;
            continue;
          }
          if (field.attribute) {
            row[field.name] = el.getAttribute(field.attribute);
          } else {
            row[field.name] = el.textContent?.trim() || '';
          }
        }
        return row;
      });
    }

    const groups = findRepeatingParents();
    if (groups.length === 0) return [];

    // Use the largest group by default
    const best = groups[0];
    const schema = extractSchema(best.children);
    return extractData(best.children, schema);
  }, limit);
}
