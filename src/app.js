const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const compression = require('compression');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
const passport = require('passport');
const SQLiteStore = require('connect-sqlite3')(session);

// Import configuration and utilities
const config = require('./config');
const { logger, scheduler } = require('./utils');

// Import models and initialize database
const { Database } = require('./models');

// Import authentication configuration
const { initializePassport } = require('./config/passport');

// Import middleware
const { 
    errorHandler, 
    notFound, 
    securityHeaders, 
    requestSizeLimit,
    securityLogger
} = require('./middleware');

// Import routes
const routes = require('./routes');

// Import WebSocket handler
const { WebSocketHandler } = require('./websocket');

// Import controllers that need Socket.io
const { WebhookController } = require('./controllers');

class Application {
    constructor() {
        this.app = express();
        this.server = http.createServer(this.app);
        this.io = socketIo(this.server, config.socket);
        this.isInitialized = false;
    }
    
    async initialize() {
        try {
            // Validate configuration
            config.validate();
            logger.info('Configuration validated successfully');
            
            // Initialize database
            await Database.initialize();
            logger.info('Database initialized successfully');
            
            // Setup middleware
            this.setupMiddleware();
            
            // Setup authentication
            this.setupAuthentication();
            
            // Setup WebSocket
            this.setupWebSocket();
            
            // Setup routes
            this.setupRoutes();
            
            // Setup error handling
            this.setupErrorHandling();
            
            // Start scheduler
            scheduler.start();
            
            this.isInitialized = true;
            logger.info('Application initialized successfully');
            
        } catch (error) {
            logger.error('Application initialization failed', { error: error.message });
            throw error;
        }
    }
    
    setupMiddleware() {
        // Trust proxy if configured
        if (config.security.trustProxy) {
            this.app.set('trust proxy', true);
        }
        
        // Security headers
        this.app.use(securityHeaders);
        
        // Security logging
        this.app.use(securityLogger);
        
        // Enable gzip compression
        if (config.security.enableCompression) {
            this.app.use(compression());
        }
        
        // CORS
        if (config.security.enableCors) {
            this.app.use(cors());
        }
        
        // Request parsing with size limits
        this.app.use(express.json({ limit: config.limits.json }));
        this.app.use(express.urlencoded({ extended: true, limit: config.limits.urlencoded }));
        this.app.use(express.raw({ type: '*/*', limit: config.limits.raw }));
        
        // Request logging
        if (config.logging.enableRequestLogging) {
            this.app.use(logger.requestLogger());
        }
        
        // Serve static files with proper MIME types
        this.setupStaticFiles();
        
        logger.info('Middleware setup completed');
    }
    
    setupStaticFiles() {
        // Custom middleware for specific files to ensure proper MIME types
        this.app.use('/style.css', (req, res, next) => {
            res.setHeader('Content-Type', 'text/css');
            next();
        });
        
        this.app.use('/app.js', (req, res, next) => {
            res.setHeader('Content-Type', 'application/javascript');
            next();
        });
        
        // Serve static files from public directory
        this.app.use(express.static('public', {
            setHeaders: (res, filePath) => {
                if (filePath.endsWith('.css')) {
                    res.setHeader('Content-Type', 'text/css');
                } else if (filePath.endsWith('.js')) {
                    res.setHeader('Content-Type', 'application/javascript');
                }
            }
        }));
        
        logger.debug('Static file serving configured');
    }
    
    setupAuthentication() {
        // Configure session store using SQLite
        const sessionStore = new SQLiteStore({
            db: 'sessions.db',
            table: 'sessions',
            dir: path.dirname(config.database.path)
        });

        // Session configuration
        this.app.use(session({
            store: sessionStore,
            secret: config.auth.session.secret,
            resave: config.auth.session.resave,
            saveUninitialized: config.auth.session.saveUninitialized,
            cookie: config.auth.session.cookie
        }));

        // Initialize Passport
        this.app.use(passport.initialize());
        this.app.use(passport.session());

        // Configure Passport strategies
        initializePassport(Database.getDatabase());

        // Make user available in app locals for models
        this.app.locals.db = Database.getDatabase();

        logger.info('Authentication setup completed');
    }
    
    setupWebSocket() {
        // Initialize WebSocket handler
        WebSocketHandler.initialize(this.io);
        
        // Set Socket.io instance in WebhookController
        WebhookController.setSocketIO(this.io);
        
        logger.info('WebSocket setup completed');
    }
    
    setupRoutes() {
        // Use main routes
        this.app.use('/', routes);
        
        logger.info('Routes setup completed');
    }
    
    setupErrorHandling() {
        // 404 handler
        this.app.use(notFound);
        
        // Global error handler
        this.app.use(errorHandler);
        
        logger.info('Error handling setup completed');
    }
    
    async start() {
        if (!this.isInitialized) {
            await this.initialize();
        }
        
        return new Promise((resolve, reject) => {
            this.server.listen(config.port, config.host, (err) => {
                if (err) {
                    logger.error('Server failed to start', { error: err.message });
                    reject(err);
                } else {
                    logger.info('Server started successfully', {
                        port: config.port,
                        host: config.host,
                        environment: config.env,
                        url: `http://${config.host}:${config.port}`
                    });
                    
                    console.log(`🚀 Webhook listener running on http://${config.host}:${config.port}`);
                    console.log(`📊 Create endpoints at: http://${config.host}:${config.port}`);
                    console.log(`🧹 Database cleanup scheduled: ${config.cleanup.schedule} (deletes data older than ${config.cleanup.retentionDays} days)`);
                    
                    resolve();
                }
            });
        });
    }
    
    async stop() {
        return new Promise((resolve) => {
            logger.info('Shutting down application...');
            
            // Stop scheduler
            scheduler.stop();
            
            // Close database connection
            Database.close().catch(err => {
                logger.error('Error closing database', { error: err.message });
            });
            
            // Close server
            this.server.close(() => {
                logger.info('Application shut down completed');
                resolve();
            });
        });
    }
    
    // Graceful shutdown handling
    setupGracefulShutdown() {
        const shutdown = async (signal) => {
            logger.info(`Received ${signal}, shutting down gracefully`);
            
            try {
                await this.stop();
                process.exit(0);
            } catch (error) {
                logger.error('Error during shutdown', { error: error.message });
                process.exit(1);
            }
        };
        
        process.on('SIGINT', () => shutdown('SIGINT'));
        process.on('SIGTERM', () => shutdown('SIGTERM'));
        
        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
            logger.error('Uncaught exception', { error: error.message, stack: error.stack });
            shutdown('UNCAUGHT_EXCEPTION');
        });
        
        // Handle unhandled promise rejections
        process.on('unhandledRejection', (reason, promise) => {
            logger.error('Unhandled rejection', { reason, promise });
            shutdown('UNHANDLED_REJECTION');
        });
    }
    
    // Get application instance (for testing)
    getApp() {
        return this.app;
    }
    
    // Get server instance
    getServer() {
        return this.server;
    }
    
    // Get Socket.io instance
    getIO() {
        return this.io;
    }
}

module.exports = Application;