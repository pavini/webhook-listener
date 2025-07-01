const database = require('./Database');

class CleanupLog {
    constructor(data = {}) {
        this.id = data.id || null;
        this.cleanup_date = data.cleanup_date || null;
        this.endpoints_deleted = data.endpoints_deleted || 0;
        this.requests_deleted = data.requests_deleted || 0;
    }
    
    // Create a new cleanup log entry
    static async create(endpointsDeleted, requestsDeleted) {
        const cleanupDate = Date.now();
        
        const result = await database.run(
            'INSERT INTO cleanup_log (cleanup_date, endpoints_deleted, requests_deleted) VALUES (?, ?, ?)',
            [cleanupDate, endpointsDeleted, requestsDeleted]
        );
        
        return new CleanupLog({
            id: result.lastID,
            cleanup_date: cleanupDate,
            endpoints_deleted: endpointsDeleted,
            requests_deleted: requestsDeleted
        });
    }
    
    // Get the last cleanup info
    static async getLastCleanup() {
        const row = await database.get(
            'SELECT * FROM cleanup_log ORDER BY cleanup_date DESC LIMIT 1'
        );
        
        return row ? new CleanupLog(row) : null;
    }
    
    // Get all cleanup logs
    static async getAll(limit = 50) {
        const rows = await database.all(
            'SELECT * FROM cleanup_log ORDER BY cleanup_date DESC LIMIT ?',
            [limit]
        );
        
        return rows.map(row => new CleanupLog(row));
    }
    
    // Convert to JSON
    toJSON() {
        return {
            id: this.id,
            cleanup_date: this.cleanup_date,
            endpoints_deleted: this.endpoints_deleted,
            requests_deleted: this.requests_deleted
        };
    }
}

module.exports = CleanupLog;