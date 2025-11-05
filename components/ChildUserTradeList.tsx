
"use client";

import React, {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import axios, { AxiosRequestConfig } from "axios";
import { useParams } from "react-router-dom";
import apiClient from "@/lib/axiosInstance";
import * as XLSX from "xlsx";

// ---- app imports ----
import {
  ADMIN_API_ENDPOINT,
  EXCHANGE_LIST,
  EXECUTED,
  SUCCESS,
  SYMBOL_LIST,
  TRADE_LIST,
} from "@/constant/index";

// ⛳️ FIX THIS PATH to your actual helpers location
import { decryptData, encryptData } from "@/hooks/crypto"
import { formatDateTime } from "@/hooks/dateUtils";
import { useSocket } from "@/components/socket/socketContext";
import { toastError, toastSuccess } from "@/hooks/toastMsg";

// ---- shadcn/ui ----
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ============================ Types ============================

type SortDirection = "ascending" | "descending";

export type TradeRow = {
  tradeId: string;
  sequence: string;
  userId: string;
  userName: string;
  parentUserName: string;
  exchangeName: string;
  symbolTitle: string;
  createdAt: string | number | Date;
  tradeType: string; // BUY/SELL
  totalQuantity: number;
  quantity: number; // lots
  productTypeValue: string;
  profitLoss: number;
  price: number;
  brokerageAmount: number;
  executionDateTime: string | number | Date;
  referencePrice: number;
  ipAddress?: string;
  deviceId?: string;
  status?: string;
};

type SortKey =
  | "sequence"
  | "userName"
  | "parentUserName"
  | "exchangeName"
  | "symbolTitle"
  | "createdAt"
  | "tradeType"
  | "totalQuantity"
  | "quantity"
  | "productTypeValue"
  | "profitLoss"
  | "price"
  | "brokerageAmount"
  | "executionDateTime"
  | "referencePrice"
  | "ipAddress"
  | "deviceId";

interface OptionKV {
  label: string;
  value: string;
}

interface ExchangeResItem {
  name: string;
  exchangeId: string;
}

interface SymbolResItem {
  symbolName: string;
  symbolId: string;
}

// If you have a proper type for channelData, replace this:
type SocketChannelData =
  | {
      trade?: Partial<TradeRow> & { userId?: string; status?: string };
      userData?: Record<string, unknown>;
    }
  | undefined;

// ============================ Component ============================

const ITEMS_PER_PAGE = 200;

const ChildUserTrades: React.FC = () => {
  const { userId = "" } = useParams<{ userId: string }>();
  const { channelData } = useSocket() as { channelData: SocketChannelData };

  const deviceType =
    (typeof window !== "undefined" && localStorage.getItem("deviceType")) || "";
  const jwt_token =
    (typeof window !== "undefined" && localStorage.getItem("token")) || "";

  const mountedRef = useRef<boolean>(true);

  const [tableData, setTableData] = useState<TradeRow[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);

  const [exchangeData, setExchangeData] = useState<OptionKV[]>([]);
  const [symbolData, setSymbolData] = useState<OptionKV[]>([]);
  const [formData, setFormData] = useState<{
    exchange?: OptionKV;
    symbol?: OptionKV;
    startDate?: string;
    endDate?: string;
  }>({});

  const [sortConfig, setSortConfig] = useState<{
    key: SortKey | null;
    direction: SortDirection;
  }>({ key: null, direction: "ascending" });

  const [isLoading, setIsLoading] = useState<boolean>(false);

  // ---------- helpers ----------

  const authHeaders: AxiosRequestConfig["headers"] = {
    Authorization: jwt_token,
    "Content-Type": "application/json",
    deviceType,
  };

  const setSafeState =
    <T,>(setter: React.Dispatch<React.SetStateAction<T>>) =>
    (updater: React.SetStateAction<T>) => {
      if (mountedRef.current) setter(updater);
    };

  const setTableDataSafe = setSafeState(setTableData);
  const setTotalPagesSafe = setSafeState(setTotalPages);
  const setTotalCountSafe = setSafeState(setTotalCount);
  const setIsLoadingSafe = setSafeState(setIsLoading);

  const isValidDateRange = (start?: string, end?: string) => {
    if (!start || !end) return true;
    return new Date(start) <= new Date(end);
  };

  const toNum = (val: unknown): number =>
    typeof val === "number"
      ? val
      : typeof val === "string"
      ? Number(val)
      : Number.NaN;

  // ---------- sorting ----------

  const requestSort = (key: SortKey) => {
    setSortConfig((prev) => ({
      key,
      direction:
        prev.key === key && prev.direction === "ascending"
          ? "descending"
          : "ascending",
    }));
  };

  const getSortIcon = (key: SortKey) => {
    if (sortConfig.key !== key) return "fa-solid fa-sort";
    return sortConfig.direction === "ascending"
      ? "fa-solid fa-sort-up"
      : "fa-solid fa-sort-down";
  };

  const sortedTableData = useMemo(() => {
    const items = [...tableData];
    const { key, direction } = sortConfig;
    if (!key) return items;

    const asc = direction === "ascending" ? 1 : -1;

    return items.sort((a, b) => {
      const av = (a as Record<string, unknown>)[key];
      const bv = (b as Record<string, unknown>)[key];

      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;

      const an = toNum(av);
      const bn = toNum(bv);
      const bothNumeric = Number.isFinite(an) && Number.isFinite(bn);

      if (bothNumeric) return an > bn ? asc : an < bn ? -asc : 0;

      const as = String(av);
      const bs = String(bv);
      return as.localeCompare(bs) * asc;
    });
  }, [tableData, sortConfig]);

  // ---------- fetchers ----------

  const fetchExchanges = useCallback(async () => {
    try {
      const body = JSON.stringify({
        data: encryptData({
          page: 1,
          limit: 100,
          search: "",
          sortKey: "createdAt",
          sortBy: -1,
        }),
      });
      const res = await apiClient.post(EXCHANGE_LIST, body, {
        headers: authHeaders,
      });
      if (res.data.statusCode === SUCCESS) {
        const items = decryptData(res.data.data) as ExchangeResItem[];
        setExchangeData(
          items.map((i) => ({ label: i.name, value: i.exchangeId }))
        );
      }
    } catch (e) {
      console.error("Exchange fetch failed:", e);
    }
  }, [authHeaders]);

  const fetchSymbols = useCallback(
    async (exchangeId: string) => {
      try {
        const body = JSON.stringify({
          data: encryptData({
            page: 1,
            limit: 1000,
            search: "",
            exchangeId,
            sortKey: "createdAt",
            sortBy: -1,
          }),
        });
        const res = await apiClient.post(ADMIN_API_ENDPOINT + SYMBOL_LIST, body, {
          headers: authHeaders,
        });
        if (res.data.statusCode === SUCCESS) {
          const items = decryptData(res.data.data) as SymbolResItem[];
          setSymbolData(
            items.map((i) => ({ label: i.symbolName, value: i.symbolId }))
          );
        }
      } catch (e) {
        console.error("Symbol fetch failed:", e);
      }
    },
    [authHeaders]
  );

  const fetchTrades = useCallback(
    async (reset: 0 | 1) => {
      if (!isValidDateRange(formData.startDate, formData.endDate)) {
        toastError("End date cannot be before start date.");
        return;
      }

      try {
        setIsLoadingSafe(true);

        const payload = reset
          ? encryptData({
              search: "",
              userId: userId || "",
              symbolId: "",
              exchangeId: "",
              status: EXECUTED,
              startDate: "",
              endDate: "",
              page: currentPage,
              limit: ITEMS_PER_PAGE,
            })
          : encryptData({
              search: "",
              userId, // always scope to this userId route
              symbolId: formData?.symbol?.value || "",
              exchangeId: formData?.exchange?.value || "",
              status: EXECUTED,
              startDate: formData?.startDate || "",
              endDate: formData?.endDate || "",
              page: currentPage,
              limit: ITEMS_PER_PAGE,
            });

        const res = await apiClient.post(
        TRADE_LIST,
          JSON.stringify({ data: payload }),
        );

        if (res.data.statusCode === SUCCESS) {
          const rows = decryptData(res.data.data) as TradeRow[];
          setTableDataSafe(rows);
          setTotalPagesSafe(res.data.meta.totalPage);
          setTotalCountSafe(res.data.meta.totalCount);
        } else {
          toastError(res.data.message);
        }
      } catch (error: unknown) {
        const err = error as { response?: { data?: { message?: string } } };
        toastError(err?.response?.data?.message || "Failed to load trades.");
      } finally {
        setIsLoadingSafe(false);
      }
    },
    [
      authHeaders,
      currentPage,
      formData?.endDate,
      formData?.exchange?.value,
      formData?.startDate,
      formData?.symbol?.value,
      userId,
    ]
  );

  // ---------- actions ----------

  const onView = () => {
    setCurrentPage(1);
    fetchTrades(0);
  };

  const onClear = () => {
    setFormData({});
    setSymbolData([]);
    setCurrentPage(1);
    fetchTrades(1);
  };

  const exportToExcel = () => {
    const table = document.getElementById("tradeTable");
    if (!table) return;
    const ws = XLSX.utils.table_to_sheet(table);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Trades");
    XLSX.writeFile(wb, "TradeData.xlsx");
    toastSuccess("Exported TradeData.xlsx");
  };

  // ---------- realtime prepend ----------
  useEffect(() => {
    if (channelData?.trade && channelData.trade.userId === userId) {
      if (channelData.trade.status === EXECUTED) {
        setTableData((prev) => {
          const exists = prev.some(
            (r) => r.tradeId === channelData.trade!.tradeId
          );
          if (exists) return prev;
          return [channelData.trade as TradeRow, ...prev];
        });
      }
    }
    if (channelData?.userData && Object.keys(channelData.userData).length > 0) {
      localStorage.setItem("authenticated", JSON.stringify(channelData.userData));
    }
  }, [channelData, userId]);

  // ---------- lifecycle ----------
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    fetchTrades(0); // load on page change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  useEffect(() => {
    fetchExchanges();
  }, [fetchExchanges]);

  useEffect(() => {
    document.title = "Admin Panel | Trade List";
    return () => {
      document.title = "Admin Panel";
    };
  }, []);

  // ============================ UI ============================

  return (
    <Fragment>
      <div className="px-4 sm:px-6 py-6">
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl md:text-2xl font-semibold tracking-tight text-[#003B5C]">
                Trade List
              </CardTitle>
              <Badge variant="secondary" className="rounded-full">
                {isLoading ? "Loading…" : `Records — ${totalCount}`}
              </Badge>
            </div>
            <Separator className="mt-3" />

            {/* Filters */}
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-4">
              <div>
                <Label className="text-sm text-gray-700">From Date</Label>
                <Input
                  type="date"
                  value={formData.startDate || ""}
                  onChange={(e) =>
                    setFormData((p) => ({ ...(p || {}), startDate: e.target.value }))
                  }
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm text-gray-700">To Date</Label>
                <Input
                  type="date"
                  value={formData.endDate || ""}
                  onChange={(e) =>
                    setFormData((p) => ({ ...(p || {}), endDate: e.target.value }))
                  }
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm text-gray-700">Exchange</Label>
                <Select
                  value={formData?.exchange?.value}
                  onValueChange={(val: string) => {
                    const found = exchangeData.find((x) => x.value === val);
                    setFormData((p) => ({ ...(p || {}), exchange: found }));
                    setSymbolData([]);
                    if (found) fetchSymbols(found.value);
                  }}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select exchange" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Exchanges</SelectLabel>
                      {exchangeData.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm text-gray-700">Symbol</Label>
                <Select
                  value={formData?.symbol?.value}
                  onValueChange={(val: string) => {
                    const found = symbolData.find((x) => x.value === val);
                    setFormData((p) => ({ ...(p || {}), symbol: found }));
                  }}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select symbol" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Symbols</SelectLabel>
                      {symbolData.length ? (
                        symbolData.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))
                      ) : (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">
                          {formData.exchange ? "No symbols" : "Choose an exchange first"}
                        </div>
                      )}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              <div className="xl:col-span-2 md:col-span-2 flex items-end gap-2">
                <Button onClick={onView} className="w-full md:w-auto" disabled={isLoading}>
                  View
                </Button>
                <Button
                  variant="destructive"
                  onClick={onClear}
                  className="w-full md:w-auto"
                  disabled={isLoading}
                >
                  Clear
                </Button>
                <Button
                  variant="outline"
                  onClick={exportToExcel}
                  className="w-full md:w-auto"
                  disabled={!tableData.length}
                >
                  Export
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <div
              className="relative rounded-xl border bg-white overflow-auto shadow-sm"
              style={{ maxHeight: "70vh" }}
            >
              <div className="pointer-events-none absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-gray-100/70 to-transparent z-10" />
              <Table className="min-w-full border-collapse" id="tradeTable">
                <TableCaption className="text-xs text-gray-500">
                  Executed orders
                </TableCaption>
                <TableHeader className="sticky top-0 z-20 bg-gray-50/95 backdrop-blur supports-[backdrop-filter]:bg-gray-50/70 text-gray-700 text-sm font-medium shadow-sm">
                  <TableRow className="hover:bg-transparent border-b border-gray-200">
                    <TableHead
                      onClick={() => requestSort("sequence")}
                      className="px-3 py-2 cursor-pointer w-[180px]"
                    >
                      ORDER ID <i className={getSortIcon("sequence")} />
                    </TableHead>
                    <TableHead
                      onClick={() => requestSort("userName")}
                      className="px-3 py-2 cursor-pointer"
                    >
                      U.NAME <i className={getSortIcon("userName")} />
                    </TableHead>
                    <TableHead
                      onClick={() => requestSort("parentUserName")}
                      className="px-3 py-2 cursor-pointer"
                    >
                      P.USER <i className={getSortIcon("parentUserName")} />
                    </TableHead>
                    <TableHead
                      onClick={() => requestSort("exchangeName")}
                      className="px-3 py-2 cursor-pointer"
                    >
                      EXCH <i className={getSortIcon("exchangeName")} />
                    </TableHead>
                    <TableHead
                      onClick={() => requestSort("symbolTitle")}
                      className="px-3 py-2 cursor-pointer"
                    >
                      SYMBOL <i className={getSortIcon("symbolTitle")} />
                    </TableHead>
                    <TableHead
                      onClick={() => requestSort("createdAt")}
                      className="px-3 py-2 cursor-pointer"
                    >
                      ORDER D/T <i className={getSortIcon("createdAt")} />
                    </TableHead>
                    <TableHead
                      onClick={() => requestSort("tradeType")}
                      className="px-3 py-2 cursor-pointer"
                    >
                      B/S <i className={getSortIcon("tradeType")} />
                    </TableHead>
                    <TableHead
                      onClick={() => requestSort("totalQuantity")}
                      className="px-3 py-2 cursor-pointer"
                    >
                      QTY <i className={getSortIcon("totalQuantity")} />
                    </TableHead>
                    <TableHead
                      onClick={() => requestSort("quantity")}
                      className="px-3 py-2 cursor-pointer"
                    >
                      LOT <i className={getSortIcon("quantity")} />
                    </TableHead>
                    <TableHead
                      onClick={() => requestSort("productTypeValue")}
                      className="px-3 py-2 cursor-pointer"
                    >
                      TYPE <i className={getSortIcon("productTypeValue")} />
                    </TableHead>
                    <TableHead
                      onClick={() => requestSort("profitLoss")}
                      className="px-3 py-2 cursor-pointer"
                    >
                      P/L <i className={getSortIcon("profitLoss")} />
                    </TableHead>
                    <TableHead
                      onClick={() => requestSort("price")}
                      className="px-3 py-2 cursor-pointer"
                    >
                      TRADE PRICE <i className={getSortIcon("price")} />
                    </TableHead>
                    <TableHead
                      onClick={() => requestSort("brokerageAmount")}
                      className="px-3 py-2 cursor-pointer"
                    >
                      BRK <i className={getSortIcon("brokerageAmount")} />
                    </TableHead>
                    <TableHead
                      onClick={() => requestSort("executionDateTime")}
                      className="px-3 py-2 cursor-pointer"
                    >
                      EXECUTION D/T{" "}
                      <i className={getSortIcon("executionDateTime")} />
                    </TableHead>
                    <TableHead
                      onClick={() => requestSort("referencePrice")}
                      className="px-3 py-2 cursor-pointer"
                    >
                      R. PRICE <i className={getSortIcon("referencePrice")} />
                    </TableHead>
                    <TableHead
                      onClick={() => requestSort("ipAddress")}
                      className="px-3 py-2 cursor-pointer"
                    >
                      IP ADDRESS <i className={getSortIcon("ipAddress")} />
                    </TableHead>
                    <TableHead
                      onClick={() => requestSort("deviceId")}
                      className="px-3 py-2 cursor-pointer"
                    >
                      DEVICE ID <i className={getSortIcon("deviceId")} />
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody className="text-sm">
                  {isLoading && !tableData.length ? (
                    <TableRow>
                      <TableCell colSpan={17} className="py-6 text-center">
                        Loading…
                      </TableCell>
                    </TableRow>
                  ) : !tableData.length ? (
                    <TableRow>
                      <TableCell colSpan={17} className="py-6 text-center">
                        No trades found. Adjust filters and click <b>View</b>.
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedTableData.map((item) => (
                      <TableRow
                        key={item.tradeId}
                        className="hover:bg-gray-50 even:bg-gray-50/40 transition-colors"
                      >
                        <TableCell className="px-3 py-2">{item.sequence}</TableCell>
                        <TableCell className="px-3 py-2">{item.userName}</TableCell>
                        <TableCell className="px-3 py-2">
                          {item.parentUserName}
                        </TableCell>
                        <TableCell className="px-3 py-2">
                          {item.exchangeName}
                        </TableCell>
                        <TableCell className="px-3 py-2">{item.symbolTitle}</TableCell>
                        <TableCell className="px-3 py-2">
                          {formatDateTime(item.createdAt)}
                        </TableCell>
                        <TableCell className="px-3 py-2">{item.tradeType}</TableCell>
                        <TableCell className="px-3 py-2">
                          {Number(item.totalQuantity).toFixed(2)}
                        </TableCell>
                        <TableCell className="px-3 py-2">
                          {Number(item.quantity).toFixed(2)}
                        </TableCell>
                        <TableCell className="px-3 py-2">
                          {item.productTypeValue}
                        </TableCell>
                        <TableCell className="px-3 py-2">
                          {Number(item.profitLoss).toFixed(2)}
                        </TableCell>
                        <TableCell className="px-3 py-2">
                          {Number(item.price).toFixed(2)}
                        </TableCell>
                        <TableCell className="px-3 py-2">
                          {Number(item.brokerageAmount).toFixed(2)}
                        </TableCell>
                        <TableCell className="px-3 py-2">
                          {formatDateTime(item.executionDateTime)}
                        </TableCell>
                        <TableCell className="px-3 py-2">
                          {Number(item.referencePrice).toFixed(2)}
                        </TableCell>
                        <TableCell className="px-3 py-2">{item.ipAddress}</TableCell>
                        <TableCell className="px-3 py-2">{item.deviceId}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination (simple) */}
            <div className="flex items-center justify-end gap-2 pt-3">
              <Button
                variant="outline"
                disabled={currentPage === 1 || isLoading}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <div className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </div>
              <Button
                variant="outline"
                disabled={currentPage === totalPages || isLoading}
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
              >
                Next
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Fragment>
  );
};

export default ChildUserTrades;
