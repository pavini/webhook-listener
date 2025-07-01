const express = require('express');
const path = require('path');

// Import route modules
const endpointsRouter = require('./endpoints');
const usersRouter = require('./users');
const webhooksRouter = require('./webhooks');
const requestsRouter = require('./requests');
const systemRouter = require('./system');
const authRouter = require('./auth');

const router = express.Router();

// Authentication routes
router.use('/auth', authRouter);

// API routes
router.use('/api/endpoints', endpointsRouter);
router.use('/api/users', usersRouter);
router.use('/webhook', webhooksRouter);
router.use('/api/requests', requestsRouter);
router.use('/api', systemRouter);

// Serve main web interface
router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../../public', 'index.html'));
});

module.exports = router;