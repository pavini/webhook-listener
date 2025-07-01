const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;
const User = require('../models/User');

function initializePassport(db) {
    const userModel = new User(db);

    // Only configure GitHub strategy if credentials are available
    if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
        passport.use(new GitHubStrategy({
            clientID: process.env.GITHUB_CLIENT_ID,
            clientSecret: process.env.GITHUB_CLIENT_SECRET,
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
    } else {
        console.log('GitHub OAuth not configured - running in anonymous-only mode');
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