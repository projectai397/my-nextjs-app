"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import apiClient from "@/lib/axiosInstance";

import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";

// === shadcn/ui ===
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChevronDown, Loader2, Download } from "lucide-react";
import { Separator } from "@/components/ui/separator";
// === your imports (unchanged) ===
import {
  ADMIN_API_ENDPOINT,
  BUY,
  DELETE_TRADE,
  EXCHANGE_LIST,
  EXECUTED,
  SUCCESS,
  SUPER_ADMIN,
  SYMBOL_LIST,
  TRADE_LIST,
  TRADE_LIST_EXPORT,
  USER_SEARCH_LIST,
} from "@/constant/index";
import { decryptData, decryptData1, encryptData } from "@/hooks/crypto";
import {
  formatDateForExportExcelName,
  formatDateTime,
} from "@/hooks/dateUtils";
import { toastError, toastSuccess } from "@/hooks/toastMsg";
import { formatValue } from "@/hooks/range";

// ====================== Types ======================
type Option = { label: string; value: string };

type FormData = {
  user: Option | null;
  symbol: Option | null;
  exchange: Option | null;
  startDate: string;
  endDate: string;
};

type TradeItem = {
  tradeId: string;
  sequence: string | number;
  userName: string;
  parentUserName: string;
  exchangeName: string;
  symbolTitle: string;
  createdAt: string;
  tradeType: string | number;
  comment?: string;
  totalQuantity: number;
  quantity: number;
  productTypeValue: string;
  profitLoss: number;
  price: number | null;
  brokerageAmount: number;
  executionDateTime: string;
  referencePrice: number | null;
  ipAddress: string;
  city?: string;
  deviceId: string;
  m2mTotal: number;
  checkStatus?: boolean;
};

type SortConfig = {
  key: keyof TradeItem | "";
  direction: "ascending" | "descending";
};

