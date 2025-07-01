const rateLimit = require('express-rate-limit');

// Rate limiting for API endpoints
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
        error: 'Too many requests from this IP, please try again later.'
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Stricter rate limiting for webhook endpoints
const webhookLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 100, // limit each IP to 100 webhook requests per minute
    message: {
        error: 'Too many webhook requests from this IP, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Very strict rate limiting for endpoint creation
const createEndpointLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // limit each IP to 10 endpoint creations per 15 minutes
    message: {
        error: 'Too many endpoint creation requests from this IP, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Security headers middleware
const securityHeaders = (req, res, next) => {
    // Prevent XSS attacks
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');
    
    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // Force HTTPS in production
    if (process.env.NODE_ENV === 'production') {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    
    // Basic CSP
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:;");
    
    next();
};

// Request size limiting middleware
const requestSizeLimit = (limit = '50mb') => {
    return (req, res, next) => {
        const contentLength = req.get('content-length');
        
        if (contentLength) {
            const sizeInMB = parseInt(contentLength) / (1024 * 1024);
            const limitInMB = parseInt(limit);
            
            if (sizeInMB > limitInMB) {
                return res.status(413).json({
                    error: `Request size exceeds ${limit} limit`
                });
            }
        }
        
        next();
    };
};

// Logging middleware for security events
const securityLogger = (req, res, next) => {
    const suspiciousPatterns = [
        /(<script|javascript:|data:text\/html)/i,
        /(union|select|insert|delete|drop|create|alter)/i,
        /(\.\.|\/etc\/|\/var\/|\/usr\/)/i
    ];
    
    const checkForSuspiciousContent = (obj, visited = new Set()) => {
        if (visited.has(obj)) return false;
        visited.add(obj);
        
        if (typeof obj === 'string') {
            return suspiciousPatterns.some(pattern => pattern.test(obj));
        }
        
        if (typeof obj === 'object' && obj !== null) {
            for (const key in obj) {
                if (checkForSuspiciousContent(obj[key], visited)) {
                    return true;
                }
            }
        }
        
        return false;
    };
    
    // Check URL, query parameters, and body for suspicious content
    if (checkForSuspiciousContent(req.url) || 
        checkForSuspiciousContent(req.query) || 
        checkForSuspiciousContent(req.body)) {
        
        console.warn('Suspicious request detected:', {
            ip: req.ip,
            url: req.url,
            method: req.method,
            userAgent: req.get('user-agent'),
            timestamp: new Date().toISOString()
        });
    }
    
    next();
};

module.exports = {
    apiLimiter,
    webhookLimiter,
    createEndpointLimiter,
    securityHeaders,
    requestSizeLimit,
    securityLogger
};