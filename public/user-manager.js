// User Management System for Webhook Listener
class UserManager {
    constructor() {
        this.currentUser = null;
        this.userEndpoints = [];
        this.isAuthenticated = false;
        this.githubUser = null;
    }

    init() {
        this.currentUser = this.getOrCreateUser();
        console.log(i18n.t('user.initialized'), this.currentUser);
        
        // Listen for auth state changes
        if (typeof authManager !== 'undefined') {
            authManager.onAuthStateChanged((isAuthenticated, githubUser) => {
                this.isAuthenticated = isAuthenticated;
                this.githubUser = githubUser;
                this.updateUserContext();
            });
        }
    }

    async updateUserContext() {
        if (this.isAuthenticated && this.githubUser) {
            const oldUserId = this.currentUser.id;
            const newUserId = this.githubUser.id;
            
            // Migrate endpoints from anonymous user to GitHub user if needed
            if (oldUserId !== newUserId && oldUserId.startsWith('user_anonymous_')) {
                await this.migrateEndpoints(oldUserId, newUserId);
            }
            
            // Use GitHub user ID for authenticated users
            this.currentUser.github_id = this.githubUser.id;
            this.currentUser.auth_type = 'github';
        } else {
            // Keep anonymous user
            this.currentUser.auth_type = 'anonymous';
        }
        this.saveUser(this.currentUser);
    }

    // Get existing user or create new one
    getOrCreateUser() {
        let user = localStorage.getItem('webhook-listener-user');
        
        if (user) {
            try {
                return JSON.parse(user);
            } catch (error) {
                console.error(i18n.t('user.parse.error'), error);
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

    // Generate persistent anonymous user ID based on browser fingerprint
    generateUserId() {
        const browserFingerprint = navigator.userAgent + navigator.language + screen.width + screen.height;
        const seed = btoa(browserFingerprint).replace(/[^a-zA-Z0-9]/g, '').substring(0, 10);
        return 'user_anonymous_' + seed;
    }

    // Save user to localStorage
    saveUser(user) {
        user.last_access = Date.now();
        localStorage.setItem('webhook-listener-user', JSON.stringify(user));
        this.currentUser = user;
    }

    // Get current user ID (prioritize GitHub user ID if authenticated)
    getUserId() {
        if (this.isAuthenticated && this.githubUser) {
            return this.githubUser.id;
        }
        return this.currentUser ? this.currentUser.id : null;
    }

    // Get user ID for API calls (use appropriate ID based on auth state)
    getApiUserId() {
        if (this.isAuthenticated && this.githubUser) {
            return this.githubUser.id;
        }
        // Ensure we have a current user, create one if needed
        if (!this.currentUser) {
            this.currentUser = this.getOrCreateUser();
        }
        return this.currentUser ? this.currentUser.id : null;
    }

    // Migrate endpoints from anonymous user to authenticated user
    async migrateEndpoints(fromUserId, toUserId) {
        try {
            console.log(`Migrating endpoints from ${fromUserId} to ${toUserId}`);
            
            const response = await fetch('/api/endpoints/migrate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    from_user_id: fromUserId,
                    to_user_id: toUserId
                })
            });

            if (response.ok) {
                const result = await response.json();
                console.log(`Successfully migrated ${result.migrated_count} endpoints`);
                return result;
            } else {
                console.error('Failed to migrate endpoints:', response.status);
                return null;
            }
        } catch (error) {
            console.error('Error migrating endpoints:', error);
            return null;
        }
    }

    // Load user endpoints from server
    async loadUserEndpoints() {
        const userId = this.getApiUserId();
        if (!userId) return [];

        try {
            const response = await fetch(`/api/users/${userId}/endpoints`, {
                credentials: 'include' // Include session cookies for authenticated users
            });
            if (response.ok) {
                this.userEndpoints = await response.json();
                return this.userEndpoints;
            } else {
                console.error(i18n.t('user.endpoints.load.error'), response.status);
                return [];
            }
        } catch (error) {
            console.error('Error loading user endpoints:', error);
            return [];
        }
    }

    // Create new endpoint
    async createEndpoint(name) {
        const userId = this.getApiUserId();
        if (!userId || !name) return null;

        try {
            const response = await fetch('/api/endpoints', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include', // Include session cookies for authenticated users
                body: JSON.stringify({
                    name: name,
                    user_id: userId
                })
            });

            if (response.ok) {
                const endpoint = await response.json();
                this.userEndpoints.unshift(endpoint);
                return endpoint;
            } else {
                const error = await response.json();
                throw new Error(error.error || i18n.t('user.endpoint.create.error'));
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
                throw new Error(error.error || i18n.t('user.endpoint.delete.error'));
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
            user_since: this.currentUser ? new Date(this.currentUser.created_at).toLocaleDateString() : i18n.t('user.date.unknown'),
            last_access: this.currentUser ? new Date(this.currentUser.last_access).toLocaleDateString() : i18n.t('user.date.unknown')
        };
    }

    // Clear user data (for testing/reset)
    clearUserData() {
        localStorage.removeItem('webhook-listener-user');
        localStorage.removeItem('webhookEndpoint');
        this.currentUser = null;
        this.userEndpoints = [];
        console.log(i18n.t('user.data.cleared'));
    }
}

// Initialize user manager
const userManager = new UserManager();

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { UserManager, userManager };
}