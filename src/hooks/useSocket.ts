import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { HttpRequest, Endpoint } from '../types';
import { BACKEND_URL } from '../config';

export const useSocket = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const newSocket = io(BACKEND_URL);
    
    newSocket.on('connect', () => {
      setConnected(true);
    });

    newSocket.on('disconnect', () => {
      setConnected(false);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  const subscribeToRequests = (callback: (request: HttpRequest) => void) => {
    if (!socket) return;

    socket.on('new_request', callback);
    
    return () => {
      socket.off('new_request', callback);
    };
  };

  const subscribeToEndpoints = (callback: (endpoint: Endpoint) => void) => {
    if (!socket) return;

    socket.on('endpoint_created', callback);
    socket.on('endpoint_deleted', callback);
    
    return () => {
      socket.off('endpoint_created', callback);
      socket.off('endpoint_deleted', callback);
    };
  };

  return {
    socket,
    connected,
    subscribeToRequests,
    subscribeToEndpoints,
  };
};