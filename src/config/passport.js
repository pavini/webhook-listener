const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;
const User = require('../models/User');

function initializePassport(db) {
    const userModel = new User(db);

    // Only configure GitHub strategy with real credentials
    const clientID = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;
    
    if (clientID && clientSecret && 
        clientID !== 'test_client_id' && clientSecret !== 'test_client_secret') {
        
        passport.use(new GitHubStrategy({
            clientID: clientID,
            clientSecret: clientSecret,
            callbackURL: `${process.env.BASE_URL}/auth/github/callback`
        },
        async (accessToken, refreshToken, profile, done) => {
            try {
                const user = await userModel.findOrCreate(profile);
                return done(null, user);
            } catch (error) {
                console.error('GitHub OAuth error:', error);
                return done(error, null);
            }
        }));
        
        console.log('GitHub OAuth configured successfully');
    } else {
        console.log('GitHub OAuth not configured - running in test mode (routes will handle simulation)');
    }

    passport.serializeUser((user, done) => {
        done(null, user.id);
    });

    passport.deserializeUser(async (id, done) => {
        try {
            const user = await userModel.findById(id);
            done(null, user);
        } catch (error) {
            done(error, null);
        }
    });
}

module.exports = { initializePassport };