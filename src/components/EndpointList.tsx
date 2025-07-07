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
    
    // Only detect new items if we have previous data (avoid initial load animation)
    if (previousIds.length > 0) {
      const newIds = currentIds.filter(id => !previousIds.includes(id));
      
      // Only animate if we have truly new endpoints (not a full reload)
      if (newIds.length > 0 && newIds.length < currentIds.length) {
        // Only set the truly new endpoints, don't replace the entire set
        setNewEndpoints(prev => {
          const updated = new Set(prev);
          newIds.forEach(id => updated.add(id));
          return updated;
        });
        
        // Clear the animation for these specific new endpoints
        const timer = setTimeout(() => {
          setNewEndpoints(prev => {
            const updated = new Set(prev);
            newIds.forEach(id => updated.delete(id));
            return updated;
          });
        }, 800);
        
        return () => clearTimeout(timer);
      }
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