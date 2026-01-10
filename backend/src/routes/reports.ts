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
          const files: string[] = [];
          
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
