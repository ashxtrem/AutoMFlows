# Multi-stage build for AutoMFlows

# Stage 1: Build shared package
FROM node:20-alpine AS shared-builder
WORKDIR /app
COPY shared/package.json shared/
COPY shared/tsconfig.json shared/
RUN cd shared && npm install
COPY shared/ ./shared/
RUN cd shared && npm run build

# Stage 2: Build backend
FROM node:20-alpine AS backend-builder
WORKDIR /app
COPY --from=shared-builder /app/shared/dist ./shared/dist
COPY backend/package.json backend/
COPY backend/tsconfig.json backend/
RUN cd backend && npm install
COPY backend/ ./backend/
RUN cd backend && npm run build

# Stage 3: Build frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY --from=shared-builder /app/shared/dist ./shared/dist
COPY frontend/package.json frontend/
COPY frontend/tsconfig.json frontend/
COPY frontend/vite.config.ts frontend/
COPY frontend/tailwind.config.js frontend/
COPY frontend/postcss.config.js frontend/
COPY frontend/index.html frontend/
RUN cd frontend && npm install
COPY frontend/ ./frontend/
RUN cd frontend && npm run build

# Stage 4: Production runtime
FROM node:20-alpine
WORKDIR /app

# Install Playwright browsers
RUN npx playwright install chromium
RUN npx playwright install-deps chromium

# Copy built files
COPY --from=shared-builder /app/shared/dist ./shared/dist
COPY --from=backend-builder /app/backend/dist ./backend/dist
COPY --from=backend-builder /app/backend/package.json ./backend/
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Install production dependencies
WORKDIR /app/backend
RUN npm install --production

# Create screenshots directory
RUN mkdir -p /app/screenshots

# Expose port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Start server
CMD ["node", "dist/server.js"]

