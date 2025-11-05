"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { usePathname, useRouter } from "next/navigation"; // 👈 added useRouter
import {
  Menu,
  Wallet,
  Bell,
  Settings,
  RefreshCcw,
  LogOut,
  User,
} from "lucide-react"; // 👈 added User
import { useSession, signOut } from "next-auth/react";

interface DashboardHeaderProps {
  onMenuToggle: () => void;
  sidebarCollapsed: boolean;
}

const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes
const LS_KEY = "lastRefreshAt";
const BRAND_BORDER = "#1e2329";

export function DashboardHeader({ onMenuToggle }: DashboardHeaderProps) {
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();
  const router = useRouter(); // 👈 for navigating to profile
  const showRefresh = pathname === "/admin";
  const { data: session } = useSession();

  const [loading, setLoading] = useState(false);

  // Dropdown state/refs
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const hoverTimerRef = useRef<number | null>(null);
  const isTouchRef = useRef<boolean>(false);

  useEffect(() => {
    const onTouch = () => (isTouchRef.current = true);
    window.addEventListener("touchstart", onTouch, { passive: true });
    return () => window.removeEventListener("touchstart", onTouch);
  }, []);

  const balance = (session?.user as any)?.forwardBalance;

  const handleRefresh = async () => {
    const now = Date.now();
    const last = Number(localStorage.getItem(LS_KEY) || 0);
    const diff = now - last;

    if (last && diff < COOLDOWN_MS) {
      const remaining = COOLDOWN_MS - diff;
      const m = Math.floor(remaining / 60000);
      const s = Math.ceil((remaining % 60000) / 1000);
      alert(
        `Please wait ${m}:${String(s).padStart(
          2,
          "0"
        )} before refreshing again.`
      );
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_ALL_API_URL}/analysis/run-analysis`,
        {
          method: "POST",
        }
      );
      if (!res.ok) throw new Error("Request failed");

      localStorage.setItem(LS_KEY, String(now));
      window.location.reload();
    } catch (err) {
      console.error("Error hitting API:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = useCallback(async () => {
    try {
      localStorage.clear();
      await signOut({ redirect: true, callbackUrl: "/" });
    } catch (e) {
      console.error("Logout error:", e);
    }
  }, []);

  // --- Hover logic ---
  const clearHoverTimer = () => {
    if (hoverTimerRef.current) {
      window.clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  };

  const openMenu = (immediate = false) => {
    clearHoverTimer();
    if (immediate) setDropdownOpen(true);
    else {
      hoverTimerRef.current = window.setTimeout(
        () => setDropdownOpen(true),
        80
      );
    }
  };

  const closeMenu = (immediate = false) => {
    clearHoverTimer();
    if (immediate) setDropdownOpen(false);
    else {
      hoverTimerRef.current = window.setTimeout(
        () => setDropdownOpen(false),
        120
      );
    }
  };

  // Close on outside click / Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDropdownOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, []);

  return (
    <header
      className="sticky top-0 z-50 w-full border-b border-gray-800"
      style={{ backgroundColor: "#181a20" }}
    >
      <div className="flex h-14 md:h-16 items-center px-3 md:px-4">
        {/* Menu button */}
        <div className="flex items-center gap-2 md:gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuToggle}
            className="text-gray-300 hover:text-white"
          >
            <Menu className="h-4 w-4 md:h-5 md:w-5" />
          </Button>
        </div>

        {/* Right side buttons */}
        <div className="flex items-center gap-1 md:gap-2 ml-auto">
          {showRefresh && (
            <Button
              size="sm"
              onClick={handleRefresh}
              disabled={loading}
              className="bg-gradient-to-r from-[#FCD535] to-[#F0B90B] text-[#0B0E11] text-xs md:text-sm font-semibold"
            >
              <RefreshCcw
                className={`h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2 ${
                  loading ? "animate-spin" : ""
                }`}
              />
              {loading ? "Refreshing..." : "Refresh Data"}
            </Button>
          )}

          {/* Wallet + balance */}
          <Button
            variant="ghost"
            size="icon"
            className="relative text-gray-300 hover:text-white h-8 w-auto px-3 md:px-4 flex items-center gap-1"
          >
            <Wallet className="h-4 w-4 md:h-5 md:w-5" />
            <span className="text-xs md:text-sm font-semibold text-gray-100">
              {balance === -1
                ? "Unlimited"
                : Number(balance || 0).toLocaleString("en-IN")}
            </span>
          </Button>

          {/* Notifications */}
          <Button
            variant="ghost"
            size="icon"
            className="relative text-gray-300 hover:text-white h-8 w-8 md:h-10 md:w-10"
          >
            <Bell className="h-4 w-4 md:h-5 md:w-5" />
            <span className="absolute -top-0.5 -right-0.5 md:-top-1 md:-right-1 h-2 w-2 md:h-3 md:w-3 bg-primary rounded-full" />
          </Button>

          {/* Settings + Logout dropdown */}
          <div
            className="relative"
            ref={dropdownRef}
            onMouseEnter={() => !isTouchRef.current && openMenu()}
            onMouseLeave={() => !isTouchRef.current && closeMenu()}
          >
            <Button
              aria-haspopup="menu"
              aria-expanded={dropdownOpen}
              aria-controls="settings-menu"
              variant="ghost"
              size="icon"
              onClick={() => setDropdownOpen((v) => !v)}
              className="text-gray-300 hover:text-white h-8 w-8 md:h-10 md:w-10"
            >
              <Settings className="h-4 w-4 md:h-5 md:w-5" />
            </Button>

            {dropdownOpen && (
              <div
                id="settings-menu"
                role="menu"
                tabIndex={-1}
                onMouseEnter={() => !isTouchRef.current && openMenu(true)}
                onMouseLeave={() => !isTouchRef.current && closeMenu()}
                className="absolute right-0 mt-2 w-44 rounded-md shadow-lg ring-1 ring-black/20 focus:outline-none"
                style={{
                  backgroundColor: "#1b2026",
                  border: `1px solid ${BRAND_BORDER}`,
                }}
              >
                <div className="p-1 md:p-1.5">
                  <Button
                    className="w-full justify-start gap-2 md:gap-3 text-sm md:text-base h-9 md:h-10 hover:bg-white/5 bg-transparent"
                    onClick={() => {
                      setDropdownOpen(false);
                      router.push("/admin/account-setting/account"); // 👈 change to your actual profile route if different
                    }}
                  >
                    <User className="h-4 w-4 md:h-5 md:w-5" />
                    <span>Account</span>
                  </Button>
                  {/* 👇 NEW PROFILE OPTION */}
                  <Button
                    className="w-full justify-start gap-2 md:gap-3 text-sm md:text-base h-9 md:h-10 hover:bg-white/5 bg-transparent"
                    onClick={() => {
                      setDropdownOpen(false);
                      router.push("/admin/account-setting/profile");
                    }}
                  >
                    <User className="h-4 w-4 md:h-5 md:w-5" />
                    <span>Profile</span>
                  </Button>
                  <Button
                    className="w-full justify-start gap-2 md:gap-3 text-sm md:text-base h-9 md:h-10 hover:bg-white/5 bg-transparent"
                    onClick={() => {
                      setDropdownOpen(false);
                      router.push("/admin/account-setting/brokerage-leverage");
                    }}
                  >
                    <User className="h-4 w-4 md:h-5 md:w-5" />
                    <span>Brokerage Leverage</span>
                  </Button>
                  <Button
                    className="w-full justify-start gap-2 md:gap-3 text-sm md:text-base h-9 md:h-10 hover:bg-white/5 bg-transparent"
                    onClick={() => {
                      setDropdownOpen(false);
                      router.push("/admin/account-setting/change-password");
                    }}
                  >
                    <User className="h-4 w-4 md:h-5 md:w-5" />
                    <span>Change-Password</span>
                  </Button>

                  <Button
                    className="w-full justify-start gap-2 md:gap-3 text-sm md:text-base h-9 md:h-10 hover:bg-white/5 bg-transparent"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-4 w-4 md:h-5 md:w-5" />
                    <span>Sign Out</span>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
