// Determine backend URL based on environment
const getBackendURL = () => {
  // Check if we have an explicit environment variable
  if (import.meta.env.VITE_BACKEND_URL) {
    return import.meta.env.VITE_BACKEND_URL;
  }
  
  // In development, use localhost:3001
  if (import.meta.env.DEV) {
    return 'http://localhost:3001';
  }
  
  // In production, use the same host as the frontend but different port
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    // If running on port 5173 (Vite dev), use 3001 for backend
    // Otherwise, try to determine the backend port
    if (window.location.port === '5173') {
      return `${protocol}//${hostname}:3001`;
    }
    // For production, assume backend is on the same host with different port
    return `${protocol}//${hostname}:3001`;
  }
  
  // Fallback
  return 'http://localhost:3001';
};

export const BACKEND_URL = getBackendURL();
