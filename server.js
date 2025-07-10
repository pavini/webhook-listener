import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import session from 'express-session';
import passport from 'passport';
import cookieParser from 'cookie-parser';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
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

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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

app.use(cookieParser());

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-this',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'lax',
    httpOnly: true
  }
}));

// Passport configuration
app.use(passport.initialize());
app.use(passport.session());
configurePassport();

// Anonymous user cookie middleware
app.use((req, res, next) => {
  if (!req.cookies?.anonymous_id) {
    const anonymousId = uuidv4();
    res.cookie('anonymous_id', anonymousId, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 365 * 24 * 60 * 60 * 1000 // 1 year
    });
    req.anonymousId = anonymousId;
  } else {
    req.anonymousId = req.cookies.anonymous_id;
  }
  next();
});

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

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Build info endpoint
app.get('/build-info', (req, res) => {
  try {
    import('fs').then(fs => {
      const buildInfoPath = join(__dirname, 'build-info.txt');
      if (fs.existsSync(buildInfoPath)) {
        const buildInfo = fs.readFileSync(buildInfoPath, 'utf8');
        res.status(200).json({
          buildInfo: buildInfo.split('\n').filter(line => line.trim()),
          serverStartTime: new Date().toISOString(),
          environment: process.env.NODE_ENV || 'development',
          nodeVersion: process.version
        });
      } else {
        res.status(200).json({
          buildInfo: ['Build info not available - file not found'],
          serverStartTime: new Date().toISOString(),
          environment: process.env.NODE_ENV || 'development',
          nodeVersion: process.version
        });
      }
    }).catch(err => {
      res.status(200).json({
        buildInfo: ['Build info not available - error reading file'],
        error: err.message,
        serverStartTime: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        nodeVersion: process.version
      });
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to read build info',
      details: error.message
    });
  }
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(join(__dirname, 'dist')));
}

// In-memory storage for anonymous users by cookie ID
const anonymousEndpoints = new Map(); // Map<anonymousId, Map<endpointId, endpoint>>
const anonymousRequests = new Map(); // Map<anonymousId, Map<requestId, request>>

// In-memory storage for auth tokens (production should use Redis)
const authTokens = new Map();

// Helper function to check authentication (session or token)
const getAuthenticatedUser = (req) => {
  // Check for Bearer token first
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '');
    const authData = authTokens.get(token);
    
    if (authData && authData.expiresAt > new Date()) {
      return authData.user;
    }
  }
  
  // Fallback to session-based auth
  if (req.isAuthenticated()) {
    return req.user;
  }
  
  return null;
};

// Authentication routes (only if GitHub OAuth is configured)
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  app.get('/auth/github', passport.authenticate('github', { scope: ['user:email'] }));

  app.get('/auth/github/callback', 
    passport.authenticate('github', { failureRedirect: process.env.FRONTEND_URL }),
    async (req, res) => {
    // OAuth authentication successful - migration will be handled by frontend
    
    // Create persistent auth token
    const authToken = uuidv4();
    authTokens.set(authToken, {
      user: req.user,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    });
    
    // Redirect with token
    res.redirect(`${process.env.FRONTEND_URL}?auth_token=${authToken}`);
  }
);
} else {
  // Provide fallback routes when GitHub OAuth is not configured
  app.get('/auth/github', (req, res) => {
    res.status(501).json({ error: 'GitHub OAuth not configured' });
  });
  
  app.get('/auth/github/callback', (req, res) => {
    res.status(501).json({ error: 'GitHub OAuth not configured' });
  });
}

app.post('/auth/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.json({ message: 'Logged out successfully' });
  });
});

