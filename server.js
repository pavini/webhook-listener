const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
const cron = require('node-cron');
const compression = require('compression');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

// Enable gzip compression
app.use(compression());

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.raw({ type: '*/*', limit: '50mb' }));

// Serve static files with proper MIME types and logging
app.use('/style.css', (req, res, next) => {
  console.log('Serving style.css...');
  res.setHeader('Content-Type', 'text/css');
  next();
});

app.use('/app.js', (req, res, next) => {
  console.log('Serving app.js...');
  res.setHeader('Content-Type', 'application/javascript');
  next();
});

app.use(express.static('public', {
  setHeaders: (res, path) => {
    console.log(`Serving static file: ${path}`);
    if (path.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    } else if (path.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    }
  }
}));

const dbPath = process.env.NODE_ENV === 'production' ? './data/webhooks.db' : './webhooks.db';
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  // Create endpoints table
  db.run(`CREATE TABLE IF NOT EXISTS endpoints (
    id TEXT PRIMARY KEY,
    name TEXT,
    user_id TEXT,
    created_at INTEGER
  )`);
  
  // Create requests table with all columns
  db.run(`CREATE TABLE IF NOT EXISTS requests (
    id TEXT PRIMARY KEY,
    endpoint_id TEXT,
    timestamp INTEGER,
    method TEXT,
    url TEXT,
    headers TEXT,
    body TEXT,
    query TEXT,
    ip TEXT,
    FOREIGN KEY (endpoint_id) REFERENCES endpoints (id)
  )`);

  // Check if endpoint_id column exists and add it if not (migration)
  db.all("PRAGMA table_info(requests)", (err, columns) => {
    if (err) {
      console.error('Error checking table schema:', err);
      return;
    }
    
    const hasEndpointId = columns.some(col => col.name === 'endpoint_id');
    if (!hasEndpointId) {
      console.log('Adding endpoint_id column to requests table...');
      db.run(`ALTER TABLE requests ADD COLUMN endpoint_id TEXT`, (err) => {
        if (err) {
          console.error('Error adding endpoint_id column:', err);
        } else {
          console.log('Successfully added endpoint_id column');
        }
      });
    }

    const hasQuery = columns.some(col => col.name === 'query');
    if (!hasQuery) {
      console.log('Adding query column to requests table...');
      db.run(`ALTER TABLE requests ADD COLUMN query TEXT`, (err) => {
        if (err) {
          console.error('Error adding query column:', err);
        } else {
          console.log('Successfully added query column');
        }
      });
    }

    const hasIp = columns.some(col => col.name === 'ip');
    if (!hasIp) {
      console.log('Adding ip column to requests table...');
      db.run(`ALTER TABLE requests ADD COLUMN ip TEXT`, (err) => {
        if (err) {
          console.error('Error adding ip column:', err);
        } else {
          console.log('Successfully added ip column');
        }
      });
    }
  });

  // Check if user_id column exists in endpoints table and add it if not
  db.all("PRAGMA table_info(endpoints)", (err, columns) => {
    if (err) {
      console.error('Error checking endpoints table schema:', err);
      return;
    }
    
    const hasUserId = columns.some(col => col.name === 'user_id');
    if (!hasUserId) {
      console.log('Adding user_id column to endpoints table...');
      db.run(`ALTER TABLE endpoints ADD COLUMN user_id TEXT`, (err) => {
        if (err) {
          console.error('Error adding user_id column:', err);
        } else {
          console.log('Successfully added user_id column to endpoints table');
        }
      });
    }
  });

  // Create cleanup log table
  db.run(`CREATE TABLE IF NOT EXISTS cleanup_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cleanup_date INTEGER,
    endpoints_deleted INTEGER,
    requests_deleted INTEGER
  )`);

  // Create indexes for better performance (will be created after table migrations)
  setTimeout(() => {
    db.run(`CREATE INDEX IF NOT EXISTS idx_requests_timestamp ON requests(timestamp)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_requests_endpoint_id ON requests(endpoint_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_endpoints_created_at ON endpoints(created_at)`);
  }, 1000);
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: Date.now(),
    version: '1.0.0'
  });
});

