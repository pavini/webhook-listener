#!/usr/bin/env node

const Application = require('./src/app');
const { logger } = require('./src/utils');

// Create application instance
const app = new Application();

// Setup graceful shutdown
app.setupGracefulShutdown();

// Start the application
app.start().catch((error) => {
    logger.error('Failed to start application', { error: error.message });
    process.exit(1);
});