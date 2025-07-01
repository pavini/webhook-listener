const { v4: uuidv4 } = require('uuid');
const database = require('./Database');

class Request {
    constructor(data = {}) {
        this.id = data.id || null;
        this.endpoint_id = data.endpoint_id || null;
        this.timestamp = data.timestamp || null;
        this.method = data.method || null;
        this.url = data.url || null;
        this.headers = data.headers || null;
        this.body = data.body || null;
        this.query = data.query || null;
        this.ip = data.ip || null;
    }
    
    // Create a new request
    static async create(requestData) {
        const id = uuidv4();
        const timestamp = Date.now();
        
        const data = {
            id,
            endpoint_id: requestData.endpoint_id,
            timestamp,
            method: requestData.method,
            url: requestData.url,
            headers: JSON.stringify(requestData.headers || {}),
            body: typeof requestData.body === 'string' ? requestData.body : JSON.stringify(requestData.body || {}),
            query: JSON.stringify(requestData.query || {}),
            ip: requestData.ip || ''
        };
        
        await database.run(
            'INSERT INTO requests (id, endpoint_id, timestamp, method, url, headers, body, query, ip) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [data.id, data.endpoint_id, data.timestamp, data.method, data.url, data.headers, data.body, data.query, data.ip]
        );
        
        return new Request(data);
    }
    
    // Find requests by endpoint ID
    static async findByEndpointId(endpointId, limit = 100) {
        const rows = await database.all(
            'SELECT * FROM requests WHERE endpoint_id = ? ORDER BY timestamp DESC LIMIT ?',
            [endpointId, limit]
        );
        
        return rows.map(row => {
            const request = new Request(row);
            request.parseJsonFields();
            return request;
        });
    }
    
    // Find request by ID
    static async findById(id) {
        const row = await database.get('SELECT * FROM requests WHERE id = ?', [id]);
        if (row) {
            const request = new Request(row);
            request.parseJsonFields();
            return request;
        }
        return null;
    }
    
    // Delete request by ID
    static async delete(id) {
        const request = await database.get('SELECT endpoint_id FROM requests WHERE id = ?', [id]);
        
        if (!request) {
            throw new Error('Request not found');
        }
        
        await database.run('DELETE FROM requests WHERE id = ?', [id]);
        
        return request.endpoint_id;
    }
    
    // Clear all requests for an endpoint
    static async clearByEndpointId(endpointId) {
        await database.run('DELETE FROM requests WHERE endpoint_id = ?', [endpointId]);
        return true;
    }
    
    // Delete old requests (cleanup)
    static async deleteOldRequests(olderThanTimestamp) {
        const result = await database.run('DELETE FROM requests WHERE timestamp < ?', [olderThanTimestamp]);
        return result.changes;
    }
    
    // Parse JSON fields (headers, query)
    parseJsonFields() {
        try {
            this.headers = typeof this.headers === 'string' ? JSON.parse(this.headers) : this.headers;
        } catch (e) {
            this.headers = {};
        }
        
        try {
            this.query = typeof this.query === 'string' ? JSON.parse(this.query) : this.query;
        } catch (e) {
            this.query = {};
        }
    }
    
    // Convert to JSON for API response
    toJSON() {
        return {
            id: this.id,
            endpoint_id: this.endpoint_id,
            timestamp: this.timestamp,
            method: this.method,
            url: this.url,
            headers: typeof this.headers === 'string' ? JSON.parse(this.headers) : this.headers,
            body: this.body,
            query: typeof this.query === 'string' ? JSON.parse(this.query) : this.query,
            ip: this.ip
        };
    }
}

module.exports = Request;