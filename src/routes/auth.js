const express = require('express');
const passport = require('passport');
const AuthController = require('../controllers/AuthController');

const router = express.Router();

// GitHub OAuth routes
router.get('/github',
    passport.authenticate('github', { scope: ['user:email'] })
);

router.get('/github/callback',
    passport.authenticate('github', { failureRedirect: '/?error=auth_failed' }),
    AuthController.githubCallback
);

// User info and logout routes
router.get('/me', AuthController.me);
router.post('/logout', AuthController.logout);

// Store anonymous user for migration
router.post('/store-anonymous', AuthController.storeAnonymousUser);

module.exports = router;