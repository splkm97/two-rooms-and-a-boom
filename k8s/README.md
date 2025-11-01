# Kubernetes Deployment Guide

This directory contains Kubernetes manifests for deploying Two Rooms and a Boom.

## Architecture

- **Single Container**: Both frontend and backend run in one container
- **Single Port**: Exposed on port 8080 (mapped to 80 via Service)
- **Static Serving**: Go backend serves React frontend static files

## Prerequisites

- Docker installed
- Kubernetes cluster (minikube, kind, or cloud provider)
- kubectl configured

## Build Docker Image

```bash
# From project root
docker build -t two-rooms-boom:latest .

# Optional: Tag for registry
docker tag two-rooms-boom:latest your-registry/two-rooms-boom:latest
docker push your-registry/two-rooms-boom:latest
```

## Deploy to Kubernetes

### Option 1: Quick Deploy (All-in-One)

```bash
# Apply all manifests
kubectl apply -f k8s/

# Check status
kubectl get pods
kubectl get svc
```

### Option 2: Step-by-Step Deploy

```bash
# 1. Create ConfigMap (optional, if using custom config)
kubectl apply -f k8s/configmap.yaml

# 2. Create Deployment
kubectl apply -f k8s/deployment.yaml

# 3. Create Service
kubectl apply -f k8s/service.yaml
```

## Access the Application

### For minikube:

```bash
minikube service two-rooms-boom
```

### For cloud providers:

```bash
# Get external IP
kubectl get svc two-rooms-boom

# Access via http://<EXTERNAL-IP>
```

## Configuration

### Update Environment Variables

Edit `k8s/deployment.yaml` and modify the `env` section:

```yaml
env:
- name: PORT
  value: "8080"
- name: GIN_MODE
  value: "release"
- name: FRONTEND_URL
  value: "https://your-production-domain.com"
```

Or use ConfigMap by updating `k8s/configmap.yaml` and referencing it in deployment:

```yaml
envFrom:
- configMapRef:
    name: two-rooms-boom-config
```

## Scaling

```bash
# Scale to 3 replicas
kubectl scale deployment two-rooms-boom --replicas=3

# Check scaling
kubectl get pods
```

## Health Checks

The deployment includes:
- **Liveness Probe**: Checks `/health` endpoint every 10s
- **Readiness Probe**: Checks `/health` endpoint every 5s

## Monitoring

```bash
# Watch pods
kubectl get pods -w

# View logs
kubectl logs -f deployment/two-rooms-boom

# Get pod details
kubectl describe pod <pod-name>
```

## Troubleshooting

### Pod not starting

```bash
# Check events
kubectl describe pod <pod-name>

# Check logs
kubectl logs <pod-name>
```

### Image pull errors

If using a private registry:

```bash
# Create secret
kubectl create secret docker-registry regcred \
  --docker-server=<your-registry> \
  --docker-username=<username> \
  --docker-password=<password>

# Reference in deployment
spec:
  imagePullSecrets:
  - name: regcred
```

### WebSocket connection issues

Ensure your LoadBalancer/Ingress supports WebSocket connections:

```yaml
# For NGINX Ingress
metadata:
  annotations:
    nginx.ingress.kubernetes.io/websocket-services: "two-rooms-boom"
```

## Local Testing with minikube

```bash
# Start minikube
minikube start

# Build image in minikube's Docker daemon
eval $(minikube docker-env)
docker build -t two-rooms-boom:latest .

# Deploy
kubectl apply -f k8s/

# Access
minikube service two-rooms-boom
```

## Production Considerations

1. **Use Ingress**: For production, use an Ingress controller instead of LoadBalancer:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: two-rooms-boom-ingress
spec:
  rules:
  - host: your-domain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: two-rooms-boom
            port:
              number: 80
```

2. **TLS/HTTPS**: Add cert-manager for automatic SSL certificates

3. **Resource Limits**: Adjust based on actual usage patterns

4. **Horizontal Pod Autoscaler**:

```bash
kubectl autoscale deployment two-rooms-boom \
  --cpu-percent=70 \
  --min=2 \
  --max=10
```

5. **Persistent Storage**: If you add a database, use PersistentVolumeClaims

## Cleanup

```bash
# Delete all resources
kubectl delete -f k8s/

# Or delete individually
kubectl delete deployment two-rooms-boom
kubectl delete service two-rooms-boom
kubectl delete configmap two-rooms-boom-config
```
