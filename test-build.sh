#!/bin/bash

# Script para testar se o Docker build está pegando a versão mais recente

echo "🔍 Testing Docker build cache invalidation..."

# Create a simple test file to verify build freshness
echo "Test timestamp: $(date +%s)" > test-build-marker.txt
echo "Test date: $(date)" >> test-build-marker.txt

# Create a minimal Dockerfile for testing
cat > Dockerfile.test << 'EOF'
FROM node:22-alpine

WORKDIR /app

# Copy our test marker
COPY test-build-marker.txt ./

# Generate build timestamp (should be different every time)
RUN BUILD_TIME=$(date +%s) && \
    echo "Docker build timestamp: $BUILD_TIME" >> test-build-marker.txt && \
    echo "Docker build date: $(date)" >> test-build-marker.txt

# Copy source files
COPY package*.json ./
COPY server.js ./

# Install dependencies
RUN npm ci --only=production

# Add final timestamp
RUN echo "Final build timestamp: $(date +%s)" >> test-build-marker.txt

CMD ["node", "server.js"]
EOF

echo "📦 Building test Docker image..."
docker build -f Dockerfile.test -t hookdebug-test .

echo "🔍 Checking build timestamps in container..."
docker run --rm hookdebug-test cat test-build-marker.txt

echo "🧹 Cleaning up..."
rm -f Dockerfile.test test-build-marker.txt
docker rmi hookdebug-test

echo "✅ Test completed!"