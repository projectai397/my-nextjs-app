import axios, { AxiosInstance } from "axios";
import { getSession, signOut } from "next-auth/react";

const apiClient: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_ADMIN_API_ENDPOINT,
  timeout: 15000,
});

apiClient.interceptors.request.use(async (config) => {
  if (typeof window !== "undefined") {
    const session = await getSession();
    const token = (session as any)?.accessToken || "";
    const jwt_token = token
      ? token.startsWith("Bearer ")
        ? token
        : `Bearer ${token}`
      : "";

    const deviceType =
      ((session?.user as any)?.deviceType as string | undefined) ?? "web";

    (config as any).headers = {
      ...config.headers,
      Authorization: jwt_token,
      "Content-Type": "application/json",
      deviceType,
    };
  }

  return config;
});

apiClient.interceptors.response.use(
  (r) => {
    console.log("Response:", r);
    return r;
  },
  async (e) => {
    if (e?.response?.data?.statusCode === 401) {
      await signOut({ redirect: true, callbackUrl: "/" });
    }
    console.error("API Error:", e);
    return Promise.reject(e);
  }
);

export default apiClient;
