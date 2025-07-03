export interface HttpRequest {
  id: string;
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string;
  timestamp: Date;
  endpointId: string;
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