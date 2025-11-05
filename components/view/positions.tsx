"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import apiClient from "@/lib/axiosInstance";

import * as XLSX from "xlsx";
import { useSession } from "next-auth/react";

import {
  ADMIN_API_ENDPOINT,
  BUY,
  EXCHANGE_LIST,
  POSITION_LIST,
  SELL,
  SUCCESS,
  SYMBOL_LIST,
  USER_SEARCH_LIST,
} from "@/constant/index";
import ChildPositionSheet from "@/components/positions/ChildPositionSheet";
import { decryptData, encryptData } from "@/hooks/crypto";
import { formatValue } from "@/hooks/range";
import { toast } from "sonner";
import { useWebSocket } from "@/components/socket/WebSocketProvider";
import { useSocket } from "@/components/socket/socketContext";
import webSocketManager from "@/components/socket/WebSocketManager";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Search } from "lucide-react";

// -------------------- Types --------------------
type Option = { label: string; value: string };

type PositionRow = {
  symbolId: string;
  exchangeName: string;
  symbolTitle: string;
  symbolName: string;
  buyTotalQuantity: number;
  sellTotalQuantity: number;
  totalQuantity: number;
  tradeType: typeof BUY | typeof SELL;
  price: number;
  bid: number;
  ask: number;
  ch?: number;
  chp?: number;
  ltp?: number;
  profitAndLossSharing?: number | string;
  totalQuantityPer?: number | string;
  ourPer?: number | string;
  m2m?: number;
  m2mTotal?: number | string;
  [k: string]: any;
};

type SortConfig = {
  key: keyof PositionRow | "script" | null;
  direction: "ascending" | "descending";
};

type PositionsProps = {
  userId?: string;
  userName?: string;
  /** Optional: parent can bump this to refetch (e.g., clicking Position again) */
  reloadTs?: number;
};

// -------------------- Debounce --------------------
function useDebouncedCallback<T extends (...args: any[]) => void>(
  cb: T,
  delay = 300
) {
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);
  return (...args: Parameters<T>) => {
    if (t.current) clearTimeout(t.current);
    t.current = setTimeout(() => cb(...args), delay);
  };
}

