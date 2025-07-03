import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { BACKEND_URL } from '../config';

interface User {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: () => void;
  logout: () => void;
  refreshAuth: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = async () => {
    try {
      // Check for auth token in localStorage
      const authToken = localStorage.getItem('auth_token');
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      if (authToken) {
        headers.authorization = `Bearer ${authToken}`;
      }
      
      const response = await fetch(`${BACKEND_URL}/auth/me`, {
        credentials: 'include',
        headers,
      });
      
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        setUser(null);
        // Clear invalid token
        if (authToken) {
          localStorage.removeItem('auth_token');
        }
      }
    } catch (error) {
      console.error('Error checking auth:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = () => {
    window.location.href = `${BACKEND_URL}/auth/github`;
  };

  const logout = async () => {
    try {
      await fetch(`${BACKEND_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
      localStorage.removeItem('auth_token');
      setUser(null);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const refreshAuth = () => {
    checkAuth();
  };

  useEffect(() => {
    // Check for auth token in URL
    const urlParams = new URLSearchParams(window.location.search);
    const authToken = urlParams.get('auth_token');
    
    if (authToken) {
      // Store token and remove from URL
      localStorage.setItem('auth_token', authToken);
      window.history.replaceState({}, document.title, window.location.pathname);
      
      // Validate token with backend
      fetch(`${BACKEND_URL}/auth/validate-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: authToken }),
      })
      .then(response => response.json())
      .then(async (data) => {
        if (data.user) {
          // Check for anonymous endpoints to migrate
          const anonymousEndpoints = localStorage.getItem('anonymous_endpoints');
          if (anonymousEndpoints) {
            try {
              const endpointIds = JSON.parse(anonymousEndpoints);
              
              // Migrate endpoints to authenticated user
              const migrateResponse = await fetch(`${BACKEND_URL}/auth/migrate-endpoints`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({ endpointIds })
              });
              
              if (migrateResponse.ok) {
                // Clear anonymous endpoints from localStorage after successful migration
                localStorage.removeItem('anonymous_endpoints');
              }
            } catch (error) {
              console.error('Error migrating endpoints:', error);
            }
          }
          
          setUser(data.user);
        } else {
          localStorage.removeItem('auth_token');
        }
        setLoading(false);
      })
      .catch(error => {
        console.error('Error validating token:', error);
        localStorage.removeItem('auth_token');
        setLoading(false);
      });
    } else {
      checkAuth();
    }
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      logout,
      refreshAuth
    }}>
      {children}
    </AuthContext.Provider>
  );
}