// Debug endpoint to check if files exist
app.get('/api/debug', (req, res) => {
  const fs = require('fs');
  const publicPath = path.join(__dirname, 'public');
  
  try {
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
      cwd: process.cwd()
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      publicPath,
      __dirname,
      cwd: process.cwd()
    });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Create new endpoint
app.post('/api/endpoints', (req, res) => {
  const { name, user_id } = req.body;
  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'Endpoint name is required' });
  }
  if (!user_id || user_id.trim() === '') {
    return res.status(400).json({ error: 'User ID is required' });
  }
  
  const endpointId = uuidv4();
  const timestamp = Date.now();
  
  db.run(
    'INSERT INTO endpoints (id, name, user_id, created_at) VALUES (?, ?, ?, ?)',
    [endpointId, name.trim(), user_id.trim(), timestamp],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      
      res.json({
        id: endpointId,
        name: name.trim(),
        user_id: user_id.trim(),
        created_at: timestamp,
        url: `${req.protocol}://${req.get('host')}/webhook/${endpointId}`
      });
    }
  );
});

// Get all endpoints for a user
app.get('/api/users/:userId/endpoints', (req, res) => {
  const { userId } = req.params;
  
  db.all(`
    SELECT e.*, COUNT(r.id) as request_count
    FROM endpoints e
    LEFT JOIN requests r ON e.id = r.endpoint_id
    WHERE e.user_id = ?
    GROUP BY e.id
    ORDER BY e.created_at DESC
  `, [userId], (err, endpoints) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    const endpointsWithUrls = endpoints.map(endpoint => ({
      ...endpoint,
      url: `${req.protocol}://${req.get('host')}/webhook/${endpoint.id}`
    }));
    
    res.json(endpointsWithUrls);
  });
});

// Get endpoint info
app.get('/api/endpoints/:id', (req, res) => {
  const { id } = req.params;
  
  db.get('SELECT * FROM endpoints WHERE id = ?', [id], (err, endpoint) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    if (!endpoint) {
      res.status(404).json({ error: 'Endpoint not found' });
      return;
    }
    
    res.json({
      ...endpoint,
      url: `${req.protocol}://${req.get('host')}/webhook/${endpoint.id}`
    });
  });
});

// Delete endpoint (and all its requests)
app.delete('/api/endpoints/:id', (req, res) => {
  const { id } = req.params;
  const { user_id } = req.body;
  
  if (!user_id) {
    return res.status(400).json({ error: 'User ID is required' });
  }
  
  // Verify endpoint belongs to user
  db.get('SELECT * FROM endpoints WHERE id = ? AND user_id = ?', [id, user_id], (err, endpoint) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    if (!endpoint) {
      res.status(404).json({ error: 'Endpoint not found or not owned by user' });
      return;
    }
    
    // Delete all requests for this endpoint first
    db.run('DELETE FROM requests WHERE endpoint_id = ?', [id], (err) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      
      // Then delete the endpoint
      db.run('DELETE FROM endpoints WHERE id = ?', [id], (err) => {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        
        // Notify clients that this endpoint is deleted
        io.to(id).emit('endpoint-deleted');
        res.json({ message: 'Endpoint and all its requests deleted successfully' });
      });
    });
  });
});

// Get requests for specific endpoint
app.get('/api/endpoints/:id/requests', (req, res) => {
  const { id } = req.params;
  
  db.all('SELECT * FROM requests WHERE endpoint_id = ? ORDER BY timestamp DESC LIMIT 100', [id], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    const requests = rows.map(row => ({
      ...row,
      headers: JSON.parse(row.headers),
      query: JSON.parse(row.query)
    }));
    
    res.json(requests);
  });
});

// Clear requests for specific endpoint
app.delete('/api/endpoints/:id/requests', (req, res) => {
  const { id } = req.params;
  
  db.run('DELETE FROM requests WHERE endpoint_id = ?', [id], (err) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    io.to(id).emit('requests-cleared');
    res.json({ message: 'Requests cleared for endpoint' });
  });
});

// Delete specific request
app.delete('/api/requests/:requestId', (req, res) => {
  const { requestId } = req.params;
  
  // First get the endpoint_id to notify clients
  db.get('SELECT endpoint_id FROM requests WHERE id = ?', [requestId], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    if (!row) {
      res.status(404).json({ error: 'Request not found' });
      return;
    }
    
    const endpointId = row.endpoint_id;
    
    // Delete the request
    db.run('DELETE FROM requests WHERE id = ?', [requestId], (err) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      
      // Notify clients about the deleted request
      io.to(endpointId).emit('request-deleted', requestId);
      res.json({ message: 'Request deleted successfully' });
    });
  });
});

