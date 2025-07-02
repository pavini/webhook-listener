const { Endpoint, Request } = require('../models');

class EndpointService {
    // Create a new endpoint
    async createEndpoint(name, userId) {
        try {
            const endpoint = await Endpoint.create(name, userId);
            return endpoint;
        } catch (error) {
            throw new Error(`Failed to create endpoint: ${error.message}`);
        }
    }
    
    // Get endpoint by ID
    async getEndpoint(id) {
        try {
            const endpoint = await Endpoint.findById(id);
            if (!endpoint) {
                throw new Error('Endpoint not found');
            }
            
            return await endpoint.getWithRequestCount();
        } catch (error) {
            throw new Error(`Failed to get endpoint: ${error.message}`);
        }
    }
    
    // Get all endpoints for a user
    async getUserEndpoints(userId) {
        try {
            const endpoints = await Endpoint.findByUserId(userId);
            return endpoints;
        } catch (error) {
            throw new Error(`Failed to get user endpoints: ${error.message}`);
        }
    }
    
    // Delete endpoint
    async deleteEndpoint(endpointId, userId) {
        try {
            await Endpoint.delete(endpointId, userId);
            return true;
        } catch (error) {
            throw new Error(`Failed to delete endpoint: ${error.message}`);
        }
    }
    
    // Get endpoint requests
    async getEndpointRequests(endpointId, limit = 100) {
        try {
            // First verify endpoint exists
            const endpoint = await Endpoint.findById(endpointId);
            if (!endpoint) {
                throw new Error('Endpoint not found');
            }
            
            const requests = await Request.findByEndpointId(endpointId, limit);
            return requests;
        } catch (error) {
            throw new Error(`Failed to get endpoint requests: ${error.message}`);
        }
    }
    
    // Clear endpoint requests
    async clearEndpointRequests(endpointId) {
        try {
            // First verify endpoint exists
            const endpoint = await Endpoint.findById(endpointId);
            if (!endpoint) {
                throw new Error('Endpoint not found');
            }
            
            await Request.clearByEndpointId(endpointId);
            return true;
        } catch (error) {
            throw new Error(`Failed to clear endpoint requests: ${error.message}`);
        }
    }
    
    // Migrate endpoints from one user to another
    async migrateEndpoints(fromUserId, toUserId) {
        try {
            if (!fromUserId || !toUserId) {
                throw new Error('Both from_user_id and to_user_id are required');
            }
            
            if (fromUserId === toUserId) {
                throw new Error('Source and destination user IDs cannot be the same');
            }
            
            const count = await Endpoint.migrateUserEndpoints(fromUserId, toUserId);
            return { migratedCount: count };
        } catch (error) {
            throw new Error(`Failed to migrate endpoints: ${error.message}`);
        }
    }
    
    // Generate endpoint URL with proper protocol and host
    generateEndpointUrl(endpoint, protocol, host) {
        return endpoint.getWebhookUrl(protocol, host);
    }
}

module.exports = new EndpointService();