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
  db.run(`CREATE TABLE IF NOT EXISTS requests (
    id TEXT PRIMARY KEY,
    timestamp INTEGER,
    method TEXT,
    url TEXT,
    headers TEXT,
    body TEXT,
    query TEXT,
    ip TEXT
  )`);
});

app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/api/requests', (req, res) => {
  db.all('SELECT * FROM requests ORDER BY timestamp DESC LIMIT 100', (err, rows) => {
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

app.delete('/api/requests', (req, res) => {
  db.run('DELETE FROM requests', (err) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    io.emit('requests-cleared');
    res.json({ message: 'All requests cleared' });
  });
});

app.all('/webhook/*', (req, res) => {
  const requestData = {
    id: uuidv4(),
    timestamp: Date.now(),
    method: req.method,
    url: req.originalUrl,
    headers: JSON.stringify(req.headers),
    body: typeof req.body === 'string' ? req.body : JSON.stringify(req.body),
    query: JSON.stringify(req.query),
    ip: req.ip || req.connection.remoteAddress
  };

  db.run(
    'INSERT INTO requests (id, timestamp, method, url, headers, body, query, ip) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [requestData.id, requestData.timestamp, requestData.method, requestData.url, requestData.headers, requestData.body, requestData.query, requestData.ip],
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

      io.emit('new-request', responseData);
      res.status(200).json({ 
        message: 'Webhook received successfully',
        id: requestData.id,
        timestamp: requestData.timestamp
      });
    }
  );
});

io.on('connection', (socket) => {
  console.log('Client connected');
  
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

server.listen(PORT, () => {
  console.log(`Webhook listener running on http://localhost:${PORT}`);
  console.log(`Send webhooks to: http://localhost:${PORT}/webhook/your-endpoint`);
});

process.on('SIGINT', () => {
  db.close();
  process.exit();
});