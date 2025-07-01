// Utility helper functions

// Debounce function to limit rapid function calls
const debounce = (func, wait, immediate = false) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            timeout = null;
            if (!immediate) func(...args);
        };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func(...args);
    };
};

// Throttle function to limit function calls to once per specified time period
const throttle = (func, wait) => {
    let inThrottle;
    return function executedFunction(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, wait);
        }
    };
};

// Check if a string is valid JSON
const isValidJSON = (str) => {
    if (typeof str !== 'string') return false;
    try {
        JSON.parse(str);
        return true;
    } catch {
        return false;
    }
};

// Safely parse JSON with fallback
const safeJSONParse = (str, fallback = null) => {
    try {
        return JSON.parse(str);
    } catch {
        return fallback;
    }
};

// Format JSON string with proper indentation
const formatJSON = (obj, indent = 2) => {
    try {
        if (typeof obj === 'string') {
            obj = JSON.parse(obj);
        }
        return JSON.stringify(obj, null, indent);
    } catch {
        return obj;
    }
};

// Generate a random string of specified length
const generateRandomString = (length = 10, charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789') => {
    let result = '';
    for (let i = 0; i < length; i++) {
        result += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return result;
};

// Validate UUID format
const isValidUUID = (uuid) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
};

// Format relative time (e.g., "2 minutes ago")
const formatRelativeTime = (timestamp, locale = 'en-US') => {
    const now = Date.now();
    const diff = now - timestamp;
    
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
    
    if (diff < 60000) { // Less than 1 minute
        return rtf.format(-Math.floor(diff / 1000), 'second');
    } else if (diff < 3600000) { // Less than 1 hour
        return rtf.format(-Math.floor(diff / 60000), 'minute');
    } else if (diff < 86400000) { // Less than 1 day
        return rtf.format(-Math.floor(diff / 3600000), 'hour');
    } else if (diff < 2592000000) { // Less than 30 days
        return rtf.format(-Math.floor(diff / 86400000), 'day');
    } else {
        return new Date(timestamp).toLocaleDateString(locale);
    }
};

// Format bytes to human readable format
const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

// Deep clone an object
const deepClone = (obj) => {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(item => deepClone(item));
    if (typeof obj === 'object') {
        const clonedObj = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                clonedObj[key] = deepClone(obj[key]);
            }
        }
        return clonedObj;
    }
    return obj;
};

// Merge objects deeply
const deepMerge = (target, source) => {
    const result = { ...target };
    
    for (const key in source) {
        if (source.hasOwnProperty(key)) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                result[key] = deepMerge(result[key] || {}, source[key]);
            } else {
                result[key] = source[key];
            }
        }
    }
    
    return result;
};

// Sleep function for async/await
const sleep = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
};

// Retry function with exponential backoff
const retry = async (fn, maxAttempts = 3, baseDelay = 1000) => {
    let lastError;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            
            if (attempt === maxAttempts) {
                throw error;
            }
            
            const delay = baseDelay * Math.pow(2, attempt - 1);
            await sleep(delay);
        }
    }
    
    throw lastError;
};

// Sanitize string to prevent XSS
const sanitizeString = (str) => {
    if (typeof str !== 'string') return str;
    
    return str
        .replace(/[<>]/g, '') // Remove angle brackets
        .replace(/javascript:/gi, '') // Remove javascript: protocol
        .replace(/data:/gi, '') // Remove data: protocol
        .trim();
};

// Parse content type from headers
const parseContentType = (headers) => {
    const contentType = headers['content-type'] || '';
    const parts = contentType.split(';');
    
    return {
        type: parts[0].trim().toLowerCase(),
        charset: parts.find(part => part.includes('charset'))?.split('=')[1]?.trim() || 'utf-8'
    };
};

// Validate HTTP method
const isValidHttpMethod = (method) => {
    const validMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS', 'CONNECT', 'TRACE'];
    return validMethods.includes(method.toUpperCase());
};

module.exports = {
    debounce,
    throttle,
    isValidJSON,
    safeJSONParse,
    formatJSON,
    generateRandomString,
    isValidUUID,
    formatRelativeTime,
    formatBytes,
    deepClone,
    deepMerge,
    sleep,
    retry,
    sanitizeString,
    parseContentType,
    isValidHttpMethod
};