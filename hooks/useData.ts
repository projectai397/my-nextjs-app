"use client";

import { useEffect, useState, useMemo } from "react";
import apiClient from "@/lib/axiosInstance";

import CryptoJS from "crypto-js";
import { useSession } from "next-auth/react";

const SECRET_KEY = process.env.NEXT_PUBLIC_SECRET_KEY || "";
const DEFAULT_BASE = "https://papi.profit.live/api/v1";

type Filters = {
  role?: "SUPER_ADMIN" | "MASTER" | "ADMIN" | string;
  search?: string;
  roleId?: string;
  startDate?: string;
  endDate?: string;
  status?: number;
  page?: number;
  limit?: number;
};

function encryptData(data: any): string {
  return CryptoJS.AES.encrypt(JSON.stringify(data), SECRET_KEY).toString();
}
function decryptData(encryptedData: string): any {
  const bytes = CryptoJS.AES.decrypt(encryptedData, SECRET_KEY);
  return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
}
function decryptMaybeChunked(encrypted: string | string[]) {
  if (Array.isArray(encrypted)) {
    let acc = "";
    for (const enc of encrypted) {
      const bytes = CryptoJS.AES.decrypt(enc, SECRET_KEY);
      acc += bytes.toString(CryptoJS.enc.Utf8);
    }
    try {
      return JSON.parse(acc);
    } catch {
      return acc;
    }
  }
  return decryptData(encrypted);
}

export function useUsersList(
  baseUrl: string = DEFAULT_BASE,
  filters: Filters = { role: "SUPER_ADMIN", page: 1, limit: 20, status: 1 }
) {
  const { data: session } = useSession();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const payload = useMemo(() => {
    return {
      role: (filters?.role ?? "SUPER_ADMIN") as string,
      search: filters?.search ?? "",
      roleId: filters?.roleId ?? "",
      startDate: filters?.startDate ?? "",
      endDate: filters?.endDate ?? "",
      status: filters?.status ?? 1,
      page: filters?.page ?? 1,
      limit: filters?.limit ?? 100,
    };
  }, [JSON.stringify(filters ?? {})]);

  const url = useMemo(() => {
    const path =
      (filters?.role ?? "SUPER_ADMIN").toUpperCase() === "MASTER"
        ? "/user/list"
        : "/user/child-list";
    return `${(baseUrl || DEFAULT_BASE).replace(/\/$/, "")}${path}`;
  }, [baseUrl, filters?.role]);

  useEffect(() => {
    const token = String((session as any)?.accessToken || "").trim();
    if (!token) return; // wait for token

    const ac = new AbortController();
    (async () => {
      try {
        setLoading(true);
        setError(null);

        const enc = encryptData(payload);
        const body = JSON.stringify({ data: enc });

        const headers: Record<string, string> = {
          // Keep the same format that worked in Project A (no forced "Bearer ")
          Authorization: token,
          // If your API expects Bearer, use this instead:
          // Authorization: /^Bearer\s+/i.test(token) ? token : `Bearer ${token}`,
          "Content-Type": "application/json",
          deviceType: "desktop",
        };

        const res = await axios.post(url, body, {
          headers,
          signal: ac.signal,
          timeout: 15000,
          transitional: { clarifyTimeoutError: true },
        });

        if (res.data?.statusCode === 200 && res.data?.data) {
          setData(decryptMaybeChunked(res.data.data));
        } else {
          setError(res.data?.message || "Unexpected response");
          setData(null);
        }
      } catch (err: any) {
        const msg =
          err?.response?.data?.message ||
          err?.response?.statusText ||
          err?.message ||
          "Something went wrong";
        setError(msg);
        setData(null);
      } finally {
        setLoading(false);
      }
    })();

    return () => ac.abort();
  }, [url, JSON.stringify(payload), (session as any)?.accessToken]);

  return { data, loading, error };
}
