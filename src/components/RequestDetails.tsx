import { useState } from 'react';
import { HttpRequest } from '../types';

interface RequestDetailsProps {
  request: HttpRequest | null;
}

export const RequestDetails = ({ request }: RequestDetailsProps) => {
  const [copiedSections, setCopiedSections] = useState<Set<string>>(new Set());

  const handleCopy = async (content: string, sectionId: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedSections(prev => new Set(prev).add(sectionId));
      setTimeout(() => {
        setCopiedSections(prev => {
          const newSet = new Set(prev);
          newSet.delete(sectionId);
          return newSet;
        });
      }, 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };
  if (!request) {
    return (
      <div className="request-details">
        <p>Select a request to view details</p>
      </div>
    );
  }

  return (
    <div className="request-details">
      <h2>Request Details</h2>
      <div className="request-meta">
        <div className="section-header">
          <h3>Request Info</h3>
          <button
            onClick={() => handleCopy(
              `Method: ${request.method}\nURL: ${request.url}\nTimestamp: ${new Date(request.timestamp).toLocaleString()}`,
              'meta'
            )}
            className={`copy-btn-icon ${copiedSections.has('meta') ? 'copied' : ''}`}
            title="Copy request info"
          >
            {copiedSections.has('meta') ? '✓' : '📋'}
          </button>
        </div>
        <div className="meta-item">
          <strong>Method:</strong> <span className={`method ${request.method.toLowerCase()}`}>{request.method}</span>
        </div>
        <div className="meta-item">
          <strong>URL:</strong> {request.url}
        </div>
        <div className="meta-item">
          <strong>Timestamp:</strong> {new Date(request.timestamp).toLocaleString()}
        </div>
      </div>
      
      <div className="headers-section">
        <div className="section-header">
          <h3>Headers</h3>
          <button
            onClick={() => handleCopy(
              Object.entries(request.headers)
                .map(([key, value]) => `${key}: ${value}`)
                .join('\n'),
              'headers'
            )}
            className={`copy-btn-icon ${copiedSections.has('headers') ? 'copied' : ''}`}
            title="Copy headers"
          >
            {copiedSections.has('headers') ? '✓' : '📋'}
          </button>
        </div>
        <div className="headers-list">
          {Object.entries(request.headers).map(([key, value]) => (
            <div key={key} className="header-item">
              <span className="header-key">{key}:</span>
              <span className="header-value">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {request.body && (
        <div className="body-section">
          <div className="section-header">
            <h3>Body</h3>
            <button
              onClick={() => handleCopy(request.body || '', 'body')}
              className={`copy-btn-icon ${copiedSections.has('body') ? 'copied' : ''}`}
              title="Copy body"
            >
              {copiedSections.has('body') ? '✓' : '📋'}
            </button>
          </div>
          <pre className="body-content">{request.body}</pre>
        </div>
      )}
    </div>
  );
};