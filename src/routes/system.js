const express = require('express');
const { SystemController } = require('../controllers');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// Health check endpoint
router.get('/health', 
    asyncHandler(SystemController.healthCheck.bind(SystemController))
);

// Debug endpoint
router.get('/debug', 
    asyncHandler(SystemController.debug.bind(SystemController))
);

// Cleanup information
router.get('/cleanup-info', 
    asyncHandler(SystemController.getCleanupInfo.bind(SystemController))
);

// Manual cleanup trigger (for admin/debug purposes)
router.post('/cleanup', 
    asyncHandler(SystemController.triggerCleanup.bind(SystemController))
);

// System statistics
router.get('/stats', 
    asyncHandler(SystemController.getSystemStats.bind(SystemController))
);

module.exports = router;