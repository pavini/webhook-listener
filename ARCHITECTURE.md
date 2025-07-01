# Webhook Listener - New Architecture Documentation

## Overview

This document describes the new modular architecture implemented for the webhook-listener project. The refactoring improves code organization, maintainability, testability, and contribution standards.

## Architecture Principles

### 1. Separation of Concerns
- **Models**: Data access and business entities
- **Services**: Business logic and core functionality  
- **Controllers**: HTTP request handling and response formatting
- **Routes**: API endpoint definitions and middleware application
- **Middleware**: Cross-cutting concerns (validation, security, error handling)
- **Utils**: Helper functions and utilities
- **WebSocket**: Real-time communication handling

### 2. Dependency Injection
- Configuration centralized and injected where needed
- Database connections managed through a single instance
- Services injected into controllers for testability

### 3. Error Handling
- Centralized error handling middleware
- Consistent error response formats
- Proper error logging and monitoring

## Directory Structure

```
src/
├── config/           # Configuration management
│   └── index.js      # Main configuration with environment variables
├── controllers/      # Request handlers
│   ├── EndpointController.js    # Endpoint CRUD operations
│   ├── WebhookController.js     # Webhook processing
│   ├── SystemController.js      # Health checks and system info
│   └── index.js                 # Controller exports
├── middleware/       # Express middleware
│   ├── errorHandler.js   # Error handling and async wrappers
│   ├── validation.js     # Input validation and sanitization
│   ├── security.js       # Rate limiting and security headers
│   └── index.js          # Middleware exports
├── models/          # Data models and database logic
│   ├── Database.js       # Database connection and operations
│   ├── Endpoint.js       # Endpoint model and CRUD
│   ├── Request.js        # Request model and CRUD
│   ├── CleanupLog.js     # Cleanup logging model
│   └── index.js          # Model exports
├── routes/          # API route definitions
│   ├── endpoints.js      # Endpoint management routes
│   ├── users.js          # User-related routes
│   ├── webhooks.js       # Webhook handling routes
│   ├── requests.js       # Request management routes
│   ├── system.js         # System/admin routes
│   └── index.js          # Main router
├── services/        # Business logic layer
│   ├── EndpointService.js    # Endpoint business logic
│   ├── WebhookService.js     # Webhook processing logic
│   ├── CleanupService.js     # Data cleanup logic
│   └── index.js              # Service exports
├── utils/           # Helper functions and utilities
│   ├── logger.js         # Logging utility
│   ├── scheduler.js      # Cron job management
│   ├── helpers.js        # General helper functions
│   └── index.js          # Utility exports
├── websocket/       # WebSocket handling
│   ├── WebSocketHandler.js   # Socket.io event management
│   └── index.js              # WebSocket exports
├── app.js           # Main application class
└── index.js         # Main entry point for imports
```

## Key Components

### Configuration (`src/config/`)

Centralized configuration management with environment variable support:

```javascript
const config = require('./src/config');

// Access configuration
config.port              // Server port
config.database.path     // Database path
config.cleanup.schedule  // Cleanup cron schedule
config.isProduction()    // Environment checking
```

### Models (`src/models/`)

Data access layer with promise-based database operations:

```javascript
const { Endpoint, Request } = require('./src/models');

// Create endpoint
const endpoint = await Endpoint.create(name, userId);

// Find requests
const requests = await Request.findByEndpointId(endpointId);
```

### Services (`src/services/`)

Business logic layer that handles core application functionality:

```javascript
const { EndpointService, WebhookService } = require('./src/services');

// Process webhook through service
const request = await WebhookService.processWebhook(endpointId, requestData);

// Get user endpoints
const endpoints = await EndpointService.getUserEndpoints(userId);
```

### Controllers (`src/controllers/`)

HTTP request handlers that use services and return responses:

```javascript
// Clean, focused controller methods
async createEndpoint(req, res) {
    try {
        const { name, user_id } = req.body;
        const endpoint = await EndpointService.createEndpoint(name, user_id);
        res.status(201).json(endpoint.toJSON());
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
}
```

### Middleware (`src/middleware/`)

Reusable middleware for cross-cutting concerns:

- **Validation**: Input validation and sanitization
- **Security**: Rate limiting, headers, XSS protection
- **Error Handling**: Centralized error processing

### WebSocket (`src/websocket/`)

Real-time communication handling:

```javascript
const { WebSocketHandler } = require('./src/websocket');

// Emit to endpoint watchers
WebSocketHandler.emitNewRequest(endpointId, requestData);
```

### Utilities (`src/utils/`)

Helper functions and utilities:

- **Logger**: Structured logging with levels
- **Scheduler**: Cron job management  
- **Helpers**: Common utility functions

## Usage

### Starting the Application

```bash
# New architecture
npm start

# Development mode
npm run dev

# Old architecture (fallback)
npm run start:old
```

### Migration from Old Architecture

The new architecture is backward compatible. Both versions can run:

1. **New version**: `npm start` (uses `server.new.js`)
2. **Old version**: `npm run start:old` (uses `server.js`)

### Adding New Features

1. **Model**: Add data access logic in `src/models/`
2. **Service**: Implement business logic in `src/services/`
3. **Controller**: Handle HTTP requests in `src/controllers/`
4. **Routes**: Define API endpoints in `src/routes/`
5. **Middleware**: Add validation/security as needed

Example flow for a new feature:

```javascript
// 1. Model (src/models/Feature.js)
class Feature {
    static async create(data) { /* ... */ }
    static async findById(id) { /* ... */ }
}

// 2. Service (src/services/FeatureService.js)
class FeatureService {
    async createFeature(data) {
        // Business logic
        return await Feature.create(data);
    }
}

// 3. Controller (src/controllers/FeatureController.js)
class FeatureController {
    async create(req, res) {
        const feature = await FeatureService.createFeature(req.body);
        res.json(feature);
    }
}

// 4. Routes (src/routes/features.js)
router.post('/', validateFeature, asyncHandler(FeatureController.create));
```

## Benefits

### For Development
- **Modularity**: Clear separation of concerns
- **Testability**: Easy to unit test individual components
- **Maintainability**: Changes are isolated to specific layers
- **Scalability**: Easy to extend and add new features

### For Contributors
- **Clear Structure**: Easy to understand where code belongs
- **Consistent Patterns**: Standardized approaches across the codebase
- **Documentation**: Well-documented architecture and patterns
- **Standards**: Enforced coding standards and best practices

### For Production
- **Error Handling**: Robust error handling and logging
- **Security**: Built-in security middleware and validation
- **Performance**: Optimized database queries and caching
- **Monitoring**: Comprehensive logging and health checks

## Migration Guide

### Controllers
Old monolithic route handlers are now split into:
- Controller methods (business logic)
- Route definitions (endpoint mapping)
- Middleware (validation, security)

### Database Access
Direct database calls are now abstracted through:
- Models (data access layer)
- Services (business logic)
- Promise-based APIs

### Configuration
Hardcoded values are now centralized in:
- Environment variables
- Configuration module
- Proper validation

### Error Handling
Ad-hoc error handling is now:
- Centralized middleware
- Consistent error formats
- Proper logging

## Future Enhancements

### Testing
- Unit tests for models, services, controllers
- Integration tests for API endpoints
- WebSocket testing utilities

### Linting/Formatting
- ESLint configuration
- Prettier code formatting
- Pre-commit hooks

### Documentation
- API documentation generation
- Code documentation standards
- Contribution guidelines

### Monitoring
- Application metrics
- Performance monitoring
- Health check endpoints

## Backward Compatibility

The old `server.js` remains functional for:
- Gradual migration
- Fallback support
- Comparison testing

Both architectures can run simultaneously during the transition period.