"use client";

import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import ioClient from "socket.io-client";

// ---- Domain types (all lowercase) ----
export const CREDIT = "credit" as const;
export const DEBIT = "debit" as const;
type PaymentRequestType = typeof CREDIT | typeof DEBIT;

export interface PaymentData {
  paymentRequestId: string;
  paymentRequestType: PaymentRequestType;
  // add other fields as needed (amount, status, etc.)
}

export interface TradeEvent {
  // If the server sometimes sends other events on "trade", keep this optional.
  paymentData?: PaymentData;
  // other event fields can go here...
}

// ---- Socket context types ----
type SocketIOClientSocket = ReturnType<typeof ioClient>;

interface SocketContextType {
  socket: SocketIOClientSocket | null;
  channelData: TradeEvent | null;
  disconnectSocket: () => void;
}

// Type guard to safely check for paymentData
export function hasPaymentData(d: TradeEvent | null): d is { paymentData: PaymentData } {
  return !!d && typeof (d as any).paymentData === "object" && (d as any).paymentData !== null;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

// Next.js public envs
const SOCKET_SERVER_URL = process.env.NEXT_PUBLIC_SOCKET_IO_SERVER_URL || "";
const SOCKET_SERVER_TOKEN = process.env.NEXT_PUBLIC_SOCKET_IO_TOKEN || "";

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [channelData, setChannelData] = useState<TradeEvent | null>(null);
  const socketRef = useRef<SocketIOClientSocket | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !SOCKET_SERVER_URL) return;

    const socket = ioClient(SOCKET_SERVER_URL, {
      auth: { token: SOCKET_SERVER_TOKEN },
    } as any);

    socketRef.current = socket;

    const handleTrade = (data: TradeEvent) => setChannelData(data);
    socket.on("trade", handleTrade);

    // optional subscribe by username
    try {
      const raw = localStorage.getItem("authenticated");
      if (raw) {
        const authenticated = JSON.parse(raw);
        if (authenticated?.userName) {
          socket.emit("subscribe", authenticated.userName);
        }
      }
    } catch {
      /* ignore */
    }

    return () => {
      socket.off("trade", handleTrade);
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const disconnectSocket = () => {
    socketRef.current?.disconnect();
    socketRef.current = null;
  };

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, channelData, disconnectSocket }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = (): SocketContextType => {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error("useSocket must be used within a SocketProvider");
  return ctx;
};
