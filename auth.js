import passport from 'passport';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { v4 as uuidv4 } from 'uuid';
import { getUserByGithubId, createUser, getUserById } from './database.js';

export function configurePassport() {
  // Only configure GitHub OAuth if credentials are provided
  if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
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
  } else {
    console.warn('GitHub OAuth not configured - GitHub authentication will be disabled');
  }
}

export function requireAuth(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'Authentication required' });
}

export function optionalAuth(req, res, next) {
  // Check for Bearer token first
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '');
    
    // Get authTokens from the main server file (we'll need to pass it)
    // For now, we'll handle this in the server.js file directly
    return next();
  }
  
  // Fallback to session-based auth
  next();
}