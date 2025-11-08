# Docker Deployment Guide

Complete guide for deploying Two Rooms and a Boom using Docker and Docker Compose.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Architecture](#architecture)
3. [Production Deployment](#production-deployment)
4. [Development Setup](#development-setup)
5. [Building Images](#building-images)
6. [Environment Variables](#environment-variables)
7. [Troubleshooting](#troubleshooting)
8. [Security](#security)
9. [Monitoring](#monitoring)

## Quick Start

### Docker Compose (Recommended)

```bash
# Start the application
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the application
docker-compose down
```

Access at: **http://localhost:8080**

### Docker Run (Direct)

```bash
# Pull and run
docker run -d \
  --name two-rooms-boom \
  -p 8080:8080 \
  -e GIN_MODE=release \
  splkm97/2r1b:latest

# View logs
docker logs -f two-rooms-boom
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

1. **Stage 1 (Frontend)**: Build React app with Node 20
   - Input: `frontend/` source code
   - Output: `dist/` static files

2. **Stage 2 (Backend)**: Build Go binary
   - Input: `backend/` source code
   - Output: `server` executable

3. **Stage 3 (Runtime)**: Minimal Alpine image
   - Combines frontend dist + backend binary
   - Final size: ~30-50MB

## Production Deployment

### Using Docker Compose

**File: `docker-compose.yml`**

```yaml
version: '3.8'

services:
  app:
    image: splkm97/2r1b:latest
    container_name: two-rooms-and-a-boom-app
    ports:
      - "9090:8080"
    environment:
      - PORT=8080
      - GIN_MODE=release
      - FRONTEND_URL=http://localhost:9090
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:8080/health"]
      interval: 10s
      timeout: 5s
      retries: 3
      start_period: 10s
    networks:
      - two-rooms-boom-network

networks:
  two-rooms-boom-network:
    driver: bridge
```

**Commands:**

```bash
# Start services
docker-compose up -d

# View logs (follow)
docker-compose logs -f

# View logs (last 100 lines)
docker-compose logs --tail=100

# Restart service
docker-compose restart

# Stop and remove containers
docker-compose down

# Update to latest version
docker-compose pull
docker-compose up -d
```

### Using Docker Run

**Basic:**

```bash
docker run -d \
  --name two-rooms-boom \
  -p 8080:8080 \
  -e GIN_MODE=release \
  splkm97/2r1b:latest
```

**With Health Checks & Restart:**

```bash
docker run -d \
  --name two-rooms-boom \
  -p 8080:8080 \
  -e GIN_MODE=release \
  -e FRONTEND_URL=http://localhost:8080 \
  --restart unless-stopped \
  --health-cmd="wget --quiet --tries=1 --spider http://localhost:8080/health || exit 1" \
  --health-interval=10s \
  --health-timeout=5s \
  --health-retries=3 \
  splkm97/2r1b:latest
```

**With Resource Limits:**

```bash
docker run -d \
  --name two-rooms-boom \
  -p 8080:8080 \
  --memory="512m" \
  --cpus="0.5" \
  --restart unless-stopped \
  splkm97/2r1b:latest
```

## Development Setup

### docker-compose.dev.yml

For local development with hot reload:

```yaml
version: '3.8'

services:
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.dev
    ports:
      - "5173:5173"
    volumes:
      - ./frontend:/app
      - /app/node_modules
    environment:
      - VITE_API_URL=http://localhost:8080
      - VITE_WS_URL=ws://localhost:8080

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.dev
    ports:
      - "8080:8080"
    volumes:
      - ./backend:/app
    environment:
      - GIN_MODE=debug
      - PORT=8080
```

**Commands:**

```bash
# Start development environment
docker-compose -f docker-compose.dev.yml up

# Rebuild and start
docker-compose -f docker-compose.dev.yml up --build

# Stop
docker-compose -f docker-compose.dev.yml down
```

**Access:**
- Frontend: http://localhost:5173 (Vite dev server)
- Backend: http://localhost:8080 (Go server)
- WebSocket: ws://localhost:8080/ws/:roomCode

## Building Images

### Local Build

**Single platform:**

```bash
# Build for current platform
docker build -t two-rooms-boom:latest .

# Build for specific platform
docker build --platform linux/amd64 -t two-rooms-boom:amd64 .
docker build --platform linux/arm64 -t two-rooms-boom:arm64 .
```

**Build with cache optimization:**

```bash
# Enable BuildKit
export DOCKER_BUILDKIT=1

# Build
docker build -t two-rooms-boom:latest .

# Build without cache
docker build --no-cache -t two-rooms-boom:latest .
```

### Multi-Platform Build

**Using buildx:**

```bash
# Create builder (one-time setup)
docker buildx create --name multiarch --use

# Build and push for multiple platforms
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t splkm97/2r1b:0.6 \
  -t splkm97/2r1b:latest \
  --push \
  .
```

### Tagging & Pushing

**Docker Hub:**

```bash
# Login
docker login

# Tag
docker tag two-rooms-boom:latest splkm97/2r1b:0.6
docker tag two-rooms-boom:latest splkm97/2r1b:latest

# Push
docker push splkm97/2r1b:0.6
docker push splkm97/2r1b:latest
```

**Private Registry:**

```bash
# Tag
docker tag two-rooms-boom:latest registry.example.com/2r1b:latest

# Push
docker push registry.example.com/2r1b:latest
```

## Environment Variables

| Variable | Default | Description | Required |
|----------|---------|-------------|----------|
| `PORT` | `8080` | Server port | No |
| `GIN_MODE` | `release` | Gin mode (debug/release/test) | No |
| `FRONTEND_URL` | `http://localhost` | Frontend URL for CORS | No |

**Example Configurations:**

**Development:**
```bash
docker run -p 8080:8080 \
  -e GIN_MODE=debug \
  -e FRONTEND_URL=http://localhost:8080 \
  splkm97/2r1b:latest
```

**Production:**
```bash
docker run -p 8080:8080 \
  -e GIN_MODE=release \
  -e FRONTEND_URL=https://2r1b.example.com \
  splkm97/2r1b:latest
```

**Custom Port:**
```bash
docker run -p 9090:9090 \
  -e PORT=9090 \
  -e GIN_MODE=release \
  splkm97/2r1b:latest
```

## Troubleshooting

### Container Exits Immediately

```bash
# Check logs
docker logs <container-id>
docker-compose logs

# Check exit code
docker inspect <container-id> --format='{{.State.ExitCode}}'

# Run interactively
docker run -it splkm97/2r1b:latest sh
```

### Frontend Not Loading

**Check if files exist:**
```bash
docker run --rm splkm97/2r1b:latest ls -la /app/frontend/dist
```

**Expected output:**
```
-rw-r--r-- 1 appuser appuser   xxx index.html
drwxr-xr-x 2 appuser appuser  xxxx assets/
```

**Test routes:**
```bash
# Should return HTML
curl http://localhost:8080/

# Should return JSON
curl http://localhost:8080/health
# {"status":"ok"}

# Should return JSON
curl http://localhost:8080/api/v1/rooms
```

### Port Already in Use

**Find process:**
```bash
# macOS/Linux
lsof -i :8080

# Linux (alternative)
netstat -tulpn | grep 8080
```

**Solutions:**

1. Use different port:
```bash
docker run -p 9090:8080 splkm97/2r1b:latest
```

2. Stop conflicting container:
```bash
docker ps
docker stop <container-id>
```

3. Change port in docker-compose.yml:
```yaml
ports:
  - "9090:8080"
```

### Image Pull Issues

**Authentication:**
```bash
# Login to Docker Hub
docker login

# Login to private registry
docker login registry.example.com
```

**Network issues:**
```bash
# Use different mirror
docker pull registry.cn-hangzhou.aliyuncs.com/splkm97/2r1b:latest
```

**Manual pull:**
```bash
docker pull splkm97/2r1b:latest
docker images | grep 2r1b
```

### Build Fails

**Clear cache:**
```bash
# Clear build cache
docker builder prune

# Clear all unused data
docker system prune -a

# Rebuild from scratch
docker build --no-cache -t two-rooms-boom:latest .
```

**Check disk space:**
```bash
# Check Docker disk usage
docker system df

# Clean up
docker system prune -a --volumes
```

### Health Check Failing

**Check health status:**
```bash
docker inspect <container-id> --format='{{.State.Health.Status}}'
```

**Check health logs:**
```bash
docker inspect <container-id> --format='{{range .State.Health.Log}}{{.Output}}{{end}}'
```

**Test health endpoint manually:**
```bash
docker exec <container-id> wget -O- http://localhost:8080/health
```

### Hot Reload Not Working (Dev)

**Rebuild containers:**
```bash
docker-compose -f docker-compose.dev.yml up --build
```

**Check volume mounts:**
```bash
docker-compose -f docker-compose.dev.yml config
docker inspect <container-id> --format='{{range .Mounts}}{{.Source}} -> {{.Destination}}{{"\n"}}{{end}}'
```

**Verify file permissions:**
```bash
docker exec <container-id> ls -la /app
```

## Security

### Best Practices

1. **Non-root User** ✅
   - Container runs as `appuser` (UID 1000)
   - Configured in Dockerfile

2. **Minimal Base Image** ✅
   - Alpine Linux (~5MB)
   - Only runtime dependencies

3. **Read-only Filesystem** (Optional)
   ```bash
   docker run -p 8080:8080 \
     --read-only \
     --tmpfs /tmp \
     splkm97/2r1b:latest
   ```

4. **Drop Capabilities**
   ```bash
   docker run -p 8080:8080 \
     --cap-drop=ALL \
     --cap-add=NET_BIND_SERVICE \
     splkm97/2r1b:latest
   ```

5. **Resource Limits**
   ```yaml
   services:
     app:
       deploy:
         resources:
           limits:
             cpus: '0.5'
             memory: 512M
           reservations:
             cpus: '0.1'
             memory: 128M
   ```

6. **Secrets Management**
   ```yaml
   services:
     app:
       secrets:
         - db_password
       environment:
         - DB_PASSWORD_FILE=/run/secrets/db_password

   secrets:
     db_password:
       file: ./secrets/db_password.txt
   ```

7. **Network Isolation**
   ```yaml
   networks:
     frontend:
       driver: bridge
     backend:
       driver: bridge
       internal: true  # No internet access
   ```

### Security Scanning

**Scan image for vulnerabilities:**

```bash
# Using Docker Scout
docker scout cves splkm97/2r1b:latest

# Using Trivy
trivy image splkm97/2r1b:latest

# Using Snyk
snyk container test splkm97/2r1b:latest
```

## Monitoring

### Resource Usage

**Real-time stats:**
```bash
# Single container
docker stats two-rooms-boom

# All containers
docker stats

# Docker Compose
docker-compose stats
```

**Example output:**
```
CONTAINER ID   NAME              CPU %   MEM USAGE / LIMIT   MEM %   NET I/O
abc123         two-rooms-boom    0.50%   120MiB / 512MiB    23.44%  5kB / 10kB
```

### Logging

**View logs:**
```bash
# Follow logs
docker logs -f two-rooms-boom
docker-compose logs -f

# Last 100 lines
docker logs --tail=100 two-rooms-boom
docker-compose logs --tail=100

# Since timestamp
docker logs --since 2023-01-01T00:00:00 two-rooms-boom

# Specific service
docker-compose logs app
```

**Configure logging driver:**
```yaml
services:
  app:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

### Health Monitoring

**Check health:**
```bash
# Container health status
docker inspect --format='{{.State.Health.Status}}' two-rooms-boom

# Health check logs
docker inspect --format='{{range .State.Health.Log}}{{.Output}}{{end}}' two-rooms-boom

# All container states
docker ps --format "table {{.Names}}\t{{.Status}}"
```

**Health check endpoint:**
```bash
# Test manually
curl http://localhost:8080/health

# Expected response
{"status":"ok"}
```

## Cleanup

**Remove containers:**
```bash
# Stop and remove
docker stop two-rooms-boom
docker rm two-rooms-boom

# Docker Compose
docker-compose down
```

**Remove images:**
```bash
# Remove specific image
docker rmi splkm97/2r1b:latest

# Remove unused images
docker image prune

# Remove all unused data
docker system prune -a
```

**Complete cleanup:**
```bash
# Stop all containers
docker stop $(docker ps -aq)

# Remove all containers
docker rm $(docker ps -aq)

# Remove all images
docker rmi $(docker images -q)

# Remove all volumes
docker volume rm $(docker volume ls -q)

# Remove all networks
docker network rm $(docker network ls -q)

# Nuclear option (removes EVERYTHING)
docker system prune -a --volumes
```

## Deployment Options

### Option 1: Docker Compose (Recommended)
Best for single-host deployments.

**Pros:**
- Simple configuration
- Easy to manage
- Built-in health checks
- Automatic restarts

**Cons:**
- Single host only
- No automatic scaling

### Option 2: Kubernetes
Best for production multi-host deployments.

```bash
kubectl apply -f k8s/
```

**Pros:**
- Auto-scaling
- Self-healing
- Load balancing
- Multi-host

**Cons:**
- Complex setup
- Higher resource usage

### Option 3: Docker Swarm
Best for simple multi-host deployments.

```bash
docker swarm init
docker stack deploy -c docker-compose.yml 2r1b
```

**Pros:**
- Native Docker integration
- Simple scaling
- Built-in orchestration

**Cons:**
- Less features than K8s
- Smaller ecosystem

## Performance Tips

1. **Enable BuildKit:**
   ```bash
   export DOCKER_BUILDKIT=1
   docker build -t two-rooms-boom:latest .
   ```

2. **Use Layer Caching:**
   - Dependencies installed before source code
   - Cached in separate layers
   - Faster incremental builds

3. **Multi-stage Builds:**
   - Smaller final image
   - Only runtime dependencies
   - Faster deployment

4. **Resource Limits:**
   ```bash
   docker run -p 8080:8080 \
     --memory="512m" \
     --cpus="0.5" \
     splkm97/2r1b:latest
   ```

5. **Health Check Tuning:**
   ```yaml
   healthcheck:
     interval: 30s      # Check every 30s (not 10s)
     timeout: 3s
     retries: 3
     start_period: 40s  # Give app time to start
   ```

## Additional Resources

- **Dockerfile:** [./Dockerfile](./Dockerfile)
- **Docker Compose:** [./docker-compose.yml](./docker-compose.yml)
- **Kubernetes:** [./k8s/](./k8s/)
- **Backend Docs:** [./backend/README.md](./backend/README.md)
- **Frontend Docs:** [./frontend/README.md](./frontend/README.md)

## Support

For issues and questions:
- GitHub Issues: https://github.com/yourusername/two-rooms-and-a-boom/issues
- Documentation: [README.md](./README.md)
