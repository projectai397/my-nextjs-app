"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import webSocketManager from "@/components/socket/WebSocketManager"; // adjust path

// Shape of your tick payload. Refine as needed.
export type TickData = unknown;

type Ctx = { tickData: TickData | null };

const WebSocketContext = createContext<Ctx | undefined>(undefined);

type Props = {
  children: React.ReactNode;
};

export function WebSocketProvider({ children }: Props) {
  const [tickData, setTickData] = useState<TickData | null>(null);

  useEffect(() => {
    // Ensure connection happens in the browser
    webSocketManager.connect();

    const handleNewTick = (data: TickData) => {
      setTickData(data);
    };

    const unsubscribe = webSocketManager.subscribe(handleNewTick);

    return () => {
      unsubscribe();
      // If you want to fully close the socket when this provider unmounts:
      // webSocketManager.close();
    };
  }, []);

  return (
    <WebSocketContext.Provider value={{ tickData }}>
      {children}
    </WebSocketContext.Provider>
  );
}

// Optional convenience hook
export function useWebSocket() {
  const ctx = useContext(WebSocketContext);
  if (!ctx) throw new Error("useWebSocket must be used within a WebSocketProvider");
  
  return ctx;
}
