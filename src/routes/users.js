const express = require('express');
const { EndpointController } = require('../controllers');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// Get all endpoints for a user
router.get('/:userId/endpoints', 
    asyncHandler(EndpointController.getUserEndpoints.bind(EndpointController))
);

module.exports = router;