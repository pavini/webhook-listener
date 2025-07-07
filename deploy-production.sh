#!/bin/bash

# Production deployment script for HookDebug
# This script ensures fresh builds every time

set -e

echo "🚀 Starting HookDebug production deployment..."

# Generate unique cache bust value
export CACHE_BUST=$(date +%s)
echo "📅 Cache bust value: $CACHE_BUST"

# Stop any running containers
echo "🛑 Stopping existing containers..."
docker-compose -f docker-compose.production.yml down 2>/dev/null || true

# Remove old images to ensure fresh build
echo "🧹 Cleaning up old images..."
docker rmi $(docker images -q hookdebug* 2>/dev/null) 2>/dev/null || true

# Prune build cache for completely fresh build
echo "🗑️  Pruning Docker build cache..."
docker builder prune -f

# Build and start with cache bust
echo "🔨 Building fresh production image..."
CACHE_BUST=$CACHE_BUST docker-compose -f docker-compose.production.yml build --no-cache

echo "🚀 Starting production container..."
CACHE_BUST=$CACHE_BUST docker-compose -f docker-compose.production.yml up -d

# Wait for health check
echo "🔍 Waiting for application to be healthy..."
sleep 10

# Check if container is running
if docker-compose -f docker-compose.production.yml ps | grep -q "Up"; then
    echo "✅ Production deployment successful!"
    echo "🌐 Application available at: http://localhost:3001"
    echo "📊 Build info available at: http://localhost:3001/build-info"
    
    # Show build info in container
    echo "🔖 Build info in container:"
    docker-compose -f docker-compose.production.yml exec hookdebug cat /app/build-info.txt 2>/dev/null || echo "Build info not available yet"
else
    echo "❌ Deployment failed! Check logs:"
    docker-compose -f docker-compose.production.yml logs
    exit 1
fi