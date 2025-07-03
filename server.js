import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import session from 'express-session';
import passport from 'passport';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

// Import our custom modules
import { 
  initDatabase, 
  createEndpoint, 
  getUserEndpoints, 
  getEndpointById, 
  getEndpointByPath, 
  deleteEndpoint, 
  updateEndpointRequestCount,
  createRequest, 
  getEndpointRequests, 
  getUserRequests,
  deleteEndpointRequests 
} from './database.js';
import { configurePassport, requireAuth, optionalAuth } from './auth.js';

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    credentials: true
  }
});

app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true
}));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-this',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Passport configuration
app.use(passport.initialize());
app.use(passport.session());
configurePassport();

// Custom middleware to capture raw body
app.use((req, res, next) => {
  if (req.url.startsWith('/api/') || req.url.startsWith('/auth/')) {
    return next();
  }
  
  let data = [];
  req.on('data', chunk => {
    data.push(chunk);
  });
  
  req.on('end', () => {
    req.rawBody = Buffer.concat(data);
    next();
  });
});

app.use(express.json({ limit: '10mb' }));
app.use(express.text({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// In-memory storage for anonymous users (fallback)
const anonymousEndpoints = new Map();
const anonymousRequests = new Map();

// Authentication routes
app.get('/auth/github', passport.authenticate('github', { scope: ['user:email'] }));

app.get('/auth/github/callback', 
  passport.authenticate('github', { failureRedirect: process.env.FRONTEND_URL }),
  (req, res) => {
    res.redirect(process.env.FRONTEND_URL);
  }
);

app.post('/auth/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.json({ message: 'Logged out successfully' });
  });
});

app.get('/auth/me', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({
      user: {
        id: req.user.id,
        username: req.user.username,
        display_name: req.user.display_name,
        avatar_url: req.user.avatar_url
      }
    });
  } else {
    res.json({ user: null });
  }
});

const captureRequest = (req, res, next) => {
  // Flag to ensure we only capture once per request
  if (req.captured) {
    return next();
  }
  req.captured = true;
  
  const originalEnd = res.end;
  
  res.end = function(chunk, encoding) {
    // Only capture if this is for a dynamic endpoint
    if (req.endpointId) {
      let body;
      
      // Use raw body if available
      if (req.rawBody && req.rawBody.length > 0) {
        body = req.rawBody.toString('utf8');
      } else if (req.body !== undefined) {
        if (Buffer.isBuffer(req.body)) {
          body = req.body.toString('utf8');
        } else if (typeof req.body === 'string') {
          body = req.body;
        } else if (typeof req.body === 'object') {
          body = JSON.stringify(req.body, null, 2);
        } else {
          body = String(req.body);
        }
      }
      
      const requestData = {
        id: uuidv4(),
        method: req.method,
        url: req.originalUrl,
        headers: req.headers,
        body: body,
        timestamp: new Date(),
        endpointId: req.endpointId
      };
      
      // Store request based on authentication
      if (req.endpoint && req.endpoint.user_id) {
        // Authenticated user - store in database
        createRequest({
          id: requestData.id,
          endpoint_id: req.endpointId,
          method: requestData.method,
          url: requestData.url,
          headers: requestData.headers,
          body: requestData.body
        }).catch(err => console.error('Error storing request:', err));
      } else {
        // Anonymous user - store in memory
        anonymousRequests.set(requestData.id, requestData);
      }
      
      io.emit('new_request', requestData);
    }
    
    originalEnd.call(this, chunk, encoding);
  };
  
  next();
};

// API routes
app.get('/api/endpoints', optionalAuth, async (req, res) => {
  try {
    if (req.isAuthenticated()) {
      // Get user's endpoints from database
      const endpoints = await getUserEndpoints(req.user.id);
      res.json(endpoints);
    } else {
      // Get anonymous endpoints from memory
      res.json(Array.from(anonymousEndpoints.values()));
    }
  } catch (error) {
    console.error('Error fetching endpoints:', error);
    res.status(500).json({ error: 'Failed to fetch endpoints' });
  }
});

