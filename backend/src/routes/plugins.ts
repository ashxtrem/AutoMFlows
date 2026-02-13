import { Router, Request, Response } from 'express';
import { PluginMetadata } from '@automflows/shared';
import { pluginRegistry } from '../plugins/registry';

export default function pluginRoutes() {
  const router = Router();

  /**
   * @swagger
   * /api/plugins:
   *   get:
   *     summary: List all plugins
   *     description: Retrieve metadata for all loaded plugins
   *     tags: [Plugins]
   *     responses:
   *       200:
   *         description: Plugins retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/PluginMetadata'
   *       500:
   *         description: Internal server error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  // Get all loaded plugins
  router.get('/', (req: Request, res: Response) => {
    try {
      const plugins = pluginRegistry.getAllPlugins();
      const metadata: PluginMetadata[] = plugins.map(plugin => plugin.metadata);
      
      res.json(metadata);
    } catch (error: any) {
      console.error('Get plugins error:', error);
      res.status(500).json({
        error: 'Failed to get plugins',
        message: error.message,
      });
    }
  });

  /**
   * @swagger
   * /api/plugins/{pluginId}:
   *   get:
   *     summary: Get plugin details
   *     description: Retrieve metadata for a specific plugin by ID
   *     tags: [Plugins]
   *     parameters:
   *       - in: path
   *         name: pluginId
   *         required: true
   *         schema:
   *           type: string
   *         description: Plugin ID (directory name)
   *     responses:
   *       200:
   *         description: Plugin details retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/PluginMetadata'
   *       404:
   *         description: Plugin not found
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
  // Get specific plugin
  router.get('/:pluginId', (req: Request, res: Response) => {
    try {
      const { pluginId } = req.params;
      const plugin = pluginRegistry.getPlugin(pluginId);
      
      if (!plugin) {
        return res.status(404).json({
          error: 'Plugin not found',
        });
      }

      res.json(plugin.metadata);
    } catch (error: any) {
      console.error('Get plugin error:', error);
      res.status(500).json({
        error: 'Failed to get plugin',
        message: error.message,
      });
    }
  });

  return router;
}

