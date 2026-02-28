import { BaseNode, DataExtractorNodeData, DataExtractorFieldDefinition } from '@automflows/shared';
import { NodeHandler } from '../base';
import { ContextManager } from '../../engine/context';
import { VariableInterpolator } from '../../utils/variableInterpolator';
import { LocatorHelper } from '../../utils/locatorHelper';
import fs from 'fs/promises';
import path from 'path';
import { stringify } from 'csv-stringify/sync';

function resolveFilePath(interpolatedPath: string): string {
  if (path.isAbsolute(interpolatedPath)) {
    return interpolatedPath;
  }
  const projectRoot = path.resolve(__dirname, '../../../../');
  return path.resolve(projectRoot, interpolatedPath);
}

async function ensureParentDir(filePath: string): Promise<void> {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
}

export class DataExtractorHandler implements NodeHandler {
  async execute(node: BaseNode, context: ContextManager): Promise<void> {
    const data = node.data as DataExtractorNodeData;
    const page = context.getPage();

    if (!page) {
      throw new Error('No page available. Ensure Open Browser node is executed first.');
    }

    if (!data.containerSelector) {
      throw new Error('Container selector is required for Data Extractor node');
    }

    const fields = this.parseFields(data.fields);
    if (fields.length === 0) {
      throw new Error('At least one field definition is required for Data Extractor node');
    }

    const timeout = data.timeout || 30000;
    const containerSelector = VariableInterpolator.interpolateString(data.containerSelector, context);
    const containerSelectorType = data.containerSelectorType || 'css';
    const outputVariable = data.outputVariable || 'extractedData';
    const limit = data.limit || 0;

    if (data.waitForSelector !== false) {
      const waitLocator = await LocatorHelper.createLocatorAsync(page, containerSelector, containerSelectorType);
      await waitLocator.first().waitFor({ state: 'visible', timeout });
    }

    const containerLocator = await LocatorHelper.createLocatorAsync(page, containerSelector, containerSelectorType);
    const allContainers = await containerLocator.all();
    const containersToProcess = limit > 0 ? allContainers.slice(0, limit) : allContainers;

    const results: Record<string, any>[] = [];

    for (const container of containersToProcess) {
      const row: Record<string, any> = {};

      for (const field of fields) {
        try {
          const fieldSelector = VariableInterpolator.interpolateString(field.selector, context);
          const fieldSelectorType = field.selectorType || 'css';
          const fieldLocator = container.locator(
            this.buildPlaywrightSelector(fieldSelector, fieldSelectorType)
          );

          const count = await fieldLocator.count();
          if (count === 0) {
            row[field.name] = null;
            continue;
          }

          switch (field.extract) {
            case 'text':
              row[field.name] = (await fieldLocator.first().textContent()) || '';
              break;
            case 'attribute':
              if (!field.attribute) {
                row[field.name] = null;
              } else {
                row[field.name] = await fieldLocator.first().getAttribute(field.attribute);
              }
              break;
            case 'innerHTML':
              row[field.name] = await fieldLocator.first().innerHTML();
              break;
            default:
              row[field.name] = (await fieldLocator.first().textContent()) || '';
          }
        } catch (error: any) {
          if (data.failSilently) {
            row[field.name] = null;
          } else {
            throw new Error(`Failed to extract field "${field.name}": ${error.message}`);
          }
        }
      }

      results.push(row);
    }

    context.setData(outputVariable, results);

    if (data.saveToCSV) {
      const csvPathRaw = data.csvFilePath ?? '';
      const interpolatedPath = VariableInterpolator.interpolateString(csvPathRaw, context);
      if (!interpolatedPath.trim()) {
        throw new Error('CSV file path is required when Save to CSV is enabled');
      }
      const delimiter = (data.csvDelimiter ?? ',').replace(/^['"]|['"]$/g, '') || ',';
      const headers = fields.map(f => f.name);
      const records = results.map(row => {
        return headers.map(h => row[h] == null ? '' : String(row[h]));
      });
      const csvContent = stringify([headers, ...records], { delimiter });
      const resolvedPath = resolveFilePath(interpolatedPath);
      await ensureParentDir(resolvedPath);
      await fs.writeFile(resolvedPath, csvContent, 'utf-8');
    }
  }

  private parseFields(fields: any): DataExtractorFieldDefinition[] {
    if (Array.isArray(fields)) {
      return fields;
    }
    if (typeof fields === 'string') {
      try {
        const parsed = JSON.parse(fields);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  }

  private buildPlaywrightSelector(selector: string, selectorType: string): string {
    switch (selectorType) {
      case 'xpath':
        return `xpath=${selector}`;
      case 'css':
        return selector;
      case 'text':
        return `text=${selector}`;
      default:
        return selector;
    }
  }
}
