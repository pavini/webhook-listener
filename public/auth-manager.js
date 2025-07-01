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
            } else {
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
        } else if (authParam === 'test_success') {
            // Clean up URL
            window.history.replaceState({}, document.title, window.location.pathname);
            
            // Show test mode success message
            this.showMessage('Test login successful! (Development mode)', 'success');
            
            // Refresh auth status
            setTimeout(() => {
                this.checkAuthStatus().then(() => this.updateAuthUI());
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

        if (this.isAuthenticated && this.currentUser) {
            // Show user info, hide login button
            githubLoginBtn.style.display = 'none';
            userInfo.style.display = 'flex';
            
            // Update user info
            userAvatar.src = this.currentUser.avatar_url || '';
            userAvatar.alt = `${this.currentUser.username} avatar`;
            userName.textContent = this.currentUser.display_name || this.currentUser.username;
        } else {
            // Show login button, hide user info
            githubLoginBtn.style.display = 'flex';
            userInfo.style.display = 'none';
        }

        // Trigger auth state change callback
        if (this.onAuthStateChange) {
            this.onAuthStateChange(this.isAuthenticated, this.currentUser);
        }
    }

    async loginWithGitHub() {
        // Store anonymous user ID if exists for migration
        const anonymousUserId = localStorage.getItem('userId');
        if (anonymousUserId) {
            try {
                await fetch('/auth/store-anonymous', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    credentials: 'include',
                    body: JSON.stringify({ anonymousUserId })
                });
            } catch (error) {
                console.error('Error storing anonymous user:', error);
            }
        }

        // Redirect to GitHub OAuth
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
                this.updateAuthUI();
                this.showMessage('Logged out successfully.', 'success');
                
                // Reload page to reset any user-specific data
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
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
    authManager.init();
});