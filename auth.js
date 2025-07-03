import passport from 'passport';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { v4 as uuidv4 } from 'uuid';
import { getUserByGithubId, createUser, getUserById } from './database.js';

export function configurePassport() {
  const backendUrl = process.env.NODE_ENV === 'production' 
    ? 'https://request.hookdebug.com'
    : 'http://localhost:3001';
  
  passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: `${backendUrl}/auth/github/callback`
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Check if user already exists
      let user = await getUserByGithubId(profile.id);
      
      if (user) {
        // Update existing user info
        const updatedUser = {
          id: user.id,
          github_id: profile.id,
          username: profile.username,
          display_name: profile.displayName,
          avatar_url: profile.photos?.[0]?.value || null
        };
        
        await createUser(updatedUser);
        return done(null, updatedUser);
      } else {
        // Create new user
        const newUser = {
          id: uuidv4(),
          github_id: profile.id,
          username: profile.username,
          display_name: profile.displayName,
          avatar_url: profile.photos?.[0]?.value || null
        };
        
        await createUser(newUser);
        return done(null, newUser);
      }
    } catch (error) {
      console.error('GitHub authentication error:', error);
      return done(error, null);
    }
  }));

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await getUserById(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });
}

export function requireAuth(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'Authentication required' });
}

export function optionalAuth(req, res, next) {
  // Add user to request if authenticated, but don't require it
  next();
}