export type SSEEventTypes = 
  | 'incident.created' 
  | 'incident.updated' 
  | 'incident.escalated' 
  | 'incident.buster_call' 
  | 'incident.resolved';

type SSECallback = (data: any) => void;

class SSEClient {
  private eventSource: EventSource | null = null;
  private url: string;
  private listeners: Map<string, Set<SSECallback>> = new Map();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(url: string) {
    this.url = url;
  }

  connect() {
    if (this.eventSource) return;

    this.eventSource = new EventSource(this.url);

    this.eventSource.onopen = () => {
      console.log('[SSE] Connected to Event Stream');
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
    };

    this.eventSource.onerror = (err) => {
      console.error('[SSE] Connection error, reconnecting...', err);
      this.close();
      this.reconnectTimer = setTimeout(() => this.connect(), 3000);
    };

    // Proxy events to local listeners
    this.eventSource.addEventListener('message', (e) => this.dispatch('message', e.data));
    this.eventSource.addEventListener('incident.created', (e) => this.dispatch('incident.created', JSON.parse(e.data)));
    this.eventSource.addEventListener('incident.updated', (e) => this.dispatch('incident.updated', JSON.parse(e.data)));
    this.eventSource.addEventListener('incident.escalated', (e) => this.dispatch('incident.escalated', JSON.parse(e.data)));
    this.eventSource.addEventListener('incident.buster_call', (e) => this.dispatch('incident.buster_call', JSON.parse(e.data)));
    this.eventSource.addEventListener('incident.resolved', (e) => this.dispatch('incident.resolved', JSON.parse(e.data)));
  }

  close() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  on(event: string, callback: SSECallback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: SSECallback) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.delete(callback);
    }
  }

  private dispatch(event: string, data: any) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((cb) => cb(data));
    }
  }
}

import { API_BASE } from './api';
export const sse = new SSEClient(`${API_BASE}/api/stream`);
