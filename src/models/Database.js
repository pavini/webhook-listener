const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const config = require('../config');
const { DatabaseMigrations } = require('../../migrations');

class Database {
    constructor() {
        this.db = null;
        this.isInitialized = false;
    }
    
    async initialize() {
        if (this.isInitialized) {
            return this.db;
        }
        
        try {
            await this.connect();
            await this.runMigrations();
            await this.createIndexes();
            this.isInitialized = true;
            console.log('Database initialized successfully');
            return this.db;
        } catch (error) {
            console.error('Database initialization failed:', error);
            throw error;
        }
    }
    
    async connect() {
        const dbPath = config.database.path;
        
        // Check and fix permissions if needed
        await this.checkPermissions(dbPath);
        
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
                if (err) {
                    console.error('Database connection failed:', err);
                    console.error('Database path:', dbPath);
                    console.error('Current working directory:', process.cwd());
                    
                    if (err.code === 'SQLITE_CANTOPEN') {
                        console.error('This is likely a permission issue. Try:');
                        console.error(`chmod 644 ${dbPath}`);
                        console.error(`chown $USER ${dbPath}`);
                    }
                    
                    reject(err);
                } else {
                    console.log(`Connected to SQLite database at: ${dbPath}`);
                    resolve();
                }
            });
        });
    }
    
    async checkPermissions(dbPath) {
        try {
            const dbDir = path.dirname(dbPath);
            const stats = fs.statSync(dbDir);
            console.log(`Database directory permissions: ${stats.mode.toString(8)}`);
            
            // Test write permission by creating a test file
            const testFile = path.join(dbDir, 'test-write.tmp');
            fs.writeFileSync(testFile, 'test');
            fs.unlinkSync(testFile);
            console.log('Database directory write test: OK');
            
            // Check if database file exists and fix permissions if needed
            if (fs.existsSync(dbPath)) {
                const dbStats = fs.statSync(dbPath);
                console.log(`Database file permissions: ${dbStats.mode.toString(8)}`);
                
                // If database file is read-only, try to fix permissions
                if (!(dbStats.mode & 0o200)) {
                    console.log('Database file is read-only, attempting to fix permissions...');
                    try {
                        fs.chmodSync(dbPath, 0o644);
                        console.log('Database file permissions fixed');
                    } catch (chmodError) {
                        console.error('Failed to fix database file permissions:', chmodError);
                        throw chmodError;
                    }
                }
            } else {
                console.log('Database file does not exist, will be created');
            }
        } catch (error) {
            console.error('Database permission check failed:', error);
            throw error;
        }
    }
    
    async runMigrations() {
        const migrations = new DatabaseMigrations(this.db);
        await migrations.runMigrations();
    }
    
    async createIndexes() {
        const indexes = [
            'CREATE INDEX IF NOT EXISTS idx_requests_timestamp ON requests(timestamp)',
            'CREATE INDEX IF NOT EXISTS idx_requests_endpoint_id ON requests(endpoint_id)',
            'CREATE INDEX IF NOT EXISTS idx_endpoints_created_at ON endpoints(created_at)'
        ];
        
        for (const indexSql of indexes) {
            await this.run(indexSql);
        }
    }
    
    // Promise wrapper for db.run
    run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ lastID: this.lastID, changes: this.changes });
                }
            });
        });
    }
    
    // Promise wrapper for db.get
    get(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }
    
    // Promise wrapper for db.all
    all(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }
    
    // Close database connection
    close() {
        return new Promise((resolve, reject) => {
            if (this.db) {
                this.db.close((err) => {
                    if (err) {
                        reject(err);
                    } else {
                        console.log('Database connection closed');
                        resolve();
                    }
                });
            } else {
                resolve();
            }
        });
    }
    
    // Get database instance (for backward compatibility)
    getInstance() {
        return this.db;
    }
    
    // Get database instance (alias for getInstance)
    getDatabase() {
        return this.db;
    }
}

module.exports = new Database();