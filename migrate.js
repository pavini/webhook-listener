#!/usr/bin/env node

// Migration CLI tool
const sqlite3 = require('sqlite3').verbose();
const { DatabaseMigrations } = require('./migrations');
const path = require('path');

const command = process.argv[2];
const dbPath = process.env.NODE_ENV === 'production' ? './data/webhooks.db' : './webhooks.db';

console.log(`Using database: ${dbPath}`);
const db = new sqlite3.Database(dbPath);
const migrations = new DatabaseMigrations(db);

async function runCommand() {
    try {
        switch (command) {
            case 'up':
                console.log('Running all pending migrations...');
                await migrations.runMigrations();
                break;
                
            case 'status':
                await migrations.init();
                const currentVersion = await migrations.getCurrentVersion();
                const executedMigrations = await migrations.getExecutedMigrations();
                console.log(`Current database version: ${currentVersion}`);
                console.log(`Executed migrations: ${executedMigrations.join(', ')}`);
                console.log(`Total migrations available: ${migrations.migrations.length}`);
                break;
                
            case 'reset':
                console.log('WARNING: This will reset all migration history!');
                console.log('Database tables will NOT be dropped, only migration tracking will be reset.');
                await migrations.reset();
                console.log('Migration history reset completed.');
                break;
                
            case 'create':
                const migrationName = process.argv[3];
                if (!migrationName) {
                    console.error('Please provide a migration name: npm run migrate create <migration_name>');
                    process.exit(1);
                }
                
                const maxVersion = Math.max(...migrations.migrations.map(m => m.version), 0);
                const newVersion = maxVersion + 1;
                
                console.log(`Creating new migration template: ${newVersion}_${migrationName}.js`);
                console.log('Note: You need to manually add this migration to the migrations.js file');
                console.log(`
New migration template:
{
    version: ${newVersion},
    name: '${migrationName}',
    up: \`
        -- Add your SQL here
        -- Example: ALTER TABLE table_name ADD COLUMN new_column TEXT;
    \`
}
                `);
                break;
                
            default:
                console.log(`
Usage: node migrate.js <command>

Commands:
  up      - Run all pending migrations
  status  - Show current migration status  
  reset   - Reset migration history (WARNING: Use with caution)
  create  - Create a new migration template

Examples:
  node migrate.js up
  node migrate.js status
  node migrate.js create add_new_column
                `);
                break;
        }
    } catch (error) {
        console.error('Migration command failed:', error);
        process.exit(1);
    } finally {
        db.close();
    }
}

runCommand();