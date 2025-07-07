import { useState, useEffect } from 'react';

export const useAnonymousSession = () => {
  const [anonymousId, setAnonymousId] = useState<string | null>(null);

  useEffect(() => {
    // Get the anonymous ID from the cookie
    const getAnonymousId = () => {
      const cookies = document.cookie.split(';');
      for (const cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'anonymous_id') {
          return value;
        }
      }
      return null;
    };

    const id = getAnonymousId();
    setAnonymousId(id);
  }, []);

  return { anonymousId };
};