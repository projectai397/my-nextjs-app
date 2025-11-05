/**
 * WebSocket Service
 * Handles real-time data updates via WebSocket connections
 */

export type WebSocketEventType = 
  | 'price_update'
  | 'trade_executed'
  | 'order_update'
  | 'position_update'
  | 'notification'
  | 'market_data';

export interface WebSocketMessage {
  type: WebSocketEventType;
  data: any;
  timestamp: number;
}

export type WebSocketCallback = (message: WebSocketMessage) => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second
  private listeners: Map<WebSocketEventType, Set<WebSocketCallback>> = new Map();
  private isConnecting = false;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private url: string = '';

  /**
   * Initialize WebSocket connection
   */
  connect(url?: string): void {
    if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) {
      console.log('WebSocket already connected or connecting');
      return;
    }

    this.isConnecting = true;
    this.url = url || this.getWebSocketUrl();

    try {
      this.ws = new WebSocket(this.url);
      this.setupEventHandlers();
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  /**
   * Get WebSocket URL from environment or default
   */
  private getWebSocketUrl(): string {
    // Try to get from environment
    if (typeof window !== 'undefined') {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      return `${protocol}//${host}/ws`;
    }
    
    // Fallback to default
    return process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3000/ws';
  }

  /**
   * Setup WebSocket event handlers
   */
  private setupEventHandlers(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.isConnecting = false;
      this.reconnectAttempts = 0;
      this.reconnectDelay = 1000;
      this.startHeartbeat();
      
      // Notify all listeners about connection
      this.notifyListeners('notification', {
        type: 'connection',
        status: 'connected',
        message: 'WebSocket connected successfully'
      });
    };

    this.ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        this.handleMessage(message);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.notifyListeners('notification', {
        type: 'error',
        message: 'WebSocket connection error'
      });
    };

    this.ws.onclose = (event) => {
      console.log('WebSocket closed:', event.code, event.reason);
      this.isConnecting = false;
      this.stopHeartbeat();
      
      // Notify listeners about disconnection
      this.notifyListeners('notification', {
        type: 'connection',
        status: 'disconnected',
        message: 'WebSocket disconnected'
      });

      // Attempt to reconnect if not a normal closure
      if (event.code !== 1000) {
        this.scheduleReconnect();
      }
    };
  }

  /**
   * Handle incoming WebSocket message
   */
  private handleMessage(message: WebSocketMessage): void {
    // Add timestamp if not present
    if (!message.timestamp) {
      message.timestamp = Date.now();
    }

    // Notify listeners for this message type
    this.notifyListeners(message.type, message.data);
  }

  /**
   * Notify all listeners for a specific event type
   */
  private notifyListeners(type: WebSocketEventType, data: any): void {
    const listeners = this.listeners.get(type);
    if (listeners) {
      const message: WebSocketMessage = {
        type,
        data,
        timestamp: Date.now()
      };
      listeners.forEach(callback => {
        try {
          callback(message);
        } catch (error) {
          console.error('Error in WebSocket listener:', error);
        }
      });
    }
  }

  /**
   * Subscribe to WebSocket events
   */
  subscribe(type: WebSocketEventType, callback: WebSocketCallback): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    
    this.listeners.get(type)!.add(callback);

    // Return unsubscribe function
    return () => {
      const listeners = this.listeners.get(type);
      if (listeners) {
        listeners.delete(callback);
      }
    };
  }

  /**
   * Unsubscribe from WebSocket events
   */
  unsubscribe(type: WebSocketEventType, callback: WebSocketCallback): void {
    const listeners = this.listeners.get(type);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  /**
   * Send message through WebSocket
   */
  send(type: WebSocketEventType, data: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const message: WebSocketMessage = {
        type,
        data,
        timestamp: Date.now()
      };
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, cannot send message');
    }
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      this.notifyListeners('notification', {
        type: 'error',
        message: 'Failed to reconnect to WebSocket'
      });
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * Start heartbeat to keep connection alive
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();
    
    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.send('notification', { type: 'ping' });
      }
    }, 30000); // Send ping every 30 seconds
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Disconnect WebSocket
   */
  disconnect(): void {
    this.stopHeartbeat();
    
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    
    this.isConnecting = false;
    this.reconnectAttempts = 0;
  }

  /**
   * Check if WebSocket is connected
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Get connection state
   */
  getState(): 'connecting' | 'open' | 'closing' | 'closed' {
    if (!this.ws) return 'closed';
    
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING:
        return 'connecting';
      case WebSocket.OPEN:
        return 'open';
      case WebSocket.CLOSING:
        return 'closing';
      case WebSocket.CLOSED:
        return 'closed';
      default:
        return 'closed';
    }
  }
}

// Export singleton instance
export const websocketService = new WebSocketService();

// React hook for WebSocket
export function useWebSocket(type: WebSocketEventType, callback: WebSocketCallback) {
  if (typeof window === 'undefined') return;

  // Subscribe on mount
  const unsubscribe = websocketService.subscribe(type, callback);

  // Connect if not already connected
  if (!websocketService.isConnected()) {
    websocketService.connect();
  }

  // Unsubscribe on unmount
  return unsubscribe;
}

export default websocketService;
