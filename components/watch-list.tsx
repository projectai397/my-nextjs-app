
"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import apiClient from "@/lib/axiosInstance";
import classNames from "classnames";
import { useDispatch, useSelector } from "react-redux";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";

import {
  ADMIN_API_ENDPOINT,
  GET_USER_TAB_LIST_WITH_SYMBOL,
  SUCCESS,
} from "@/constant/index";
import { useWebSocket } from "@/components/socket/WebSocketProvider";
import webSocketManager from "@/components/socket/WebSocketManager";
import { addItem } from "@/hooks/arraySlice";
import { decryptData, encryptData } from "@/hooks/crypto";
import { formatSymbolExpiryDate, formatValue } from "@/hooks/dateUtils";

// ─── Types ───────────────────────────────────────────────────────────────────

type TickPayload = {
  symbol: string;
  ask: number | string;
  bid: number | string;
  ltp: number | string;
  ch: number;
  chp: number;
  close?: number | string;
  high?: number | string;
  low?: number | string;
  lc?: number | string;
  uc?: number | string;
  ls?: number | string;
  ltt?: number | string;
  open?: number | string;
  ts?: number | string;
  tsq?: number | string;
  volume?: number | string;
};

type TickDataShape = { data?: TickPayload };

export type SymbolRow = {
  symbolName: string;
  masterName?: string;
  exchangeName?: string;
  expiryDate?: string | number | Date | null;
  ask: number | string;
  bid: number | string;
  ltp: number | string;
  ch: number;
  chp?: number;
  high?: number | string;
  low?: number | string;
  askColorClass?: string;
  bidColorClass?: string;
  lask?: number | string;
  lbid?: number | string;
  lltp?: number | string;
};

type UserTab = { userTabId: string; title: string; exchangeId?: string };

type RootState = { array: string[] };

// ─── Theme helpers ───────────────────────────────────────────────────────────

const NEG = "#F6465D";
const POS = "#2EBD85";
const NEU = "#848E9C";
const INK = "#fcd535";

const colorBySign = (n?: number | string) => {
  const v = Number(n);
  if (Number.isNaN(v)) return NEU;
  if (v > 0) return POS;
  if (v < 0) return NEG;
  return NEU;
};

// ─── Layout constants ────────────────────────────────────────────────────────

const HEADER_H = 56;
const TABS_H = 48;
const PADDING = 24;

// ─── Memory cache ────────────────────────────────────────────────────────────

type CacheShape = {
  userTabData?: UserTab[];
  tabsSymbolsMap?: Record<string, SymbolRow[]>;
  subscribed?: Set<string>;
};
const MW_CACHE: CacheShape = {};

const ALL_TAB_ID = "__ALL__";
const LS_HIDDEN_KEY = "watch_hidden_v1";

