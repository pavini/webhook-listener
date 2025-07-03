import { useState, useEffect } from 'react';
import { HttpRequest, Endpoint } from './types';
import { useSocket } from './hooks/useSocket';
import { useAuth } from './contexts/AuthContext';
import { BACKEND_URL } from './config';
import { EndpointList } from './components/EndpointList';
import { RequestList } from './components/RequestList';
import { RequestDetails } from './components/RequestDetails';
import { CreateEndpoint } from './components/CreateEndpoint';
import { UserButton } from './components/UserButton';
import './App.css';

function App() {
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [requests, setRequests] = useState<HttpRequest[]>([]);
  const [selectedEndpoint, setSelectedEndpoint] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);
  const { connected, subscribeToRequests, subscribeToEndpoints } = useSocket();
  const { user, refreshAuth } = useAuth();

  // Load initial data when authentication changes
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // Load endpoints
        const endpointsResponse = await fetch(`${BACKEND_URL}/api/endpoints`, {
          credentials: 'include'
        });
        if (endpointsResponse.ok) {
          const endpointsData = await endpointsResponse.json();
          setEndpoints(endpointsData);
        }

        // Load requests
        const requestsResponse = await fetch(`${BACKEND_URL}/api/requests`, {
          credentials: 'include'
        });
        if (requestsResponse.ok) {
          const requestsData = await requestsResponse.json();
          setRequests(requestsData);
        }
      } catch (error) {
        console.error('Error loading initial data:', error);
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
      setEndpoints(prev => [...prev, endpoint]);
    });

    return () => {
      unsubscribeRequests?.();
      unsubscribeEndpoints?.();
    };
  }, [subscribeToRequests, subscribeToEndpoints]);

  const handleCreateEndpoint = async (name: string) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/endpoints`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ name }),
      });
      
      if (!response.ok) {
        console.error('Failed to create endpoint');
      }
      // Note: Don't add to state here - the WebSocket will handle it
    } catch (error) {
      console.error('Error creating endpoint:', error);
    }
  };

  const handleDeleteEndpoint = (endpointId: string) => {
    setEndpoints(prev => prev.filter(endpoint => endpoint.id !== endpointId));
    setRequests(prev => prev.filter(request => request.endpointId !== endpointId));
    if (selectedEndpoint === endpointId) {
      setSelectedEndpoint(null);
      setSelectedRequest(null);
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
        <h1>HookDebug</h1>
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