/** -------- Inline user search (closes on select) -------- */
function UserInlineSearch({
  value,
  onSelect,
  onQueryChange,
  options,
  loading,
  placeholder = "Type to search user...",
  disabled,
}: {
  value: Option | null;
  onSelect: (opt: Option) => void;
  onQueryChange: (q: string) => void;
  options: Option[];
  loading?: boolean;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (value) setQuery(value.label);
  }, [value]);

  const handleChange = (q: string) => {
    setQuery(q);
    onQueryChange(q);
    setOpen(focused && q.length > 0);
  };

  const handleSelect = (opt: Option) => {
    onSelect(opt);
    setOpen(false);
    setFocused(false);
  };

  return (
    <div className="relative">
      <div className="relative w-full">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 opacity-50" />
        <Input
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => {
            setFocused(true);
            setOpen(query.length > 0);
          }}
          onBlur={() => {
            setTimeout(() => {
              setFocused(false);
              setOpen(false);
            }, 120);
          }}
          placeholder={placeholder}
          disabled={disabled}
          className="pl-8 bg-[#181a20] text-white border-gray-700"
        />
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md">
          {loading ? (
            <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching…
            </div>
          ) : options.length === 0 ? (
            <div className="p-3 text-sm text-muted-foreground">No results</div>
          ) : (
            <ul className="max-h-64 overflow-y-auto py-1">
              {options.map((opt) => (
                <li
                  key={opt.value}
                  className="px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground cursor-pointer"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelect(opt)}
                >
                  {opt.label}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

// -------------------- Component --------------------
export default function Positions({ userId, userName, reloadTs }: PositionsProps) {
  const { data: session } = useSession();
  const { tickData } = useWebSocket();
  const { channelData } = useSocket();

  const [childOpen, setChildOpen] = useState(false);
  const [childSymbolId, setChildSymbolId] = useState<string | null>(null);
  const openChild = (sid: string) => {
    setChildSymbolId(sid);
    setChildOpen(true);
  };

  const deviceType =
    typeof window !== "undefined" ? localStorage.getItem("deviceType") : "";
  const jwt_token =
    typeof window !== "undefined" ? localStorage.getItem("token") : "";

  const subscribedSymbolsRef = useRef<string[]>([]);
  const isPrivileged =
    session?.user?.role === "admin" || session?.user?.role === "superadmin";

  // data
  const [tableData, setTableData] = useState<PositionRow[]>([]);
  const [netplTotal, setNetplTotal] = useState<string>("0.00");
  const [totalCount, setTotalCount] = useState<number>(0);

  // loading flags
  const [loading, setLoading] = useState(false);
  const [loadingExport, setLoadingExport] = useState(false);
  const [userSearchLoading, setUserSearchLoading] = useState(false);

  // filters
  const [userOptions, setUserOptions] = useState<Option[]>([]);
  const [exchangeOptions, setExchangeOptions] = useState<Option[]>([]);
  const [symbolOptions, setSymbolOptions] = useState<Option[]>([]);
  const [selectedUser, setSelectedUser] = useState<Option | null>(
    userId ? { value: userId, label: userName || userId } : null
  );
  const [selectedExchange, setSelectedExchange] = useState<Option | null>(null);
  const [selectedSymbol, setSelectedSymbol] = useState<Option | null>(null);
  const typeData: Option[] = [
    { value: "intraday", label: "Intraday" },
    { value: "longTerm", label: "longTerm" },
    { value: "", label: "All" },
  ];
  const [selectedType, setSelectedType] = useState<Option>(typeData[2]);
  const [filterActive, setFilterActive] = useState(false);

  // sort
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: null,
    direction: "ascending",
  });
  const requestSort = (key: SortConfig["key"]) => {
    let direction: SortConfig["direction"] = "ascending";
    if (sortConfig.key === key && sortConfig.direction === "ascending")
      direction = "descending";
    setSortConfig({ key, direction });
  };
  const getSortIcon = (key: string) => {
    if (sortConfig.key !== key) return "fa-solid fa-sort";
    return sortConfig.direction === "ascending"
      ? "fa-solid fa-sort-up"
      : "fa-solid fa-sort-down";
  };

  const sortedTableData = useMemo(() => {
    const items = [...tableData];
    if (sortConfig.key === null) return items;

    items.sort((a: any, b: any) => {
      let aValue: any;
      let bValue: any;

      if (sortConfig.key === "script") {
        const name = (row: PositionRow) => {
          if (row.exchangeName?.toLowerCase() === "usstock") return row.symbolName;
          if (row.exchangeName?.toLowerCase() === "ce/pe") return row.symbolTitle;
          return (row as any).masterName;
        };
        aValue = name(a);
        bValue = name(b);
      } else {
        aValue = a[sortConfig.key];
        bValue = b[sortConfig.key];
      }

      if (aValue == null) return 1;
      if (bValue == null) return -1;

      if (typeof aValue === "string") {
        return sortConfig.direction === "ascending"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      if (aValue < bValue) return sortConfig.direction === "ascending" ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === "ascending" ? 1 : -1;
      return 0;
    });

    return items;
  }, [tableData, sortConfig]);

  // --------------- Helpers ---------------
  const addSymbolIfAbsent = (symbolName: string) => {
    const arr = subscribedSymbolsRef.current;
    if (symbolName && !arr.includes(symbolName)) arr.push(symbolName);
  };

  const socketData = async (rows: PositionRow[]) => {
    rows.forEach((r) => r?.symbolName && addSymbolIfAbsent(r.symbolName));
    webSocketManager.sendSymbols(subscribedSymbolsRef.current);
  };

  const computeM2MAndTotals = (rows: PositionRow[]) => {
    let netpl = 0;

    const computed = rows.map((row) => {
      const priceFixed = Number(Number(row.price).toFixed(2));
      let m2m = 0;

      if (row.tradeType === SELL && row.totalQuantity > 0) {
        m2m = (Number(row.ask) - priceFixed) * Number(row.totalQuantity);
      } else {
        if (Number(row.totalQuantity) < 0) {
          m2m = (Number(row.ask) - priceFixed) * Number(row.totalQuantity);
        } else {
          m2m = (Number(row.bid) - priceFixed) * Number(row.totalQuantity);
        }
      }

      netpl += m2m;

      const pct = Number(row.profitAndLossSharing ?? 0);
      const ourPer = isNaN(m2m) || isNaN(pct) ? 0 : Number(((m2m * pct) / 100).toFixed(2));
      const qtyPer =
        isNaN(Number(row.totalQuantity)) || isNaN(pct)
          ? 0
          : Number(((Number(row.totalQuantity) * pct) / 100).toFixed(2));

      return {
        ...row,
        m2m,
        m2mTotal: Number(m2m.toFixed(2)),
        ourPer,
        totalQuantityPer: qtyPer,
      };
    });

    setNetplTotal(netpl.toFixed(2));
    setTableData(computed);
    socketData(computed);
  };

  // --------------- API ---------------
  const fetchPositions = async (isReset: boolean) => {
    try {
      setLoading(true);

      const payload = isReset
        ? {
            search: "",
            userId: "",
            symbolId: "",
            exchangeId: "",
            type: "",
            status: "",
            page: 1,
            limit: 800,
          }
        : {
            search: "",
            userId: selectedUser?.value ?? userId ?? "",
            symbolId: selectedSymbol?.value ?? "",
            exchangeId: selectedExchange?.value ?? "",
            type: selectedType?.value ?? "",
            status: "",
            page: 1,
            limit: 800,
          };

      const res = await apiClient.post(
        POSITION_LIST,
        JSON.stringify({ data: encryptData(payload) }),
      );

      if (res.data.statusCode === SUCCESS) {
        const raw = decryptData(res.data.data);
        const rdata: PositionRow[] = Array.isArray(raw) ? raw : [];
        computeM2MAndTotals(rdata);
        setTotalCount(res.data.meta?.totalCount ?? rdata.length);
      } else {
        toast.error(res.data.message);
        computeM2MAndTotals([]);
        setTotalCount(0);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to load positions");
      console.error("fetchPositions error:", err);
      computeM2MAndTotals([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  const fetchExchanges = async () => {
    try {
      const res = await apiClient.post(
        EXCHANGE_LIST,
        JSON.stringify({
          data: encryptData({
            page: 1,
            limit: 10,
            search: "",
            sortKey: "createdAt",
            sortBy: -1,
          }),
        }),
      );

      if (res.data.statusCode === SUCCESS) {
        const r = decryptData(res.data.data) as any[];
        setExchangeOptions(
          r.map((item) => ({ label: item.name, value: item.exchangeId }))
        );
      }
    } catch (e) {
      console.error("fetchExchanges error:", e);
    }
  };

  const fetchSymbolsForExchange = async (exchangeOpt: Option | null) => {
    setSymbolOptions([]);
    if (!exchangeOpt) return;
    try {
      const res = await apiClient.post(
        SYMBOL_LIST,
        JSON.stringify({
          data: encryptData({
            page: 1,
            limit: 1000,
            search: "",
            exchangeId: exchangeOpt.value,
            sortKey: "createdAt",
            sortBy: -1,
          }),
        }),
      );

      if (res.data.statusCode === SUCCESS) {
        const r = decryptData(res.data.data) as any[];
        setSymbolOptions(
          r.map((item) => ({ label: item.symbolName, value: item.symbolId }))
        );
      }
    } catch (e) {
      console.error("fetchSymbolsForExchange error:", e);
    }
  };

  const searchUsers = async (q: string) => {
    if (!q || q.length < 1) {
      setUserOptions([]);
      return;
    }
    try {
      setUserSearchLoading(true);
      const res = await apiClient.post(
        USER_SEARCH_LIST,
        JSON.stringify({
          data: encryptData({
            filterType: 0,
            roleId: "",
            userId: selectedUser?.value ?? userId ?? "",
            status: 0,
            search: q,
            page: 1,
            limit: 50,
          }),
        }),
      );

      if (res.data.statusCode === SUCCESS) {
        const r = decryptData(res.data.data) as any[];
        setUserOptions(
          r.map((item) => ({
            label:
              item.userName || item.name || item.phone || String(item.userId),
            value: item.userId,
          }))
        );
      } else {
        toast.error(res.data.message);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to search users");
      console.error("searchUsers error:", err);
    } finally {
      setUserSearchLoading(false);
    }
  };

  const debouncedUserSearch = useDebouncedCallback((q: string) => {
    searchUsers(q);
  }, 350);

  // --------------- Handlers ---------------
  const handleView = () => {
    setFilterActive(true);
    fetchPositions(false);
  };

  const handleClear = () => {
    setSelectedUser(userId ? { value: userId, label: userName || userId } : null);
    setSelectedExchange(null);
    setSelectedSymbol(null);
    setSelectedType(typeData[2]);
    setFilterActive(false);
    setUserOptions([]);
    fetchPositions(true);
  };

  const exportToExcel = () => {
    setLoadingExport(true);
    setTimeout(() => {
      const table = document.getElementById("positionsTable");
      if (!table) {
        setLoadingExport(false);
        return;
      }
      const worksheet = XLSX.utils.table_to_sheet(table);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
      XLSX.writeFile(workbook, "PositionData.xlsx");
      setLoadingExport(false);
    }, 100);
  };

  // --------------- Effects ---------------
  // Title
  useEffect(() => {
    const prev = document.title;
    document.title = "Admin Panel | Position";
    return () => {
      document.title = prev || "Admin Panel";
    };
  }, []);

  // Initial load
  useEffect(() => {
    fetchExchanges();
    fetchPositions(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync with userId prop and refetch when it changes
  useEffect(() => {
    setSelectedUser(userId ? { value: userId, label: userName || userId } : null);
    if (userId) fetchPositions(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Optional: parent-triggered reload
  useEffect(() => {
    if (typeof reloadTs === "number") fetchPositions(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadTs]);

  // Socket: channelData (structural updates)
  useEffect(() => {
    if (!channelData) return;
    const data = channelData as any;

    if (data?.position?.symbolId) {
      if (data?.position?.data) {
        const exists = tableData.some((x) => x.symbolId === data.position.symbolId);
        if (!exists && !filterActive) {
          computeM2MAndTotals([data.position.data, ...tableData]);
        } else {
          const updated = tableData.map((row) =>
            row.symbolId === data.position.symbolId ? data.position.data : row
          );
          computeM2MAndTotals(updated);
        }
      } else {
        const filtered = tableData.filter((row) => row.symbolId !== data.position.symbolId);
        computeM2MAndTotals(filtered);
      }
    }

    if (data?.userData && Array.isArray(data.userData)) {
      localStorage.setItem("authenticated", JSON.stringify(data.userData));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelData]);

  // Socket: live ticks
  useEffect(() => {
    if (!tickData || typeof tickData !== "object" || !("data" in tickData)) return;
    const t = (tickData as { data: any }).data;
    let netpl = 0;

    const updated = tableData.map((row) => {
      if (row.symbolName === t.symbol) {
        const priceFixed = Number(Number(row.price).toFixed(2));
        let m2m = 0;

        if (row.tradeType === SELL && row.totalQuantity > 0) {
          m2m = (Number(t.ask) - priceFixed) * Number(row.totalQuantity);
        } else {
          if (Number(row.totalQuantity) < 0) {
            m2m = (Number(t.ask) - priceFixed) * Number(row.totalQuantity);
          } else {
            m2m = (Number(t.bid) - priceFixed) * Number(row.totalQuantity);
          }
        }

        const pct = Number(row.profitAndLossSharing ?? 0);
        const ourPer = isNaN(m2m) || isNaN(pct) ? 0 : Number(((m2m * pct) / 100).toFixed(2));
        const qtyPer =
          isNaN(Number(row.totalQuantity)) || isNaN(pct)
            ? 0
            : Number(((Number(row.totalQuantity) * pct) / 100).toFixed(2));

        const next = {
          ...row,
          ltp: Number(t.ltp),
          ask: Number(t.ask),
          bid: Number(t.bid),
          ch: Number(t.ch),
          chp: Number(t.chp),
          m2m,
          m2mTotal: Number(m2m.toFixed(2)),
          ourPer,
          totalQuantityPer: qtyPer,
        };

        netpl += m2m;
        return next;
      } else {
        netpl += Number(row.m2mTotal ?? 0);
        return row;
      }
    });

    setNetplTotal(netpl.toFixed(2));
    setTableData(updated);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tickData]);

  // When exchange changes, load symbols
  useEffect(() => {
    fetchSymbolsForExchange(selectedExchange);
    setSelectedSymbol(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedExchange?.value]);

  // -------------------- UI --------------------
  const columnsCount = isPrivileged ? 10 : 8;

  return (
    <div className="p-4 overflow-y-auto bg-[#181a20] h-full">
      <div className="space-y-4">
        <Card className="border rounded-2xl bg-[#1e2329] border-gray-700">
          <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-5">
            {/* User search (visible only when no userId prop) */}
            {!userId && (
              <div className="space-y-1 md:col-span-2">
                <Label className="text-[#fcd535]">User</Label>
                <UserInlineSearch
                  value={selectedUser}
                  onSelect={(opt) => setSelectedUser(opt)}
                  onQueryChange={(q) => debouncedUserSearch(q)}
                  options={userOptions}
                  loading={userSearchLoading}
                  placeholder="Type user name / phone / userId…"
                />
              </div>
            )}

            {/* Exchange */}
            <div className="space-y-1">
              <Label className="text-[#848E9C]">Exchange</Label>
              <select
                value={selectedExchange?.value ?? ""}
                onChange={(e) => {
                  const selected = exchangeOptions.find((o) => o.value === e.target.value) || null;
                  setSelectedExchange(selected);
                }}
                className="bg-[#181a20] text-white border-gray-700 w-full py-2 px-3 rounded-md"
              >
                <option value="">Select exchange...</option>
                {exchangeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Symbol */}
            <div className="space-y-1">
              <Label className="text-[#848E9C]">Symbols</Label>
              <select
                value={selectedSymbol?.value ?? ""}
                onChange={(e) => {
                  const selected = symbolOptions.find((o) => o.value === e.target.value) || null;
                  setSelectedSymbol(selected);
                }}
                className="bg-[#181a20] text-white border-gray-700 w-full py-2 px-3 rounded-md"
              >
                <option value="">Select symbol...</option>
                {symbolOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Type */}
            <div className="space-y-1">
              <Label className="text-[#848E9C]">Type</Label>
              <select
                value={selectedType?.value ?? ""}
                onChange={(e) => {
                  const selected = typeData.find((o) => o.value === e.target.value) || typeData[2];
                  setSelectedType(selected);
                }}
                className="bg-[#181a20] text-white border-gray-700 w-full py-2 px-3 rounded-md"
              >
                <option value="">Select type...</option>
                {typeData.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Actions */}
            <div className="flex items-end gap-2">
              <Button
                variant="secondary"
                onClick={exportToExcel}
                disabled={loadingExport}
                className="bg-[#2b3139] text-white hover:bg-[#2b3139]"
              >
                {loadingExport ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Exporting…
                  </span>
                ) : (
                  "Export to Excel"
                )}
              </Button>
              <Button onClick={handleView} className="bg-[#fcd535] text-black hover:bg-[#fcd535]">
                View
              </Button>
              <Button
                variant="destructive"
                onClick={handleClear}
                className="bg-red-600 text-white hover:bg-red-600"
              >
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border rounded-2xl bg-[#1e2329] border-gray-700">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base text-[#fcd535]">Positions</CardTitle>
            </div>
          </CardHeader>

          <CardContent className="overflow-x-auto">
            <Table id="positionsTable">
              <TableHeader>
                <TableRow className="border-gray-700">
                  <TableHead
                    className="min-w-[160px] cursor-pointer text-[#848E9C]"
                    onClick={() => requestSort("exchangeName")}
                  >
                    EXCHANGE <i className={getSortIcon("exchangeName")} />
                  </TableHead>
                  <TableHead
                    className="cursor-pointer text-[#848E9C]"
                    onClick={() => requestSort("symbolTitle")}
                  >
                    SYMBOL <i className={getSortIcon("symbolTitle")} />
                  </TableHead>
                  <TableHead
                    className="cursor-pointer text-right text-[#848E9C]"
                    onClick={() => requestSort("buyTotalQuantity")}
                  >
                    BUY QTY <i className={getSortIcon("buyTotalQuantity")} />
                  </TableHead>
                  <TableHead
                    className="cursor-pointer text-right text-[#848E9C]"
                    onClick={() => requestSort("sellTotalQuantity")}
                  >
                    SELL QTY <i className={getSortIcon("sellTotalQuantity")} />
                  </TableHead>
                  <TableHead
                    className="cursor-pointer text-center text-[#848E9C]"
                    onClick={() => requestSort("totalQuantity")}
                  >
                    NET QTY <i className={getSortIcon("totalQuantity")} />
                  </TableHead>
                  {isPrivileged && (
                    <TableHead
                      className="cursor-pointer text-center text-[#848E9C]"
                      onClick={() => requestSort("totalQuantityPer")}
                    >
                      NET QTY(%) <i className={getSortIcon("totalQuantityPer")} />
                    </TableHead>
                  )}
                  <TableHead
                    className="cursor-pointer text-right text-[#848E9C]"
                    onClick={() => requestSort("price")}
                  >
                    NET AVG PRICE <i className={getSortIcon("price")} />
                  </TableHead>
                  <TableHead
                    className="cursor-pointer text-right text-[#848E9C]"
                    onClick={() => requestSort("price")}
                  >
                    CMP <i className={getSortIcon("price")} />
                  </TableHead>
                  <TableHead
                    className="cursor-pointer text-right text-[#848E9C]"
                    onClick={() => requestSort("m2mTotal")}
                  >
                    M2M AMT <i className={getSortIcon("m2mTotal")} />
                  </TableHead>
                  {isPrivileged && (
                    <TableHead
                      className="cursor-pointer text-right text-[#848E9C]"
                      onClick={() => requestSort("ourPer")}
                    >
                      Our % <i className={getSortIcon("ourPer")} />
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading ? (
                  <TableRow className="border-gray-700">
                    <TableCell colSpan={isPrivileged ? 10 : 8} className="py-10 text-center">
                      <span className="inline-flex items-center gap-2 text-[#848E9C]">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Loading positions…
                      </span>
                    </TableCell>
                  </TableRow>
                ) : sortedTableData.length === 0 ? (
                  <TableRow className="border-gray-700">
                    <TableCell
                      colSpan={isPrivileged ? 10 : 8}
                      className="py-10 text-center text-[#848E9C]"
                    >
                      No Data Found
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedTableData.map((item, idx) => (
                    <TableRow key={idx} className="border-gray-700 text-white">
                      <TableCell className="text-left">{item.exchangeName}</TableCell>
                      <TableCell className="text-left">{item.symbolTitle}</TableCell>
                      <TableCell className="text-right">
                        {Number(item.buyTotalQuantity).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        {Number(item.sellTotalQuantity).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="link"
                          className="p-0 h-auto underline text-[#fcd535] hover:text-[#fcd535]"
                          onClick={() => openChild(item.symbolId)}
                          title="View child positions in bottom panel"
                        >
                          {Number(item.totalQuantity).toFixed(2)}
                        </Button>
                      </TableCell>
                      {isPrivileged && (
                        <TableCell className="text-center">{item.totalQuantityPer}</TableCell>
                      )}
                      <TableCell className="text-right">
                        {formatValue(Number(item.price), item.exchangeName)}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.tradeType === BUY
                          ? formatValue(Number(item.bid), item.exchangeName)
                          : formatValue(Number(item.ask), item.exchangeName)}
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={Number(item.m2mTotal) >= 0 ? "text-green-500" : "text-red-500"}
                        >
                          {item.m2mTotal}
                        </span>
                      </TableCell>
                      {isPrivileged && (
                        <TableCell className="text-right">
                          <span
                            className={Number(item.ourPer) >= 0 ? "text-green-500" : "text-red-500"}
                          >
                            {item.ourPer}
                          </span>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>

              <TableFooter className="bg-transparent">
                <TableRow className="border-gray-700">
                  <TableCell>
                    <h6 className="m-0 font-semibold text-[#fcd535]">Total</h6>
                  </TableCell>
                  <TableCell />
                  <TableCell />
                  <TableCell />
                  <TableCell />
                  {isPrivileged && <TableCell />}
                  <TableCell />
                  <TableCell />
                  <TableCell className="text-right">
                    <span
                      className={`font-semibold ${
                        Number(netplTotal) >= 0 ? "text-green-500" : "text-red-500"
                      }`}
                    >
                      {netplTotal}
                    </span>
                  </TableCell>
                  {isPrivileged && <TableCell />}
                </TableRow>
              </TableFooter>
            </Table>
          </CardContent>
        </Card>

        <ChildPositionSheet open={childOpen} symbolId={childSymbolId} onOpenChange={setChildOpen} />
      </div>
    </div>
  );
}
