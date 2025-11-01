# Docker Deployment Guide

## Quick Start

### Using Docker Compose (Easiest)

```bash
# Start the application
docker-compose up

# Access at http://localhost:8080
```

### Using Docker Directly

```bash
# Build
docker build -t two-rooms-boom:latest .

# Run
docker run -p 8080:8080 \
  -e GIN_MODE=release \
  -e FRONTEND_URL=http://localhost:8080 \
  two-rooms-boom:latest

# Access at http://localhost:8080
```

## Architecture

### Single Container Design

```
┌─────────────────────────────────────┐
│     Docker Container (Port 8080)    │
│                                     │
│  ┌───────────────────────────────┐ │
│  │      Go Backend Server        │ │
│  │    (Gin HTTP Server)          │ │
│  │                               │ │
│  │  - REST API (/api/v1/*)      │ │
│  │  - WebSocket (/ws/*)         │ │
│  │  - Static Files (/, /assets)  │ │
│  └───────────────────────────────┘ │
│                                     │
│  ┌───────────────────────────────┐ │
│  │   React Frontend (Static)     │ │
│  │   (Built & Embedded)          │ │
│  └───────────────────────────────┘ │
└─────────────────────────────────────┘
```

### Multi-Stage Build Process

1. **Stage 1**: Build React frontend (`npm run build`)
2. **Stage 2**: Build Go backend binary
3. **Stage 3**: Create minimal runtime image with both

## Build Details

### Dockerfile Stages

```dockerfile
# Stage 1: Frontend Build (Node.js)
FROM node:18-alpine AS frontend-builder
# Builds React app to /app/frontend/dist

# Stage 2: Backend Build (Go)
FROM golang:1.21-alpine AS backend-builder
# Builds Go binary to /app/backend/server

# Stage 3: Runtime (Alpine Linux)
FROM alpine:latest
# Copies both frontend dist and backend binary
# Final image size: ~30-50MB
```

### Image Optimization

- Multi-stage build reduces final image size
- Only runtime dependencies in final image
- Static binary (CGO_ENABLED=0)
- Alpine Linux base (~5MB)

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8080` | Server port |
| `GIN_MODE` | `release` | Gin mode (debug/release/test) |
| `FRONTEND_URL` | `http://localhost` | Frontend URL for CORS |

### Example Configurations

**Development:**
```bash
docker run -p 8080:8080 \
  -e GIN_MODE=debug \
  -e FRONTEND_URL=http://localhost:8080 \
  two-rooms-boom:latest
```

**Production:**
```bash
docker run -p 8080:8080 \
  -e GIN_MODE=release \
  -e FRONTEND_URL=https://your-domain.com \
  two-rooms-boom:latest
```

## Docker Compose

### Basic Setup

```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "8080:8080"
    environment:
      - GIN_MODE=release
      - FRONTEND_URL=http://localhost:8080
```

### With Health Checks

```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "8080:8080"
    environment:
      - GIN_MODE=release
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:8080/health"]
      interval: 10s
      timeout: 5s
      retries: 3
```

## Building for Different Platforms

### Build for ARM64 (Apple Silicon)

```bash
docker build --platform linux/arm64 -t two-rooms-boom:arm64 .
```

### Build for AMD64 (Intel/AMD)

```bash
docker build --platform linux/amd64 -t two-rooms-boom:amd64 .
```

### Multi-Platform Build

```bash
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t two-rooms-boom:latest \
  --push \
  .
```

## Troubleshooting

### Container Exits Immediately

```bash
# Check logs
docker logs <container-id>

# Run interactively
docker run -it two-rooms-boom:latest sh
```

### Frontend Not Loading

1. Check if frontend files were built:
```bash
docker run --rm two-rooms-boom:latest ls -la /app/frontend/dist
```

2. Verify routes:
```bash
# Should return index.html
curl http://localhost:8080/

# Should return API response
curl http://localhost:8080/health
```

### Port Already in Use

```bash
# Use different port
docker run -p 9090:8080 two-rooms-boom:latest

# Or stop the conflicting container
docker ps
docker stop <container-id>
```

### Build Fails

```bash
# Clear build cache
docker builder prune

# Rebuild from scratch
docker build --no-cache -t two-rooms-boom:latest .
```

## Registry Push

### Docker Hub

```bash
# Login
docker login

# Tag
docker tag two-rooms-boom:latest username/two-rooms-boom:latest

# Push
docker push username/two-rooms-boom:latest
```

### Private Registry

```bash
# Tag
docker tag two-rooms-boom:latest registry.example.com/two-rooms-boom:latest

# Push
docker push registry.example.com/two-rooms-boom:latest
```

## Performance Tips

1. **Use BuildKit**: Enable Docker BuildKit for faster builds
```bash
export DOCKER_BUILDKIT=1
docker build -t two-rooms-boom:latest .
```

2. **Layer Caching**: Dependencies are cached in separate layers

3. **Resource Limits**:
```bash
docker run -p 8080:8080 \
  --memory="512m" \
  --cpus="0.5" \
  two-rooms-boom:latest
```

## Security Best Practices

1. ✅ Non-root user (appuser:1000)
2. ✅ Minimal base image (Alpine)
3. ✅ No secrets in image
4. ✅ Read-only filesystem (can be enforced)
5. ✅ Health checks enabled

### Run with Security Options

```bash
docker run -p 8080:8080 \
  --read-only \
  --tmpfs /tmp \
  --cap-drop=ALL \
  two-rooms-boom:latest
```

## Next Steps

- See [k8s/README.md](k8s/README.md) for Kubernetes deployment
- See [README.md](README.md) for application documentation
