class AuthManager {
    constructor() {
        this.currentUser = null;
        this.isAuthenticated = false;
        this.onAuthStateChange = null;
    }

    async init() {
        // Check if user is authenticated
        await this.checkAuthStatus();
        
        // Check for auth callback parameters
        this.handleAuthCallback();
        
        // Update UI based on auth state
        this.updateAuthUI();
    }

    async checkAuthStatus() {
        try {
            const response = await fetch('/auth/me', {
                method: 'GET',
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                this.currentUser = data.user;
                this.isAuthenticated = true;
                
                // Show migration message if available
                if (data.migrationMessage) {
                    this.showMigrationNotice(data.migrationMessage);
                }
            } else if (response.status === 401) {
                // 401 is expected when user is not authenticated - not an error
                this.currentUser = null;
                this.isAuthenticated = false;
            } else {
                // Only log actual errors (not 401 unauthorized)
                console.error('Unexpected auth status response:', response.status);
                this.currentUser = null;
                this.isAuthenticated = false;
            }
        } catch (error) {
            console.error('Error checking auth status:', error);
            this.currentUser = null;
            this.isAuthenticated = false;
        }
    }

    handleAuthCallback() {
        const urlParams = new URLSearchParams(window.location.search);
        const authParam = urlParams.get('auth');
        const errorParam = urlParams.get('error');

        if (authParam === 'success') {
            // Clean up URL
            window.history.replaceState({}, document.title, window.location.pathname);
            
            // Show success message
            this.showMessage('Login successful! Welcome to Hook Debug.', 'success');
            
            // Force auth status refresh and trigger user context update
            setTimeout(() => {
                this.checkAuthStatus().then(() => {
                    this.updateAuthUI();
                    // Explicitly update userManager state before context update
                    if (userManager) {
                        console.log('Updating userManager state after login');
                        userManager.isAuthenticated = this.isAuthenticated;
                        userManager.githubUser = this.currentUser;
                        
                        if (typeof userManager.updateUserContext === 'function') {
                            userManager.updateUserContext().then(() => {
                                console.log('User context updated, reloading endpoints');
                                // Reload endpoints after migration
                                if (typeof loadUserEndpoints === 'function') {
                                    loadUserEndpoints();
                                }
                            });
                        }
                    }
                });
            }, 1000);
        } else if (authParam === 'test_success') {
            // Clean up URL
            window.history.replaceState({}, document.title, window.location.pathname);
            
            // Show test mode success message
            this.showMessage('Test login successful! (Development mode)', 'success');
            
            // Refresh auth status and update user context
            setTimeout(() => {
                this.checkAuthStatus().then(() => {
                    this.updateAuthUI();
                    // Explicitly update userManager state before context update
                    if (userManager) {
                        console.log('Updating userManager state after test login');
                        userManager.isAuthenticated = this.isAuthenticated;
                        userManager.githubUser = this.currentUser;
                        
                        if (typeof userManager.updateUserContext === 'function') {
                            userManager.updateUserContext().then(() => {
                                console.log('User context updated, reloading endpoints');
                                // Reload endpoints after migration
                                if (typeof loadUserEndpoints === 'function') {
                                    loadUserEndpoints();
                                }
                            });
                        }
                    }
                });
            }, 500);
        } else if (errorParam === 'auth_failed') {
            // Clean up URL
            window.history.replaceState({}, document.title, window.location.pathname);
            
            // Show error message
            this.showMessage('Authentication failed. Please try again.', 'error');
        } else if (errorParam === 'test_mode') {
            // Clean up URL
            window.history.replaceState({}, document.title, window.location.pathname);
            
            // Show test mode info
            this.showMessage('GitHub OAuth not configured. Please set up your GitHub OAuth credentials for production.', 'error');
        }
    }

    updateAuthUI() {
        const githubLoginBtn = document.getElementById('githubLoginBtn');
        const userInfo = document.getElementById('userInfo');
        const userAvatar = document.getElementById('userAvatar');
        const userName = document.getElementById('userName');

        // Debug log removed - auth UI working correctly

        if (this.isAuthenticated && this.currentUser) {
            // Show user info, hide login button
            if (githubLoginBtn) {
                githubLoginBtn.style.setProperty('display', 'none', 'important');
                githubLoginBtn.classList.add('auth-hidden');
            }
            if (userInfo) {
                userInfo.style.setProperty('display', 'flex', 'important');
                userInfo.classList.remove('auth-hidden');
            }
            
            // Update user info
            if (userAvatar && this.currentUser.avatar_url) {
                userAvatar.src = this.currentUser.avatar_url;
                userAvatar.alt = `${this.currentUser.username} avatar`;
            }
            if (userName) {
                userName.textContent = this.currentUser.display_name || this.currentUser.username;
            }
        } else {
            // Show login button, hide user info
            if (githubLoginBtn) {
                githubLoginBtn.style.setProperty('display', 'flex', 'important');
                githubLoginBtn.classList.remove('auth-hidden');
            }
            if (userInfo) {
                userInfo.style.setProperty('display', 'none', 'important');
                userInfo.classList.add('auth-hidden');
            }
        }

        // Trigger auth state change callback
        if (this.onAuthStateChange) {
            this.onAuthStateChange(this.isAuthenticated, this.currentUser);
        }
    }

    async loginWithGitHub() {
        // Store anonymous user ID if exists for migration
        const anonymousUserId = userManager ? userManager.currentUser?.id : null;
        console.log('=== LOGIN DEBUG ===');
        console.log('userManager exists:', !!userManager);
        console.log('userManager.currentUser:', userManager?.currentUser);
        console.log('anonymousUserId to store:', anonymousUserId);
        
        if (anonymousUserId) {
            try {
                console.log('Storing anonymous user ID:', anonymousUserId);
                const response = await fetch('/auth/store-anonymous', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    credentials: 'include',
                    body: JSON.stringify({ anonymousUserId })
                });
                console.log('Store anonymous response status:', response.status);
                const result = await response.text();
                console.log('Store anonymous response:', result);
            } catch (error) {
                console.error('Error storing anonymous user:', error);
            }
        } else {
            console.log('No anonymous user ID to store');
        }

        // Redirect to GitHub OAuth
        console.log('Redirecting to GitHub OAuth...');
        window.location.href = '/auth/github';
    }

