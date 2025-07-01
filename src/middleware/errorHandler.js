// Async handler wrapper to catch errors in async route handlers
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

// Global error handler middleware
const errorHandler = (err, req, res, next) => {
    console.error('Error:', err);
    
    // Default error
    let error = { ...err };
    error.message = err.message;
    
    // Log error details
    console.error(`Error: ${error.message}`);
    if (error.stack) {
        console.error(error.stack);
    }
    
    // Mongoose bad ObjectId
    if (err.name === 'CastError') {
        const message = 'Resource not found';
        error = { message, statusCode: 404 };
    }
    
    // Mongoose duplicate key
    if (err.code === 11000) {
        const message = 'Duplicate field value entered';
        error = { message, statusCode: 400 };
    }
    
    // Mongoose validation error
    if (err.name === 'ValidationError') {
        const message = Object.values(err.errors).map(val => val.message).join(', ');
        error = { message, statusCode: 400 };
    }
    
    // SQLite errors
    if (err.code && err.code.startsWith('SQLITE_')) {
        let message = 'Database error';
        let statusCode = 500;
        
        switch (err.code) {
            case 'SQLITE_CONSTRAINT':
                message = 'Data constraint violation';
                statusCode = 400;
                break;
            case 'SQLITE_NOTFOUND':
                message = 'Resource not found';
                statusCode = 404;
                break;
            case 'SQLITE_READONLY':
                message = 'Database is read-only';
                statusCode = 503;
                break;
            default:
                message = err.message || 'Database error';
        }
        
        error = { message, statusCode };
    }
    
    res.status(error.statusCode || 500).json({
        success: false,
        error: error.message || 'Server Error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
};

// 404 handler
const notFound = (req, res, next) => {
    const error = new Error(`Not found - ${req.originalUrl}`);
    res.status(404);
    next(error);
};

module.exports = {
    asyncHandler,
    errorHandler,
    notFound
};