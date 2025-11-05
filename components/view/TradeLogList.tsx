"use client";

import React, { Fragment, useEffect, useMemo, useRef, useState } from "react";
import apiClient from "@/lib/axiosInstance";

import Select from "react-select";
import { motion } from "framer-motion";
import {
  ADMIN_API_ENDPOINT,
  EXCHANGE_LIST,
  SUCCESS,
  SYMBOL_LIST,
  TRADE_LOG_LIST,
  USER_SEARCH_LIST,
} from "@/constant/index";
import { decryptData, encryptData } from "@/hooks/crypto";
import { formatDateTime } from "@/hooks/dateUtils";
import { toastError } from "@/hooks/toastMsg";
import { formatValue } from "@/hooks/range";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronDown, Loader2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandEmpty,
  CommandList,
  CommandItem,
} from "@/components/ui/command";

type Option = { label: string; value: string };
type SortDirection = "ascending" | "descending";
type SortKey = keyof TradeLogItem | "script" | null;

interface TradeLogItem {
  userName: string;
  exchangeName: string;
  symbolTitle: string;
  oldOrderType: string;
  orderType: string;
  oldPrice: number;
  price: number;
  updatedAt: string | number | Date;
  createdAt: string | number | Date;
  userUpdatedName: string;
}

interface FormState {
  user: Option | null;
  symbol: Option | null;
  exchange: Option | null;
  startDate: string;
  endDate: string;
}

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

