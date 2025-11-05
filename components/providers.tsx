
"use client";

import * as React from "react";
import { Provider as ReduxProvider } from "react-redux";
import { store } from "@/store";
import { SessionProvider } from "next-auth/react";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ReduxProvider store={store}>
      <SessionProvider>{children}</SessionProvider>
    </ReduxProvider>
  );
}
