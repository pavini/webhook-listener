export interface HttpRequest {
  id: string;
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string;
  timestamp: Date;
  endpointId: string;
  path?: string;      // Base endpoint path
  subPath?: string;   // Sub-path after the endpoint
  fullPath?: string;  // Complete path including sub-path
}

export interface Endpoint {
  id: string;
  name: string;
  path: string;
  created: Date;
  requestCount: number;
}

export interface WebSocketMessage {
  type: 'new_request' | 'endpoint_created' | 'endpoint_deleted';
  data: HttpRequest | Endpoint;
}