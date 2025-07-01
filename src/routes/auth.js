const express = require('express');
const passport = require('passport');
const AuthController = require('../controllers/AuthController');

const router = express.Router();

// Check if we're in development mode with test credentials
const isTestMode = process.env.GITHUB_CLIENT_ID === 'test_client_id' || 
                  process.env.GITHUB_CLIENT_SECRET === 'test_client_secret';

// GitHub OAuth routes
router.get('/github', (req, res, next) => {
    if (isTestMode) {
        // Simulate OAuth flow for development
        return res.redirect('/auth/github/simulate');
    }
    passport.authenticate('github', { scope: ['user:email'] })(req, res, next);
});

router.get('/github/callback', (req, res, next) => {
    if (isTestMode) {
        return res.redirect('/?error=test_mode');
    }
    passport.authenticate('github', { failureRedirect: '/?error=auth_failed' })(req, res, next);
}, AuthController.githubCallback);

// Simulate GitHub OAuth for development
router.get('/github/simulate', (req, res) => {
    if (!isTestMode) {
        return res.redirect('/');
    }
    
    // Create a mock GitHub user
    const mockUser = {
        id: 'test_user_' + Date.now(),
        username: 'testuser',
        display_name: 'Test User',
        avatar_url: 'https://github.com/identicons/testuser.png',
        profile_url: 'https://github.com/testuser'
    };
    
    // Store mock user in session
    req.session.mockUser = mockUser;
    
    res.redirect('/?auth=test_success');
});

// User info and logout routes
router.get('/me', AuthController.me);
router.post('/logout', AuthController.logout);

// Store anonymous user for migration
router.post('/store-anonymous', AuthController.storeAnonymousUser);

module.exports = router;