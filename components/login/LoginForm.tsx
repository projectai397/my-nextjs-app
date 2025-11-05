"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn, getSession } from "next-auth/react";
import { toast } from "sonner";
import { 
  User, Lock, Shield, Users, TrendingUp, 
  UserCircle, Eye, EyeOff, ChevronDown 
} from "lucide-react";

const USER_ROLES = [
  { 
    value: "superadmin", 
    label: "Super Admin", 
    icon: Shield, 
    color: "text-red-400",
    description: "Full system access",
    level: 5
  },
  { 
    value: "admin", 
    label: "Admin", 
    icon: Users, 
    color: "text-purple-400",
    description: "Administrative access",
    level: 4
  },
  { 
    value: "manager", 
    label: "Manager", 
    icon: UserCircle, 
    color: "text-blue-400",
    description: "Management access",
    level: 3
  },
  { 
    value: "trader", 
    label: "Trader", 
    icon: TrendingUp, 
    color: "text-green-400",
    description: "Trading access",
    level: 2
  },
  { 
    value: "user", 
    label: "User", 
    icon: User, 
    color: "text-gray-400",
    description: "Basic access",
    level: 1
  },
];

export default function LoginForm() {
  const router = useRouter();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState(USER_ROLES[0]);
  const [showPassword, setShowPassword] = useState(false);
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
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
    if (!identifier || !password) {
      toast.error("Please enter username and password");
      return;
    }

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

        toast.success(`Welcome ${selectedRole.label}!`);
        
        // Role-based routing
        switch (selectedRole.value) {
          case "superadmin":
          case "admin":
            router.push("/admin");
            break;
          case "manager":
            router.push("/admin/users");
            break;
          case "trader":
            router.push("/admin/watch-list");
            break;
          case "user":
            router.push("/admin/dashboard-v2");
            break;
          default:
            router.push("/admin");
        }
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

  const RoleIcon = selectedRole.icon;

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ backgroundColor: "rgb(24, 26, 32)" }}
    >
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute w-96 h-96 bg-yellow-400/5 rounded-full blur-3xl -top-48 -left-48 animate-pulse"></div>
        <div className="absolute w-96 h-96 bg-blue-400/5 rounded-full blur-3xl -bottom-48 -right-48 animate-pulse delay-1000"></div>
      </div>

      <div className="w-full max-w-lg relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-2xl mb-4 shadow-lg">
            <Shield className="w-10 h-10 text-black" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            AI Trading Platform
          </h1>
          <p className="text-gray-400">
            Sign in to access your account
          </p>
        </div>

        <div
          className="shadow-2xl rounded-3xl p-10 relative overflow-hidden group backdrop-blur-sm"
          style={{
            backgroundColor: "rgba(24, 26, 32, 0.8)",
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
              {/* Role Selection */}
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Select Role
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowRoleDropdown(!showRoleDropdown)}
                    className="w-full px-4 py-4 border-2 rounded-2xl focus:outline-none focus:border-yellow-400 transition-colors duration-200 text-white relative z-10 flex items-center justify-between"
                    style={{
                      backgroundColor: "#181a20",
                      borderColor: "rgb(51, 59, 71)",
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <RoleIcon className={`w-5 h-5 ${selectedRole.color}`} />
                      <div className="text-left">
                        <div className="font-medium">{selectedRole.label}</div>
                        <div className="text-xs text-gray-400">{selectedRole.description}</div>
                      </div>
                    </div>
                    <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${showRoleDropdown ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Dropdown */}
                  {showRoleDropdown && (
                    <div
                      className="absolute w-full mt-2 rounded-2xl border-2 overflow-hidden shadow-xl z-20"
                      style={{
                        backgroundColor: "#181a20",
                        borderColor: "rgb(51, 59, 71)",
                      }}
                    >
                      {USER_ROLES.map((role) => {
                        const Icon = role.icon;
                        return (
                          <button
                            key={role.value}
                            type="button"
                            onClick={() => {
                              setSelectedRole(role);
                              setShowRoleDropdown(false);
                            }}
                            className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-800/50 transition-colors text-left"
                          >
                            <Icon className={`w-5 h-5 ${role.color}`} />
                            <div className="flex-1">
                              <div className="font-medium text-white">{role.label}</div>
                              <div className="text-xs text-gray-400">{role.description}</div>
                            </div>
                            <div className="text-xs text-gray-500">Level {role.level}</div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Username */}
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Username or Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-20">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Enter your username or email"
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
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    className="w-full pl-12 pr-12 py-4 border-2 rounded-2xl focus:outline-none focus:border-yellow-400 transition-colors duration-200 placeholder-gray-400 text-white relative z-10"
                    style={{
                      backgroundColor: "#181a20",
                      borderColor: "rgb(51, 59, 71)",
                    }}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center z-20"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-300" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400 hover:text-gray-300" />
                    )}
                  </button>
                </div>
              </div>

              {/* Quick Login Hint */}
              <div className="bg-gray-800/30 rounded-xl p-3 border border-gray-700/50">
                <div className="flex items-start gap-2">
                  <div className="text-yellow-400 mt-0.5">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="text-xs text-gray-400">
                    <span className="font-medium text-gray-300">Demo Credentials:</span>
                    <br />
                    <span className="text-yellow-400">demo@tradingplatform.com</span> / Demo@2025!
                  </div>
                </div>
              </div>

              {/* Login button */}
              <button
                type="button"
                onClick={handleLogin}
                disabled={submitting}
                className="w-full py-4 px-6 bg-gradient-to-r from-yellow-400 to-yellow-500 text-black font-bold rounded-2xl shadow-lg hover:from-yellow-500 hover:to-yellow-600 transition-all duration-200 text-lg disabled:opacity-60 relative overflow-hidden group"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {submitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin"></div>
                      Signing in...
                    </>
                  ) : (
                    <>
                      Sign In as {selectedRole.label}
                      <RoleIcon className="w-5 h-5" />
                    </>
                  )}
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out"></div>
              </button>
            </form>

            {/* Security Badge */}
            <div className="mt-8 text-center">
              <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                <Lock className="w-4 h-4 text-yellow-400" />
                <span>256-bit SSL Encryption • Secure Login</span>
              </div>
            </div>

            {/* Footer Links */}
            <div className="mt-6 text-center space-y-2">
              <button className="text-sm text-gray-400 hover:text-yellow-400 transition-colors">
                Forgot Password?
              </button>
              <div className="text-xs text-gray-500">
                Protected by AI-powered security
              </div>
            </div>
          </div>
        </div>

        {/* Version Info */}
        <div className="mt-6 text-center text-xs text-gray-500">
          Platform v2.0 • Elite World-Class Trading System
        </div>
      </div>
    </div>
  );
}
