import { Router, Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { resolveFromProjectRoot } from '../utils/pathUtils';

export default function reportRoutes() {
  const router = Router();

  // Get default output directory (project root)
  const getOutputDir = (): string => {
    return resolveFromProjectRoot('./output');
  };

  /**
   * @swagger
   * /api/reports/list:
   *   get:
   *     summary: List all report folders
   *     description: Retrieve list of all report folders with metadata including report types and files
   *     tags: [Reports]
   *     responses:
   *       200:
   *         description: Report folders retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/ReportFolder'
   *       500:
   *         description: Internal server error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  // List all report folders with metadata
  router.get('/list', (req: Request, res: Response) => {
    try {
      const outputDir = getOutputDir();
      
      if (!fs.existsSync(outputDir)) {
        return res.json([]);
      }

      const folders = fs.readdirSync(outputDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => {
          const folderPath = path.join(outputDir, dirent.name);
          const stats = fs.statSync(folderPath);
          
          // Extract timestamp from folder name (format: workflowName-timestamp)
          const timestampMatch = dirent.name.match(/-(\d+)$/);
          const timestamp = timestampMatch ? parseInt(timestampMatch[1], 10) : stats.birthtimeMs;
          
          // List report types in this folder
          const reportTypes: string[] = [];
          const files: Array<{ name: string; path: string; type: string }> = [];
          
          if (fs.existsSync(folderPath)) {
            const entries = fs.readdirSync(folderPath, { withFileTypes: true });
            entries.forEach(entry => {
              if (entry.isDirectory()) {
                // Check if it's a report type directory
                const reportTypeDirs = ['html', 'allure', 'json', 'junit', 'csv', 'markdown', 'screenshots'];
                if (reportTypeDirs.includes(entry.name)) {
                  if (entry.name !== 'screenshots') {
                    reportTypes.push(entry.name);
                  }
                  
                  // List files in report type directory
                  const reportTypePath = path.join(folderPath, entry.name);
                  const reportFiles = fs.readdirSync(reportTypePath, { withFileTypes: true })
                    .filter(f => f.isFile())
                    .map(f => ({
                      name: f.name,
                      path: `${entry.name}/${f.name}`,
                      type: entry.name,
                    }));
                  files.push(...reportFiles);
                }
              }
            });
          }
          
          return {
            folderName: dirent.name,
            createdAt: new Date(timestamp).toISOString(),
            reportTypes,
            files,
          };
        })
        .sort((a, b) => {
          // Sort by timestamp (newest first)
          const aTime = new Date(a.createdAt).getTime();
          const bTime = new Date(b.createdAt).getTime();
          return bTime - aTime;
        });

      res.json(folders);
    } catch (error: any) {
      console.error('Error listing reports:', error);
      res.status(500).json({ error: 'Failed to list reports', message: error.message });
    }
  });

  /**
   * @swagger
   * /api/reports/{folderName}/files:
   *   get:
   *     summary: Get files in report folder
   *     description: Retrieve list of all files in a specific report folder
   *     tags: [Reports]
   *     parameters:
   *       - in: path
   *         name: folderName
   *         required: true
   *         schema:
   *           type: string
   *         description: Report folder name
   *     responses:
   *       200:
   *         description: Files retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 type: object
   *                 properties:
   *                   name:
   *                     type: string
   *                   path:
   *                     type: string
   *                   type:
   *                     type: string
   *                   fullPath:
   *                     type: string
   *       404:
   *         description: Report folder not found
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
  // Get files in a specific report folder
  router.get('/:folderName/files', (req: Request, res: Response) => {
    try {
      const { folderName } = req.params;
      const folderPath = path.join(getOutputDir(), folderName);
      
      if (!fs.existsSync(folderPath)) {
        return res.status(404).json({ error: 'Report folder not found' });
      }

      const files: any[] = [];
      const entries = fs.readdirSync(folderPath, { withFileTypes: true });
      
      entries.forEach(entry => {
        const entryPath = path.join(folderPath, entry.name);
        if (entry.isDirectory()) {
          // Recursively list files in subdirectories
          const subFiles = fs.readdirSync(entryPath, { withFileTypes: true })
            .filter(f => f.isFile())
            .map(f => ({
              name: f.name,
              path: `${entry.name}/${f.name}`,
              type: entry.name,
              fullPath: path.join(entryPath, f.name),
            }));
          files.push(...subFiles);
        } else {
          files.push({
            name: entry.name,
            path: entry.name,
            type: 'root',
            fullPath: entryPath,
          });
        }
      });

      res.json(files);
    } catch (error: any) {
      console.error('Error listing folder files:', error);
      res.status(500).json({ error: 'Failed to list folder files', message: error.message });
    }
  });

  /**
   * @swagger
   * /api/reports/{folderName}/{reportType}/{filename}:
   *   get:
   *     summary: Serve report file
   *     description: Serve a specific report file (HTML, JSON, XML, CSV, Markdown, etc.)
   *     tags: [Reports]
   *     parameters:
   *       - in: path
   *         name: folderName
   *         required: true
   *         schema:
   *           type: string
   *         description: Report folder name
   *       - in: path
   *         name: reportType
   *         required: true
   *         schema:
   *           type: string
   *           enum: [html, allure, json, junit, csv, markdown]
   *         description: Report type directory
   *       - in: path
   *         name: filename
   *         required: true
   *         schema:
   *           type: string
   *         description: Report file name
   *     responses:
   *       200:
   *         description: Report file served successfully
   *         content:
   *           text/html:
   *             schema:
   *               type: string
   *           application/json:
   *             schema:
   *               type: object
   *           application/xml:
   *             schema:
   *               type: string
   *           text/csv:
   *             schema:
   *               type: string
   *           text/markdown:
   *             schema:
   *               type: string
   *       404:
   *         description: Report file not found
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
  // Serve report file
  router.get('/:folderName/:reportType/:filename', (req: Request, res: Response) => {
    try {
      const { folderName, reportType, filename } = req.params;
      const filePath = path.join(getOutputDir(), folderName, reportType, filename);
      
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Report file not found' });
      }

      // Determine content type based on file extension
      const ext = path.extname(filename).toLowerCase();
      const contentTypes: Record<string, string> = {
        '.html': 'text/html',
        '.json': 'application/json',
        '.xml': 'application/xml',
        '.csv': 'text/csv',
        '.md': 'text/markdown',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
      };
      
      const contentType = contentTypes[ext] || 'application/octet-stream';
      res.setHeader('Content-Type', contentType);
      res.sendFile(path.resolve(filePath));
    } catch (error: any) {
      console.error('Error serving report file:', error);
      res.status(500).json({ error: 'Failed to serve report file', message: error.message });
    }
  });

  /**
   * @swagger
   * /api/reports/{folderName}/screenshots/{filename}:
   *   get:
   *     summary: Serve screenshot file
   *     description: Serve a screenshot image file from a report folder
   *     tags: [Reports]
   *     parameters:
   *       - in: path
   *         name: folderName
   *         required: true
   *         schema:
   *           type: string
   *         description: Report folder name
   *       - in: path
   *         name: filename
   *         required: true
   *         schema:
   *           type: string
   *         description: Screenshot file name
   *     responses:
   *       200:
   *         description: Screenshot served successfully
   *         content:
   *           image/png:
   *             schema:
   *               type: string
   *               format: binary
   *       404:
   *         description: Screenshot not found
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
  // Serve screenshot file
  router.get('/:folderName/screenshots/:filename', (req: Request, res: Response) => {
    try {
      const { folderName, filename } = req.params;
      const filePath = path.join(getOutputDir(), folderName, 'screenshots', filename);
      
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Screenshot not found' });
      }

      res.setHeader('Content-Type', 'image/png');
      res.sendFile(path.resolve(filePath));
    } catch (error: any) {
      console.error('Error serving screenshot:', error);
      res.status(500).json({ error: 'Failed to serve screenshot', message: error.message });
    }
  });

  /**
   * @swagger
   * /api/reports/{folderName}:
   *   delete:
   *     summary: Delete report folder
   *     description: Delete a specific report folder and all its contents
   *     tags: [Reports]
   *     parameters:
   *       - in: path
   *         name: folderName
   *         required: true
   *         schema:
   *           type: string
   *         description: Report folder name to delete
   *     responses:
   *       200:
   *         description: Report folder deleted successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 message:
   *                   type: string
   *       404:
   *         description: Report folder not found
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
  // Delete specific report folder
  router.delete('/:folderName', (req: Request, res: Response) => {
    try {
      const { folderName } = req.params;
      const folderPath = path.join(getOutputDir(), folderName);
      
      if (!fs.existsSync(folderPath)) {
        return res.status(404).json({ error: 'Report folder not found' });
      }

      // Delete folder recursively
      fs.rmSync(folderPath, { recursive: true, force: true });
      
      res.json({ success: true, message: `Report folder ${folderName} deleted` });
    } catch (error: any) {
      console.error('Error deleting report folder:', error);
      res.status(500).json({ error: 'Failed to delete report folder', message: error.message });
    }
  });

  /**
   * @swagger
   * /api/reports:
   *   delete:
   *     summary: Delete all reports
   *     description: Delete all report folders and their contents
   *     tags: [Reports]
   *     responses:
   *       200:
   *         description: All reports deleted successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 message:
   *                   type: string
   *       500:
   *         description: Internal server error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  // Delete all reports
  router.delete('/', (req: Request, res: Response) => {
    try {
      const outputDir = getOutputDir();
      
      if (!fs.existsSync(outputDir)) {
        return res.json({ success: true, message: 'No reports to delete' });
      }

      const folders = fs.readdirSync(outputDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory());
      
      folders.forEach(dirent => {
        const folderPath = path.join(outputDir, dirent.name);
        fs.rmSync(folderPath, { recursive: true, force: true });
      });
      
      res.json({ success: true, message: `Deleted ${folders.length} report folder(s)` });
    } catch (error: any) {
      console.error('Error deleting all reports:', error);
      res.status(500).json({ error: 'Failed to delete reports', message: error.message });
    }
  });

  return router;
}
