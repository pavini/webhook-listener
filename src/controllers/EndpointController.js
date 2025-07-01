const { EndpointService } = require('../services');

class EndpointController {
    // Create new endpoint
    async createEndpoint(req, res) {
        try {
            const { name, user_id } = req.body;
            
            const endpoint = await EndpointService.createEndpoint(name, user_id);
            const endpointWithUrl = {
                ...endpoint.toJSON(),
                url: EndpointService.generateEndpointUrl(endpoint, req.protocol, req.get('host'))
            };
            
            res.status(201).json(endpointWithUrl);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }
    
    // Get endpoint by ID
    async getEndpoint(req, res) {
        try {
            const { id } = req.params;
            
            const endpoint = await EndpointService.getEndpoint(id);
            const endpointWithUrl = {
                ...endpoint.toJSON(),
                url: EndpointService.generateEndpointUrl(endpoint, req.protocol, req.get('host'))
            };
            
            res.json(endpointWithUrl);
        } catch (error) {
            if (error.message.includes('not found')) {
                res.status(404).json({ error: error.message });
            } else {
                res.status(500).json({ error: error.message });
            }
        }
    }
    
    // Get all endpoints for a user
    async getUserEndpoints(req, res) {
        try {
            const { userId } = req.params;
            
            const endpoints = await EndpointService.getUserEndpoints(userId);
            const endpointsWithUrls = endpoints.map(endpoint => ({
                ...endpoint.toJSON(),
                url: EndpointService.generateEndpointUrl(endpoint, req.protocol, req.get('host'))
            }));
            
            res.json(endpointsWithUrls);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
    
    // Delete endpoint
    async deleteEndpoint(req, res) {
        try {
            const { id } = req.params;
            const { user_id } = req.body;
            
            if (!user_id) {
                return res.status(400).json({ error: 'User ID is required' });
            }
            
            await EndpointService.deleteEndpoint(id, user_id);
            
            res.json({ message: 'Endpoint and all its requests deleted successfully' });
        } catch (error) {
            if (error.message.includes('not found') || error.message.includes('not owned')) {
                res.status(404).json({ error: error.message });
            } else {
                res.status(500).json({ error: error.message });
            }
        }
    }
    
    // Get endpoint requests
    async getEndpointRequests(req, res) {
        try {
            const { id } = req.params;
            const limit = parseInt(req.query.limit) || 100;
            
            const requests = await EndpointService.getEndpointRequests(id, limit);
            
            res.json(requests.map(request => request.toJSON()));
        } catch (error) {
            if (error.message.includes('not found')) {
                res.status(404).json({ error: error.message });
            } else {
                res.status(500).json({ error: error.message });
            }
        }
    }
    
    // Clear endpoint requests
    async clearEndpointRequests(req, res) {
        try {
            const { id } = req.params;
            
            await EndpointService.clearEndpointRequests(id);
            
            res.json({ message: 'Requests cleared for endpoint' });
        } catch (error) {
            if (error.message.includes('not found')) {
                res.status(404).json({ error: error.message });
            } else {
                res.status(500).json({ error: error.message });
            }
        }
    }
}

module.exports = new EndpointController();