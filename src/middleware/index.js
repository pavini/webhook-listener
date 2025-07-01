const { asyncHandler, errorHandler, notFound } = require('./errorHandler');
const { validateEndpoint, validateUserId, validatePagination, sanitizeBody, validateUUID } = require('./validation');
const { apiLimiter, webhookLimiter, createEndpointLimiter, securityHeaders, requestSizeLimit, securityLogger } = require('./security');

module.exports = {
    // Error handling
    asyncHandler,
    errorHandler,
    notFound,
    
    // Validation
    validateEndpoint,
    validateUserId,
    validatePagination,
    sanitizeBody,
    validateUUID,
    
    // Security
    apiLimiter,
    webhookLimiter,
    createEndpointLimiter,
    securityHeaders,
    requestSizeLimit,
    securityLogger
};