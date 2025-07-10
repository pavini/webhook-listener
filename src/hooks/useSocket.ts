import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { HttpRequest, Endpoint } from '../types';
import { BACKEND_URL } from '../config';

export const useSocket = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    console.log('Connecting to Socket.IO server at:', BACKEND_URL);
    
    const newSocket = io(BACKEND_URL, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true
    });
    
    newSocket.on('connect', () => {
      console.log('Socket.IO connected');
      setConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('Socket.IO disconnected');
      setConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket.IO connection error:', error);
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
    
    return () => {
      socket.off('endpoint_created', callback);
    };
  };

  const subscribeToEndpointDeletion = (callback: (data: { id: string }) => void) => {
    if (!socket) return;

    socket.on('endpoint_deleted', callback);
    
    return () => {
      socket.off('endpoint_deleted', callback);
    };
  };

  const subscribeToRequestDeletion = (callback: (data: { requestId: string }) => void) => {
    if (!socket) return;

    socket.on('requestDeleted', callback);
    
    return () => {
      socket.off('requestDeleted', callback);
    };
  };

  return {
    socket,
    connected,
    subscribeToRequests,
    subscribeToEndpoints,
    subscribeToEndpointDeletion,
    subscribeToRequestDeletion,
  };
};