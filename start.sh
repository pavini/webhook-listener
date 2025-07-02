#!/bin/sh

# Fix database permissions if file already exists
if [ -f /app/data/webhooks.db ]; then
  echo "Fixing existing database file permissions..."
  chmod 664 /app/data/webhooks.db
  chown webhookuser:nodejs /app/data/webhooks.db
fi

# Ensure data directory is writable
chmod 775 /app/data
chown webhookuser:nodejs /app/data

# Switch to non-root user and start application
exec su-exec webhookuser:nodejs node server.new.js