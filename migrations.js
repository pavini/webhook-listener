// Database Migration System
const fs = require('fs');
const path = require('path');

class DatabaseMigrations {
    constructor(db) {
        this.db = db;
        this.migrationsTable = 'migrations';
        this.migrations = [
            {
                version: 1,
                name: 'create_initial_tables',
                up: `
                    CREATE TABLE IF NOT EXISTS endpoints (
                        id TEXT PRIMARY KEY,
                        name TEXT NOT NULL,
                        created_at INTEGER NOT NULL
                    );
                    
                    CREATE TABLE IF NOT EXISTS requests (
                        id TEXT PRIMARY KEY,
                        endpoint_id TEXT NOT NULL,
                        method TEXT NOT NULL,
                        url TEXT NOT NULL,
                        headers TEXT NOT NULL,
                        body TEXT,
                        query TEXT NOT NULL,
                        ip TEXT NOT NULL,
                        timestamp INTEGER NOT NULL,
                        FOREIGN KEY (endpoint_id) REFERENCES endpoints (id) ON DELETE CASCADE
                    );
                    
                    CREATE INDEX IF NOT EXISTS idx_requests_endpoint_id ON requests(endpoint_id);
                    CREATE INDEX IF NOT EXISTS idx_requests_timestamp ON requests(timestamp);
                `
            },
            {
                version: 2,
                name: 'add_user_id_to_endpoints',
                up: `
                    -- Add user_id column to endpoints table if it doesn't exist
                    PRAGMA table_info(endpoints);
                `
            },
            {
                version: 3,
                name: 'add_cleanup_log_table',
                up: `
                    CREATE TABLE IF NOT EXISTS cleanup_log (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        cleanup_date INTEGER,
                        endpoints_deleted INTEGER,
                        requests_deleted INTEGER
                    );
                `
            }
        ];
    }

    async init() {
        // Create migrations table if it doesn't exist
        await this.runQuery(`
            CREATE TABLE IF NOT EXISTS ${this.migrationsTable} (
                version INTEGER PRIMARY KEY,
                name TEXT NOT NULL,
                executed_at INTEGER NOT NULL
            )
        `);
    }

    async runQuery(sql, params = []) {
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

    async getQuery(sql, params = []) {
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

    async allQuery(sql, params = []) {
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

    async getExecutedMigrations() {
        try {
            const migrations = await this.allQuery(`SELECT version FROM ${this.migrationsTable} ORDER BY version`);
            return migrations.map(m => m.version);
        } catch (err) {
            console.log('Migrations table does not exist yet, will create it.');
            return [];
        }
    }

    async executeMigration(migration) {
        console.log(`Running migration ${migration.version}: ${migration.name}`);
        
        try {
            // Special handling for user_id column addition
            if (migration.version === 2) {
                await this.addUserIdColumn();
            } else {
                // Execute the migration SQL
                const statements = migration.up.split(';').filter(stmt => stmt.trim());
                for (const statement of statements) {
                    if (statement.trim()) {
                        await this.runQuery(statement.trim());
                    }
                }
            }
            
            // Record the migration as executed
            await this.runQuery(
                `INSERT INTO ${this.migrationsTable} (version, name, executed_at) VALUES (?, ?, ?)`,
                [migration.version, migration.name, Date.now()]
            );
            
            console.log(`Migration ${migration.version} completed successfully`);
        } catch (err) {
            console.error(`Migration ${migration.version} failed:`, err);
            throw err;
        }
    }

    async addUserIdColumn() {
        // Check if user_id column already exists
        const tableInfo = await this.allQuery('PRAGMA table_info(endpoints)');
        const hasUserIdColumn = tableInfo.some(column => column.name === 'user_id');
        
        if (!hasUserIdColumn) {
            console.log('Adding user_id column to endpoints table');
            await this.runQuery('ALTER TABLE endpoints ADD COLUMN user_id TEXT');
            
            // Set default user_id for existing endpoints (for backward compatibility)
            await this.runQuery('UPDATE endpoints SET user_id = ? WHERE user_id IS NULL', ['legacy_user']);
            
            console.log('user_id column added successfully');
        } else {
            console.log('user_id column already exists, skipping');
        }
    }

    async runMigrations() {
        await this.init();
        
        console.log('Checking for pending database migrations...');
        const executedMigrations = await this.getExecutedMigrations();
        const pendingMigrations = this.migrations.filter(m => !executedMigrations.includes(m.version));
        
        if (pendingMigrations.length === 0) {
            console.log('Database is up to date, no migrations needed.');
            return;
        }
        
        console.log(`Found ${pendingMigrations.length} pending migration(s)`);
        
        for (const migration of pendingMigrations) {
            await this.executeMigration(migration);
        }
        
        console.log('All migrations completed successfully!');
    }

    async getCurrentVersion() {
        try {
            const result = await this.getQuery(`SELECT MAX(version) as version FROM ${this.migrationsTable}`);
            return result ? result.version || 0 : 0;
        } catch (err) {
            return 0;
        }
    }

    async reset() {
        console.log('WARNING: Resetting all migrations');
        await this.runQuery(`DROP TABLE IF EXISTS ${this.migrationsTable}`);
        console.log('Migrations table dropped');
    }
}

module.exports = { DatabaseMigrations };