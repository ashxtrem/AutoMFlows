import { BaseNode, CsvHandleNodeData } from '@automflows/shared';
import { NodeHandler } from '../base';
import { ContextManager } from '../../engine/context';
import { VariableInterpolator } from '../../utils/variableInterpolator';
import fs from 'fs/promises';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';

/**
 * Resolve file path (interpolated string): absolute as-is, else relative to project root.
 * From backend/dist/nodes/handlers, go up 4 levels to project root.
 */
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

export class CsvHandleHandler implements NodeHandler {
  async execute(node: BaseNode, context: ContextManager): Promise<void> {
    const data = node.data as CsvHandleNodeData;

    if (!data.action) {
      throw new Error('CSV Handle node requires an action (write, append, or read).');
    }

    const filePathRaw = data.filePath ?? '';
    const interpolatedPath = VariableInterpolator.interpolateString(filePathRaw, context);
    const delimiter = (data.delimiter ?? ',').replace(/^['"]|['"]$/g, '') || ',';
    const encoding = (data.encoding ?? 'utf-8') as BufferEncoding;

    if (data.action === 'read') {
      if (!interpolatedPath.trim()) {
        throw new Error('CSV Handle read action requires filePath.');
      }
      const resolvedPath = resolveFilePath(interpolatedPath);
      let fileContent: string;
      try {
        fileContent = await fs.readFile(resolvedPath, encoding);
      } catch (err: any) {
        if (err?.code === 'ENOENT') {
          throw new Error(`CSV file not found: ${resolvedPath}`);
        }
        throw new Error(`Failed to read CSV file: ${err?.message ?? err}`);
      }
      const records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        delimiter,
        relax_column_count: true,
      });
      const contextKey = data.contextKey ?? 'csvData';
      context.setData(contextKey, records);
      return;
    }

    // write | append
    if (!interpolatedPath.trim()) {
      throw new Error('CSV Handle write/append action requires filePath.');
    }
    const dataSource = data.dataSource ?? '';
    if (!dataSource.trim()) {
      throw new Error('CSV Handle write/append action requires dataSource (context key).');
    }
    const rows = context.getData(dataSource);
    if (!Array.isArray(rows)) {
      if (rows === undefined) {
        throw new Error(`Data source "${dataSource}" not found in context.`);
      }
      throw new Error(`Data source "${dataSource}" is not an array.`);
    }

    const resolvedPath = resolveFilePath(interpolatedPath);
    await ensureParentDir(resolvedPath);

    let headers: string[] = Array.isArray(data.headers) && data.headers.length > 0
      ? data.headers
      : [];

    const normalizeRow = (row: any): Record<string, string> => {
      if (row !== null && typeof row === 'object' && !Array.isArray(row)) {
        const out: Record<string, string> = {};
        for (const [k, v] of Object.entries(row)) {
          out[String(k)] = v == null ? '' : String(v);
        }
        return out;
      }
      if (Array.isArray(row)) {
        const out: Record<string, string> = {};
        headers.forEach((h, i) => {
          out[h] = row[i] != null ? String(row[i]) : '';
        });
        return out;
      }
      return { value: String(row) };
    };

    if (data.action === 'write') {
      if (headers.length === 0 && rows.length > 0) {
        const first = rows[0];
        if (first !== null && typeof first === 'object' && !Array.isArray(first)) {
          headers = Object.keys(normalizeRow(first));
        } else if (Array.isArray(first)) {
          headers = first.map((_, i) => `column_${i}`);
        } else {
          headers = ['value'];
        }
      }
      const records = rows.map((row) => {
        const obj = normalizeRow(row);
        return headers.map((h) => obj[h] ?? '');
      });
      const csvContent = stringify([headers, ...records], { delimiter });
      await fs.writeFile(resolvedPath, csvContent, encoding);
      return;
    }

    // append
    let existingContent = '';
    try {
      existingContent = await fs.readFile(resolvedPath, encoding);
    } catch (err: any) {
      if (err?.code !== 'ENOENT') {
        throw new Error(`Failed to read existing CSV for append: ${err?.message ?? err}`);
      }
    }

    if (headers.length === 0) {
      if (existingContent) {
        const firstNewline = existingContent.indexOf('\n');
        const headerLine = firstNewline >= 0 ? existingContent.slice(0, firstNewline) : existingContent.trim();
        const parsed = parse(headerLine, { delimiter });
        if (parsed[0] && Array.isArray(parsed[0])) {
          headers = parsed[0].map((c: any) => String(c));
        }
      }
      if (headers.length === 0 && rows.length > 0) {
        const first = rows[0];
        if (first !== null && typeof first === 'object' && !Array.isArray(first)) {
          headers = Object.keys(normalizeRow(first));
        } else if (Array.isArray(first)) {
          headers = first.map((_, i) => `column_${i}`);
        } else {
          headers = ['value'];
        }
      }
    }

    const records = rows.map((row) => {
      const obj = normalizeRow(row);
      return headers.map((h) => obj[h] ?? '');
    });
    const appendContent = stringify(records, { delimiter, header: false });
    const toWrite = existingContent
      ? existingContent + (existingContent.endsWith('\n') ? '' : '\n') + appendContent
      : stringify([headers, ...records], { delimiter });
    await fs.writeFile(resolvedPath, toWrite, encoding);
  }
}
