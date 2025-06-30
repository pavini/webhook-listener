// User Management System for Webhook Listener
class UserManager {
    constructor() {
        this.currentUser = null;
        this.userEndpoints = [];
        this.init();
    }

    init() {
        this.currentUser = this.getOrCreateUser();
        console.log('User initialized:', this.currentUser);
    }

    // Get existing user or create new one
    getOrCreateUser() {
        let user = localStorage.getItem('webhook-listener-user');
        
        if (user) {
            try {
                return JSON.parse(user);
            } catch (error) {
                console.error('Error parsing user data:', error);
                // If corrupted, create new user
            }
        }
        
        // Create new user
        const newUser = {
            id: this.generateUserId(),
            created_at: Date.now(),
            last_access: Date.now()
        };
        
        this.saveUser(newUser);
        return newUser;
    }

    // Generate unique user ID
    generateUserId() {
        return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // Save user to localStorage
    saveUser(user) {
        user.last_access = Date.now();
        localStorage.setItem('webhook-listener-user', JSON.stringify(user));
        this.currentUser = user;
    }

    // Get current user ID
    getUserId() {
        return this.currentUser ? this.currentUser.id : null;
    }

    // Load user endpoints from server
    async loadUserEndpoints() {
        if (!this.currentUser) return [];

        try {
            const response = await fetch(`/api/users/${this.currentUser.id}/endpoints`);
            if (response.ok) {
                this.userEndpoints = await response.json();
                return this.userEndpoints;
            } else {
                console.error('Failed to load user endpoints:', response.status);
                return [];
            }
        } catch (error) {
            console.error('Error loading user endpoints:', error);
            return [];
        }
    }

    // Create new endpoint
    async createEndpoint(name) {
        if (!this.currentUser || !name) return null;

        try {
            const response = await fetch('/api/endpoints', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: name,
                    user_id: this.currentUser.id
                })
            });

            if (response.ok) {
                const endpoint = await response.json();
                this.userEndpoints.unshift(endpoint);
                return endpoint;
            } else {
                const error = await response.json();
                throw new Error(error.error || 'Failed to create endpoint');
            }
        } catch (error) {
            console.error('Error creating endpoint:', error);
            throw error;
        }
    }

    // Delete endpoint
    async deleteEndpoint(endpointId) {
        if (!this.currentUser) return false;

        try {
            const response = await fetch(`/api/endpoints/${endpointId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    user_id: this.currentUser.id
                })
            });

            if (response.ok) {
                // Remove from local array
                this.userEndpoints = this.userEndpoints.filter(ep => ep.id !== endpointId);
                return true;
            } else {
                const error = await response.json();
                throw new Error(error.error || 'Failed to delete endpoint');
            }
        } catch (error) {
            console.error('Error deleting endpoint:', error);
            throw error;
        }
    }

    // Get endpoint by ID (from user's endpoints)
    getEndpoint(endpointId) {
        return this.userEndpoints.find(ep => ep.id === endpointId);
    }

    // Get user's current endpoint from localStorage
    getCurrentEndpoint() {
        const saved = localStorage.getItem('webhookEndpoint');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (error) {
                return null;
            }
        }
        return null;
    }

    // Set current active endpoint
    setCurrentEndpoint(endpoint) {
        if (endpoint) {
            localStorage.setItem('webhookEndpoint', JSON.stringify(endpoint));
        } else {
            localStorage.removeItem('webhookEndpoint');
        }
    }

    // Check if user owns endpoint
    ownsEndpoint(endpointId) {
        return this.userEndpoints.some(ep => ep.id === endpointId);
    }

    // Get user stats
    getUserStats() {
        return {
            total_endpoints: this.userEndpoints.length,
            user_since: this.currentUser ? new Date(this.currentUser.created_at).toLocaleDateString() : 'Unknown',
            last_access: this.currentUser ? new Date(this.currentUser.last_access).toLocaleDateString() : 'Unknown'
        };
    }

    // Clear user data (for testing/reset)
    clearUserData() {
        localStorage.removeItem('webhook-listener-user');
        localStorage.removeItem('webhookEndpoint');
        this.currentUser = null;
        this.userEndpoints = [];
        console.log('User data cleared');
    }
}

// Initialize user manager
const userManager = new UserManager();

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { UserManager, userManager };
}