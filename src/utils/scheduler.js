const cron = require('node-cron');
const { CleanupService } = require('../services');
const config = require('../config');
const logger = require('./logger');

class Scheduler {
    constructor() {
        this.jobs = new Map();
    }
    
    // Start all scheduled jobs
    start() {
        this.scheduleCleanup();
        logger.info('Scheduler started with all jobs');
    }
    
    // Stop all scheduled jobs
    stop() {
        this.jobs.forEach((job, name) => {
            job.stop();
            logger.info(`Stopped scheduled job: ${name}`);
        });
        this.jobs.clear();
        logger.info('All scheduled jobs stopped');
    }
    
    // Schedule database cleanup job
    scheduleCleanup() {
        const schedule = config.cleanup.schedule;
        
        if (!cron.validate(schedule)) {
            logger.error('Invalid cleanup schedule configuration', { schedule });
            return;
        }
        
        const cleanupJob = cron.schedule(schedule, async () => {
            logger.info('Starting scheduled database cleanup');
            
            try {
                const result = await CleanupService.performCleanup();
                logger.info('Scheduled cleanup completed successfully', result);
            } catch (error) {
                logger.error('Scheduled cleanup failed', { error: error.message });
            }
        }, {
            scheduled: false, // Don't start immediately
            timezone: 'UTC' // Use UTC for consistency
        });
        
        this.jobs.set('cleanup', cleanupJob);
        cleanupJob.start();
        
        logger.info('Database cleanup scheduled', { 
            schedule, 
            retentionDays: config.cleanup.retentionDays 
        });
    }
    
    // Add a custom scheduled job
    addJob(name, schedule, task, options = {}) {
        if (this.jobs.has(name)) {
            logger.warn(`Job ${name} already exists, stopping existing job`);
            this.jobs.get(name).stop();
        }
        
        if (!cron.validate(schedule)) {
            throw new Error(`Invalid cron schedule: ${schedule}`);
        }
        
        const job = cron.schedule(schedule, async () => {
            logger.debug(`Running scheduled job: ${name}`);
            
            try {
                await task();
                logger.debug(`Scheduled job completed: ${name}`);
            } catch (error) {
                logger.error(`Scheduled job failed: ${name}`, { error: error.message });
            }
        }, {
            scheduled: false,
            timezone: options.timezone || 'UTC',
            ...options
        });
        
        this.jobs.set(name, job);
        job.start();
        
        logger.info(`Added scheduled job: ${name}`, { schedule });
        return job;
    }
    
    // Remove a scheduled job
    removeJob(name) {
        const job = this.jobs.get(name);
        if (job) {
            job.stop();
            this.jobs.delete(name);
            logger.info(`Removed scheduled job: ${name}`);
            return true;
        }
        return false;
    }
    
    // Get status of all jobs
    getJobsStatus() {
        const status = {};
        
        this.jobs.forEach((job, name) => {
            status[name] = {
                running: job.running || false,
                lastDate: job.lastDate || null,
                nextDate: job.nextDate || null
            };
        });
        
        return status;
    }
    
    // Manually trigger cleanup (for testing/admin purposes)
    async triggerCleanup() {
        logger.info('Manual cleanup triggered');
        
        try {
            const result = await CleanupService.performCleanup();
            logger.info('Manual cleanup completed successfully', result);
            return result;
        } catch (error) {
            logger.error('Manual cleanup failed', { error: error.message });
            throw error;
        }
    }
}

module.exports = new Scheduler();