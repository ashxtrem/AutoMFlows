import { Router, Request, Response } from 'express';
import fs from 'fs/promises';
import path from 'path';

/**
 * Helper function to resolve file path (relative or absolute)
 * Relative paths are resolved from the project root
 */
function resolveFilePath(filePath: string): string {
  if (path.isAbsolute(filePath)) {
    return filePath;
  }
  
  // Resolve relative path from project root
  // __dirname in compiled code: backend/dist/routes -> go up 3 levels to project root
  const projectRoot = path.resolve(__dirname, '../../../');
  return path.resolve(projectRoot, filePath);
}

export default function fileRoutes() {
  const router = Router();

  /**
   * @swagger
   * /api/files/read:
   *   get:
   *     summary: Read file content
   *     description: Read and parse file content from the filesystem. Supports both relative and absolute paths. Attempts to parse JSON files.
   *     tags: [Files]
   *     parameters:
   *       - in: query
   *         name: filePath
   *         required: true
   *         schema:
   *           type: string
   *         description: Path to file (relative or absolute)
   *     responses:
   *       200:
   *         description: File content read successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/FileReadResponse'
   *       400:
   *         description: Bad request - filePath parameter missing
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       404:
   *         description: File not found
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       500:
   *         description: Internal server error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  // Read file content endpoint
  router.get('/read', async (req: Request, res: Response) => {
    try {
      const { filePath } = req.query;

      if (!filePath || typeof filePath !== 'string') {
        return res.status(400).json({
          error: 'filePath query parameter is required',
        });
      }

      // Resolve file path (handles both relative and absolute)
      const resolvedPath = resolveFilePath(filePath);

      // Check if file exists
      try {
        await fs.access(resolvedPath);
      } catch {
        return res.status(404).json({
          error: 'File not found',
          message: `Config file not found: ${resolvedPath}`,
        });
      }

      // Read file content
      const fileContent = await fs.readFile(resolvedPath, 'utf-8');

      // Try to parse JSON
      let parsed: object | undefined;
      let parseError: string | undefined;

      try {
        const trimmedContent = fileContent.trim();
        parsed = JSON.parse(trimmedContent);
        
        // Validate that it's an object
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
          parseError = 'Config file must contain a JSON object';
          parsed = undefined;
        }
      } catch (error: any) {
        parseError = `Invalid JSON: ${error.message}`;
      }

      res.json({
        content: fileContent,
        parsed,
        error: parseError,
      });
    } catch (error: any) {
      console.error('Read file error:', error);
      res.status(500).json({
        error: 'Failed to read file',
        message: error.message,
      });
    }
  });

  return router;
}
