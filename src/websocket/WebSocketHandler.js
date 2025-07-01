class WebSocketHandler {
    constructor() {
        this.io = null;
        this.connectedClients = new Map();
    }
    
    // Initialize Socket.io server
    initialize(io) {
        this.io = io;
        this.setupEventHandlers();
        console.log('WebSocket handler initialized');
    }
    
    // Setup Socket.io event handlers
    setupEventHandlers() {
        this.io.on('connection', (socket) => {
            console.log(`Client connected: ${socket.id}`);
            this.connectedClients.set(socket.id, {
                socket,
                connectedAt: Date.now(),
                watchedEndpoints: new Set()
            });
            
            // Handle endpoint room joining
            socket.on('join-endpoint', (endpointId) => {
                this.handleJoinEndpoint(socket, endpointId);
            });
            
            // Handle endpoint room leaving
            socket.on('leave-endpoint', (endpointId) => {
                this.handleLeaveEndpoint(socket, endpointId);
            });
            
            // Handle client ping for connection health
            socket.on('ping', (callback) => {
                if (typeof callback === 'function') {
                    callback('pong');
                }
            });
            
            // Handle client disconnect
            socket.on('disconnect', (reason) => {
                this.handleDisconnect(socket, reason);
            });
            
            // Handle errors
            socket.on('error', (error) => {
                console.error(`Socket error for client ${socket.id}:`, error);
            });
        });
    }
    
    // Handle client joining an endpoint room
    handleJoinEndpoint(socket, endpointId) {
        if (!endpointId || typeof endpointId !== 'string') {
            socket.emit('error', { message: 'Invalid endpoint ID' });
            return;
        }
        
        socket.join(endpointId);
        
        // Track which endpoints this client is watching
        const clientInfo = this.connectedClients.get(socket.id);
        if (clientInfo) {
            clientInfo.watchedEndpoints.add(endpointId);
        }
        
        console.log(`Client ${socket.id} joined endpoint room: ${endpointId}`);
        
        // Send confirmation
        socket.emit('joined-endpoint', { endpointId, timestamp: Date.now() });
    }
    
    // Handle client leaving an endpoint room
    handleLeaveEndpoint(socket, endpointId) {
        if (!endpointId || typeof endpointId !== 'string') {
            return;
        }
        
        socket.leave(endpointId);
        
        // Remove from watched endpoints
        const clientInfo = this.connectedClients.get(socket.id);
        if (clientInfo) {
            clientInfo.watchedEndpoints.delete(endpointId);
        }
        
        console.log(`Client ${socket.id} left endpoint room: ${endpointId}`);
        
        // Send confirmation
        socket.emit('left-endpoint', { endpointId, timestamp: Date.now() });
    }
    
    // Handle client disconnect
    handleDisconnect(socket, reason) {
        console.log(`Client ${socket.id} disconnected: ${reason}`);
        
        // Clean up client tracking
        this.connectedClients.delete(socket.id);
    }
    
    // Emit new request to clients watching an endpoint
    emitNewRequest(endpointId, requestData) {
        if (!this.io || !endpointId) {
            return false;
        }
        
        this.io.to(endpointId).emit('new-request', requestData);
        
        console.log(`Emitted new request to endpoint ${endpointId}`);
        return true;
    }
    
    // Emit request deletion to clients watching an endpoint
    emitRequestDeleted(endpointId, requestId) {
        if (!this.io || !endpointId) {
            return false;
        }
        
        this.io.to(endpointId).emit('request-deleted', requestId);
        
        console.log(`Emitted request deletion for ${requestId} to endpoint ${endpointId}`);
        return true;
    }
    
    // Emit requests cleared to clients watching an endpoint
    emitRequestsCleared(endpointId) {
        if (!this.io || !endpointId) {
            return false;
        }
        
        this.io.to(endpointId).emit('requests-cleared');
        
        console.log(`Emitted requests cleared to endpoint ${endpointId}`);
        return true;
    }
    
    // Emit endpoint deleted to clients watching an endpoint
    emitEndpointDeleted(endpointId) {
        if (!this.io || !endpointId) {
            return false;
        }
        
        this.io.to(endpointId).emit('endpoint-deleted');
        
        console.log(`Emitted endpoint deleted for ${endpointId}`);
        return true;
    }
    
    // Get statistics about connected clients
    getStats() {
        const connectedCount = this.connectedClients.size;
        const roomStats = {};
        
        // Get room information
        if (this.io && this.io.sockets && this.io.sockets.adapter) {
            const rooms = this.io.sockets.adapter.rooms;
            
            rooms.forEach((sockets, roomName) => {
                // Skip individual socket rooms (they have the same name as socket ID)
                if (!this.connectedClients.has(roomName)) {
                    roomStats[roomName] = sockets.size;
                }
            });
        }
        
        return {
            connectedClients: connectedCount,
            rooms: roomStats,
            timestamp: Date.now()
        };
    }
    
    // Get list of clients watching a specific endpoint
    getClientsWatchingEndpoint(endpointId) {
        const clients = [];
        
        this.connectedClients.forEach((clientInfo, socketId) => {
            if (clientInfo.watchedEndpoints.has(endpointId)) {
                clients.push({
                    socketId,
                    connectedAt: clientInfo.connectedAt
                });
            }
        });
        
        return clients;
    }
    
    // Broadcast system message to all connected clients
    broadcastSystemMessage(message, data = {}) {
        if (!this.io) {
            return false;
        }
        
        this.io.emit('system-message', {
            message,
            data,
            timestamp: Date.now()
        });
        
        console.log(`Broadcasted system message: ${message}`);
        return true;
    }
}

module.exports = new WebSocketHandler();