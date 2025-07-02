const path = require('path');
const fs = require('fs');

class Config {
    constructor() {
        this.env = process.env.NODE_ENV || 'development';
        this.port = process.env.PORT || 3000;
        this.host = process.env.HOST || '0.0.0.0';
        
        // Database configuration
        this.database = {
            path: this.getDatabasePath(),
            maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS) || 10,
            timeout: parseInt(process.env.DB_TIMEOUT) || 30000
        };
        
        // Socket.io configuration
        this.socket = {
            cors: {
                origin: process.env.CORS_ORIGIN || "*",
                methods: ["GET", "POST"]
            }
        };
        
        // Request limits
        this.limits = {
            json: process.env.JSON_LIMIT || '50mb',
            urlencoded: process.env.URLENCODED_LIMIT || '50mb',
            raw: process.env.RAW_LIMIT || '50mb'
        };
        
        // Cleanup configuration
        this.cleanup = {
            schedule: process.env.CLEANUP_SCHEDULE || '0 3 * * *', // 3 AM daily
            retentionDays: parseInt(process.env.DATA_RETENTION_DAYS) || 60
        };
        
        // Security settings
        this.security = {
            enableCors: process.env.ENABLE_CORS !== 'false',
            enableCompression: process.env.ENABLE_COMPRESSION !== 'false',
            trustProxy: process.env.TRUST_PROXY === 'true'
        };
        
        // Logging configuration
        this.logging = {
            level: process.env.LOG_LEVEL || (this.env === 'production' ? 'info' : 'debug'),
            enableRequestLogging: process.env.ENABLE_REQUEST_LOGGING !== 'false'
        };
        
        // Authentication configuration
        this.auth = {
            github: {
                clientId: process.env.GITHUB_CLIENT_ID,
                clientSecret: process.env.GITHUB_CLIENT_SECRET,
                callbackURL: `${process.env.BASE_URL || 'http://localhost:3000'}/auth/github/callback`
            },
            session: {
                secret: process.env.SESSION_SECRET || 'default-secret-change-in-production',
                resave: false,
                saveUninitialized: false,
                cookie: {
                    secure: false, // Allow cookies over HTTP in development
                    httpOnly: true,
                    maxAge: 24 * 60 * 60 * 1000, // 24 hours
                    sameSite: 'lax'
                }
            }
        };
    }
    
    getDatabasePath() {
        if (this.env === 'production') {
            // Check if there's a direct file mount (like EasyPanel)
            const directMount = './webhooks.db';
            const dataMount = './data/webhooks.db';
            
            if (fs.existsSync(directMount)) {
                console.log('Using direct database file mount:', directMount);
                return directMount;
            } else {
                console.log('Using data directory mount:', dataMount);
                // Ensure data directory exists
                const dataDir = './data';
                if (!fs.existsSync(dataDir)) {
                    fs.mkdirSync(dataDir, { recursive: true });
                }
                return dataMount;
            }
        } else {
            return process.env.DB_PATH || './webhooks.db';
        }
    }
    
    isProduction() {
        return this.env === 'production';
    }
    
    isDevelopment() {
        return this.env === 'development';
    }
    
    isTest() {
        return this.env === 'test';
    }
    
    // Get configuration for specific module
    get(key, defaultValue = null) {
        const keys = key.split('.');
        let value = this;
        
        for (const k of keys) {
            if (value[k] !== undefined) {
                value = value[k];
            } else {
                return defaultValue;
            }
        }
        
        return value;
    }
    
    // Validate required configuration
    validate() {
        const required = [
            'port',
            'database.path'
        ];
        
        // In production, require GitHub OAuth credentials
        if (this.env === 'production') {
            required.push('auth.github.clientId', 'auth.github.clientSecret', 'auth.session.secret');
        }
        
        const missing = [];
        for (const key of required) {
            if (this.get(key) === null || this.get(key) === undefined) {
                missing.push(key);
            }
        }
        
        if (missing.length > 0) {
            throw new Error(`Missing required configuration: ${missing.join(', ')}`);
        }
        
        return true;
    }
}

module.exports = new Config();