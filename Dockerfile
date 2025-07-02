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

# Set ownership for existing files first
RUN chown -R webhookuser:nodejs /app

# Create startup script to fix database permissions (as root)
RUN echo '#!/bin/sh\n\
# Fix database permissions if file already exists\n\
if [ -f /app/data/webhooks.db ]; then\n\
  echo "Fixing existing database file permissions..."\n\
  chmod 664 /app/data/webhooks.db\n\
  chown webhookuser:nodejs /app/data/webhooks.db\n\
fi\n\
\n\
# Ensure data directory is writable\n\
chmod 775 /app/data\n\
chown webhookuser:nodejs /app/data\n\
\n\
# Switch to non-root user and start application\n\
exec su webhookuser -c "node server.new.js"\n\
' > /app/start.sh && chmod +x /app/start.sh

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', (res) => process.exit(res.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

# Start the application with permission fix (as root initially)
CMD ["/app/start.sh"]
