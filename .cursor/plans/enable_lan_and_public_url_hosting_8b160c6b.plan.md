---
name: Enable LAN and Public URL Hosting
overview: Enable frontend and backend to be accessible over LAN or public URLs, allowing users to access the frontend from remote machines while execution runs on the server machine. This requires making backend URLs configurable, binding servers to all interfaces, and ensuring all API/Socket.IO connections use the correct host.
todos: []
isProject: false
---

# Enable LAN and Public URL Hosting

## Overview

Enable AutoMFlows to be accessed over LAN or public URLs. Users will access the frontend from remote machines (Machine B), while workflow execution happens on the server machine (Machine A) where the backend runs.

## Architecture Clarification

**Important**: Browser execution will happen on Machine A (server), not Machine B (user's machine). This is because:

- Playwright launches browsers on the machine where the Node.js process runs
- The backend server runs on Machine A, so browsers launch there
- This is the recommended approach for remote execution (headless mode)

**Alternative**: To use browser from Machine B, you would need:

- A browser extension/agent on Machine B that connects to Machine A
- Or a WebDriver-based solution with remote browser control
- This is significantly more complex and not recommended for this use case

## Current Issues

1. **Frontend hardcodes `localhost**` in multiple places:
  - API calls: `http://localhost:${port}/api/...`
  - Socket.IO connections: `io('http://localhost:${port}')`
  - Report URLs: `http://localhost:${port}/reports/...`
  - Screenshot URLs: `http://localhost:${port}/api/reports/...`
2. **Backend binds to localhost only**:
  - `httpServer.listen(PORT, ...)` doesn't specify host, defaults to localhost
  - Need to bind to `0.0.0.0` for LAN access
3. **Vite proxy targets localhost**:
  - This is fine for dev server (server-side), but production build needs different approach
4. **No environment-based URL configuration**:
  - Frontend needs to know backend URL at runtime

## Implementation Plan

### Phase 1: Backend Server Configuration

**File: `backend/src/server.ts**`

- Bind server to `0.0.0.0` instead of default localhost
- Add `HOST` environment variable support (default: `0.0.0.0` for LAN, `localhost` for local-only)
- Update console log to show actual listening address

**Changes:**

```typescript
const HOST = process.env.HOST || '0.0.0.0';
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : await findAvailablePort();

httpServer.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
  console.log(`Accessible on LAN at: http://<your-ip>:${PORT}`);
});
```

### Phase 2: Frontend URL Configuration

**File: `frontend/src/utils/getBackendPort.ts**`

- Rename to `getBackendUrl.ts` or extend to return full URL
- Support `VITE_BACKEND_URL` environment variable
- Fallback to `VITE_BACKEND_HOST` + `VITE_BACKEND_PORT`
- Default to relative URLs in production, `localhost` in development

**New utility: `frontend/src/utils/getBackendUrl.ts**`

```typescript
export function getBackendUrl(): string {
  // Production: use relative URLs (same origin)
  if (import.meta.env.PROD) {
    return ''; // Empty string = relative URLs
  }
  
  // Development: use environment variable or detect from window.location
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  if (backendUrl) {
    return backendUrl;
  }
  
  const host = import.meta.env.VITE_BACKEND_HOST || window.location.hostname;
  const port = import.meta.env.VITE_BACKEND_PORT || '3003';
  
  return `http://${host}:${port}`;
}
```

### Phase 3: Update All Frontend API Calls

Replace all `http://localhost:${port}` with dynamic backend URL:

**Files to update:**

1. `frontend/src/hooks/useExecution.ts`
  - Replace `http://localhost:${currentPort}` with `${backendUrl}/api/...`
  - Update Socket.IO: `io(backendUrl)` instead of `io('http://localhost:${p}')`
2. `frontend/src/services/actionRecorder.ts`
  - Replace `http://localhost:${backendPort}` with `${backendUrl}/api/...`
  - Update Socket.IO connection
3. `frontend/src/services/selectorFinder.ts`
  - Replace `http://localhost:${backendPort}` with `${backendUrl}/api/...`
  - Update Socket.IO connection
