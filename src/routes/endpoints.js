const express = require('express');
const { EndpointController } = require('../controllers');
const { validateEndpoint, validateUserId } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// Create new endpoint
router.post('/', 
    validateEndpoint, 
    asyncHandler(EndpointController.createEndpoint.bind(EndpointController))
);

// Get endpoint by ID
router.get('/:id', 
    asyncHandler(EndpointController.getEndpoint.bind(EndpointController))
);

// Delete endpoint
router.delete('/:id', 
    validateUserId, 
    asyncHandler(EndpointController.deleteEndpoint.bind(EndpointController))
);

// Get endpoint requests
router.get('/:id/requests', 
    asyncHandler(EndpointController.getEndpointRequests.bind(EndpointController))
);

// Clear endpoint requests
router.delete('/:id/requests', 
    asyncHandler(EndpointController.clearEndpointRequests.bind(EndpointController))
);

module.exports = router;