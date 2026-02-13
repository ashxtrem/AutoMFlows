import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import workflowRoutes from './routes/workflows';
import pluginRoutes from './routes/plugins';
import reportRoutes from './routes/reports';
import fileRoutes from './routes/files';
import swaggerRoutes from './routes/swagger';
import { findAvailablePort } from './utils/portFinder';
import { writePortFile, deletePortFile } from './utils/writePort';
import { PluginLoader } from './plugins/loader';
import { pluginRegistry } from './plugins/registry';
import { resolveFromProjectRoot } from './utils/pathUtils';
import { getBatchPersistence } from './utils/batchPersistence';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(cors());
// Increase body parser limit to 10MB to handle large workflow payloads
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// API Routes
app.use('/api/workflows', workflowRoutes(io));
app.use('/api/plugins', pluginRoutes());
app.use('/api/reports', reportRoutes());
app.use('/api/files', fileRoutes());

// Swagger API Documentation
if (process.env.SWAGGER_ENABLED !== 'false') {
  app.use('/api-docs', swaggerRoutes(httpServer));
  // Also serve JSON spec at /api-docs.json with dynamic port
  app.get('/api-docs.json', (req, res) => {
    const { swaggerSpec } = require('./config/swagger');
    const { readPortFile } = require('./utils/writePort');
    
    // Get port from server or port file
    const address = httpServer.address();
    const port = (address && typeof address === 'object' ? address.port : null) || readPortFile() || 3000;
    const host = req.get('host')?.split(':')[0] || 'localhost';
    const protocol = req.protocol || 'http';
    
    // Clone spec and update server URL
    const dynamicSpec = JSON.parse(JSON.stringify(swaggerSpec));
    dynamicSpec.servers = [
      {
        url: `${protocol}://${host}:${port}`,
        description: 'Development server',
      },
    ];
    
    res.setHeader('Content-Type', 'application/json');
    res.send(dynamicSpec);
  });
}

// Serve static report files from output directory (project root)
const outputDir = resolveFromProjectRoot('./output');
app.use('/reports', express.static(outputDir));

// Serve port file for frontend to discover backend port
app.get('/.automflows-port', (req, res) => {
  const port = (httpServer.address() as any)?.port;
  if (port) {
    res.type('text/plain').send(port.toString());
  } else {
    res.status(503).send('Server not ready');
  }
});

// Serve static files from frontend build (in production)
if (process.env.NODE_ENV === 'production') {
  const frontendBuildPath = path.join(__dirname, '../../frontend/dist');
  app.use(express.static(frontendBuildPath));

  // Fallback to index.html for SPA routing (in production)
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api') && req.path !== '/.automflows-port') {
      res.sendFile(path.join(frontendBuildPath, 'index.html'));
    }
  });
}

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  // Connection/disconnection logs suppressed to reduce console noise
  // Uncomment below for debugging if needed:
  console.log('Client connected:', socket.id);

  socket.on('disconnect', () => {
    // Disconnection logs suppressed to reduce console noise
    // Uncomment below for debugging if needed:
    console.log('Client disconnected:', socket.id);
  });
});

// Make io available globally for execution engine
(global as any).io = io;

// Find available port and start server
async function startServer() {
  try {
    // Initialize batch persistence
    const batchPersistence = getBatchPersistence();
    
    // Load active batches from database and mark as stopped (cannot resume after restart)
    const activeBatches = batchPersistence.loadActiveBatches();
    if (activeBatches.length > 0) {
      console.warn(`[Server Startup] Server restarted. ${activeBatches.length} active batch(es) marked as stopped.`);
      for (const batch of activeBatches) {
        batchPersistence.markBatchStopped(batch.batchId);
      }
    }
    
    // Load plugins
    const pluginsPath = path.join(__dirname, '../../plugins');
    const pluginLoader = new PluginLoader(pluginsPath);
    const pluginResults = await pluginLoader.loadAllPlugins();
    
    let loadedCount = 0;
    for (const result of pluginResults) {
      if (result.success && result.plugin) {
        pluginRegistry.registerPlugin(result.plugin);
        loadedCount++;
      }
    }
    
    console.log(`Loaded ${loadedCount} plugin(s)`);
    
    // Clean up port file on exit
    const cleanup = () => {
      deletePortFile();
      // Close batch persistence database connection
      batchPersistence.close();
    };
    
    process.on('exit', cleanup);
    process.on('SIGINT', () => {
      cleanup();
      process.exit();
    });
    process.on('SIGTERM', () => {
      cleanup();
      process.exit();
    });

    const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : await findAvailablePort();
    
    // Write port file before starting (for frontend to discover)
    writePortFile(PORT);
    
    httpServer.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log(`Port file written to .automflows-port`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export { io };

