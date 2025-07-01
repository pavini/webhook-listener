const { Endpoint, Request, CleanupLog } = require('../models');
const config = require('../config');

class CleanupService {
    constructor() {
        this.retentionDays = config.cleanup.retentionDays;
    }
    
    // Perform database cleanup
    async performCleanup() {
        try {
            const cutoffTime = Date.now() - (this.retentionDays * 24 * 60 * 60 * 1000);
            
            console.log('Starting database cleanup...');
            console.log(`Deleting data older than ${this.retentionDays} days (before ${new Date(cutoffTime).toISOString()})`);
            
            // Count what will be deleted
            const stats = await this.getCleanupStats(cutoffTime);
            
            console.log(`Will delete ${stats.endpointsToDelete} endpoints and ${stats.requestsToDelete} requests`);
            
            if (stats.endpointsToDelete === 0 && stats.requestsToDelete === 0) {
                console.log('No old data to cleanup');
                return { endpointsDeleted: 0, requestsDeleted: 0 };
            }
            
            // Perform the cleanup
            const requestsDeleted = await Request.deleteOldRequests(cutoffTime);
            const endpointsDeleted = await this.deleteOldEndpoints(cutoffTime);
            
            // Log the cleanup
            await CleanupLog.create(endpointsDeleted, requestsDeleted);
            
            console.log(`Cleanup completed: ${endpointsDeleted} endpoints and ${requestsDeleted} requests deleted`);
            
            return {
                endpointsDeleted,
                requestsDeleted
            };
        } catch (error) {
            console.error('Cleanup failed:', error);
            throw new Error(`Cleanup failed: ${error.message}`);
        }
    }
    
    // Get cleanup statistics before performing cleanup
    async getCleanupStats(cutoffTime) {
        const { Database } = require('../models');
        
        const endpointCountResult = await Database.get(
            'SELECT COUNT(*) as count FROM endpoints WHERE created_at < ?', 
            [cutoffTime]
        );
        
        const requestCountResult = await Database.get(
            'SELECT COUNT(*) as count FROM requests WHERE timestamp < ?', 
            [cutoffTime]
        );
        
        return {
            endpointsToDelete: endpointCountResult.count,
            requestsToDelete: requestCountResult.count
        };
    }
    
    // Delete old endpoints
    async deleteOldEndpoints(cutoffTime) {
        const { Database } = require('../models');
        
        const result = await Database.run(
            'DELETE FROM endpoints WHERE created_at < ?', 
            [cutoffTime]
        );
        
        return result.changes;
    }
    
    // Get last cleanup information
    async getLastCleanupInfo() {
        try {
            const lastCleanup = await CleanupLog.getLastCleanup();
            
            if (!lastCleanup) {
                return {
                    lastCleanup: null,
                    lastCleanupStats: null
                };
            }
            
            return {
                lastCleanup: lastCleanup.cleanup_date,
                lastCleanupStats: {
                    endpointsDeleted: lastCleanup.endpoints_deleted,
                    requestsDeleted: lastCleanup.requests_deleted
                }
            };
        } catch (error) {
            throw new Error(`Failed to get cleanup info: ${error.message}`);
        }
    }
    
    // Get cleanup history
    async getCleanupHistory(limit = 10) {
        try {
            const cleanupLogs = await CleanupLog.getAll(limit);
            return cleanupLogs;
        } catch (error) {
            throw new Error(`Failed to get cleanup history: ${error.message}`);
        }
    }
    
    // Calculate next cleanup time
    getNextCleanupTime() {
        // This would typically be calculated based on the cron schedule
        // For now, return a simple daily calculation
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(now.getDate() + 1);
        tomorrow.setHours(3, 0, 0, 0); // 3 AM next day
        
        return tomorrow.getTime();
    }
}

module.exports = new CleanupService();