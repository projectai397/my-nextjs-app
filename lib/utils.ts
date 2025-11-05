import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import CredentialsProvider from "next-auth/providers/credentials";
import { NextAuthOptions } from "next-auth";
import { decryptData, encryptData } from "@/hooks/crypto";
import apiClient from "@/lib/axiosInstance";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function getSafeUserAgent(): string {
  try {
    // client
    if (typeof navigator !== "undefined") return navigator.userAgent;
    // server (Node)
    return "node";
  } catch {
    return "unknown";
  }
}

function detectBrowser(ua: string): string {
  if (/Chrome/i.test(ua)) return "Chrome";
  if (/Firefox/i.test(ua)) return "Firefox";
  if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) return "Safari";
  if (/Edg/i.test(ua)) return "Edge";
  if (/node/i.test(ua)) return "Node";
  return "Unknown";
}

function detectDeviceType(ua: string): "mobile" | "web" | "desktop" {
  if (/Mobi|Android/i.test(ua)) return "mobile";
  // call it "web" for non-mobile browsers; you can switch to "desktop" if you prefer
  return "web";
}

async function getDeviceId(): Promise<string> {
  // Use localStorage if on client; fallback to UUID on server
  try {
    if (typeof window !== "undefined") {
      const existing = localStorage.getItem("deviceId");
      if (existing) return existing;
      const id = crypto.randomUUID();
      localStorage.setItem("deviceId", id);
      return id;
    }
  } catch {
    /* ignore */
  }
  // server-side fallback
  return crypto.randomUUID();
}

async function getPublicIp(): Promise<string> {
  try {
    const res = await fetch("https://api.ipify.org?format=json");
    const j = await res.json();
    return j?.ip || "";
  } catch {
    return "";
  }
}

export const authOptions: NextAuthOptions = {
  debug: true,
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        identifier: { label: "Phone or Username", type: "text" },
        password: { label: "Password", type: "password" },
        // Optional: if you want to pass domain from the client page
        // domain: { label: "Domain", type: "text" },
      },
      async authorize(credentials, req) {
        const identifier = credentials?.identifier?.trim();
        const password = credentials?.password;
        if (!identifier || !password) {
          throw new Error("Provide either phone or username, plus password.");
        }

        const isPhone = /^[0-9+\-() ]{6,}$/.test(identifier);

        // --- device + env metadata ---
        const userAgent = getSafeUserAgent();
        const browser = detectBrowser(userAgent);
        const deviceType = detectDeviceType(userAgent);
        const deviceId = await getDeviceId();
        const ip = await getPublicIp();
        function getDomainFromHeaders(req: any): string {
          const origin = (req?.headers?.origin as string) || "";
          const host = (req?.headers?.host as string) || "";
          const raw =
            origin ||
            (host ? `https://${host}` : process.env.NEXTAUTH_URL || "");
          try {
            const hostname = new URL(raw).hostname;
            const parts = hostname.split(".");
            return parts.length > 2 ? parts.slice(-2).join(".") : hostname; // e.g. profit.live
          } catch {
            return host || "";
          }
        }
        // Domain / Broker flag:
        // Prefer value passed from client (uncomment if you collect it on the form), else env.
        // const domainFromClient = credentials?.domain?.trim();
        const domain = getDomainFromHeaders(req); // e.g. "profit.live"
        const isBrokerLogin = Number(
          process.env.NEXT_PUBLIC_IS_BROKER_LOGIN || "0"
        ); // 0/1
        const loginBy = "Web";

        // Build payload with ALL requested fields
        const payload = {
          phone: identifier,
          password,
          domain,
          isBrokerLogin,
          loginBy,
          browser,
          userAgent,
          deviceId,
          deviceType,
          ipAddress: ip,
        };

        // Demo accounts fallback for testing
        const demoAccounts: Record<string, { password: string; user: any }> = {
          "demo@tradingplatform.com": {
            password: "Demo@2025!",
            user: {
              _id: "demo_admin_001",
              name: "Demo Admin",
              email: "demo@tradingplatform.com",
              role: "admin",
              mobile: "1234567890",
              status: "active",
            },
          },
          "superadmin@tradingplatform.com": {
            password: "SuperAdmin@2025!",
            user: {
              _id: "superadmin_001",
              name: "Super Admin",
              email: "superadmin@tradingplatform.com",
              role: "superadmin",
              mobile: "1234567891",
              status: "active",
            },
          },
          "admin01@tradingplatform.com": {
            password: "Admin01@2025!",
            user: {
              _id: "admin01_001",
              name: "Admin 01",
              email: "admin01@tradingplatform.com",
              role: "admin",
              mobile: "1234567892",
              status: "active",
            },
          },
          "manager01@tradingplatform.com": {
            password: "Manager01@2025!",
            user: {
              _id: "manager01_001",
              name: "Manager 01",
              email: "manager01@tradingplatform.com",
              role: "manager",
              mobile: "1234567893",
              status: "active",
            },
          },
          "trader01@tradingplatform.com": {
            password: "Trader01@2025!",
            user: {
              _id: "trader01_001",
              name: "Trader 01",
              email: "trader01@tradingplatform.com",
              role: "trader",
              mobile: "1234567894",
              status: "active",
            },
          },
          "user01@tradingplatform.com": {
            password: "User01@2025!",
            user: {
              _id: "user01_001",
              name: "User 01",
              email: "user01@tradingplatform.com",
              role: "user",
              mobile: "1234567895",
              status: "active",
            },
          },
        };

        // Check if this is a demo account
        const demoAccount = demoAccounts[identifier];
        if (demoAccount && demoAccount.password === password) {
          console.log("✅ Demo account login successful:", identifier);
          return {
            user: demoAccount.user,
            token: `demo_token_${Date.now()}`,
          } as any;
        }

        // Try real API authentication
        try {
          const resp = await fetch(
            `${process.env.NEXT_PUBLIC_ADMIN_API_ENDPOINT}user/login`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                deviceType: deviceType,
              },
              body: JSON.stringify({ data: encryptData(payload) }),
            }
          );

          let data = await resp.json();
          if (data.statusCode !== 200) {
            throw new Error(data?.error || `Auth API returned ${resp.status}`);
          }
          const fdata = decryptData(data.data);
          console.log("✅ Real API login successful:", fdata);
          const apiToken = data.meta.token;

          return { user: fdata, token: apiToken } as any;
        } catch (e) {
          console.log("❌ Authentication failed:", e);
          throw new Error("Invalid credentials. Please check your username and password.");
        }
      },
    }),
  ],
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 30 }, //30 days
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as any;
        token.user = u.user;
        token.accessToken = u.token ?? "";
      }
      return token;
    },
    async session({ session, token }) {
      session.user = (token as any).user ?? session.user;
      (session as any).accessToken = (token as any).accessToken ?? "";
      return session;
    },
  },

  pages: { signIn: "/login" },
};
