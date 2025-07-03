import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

// Ensure data directory exists
// Use /app/data for production (Docker/EasyPanel), current directory for development
const dataDir = process.env.DB_PATH || (process.env.NODE_ENV === 'production' ? '/app/data' : './data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'hookdebug.db');
console.log('Database path:', dbPath);
console.log('Data directory exists:', fs.existsSync(dataDir));
console.log('Database file exists:', fs.existsSync(dbPath));

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Successfully connected to SQLite database at:', dbPath);
  }
});

// Promisify database methods
db.run = promisify(db.run.bind(db));
db.get = promisify(db.get.bind(db));
db.all = promisify(db.all.bind(db));

// Initialize database schema
export async function initDatabase() {
  try {
    // Users table
    await db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        github_id TEXT UNIQUE NOT NULL,
        username TEXT NOT NULL,
        display_name TEXT,
        avatar_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Endpoints table
    await db.run(`
      CREATE TABLE IF NOT EXISTS endpoints (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        path TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        request_count INTEGER DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Requests table
    await db.run(`
      CREATE TABLE IF NOT EXISTS requests (
        id TEXT PRIMARY KEY,
        endpoint_id TEXT NOT NULL,
        method TEXT NOT NULL,
        url TEXT NOT NULL,
        headers TEXT,
        body TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (endpoint_id) REFERENCES endpoints(id) ON DELETE CASCADE
      )
    `);

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

// User operations
export async function createUser(userData) {
  const { id, github_id, username, display_name, avatar_url } = userData;
  
  try {
    await db.run(
      'INSERT OR REPLACE INTO users (id, github_id, username, display_name, avatar_url) VALUES (?, ?, ?, ?, ?)',
      [id, github_id, username, display_name, avatar_url]
    );
    return userData;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
}

export async function getUserByGithubId(githubId) {
  try {
    return await db.get('SELECT * FROM users WHERE github_id = ?', [githubId]);
  } catch (error) {
    console.error('Error getting user by GitHub ID:', error);
    throw error;
  }
}

export async function getUserById(userId) {
  try {
    return await db.get('SELECT * FROM users WHERE id = ?', [userId]);
  } catch (error) {
    console.error('Error getting user by ID:', error);
    throw error;
  }
}

// Endpoint operations
export async function createEndpoint(endpointData) {
  const { id, user_id, name, path } = endpointData;
  
  try {
    await db.run(
      'INSERT INTO endpoints (id, user_id, name, path) VALUES (?, ?, ?, ?)',
      [id, user_id, name, path]
    );
    return endpointData;
  } catch (error) {
    console.error('Error creating endpoint:', error);
    throw error;
  }
}

export async function getUserEndpoints(userId) {
  try {
    return await db.all('SELECT * FROM endpoints WHERE user_id = ? ORDER BY created_at DESC', [userId]);
  } catch (error) {
    console.error('Error getting user endpoints:', error);
    throw error;
  }
}

export async function getEndpointById(endpointId) {
  try {
    return await db.get('SELECT * FROM endpoints WHERE id = ?', [endpointId]);
  } catch (error) {
    console.error('Error getting endpoint by ID:', error);
    throw error;
  }
}

export async function getEndpointByPath(path) {
  try {
    return await db.get('SELECT * FROM endpoints WHERE path = ?', [path]);
  } catch (error) {
    console.error('Error getting endpoint by path:', error);
    throw error;
  }
}

export async function deleteEndpoint(endpointId) {
  try {
    await db.run('DELETE FROM endpoints WHERE id = ?', [endpointId]);
    return true;
  } catch (error) {
    console.error('Error deleting endpoint:', error);
    throw error;
  }
}

export async function updateEndpointRequestCount(endpointId) {
  try {
    await db.run(
      'UPDATE endpoints SET request_count = request_count + 1 WHERE id = ?',
      [endpointId]
    );
  } catch (error) {
    console.error('Error updating endpoint request count:', error);
    throw error;
  }
}

// Request operations
export async function createRequest(requestData) {
  const { id, endpoint_id, method, url, headers, body } = requestData;
  
  try {
    await db.run(
      'INSERT INTO requests (id, endpoint_id, method, url, headers, body) VALUES (?, ?, ?, ?, ?, ?)',
      [id, endpoint_id, method, url, JSON.stringify(headers), body]
    );
    return requestData;
  } catch (error) {
    console.error('Error creating request:', error);
    throw error;
  }
}

export async function getEndpointRequests(endpointId) {
  try {
    const requests = await db.all(
      'SELECT * FROM requests WHERE endpoint_id = ? ORDER BY timestamp DESC',
      [endpointId]
    );
    
    // Parse headers JSON for each request
    return requests.map(request => ({
      ...request,
      headers: JSON.parse(request.headers || '{}')
    }));
  } catch (error) {
    console.error('Error getting endpoint requests:', error);
    throw error;
  }
}

export async function getUserRequests(userId) {
  try {
    const requests = await db.all(`
      SELECT r.*, e.user_id 
      FROM requests r 
      JOIN endpoints e ON r.endpoint_id = e.id 
      WHERE e.user_id = ? 
      ORDER BY r.timestamp DESC
    `, [userId]);
    
    // Parse headers JSON for each request
    return requests.map(request => ({
      ...request,
      headers: JSON.parse(request.headers || '{}')
    }));
  } catch (error) {
    console.error('Error getting user requests:', error);
    throw error;
  }
}

export async function deleteEndpointRequests(endpointId) {
  try {
    await db.run('DELETE FROM requests WHERE endpoint_id = ?', [endpointId]);
    return true;
  } catch (error) {
    console.error('Error deleting endpoint requests:', error);
    throw error;
  }
}

export { db };