# Docker Compose Quick Start

## Start the Application

```bash
docker-compose up -d
```

Access at: **http://localhost:8080**

## Common Commands

```bash
# View logs
docker-compose logs -f

# Stop
docker-compose down

# Restart
docker-compose restart

# Update to latest image
docker-compose pull && docker-compose up -d
```

## Verify It's Running

```bash
# Check status
docker-compose ps

# Check health
curl http://localhost:8080/health
```

## Configuration

Edit `docker-compose.yml` to change:
- Port (default: 8080)
- Environment variables
- Resource limits

## For Full Documentation

See [DOCKER.md](./DOCKER.md) for complete documentation including:
- Development setup
- Building images
- Troubleshooting
- Security best practices
