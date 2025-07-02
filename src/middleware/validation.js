// Validation middleware for endpoints
const validateEndpoint = (req, res, next) => {
    const { name, user_id } = req.body;
    
    const errors = [];
    
    // Validate name
    if (!name || typeof name !== 'string' || name.trim() === '') {
        errors.push('Endpoint name is required and must be a non-empty string');
    } else if (name.length > 100) {
        errors.push('Endpoint name must be less than 100 characters');
    }
    
    // Validate user_id
    if (!user_id || typeof user_id !== 'string' || user_id.trim() === '') {
        errors.push('User ID is required and must be a non-empty string');
    }
    
    if (errors.length > 0) {
        return res.status(400).json({
            error: 'Validation failed',
            details: errors
        });
    }
    
    // Sanitize inputs
    req.body.name = name.trim();
    req.body.user_id = user_id.trim();
    
    next();
};

// Validation middleware for user ID in request body
const validateUserId = (req, res, next) => {
    const { user_id } = req.body;
    
    if (!user_id || typeof user_id !== 'string' || user_id.trim() === '') {
        return res.status(400).json({
            error: 'User ID is required'
        });
    }
    
    req.body.user_id = user_id.trim();
    next();
};

// Validation middleware for pagination parameters
const validatePagination = (req, res, next) => {
    const { limit, offset } = req.query;
    
    if (limit !== undefined) {
        const limitNum = parseInt(limit);
        if (isNaN(limitNum) || limitNum < 1 || limitNum > 1000) {
            return res.status(400).json({
                error: 'Limit must be a number between 1 and 1000'
            });
        }
        req.query.limit = limitNum;
    }
    
    if (offset !== undefined) {
        const offsetNum = parseInt(offset);
        if (isNaN(offsetNum) || offsetNum < 0) {
            return res.status(400).json({
                error: 'Offset must be a non-negative number'
            });
        }
        req.query.offset = offsetNum;
    }
    
    next();
};

// Sanitize request body to prevent XSS and injection attacks
const sanitizeBody = (req, res, next) => {
    if (req.body && typeof req.body === 'object') {
        // Basic sanitization - remove any HTML tags from string values
        const sanitizeString = (str) => {
            if (typeof str !== 'string') return str;
            return str.replace(/<[^>]*>/g, '').trim();
        };
        
        const sanitizeObject = (obj) => {
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    if (typeof obj[key] === 'string') {
                        obj[key] = sanitizeString(obj[key]);
                    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                        sanitizeObject(obj[key]);
                    }
                }
            }
        };
        
        sanitizeObject(req.body);
    }
    
    next();
};

// Validate UUID format
const validateUUID = (paramName) => {
    return (req, res, next) => {
        const value = req.params[paramName];
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        
        if (!uuidRegex.test(value)) {
            return res.status(400).json({
                error: `Invalid ${paramName} format`
            });
        }
        
        next();
    };
};

// Validation middleware for endpoint migration
const validateMigration = (req, res, next) => {
    const { from_user_id, to_user_id } = req.body;
    
    const errors = [];
    
    // Validate from_user_id
    if (!from_user_id || typeof from_user_id !== 'string' || from_user_id.trim() === '') {
        errors.push('from_user_id is required and must be a non-empty string');
    }
    
    // Validate to_user_id
    if (!to_user_id || typeof to_user_id !== 'string' || to_user_id.trim() === '') {
        errors.push('to_user_id is required and must be a non-empty string');
    }
    
    // Check if user IDs are the same
    if (from_user_id && to_user_id && from_user_id.trim() === to_user_id.trim()) {
        errors.push('from_user_id and to_user_id cannot be the same');
    }
    
    if (errors.length > 0) {
        return res.status(400).json({
            error: 'Validation failed',
            details: errors
        });
    }
    
    // Sanitize inputs
    req.body.from_user_id = from_user_id.trim();
    req.body.to_user_id = to_user_id.trim();
    
    next();
};

module.exports = {
    validateEndpoint,
    validateUserId,
    validatePagination,
    sanitizeBody,
    validateUUID,
    validateMigration
};