import { Router, Request } from 'express';
import { Server } from 'http';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from '../config/swagger';
import { readPortFile } from '../utils/writePort';

/**
 * Get dynamic Swagger spec with current server port
 */
function getDynamicSwaggerSpec(req: Request, httpServer?: Server) {
  // Try to get port from HTTP server instance
  let port: number | undefined;
  if (httpServer) {
    const address = httpServer.address();
    if (address && typeof address === 'object') {
      port = address.port;
    }
  }
  
  // Fallback to port file or request
  if (!port) {
    port = readPortFile() || undefined;
  }
  
  // Last fallback: try to get from request host header
  if (!port) {
    const hostHeader = req.get('host');
    if (hostHeader && hostHeader.includes(':')) {
      port = parseInt(hostHeader.split(':')[1], 10);
    }
  }
  
  // Default fallback
  const finalPort = port || 3000;
  
  // Clone the spec and update server URL
  const dynamicSpec = JSON.parse(JSON.stringify(swaggerSpec));
  
  // Get host from request or use localhost
  const host = req.get('host')?.split(':')[0] || 'localhost';
  const protocol = req.protocol || 'http';
  
  dynamicSpec.servers = [
    {
      url: `${protocol}://${host}:${finalPort}`,
      description: 'Development server',
    },
  ];
  
  return dynamicSpec;
}

export default function swaggerRoutes(httpServer?: Server) {
  const router = Router();

  // Serve Swagger UI with dynamic spec
  router.use('/', swaggerUi.serve);
  router.get('/', (req, res, next) => {
    const dynamicSpec = getDynamicSwaggerSpec(req, httpServer);
    const swaggerHtml = swaggerUi.setup(dynamicSpec, {
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'AutoMFlows API Documentation',
    });
    swaggerHtml(req, res, next);
  });

  // Serve OpenAPI JSON spec with dynamic port
  router.get('/swagger.json', (req, res) => {
    const dynamicSpec = getDynamicSwaggerSpec(req, httpServer);
    res.setHeader('Content-Type', 'application/json');
    res.send(dynamicSpec);
  });

  return router;
}
