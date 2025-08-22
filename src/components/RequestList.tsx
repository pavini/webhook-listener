import { useState, useEffect, useRef } from 'react';
import { HttpRequest } from '../types';

interface RequestListProps {
  requests: HttpRequest[];
  selectedRequest: string | null;
  onSelectRequest: (requestId: string) => void;
  onDeleteRequest: (requestId: string) => void;
  selectedEndpoint?: string | null; // Add endpoint context for proper animation logic
}

export const RequestList = ({
  requests,
  selectedRequest,
  onSelectRequest,
  onDeleteRequest,
  selectedEndpoint,
}: RequestListProps) => {
  const [newRequests, setNewRequests] = useState<Set<string>>(new Set());
  const lastRequestTimestamp = useRef<number>(0);

  useEffect(() => {
    if (requests.length === 0) return;
    
    // Find requests that are newer than our last known timestamp
    const recentRequests = requests.filter(request => {
      const requestTime = new Date(request.timestamp).getTime();
      return requestTime > lastRequestTimestamp.current;
    });
    
    if (recentRequests.length > 0 && lastRequestTimestamp.current > 0) {
      // Get the most recent request (should be the newest)
      const newestRequest = recentRequests.reduce((newest, current) => {
        const newestTime = new Date(newest.timestamp).getTime();
        const currentTime = new Date(current.timestamp).getTime();
        return currentTime > newestTime ? current : newest;
      });
      
      // Only animate the single newest request
      setNewRequests(new Set([newestRequest.id]));
      
      // Clear animation after delay
      const clearTimer = setTimeout(() => {
        setNewRequests(prev => {
          const updated = new Set(prev);
          updated.delete(newestRequest.id);
          return updated;
        });
      }, 1200);
      
      // Update our timestamp reference to the newest request
      lastRequestTimestamp.current = new Date(newestRequest.timestamp).getTime();
      
      return () => clearTimeout(clearTimer);
    } else if (lastRequestTimestamp.current === 0 && requests.length > 0) {
      // Initialize timestamp on first load
      const latestRequest = requests.reduce((latest, current) => {
        const latestTime = new Date(latest.timestamp).getTime();
        const currentTime = new Date(current.timestamp).getTime();
        return currentTime > latestTime ? current : latest;
      });
      lastRequestTimestamp.current = new Date(latestRequest.timestamp).getTime();
    }
  }, [requests]);

  // Reset timestamp when endpoint changes
  useEffect(() => {
    if (requests.length > 0) {
      const latestRequest = requests.reduce((latest, current) => {
        const latestTime = new Date(latest.timestamp).getTime();
        const currentTime = new Date(current.timestamp).getTime();
        return currentTime > latestTime ? current : latest;
      });
      lastRequestTimestamp.current = new Date(latestRequest.timestamp).getTime();
    }
    setNewRequests(new Set()); // Clear any animations when switching endpoints
  }, [selectedEndpoint]);
  return (
    <div className="request-list">
      <h2>Requests</h2>
      {requests.length === 0 ? (
        <p>No requests received yet.</p>
      ) : (
        <ul>
          {requests.map((request) => (
            <li
              key={request.id}
              className={`request-item ${selectedRequest === request.id ? 'selected' : ''} ${newRequests.has(request.id) ? 'request-new' : ''}`}
              onClick={() => onSelectRequest(request.id)}
            >
              <div className="request-header">
                <span className={`method ${request.method.toLowerCase()}`}>
                  {request.method}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteRequest(request.id);
                  }}
                  className="delete-btn-icon"
                  title="Delete request"
                >
                  🗑️
                </button>
              </div>
              <div className="request-info">
                <div className="url-container">
                  {request.subPath ? (
                    <div className="url-with-subpath">
                      <span className="base-path">{request.path || 'unknown'}</span>
                      <span className="subpath-separator">/</span>
                      <span className="sub-path">{request.subPath}</span>
                    </div>
                  ) : (
                    <span className="url">{request.url}</span>
                  )}
                </div>
                <span className="timestamp">
                  {new Date(request.timestamp).toLocaleTimeString()}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};