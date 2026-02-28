import { Page } from 'playwright';
import { BaseNode, SmartExtractorNodeData } from '@automflows/shared';
import { NodeHandler } from '../base';
import { ContextManager } from '../../engine/context';
import { detectRepeatedPatterns } from '../../utils/patternDetector';

export class SmartExtractorHandler implements NodeHandler {
  async execute(node: BaseNode, context: ContextManager): Promise<void> {
    const data = node.data as SmartExtractorNodeData;
    const page = context.getPage();

    if (!page) {
      throw new Error('No page available. Ensure Open Browser node is executed first.');
    }

    const mode = data.mode || 'allLinks';
    const outputVariable = data.outputVariable || 'extractedData';
    const limit = data.limit || 0;
    const timeout = data.timeout || 30000;
    let results: any[];

    try {
      switch (mode) {
        case 'allLinks':
          results = await this.extractAllLinks(page, limit, data.includeMetadata);
          break;
        case 'allImages':
          results = await this.extractAllImages(page, limit, data.includeMetadata);
          break;
        case 'tables':
          results = await this.extractTable(page, data.tableIndex || 0, limit, timeout);
          break;
        case 'repeatedItems':
          results = await detectRepeatedPatterns(page, limit);
          break;
        default:
          throw new Error(`Unknown extraction mode: ${mode}`);
      }
    } catch (error: any) {
      if (data.failSilently) {
        results = [];
      } else {
        throw error;
      }
    }

    context.setData(outputVariable, results);
  }

  private async extractAllLinks(page: Page, limit: number, includeMetadata?: boolean): Promise<any[]> {
    return await page.evaluate(({ maxItems, withMeta }: { maxItems: number; withMeta: boolean }) => {
      const anchors = Array.from(document.querySelectorAll('a[href]'));
      const toProcess = maxItems > 0 ? anchors.slice(0, maxItems) : anchors;

      return toProcess.map(a => {
        const base: Record<string, any> = {
          text: a.textContent?.trim() || '',
          href: a.getAttribute('href') || '',
        };
        if (withMeta) {
          const rect = a.getBoundingClientRect();
          base.visible = rect.width > 0 && rect.height > 0;
          base.tagName = a.tagName;
        }
        return base;
      });
    }, { maxItems: limit, withMeta: includeMetadata || false });
  }

  private async extractAllImages(page: Page, limit: number, includeMetadata?: boolean): Promise<any[]> {
    return await page.evaluate(({ maxItems, withMeta }: { maxItems: number; withMeta: boolean }) => {
      const images = Array.from(document.querySelectorAll('img[src]'));
      const toProcess = maxItems > 0 ? images.slice(0, maxItems) : images;

      return toProcess.map(img => {
        const base: Record<string, any> = {
          src: img.getAttribute('src') || '',
          alt: img.getAttribute('alt') || '',
        };
        if (withMeta) {
          base.width = img.getAttribute('width');
          base.height = img.getAttribute('height');
          base.naturalWidth = (img as HTMLImageElement).naturalWidth;
          base.naturalHeight = (img as HTMLImageElement).naturalHeight;
        }
        return base;
      });
    }, { maxItems: limit, withMeta: includeMetadata || false });
  }

  private async extractTable(page: Page, tableIndex: number, limit: number, timeout: number): Promise<any[]> {
    await page.waitForSelector('table', { timeout }).catch(() => {
      throw new Error('No tables found on the page within timeout');
    });

    return await page.evaluate(({ idx, maxItems }: { idx: number; maxItems: number }) => {
      const tables = document.querySelectorAll('table');
      if (idx >= tables.length) {
        throw new Error(`Table index ${idx} out of range. Found ${tables.length} table(s).`);
      }
      const table = tables[idx];
      const headers: string[] = [];
      const headerCells = table.querySelectorAll('thead th, thead td, tr:first-child th');
      if (headerCells.length > 0) {
        headerCells.forEach(th => headers.push(th.textContent?.trim() || ''));
      }

      const hasThead = table.querySelector('thead') !== null;
      const headerRow = !hasThead && headerCells.length > 0
        ? table.querySelector('tr:first-child')
        : null;

      const rows: Record<string, any>[] = [];
      const bodyRows = table.querySelectorAll('tbody tr, tr');
      for (let i = 0; i < bodyRows.length; i++) {
        const row = bodyRows[i];
        if (row.closest('thead')) continue;
        if (headerRow && row === headerRow) continue;

        const cells = row.querySelectorAll('td');
        if (cells.length === 0) continue;

        const rowData: Record<string, any> = {};
        cells.forEach((cell, ci) => {
          const key = headers[ci] || `column_${ci}`;
          rowData[key] = cell.textContent?.trim() || '';
        });
        rows.push(rowData);

        if (maxItems > 0 && rows.length >= maxItems) break;
      }

      return rows;
    }, { idx: tableIndex, maxItems: limit });
  }
}
