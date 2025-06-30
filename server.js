const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
const cron = require('node-cron');
const compression = require('compression');
const { DatabaseMigrations } = require('./migrations');

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

// Database setup with migrations
const fs = require('fs');

// Database path logic for different deployment scenarios
let dbPath;
if (process.env.NODE_ENV === 'production') {
  // Check if there's a direct file mount (like EasyPanel)
  const directMount = './webhooks.db';
  const dataMount = './data/webhooks.db';
  
  if (fs.existsSync(directMount)) {
    console.log('Using direct database file mount:', directMount);
    dbPath = directMount;
  } else {
    console.log('Using data directory mount:', dataMount);
    dbPath = dataMount;
    // Ensure data directory exists
    const dataDir = './data';
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
  }
} else {
  dbPath = './webhooks.db';
}

const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
  if (err) {
    console.error('Database connection failed:', err);
    console.error('Database path:', dbPath);
    console.error('Current working directory:', process.cwd());
    
    // If it's a permission error, provide specific guidance
    if (err.code === 'SQLITE_CANTOPEN') {
      console.error('This is likely a permission issue. Try:');
      console.error(`chmod 644 ${dbPath}`);
      console.error(`chown webhookuser:nodejs ${dbPath}`);
    }
    
    process.exit(1);
  }
  console.log(`Connected to SQLite database at: ${dbPath}`);
});

// Initialize database with migrations
async function initializeDatabase() {
  console.log('Initializing database with migrations...');
  
  // Check database file and directory permissions
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
      if (!(dbStats.mode & 0o200)) { // Check if write permission is missing
        console.log('Database file is read-only, attempting to fix permissions...');
        try {
          fs.chmodSync(dbPath, 0o644); // rw-r--r--
          console.log('Database file permissions fixed');
        } catch (chmodError) {
          console.error('Failed to fix database file permissions:', chmodError);
          console.log('Attempting to recreate database file...');
          try {
            // Backup the existing file (if possible)
            const backupPath = `${dbPath}.backup.${Date.now()}`;
            fs.copyFileSync(dbPath, backupPath);
            console.log(`Backed up database to: ${backupPath}`);
            
            // Remove the problematic file
            fs.unlinkSync(dbPath);
            console.log('Removed read-only database file');
          } catch (recreateError) {
            console.error('Failed to recreate database file:', recreateError);
            console.error('Manual intervention required:');
            console.error(`chmod 644 ${dbPath} && chown webhookuser:nodejs ${dbPath}`);
            process.exit(1);
          }
        }
      }
    } else {
      console.log('Database file does not exist, will be created');
    }
    
  } catch (error) {
    console.error('Database permission check failed:', error);
    console.error('Database path:', dbPath);
    console.error('Directory:', path.dirname(dbPath));
    process.exit(1);
  }
  
  const migrations = new DatabaseMigrations(db);
  
  try {
    await migrations.runMigrations();
    console.log('Database initialization completed successfully!');
    
    // Create indexes for better performance
    db.run(`CREATE INDEX IF NOT EXISTS idx_requests_timestamp ON requests(timestamp)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_requests_endpoint_id ON requests(endpoint_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_endpoints_created_at ON endpoints(created_at)`);
    
  } catch (error) {
    console.error('Database initialization failed:', error);
    process.exit(1);
  }
}

// Initialize database on startup
initializeDatabase();

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