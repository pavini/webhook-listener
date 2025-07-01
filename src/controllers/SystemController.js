const path = require('path');
const fs = require('fs');
const { CleanupService } = require('../services');
const config = require('../config');

class SystemController {
    // Health check endpoint
    async healthCheck(req, res) {
        try {
            const { Database } = require('../models');
            
            // Check database connection
            let databaseStatus = 'connected';
            try {
                await Database.get('SELECT 1');
            } catch (error) {
                databaseStatus = 'disconnected';
            }
            
            // Get memory usage
            const memoryUsage = process.memoryUsage();
            const memoryMB = Math.round(memoryUsage.rss / 1024 / 1024);
            
            // Get uptime
            const uptimeSeconds = process.uptime();
            
            res.json({
                status: databaseStatus === 'connected' ? 'healthy' : 'unhealthy',
                uptime: uptimeSeconds,
                database: databaseStatus,
                memory: `${memoryMB} MB`,
                version: '1.0.0',
                environment: config.env,
                timestamp: Date.now()
            });
        } catch (error) {
            res.status(500).json({
                status: 'error',
                error: error.message,
                timestamp: Date.now()
            });
        }
    }
    
    // Debug endpoint to check files and environment
    async debug(req, res) {
        try {
            const publicPath = path.join(__dirname, '../../public');
            
            const files = fs.readdirSync(publicPath);
            const fileStats = {};
            
            files.forEach(file => {
                const filePath = path.join(publicPath, file);
                const stats = fs.statSync(filePath);
                fileStats[file] = {
                    size: stats.size,
                    modified: stats.mtime
                };
            });
            
            res.json({
                publicPath,
                files,
                fileStats,
                __dirname,
                cwd: process.cwd(),
                nodeVersion: process.version,
                platform: process.platform,
                environment: config.env,
                databasePath: config.database.path
            });
        } catch (error) {
            res.status(500).json({
                error: error.message,
                publicPath: path.join(__dirname, '../../public'),
                __dirname,
                cwd: process.cwd()
            });
        }
    }
    
    // Get cleanup information
    async getCleanupInfo(req, res) {
        try {
            const cleanupInfo = await CleanupService.getLastCleanupInfo();
            
            res.json({
                ...cleanupInfo,
                nextCleanup: CleanupService.getNextCleanupTime(),
                retentionDays: config.cleanup.retentionDays,
                schedule: config.cleanup.schedule
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
    
    // Manually trigger cleanup (for admin/debug purposes)
    async triggerCleanup(req, res) {
        try {
            console.log('Manual cleanup triggered via API');
            const result = await CleanupService.performCleanup();
            
            res.json({
                message: 'Cleanup completed successfully',
                ...result,
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Manual cleanup failed:', error);
            res.status(500).json({ 
                error: 'Cleanup failed',
                details: error.message 
            });
        }
    }
    
    // Get system statistics
    async getSystemStats(req, res) {
        try {
            const { Database } = require('../models');
            
            // Get database statistics
            const endpointCount = await Database.get('SELECT COUNT(*) as count FROM endpoints');
            const requestCount = await Database.get('SELECT COUNT(*) as count FROM requests');
            const cleanupCount = await Database.get('SELECT COUNT(*) as count FROM cleanup_log');
            
            // Get recent activity (last 24 hours)
            const last24Hours = Date.now() - (24 * 60 * 60 * 1000);
            const recentRequests = await Database.get(
                'SELECT COUNT(*) as count FROM requests WHERE timestamp > ?', 
                [last24Hours]
            );
            const recentEndpoints = await Database.get(
                'SELECT COUNT(*) as count FROM endpoints WHERE created_at > ?', 
                [last24Hours]
            );
            
            res.json({
                database: {
                    totalEndpoints: endpointCount.count,
                    totalRequests: requestCount.count,
                    totalCleanups: cleanupCount.count
                },
                activity: {
                    requestsLast24h: recentRequests.count,
                    endpointsLast24h: recentEndpoints.count
                },
                system: {
                    uptime: process.uptime(),
                    memory: process.memoryUsage(),
                    version: process.version,
                    platform: process.platform
                },
                timestamp: Date.now()
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = new SystemController();