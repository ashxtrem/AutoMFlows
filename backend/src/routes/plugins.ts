import { Router, Request, Response } from 'express';
import { PluginMetadata } from '@automflows/shared';
import { pluginRegistry } from '../plugins/registry';

export default function pluginRoutes() {
  const router = Router();

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

