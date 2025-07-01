const express = require('express');
const { WebhookController } = require('../controllers');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// Get specific request
router.get('/:requestId', 
    asyncHandler(WebhookController.getRequest.bind(WebhookController))
);

// Delete specific request
router.delete('/:requestId', 
    asyncHandler(WebhookController.deleteRequest.bind(WebhookController))
);

module.exports = router;