app.post('/api/endpoints', optionalAuth, async (req, res) => {
  try {
    const { name } = req.body;
    const endpointId = uuidv4();
    const path = uuidv4();
    
    const endpoint = {
      id: endpointId,
      name,
      path,
      created: new Date(),
      requestCount: 0
    };
    
    if (req.isAuthenticated()) {
      // Save to database for authenticated users
      await createEndpoint({
        id: endpointId,
        user_id: req.user.id,
        name,
        path
      });
      endpoint.user_id = req.user.id;
    } else {
      // Save to memory for anonymous users
      anonymousEndpoints.set(endpointId, endpoint);
    }
    
    io.emit('endpoint_created', endpoint);
    res.status(201).json(endpoint);
  } catch (error) {
    console.error('Error creating endpoint:', error);
    res.status(500).json({ error: 'Failed to create endpoint' });
  }
});

app.delete('/api/endpoints/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    if (req.isAuthenticated()) {
      // Delete from database
      await deleteEndpoint(id);
      await deleteEndpointRequests(id);
    } else {
      // Delete from memory
      if (anonymousEndpoints.has(id)) {
        anonymousEndpoints.delete(id);
        const endpointRequests = Array.from(anonymousRequests.values()).filter(r => r.endpointId === id);
        endpointRequests.forEach(r => anonymousRequests.delete(r.id));
      } else {
        return res.status(404).json({ message: 'Endpoint not found' });
      }
    }
    
    io.emit('endpoint_deleted', { id });
    res.status(200).json({ message: 'Endpoint deleted' });
  } catch (error) {
    console.error('Error deleting endpoint:', error);
    res.status(500).json({ error: 'Failed to delete endpoint' });
  }
});

app.get('/api/requests', optionalAuth, async (req, res) => {
  try {
    if (req.isAuthenticated()) {
      // Get user's requests from database
      const requests = await getUserRequests(req.user.id);
      res.json(requests);
    } else {
      // Get anonymous requests from memory
      res.json(Array.from(anonymousRequests.values()));
    }
  } catch (error) {
    console.error('Error fetching requests:', error);
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
});

app.get('/api/requests/:endpointId', optionalAuth, async (req, res) => {
  try {
    const { endpointId } = req.params;
    
    if (req.isAuthenticated()) {
      // Get requests from database
      const requests = await getEndpointRequests(endpointId);
      res.json(requests);
    } else {
      // Get requests from memory
      const endpointRequests = Array.from(anonymousRequests.values()).filter(r => r.endpointId === endpointId);
      res.json(endpointRequests);
    }
  } catch (error) {
    console.error('Error fetching endpoint requests:', error);
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
});

// Catch-all route for dynamic endpoints
app.all('/:path', captureRequest, async (req, res) => {
  try {
    const { path } = req.params;
    let endpoint;
    
    // Try to find endpoint in database first
    endpoint = await getEndpointByPath(path);
    
    if (!endpoint) {
      // Try to find in anonymous endpoints
      endpoint = Array.from(anonymousEndpoints.values()).find(ep => ep.path === path);
    }
    
    if (!endpoint) {
      return res.status(404).json({
        error: 'Endpoint not found',
        message: `No endpoint found for path: ${path}`
      });
    }
    
    // Set endpoint data for request tracking
    req.endpointId = endpoint.id;
    req.endpoint = endpoint;
    
    // Update request count
    if (endpoint.user_id) {
      // Database endpoint
      await updateEndpointRequestCount(endpoint.id);
    } else {
      // Anonymous endpoint
      anonymousEndpoints.set(endpoint.id, {
        ...endpoint,
        requestCount: endpoint.requestCount + 1
      });
    }
    
    // Send successful response
    res.status(200).json({
      message: 'Request received successfully',
      timestamp: new Date(),
      endpoint: endpoint.name,
      method: req.method,
      path: path
    });
  } catch (error) {
    console.error('Error handling dynamic endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

io.on('connection', async (socket) => {
  console.log('Client connected:', socket.id);
  
  // Send initial data - for now, send anonymous data
  // In a real app, you'd want to authenticate the socket connection
  socket.emit('endpoints', Array.from(anonymousEndpoints.values()));
  socket.emit('requests', Array.from(anonymousRequests.values()));
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Initialize database and start server
const PORT = process.env.PORT || 3001;

async function startServer() {
  try {
    await initDatabase();
    console.log('Database initialized');
    
    server.listen(PORT, () => {
      console.log(`HookDebug server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();