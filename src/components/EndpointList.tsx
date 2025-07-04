import { useState, useLayoutEffect, useRef } from 'react';
import { Endpoint } from '../types';
import { BACKEND_URL } from '../config';

interface EndpointListProps {
  endpoints: Endpoint[];
  selectedEndpoint: string | null;
  onSelectEndpoint: (endpointId: string) => void;
  onDeleteEndpoint: (endpointId: string) => void;
}

export const EndpointList = ({
  endpoints,
  selectedEndpoint,
  onSelectEndpoint,
  onDeleteEndpoint,
}: EndpointListProps) => {
  const [copiedEndpoints, setCopiedEndpoints] = useState<Set<string>>(new Set());
  const [newEndpoints, setNewEndpoints] = useState<Set<string>>(new Set());
  const prevEndpointsRef = useRef<string[]>([]);

  useLayoutEffect(() => {
    const currentIds = endpoints.map(e => e.id);
    const previousIds = prevEndpointsRef.current;
    
    const newIds = currentIds.filter(id => !previousIds.includes(id));
    
    if (newIds.length > 0) {
      setNewEndpoints(new Set(newIds));
      
      const timer = setTimeout(() => {
        setNewEndpoints(new Set());
      }, 800);
      
      return () => clearTimeout(timer);
    }
    
    prevEndpointsRef.current = currentIds;
  }, [endpoints]);

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

  return (
    <div className="endpoint-list">
      <h2>Endpoints</h2>
      {endpoints.length === 0 ? (
        <p>No endpoints created yet.</p>
      ) : (
        <ul>
          {endpoints.map((endpoint) => (
            <li
              key={endpoint.id}
              className={`endpoint-item ${selectedEndpoint === endpoint.id ? 'selected' : ''} ${newEndpoints.has(endpoint.id) ? 'endpoint-new' : ''}`}
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
                <span className="request-count">
                  {endpoint.requestCount} requests
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};