import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import workflowRoutes from './routes/workflows';
import pluginRoutes from './routes/plugins';
import reportRoutes from './routes/reports';
import fileRoutes from './routes/files';

export function createApp() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  app.use('/api/workflows', workflowRoutes(io));
  app.use('/api/plugins', pluginRoutes());
  app.use('/api/reports', reportRoutes());
  app.use('/api/files', fileRoutes());

  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('Error:', err);
    res.status(500).json({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  });

  return { app, httpServer, io };
}