function AsyncCombobox({
  value,
  onChange,
  onSearch,
  options,
  placeholder = "Search...",
  isLoading,
  emptyText = "No results",
  triggerLabel = "Select...",
}: {
  value: Option | null;
  onChange: (opt: Option | null) => void;
  onSearch?: (q: string) => void;
  options: Option[];
  placeholder?: string;
  isLoading?: boolean;
  emptyText?: string;
  triggerLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const debouncedSearch = useDebouncedCallback(
    (q: string) => onSearch?.(q),
    300
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          <span className="truncate">{value?.label ?? triggerLabel}</span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0">
        <Command>
          <CommandInput
            placeholder={placeholder}
            onValueChange={(q) => debouncedSearch(q)}
          />
          <CommandList>
            {isLoading && (
              <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading...
              </div>
            )}
            {!isLoading && options.length === 0 && (
              <CommandEmpty>{emptyText}</CommandEmpty>
            )}
            {!isLoading &&
              options.map((opt) => (
                <CommandItem
                  key={opt.value}
                  value={opt.label}
                  onSelect={() => {
                    onChange(opt);
                    setOpen(false);
                  }}
                >
                  {opt.label}
                </CommandItem>
              ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

const ITEMS_PER_PAGE = 1000;

const TradeLogList: React.FC = () => {
  // ---- Headers / auth pulled from localStorage on client ----
  const deviceType =
    (typeof window !== "undefined" && localStorage.getItem("deviceType")) || "";
  const jwt_token =
    (typeof window !== "undefined" && localStorage.getItem("token")) || "";

  // ---- Data state ----
  const [tableData, setTableData] = useState<TradeLogItem[]>([]);
  const [userData, setUserData] = useState<Option[]>([]);
  const [exchangeOptions, setExchangeOptions] = useState<Option[]>([]);
  const [symbolOptions, setSymbolOptions] = useState<Option[]>([]);
  // normalize any value to a trimmed string
  const S = (v: unknown) => String(v ?? "").trim();

  // ---- Filter / sort / paging ----
  const [formData, setFormData] = useState<FormState>({
    user: null,
    symbol: null,
    exchange: null,
    startDate: "",
    endDate: "",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [sortConfig, setSortConfig] = useState<{
    key: SortKey;
    direction: SortDirection;
  }>({
    key: null,
    direction: "ascending",
  });

  // ---- UX flags ----
  const [loading, setLoading] = useState(false);
  const [loadingFilters, setLoadingFilters] = useState(false);

  // ---------- Sorting ----------
  const requestSort = (key: SortKey) => {
    let direction: SortDirection = "ascending";
    if (sortConfig.key === key && sortConfig.direction === "ascending")
      direction = "descending";
    setSortConfig({ key, direction });
  };

  const sortedTableData = useMemo(() => {
    const items = [...tableData];
    if (!sortConfig.key) return items;

    return items.sort((a, b) => {
      const aValue = (a as any)[sortConfig.key as string];
      const bValue = (b as any)[sortConfig.key as string];

      // Handle null/undefined first
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return 1;
      if (bValue == null) return -1;

      // Dates
      if (sortConfig.key === "updatedAt" || sortConfig.key === "createdAt") {
        const aTime = new Date(aValue).getTime();
        const bTime = new Date(bValue).getTime();
        return sortConfig.direction === "ascending"
          ? aTime - bTime
          : bTime - aTime;
      }

      // Numbers
      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortConfig.direction === "ascending"
          ? aValue - bValue
          : bValue - aValue;
      }

      // Strings
      const aStr = String(aValue);
      const bStr = String(bValue);
      return sortConfig.direction === "ascending"
        ? aStr.localeCompare(bStr)
        : bStr.localeCompare(aStr);
    });
  }, [tableData, sortConfig]);

  const getSortIcon = (key: SortKey) => {
    if (sortConfig.key !== key) return "fa-solid fa-sort text-gray-400";
    return sortConfig.direction === "ascending"
      ? "fa-solid fa-sort-up text-green-500"
      : "fa-solid fa-sort-down text-red-500";
  };

  // ---------- Fetch helpers ----------
  const authHeaders = {
    Authorization: jwt_token,
    "Content-Type": "application/json",
    deviceType,
  };

  const fetchUsers = async () => {
    try {
      const body = JSON.stringify({ data: encryptData({ search: "" }) });
      const res = await apiClient.post(USER_SEARCH_LIST, body);
      if (res.data.statusCode === SUCCESS) {
        const list = decryptData(res.data.data) as Array<{
          id: string;
          name: string;
        }>;
        setUserData(
          list.map((u) => ({
            label: S(u.name || u.id),
            value: S(u.id),
          }))
        );
      }
    } catch {
      // optional: toastError("Failed to load users");
    }
  };

  const fetchExchanges = async () => {
    try {
      const body = JSON.stringify({ data: encryptData({ search: "" }) });
      const res = await apiClient.post(EXCHANGE_LIST, body);
      if (res.data.statusCode === SUCCESS) {
        const list = decryptData(res.data.data) as Array<{
          _id: string;
          name: string;
        }>;
        setExchangeOptions(list.map((e) => ({ label: e.name, value: e._id })));
      }
    } catch {}
  };

  const fetchSymbols = async (exchangeId?: string) => {
    try {
      const body = JSON.stringify({
        data: encryptData({ search: "", exchangeId: exchangeId || "" }),
      });
      const res = await apiClient.post(SYMBOL_LIST, body);
      if (res.data.statusCode === SUCCESS) {
        const list = decryptData(res.data.data) as Array<{
          _id: string;
          title: string;
        }>;
        setSymbolOptions(list.map((s) => ({ label: s.title, value: s._id })));
      }
    } catch {}
  };

  const fetchTradeLogs = async (resetFilters = false) => {
    try {
      setLoading(true);

      const payload = {
        search: "",
        userId: resetFilters ? "" : formData.user?.value || "",
        symbolId: resetFilters ? "" : formData.symbol?.value || "",
        exchangeId: resetFilters ? "" : formData.exchange?.value || "",
        startDate: resetFilters ? "" : formData.startDate,
        endDate: resetFilters ? "" : formData.endDate,
        page: currentPage,
        limit: ITEMS_PER_PAGE,
      };

      const req = JSON.stringify({ data: encryptData(payload) });
      const res = await apiClient.post(TRADE_LOG_LIST, req);

      if (res.data.statusCode === SUCCESS) {
        const rdata = decryptData(res.data.data) as TradeLogItem[];
        setTableData(rdata);
        setTotalPages(res.data.meta?.totalPage ?? 1);
        setTotalCount(res.data.meta?.totalCount ?? rdata.length);
      } else {
        toastError(res.data.message || "Failed to fetch trade logs");
        setTableData([]);
        setTotalPages(1);
        setTotalCount(0);
      }
    } catch (err: any) {
      toastError(err?.response?.data?.message || "Request failed");
      setTableData([]);
      setTotalPages(1);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  // ---------- Actions ----------
  const handleReset = async () => {
    setFormData({
      user: null,
      symbol: null,
      exchange: null,
      startDate: "",
      endDate: "",
    });
    await fetchTradeLogs(true);
    setCurrentPage(1);
  };

  const handleFilter = async () => {
    setCurrentPage(1);
    await fetchTradeLogs(false);
  };

  // Exchange change: refresh symbols list
  useEffect(() => {
    const id = formData.exchange?.value;
    fetchSymbols(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.exchange?.value]);

  // Initial filters data load
  useEffect(() => {
    (async () => {
      setLoadingFilters(true);
      await Promise.all([fetchUsers(), fetchExchanges(), fetchSymbols()]);
      setLoadingFilters(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch logs on page change
  useEffect(() => {
    fetchTradeLogs(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);
  // add this alongside fetchUsers:
  const searchUsers = async (q: string) => {
    try {
      const body = JSON.stringify({ data: encryptData({ search: q }) });
      const res = await apiClient.post(USER_SEARCH_LIST, body);
      if (res.data.statusCode === SUCCESS) {
        const list = decryptData(res.data.data) as Array<{
          id: string;
          name: string;
        }>;
        setUserData(list.map((u) => ({ label: u.name || u.id, value: u.id })));
      }
    } catch {}
  };

  // ---------- UI ----------
  return (
    <div className="h-full bg-[#181a20]">
      <motion.div
        className="!p-2"
        style={{ backgroundColor: "#181a20" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        <motion.div
          className="max-w-[1500px] mx-auto space-y-6"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.7 }}
        >
          {/* Filters */}

          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-2">
              {/* From */}
              <div className="space-y-1.5">
                <Label style={{ color: "#fff" }}>From Date</Label>
                <Input
                  name="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, startDate: e.target.value }))
                  }
                  className="bg-[#2b3139] border-[#2b3139] text-white"
                />
              </div>

              {/* To */}
              <div className="space-y-1.5">
                <Label style={{ color: "#fff" }}>To Date</Label>
                <Input
                  name="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, endDate: e.target.value }))
                  }
                  className="bg-[#2b3139] border-[#2b3139] text-white"
                />
              </div>

              {/* User (native select for performance on huge lists; swap to AsyncCombobox if needed) */}
              <div className="space-y-1.5">
                <Label style={{ color: "#fff" }}>User</Label>

                <select
                  value={S(formData.user?.value)} // must match an <option value> exactly
                  onChange={(e) => {
                    const val = S(e.target.value);
                    const selected =
                      userData.find((opt) => S(opt.value) === val) || null;
                    setFormData((p) => ({ ...p, user: selected }));
                  }}
                  className="bg-[#2b3139] border-[#2b3139] text-white w-full py-2 px-3 rounded-md [color-scheme:dark]"
                  disabled={loadingFilters}
                >
                  <option value="" className="bg-[#1e2329] text-white">
                    Search user...
                  </option>

                  {userData.map((opt) => (
                    <option
                      key={S(opt.value)}
                      value={S(opt.value)}
                      className="bg-[#1e2329] text-white"
                    >
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Exchange */}
              <div className="space-y-1.5">
                <Label className="text-[#fff]">Exchange</Label>
                <select
                  value={formData.exchange?.value || ""}
                  onChange={(e) => {
                    const selected =
                      exchangeOptions.find(
                        (opt) => opt.value === e.target.value
                      ) || null;
                    setFormData((p) => ({
                      ...p,
                      exchange: selected,
                      symbol: null,
                    })); // reset symbol on exchange change
                  }}
                  className="bg-[#2b3139] border-[#2b3139] text-white w-full py-2 px-3 rounded-md"
                  disabled={loadingFilters}
                >
                  <option value="">Select exchange...</option>
                  {exchangeOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Symbol (react-select) */}
              <div className="space-y-1.5">
                <Label style={{ color: "#fff" }}>Symbol</Label>
                <Select
                  value={formData.symbol}
                  onChange={(opt) =>
                    setFormData((p) => ({ ...p, symbol: opt as Option }))
                  }
                  options={symbolOptions}
                  isDisabled={loadingFilters}
                  placeholder="Select symbol"
                  styles={{
                    control: (base, state) => ({
                      ...base,
                      backgroundColor: "#2b3139",
                      borderColor: state.isFocused ? "#fcd535" : "#2b3139",
                      color: "#fff",
                      boxShadow: state.isFocused ? "0 0 0 1px #fcd535" : "none",
                      "&:hover": { borderColor: "#fcd535" },
                    }),
                    menu: (base) => ({
                      ...base,
                      backgroundColor: "#1e2329",
                      color: "#fff",
                      zIndex: 1000,
                    }),
                    option: (base, { isFocused, isSelected }) => ({
                      ...base,
                      backgroundColor: isSelected
                        ? "#fcd535"
                        : isFocused
                        ? "#3a4149"
                        : "#1e2329",
                      color: isSelected ? "#181a20" : "#fff",
                      cursor: "pointer",
                    }),
                    singleValue: (base) => ({
                      ...base,
                      color: "#fff",
                    }),
                    input: (base) => ({
                      ...base,
                      color: "#fff",
                    }),
                    placeholder: (base) => ({
                      ...base,
                      color: "#aaa",
                    }),
                    dropdownIndicator: (base) => ({
                      ...base,
                      color: "#fcd535",
                      "&:hover": { color: "#fff" },
                    }),
                  }}
                />
              </div>
              <Button
                className="w-full sm:w-auto shadow mt-5"
                style={{ backgroundColor: "#fcd535", color: "#181a20" }}
                onClick={handleFilter}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                View
              </Button>
              <Button
                variant="destructive"
                className="shadow w-full sm:w-auto mt-5"
                onClick={handleReset}
                disabled={loading}
              >
                Clear
              </Button>
            </div>
          </CardContent>

          {/* Table */}
          <motion.div
            className="rounded-xl overflow-hidden shadow-lg border"
            style={{ backgroundColor: "#1e2329", borderColor: "#2b3139" }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <ScrollArea className="">
              <Table>
                <TableHeader className="sticky top-0 z-10 shadow-sm text-white hover-none">
                  <TableRow className="!text-white">
                    {[
                      { k: "userName", label: "U.NAME" },
                      { k: "exchangeName", label: "EXCH" },
                      { k: "symbolTitle", label: "SYMBOL" },
                      { k: "oldOrderType", label: "OLD UPDATED TYPE" },
                      { k: "orderType", label: "UPDATED TYPE" },
                      { k: "oldPrice", label: "OLD PRICE" },
                      { k: "price", label: "PRICE" },
                      { k: "updatedAt", label: "UPDATED TIME" },
                      { k: "createdAt", label: "ORDER D/T" },
                      { k: "userUpdatedName", label: "MODIFY BY" },
                    ].map(({ k, label }) => (
                      <TableHead
                        key={k}
                        className="cursor-pointer select-none !text-white"
                        onClick={() => requestSort(k as SortKey)}
                      >
                        {label} <i className={getSortIcon(k as SortKey)}></i>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {/* Empty State Row */}
                  {!loading && sortedTableData.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={10}
                        className="text-center py-10 text-white"
                      >
                        No data available
                      </TableCell>
                    </TableRow>
                  ) : null}

                  {/* Loading shimmer row (optional) */}
                  {loading && (
                    <TableRow>
                      <TableCell
                        colSpan={10}
                        className="text-center py-10 text-muted-foreground"
                      >
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading...
                        </div>
                      </TableCell>
                    </TableRow>
                  )}

                  {/* Data rows */}
                  {!loading &&
                    sortedTableData.map((item, index) => (
                      <TableRow key={index} className="">
                        <TableCell className="text-white">
                          {item.userName}
                        </TableCell>
                        <TableCell className="text-white">
                          {item.exchangeName}
                        </TableCell>
                        <TableCell className="text-white">
                          {item.symbolTitle}
                        </TableCell>

                        <TableCell>
                          <Badge
                            variant="outline"
                            className="text-white border-gray-600"
                          >
                            {item.oldOrderType}
                          </Badge>
                        </TableCell>

                        <TableCell>
                          <Badge className="bg-green-600 text-white">
                            {item.orderType}
                          </Badge>
                        </TableCell>

                        <TableCell className="text-white">
                          {formatValue(item.oldPrice, item.exchangeName)}
                        </TableCell>

                        <TableCell className="text-white">
                          {formatValue(item.price, item.exchangeName)}
                        </TableCell>

                        <TableCell>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="underline decoration-dotted cursor-help text-white">
                                  {formatDateTime(item.updatedAt)}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent className="bg-[#2b3139] text-white border-gray-600">
                                {formatDateTime(item.updatedAt)}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>

                        <TableCell className="text-white">
                          {formatDateTime(item.createdAt)}
                        </TableCell>
                        <TableCell className="text-white">
                          {item.userUpdatedName}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </motion.div>

          {/* Pagination */}
          <motion.div
            className="flex justify-end items-center gap-2 pt-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <Button
              variant="outline"
              disabled={currentPage === 1 || loading}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="bg-[#2b3139] border-[#2b3139] text-white hover:bg-[#3a4149]"
            >
              Prev
            </Button>

            {[...Array(totalPages).keys()].map((n) => (
              <Button
                key={n}
                size="sm"
                variant={currentPage === n + 1 ? "default" : "outline"}
                className={
                  currentPage === n + 1
                    ? "shadow"
                    : "bg-[#2b3139] border-[#2b3139] text-white hover:bg-[#3a4149]"
                }
                style={
                  currentPage === n + 1
                    ? { backgroundColor: "#fcd535", color: "#181a20" }
                    : {}
                }
                onClick={() => setCurrentPage(n + 1)}
                disabled={loading}
              >
                {n + 1}
              </Button>
            ))}

            <Button
              variant="outline"
              disabled={currentPage === totalPages || loading}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="bg-[#2b3139] border-[#2b3139] text-white hover:bg-[#3a4149]"
            >
              Next
            </Button>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default TradeLogList;
