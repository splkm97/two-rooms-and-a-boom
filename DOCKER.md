# Docker Deployment Guide

This document explains how to use Docker and Docker Compose to run the Two Rooms and a Boom application.

## Quick Start (Production)

### Using Docker Compose

```bash
# Start the application
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the application
docker-compose down
```

The application will be available at: http://localhost:8080

### Using Docker directly

```bash
# Pull the image
docker pull splkm97/2r1b:0.1

# Run the container
docker run -d \
  --name two-rooms-boom \
  -p 8080:8080 \
  -e GIN_MODE=release \
  -e PORT=8080 \
  splkm97/2r1b:0.1

# View logs
docker logs -f two-rooms-boom

# Stop and remove
docker stop two-rooms-boom
docker rm two-rooms-boom
```

## Production Deployment

### docker-compose.yml

The production docker-compose file includes:
- Health checks
- Automatic restart policy
- Network isolation
- Environment variables

**Configuration:**

```yaml
services:
  two-rooms-boom:
    image: splkm97/2r1b:0.1
    ports:
      - "8080:8080"
    environment:
      - PORT=8080
      - GIN_MODE=release
      - FRONTEND_URL=http://localhost:8080
    restart: unless-stopped
```

**Commands:**

```bash
# Start in detached mode
docker-compose up -d

# View logs
docker-compose logs -f two-rooms-boom

# Restart service
docker-compose restart

# Stop and remove
docker-compose down

# Pull latest image and restart
docker-compose pull
docker-compose up -d
```

## Development Setup

### docker-compose.dev.yml

The development docker-compose file includes:
- Hot reload for frontend and backend
- Volume mounts for live code changes
- Debug mode enabled
- Separate frontend and backend services

**Start development environment:**

```bash
# Start all services
docker-compose -f docker-compose.dev.yml up

# Start in detached mode
docker-compose -f docker-compose.dev.yml up -d

# Rebuild and start
docker-compose -f docker-compose.dev.yml up --build

# Stop
docker-compose -f docker-compose.dev.yml down
```

**Access:**
- Frontend (Vite): http://localhost:5173
- Backend API: http://localhost:8080
- WebSocket: ws://localhost:8080/ws/{roomCode}

## Building the Image

### Build locally

```bash
# Build for x86/amd64 (production)
docker build --platform linux/amd64 -t splkm97/2r1b:0.1 .

# Build for multiple platforms
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t splkm97/2r1b:0.1 \
  --push .
```

### Build and tag versions

```bash
# Build with version tag
docker build -t splkm97/2r1b:0.1 .
docker build -t splkm97/2r1b:latest .

# Push to Docker Hub
docker push splkm97/2r1b:0.1
docker push splkm97/2r1b:latest
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 8080 | Port for the application |
| `GIN_MODE` | release | Gin mode (release/debug) |
| `FRONTEND_URL` | http://localhost | Frontend URL for CORS |

## Health Checks

The application includes a health check endpoint:

```bash
# Check health
curl http://localhost:8080/health

# Expected response
{"status":"ok"}
```

## Networking

### Production (docker-compose.yml)
- Network: `two-rooms-boom-network`
- Exposed port: 8080

### Development (docker-compose.dev.yml)
- Network: `two-rooms-boom-dev-network`
- Frontend port: 5173
- Backend port: 8080

## Troubleshooting

### Container won't start

```bash
# Check logs
docker-compose logs two-rooms-boom

# Check container status
docker ps -a

# Inspect container
docker inspect two-rooms-boom
```

### Port already in use

```bash
# Find process using port 8080
lsof -i :8080

# Kill the process or change port in docker-compose.yml
ports:
  - "8081:8080"  # Use port 8081 instead
```

### Image pull issues

```bash
# Login to Docker Hub (if using private registry)
docker login

# Pull image manually
docker pull splkm97/2r1b:0.1
```

### Development hot reload not working

```bash
# Rebuild containers
docker-compose -f docker-compose.dev.yml up --build

# Check volume mounts
docker-compose -f docker-compose.dev.yml config
```

## Production Deployment Options

### Option 1: Docker Compose
Simple single-host deployment using docker-compose.yml

### Option 2: Kubernetes
For scalable multi-host deployment:
```bash
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
```

### Option 3: Docker Swarm
For multi-host Docker deployment:
```bash
docker stack deploy -c docker-compose.yml two-rooms-boom
```

## Cleanup

```bash
# Stop and remove containers
docker-compose down

# Remove with volumes
docker-compose down -v

# Remove image
docker rmi splkm97/2r1b:0.1

# Clean up all unused Docker resources
docker system prune -a
```

## Monitoring

### View resource usage

```bash
# Container stats
docker stats two-rooms-boom

# Docker Compose stats
docker-compose stats
```

### View logs

```bash
# Follow logs
docker-compose logs -f

# Last 100 lines
docker-compose logs --tail=100

# Specific service
docker-compose logs two-rooms-boom
```

## Security

### Best Practices

1. **Run as non-root user** (already configured in Dockerfile)
2. **Use health checks** (configured in docker-compose.yml)
3. **Set resource limits:**

```yaml
services:
  two-rooms-boom:
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          cpus: '0.1'
          memory: 128M
```

4. **Use secrets for sensitive data:**

```yaml
services:
  two-rooms-boom:
    secrets:
      - db_password
    environment:
      - DB_PASSWORD_FILE=/run/secrets/db_password

secrets:
  db_password:
    file: ./secrets/db_password.txt
```

## Additional Resources

- [Dockerfile](./Dockerfile)
- [Kubernetes Deployment](./k8s/)
- [Backend Documentation](./backend/README.md)
- [Frontend Documentation](./frontend/README.md)
