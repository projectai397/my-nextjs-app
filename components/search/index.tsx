"use client";

import React, { useCallback, useEffect, useMemo, useState, ChangeEvent } from "react";
import apiClient from "@/lib/axiosInstance";
import { Accordion } from "react-bootstrap";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  ADMIN_API_ENDPOINT,
  GET_USER_TAB_WISE_SYMBOLS_LIST,
  SYMBOL_SEARCH_LIST,
  DELETE_USER_TAB_SYMBOL,
  POST_USER_TAB_WISE_SYMBOL,
  SUCCESS,
} from "@/constant/index";
import { encryptData, decryptData } from "@/hooks/crypto";
import { toastError } from "@/hooks/toastMsg";
import { formatDate } from "@/hooks/dateUtils";
import { toast } from "sonner";

type EncryptedPayload = { data: string };

type TabWiseSymbol = {
  symbolId: string;
  symbolTitle: string;
  symbolName?: string;
  exchangeName?: string;
  expiryDate?: string | number | Date | null;
};

type SymbolItem = { _id: string; title: string; expiryDate?: string | number | Date | null };

type SymbolSearchGroup = { exchangeId: string; exchangeName: string; symbolData: SymbolItem[] };

const ORDER = ["USSTOCK", "OTHERS", "NSE", "MCX", "GIFT", "FOREX", "CRYPTO", "COMEX", "CE/PE"];

