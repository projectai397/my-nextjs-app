"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn, getSession } from "next-auth/react";
import { toast } from "sonner";

export default function LoginForm() {
  const router = useRouter();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function waitForAccessToken(timeoutMs = 5000, intervalMs = 150) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const session = await getSession();
      const token = (session as any)?.accessToken;
      if (token) return token;
      await new Promise((r) => setTimeout(r, intervalMs));
    }
    return null;
  }

  const handleLogin = async () => {
    setSubmitting(true);
    try {
      const res = await signIn("credentials", {
        identifier,
        password,
        redirect: false,
      });

      if (res?.ok) {
        const session = await getSession();

        if (typeof window !== "undefined" && session) {
          const token = session.accessToken;
          const role = session.user?.role;
          if (token) localStorage.setItem("token", token);
          if (role) localStorage.setItem("role", role);
        }

        toast.success("Login successful!");
        router.push("/admin");
      } else {
        toast.error(res?.error || "Invalid credentials. Try again.");
      }
    } catch (err: any) {
      console.error("[Login Error]", err);
      toast.error(err?.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Enter") handleLogin();
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: "rgb(24, 26, 32)" }}
    >
      <div className="w-full max-w-lg">
        <div
          className="shadow-2xl rounded-3xl p-10 relative overflow-hidden group"
          style={{
            backgroundColor: "rgb(24, 26, 32)",
            borderColor: "rgb(51, 59, 71)",
          }}
        >
          {/* Animated border light effect */}
          <div className="absolute inset-0 rounded-3xl">
            <div
              className="absolute inset-0 rounded-3xl border-2"
              style={{ borderColor: "rgb(51, 59, 71)" }}
            ></div>
            <div className="absolute inset-0 rounded-3xl border-2 border-transparent">
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-transparent via-yellow-400/30 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out"></div>
            </div>
          </div>

          <div className="relative z-10">
            <form
              className="space-y-6"
              onSubmit={(e) => e.preventDefault()}
              onKeyDown={handleKeyDown}
            >
              {/* Username */}
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Username
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-20">
                    <svg
                      className="h-5 w-5 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                      />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Enter your mobile number"
                    className="w-full pl-12 pr-4 py-4 border-2 rounded-2xl focus:outline-none focus:border-yellow-400 transition-colors duration-200 placeholder-gray-400 text-white relative z-10"
                    style={{
                      backgroundColor: "#181a20",
                      borderColor: "rgb(51, 59, 71)",
                    }}
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    autoComplete="username"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-20">
                    <svg
                      className="h-5 w-5 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                      />
                    </svg>
                  </div>
                  <input
                    type="password"
                    placeholder="Enter your password"
                    className="w-full pl-12 pr-4 py-4 border-2 rounded-2xl focus:outline-none focus:border-yellow-400 transition-colors duration-200 placeholder-gray-400 text-white relative z-10"
                    style={{
                      backgroundColor: "#181a20",
                      borderColor: "rgb(51, 59, 71)",
                    }}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                </div>
              </div>

              {/* Login button */}
              <button
                type="button"
                onClick={handleLogin}
                disabled={submitting}
                className="w-full py-4 px-6 bg-yellow-400 text-black font-bold rounded-2xl shadow-lg hover:bg-yellow-500 transition-all duration-200 text-lg disabled:opacity-60 relative overflow-hidden group"
              >
                <span className="relative z-10">
                  {submitting ? "Signing in..." : "Continue"}
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out"></div>
              </button>
            </form>

            <div className="mt-8 text-center">
              <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                <svg
                  className="w-4 h-4 text-yellow-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
                <span>256-bit SSL Encryption</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
