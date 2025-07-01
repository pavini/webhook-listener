const { asyncHandler } = require('../utils/helpers');

class AuthController {
    constructor() {}

    // GitHub OAuth callback handler
    githubCallback = asyncHandler(async (req, res) => {
        // User is authenticated via passport
        const user = req.user;
        
        if (!user) {
            return res.redirect('/?error=auth_failed');
        }

        // Check if user had anonymous endpoints to migrate
        const anonymousUserId = req.session.anonymousUserId;
        if (anonymousUserId) {
            try {
                const User = require('../models/User');
                const userModel = new User(req.app.locals.db);
                
                const migratedCount = await userModel.linkAnonymousEndpoints(user.id, anonymousUserId);
                if (migratedCount > 0) {
                    req.session.migrationMessage = `${migratedCount} endpoint(s) migrated to your account`;
                }
                
                // Clear the anonymous user ID
                delete req.session.anonymousUserId;
            } catch (error) {
                console.error('Error migrating anonymous endpoints:', error);
            }
        }

        // Redirect to home with success
        res.redirect('/?auth=success');
    });

    // Get current user info
    me = asyncHandler(async (req, res) => {
        // Check for test mode mock user
        const isTestMode = process.env.GITHUB_CLIENT_ID === 'test_client_id' || 
                          process.env.GITHUB_CLIENT_SECRET === 'test_client_secret';
        
        if (isTestMode && req.session.mockUser) {
            return res.json({
                user: {
                    id: req.session.mockUser.id,
                    username: req.session.mockUser.username,
                    display_name: req.session.mockUser.display_name,
                    avatar_url: req.session.mockUser.avatar_url,
                    profile_url: req.session.mockUser.profile_url
                },
                migrationMessage: req.session.migrationMessage || null
            });
        }
        
        if (!req.user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        res.json({
            user: {
                id: req.user.id,
                username: req.user.username,
                display_name: req.user.display_name,
                avatar_url: req.user.avatar_url,
                profile_url: req.user.profile_url
            },
            migrationMessage: req.session.migrationMessage || null
        });
    });

    // Logout
    logout = asyncHandler(async (req, res) => {
        const isTestMode = process.env.GITHUB_CLIENT_ID === 'test_client_id' || 
                          process.env.GITHUB_CLIENT_SECRET === 'test_client_secret';
        
        if (isTestMode) {
            // Clear mock user from session
            delete req.session.mockUser;
            delete req.session.migrationMessage;
            return res.json({ message: 'Logged out successfully (test mode)' });
        }
        
        req.logout((err) => {
            if (err) {
                return res.status(500).json({ error: 'Logout failed' });
            }
            
            req.session.destroy((err) => {
                if (err) {
                    return res.status(500).json({ error: 'Session destruction failed' });
                }
                
                res.json({ message: 'Logged out successfully' });
            });
        });
    });

    // Store anonymous user ID for potential migration
    storeAnonymousUser = asyncHandler(async (req, res) => {
        const { anonymousUserId } = req.body;
        
        if (anonymousUserId && typeof anonymousUserId === 'string') {
            req.session.anonymousUserId = anonymousUserId;
        }
        
        res.json({ message: 'Anonymous user stored' });
    });
}

module.exports = new AuthController();