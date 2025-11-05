// lib/WebSocketManager.ts
/* eslint-disable no-console */
import ReconnectingWebSocket, { Options as ReconnectingWebSocketOptions } from "reconnecting-websocket";

const WS_BASE_URL = process.env.NEXT_PUBLIC_SOCKET_LIVE_URL ?? "";
let WS_TOKEN = process.env.NEXT_PUBLIC_SOCKET_TOKEN ?? "";

type Listener = (data: unknown) => void;

function uniqStrings(arr: string[]): string[] {
  return Array.from(new Set(arr.filter(Boolean)));
}

class WebSocketManager {
  private socket: ReconnectingWebSocket | null = null;
  private symbolNames: string[] = [];
  private listeners = new Set<Listener>();
  private isConnecting = false;

  /** Safe to call multiple times; only connects in the browser. */
  connect(): void {
    if (this.socket || this.isConnecting) return;
    if (typeof window === "undefined") return; // SSR guard

    try {
      this.isConnecting = true;

      const base = WS_BASE_URL;
      // Ensure we build a valid ws/wss URL (supports with/without trailing slash)
      const urlObj = new URL(base);
      // Append "data" path segment
      urlObj.pathname = [urlObj.pathname.replace(/\/+$/, ""), "data"].join("/");

      if (WS_TOKEN) {
        urlObj.searchParams.set("token", WS_TOKEN);
      }

      const options: ReconnectingWebSocketOptions = {
        WebSocket: window.WebSocket,
        connectionTimeout: 8000,
        maxRetries: Infinity, // retry forever
        debug: false,
        startClosed: false,
      };

      this.socket = new ReconnectingWebSocket(urlObj.toString(), [], options);

      this.socket.addEventListener("open", () => {
       console.log("✅ WebSocket connected");
        if (this.symbolNames.length > 0) {
          this.safeSend({ symbols: this.symbolNames });
        }
      });

      this.socket.addEventListener("message", (evt: MessageEvent) => {
        try {
          const data = JSON.parse(evt.data as string);
          this.notifyListeners(data);
        } catch {
          this.notifyListeners(evt.data);
        }
      });

      this.socket.addEventListener("error", (err) => {
       console.error("⚠️ WebSocket error:", err);
      });

      this.socket.addEventListener("close", () => {
          console.log("🔴 WebSocket closed");
      });
    } finally {
      // if constructor threw, allow future reconnect attempts
      this.isConnecting = false;
    }
  }

  /** Subscribe to incoming messages; returns an unsubscribe fn. */
  subscribe(callback: Listener): () => void {
    this.listeners.add(callback);
    // auto-connect on first usage, handy for lazy setups
    this.connect();
    return () => this.unsubscribe(callback);
  }

  unsubscribe(callback: Listener): void {
    this.listeners.delete(callback);
  }

  /** Update the token without reloading the page (optional). */
  setToken(nextToken: string): void {
    WS_TOKEN = nextToken ?? "";
    // reconnect to apply token
    if (this.socket) {
      this.close();
      this.connect();
    }
  }

  /** Tell the server which symbols you want. Queues until connected. */
  sendSymbols(symbols: string[]): void {
    const next = uniqStrings(symbols);
    // avoid re-sending identical list
    if (next.length === this.symbolNames.length && next.every((s, i) => s === this.symbolNames[i])) {
      return;
    }
    this.symbolNames = next;
    // ensure connected (in case caller forgets)
    this.connect();
    this.safeSend({ symbols: this.symbolNames });
  }

  /** Manually close the socket (optional). */
  close(): void {
    this.socket?.close();
    this.socket = null;
  }

  /** Fully clear listeners and close connection. */
  destroy(): void {
    this.listeners.clear();
    this.close();
  }

  // ---- internals ----
  private notifyListeners(data: unknown): void {
    this.listeners.forEach((cb) => cb(data));
  }

  private safeSend(payload: unknown): void {
    if (!this.socket) return;
    if (this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(payload));
    } else {
      // relies on 'open' handler to re-send current symbols on reconnect
    }
  }
}

export const webSocketManager = new WebSocketManager();
export default webSocketManager;