4. `frontend/src/hooks/useBuilderMode.ts`
  - Replace `http://localhost:${backendPort}` with `${backendUrl}/api/...`
5. `frontend/src/components/NodeErrorPopup.tsx`
  - Replace `http://localhost:${backendPort}` with `${backendUrl}/api/...`
6. `frontend/src/components/ReportHistory.tsx`
  - Replace `http://localhost:${port}` with `${backendUrl}/api/...` or relative URLs
7. `frontend/src/plugins/loader.ts`
  - Replace `http://localhost:${backendPort}` with `${backendUrl}/api/...`
8. `frontend/src/hooks/useServerRestartWarning.ts`
  - Update Socket.IO connection

### Phase 4: Vite Configuration Updates

**File: `frontend/vite.config.ts**`

- Keep proxy for development (works fine)
- For production builds, ensure relative URLs are used
- Add `define` for environment variables if needed

### Phase 5: Environment Variable Documentation

**File: `.env.example**` (create if doesn't exist)

```bash
# Backend Configuration
HOST=0.0.0.0  # Bind to all interfaces for LAN access, or 'localhost' for local-only
PORT=3003      # Backend port

# Frontend Configuration (for development)
VITE_BACKEND_URL=http://192.168.1.100:3003  # Full backend URL
# OR use separate host/port:
VITE_BACKEND_HOST=192.168.1.100
VITE_BACKEND_PORT=3003
```

### Phase 6: Production Build Considerations

**File: `backend/src/server.ts**`

- In production, serve frontend static files
- Ensure CORS is properly configured for production domains
- Update Socket.IO CORS to allow specific origins in production

**CORS Updates:**

```typescript
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['*'];
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});
```

### Phase 7: Network Configuration Guide

Create documentation for:

- How to find LAN IP address
- Firewall configuration
- Port forwarding for public access
- Security considerations

## Testing Checklist

- Frontend accessible from LAN IP
- Frontend accessible from public IP/DNS (if configured)
- API calls work from remote frontend
- Socket.IO connections work from remote frontend
- Workflow execution runs on server (Machine A)
- Screenshots accessible from remote frontend
- Reports accessible from remote frontend
- Headless execution works correctly
- Builder mode works (if non-headless browser available on server)

## Security Considerations

1. **Authentication**: Consider adding authentication for public deployments
2. **HTTPS**: Use reverse proxy (nginx/caddy) with SSL for public access
3. **Firewall**: Only expose necessary ports
4. **CORS**: Restrict allowed origins in production
5. **Rate Limiting**: Consider rate limiting for public APIs

## Files to Modify

### Backend

- `backend/src/server.ts` - Bind to 0.0.0.0, update CORS

### Frontend

- `frontend/src/utils/getBackendUrl.ts` - New utility (or extend getBackendPort.ts)
- `frontend/src/hooks/useExecution.ts` - Update API calls and Socket.IO
- `frontend/src/services/actionRecorder.ts` - Update API calls and Socket.IO
- `frontend/src/services/selectorFinder.ts` - Update API calls and Socket.IO
- `frontend/src/hooks/useBuilderMode.ts` - Update API calls
- `frontend/src/components/NodeErrorPopup.tsx` - Update screenshot URLs
- `frontend/src/components/ReportHistory.tsx` - Update API calls and report URLs
- `frontend/src/plugins/loader.ts` - Update API calls
- `frontend/src/hooks/useServerRestartWarning.ts` - Update Socket.IO

### Configuration

- `.env.example` - Add environment variable examples
- `README.md` - Add network configuration section

## Deployment Scenarios

### Scenario 1: LAN Access Only

```bash
# On Machine A (server)
HOST=0.0.0.0 PORT=3003 npm run dev:backend
# Frontend on Machine A uses: VITE_BACKEND_HOST=<machine-a-ip>
```

### Scenario 2: Public Access

```bash
# On Machine A (server)
HOST=0.0.0.0 PORT=3003 npm run dev:backend
# Frontend uses: VITE_BACKEND_URL=https://yourdomain.com:3003
# Use reverse proxy (nginx) for HTTPS
```

### Scenario 3: Same Machine (Current)

```bash
# No changes needed, works as-is
# Or explicitly: HOST=localhost
```

