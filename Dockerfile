# Use Node.js 18 Alpine for smaller image size
FROM node:22-alpine

# Set working directory
WORKDIR /app

# Add non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S webhookuser -u 1001

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy application code
COPY . .

# Create directory for SQLite database with proper permissions
RUN mkdir -p /app/data && chmod 775 /app/data

# Fix any existing database file permissions
RUN find /app -name "*.db" -exec chmod 664 {} \; || true

# Set ownership
RUN chown -R webhookuser:nodejs /app

# Ensure data directory has write permissions for the user
RUN chmod 775 /app/data

# Switch to non-root user
USER webhookuser

# Verify permissions
RUN ls -la /app/data /app/*.db 2>/dev/null || echo "No database files found yet"

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', (res) => process.exit(res.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

# Start the application
CMD ["node", "server.new.js"]
