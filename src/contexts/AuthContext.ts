import { createContext } from 'react';

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

export const AuthContext = createContext<AuthContextType | undefined>(undefined);