// Token validation endpoint
app.post('/auth/validate-token', (req, res) => {
  const { token } = req.body;
  
  if (!token) {
    return res.status(400).json({ error: 'Token required' });
  }
  
  const authData = authTokens.get(token);
  
  if (!authData) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  
  if (authData.expiresAt < new Date()) {
    authTokens.delete(token);
    return res.status(401).json({ error: 'Token expired' });
  }
  
  res.json({
    user: {
      id: authData.user.id,
      username: authData.user.username,
      display_name: authData.user.display_name,
      avatar_url: authData.user.avatar_url
    }
  });
});

// Token-based authentication check
app.get('/auth/me', (req, res) => {
  // Check for token in headers
  const authToken = req.headers.authorization?.replace('Bearer ', '');
  
  if (authToken) {
    const authData = authTokens.get(authToken);
    
    if (authData && authData.expiresAt > new Date()) {
      return res.json({
        user: {
          id: authData.user.id,
          username: authData.user.username,
          display_name: authData.user.display_name,
          avatar_url: authData.user.avatar_url
        }
      });
    } else {
      if (authData) authTokens.delete(authToken);
    }
  }
  
  // Fallback to session-based auth
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

// Migrate anonymous endpoints to authenticated user
app.post('/auth/migrate-endpoints', async (req, res) => {
  const user = getAuthenticatedUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const { endpointIds } = req.body;
  if (!endpointIds || !Array.isArray(endpointIds)) {
    return res.status(400).json({ error: 'Endpoint IDs array required' });
  }

  try {
    let migratedCount = 0;
    const anonymousId = req.anonymousId;
    const userEndpoints = anonymousEndpoints.get(anonymousId) || new Map();
    const userRequests = anonymousRequests.get(anonymousId) || new Map();
    
    for (const endpointId of endpointIds) {
      const endpoint = userEndpoints.get(endpointId);
      
      if (endpoint) {
        // Create endpoint in database for authenticated user
        await createEndpoint({
          id: endpoint.id,
          user_id: user.id,
          name: endpoint.name,
          path: endpoint.path
        });
        
        // Migrate requests
        const endpointRequests = Array.from(userRequests.values())
          .filter(r => r.endpointId === endpointId);
        
        for (const request of endpointRequests) {
          await createRequest({
            id: request.id,
            endpoint_id: endpointId,
            method: request.method,
            url: request.url,
            headers: request.headers,
            body: request.body
          }).catch(err => console.error('Error migrating request:', err));
        }
        
        // Remove from anonymous storage
        userEndpoints.delete(endpointId);
        endpointRequests.forEach(r => userRequests.delete(r.id));
        
        migratedCount++;
      }
    }
    
    res.json({ 
      success: true, 
      migratedCount,
      totalRequested: endpointIds.length 
    });
  } catch (error) {
    console.error('Error during migration:', error);
    res.status(500).json({ error: 'Migration failed' });
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
        // Anonymous user - store in memory by cookie ID
        const anonymousId = req.anonymousId;
        if (!anonymousRequests.has(anonymousId)) {
          anonymousRequests.set(anonymousId, new Map());
        }
        anonymousRequests.get(anonymousId).set(requestData.id, requestData);
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
    const user = getAuthenticatedUser(req);
    
    if (user) {
      // Get user's endpoints from database
      const endpoints = await getUserEndpoints(user.id);
      res.json(endpoints);
    } else {
      // Get anonymous endpoints from memory for this cookie ID
      const anonymousId = req.anonymousId;
      const userEndpoints = anonymousEndpoints.get(anonymousId) || new Map();
      const anonymousEndpointsList = Array.from(userEndpoints.values());
      
      res.json(anonymousEndpointsList);
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
    
    const user = getAuthenticatedUser(req);
    
    if (user) {
      // Save to database for authenticated users
      await createEndpoint({
        id: endpointId,
        user_id: user.id,
        name,
        path
      });
      endpoint.user_id = user.id;
    } else {
      // Save to memory for anonymous users by cookie ID
      const anonymousId = req.anonymousId;
      if (!anonymousEndpoints.has(anonymousId)) {
        anonymousEndpoints.set(anonymousId, new Map());
      }
      anonymousEndpoints.get(anonymousId).set(endpointId, endpoint);
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
    
    // Validate UUID format
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return res.status(400).json({ error: 'Invalid endpoint ID format' });
    }
    
    if (req.isAuthenticated()) {
      // Delete from database
      await deleteEndpoint(id);
      await deleteEndpointRequests(id);
    } else {
      // Delete from memory by cookie ID
      const anonymousId = req.anonymousId;
      const userEndpoints = anonymousEndpoints.get(anonymousId) || new Map();
      const userRequests = anonymousRequests.get(anonymousId) || new Map();
      
      if (userEndpoints.has(id)) {
        userEndpoints.delete(id);
        const endpointRequests = Array.from(userRequests.values()).filter(r => r.endpointId === id);
        endpointRequests.forEach(r => userRequests.delete(r.id));
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
    const user = getAuthenticatedUser(req);
    
    if (user) {
      // Get user's requests from database
      const requests = await getUserRequests(user.id);
      res.json(requests);
    } else {
      // Get anonymous requests from memory for this cookie ID
      const anonymousId = req.anonymousId;
      const userRequests = anonymousRequests.get(anonymousId) || new Map();
      const anonymousRequestsList = Array.from(userRequests.values());
      res.json(anonymousRequestsList);
    }
  } catch (error) {
    console.error('Error fetching requests:', error);
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
});

app.get('/api/requests/:endpointId', optionalAuth, async (req, res) => {
  try {
    const { endpointId } = req.params;
    
    // Validate UUID format
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(endpointId)) {
      return res.status(400).json({ error: 'Invalid endpoint ID format' });
    }
    
    if (req.isAuthenticated()) {
      // Get requests from database
      const requests = await getEndpointRequests(endpointId);
      res.json(requests);
    } else {
      // Get requests from memory for this cookie ID
      const anonymousId = req.anonymousId;
      const userRequests = anonymousRequests.get(anonymousId) || new Map();
      const endpointRequests = Array.from(userRequests.values()).filter(r => r.endpointId === endpointId);
      res.json(endpointRequests);
    }
  } catch (error) {
    console.error('Error fetching endpoint requests:', error);
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
});

// Serve React app for all non-API routes in production
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res, next) => {
    // Skip if it's an API route or a dynamic endpoint
    if (req.url.startsWith('/api/') || req.url.startsWith('/auth/') || req.url.startsWith('/health')) {
      return next();
    }
    
    // If the URL looks like a UUID (dynamic endpoint), let it pass through
    const pathSegment = req.url.split('/')[1];
    if (pathSegment && pathSegment.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      return next();
    }
    
    // Serve the React app
    res.sendFile(join(__dirname, 'dist', 'index.html'));
  });
}

// Catch-all route for dynamic endpoints
app.all('/:path', captureRequest, async (req, res) => {
  try {
    const { path } = req.params;
    
    // Validate UUID format for endpoint paths
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(path)) {
      return res.status(404).json({
        error: 'Endpoint not found',
        message: `Invalid endpoint path format: ${path}`
      });
    }
    let endpoint;
    
    // Try to find endpoint in database first
    endpoint = await getEndpointByPath(path);
    
    if (!endpoint) {
      // Try to find in anonymous endpoints for this cookie ID
      const anonymousId = req.anonymousId;
      const userEndpoints = anonymousEndpoints.get(anonymousId) || new Map();
      endpoint = Array.from(userEndpoints.values()).find(ep => ep.path === path);
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
      const anonymousId = req.anonymousId;
      const userEndpoints = anonymousEndpoints.get(anonymousId) || new Map();
      userEndpoints.set(endpoint.id, {
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
  // Send initial data - endpoints and requests are now handled by HTTP requests
  // with cookie-based identification
  
  socket.on('disconnect', () => {
    // Client disconnected
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