    async logout() {
        try {
            const response = await fetch('/auth/logout', {
                method: 'POST',
                credentials: 'include'
            });

            if (response.ok) {
                this.currentUser = null;
                this.isAuthenticated = false;
                
                // Clear user manager data to ensure clean state
                if (typeof userManager !== 'undefined') {
                    userManager.isAuthenticated = false;
                    userManager.githubUser = null;
                    // Clear userEndpoints to remove GitHub user endpoints from display
                    userManager.userEndpoints = [];
                    // Update context to anonymous user
                    userManager.updateUserContext();
                }
                
                this.updateAuthUI();
                this.showMessage('Logged out successfully.', 'success');
                
                // Reload anonymous user endpoints after logout
                setTimeout(() => {
                    if (typeof loadUserEndpoints !== 'undefined') {
                        loadUserEndpoints();
                    }
                }, 500);
            } else {
                this.showMessage('Logout failed. Please try again.', 'error');
            }
        } catch (error) {
            console.error('Error during logout:', error);
            this.showMessage('Logout failed. Please try again.', 'error');
        }
    }

    showMigrationNotice(message) {
        // Create or update migration notice
        let notice = document.getElementById('migrationNotice');
        if (!notice) {
            notice = document.createElement('div');
            notice.id = 'migrationNotice';
            notice.className = 'migration-notice';
            
            // Insert after cleanup notice
            const cleanupNotice = document.getElementById('cleanupNotice');
            cleanupNotice.parentNode.insertBefore(notice, cleanupNotice.nextSibling);
        }

        notice.innerHTML = `
            <div class="notice-title">Endpoints Migrated!</div>
            <div class="notice-message">${message}</div>
        `;
        notice.classList.add('show');

        // Auto-hide after 10 seconds
        setTimeout(() => {
            notice.classList.remove('show');
        }, 10000);
    }

    showMessage(message, type) {
        const messageElement = document.getElementById(type === 'error' ? 'errorMessage' : 'successMessage');
        if (messageElement) {
            messageElement.textContent = message;
            messageElement.classList.add('show');
            
            setTimeout(() => {
                messageElement.classList.remove('show');
            }, 5000);
        }
    }

    // Event handlers for auth state changes
    onAuthStateChanged(callback) {
        this.onAuthStateChange = callback;
    }

    // Getters
    getCurrentUser() {
        return this.currentUser;
    }

    getIsAuthenticated() {
        return this.isAuthenticated;
    }
}

// Global auth manager instance
const authManager = new AuthManager();

// Global functions for HTML onclick handlers
function loginWithGitHub() {
    authManager.loginWithGitHub();
}

function logout() {
    authManager.logout();
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    try {
        authManager.init();
    } catch (error) {
        console.error('Auth manager initialization failed:', error);
        // Fallback: ensure login button is visible
        const githubLoginBtn = document.getElementById('githubLoginBtn');
        if (githubLoginBtn) {
            githubLoginBtn.style.display = 'flex';
        }
    }
});

// Fallback initialization in case DOMContentLoaded already fired
if (document.readyState === 'loading') {
    // Document still loading, wait for DOMContentLoaded
} else {
    // Document already loaded, initialize immediately
    try {
        authManager.init();
    } catch (error) {
        console.error('Auth manager immediate init failed:', error);
    }
}