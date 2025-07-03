import { useState } from 'react';
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
              className={selectedEndpoint === endpoint.id ? 'selected' : ''}
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