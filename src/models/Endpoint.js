const { v4: uuidv4 } = require('uuid');
const database = require('./Database');

class Endpoint {
    constructor(data = {}) {
        this.id = data.id || null;
        this.name = data.name || null;
        this.user_id = data.user_id || null;
        this.created_at = data.created_at || null;
    }
    
    // Create a new endpoint
    static async create(name, userId) {
        if (!name || name.trim() === '') {
            throw new Error('Endpoint name is required');
        }
        if (!userId || userId.trim() === '') {
            throw new Error('User ID is required');
        }
        
        const endpointId = uuidv4();
        const timestamp = Date.now();
        
        const result = await database.run(
            'INSERT INTO endpoints (id, name, user_id, created_at) VALUES (?, ?, ?, ?)',
            [endpointId, name.trim(), userId.trim(), timestamp]
        );
        
        return new Endpoint({
            id: endpointId,
            name: name.trim(),
            user_id: userId.trim(),
            created_at: timestamp
        });
    }
    
    // Find endpoint by ID
    static async findById(id) {
        const row = await database.get('SELECT * FROM endpoints WHERE id = ?', [id]);
        return row ? new Endpoint(row) : null;
    }
    
    // Find all endpoints for a user
    static async findByUserId(userId) {
        const rows = await database.all(`
            SELECT e.*, COUNT(r.id) as request_count
            FROM endpoints e
            LEFT JOIN requests r ON e.id = r.endpoint_id
            WHERE e.user_id = ?
            GROUP BY e.id
            ORDER BY e.created_at DESC
        `, [userId]);
        
        return rows.map(row => new Endpoint(row));
    }
    
    // Delete endpoint and all its requests
    static async delete(id, userId) {
        // Verify endpoint belongs to user
        const endpoint = await database.get('SELECT * FROM endpoints WHERE id = ? AND user_id = ?', [id, userId]);
        
        if (!endpoint) {
            throw new Error('Endpoint not found or not owned by user');
        }
        
        // Delete all requests for this endpoint first
        await database.run('DELETE FROM requests WHERE endpoint_id = ?', [id]);
        
        // Then delete the endpoint
        await database.run('DELETE FROM endpoints WHERE id = ?', [id]);
        
        return true;
    }
    
    // Migrate all endpoints from one user to another
    static async migrateUserEndpoints(fromUserId, toUserId) {
        if (!fromUserId || !toUserId) {
            throw new Error('Both from_user_id and to_user_id are required');
        }
        
        if (fromUserId === toUserId) {
            throw new Error('Source and destination user IDs cannot be the same');
        }
        
        // Get count of endpoints to migrate
        const countResult = await database.get('SELECT COUNT(*) as count FROM endpoints WHERE user_id = ?', [fromUserId]);
        const endpointCount = countResult.count;
        
        if (endpointCount === 0) {
            return 0;
        }
        
        // Update all endpoints from fromUserId to toUserId
        const result = await database.run('UPDATE endpoints SET user_id = ? WHERE user_id = ?', [toUserId, fromUserId]);
        
        return result.changes || 0;
    }
    
    // Get endpoint with request count
    async getWithRequestCount() {
        const row = await database.get(`
            SELECT e.*, COUNT(r.id) as request_count
            FROM endpoints e
            LEFT JOIN requests r ON e.id = r.endpoint_id
            WHERE e.id = ?
            GROUP BY e.id
        `, [this.id]);
        
        if (row) {
            Object.assign(this, row);
        }
        
        return this;
    }
    
    // Generate webhook URL
    getWebhookUrl(protocol, host) {
        return `${protocol}://${host}/webhook/${this.id}`;
    }
    
    // Convert to JSON
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            user_id: this.user_id,
            created_at: this.created_at,
            request_count: this.request_count || 0
        };
    }
}

module.exports = Endpoint;