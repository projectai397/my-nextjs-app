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
          console.log(fdata);
          const apiToken = data.meta.token;

          return { user: fdata, token: apiToken } as any;
        } catch (e) {
          console.log(e);
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
