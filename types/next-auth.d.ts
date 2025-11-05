// src/types/next-auth.d.ts
import { DefaultSession, DefaultUser } from "next-auth";

declare module "next-auth" {
  interface User extends DefaultUser {
    id: string;
    role?: string;
    roleId?: string;
    phone?: string;

    // added
    deviceType?: string;
    deviceId?: string;
    ip?: string;

    accessToken?: string;
  }

  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role?: string;
      roleId?: string;
      phone?: string;

      // added
      deviceType?: string;
      deviceId?: string;
      ip?: string;
    };
    accessToken?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    user?: {
      id: string;
      role?: string;
      roleId?: string;
      name?: string | null;
      email?: string | null;
      phone?: string;

      // added
      deviceType?: string;
      deviceId?: string;
      ip?: string;
    };
    accessToken?: string;
  }
}

export {};
