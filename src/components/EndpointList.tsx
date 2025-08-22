import { useState, useEffect } from 'react';
import { Endpoint } from '../types';
import { BACKEND_URL } from '../config';

interface EndpointListProps {
  endpoints: Endpoint[];
  selectedEndpoint: string | null;
  onSelectEndpoint: (endpointId: string) => void;
  onDeleteEndpoint: (endpointId: string) => void;
  newEndpointId?: string | null; // Pass the newly created endpoint ID from parent
  endpointsWithNewRequests?: Set<string>; // Pass endpoints that just received requests
}

export const EndpointList = ({
  endpoints,
  selectedEndpoint,
  onSelectEndpoint,
  onDeleteEndpoint,
  newEndpointId,
  endpointsWithNewRequests = new Set(),
}: EndpointListProps) => {
  const [copiedEndpoints, setCopiedEndpoints] = useState<Set<string>>(new Set());
  const [animatingEndpoints, setAnimatingEndpoints] = useState<Set<string>>(new Set());

  // Handle animation for new endpoints
  useEffect(() => {
    if (newEndpointId && endpoints.some(ep => ep.id === newEndpointId)) {
      setAnimatingEndpoints(new Set([newEndpointId]));
      
      const timer = setTimeout(() => {
        setAnimatingEndpoints(prev => {
          const updated = new Set(prev);
          updated.delete(newEndpointId);
          return updated;
        });
      }, 800);
      
      return () => clearTimeout(timer);
    }
  }, [newEndpointId, endpoints]);

  const handleCopyUrl = async (endpoint: Endpoint, e: React.MouseEvent) => {
    e.stopPropagation();
    const fullUrl = `${BACKEND_URL}/${endpoint.path}`;
    
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopiedEndpoints(prev => new Set(prev).add(endpoint.id));
      setTimeout(() => {
        setCopiedEndpoints(prev => {
          const newSet = new Set(prev);
          newSet.delete(endpoint.id);
          return newSet;
        });
      }, 2000);
    } catch (err) {
      console.error('Failed to copy URL:', err);
    }
  };

  // Sort endpoints by creation date (newest first)
  const sortedEndpoints = [...endpoints].sort((a, b) => 
    new Date(b.created).getTime() - new Date(a.created).getTime()
  );

  return (
    <div className="endpoint-list">
      <h2>Endpoints</h2>
      {endpoints.length === 0 ? (
        <p>No endpoints created yet.</p>
      ) : (
        <ul>
          {sortedEndpoints.map((endpoint) => (
            <li
              key={endpoint.id}
              className={`endpoint-item ${selectedEndpoint === endpoint.id ? 'selected' : ''} ${animatingEndpoints.has(endpoint.id) ? 'endpoint-new' : ''} ${endpointsWithNewRequests.has(endpoint.id) ? 'endpoint-request' : ''}`}
              onClick={() => onSelectEndpoint(endpoint.id)}
            >
              <div className="endpoint-header">
                <span className="endpoint-name">{endpoint.name}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteEndpoint(endpoint.id);
                  }}
                  className="delete-btn-icon"
                  title="Delete endpoint"
                >
                  🗑️
                </button>
              </div>
              <div className="endpoint-info">
                <div 
                  className={`endpoint-url ${copiedEndpoints.has(endpoint.id) ? 'copied' : ''}`}
                  onClick={(e) => handleCopyUrl(endpoint, e)}
                  title="Click to copy URL"
                >
                  <span>{BACKEND_URL}/{endpoint.path}</span>
                  {copiedEndpoints.has(endpoint.id) && <span className="copied-indicator">✓ Copied!</span>}
                </div>
                <div className="endpoint-meta">
                  <span className="request-count">
                    {endpoint.requestCount} requests
                  </span>
                  <span className="creation-date">
                    Created: {new Date(endpoint.created).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};