app.all('/webhook/:endpointId', (req, res) => {
  const { endpointId } = req.params;
  
  // Verify endpoint exists
  db.get('SELECT id FROM endpoints WHERE id = ?', [endpointId], (err, endpoint) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: 'Database error' });
      return;
    }
    
    if (!endpoint) {
      res.status(404).json({ error: 'Endpoint not found' });
      return;
    }
    
    const requestData = {
      id: uuidv4(),
      endpoint_id: endpointId,
      timestamp: Date.now(),
      method: req.method,
      url: req.originalUrl,
      headers: JSON.stringify(req.headers),
      body: typeof req.body === 'string' ? req.body : JSON.stringify(req.body),
      query: JSON.stringify(req.query),
      ip: req.ip || req.connection.remoteAddress
    };

    db.run(
      'INSERT INTO requests (id, endpoint_id, timestamp, method, url, headers, body, query, ip) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [requestData.id, requestData.endpoint_id, requestData.timestamp, requestData.method, requestData.url, requestData.headers, requestData.body, requestData.query, requestData.ip],
      function(err) {
        if (err) {
          console.error(err);
          res.status(500).json({ error: 'Database error' });
          return;
        }

        const responseData = {
          ...requestData,
          headers: JSON.parse(requestData.headers),
          query: JSON.parse(requestData.query)
        };

        // Emit only to clients watching this specific endpoint
        io.to(endpointId).emit('new-request', responseData);
        
        res.status(200).json({ 
          message: 'Webhook received successfully',
          id: requestData.id,
          endpoint_id: endpointId,
          timestamp: requestData.timestamp
        });
      }
    );
  });
});

io.on('connection', (socket) => {
  console.log('Client connected');
  
  // Join endpoint room
  socket.on('join-endpoint', (endpointId) => {
    socket.join(endpointId);
    console.log(`Client joined endpoint room: ${endpointId}`);
  });
  
  // Leave endpoint room
  socket.on('leave-endpoint', (endpointId) => {
    socket.leave(endpointId);
    console.log(`Client left endpoint room: ${endpointId}`);
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Database cleanup function
function cleanupOldData() {
  const sixtyDaysAgo = Date.now() - (60 * 24 * 60 * 60 * 1000); // 60 days in milliseconds
  
  console.log('Starting database cleanup...');
  
  // Count what will be deleted
  db.get('SELECT COUNT(*) as count FROM endpoints WHERE created_at < ?', [sixtyDaysAgo], (err, endpointCount) => {
    if (err) {
      console.error('Error counting endpoints for cleanup:', err);
      return;
    }
    
    db.get('SELECT COUNT(*) as count FROM requests WHERE timestamp < ?', [sixtyDaysAgo], (err, requestCount) => {
      if (err) {
        console.error('Error counting requests for cleanup:', err);
        return;
      }
      
      const endpointsToDelete = endpointCount.count;
      const requestsToDelete = requestCount.count;
      
      console.log(`Will delete ${endpointsToDelete} endpoints and ${requestsToDelete} requests older than 60 days`);
      
      if (endpointsToDelete === 0 && requestsToDelete === 0) {
        console.log('No old data to cleanup');
        return;
      }
      
      // Delete old requests first
      db.run('DELETE FROM requests WHERE timestamp < ?', [sixtyDaysAgo], function(err) {
        if (err) {
          console.error('Error deleting old requests:', err);
          return;
        }
        
        // Delete old endpoints
        db.run('DELETE FROM endpoints WHERE created_at < ?', [sixtyDaysAgo], function(err) {
          if (err) {
            console.error('Error deleting old endpoints:', err);
            return;
          }
          
          // Log the cleanup
          db.run(
            'INSERT INTO cleanup_log (cleanup_date, endpoints_deleted, requests_deleted) VALUES (?, ?, ?)',
            [Date.now(), endpointsToDelete, requestsToDelete],
            function(err) {
              if (err) {
                console.error('Error logging cleanup:', err);
              } else {
                console.log(`Cleanup completed: ${endpointsToDelete} endpoints and ${requestsToDelete} requests deleted`);
              }
            }
          );
        });
      });
    });
  });
}

// Schedule cleanup to run every day at 3 AM
cron.schedule('0 3 * * *', () => {
  console.log('Running scheduled database cleanup...');
  cleanupOldData();
});

// Get last cleanup info
app.get('/api/cleanup-info', (req, res) => {
  db.get(
    'SELECT * FROM cleanup_log ORDER BY cleanup_date DESC LIMIT 1',
    [],
    (err, row) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      
      res.json({
        lastCleanup: row ? row.cleanup_date : null,
        lastCleanupStats: row ? {
          endpointsDeleted: row.endpoints_deleted,
          requestsDeleted: row.requests_deleted
        } : null
      });
    }
  );
});

server.listen(PORT, () => {
  console.log(`Webhook listener running on http://localhost:${PORT}`);
  console.log(`Create endpoints at: http://localhost:${PORT}`);
  console.log('Database cleanup scheduled for 3 AM daily (deletes data older than 60 days)');
});

process.on('SIGINT', () => {
  db.close();
  process.exit();
});