const IconPlus = ({ size = 14, color = "#2f81f7" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
    <path d="M12 5v14M5 12h14" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);
const IconMinus = ({ size = 14, color = "#f85149" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
    <path d="M5 12h14" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);

const SearchPage: React.FC = () => {
  const router = useRouter();
  const params = useSearchParams();
  const { data: session } = useSession();

  const activeTabId = params.get("activeTabId");
  const activeTabExchangeId = params.get("activeTabExchangeId") || "";

  const jwtToken = (session as any)?.accessToken as string | undefined;
  const deviceType = ((session?.user as any)?.deviceType as string | undefined) ?? "web";

  const [watchlist, setWatchlist] = useState<TabWiseSymbol[]>([]);
  const [groups, setGroups] = useState<SymbolSearchGroup[]>([]);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [mutatingId, setMutatingId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("USSTOCK");

  const apiPost = useCallback(
    async <T,>(url: string, body: Record<string, unknown>): Promise<T | null> => {
      try {
        const payload: EncryptedPayload = { data: encryptData(body) };
        const res = await apiClient.post(url, JSON.stringify(payload), {
          headers: {
            Authorization: jwtToken,
            "Content-Type": "application/json",
            deviceType,
          },
        });

        if (res?.data?.statusCode === SUCCESS) {
          return decryptData(res.data.data) as T;
        }

        toastError(res?.data?.message || "Request failed");
        return null;
      } catch {
        toastError("Network error");
        return null;
      }
    },
    [jwtToken, deviceType]
  );

  const loadWatchlist = useCallback(async () => {
    if (!activeTabId) return;
    const data = await apiPost<TabWiseSymbol[]>(`${ADMIN_API_ENDPOINT}${GET_USER_TAB_WISE_SYMBOLS_LIST}`, {
      userTabId: activeTabId,
    });
    if (data) setWatchlist(data);
  }, [apiPost, activeTabId]);

  const loadSymbols = useCallback(
    async (search = "") => {
      setBusy(true);
      const data = await apiPost<SymbolSearchGroup[]>(`${ADMIN_API_ENDPOINT}${SYMBOL_SEARCH_LIST}`, {
        page: 1,
        limit: 1000,
        search,
        exchangeId: activeTabExchangeId,
        sortKey: "createdAt",
        sortBy: -1,
      });
      if (data) {
        const byName: Record<string, SymbolSearchGroup> = {};
        data.forEach((g) => (byName[g.exchangeName] = g));
        const ordered = ORDER.filter((n) => byName[n]).map((n) => byName[n]);
        const rest = data.filter((g) => !ORDER.includes(g.exchangeName));
        const finalList = [...ordered, ...rest];
        setGroups(finalList);
        if (!finalList.find((g) => g.exchangeName === activeCategory) && finalList[0]) {
          setActiveCategory(finalList[0].exchangeName);
        }
      }
      setBusy(false);
    },
    [apiPost, activeTabExchangeId, activeCategory]
  );

  const addToWatchlist = useCallback(
    async (symbolId: string, title: string) => {
      if (!activeTabId) return;
      setMutatingId(symbolId);
      setWatchlist((w) => [...w, { symbolId, symbolTitle: title } as any]);
      toast.success(`${title} scrip added`);
      const ok = await apiPost(`${ADMIN_API_ENDPOINT}${POST_USER_TAB_WISE_SYMBOL}`, {
        userTabId: activeTabId,
        symbolId,
      });
      if (ok === null) loadWatchlist();
      setMutatingId(null);
    },
    [apiPost, activeTabId, loadWatchlist]
  );

  const removeFromWatchlist = useCallback(
    async (symbolId: string) => {
      if (!activeTabId) return;
      setMutatingId(symbolId);
      setWatchlist((w) => w.filter((x) => x.symbolId !== symbolId));
      const ok = await apiPost(`${ADMIN_API_ENDPOINT}${DELETE_USER_TAB_SYMBOL}`, {
        userTabId: activeTabId,
        symbolId,
      });
      if (ok === null) loadWatchlist();
      setMutatingId(null);
    },
    [apiPost, activeTabId, loadWatchlist]
  );

  const inWatchlist = useCallback((id: string) => watchlist.some((w) => w.symbolId === id), [watchlist]);
  const activeGroup = useMemo(
    () => groups.find((g) => g.exchangeName === activeCategory),
    [groups, activeCategory]
  );

  useEffect(() => {
    if (!activeTabId) {
      router.push("/admin");
      return;
    }
    loadWatchlist();
    loadSymbols();
  }, [activeTabId]); // eslint-disable-line

  useEffect(() => {
    const t = setTimeout(() => loadSymbols(query), 220);
    return () => clearTimeout(t);
  }, [query, loadSymbols]);

  const goBack = () => router.push(`/admin/watch-list`);

  return (
    <div style={{ background: "#0d1117", minHeight: "100vh", padding: 16 }}>
      {/* Back + Search */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12 }}>
        <button
          onClick={goBack}
          style={{
            padding: "10px 14px",
            borderRadius: 8,
            border: "1px solid #30363d",
            background: "#161b22",
            color: "#fcd535",
            fontWeight: 700,
          }}
        >
          ← Back
        </button>
        <div style={{ position: "relative", flex: 1 }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="SEARCH SYMBOL"
            style={{
              width: "100%",
              background: "#161b22",
              color: "#f0f6fc",
              border: "1px solid #30363d",
              borderRadius: 8,
              padding: "12px 16px",
              fontSize: 15,
            }}
            id="searchBox"
          />
          {busy && (
            <div
              className="spinner-border spinner-border-sm"
              role="status"
              style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", color: "#fcd535" }}
            />
          )}
        </div>
      </div>

      {/* Category tabs */}
      <div
        style={{
          display: "flex",
          gap: 10,
          overflowX: "auto",
          padding: "6px 2px 10px",
          borderBottom: "1px solid #2b3139",
          marginBottom: 8,
        }}
      >
        {groups.map((g) => {
          const active = g.exchangeName === activeCategory;
          return (
            <button
              key={g.exchangeId + g.exchangeName}
              onClick={() => setActiveCategory(g.exchangeName)}
              style={{
                whiteSpace: "nowrap",
                padding: "8px 14px",
                fontSize: 12,
                fontWeight: 600,
                borderRadius: 8,
                border: "1px solid #2b3139",
                background: active ? "#0f1115" : "#12161c",
                color: active ? "#fcd535" : "#9ea7b3",
              }}
            >
              {g.exchangeName}
            </button>
          );
        })}
      </div>

      {/* List */}
      <div style={{ background: "#111419", borderRadius: 10, border: "1px solid #2b3139", overflow: "hidden" }}>
        {(activeGroup?.symbolData || []).map((s, idx, arr) => {
          const isIn = inWatchlist(s._id);
          return (
            <div
              key={s._id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                padding: "16px 16px",
                background: "#0b0e11",
                borderBottom: idx < arr.length - 1 ? "1px solid #1c2128" : "none",
              }}
            >
              {/* Left */}
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: "#151a20",
                    display: "grid",
                    placeItems: "center",
                    color: "#fcd535",
                    fontWeight: 700,
                  }}
                >
                  {s.title.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ color: "#e6edf3", fontWeight: 600, lineHeight: 1.1 }}>{s.title}</div>
                  <div style={{ color: "#8b949e", fontSize: 12, marginTop: 4 }}>{formatDate(s.expiryDate)}</div>
                </div>
              </div>

              {/* Right: + / − */}
              <button
                onClick={() => (isIn ? removeFromWatchlist(s._id) : addToWatchlist(s._id, s.title))}
                disabled={mutatingId === s._id}
                title={isIn ? "Remove" : "Add"}
                aria-label={isIn ? "Remove from watchlist" : "Add to watchlist"}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  display: "grid",
                  placeItems: "center",
                  border: isIn ? "1px solid rgba(248,81,73,0.35)" : "1px solid rgba(56,139,253,0.35)",
                  background: isIn ? "rgba(248,81,73,0.12)" : "rgba(0,102,255,0.14)",
                  boxShadow: isIn
                    ? "0 0 0 1px rgba(248,81,73,0.25) inset"
                    : "0 0 0 1px rgba(56,139,253,0.25) inset",
                  cursor: mutatingId === s._id ? "wait" : "pointer",
                }}
              >
                {isIn ? <IconMinus /> : <IconPlus />}
              </button>
            </div>
          );
        })}

        {!busy && (activeGroup?.symbolData?.length ?? 0) === 0 && (
          <div style={{ padding: 28, textAlign: "center", color: "#8b949e" }}>No symbols found.</div>
        )}
      </div>

      <div style={{ marginTop: 16, color: "#9ea7b3", fontSize: 12 }}>Watchlist: {watchlist.length} symbols</div>
    </div>
  );
};

export default SearchPage;