const WatchPage: React.FC = () => {
  const { tickData } = useWebSocket() as { tickData?: TickDataShape };

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialActiveFromQuery = searchParams.get("activeTabId");

  const deviceType = useMemo(
    () => (typeof window !== "undefined" ? localStorage.getItem("deviceType") || "web" : "web"),
    []
  );
  const jwtToken = useMemo(
    () => (typeof window !== "undefined" ? localStorage.getItem("token") || "" : ""),
    []
  );

  const [userTabData, setUserTabData] = useState<UserTab[]>(MW_CACHE.userTabData || []);
  const [tabsSymbolsMap, setTabsSymbolsMap] = useState<Record<string, SymbolRow[]>>(
    MW_CACHE.tabsSymbolsMap || {}
  );
  const [activeTab, setActiveTab] = useState<string | null>(initialActiveFromQuery || ALL_TAB_ID);
  const [bootLoading, setBootLoading] = useState<boolean>(!MW_CACHE.userTabData || !MW_CACHE.tabsSymbolsMap);

  // Hide/Unhide persistence
  const [version, setVersion] = useState(0);
  const [hiddenSymbols, setHiddenSymbols] = useState<Record<string, Set<string>>>({});

  const array = useSelector((s: RootState) => s.array);
  const dispatch = useDispatch();

  const subscribedSymbolsRef = useRef<Set<string>>(MW_CACHE.subscribed || new Set(array ?? []));
  const bootStartedRef = useRef(false);

  // Restore hidden state from LS
  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem(LS_HIDDEN_KEY) : null;
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, string[]>;
        const restored: Record<string, Set<string>> = {};
        Object.entries(parsed).forEach(([tabId, arr]) => (restored[tabId] = new Set(arr)));
        setHiddenSymbols(restored);
      }
    } catch {}
  }, []);

  // Persist hidden state to LS
  useEffect(() => {
    try {
      const serializable: Record<string, string[]> = {};
      Object.entries(hiddenSymbols).forEach(([tabId, set]) => (serializable[tabId] = Array.from(set)));
      if (typeof window !== "undefined") localStorage.setItem(LS_HIDDEN_KEY, JSON.stringify(serializable));
    } catch {}
  }, [hiddenSymbols]);

  const ensureSubscribedBatch = useCallback(
    async (symbols: string[]) => {
      const toAdd: string[] = [];
      for (const s of symbols) {
        if (!s) continue;
        if (!subscribedSymbolsRef.current.has(s)) {
          subscribedSymbolsRef.current.add(s);
          toAdd.push(s);
        }
      }
      if (toAdd.length) {
        await Promise.all(toAdd.map((sym) => dispatch(addItem(sym) as any)));
        webSocketManager.sendSymbols(Array.from(subscribedSymbolsRef.current));
        MW_CACHE.subscribed = subscribedSymbolsRef.current;
      }
    },
    [dispatch]
  );

  const makeQS = useCallback(
    (patch: Record<string, string | null | undefined>, preserve = false) => {
      const q = preserve
        ? new URLSearchParams(searchParams ? Array.from(searchParams.entries()) : [])
        : new URLSearchParams();
      Object.entries(patch).forEach(([k, v]) => {
        if (v === undefined || v === null || v === "") q.delete(k);
        else q.set(k, v);
      });
      const qs = q.toString();
      return qs ? `?${qs}` : "";
    },
    [searchParams]
  );

  const navigateToSearch = useCallback(() => {
    const tab = activeTab && activeTab !== ALL_TAB_ID ? userTabData.find((x) => x.userTabId === activeTab) : undefined;
    const qs = makeQS(
      {
        activeTabId: activeTab || undefined,
        activeTabExchangeId: tab?.exchangeId || undefined,
      },
      false
    );
    router.push(`/admin/search${qs}`);
  }, [activeTab, userTabData, makeQS, router]);

  const openSymbolDetails = useCallback(
    (item: SymbolRow) => {
      const symbol = item.symbolName?.toString().trim();
      if (!symbol) return;
      const qs = makeQS({ symbol, activeTabId: activeTab || undefined, pageName: "home" }, false);
      router.push(`/symbol-details${qs}`);
    },
    [activeTab, makeQS, router]
  );

  // PRELOAD ONCE: fetch all tabs/symbols; drop backend “ALL”; group locally
  const preloadAllOnce = useCallback(async () => {
    if (bootStartedRef.current) return;
    bootStartedRef.current = true;
    try {
      setBootLoading(true);

      const payload = JSON.stringify({ data: encryptData({}) });
      const res = await apiClient.post(`${ADMIN_API_ENDPOINT}${GET_USER_TAB_LIST_WITH_SYMBOL}`, payload, {
        headers: {
          Authorization: jwtToken,
          "Content-Type": "application/json",
          deviceType,
        },
      });
      if (res?.data?.statusCode !== SUCCESS) throw new Error(res?.data?.message || "Load failed");

      const resData = decryptData(res.data.data) as {
        userTabList: UserTab[];
        userTabSymbolList: SymbolRow[];
      };

      const tabs = (resData.userTabList || []).filter((t) => (t.title || "").trim().toLowerCase() !== "all");
      const allSymbols = (resData.userTabSymbolList || []).filter((x) => !!x?.symbolName);

      const titleToTabId = new Map<string, string>();
      tabs.forEach((t) => titleToTabId.set((t.title || "").toLowerCase(), t.userTabId));

      const othersTabId =
        tabs.find((t) => (t.title || "").toLowerCase() === "others")?.userTabId ?? tabs[0]?.userTabId;

      const grouped: Record<string, SymbolRow[]> = {};
      tabs.forEach((t) => (grouped[t.userTabId] = []));
      allSymbols.forEach((s) => {
        const key = (s.exchangeName || "").toLowerCase();
        const tabId = titleToTabId.get(key) ?? othersTabId;
        if (!grouped[tabId]) grouped[tabId] = [];
        grouped[tabId].push(s);
      });

      setUserTabData(tabs);
      setTabsSymbolsMap(grouped);
      MW_CACHE.userTabData = tabs;
      MW_CACHE.tabsSymbolsMap = grouped;

      const unique = Array.from(new Set(allSymbols.map((s) => s.symbolName)));
      await ensureSubscribedBatch(unique);

      setActiveTab(initialActiveFromQuery || ALL_TAB_ID);
    } catch (e) {
      console.error(e);
      setUserTabData([]);
      setTabsSymbolsMap({});
      setActiveTab(ALL_TAB_ID);
      MW_CACHE.userTabData = [];
      MW_CACHE.tabsSymbolsMap = {};
    } finally {
      setBootLoading(false);
    }
  }, [deviceType, jwtToken, ensureSubscribedBatch, initialActiveFromQuery]);

  // live ticks → patch
  useEffect(() => {
    const t = tickData?.data;
    if (!t) return;
    setTabsSymbolsMap((prev) => {
      let mutated = false;
      const next: Record<string, SymbolRow[]> = { ...prev };
      for (const tabId of Object.keys(prev)) {
        const arr = prev[tabId];
        if (!arr?.length) continue;
        let changed = false;
        const patched = arr.map((row) => {
          if (row.symbolName !== t.symbol) return row;
          const ask = Number(t.ask);
          const bid = Number(t.bid);
          const ltp = Number(t.ltp);
          const askClass = Number(row.ask) < ask ? "h-bg" : Number(row.ask) > ask ? "l-bg" : row.askColorClass || "";
          const bidClass = Number(row.bid) < bid ? "h-bg" : Number(row.bid) > bid ? "l-bg" : row.bidColorClass || "";
          changed = true;
          return {
            ...row,
            lask: row.ask,
            lbid: row.bid,
            lltp: row.ltp,
            askColorClass: askClass,
            bidColorClass: bidClass,
            ask,
            bid,
            ltp,
            ch: t.ch,
            chp: t.chp,
            close: t.close,
            high: t.high,
            low: t.low,
            lc: t.lc,
            uc: t.uc,
            ls: t.ls,
            ltt: t.ltt,
            open: t.open,
            ts: t.ts,
            tsq: t.tsq,
            volume: t.volume,
          } as SymbolRow;
        });
        if (changed) {
          next[tabId] = patched;
          mutated = true;
        }
      }
      if (mutated) {
        MW_CACHE.tabsSymbolsMap = next;
        return next;
      }
      return prev;
    });
  }, [tickData]);

  // boot + cleanup URL
  useEffect(() => {
    preloadAllOnce();
    if (initialActiveFromQuery && typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("activeTabId");
      const qs = url.searchParams.toString();
      const next = `${pathname}${qs ? "?" + qs : ""}`;
      if (next !== `${pathname}${window.location.search}`) router.replace(next);
    }
  }, []); // eslint-disable-line

  const tabsForUI = useMemo<UserTab[]>(() => [{ userTabId: ALL_TAB_ID, title: "ALL" }, ...userTabData], [userTabData]);

  const onTabChange = useCallback((k: string) => setActiveTab(k), []);

  const currentRows = useMemo<SymbolRow[]>(() => {
    if (!activeTab) return [];
    if (activeTab === ALL_TAB_ID) return Object.values(tabsSymbolsMap).flat();
    return tabsSymbolsMap[activeTab] || [];
  }, [activeTab, tabsSymbolsMap]);

  const currentHidden = useMemo(
    () => (activeTab ? hiddenSymbols[activeTab] ?? new Set<string>() : new Set<string>()),
    [hiddenSymbols, activeTab]
  );

  const visibleRows = useMemo(() => currentRows.filter((r) => !currentHidden.has(r.symbolName)), [currentRows, currentHidden]);

  const hideSymbols = useCallback(
    (symbols: string[]) => {
      if (!activeTab || !symbols.length) return;
      setHiddenSymbols((prev) => {
        const next = { ...prev };
        const s = new Set(next[activeTab] ?? []);
        symbols.forEach((sym) => s.add(sym));
        next[activeTab] = s;
        return next;
      });
      setVersion((v) => v + 1);
      router.refresh();
    },
    [activeTab, router]
  );

  const clearHidden = useCallback(() => {
    if (!activeTab) return;
    setHiddenSymbols((prev) => {
      const next = { ...prev };
      delete next[activeTab];
      return next;
    });
    setVersion((v) => v + 1);
    router.refresh();
  }, [activeTab, router]);

  const showSkeleton = bootLoading;
  const isEmpty = !showSkeleton && visibleRows.length === 0;

  return (
    <div className="space-y-3" style={{ backgroundColor: "#181a20", minHeight: "100vh" }}>
      <div className="sticky top-0 z-30" >
        <div className="container mx-auto px-3 py-2 flex items-center gap-2">
          <div className="flex-1" onClick={navigateToSearch} role="button">
            <Input
              readOnly
              placeholder="Search Script Here"
              className="cursor-pointer"
              // style={{ backgroundColor: "#1e2329", borderColor: "#2a2f36", color: "#848E9C", border: "1px solid" }}
            />
          </div>
          {/* <button onClick={clearHidden} className="text-xs underline underline-offset-2" style={{ color: "#848E9C" }}>
            Unhide all
          </button> */}
        </div>
      </div>

      <div className="container mx-auto px-3">
        <Tabs value={activeTab ?? undefined} onValueChange={onTabChange}>
          <TabsList className="flex flex-wrap max-w-full overflow-x-auto sticky top-[56px] z-20" style={{ backgroundColor: "#1e2329", borderColor: "#2a2f36" }}>
            {tabsForUI.map((t) => (
              <TabsTrigger key={t.userTabId} value={t.userTabId} style={{ color: activeTab === t.userTabId ? INK : "#848E9C", backgroundColor: activeTab === t.userTabId ? "#1e2329" : "transparent" }}>
                {t.title}
              </TabsTrigger>
            ))}
          </TabsList>

          {tabsForUI.map((t) => (
            <TabsContent value={t.userTabId} key={`${t.userTabId}-${version}`} className="mt-3 hover:bg-transparent">
              {activeTab !== t.userTabId ? null : (
                <>
                  {showSkeleton ? (
                    <div className="space-y-2">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="flex items-center justify-between py-2 border-b" style={{ borderColor: "#2a2f36" }}>
                          <Skeleton className="h-4 w-1/2" style={{ backgroundColor: "#2a2f36" }} />
                          <Skeleton className="h-4 w-24" style={{ backgroundColor: "#2a2f36" }} />
                        </div>
                      ))}
                    </div>
                  ) : isEmpty ? (
                    <div className="text-center py-16" style={{ color: "#848E9C" }}>
                      <div className="text-2xl mb-2">🗃️</div>
                      <div>No scripts match the current filter.</div>
                    </div>
                  ) : (
                    <div className="w-full" style={{ height: `calc(100vh - ${HEADER_H + TABS_H + PADDING}px)` }}>
                      <ScrollArea className="h-full rounded-md ">
                        <div className="min-w-full overflow-x-auto">
                          <Table className="w-full">
                            <TableHeader className="sticky top-0 z-10" style={{ backgroundColor: "#1e2329" }}>
                              <TableRow className="!bg-transparent hover:!bg-transparent data-[state=selected]:!bg-transparent focus-visible:!ring-0">
                                <TableHead>Script</TableHead>
                                <TableHead className="text-center w-44">
                                  <div className="grid grid-cols-2 gap-2">
                                    <span>BID</span>
                                    <span>ASK</span>
                                  </div>
                                </TableHead>
                              </TableRow>
                            </TableHeader>

                            <TableBody className="hover:bg-transparent [&>tr]:!bg-transparent [&>tr:hover]:!bg-transparent">
                              {visibleRows.map((item, i) => (
                                <TableRow className="!bg-transparent hover:!bg-transparent data-[state=selected]:!bg-transparent focus-visible:!ring-0" key={`${item.symbolName}-${i}`} style={{ borderColor: "#2a2f36" }}>
                                  <TableCell>
                                    <div className="flex flex-col gap-1">
                                      <div className="flex items-center gap-2">
                                        <i className={classNames("las", item.ch < 0 ? "la-angle-double-down" : "la-angle-double-up")} style={{ color: colorBySign(item.ch) }} />
                                        <button className="text-sm font-extrabold text-white" onClick={() => openSymbolDetails(item)}>
                                          {(item.exchangeName?.toLowerCase() === "usstock" ? item.symbolName : item.masterName) || item.symbolName}
                                        </button>

                                        <Badge variant="secondary" className="ml-1 font-normal" style={{ backgroundColor: "#1e2329", color: "#848E9C", border: "1px solid #2a2f36" }}>
                                          {formatSymbolExpiryDate(item.expiryDate)}
                                        </Badge>
{/* 
                                        <button onClick={() => hideSymbols([item.symbolName])} className="ml-2 text-xs underline underline-offset-2 opacity-70 hover:opacity-100" style={{ color: "#848E9C" }} title="Hide this script">
                                          Hide
                                        </button> */}
                                      </div>

                                      <div className="flex items-center gap-3 text-sm" style={{ color: colorBySign(item.ch) }}>
                                        <span>
                                          LTP: {formatValue(item.ltp, item.exchangeName)}
                                        </span>
                                        <span>{Number.isInteger(item.ch) ? item.ch : Number(item.ch).toFixed(2)}</span>
                                        {typeof item.chp === "number" && (
                                          <Badge style={{ backgroundColor: colorBySign(item.ch), color: "#ffffff", border: "none" }}>
                                            {item.chp.toFixed(2)}%
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                  </TableCell>

                                  <TableCell>
                                    <div className="flex justify-center gap-3">
                                      <div className={classNames("rounded-xl px-3 py-2 text-center", item.bidColorClass)} style={{ backgroundColor: "#1e2329", color: INK }}>
                                        <div className="text-sm font-semibold leading-none" style={{ color: colorBySign(item.ch) }}>
                                          {formatValue(item.bid, item.exchangeName)}
                                        </div>
                                        <div className="text-xs mt-1" style={{ color: "#848E9C" }}>
                                          H: {formatValue(item.high, item.exchangeName)}
                                        </div>
                                      </div>

                                      <div className={classNames("rounded-xl px-3 py-2 text-center", item.askColorClass)} style={{ backgroundColor: "#1e2329", color: INK }}>
                                        <div className="text-sm font-semibold leading-none" style={{ color: colorBySign(item.ch) }}>
                                          {formatValue(item.ask, item.exchangeName)}
                                        </div>
                                        <div className="text-xs mt-1" style={{ color: "#848E9C" }}>
                                          L: {formatValue(item.low, item.exchangeName)}
                                        </div>
                                      </div>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </ScrollArea>
                    </div>
                  )}
                </>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
};

export default WatchPage;

