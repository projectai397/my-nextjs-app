import type React from "react";
import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Analytics } from "@vercel/analytics/next";
import { ThemeProvider } from "@/components/theme-provider";
import { Suspense } from "react";
import "./globals.css";
import Providers from "@/components/providers";
import { SocketProvider } from "@/components/socket/socketContext";
import { ArrayProvider } from "@/components/socket/ArrayProvider";
import { WebSocketProvider } from "@/components/socket/WebSocketProvider";
import { Toaster } from "sonner"; 

export const metadata: Metadata = {
  title: "Professional Trading Dashboard",
  description:
    "Advanced trading dashboard for portfolio management and analytics",
  generator: "v0.app",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        <Suspense fallback={null}>
          <Providers>
            <ThemeProvider
              attribute="class"
              defaultTheme="light"
              enableSystem
              disableTransitionOnChange
            >
              <SocketProvider>
                <ArrayProvider>
                  <WebSocketProvider>{children}</WebSocketProvider>
                </ArrayProvider>
              </SocketProvider>

              <Toaster position="top-right" richColors closeButton />
            </ThemeProvider>
          </Providers>
        </Suspense>
        <Analytics />
      </body>
    </html>
  );
}
