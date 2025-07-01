const fs = require('fs');
const path = require('path');
const config = require('../config');

class Logger {
    constructor() {
        this.logLevel = config.logging.level;
        this.enableRequestLogging = config.logging.enableRequestLogging;
        this.logLevels = {
            error: 0,
            warn: 1,
            info: 2,
            debug: 3
        };
    }
    
    // Get current timestamp in ISO format
    getTimestamp() {
        return new Date().toISOString();
    }
    
    // Check if message should be logged based on level
    shouldLog(level) {
        return this.logLevels[level] <= this.logLevels[this.logLevel];
    }
    
    // Format log message
    formatMessage(level, message, meta = {}) {
        const timestamp = this.getTimestamp();
        const metaString = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
        return `[${timestamp}] ${level.toUpperCase()}: ${message}${metaString}`;
    }
    
    // Log error messages
    error(message, meta = {}) {
        if (this.shouldLog('error')) {
            const formatted = this.formatMessage('error', message, meta);
            console.error(formatted);
            this.writeToFile('error', formatted);
        }
    }
    
    // Log warning messages
    warn(message, meta = {}) {
        if (this.shouldLog('warn')) {
            const formatted = this.formatMessage('warn', message, meta);
            console.warn(formatted);
            this.writeToFile('warn', formatted);
        }
    }
    
    // Log info messages
    info(message, meta = {}) {
        if (this.shouldLog('info')) {
            const formatted = this.formatMessage('info', message, meta);
            console.log(formatted);
            this.writeToFile('info', formatted);
        }
    }
    
    // Log debug messages
    debug(message, meta = {}) {
        if (this.shouldLog('debug')) {
            const formatted = this.formatMessage('debug', message, meta);
            console.log(formatted);
            this.writeToFile('debug', formatted);
        }
    }
    
    // Log HTTP requests
    logRequest(req, res, responseTime) {
        if (!this.enableRequestLogging) return;
        
        const logData = {
            method: req.method,
            url: req.originalUrl,
            status: res.statusCode,
            responseTime: `${responseTime}ms`,
            ip: req.ip,
            userAgent: req.get('user-agent') || 'Unknown'
        };
        
        this.info('HTTP Request', logData);
    }
    
    // Log webhook events
    logWebhook(endpointId, method, success = true, error = null) {
        const logData = {
            endpointId,
            method,
            success,
            timestamp: Date.now()
        };
        
        if (error) {
            logData.error = error.message;
            this.error('Webhook processing failed', logData);
        } else {
            this.info('Webhook processed', logData);
        }
    }
    
    // Log database operations
    logDatabase(operation, table, success = true, error = null) {
        const logData = {
            operation,
            table,
            success,
            timestamp: Date.now()
        };
        
        if (error) {
            logData.error = error.message;
            this.error('Database operation failed', logData);
        } else {
            this.debug('Database operation', logData);
        }
    }
    
    // Write to log file (in production)
    writeToFile(level, message) {
        if (config.isProduction()) {
            try {
                const logsDir = path.join(process.cwd(), 'logs');
                if (!fs.existsSync(logsDir)) {
                    fs.mkdirSync(logsDir, { recursive: true });
                }
                
                const logFile = path.join(logsDir, `${level}.log`);
                fs.appendFileSync(logFile, message + '\n');
            } catch (error) {
                console.error('Failed to write to log file:', error);
            }
        }
    }
    
    // Create express middleware for request logging
    requestLogger() {
        return (req, res, next) => {
            const start = Date.now();
            
            // Override res.end to capture response time
            const originalEnd = res.end;
            res.end = function(...args) {
                const responseTime = Date.now() - start;
                logger.logRequest(req, res, responseTime);
                originalEnd.apply(this, args);
            };
            
            next();
        };
    }
}

const logger = new Logger();
module.exports = logger;