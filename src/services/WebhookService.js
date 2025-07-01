const { Endpoint, Request } = require('../models');

class WebhookService {
    // Process incoming webhook request
    async processWebhook(endpointId, requestData) {
        try {
            // Verify endpoint exists
            const endpoint = await Endpoint.findById(endpointId);
            if (!endpoint) {
                throw new Error('Endpoint not found');
            }
            
            // Create the request record
            const request = await Request.create({
                endpoint_id: endpointId,
                method: requestData.method,
                url: requestData.url,
                headers: requestData.headers,
                body: requestData.body,
                query: requestData.query,
                ip: requestData.ip
            });
            
            return request;
        } catch (error) {
            throw new Error(`Failed to process webhook: ${error.message}`);
        }
    }
    
    // Get request by ID
    async getRequest(requestId) {
        try {
            const request = await Request.findById(requestId);
            if (!request) {
                throw new Error('Request not found');
            }
            
            return request;
        } catch (error) {
            throw new Error(`Failed to get request: ${error.message}`);
        }
    }
    
    // Delete specific request
    async deleteRequest(requestId) {
        try {
            const endpointId = await Request.delete(requestId);
            return endpointId;
        } catch (error) {
            throw new Error(`Failed to delete request: ${error.message}`);
        }
    }
    
    // Extract request data from Express request object
    extractRequestData(req) {
        return {
            method: req.method,
            url: req.originalUrl,
            headers: req.headers,
            body: this.processBody(req.body),
            query: req.query,
            ip: req.ip || req.connection.remoteAddress
        };
    }
    
    // Process request body to ensure it's properly formatted
    processBody(body) {
        if (typeof body === 'string') {
            return body;
        }
        
        if (body === null || body === undefined) {
            return '';
        }
        
        try {
            return JSON.stringify(body);
        } catch (error) {
            return String(body);
        }
    }
    
    // Validate webhook data
    validateWebhookData(data) {
        const required = ['method', 'url'];
        const missing = [];
        
        for (const field of required) {
            if (!data[field]) {
                missing.push(field);
            }
        }
        
        if (missing.length > 0) {
            throw new Error(`Missing required fields: ${missing.join(', ')}`);
        }
        
        return true;
    }
}

module.exports = new WebhookService();