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
              className={selectedRequest === request.id ? 'selected' : ''}
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