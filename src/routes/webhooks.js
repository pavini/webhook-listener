const express = require('express');
const { WebhookController } = require('../controllers');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// Handle incoming webhook requests (all HTTP methods)
router.all('/:endpointId', 
    asyncHandler(WebhookController.handleWebhook.bind(WebhookController))
);

module.exports = router;