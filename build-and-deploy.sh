#!/bin/bash

# Build and Deploy Script for Two Rooms and a Boom
# This script builds the Docker image and deploys to Kubernetes

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
IMAGE_NAME="two-rooms-boom"
IMAGE_TAG="${1:-latest}"
REGISTRY="${REGISTRY:-}"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Two Rooms and a Boom - Build & Deploy${NC}"
echo -e "${GREEN}========================================${NC}"

# Step 1: Build Docker Image
echo -e "\n${YELLOW}Step 1: Building Docker image...${NC}"
docker build -t ${IMAGE_NAME}:${IMAGE_TAG} .

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Docker image built successfully${NC}"
else
    echo -e "${RED}✗ Docker build failed${NC}"
    exit 1
fi

# Step 2: Tag and Push to Registry (if REGISTRY is set)
if [ -n "$REGISTRY" ]; then
    echo -e "\n${YELLOW}Step 2: Pushing to registry ${REGISTRY}...${NC}"
    docker tag ${IMAGE_NAME}:${IMAGE_TAG} ${REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}
    docker push ${REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Image pushed to registry${NC}"
    else
        echo -e "${RED}✗ Push failed${NC}"
        exit 1
    fi
else
    echo -e "\n${YELLOW}Step 2: Skipping registry push (REGISTRY not set)${NC}"
fi

# Step 3: Deploy to Kubernetes
echo -e "\n${YELLOW}Step 3: Deploying to Kubernetes...${NC}"

# Update image in deployment if using registry
if [ -n "$REGISTRY" ]; then
    kubectl set image deployment/two-rooms-boom \
        two-rooms-boom=${REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}
else
    # Apply all manifests
    kubectl apply -f k8s/
fi

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Deployed to Kubernetes${NC}"
else
    echo -e "${RED}✗ Deployment failed${NC}"
    exit 1
fi

# Step 4: Wait for rollout
echo -e "\n${YELLOW}Step 4: Waiting for rollout to complete...${NC}"
kubectl rollout status deployment/two-rooms-boom --timeout=5m

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Rollout completed successfully${NC}"
else
    echo -e "${RED}✗ Rollout failed or timed out${NC}"
    exit 1
fi

# Step 5: Show status
echo -e "\n${YELLOW}Step 5: Current status${NC}"
kubectl get pods -l app=two-rooms-boom
kubectl get svc two-rooms-boom

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}"

# Show access instructions
EXTERNAL_IP=$(kubectl get svc two-rooms-boom -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null)
if [ -n "$EXTERNAL_IP" ]; then
    echo -e "\n${GREEN}Access your application at: http://${EXTERNAL_IP}${NC}"
else
    echo -e "\n${YELLOW}Run 'kubectl get svc two-rooms-boom' to get the external IP${NC}"
    echo -e "${YELLOW}For minikube: run 'minikube service two-rooms-boom'${NC}"
fi

echo -e "\n${YELLOW}To view logs:${NC} kubectl logs -f deployment/two-rooms-boom"
echo -e "${YELLOW}To scale:${NC} kubectl scale deployment two-rooms-boom --replicas=3"
