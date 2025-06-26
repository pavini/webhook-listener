const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.raw({ type: '*/*', limit: '50mb' }));

const dbPath = process.env.NODE_ENV === 'production' ? './data/webhooks.db' : './webhooks.db';
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS endpoints (
    id TEXT PRIMARY KEY,
    name TEXT,
    created_at INTEGER
  )`);
  
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
});

app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Create new endpoint
app.post('/api/endpoints', (req, res) => {
  const { name } = req.body;
  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'Endpoint name is required' });
  }
  
  const endpointId = uuidv4();
  const timestamp = Date.now();
  
  db.run(
    'INSERT INTO endpoints (id, name, created_at) VALUES (?, ?, ?)',
    [endpointId, name.trim(), timestamp],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      
      res.json({
        id: endpointId,
        name: name.trim(),
        created_at: timestamp,
        url: `${req.protocol}://${req.get('host')}/webhook/${endpointId}`
      });
    }
  );
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

server.listen(PORT, () => {
  console.log(`Webhook listener running on http://localhost:${PORT}`);
  console.log(`Create endpoints at: http://localhost:${PORT}`);
});

process.on('SIGINT', () => {
  db.close();
  process.exit();
});