import { useState, useEffect } from 'react';
import { HttpRequest, Endpoint } from './types';
import { useSocket } from './hooks/useSocket';
import { useAuth } from './hooks/useAuth';
import { useAnonymousSession } from './hooks/useAnonymousSession';
import { BACKEND_URL } from './config';
import { EndpointList } from './components/EndpointList';
import { RequestList } from './components/RequestList';
import { RequestDetails } from './components/RequestDetails';
import { CreateEndpoint } from './components/CreateEndpoint';
import { UserButton } from './components/UserButton';
import Logo from './components/Logo';
import './App.css';

function App() {
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [requests, setRequests] = useState<HttpRequest[]>([]);
  const [selectedEndpoint, setSelectedEndpoint] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);
  const [newEndpointId, setNewEndpointId] = useState<string | null>(null);
  const { connected, subscribeToRequests, subscribeToEndpoints, subscribeToEndpointDeletion } = useSocket();
  const { user } = useAuth();
  useAnonymousSession(); // Initialize anonymous session

  // Clear data when user logs out
  useEffect(() => {
    if (!user) {
      // User logged out, clearing authenticated data
      // Keep endpoints and requests as they will be reloaded for anonymous user
    }
  }, [user]);

  // Helper function to make authenticated requests
  const makeAuthenticatedRequest = async (url: string, options: RequestInit = {}) => {
    const authToken = localStorage.getItem('auth_token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };
    
    if (authToken) {
      headers.authorization = `Bearer ${authToken}`;
    }
    
    return fetch(url, {
      credentials: 'include',
      ...options,
      headers,
    });
  };

  // Load initial data when authentication changes
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // Loading initial data for user: ${user ? user.username : 'anonymous'}
        
        // Load endpoints
        const endpointsUrl = `${BACKEND_URL}/api/endpoints`;
        
        const endpointsResponse = await makeAuthenticatedRequest(endpointsUrl);
        if (endpointsResponse.ok) {
          const endpointsData = await endpointsResponse.json();
          setEndpoints(endpointsData);
        }

        // Load requests
        const requestsResponse = await makeAuthenticatedRequest(`${BACKEND_URL}/api/requests`);
        if (requestsResponse.ok) {
          const requestsData = await requestsResponse.json();
          // Loaded requests: ${requestsData.length}
          setRequests(requestsData);
        }
      } catch {
        // Error loading initial data
      }
    };

    loadInitialData();
  }, [user]);

  useEffect(() => {
    const unsubscribeRequests = subscribeToRequests((request: HttpRequest) => {
      setRequests(prev => [request, ...prev]);
      setEndpoints(prev => prev.map(endpoint => 
        endpoint.id === request.endpointId 
          ? { ...endpoint, requestCount: endpoint.requestCount + 1 }
          : endpoint
      ));
    });

    const unsubscribeEndpoints = subscribeToEndpoints((endpoint: Endpoint) => {
      setEndpoints(prev => {
        // Check if endpoint already exists to avoid duplicates
        const exists = prev.some(ep => ep.id === endpoint.id);
        
        if (exists) {
          return prev;
        }
        
        // Set this endpoint for animation
        setNewEndpointId(endpoint.id);
        
        // Clear the animation flag after a short delay
        setTimeout(() => {
          setNewEndpointId(null);
        }, 1000);
        
        return [...prev, endpoint];
      });
    });

    const unsubscribeEndpointDeletion = subscribeToEndpointDeletion((data: { id: string }) => {
      setEndpoints(prev => prev.filter(endpoint => endpoint.id !== data.id));
      setRequests(prev => prev.filter(request => request.endpointId !== data.id));
      if (selectedEndpoint === data.id) {
        setSelectedEndpoint(null);
        setSelectedRequest(null);
      }
    });

    return () => {
      unsubscribeRequests?.();
      unsubscribeEndpoints?.();
      unsubscribeEndpointDeletion?.();
    };
  }, [subscribeToRequests, subscribeToEndpoints, subscribeToEndpointDeletion, user, selectedEndpoint]);

  const handleCreateEndpoint = async (name: string) => {
    try {
      // Creating endpoint: ${name} for user: ${user ? user.username : 'anonymous'}
      
      const response = await makeAuthenticatedRequest(`${BACKEND_URL}/api/endpoints`, {
        method: 'POST',
        body: JSON.stringify({ name }),
      });
      
      if (!response.ok) {
        // Failed to create endpoint
      }
      // Note: Don't add to state here - the WebSocket will handle it
    } catch {
      // Error creating endpoint
    }
  };

  const handleDeleteEndpoint = async (endpointId: string) => {
    try {
      // Delete from backend
      const response = await makeAuthenticatedRequest(`${BACKEND_URL}/api/endpoints/${endpointId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        // Failed to delete endpoint from backend
        console.error('Failed to delete endpoint');
      }
      // Note: Don't update local state here - the WebSocket will handle it
    } catch {
      // Error deleting endpoint
    }
  };

  const handleDeleteRequest = (requestId: string) => {
    setRequests(prev => prev.filter(request => request.id !== requestId));
    if (selectedRequest === requestId) {
      setSelectedRequest(null);
    }
  };

  const filteredRequests = selectedEndpoint 
    ? requests.filter(request => request.endpointId === selectedEndpoint)
    : requests;

  const selectedRequestData = selectedRequest 
    ? requests.find(request => request.id === selectedRequest) || null
    : null;

  return (
    <div className="app">
      <header className="app-header">
        <h1>
          <Logo />
          HookDebug
        </h1>
        <div className="header-controls">
          <div className="connection-status">
            Status: <span className={connected ? 'connected' : 'disconnected'}>
              {connected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          <UserButton />
        </div>
      </header>
      
      <main className="app-main">
        <div className="sidebar">
          <CreateEndpoint onCreateEndpoint={handleCreateEndpoint} />
          <EndpointList
            endpoints={endpoints}
            selectedEndpoint={selectedEndpoint}
            onSelectEndpoint={setSelectedEndpoint}
            onDeleteEndpoint={handleDeleteEndpoint}
            newEndpointId={newEndpointId}
          />
        </div>
        
        <div className="content">
          <div className="requests-panel">
            <RequestList
              requests={filteredRequests}
              selectedRequest={selectedRequest}
              onSelectRequest={setSelectedRequest}
              onDeleteRequest={handleDeleteRequest}
            />
          </div>
          
          <div className="details-panel">
            <RequestDetails request={selectedRequestData} />
          </div>
        </div>
      </main>
    </div>
  );
}

export default App
