import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import workflowRoutes from './routes/workflows';
import pluginRoutes from './routes/plugins';
import reportRoutes from './routes/reports';
import { findAvailablePort } from './utils/portFinder';
import { writePortFile, deletePortFile } from './utils/writePort';
import { PluginLoader } from './plugins/loader';
import { pluginRegistry } from './plugins/registry';

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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// API Routes
app.use('/api/workflows', workflowRoutes(io));
app.use('/api/plugins', pluginRoutes());
app.use('/api/reports', reportRoutes());

// Serve static report files from output directory
const outputDir = path.resolve('./output');
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
  console.log('Client connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Make io available globally for execution engine
(global as any).io = io;

// Find available port and start server
async function startServer() {
  try {
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