// ====================== Component ======================
export default function TradeList({
  userId,
  userName,
}: {
  userId?: string;
  userName?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const { data: session } = useSession();
  const token = (session as any)?.accessToken as string | undefined;
  const deviceTypeFromSession =
    ((session?.user as any)?.deviceType as string | undefined) ?? "web";
  const authenticatedRole = (session?.user as any)?.roleName as
    | string
    | undefined;

  // ---------- State ----------
  const [tableData, setTableData] = useState<TradeItem[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);
  const itemsPerPage = 200;

  const [userData, setUserData] = useState<Option[]>([]);
  const [exchangeData, setExchangeData] = useState<Option[]>([]);
  const [symbolData, setSymbolData] = useState<Option[]>([]);

  const todayISO = new Date().toISOString().split("T")[0];

  const [formData, setFormData] = useState<FormData>({
    user: userId ? { value: userId, label: userName ?? userId } : null,
    symbol: null,
    exchange: null,
    startDate: userId ? "" : todayISO,
    endDate: userId ? "" : todayISO,
  });

  const [filterActive, setFilterActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0); // highlighted index for keyboard nav

  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: "",
    direction: "ascending",
  });

  // ---------- Sorting ----------
  const requestSort = (key: SortConfig["key"]) => {
    const direction =
      sortConfig.key === key && sortConfig.direction === "ascending"
        ? "descending"
        : "ascending";
    setSortConfig({ key, direction });
  };

  const sortedTableData = useMemo(() => {
    const items = [...tableData];
    const { key, direction } = sortConfig;
    if (!key) return items;

    items.sort((a, b) => {
      const aValue = a[key];
      const bValue = b[key];

      if (aValue == null) return 1;
      if (bValue == null) return -1;

      if (typeof aValue === "string" && typeof bValue === "string") {
        return direction === "ascending"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      const av = Number(aValue as any);
      const bv = Number(bValue as any);
      if (av < bv) return direction === "ascending" ? -1 : 1;
      if (av > bv) return direction === "ascending" ? 1 : -1;
      return 0;
    });

    return items;
  }, [tableData, sortConfig]);

  const hasData = sortedTableData.length > 0;
  const columnSpan = authenticatedRole === "superadmin" ? 19 : 18; // checkbox column when superadmin

  // ---------- API: List ----------
  const fetchDataFromAPI = async (reset: boolean, pageOverride?: number) => {
    try {
      setListLoading(true);
      const pageToUse = pageOverride ?? currentPage;

      const payloadObj = reset
        ? {
            search: "",
            userId: "",
            symbolId: "",
            exchangeId: "",
            status: EXECUTED,
            startDate: "",
            endDate: "",
            page: pageToUse,
            limit: itemsPerPage,
          }
        : {
            search: "",
            userId: formData.user?.value ?? "",
            symbolId: formData.symbol?.value ?? "",
            exchangeId: formData.exchange?.value ?? "",
            status: EXECUTED,
            startDate: formData.startDate || "",
            endDate: formData.endDate || "",
            page: pageToUse,
            limit: itemsPerPage,
          };

      const data = JSON.stringify({ data: encryptData(payloadObj) });

      const response = await apiClient.post(TRADE_LIST, data);

      if (response.data.statusCode === SUCCESS) {
        const rdata = (decryptData(response.data.data) as TradeItem[]) || [];
        setTableData(rdata);
        setTotalPages(response.data.meta?.totalPage ?? 1);
        setTotalCount(response.data.meta?.totalCount ?? rdata.length);
      } else {
        toastError(response.data.message);
        setTableData([]);
        setTotalPages(1);
        setTotalCount(0);
      }
    } catch (error: any) {
      toastError(error?.response?.data?.message || "Request failed");
      console.error("Trade list error:", error);
      setTableData([]);
      setTotalPages(1);
      setTotalCount(0);
    } finally {
      setListLoading(false);
    }
  };

  // ---------- API: User search (debounced) ----------
  const debouncedUserSearch = useRef(
    (() => {
      let t: any;
      return (q: string) => {
        clearTimeout(t);
        t = setTimeout(async () => {
          if (!q || q.length <= 2) {
            setUserData([]);
            return;
          }
          try {
            const data = JSON.stringify({
              data: encryptData({
                filterType: 0,
                roleId: "",
                userId: "",
                status: 0,
                search: q,
                page: 1,
                limit: 50,
              }),
            });

            const res = await apiClient.post(USER_SEARCH_LIST, data);

            if (res.data.statusCode === SUCCESS) {
              const rdata =
                (decryptData(res.data.data) as Array<{
                  userName: string;
                  userId: string;
                }>) || [];
              setUserData(
                rdata.map((u) => ({ label: u.userName, value: u.userId }))
              );
            } else {
              toastError(res.data.message);
            }
          } catch (err: any) {
            toastError(err?.response?.data?.message || "User search failed");
            console.error("User search error:", err);
          }
        }, 300);
      };
    })()
  ).current;

  // ---------- API: Exchange list ----------
  const handleGetExchange = async () => {
    try {
      const data = JSON.stringify({
        data: encryptData({
          page: 1,
          limit: 100,
          search: "",
          sortKey: "createdAt",
          sortBy: -1,
        }),
      });

      const response = await apiClient.post(EXCHANGE_LIST, data);

      if (response.data.statusCode === SUCCESS) {
        const rdata =
          (decryptData(response.data.data) as Array<{
            name: string;
            exchangeId: string;
          }>) || [];
        setExchangeData(
          rdata.map((item) => ({ label: item.name, value: item.exchangeId }))
        );
      }
    } catch (error) {
      console.error("Error fetching exchanges:", error);
    }
  };

  // ---------- API: Symbols for exchange ----------
  const fetchSymbolsForExchange = async (exchangeId: string) => {
    try {
      const data = JSON.stringify({
        data: encryptData({
          page: 1,
          limit: 1000,
          search: "",
          exchangeId,
          sortKey: "createdAt",
          sortBy: -1,
        }),
      });

      const res = await apiClient.post(SYMBOL_LIST, data);

      if (res.data.statusCode === SUCCESS) {
        const rdata =
          (decryptData(res.data.data) as Array<{
            symbolName: string;
            symbolId: string;
          }>) || [];
        setSymbolData(
          rdata.map((item) => ({
            label: item.symbolName,
            value: item.symbolId,
          }))
        );
      }
    } catch (error) {
      console.error("Error fetching symbols:", error);
    }
  };

  // ---------- API: Delete selected ----------
  const handelToSubmitForm = async () => {
    try {
      const checkedIds = tableData
        .filter((item) => item.checkStatus)
        .map((item) => item.tradeId);

      if (checkedIds.length === 0) {
        toastError("Please select trade");
        return;
      }

      const data = JSON.stringify({
        data: encryptData({ userId, tradeId: checkedIds }),
      });

      const response = await apiClient.post(DELETE_TRADE, data);

      if (response.data.statusCode === SUCCESS) {
        decryptData(response.data.data);
        fetchDataFromAPI(false, currentPage);
        toastSuccess(response?.data?.meta?.message || "Deleted");
      } else {
        toastError(response.data.message);
      }
    } catch (error: any) {
      toastError(error?.response?.data?.message || "Delete failed");
      console.error("Delete trade error:", error);
    }
  };

  // ---------- Handlers ----------
  const handleToChangeTradeCheckBox = (_e: any, tradeId: string) => {
    setTableData((prev) =>
      prev.map((item) =>
        item.tradeId === tradeId
          ? { ...item, checkStatus: !item.checkStatus }
          : item
      )
    );
  };

  const handleChangeValueOption = async (
    selected: Option | null,
    name: "user" | "exchange" | "symbol"
  ) => {
    if (name === "exchange") {
      setFormData((prev) => ({ ...prev, exchange: selected, symbol: null }));
      if (selected) await fetchSymbolsForExchange(selected.value);
      return;
    }
    setFormData((prev) => ({ ...prev, [name]: selected }));
  };

  const exportToExcel = async () => {
    try {
      setLoading(true);

      const data = JSON.stringify({
        data: encryptData({
          search: "",
          userId: formData.user?.value ?? "",
          symbolId: formData.symbol?.value ?? "",
          exchangeId: formData.exchange?.value ?? "",
          status: EXECUTED,
          startDate: formData.startDate || "",
          endDate: formData.endDate || "",
        }),
      });

      const response = await apiClient.post(TRADE_LIST_EXPORT, data);

      if (response.data.statusCode === SUCCESS) {
        const rdata = (decryptData1(response.data.data) as TradeItem[]) || [];

        if (!rdata.length) {
          toastError("No data available to export.");
          return;
        }

        const excelData = rdata.map((item) => ({
          "TRADE ID": item.sequence,
          "U.NAME": item.userName,
          "P.USER": item.parentUserName,
          EXCH: item.exchangeName,
          SYMBOL: item.symbolTitle,
          "ORDER D/T": formatDateTime(item.createdAt),
          "B/S": item.comment ? `${item.tradeType} - ${item.comment}` : "",
          QTY: Number(item.totalQuantity.toFixed(2)),
          LOT: Number(item.quantity.toFixed(2)),
          TYPE: item.productTypeValue,
          "P/L":
            item.profitLoss != null ? Number(item.profitLoss.toFixed(2)) : 0,
          "TRADE PRICE":
            item.price != null ? formatValue(item.price, item.exchangeName) : 0,
          BRK:
            item.brokerageAmount != null
              ? Number(item.brokerageAmount.toFixed(2))
              : 0,
          "EXECUTION D/T": formatDateTime(item.executionDateTime),
          "R. PRICE":
            item.referencePrice != null
              ? formatValue(item.referencePrice, item.exchangeName)
              : 0,
          "IP ADDRESS": item.ipAddress,
          "DEVICE ID": item.deviceId,
        }));

        const worksheet = XLSX.utils.json_to_sheet(excelData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "TradeList");

        const excelBuffer = XLSX.write(workbook, {
          bookType: "xlsx",
          type: "array",
        });
        const blob = new Blob([excelBuffer], {
          type: "application/octet-stream",
        });
        const uName = userName || "USER";
        const now = new Date();
        const fileName = `${uName}TRADE${formatDateForExportExcelName(
          now
        )}.xlsx`;
        saveAs(blob, fileName);
      } else {
        toastError(response.data.message);
      }
    } catch (error: any) {
      toastError(error?.response?.data?.message || "Export failed");
      console.error("Export error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    name: "startDate" | "endDate"
  ) => {
    const value = e.target.value;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleReset = () => {
    setFormData({
      user: null,
      symbol: null,
      exchange: null,
      startDate: "",
      endDate: "",
    });
    setUserSearch(""); // <— add this
    setUserData([]);
    setSymbolData([]);
    setCurrentPage(1);
    fetchDataFromAPI(true, 1);
    setFilterActive(false);
  };

  const handleFilter = () => {
    // If formData.user is not chosen yet, try to resolve from the current results:
    if (!formData.user && userSearch.trim().length >= 3 && userData.length) {
      const q = userSearch.trim().toLowerCase();
      // Prefer exact label match; fall back to first result
      const exact = userData.find(
        (o) => o.label.toLowerCase() === q || o.value.toLowerCase() === q
      );
      const pick = exact ?? userData[0];

      if (pick) {
        // Set the selected user and then run the fetch
        setFormData((prev) => ({ ...prev, user: pick }));
        setTimeout(() => {
          setCurrentPage(1);
          fetchDataFromAPI(false, 1);
          setFilterActive(true);
        }, 0);
        return;
      }
    }

    // Normal path if user already selected or no typed search
    setCurrentPage(1);
    fetchDataFromAPI(false, 1);
    setFilterActive(true);
  };
  useEffect(() => {
    if (formData.user && userSearch !== formData.user.label) {
      setUserSearch(formData.user.label);
    }
    // If cleared, don't force-clear userSearch—let the user keep typing
  }, [formData.user]); // eslint-disable-line

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
    fetchDataFromAPI(!filterActive, pageNumber);
  };

  // ====================== Effects ======================
  useEffect(() => {
    document.title = "Admin Panel | Trade List";
    return () => {
      document.title = "Admin Panel";
    };
  }, []);

  useEffect(() => {
    handleGetExchange();
    // initial list
    setCurrentPage(1);
    fetchDataFromAPI(false, 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    if (userSearch.trim().length > 0) debouncedUserSearch(userSearch.trim());
    else setUserData([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userSearch]);

  // ====================== UI ======================
  return (
    <div className=" overflow-y-auto h-full bg-[#181a20]">
      <div className="mt-2 p-2">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-8">
          {/* From Date */}
          <div className="space-y-1.5">
            <Label htmlFor="startDate" className="text-[#fcd535]">
              From Date
            </Label>
            <Input
              id="startDate"
              type="date"
              value={formData.startDate}
              onChange={(e) => handleDateChange(e, "startDate")}
              className="bg-[#2a2f36] border-gray-700 text-white"
            />
          </div>

          {/* To Date */}
          <div className="space-y-1.5">
            <Label htmlFor="endDate" className="text-[#fcd535]">
              To Date
            </Label>
            <Input
              id="endDate"
              type="date"
              value={formData.endDate}
              onChange={(e) => handleDateChange(e, "endDate")}
              className="bg-[#2a2f36] border-gray-700 text-white"
            />
          </div>

          {/* User search + select */}
          {!userId && (
            <div className="space-y-1.5 relative">
              <Label className="text-[#fcd535]">User Name</Label>

              {/* Combo input */}
              <input
                role="combobox"
                aria-expanded={open ? "true" : "false"}
                aria-controls="user-combobox-list"
                placeholder="Type to search…"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                onFocus={() => setOpen(true)}
                onKeyDown={(e) => {
                  // optional keyboard support
                  if (!open && (e.key === "ArrowDown" || e.key === "Enter"))
                    setOpen(true);
                  if (open && e.key === "Escape") setOpen(false);
                  if (open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
                    e.preventDefault();
                    setHi((i) =>
                      e.key === "ArrowDown"
                        ? Math.min(i + 1, Math.max(0, userData.length - 1))
                        : Math.max(i - 1, 0)
                    );
                  }
                  if (open && e.key === "Enter" && userData[hi]) {
                    const selected = userData[hi];
                    handleChangeValueOption(selected, "user");
                    setUserSearch(selected.label);
                    setOpen(false);
                  }
                }}
                onBlur={() => {
                  // give time for click selection before closing
                  setTimeout(() => setOpen(false), 120);
                }}
                className="w-full bg-[#2a2f36] text-white border border-[#2a2f36] transition-colors py-2 px-3 rounded-md focus:outline-none focus:ring-2"
              />

              {/* Hidden actual selected value (optional, to reflect current formData.user) */}
              {formData.user?.value && (
                <input
                  type="hidden"
                  name="userId"
                  value={formData.user.value}
                />
              )}

              {/* Dropdown list */}
              {open && (
                <ul
                  id="user-combobox-list"
                  role="listbox"
                  className="absolute z-50 mt-1 w-full max-h-64 overflow-auto rounded-md border border-[#3a3f46] bg-[#1f242b] shadow-xl"
                >
                  {userSearch.trim().length < 3 && (
                    <li className="px-3 py-2 text-sm text-gray-400">
                      Type at least 3 characters…
                    </li>
                  )}

                  {userSearch.trim().length >= 3 && userData.length === 0 && (
                    <li className="px-3 py-2 text-sm text-gray-400">
                      No users found
                    </li>
                  )}

                  {userData.map((opt, idx) => (
                    <li
                      key={opt.value}
                      role="option"
                      aria-selected={idx === hi ? "true" : "false"}
                      onMouseEnter={() => setHi(idx)}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        handleChangeValueOption(opt, "user");
                        setUserSearch(opt.label);
                        setOpen(false);
                      }}
                      className={`px-3 py-2 cursor-pointer ${
                        idx === hi ? "bg-[#2a2f36] text-white" : "text-gray-200"
                      } hover:bg-[#2a2f36]`}
                    >
                      {opt.label}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Exchange */}
          {!userId && (
            <div className="space-y-1.5">
              <Label className="text-[#fcd535]">Exchange</Label>
              <select
                value={formData.exchange?.value ?? ""}
                onChange={(e) => {
                  const selected =
                    exchangeData.find((opt) => opt.value === e.target.value) ||
                    null;
                  handleChangeValueOption(selected, "exchange");
                }}
                className="bg-[#2a2f36] text-white border border-[#2a2f36] transition-colors w-full py-2 px-3 rounded-md focus:outline-none focus:ring-2 "
              >
                <option value="">Select exchange...</option>
                {exchangeData.map((opt) => (
                  <option
                    key={opt.value}
                    value={opt.value}
                    className="bg-[#181a20] text-white"
                  >
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Symbols */}
          {!userId && (
            <div className="space-y-1.5">
              <Label className="text-[#fcd535]">Symbols</Label>
              <select
                value={formData.symbol?.value ?? ""}
                onChange={(e) => {
                  const selected =
                    symbolData.find((opt) => opt.value === e.target.value) ||
                    null;
                  handleChangeValueOption(selected, "symbol");
                }}
                className="bg-[#2a2f36] text-white border border-[#2a2f36] transition-colors w-full py-2 px-3 rounded-md focus:outline-none focus:ring-2 "
              >
                <option value="">Select symbol...</option>
                {symbolData.map((opt) => (
                  <option
                    key={opt.value}
                    value={opt.value}
                    className="bg-[#181a20] text-white"
                  >
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <Button
            onClick={exportToExcel}
            disabled={loading}
            className="gap-2 bg-[#fcd535] text-black hover:bg-[#fcd535] mt-5"
          >
            <Download className="h-3 w-3 mr-1" /> Export
          </Button>

          <Button
            onClick={handleFilter}
            className="gap-2 bg-[#fcd535] text-black hover:bg-[#fcd535] mt-5 "
          >
            View
          </Button>

          <Button
            variant="destructive"
            onClick={handleReset}
            className="gap-2 bg-red-900 hover:bg-red-800 mt-5"
          >
            Clear
          </Button>
        </div>
      </div>
      <Separator style={{ backgroundColor: "#3a3f46" }} />
      <CardContent className="overflow-auto p-2">
        <Table>
          <TableHeader>
            <TableRow className="border-gray-700">
              {authenticatedRole === "superadmin" && (
                <TableHead className="w-[40px] !text-[#fff]"></TableHead>
              )}
              <TableHead
                onClick={() => requestSort("sequence")}
                className="cursor-pointer !text-[#fff]"
              >
                TRADE ID
              </TableHead>
              <TableHead
                onClick={() => requestSort("userName")}
                className="cursor-pointer !text-[#fff]"
              >
                U.NAME
              </TableHead>
              <TableHead
                onClick={() => requestSort("parentUserName")}
                className="cursor-pointer !text-[#fff]"
              >
                P.USER
              </TableHead>
              <TableHead
                onClick={() => requestSort("exchangeName")}
                className="cursor-pointer !text-[#fff]"
              >
                EXCH
              </TableHead>
              <TableHead
                onClick={() => requestSort("symbolTitle")}
                className="cursor-pointer !text-[#fff]"
              >
                SYMBOL
              </TableHead>
              <TableHead
                onClick={() => requestSort("createdAt")}
                className="cursor-pointer !text-[#fff]"
              >
                ORDER D/T
              </TableHead>
              <TableHead
                onClick={() => requestSort("tradeType")}
                className="cursor-pointer !text-[#fff]"
              >
                B/S
              </TableHead>
              <TableHead
                onClick={() => requestSort("totalQuantity")}
                className="cursor-pointer !text-[#fff]"
              >
                QTY
              </TableHead>
              <TableHead
                onClick={() => requestSort("quantity")}
                className="cursor-pointer !text-[#fff]"
              >
                LOT
              </TableHead>
              <TableHead className="!text-[#fff]">TYPE</TableHead>
              <TableHead
                onClick={() => requestSort("profitLoss")}
                className="cursor-pointer !text-[#fff]"
              >
                P/L
              </TableHead>
              <TableHead
                onClick={() => requestSort("price")}
                className="cursor-pointer !text-[#fff]"
              >
                TRADE PRICE
              </TableHead>
              <TableHead
                onClick={() => requestSort("brokerageAmount")}
                className="cursor-pointer !text-[#fff]"
              >
                BRK
              </TableHead>
              <TableHead
                onClick={() => requestSort("executionDateTime")}
                className="cursor-pointer !text-[#fff]"
              >
                EXECUTION D/T
              </TableHead>
              <TableHead
                onClick={() => requestSort("referencePrice")}
                className="cursor-pointer !text-[#fff]"
              >
                R. PRICE
              </TableHead>
              <TableHead
                onClick={() => requestSort("ipAddress")}
                className="cursor-pointer !text-[#fff]"
              >
                IP ADDRESS
              </TableHead>
              <TableHead
                onClick={() => requestSort("city")}
                className="cursor-pointer !text-[#fff]"
              >
                CITY
              </TableHead>
              <TableHead
                onClick={() => requestSort("deviceId")}
                className="cursor-pointer !text-[#fff]"
              >
                DEVICE ID
              </TableHead>
              <TableHead className="!text-[#fff]">M2M</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {hasData ? (
              sortedTableData.map((item, idx) => (
                <TableRow
                  key={idx}
                  className="border-gray-700 hover:bg-[#2a2f36]"
                >
                  {authenticatedRole === "superadmin" && (
                    <TableCell className="align-middle">
                      <Input
                        type="checkbox"
                        checked={!!item.checkStatus}
                        onChange={(e) =>
                          handleToChangeTradeCheckBox(e, item.tradeId)
                        }
                        className="h-4 w-4"
                      />
                    </TableCell>
                  )}

                  <TableCell className="text-white">{item.sequence}</TableCell>
                  <TableCell className="text-white">{item.userName}</TableCell>
                  <TableCell className="text-white">
                    {item.parentUserName}
                  </TableCell>
                  <TableCell className="text-white">
                    {item.exchangeName}
                  </TableCell>
                  <TableCell className="text-white">
                    {item.symbolTitle}
                  </TableCell>

                  <TableCell
                    title={formatDateTime(item.createdAt)}
                    className="text-white"
                  >
                    {formatDateTime(item.createdAt)}
                  </TableCell>

                  <TableCell
                    title={`${item.tradeType === BUY ? "B" : "S"}${
                      item.comment ? " - " + item.comment : ""
                    }`}
                    className="text-white"
                  >
                    {item.tradeType === BUY ? "B" : "S"}
                    {item.comment ? " - " + item.comment : ""}
                  </TableCell>

                  <TableCell className="text-white">
                    {item.totalQuantity.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-white">
                    {item.quantity.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-white">
                    {item.productTypeValue}
                  </TableCell>
                  <TableCell className="text-white">
                    {item.profitLoss.toFixed(2)}
                  </TableCell>

                  <TableCell className="text-white">
                    {formatValue(item.price ?? 0, item.exchangeName)}
                  </TableCell>
                  <TableCell className="text-white">
                    {item.brokerageAmount.toFixed(2)}
                  </TableCell>

                  <TableCell
                    title={formatDateTime(item.executionDateTime)}
                    className="text-white"
                  >
                    {formatDateTime(item.executionDateTime)}
                  </TableCell>

                  <TableCell className="text-white">
                    {formatValue(item.referencePrice ?? 0, item.exchangeName)}
                  </TableCell>
                  <TableCell className="text-white">{item.ipAddress}</TableCell>
                  <TableCell className="text-white">{item.city}</TableCell>

                  <TableCell
                    title={item.deviceId}
                    className="max-w-[220px] truncate text-white"
                  >
                    {item.deviceId}
                  </TableCell>

                  <TableCell>
                    <span
                      className={`font-medium ${
                        item.m2mTotal > 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {item.m2mTotal}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columnSpan} className="text-center py-10">
                  <div className="flex flex-col items-center justify-center gap-2">
                    {listLoading ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin text-[#fcd535]" />
                        <span className="text-sm !text-[#fff]">Loading...</span>
                      </>
                    ) : (
                      <>
                        <span className="text-lg font-medium text-white">
                          No Data Available
                        </span>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>

      {/* Pagination */}
      {hasData && (
        <CardContent className="flex flex-wrap items-center justify-end gap-2 border-t border-gray-700">
          <Button
            variant="outline"
            disabled={currentPage === 1}
            onClick={() => handlePageChange(currentPage - 1)}
            className="bg-gray-800 text-white border-gray-700 hover:bg-gray-700 "
          >
            Previous
          </Button>
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <Button
                key={p}
                variant={currentPage === p ? "default" : "outline"}
                onClick={() => handlePageChange(p)}
                size="sm"
                className={
                  currentPage === p
                    ? "bg-[#fcd535] text-black"
                    : "bg-gray-800 text-white border-gray-700 hover:bg-gray-700"
                }
              >
                {p}
              </Button>
            ))}
          </div>
          <Button
            variant="outline"
            disabled={currentPage === totalPages}
            onClick={() => handlePageChange(currentPage + 1)}
            className="bg-gray-800 text-white border-gray-700 hover:bg-gray-700"
          >
            Next
          </Button>
        </CardContent>
      )}
    </div>
  );
}
