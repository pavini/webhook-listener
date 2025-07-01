const { WebhookService } = require('../services');

class WebhookController {
    constructor() {
        this.io = null;
    }
    
    // Set Socket.io instance
    setSocketIO(io) {
        this.io = io;
    }
    
    // Handle incoming webhook requests
    async handleWebhook(req, res) {
        try {
            const { endpointId } = req.params;
            
            // Extract request data
            const requestData = WebhookService.extractRequestData(req);
            
            // Validate request data
            WebhookService.validateWebhookData(requestData);
            
            // Process the webhook
            const request = await WebhookService.processWebhook(endpointId, requestData);
            
            // Emit to Socket.io clients watching this endpoint
            if (this.io) {
                this.io.to(endpointId).emit('new-request', request.toJSON());
            }
            
            // Return success response
            res.status(200).json({
                message: 'Webhook received successfully',
                id: request.id,
                endpoint_id: endpointId,
                timestamp: request.timestamp
            });
        } catch (error) {
            console.error('Webhook processing error:', error);
            
            if (error.message.includes('not found')) {
                res.status(404).json({ error: error.message });
            } else {
                res.status(500).json({ error: 'Internal server error' });
            }
        }
    }
    
    // Delete specific request
    async deleteRequest(req, res) {
        try {
            const { requestId } = req.params;
            
            const endpointId = await WebhookService.deleteRequest(requestId);
            
            // Notify clients about the deleted request
            if (this.io) {
                this.io.to(endpointId).emit('request-deleted', requestId);
            }
            
            res.json({ message: 'Request deleted successfully' });
        } catch (error) {
            if (error.message.includes('not found')) {
                res.status(404).json({ error: error.message });
            } else {
                res.status(500).json({ error: error.message });
            }
        }
    }
    
    // Get specific request
    async getRequest(req, res) {
        try {
            const { requestId } = req.params;
            
            const request = await WebhookService.getRequest(requestId);
            
            res.json(request.toJSON());
        } catch (error) {
            if (error.message.includes('not found')) {
                res.status(404).json({ error: error.message });
            } else {
                res.status(500).json({ error: error.message });
            }
        }
    }
}

module.exports = new WebhookController();