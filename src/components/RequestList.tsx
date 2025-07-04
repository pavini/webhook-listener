import { useState, useLayoutEffect, useRef } from 'react';
import { HttpRequest } from '../types';

interface RequestListProps {
  requests: HttpRequest[];
  selectedRequest: string | null;
  onSelectRequest: (requestId: string) => void;
  onDeleteRequest: (requestId: string) => void;
}

export const RequestList = ({
  requests,
  selectedRequest,
  onSelectRequest,
  onDeleteRequest,
}: RequestListProps) => {
  const [newRequests, setNewRequests] = useState<Set<string>>(new Set());
  const prevRequestsRef = useRef<string[]>([]);

  useLayoutEffect(() => {
    const currentIds = requests.map(r => r.id);
    const previousIds = prevRequestsRef.current;
    
    const newIds = currentIds.filter(id => !previousIds.includes(id));
    
    if (newIds.length > 0) {
      setNewRequests(new Set(newIds));
      
      const timer = setTimeout(() => {
        setNewRequests(new Set());
      }, 1200);
      
      return () => clearTimeout(timer);
    }
    
    prevRequestsRef.current = currentIds;
  }, [requests]);
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
                <span className="url">{request.url}</span>
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