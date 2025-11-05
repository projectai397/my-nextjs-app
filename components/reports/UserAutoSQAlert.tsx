"use client";

import React, { Fragment, useEffect, useMemo, useRef, useState } from "react";
import apiClient from "@/lib/axiosInstance";

import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Download,
  RefreshCcw,
  Search,
  X,
} from "lucide-react";
import * as XLSX from "xlsx";

// ---- shadcn/ui ----
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

// (Optional) If you use reactstrap Container for page gutters
import { Container } from "reactstrap";

// ---- app utils ----
import {
  ADMIN_API_ENDPOINT,
  EXCHANGE_LIST,
  EXECUTED,
  SUCCESS,
  SYMBOL_LIST,
  TRADE_LIST,
  USER_SEARCH_LIST,
} from "@/constant/index";
import { decryptData, encryptData } from "@/hooks/crypto";
import { formatDateTime } from "@/hooks/dateUtils";
import { useSocket } from "@/components/socket/socketContext";
import { toastError } from "@/hooks/toastMsg";

// ---------- Types ----------
export type SortDirection = "ascending" | "descending";
export type SortKey = keyof AutoSQAlertItem | "script" | null;

export interface SortConfig {
  key: SortKey;
  direction: SortDirection;
}
export interface Option {
  label: string;
  value: string;
}

export interface AutoSQAlertItem {
  userId: string;
  userName: string;
  balance: number;
  cutOffBalance: number;
  cutOffBalanceForAlert: number;
  dateTime: string | number | Date;
  exchangeName?: string;
  symbolName?: string;
  symbolTitle?: string;
  masterName?: string;
  autoSQStatus?: boolean;
}

interface ChannelData {
  autoSQAlert?: AutoSQAlertItem;
}
interface SocketCtx {
  channelData: ChannelData | null;
  socket: unknown;
  disconnectSocket: () => void;
}

// ---------- Utils ----------
function useDebouncedCallback<T extends (...args: any[]) => void>(
  cb: T,
  delay = 350
) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  return (...args: Parameters<T>) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => cb(...args), delay);
  };
}

// ---------- Reusable Combobox (shadcn pattern) ----------
function Combobox({
  options,
  placeholder,
  emptyText = "No results",
  value,
  onChange,
  onSearch,
  className,
  disabled,
}: {
  options: Option[];
  placeholder?: string;
  emptyText?: string;
  value: Option | null;
  onChange: (opt: Option | null) => void;
  onSearch?: (query: string) => void;
  className?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
          disabled={disabled}
        >
          {value ? (
            value.label
          ) : (
            <span className="text-muted-foreground">
              {placeholder || "Select"}
            </span>
          )}
          <ArrowUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0"
        align="start"
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={placeholder || "Search..."}
            onValueChange={(q) => onSearch?.(q)}
          />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((opt) => (
                <CommandItem
                  key={opt.value}
                  value={opt.value}
                  onSelect={() => {
                    onChange(opt);
                    setOpen(false);
                  }}
                >
                  {opt.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ---------- Empty & Skeleton Rows ----------
function EmptyRow({ colSpan }: { colSpan: number }) {
  return (
    <TableRow>
      <TableCell
        colSpan={colSpan}
        className="text-center text-muted-foreground py-10"
      >
        No data found
      </TableCell>
    </TableRow>
  );
}

function LoadingRows({ rows = 8, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rIdx) => (
        <TableRow key={`skeleton-${rIdx}`}>
          {Array.from({ length: cols }).map((__, cIdx) => (
            <TableCell key={`skeleton-${rIdx}-${cIdx}`}>
              <div className="h-4 w-full animate-pulse rounded bg-muted" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

// ---------- Main Component ----------
const UserAutoSQAlert: React.FC = () => {
  const { channelData } = useSocket() as unknown as SocketCtx;
  const deviceType =
    typeof window !== "undefined"
      ? localStorage.getItem("deviceType") || ""
      : "";
  const jwt_token =
    typeof window !== "undefined" ? localStorage.getItem("token") || "" : "";

  const [tableData, setTableData] = useState<AutoSQAlertItem[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);
  const itemsPerPage = 200;

  const [userData, setUserData] = useState<Option[]>([]);
  const [exchangeData, setExchangeData] = useState<Option[]>([]);
  const [symbolData, setSymbolData] = useState<Option[]>([]);

  const [formData, setFormData] = useState<{
    user: Option | null;
    symbol: Option | null;
    exchange: Option | null;
    startDate: string;
    endDate: string;
    search: string;
  }>({
    user: null,
    symbol: null,
    exchange: null,
    startDate: "",
    endDate: "",
    search: "",
  });

  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: null,
    direction: "ascending",
  });
  const [loading, setLoading] = useState<boolean>(false);

  const requestSort = (key: SortKey) => {
    let direction: SortDirection = "ascending";
    if (sortConfig.key === key && sortConfig.direction === "ascending")
      direction = "descending";
    setSortConfig({ key, direction });
  };

  const sortedTableData = useMemo(() => {
    const items = [...tableData];
    if (sortConfig.key === null) return items;

    const getDisplayName = (item: AutoSQAlertItem) => {
      const ex = item.exchangeName?.toLowerCase();
      if (ex === "usstock") return item.symbolName ?? "";
      if (ex === "ce/pe") return item.symbolTitle ?? "";
      return item.masterName ?? "";
    };

    items.sort((a, b) => {
      let aValue: string | number | Date | undefined;
      let bValue: string | number | Date | undefined;

      if (sortConfig.key === "script") {
        aValue = getDisplayName(a);
        bValue = getDisplayName(b);
      } else {
        aValue = a[sortConfig.key as keyof AutoSQAlertItem] as any;
        bValue = b[sortConfig.key as keyof AutoSQAlertItem] as any;
      }

      if (aValue == null) return 1;
      if (bValue == null) return -1;

      if (typeof aValue === "string" || typeof bValue === "string") {
        const aStr = String(aValue);
        const bStr = String(bValue);
        return sortConfig.direction === "ascending"
          ? aStr.localeCompare(bStr)
          : bStr.localeCompare(aStr);
      }

      if (aValue < bValue) return sortConfig.direction === "ascending" ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === "ascending" ? 1 : -1;
      return 0;
    });

    return items;
  }, [tableData, sortConfig]);

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortConfig.key !== col)
      return <ArrowUpDown className="h-4 w-4 opacity-60" />;
    return sortConfig.direction === "ascending" ? (
      <ArrowUp className="h-4 w-4" />
    ) : (
      <ArrowDown className="h-4 w-4" />
    );
  };

  const debouncedSearch = useDebouncedCallback((q: string) => {
    setFormData((p) => ({ ...p, search: q }));
  }, 300);

  const handleReset = async () => {
    setFormData({
      user: null,
      symbol: null,
      exchange: null,
      startDate: "",
      endDate: "",
      search: "",
    });
    setUserData([]);
    setSymbolData([]);
    setCurrentPage(1);
    fetchDataFromAPI(1);
  };

  const handleFilter = async () => {
    setCurrentPage(1);
    fetchDataFromAPI(0);
  };

  const fetchDataFromAPI = async (reset: 0 | 1) => {
    try {
      setLoading(true);
      const payload =
        reset === 1
          ? {
              search: "",
              userId: "",
              symbolId: "",
              exchangeId: "",
              status: EXECUTED,
              startDate: "",
              endDate: "",
              page: 1,
              limit: itemsPerPage,
            }
          : {
              search: formData.search || "",
              userId: formData.user?.value ?? "",
              symbolId: formData.symbol?.value ?? "",
              exchangeId: formData.exchange?.value ?? "",
              status: EXECUTED,
              startDate: formData.startDate ?? "",
              endDate: formData.endDate ?? "",
              page: currentPage,
              limit: itemsPerPage,
            };

      const data = JSON.stringify({ data: encryptData(payload) });
      const response = await apiClient.post<any>(
        TRADE_LIST,
        data,
      );

      if (response.data.statusCode === SUCCESS) {
        const rdata = decryptData(response.data.data) as AutoSQAlertItem[];
        setTableData(rdata || []);
        setTotalPages(response.data.meta?.totalPage ?? 1);
        setTotalCount(response.data.meta?.totalCount ?? rdata?.length ?? 0);
      } else {
        toastError(response.data.message);
      }
    } catch (error: any) {
      toastError(error?.response?.data?.message || "Error fetching data");
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  const fetchOptions = async (inputValue: string) => {
    if (inputValue && inputValue.length > 2) {
      try {
        const body = {
          filterType: 0,
          roleId: "",
          userId: "",
          status: 0,
          search: inputValue,
          page: 1,
          limit: 50,
        };
        const data = JSON.stringify({ data: encryptData(body) });
        const response = await apiClient.post(
          USER_SEARCH_LIST,
          data,
        );

        if (response.data.statusCode === SUCCESS) {
          const rdata = decryptData(response.data.data) as Array<{
            userName: string;
            userId: string;
          }>;
          const rRes: Option[] = (rdata || []).map((item) => ({
            label: item.userName,
            value: item.userId,
          }));
          setUserData(rRes);
        } else {
          toastError(response.data.message);
        }
      } catch (error: any) {
        toastError(error?.response?.data?.message || "Error fetching users");
        console.error("Login error:", error);
      }
    } else {
      setUserData([]);
    }
  };

  const handleGetExchange = async () => {
    try {
      const body = {
        page: 1,
        limit: 100,
        search: "",
        sortKey: "createdAt",
        sortBy: -1,
      };
      const data = JSON.stringify({ data: encryptData(body) });
      const response = await apiClient.post(
        EXCHANGE_LIST,
        data,
      );

      if (response.data.statusCode === SUCCESS) {
        const rdata = decryptData(response.data.data) as Array<{
          name: string;
          exchangeId: string;
        }>;
        const rRes: Option[] = (rdata || []).map((item) => ({
          label: item.name,
          value: item.exchangeId,
        }));
        setExchangeData(rRes);
      }
    } catch (error) {
      console.error("Error fetching exchanges:", error);
    }
  };

  const handleChangeExchange = async (selected: Option | null) => {
    setFormData((prev) => ({ ...prev, exchange: selected, symbol: null }));
    if (!selected?.value) {
      setSymbolData([]);
      return;
    }
    try {
      const body = {
        page: 1,
        limit: 1000,
        search: "",
        exchangeId: selected.value,
        sortKey: "createdAt",
        sortBy: -1,
      };
      const data = JSON.stringify({ data: encryptData(body) });
      const response = await apiClient.post(
      SYMBOL_LIST,
        data,
      );

      if (response.data.statusCode === SUCCESS) {
        const rdata = decryptData(response.data.data) as Array<{
          symbolName: string;
          symbolId: string;
        }>;
        const rRes: Option[] = (rdata || []).map((item) => ({
          label: item.symbolName,
          value: item.symbolId,
        }));
        setSymbolData(rRes);
      }
    } catch (error) {
      console.error("Error fetching symbols:", error);
    }
  };

  const exportToExcel = () => {
    const table = document.getElementById("autoSQTable");
    if (!table) return;
    const worksheet = XLSX.utils.table_to_sheet(table);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
    XLSX.writeFile(workbook, "AutoSQ_Alerts.xlsx");
  };

  // Merge socket push into tableData (dedupe by userId)
  useEffect(() => {
    if (!channelData?.autoSQAlert) return;
    const incoming = channelData.autoSQAlert;
    setTableData((prev) => {
      const exists = prev.some((it) => it.userId === incoming.userId);
      if (!exists) return [incoming, ...prev];
      const rest = prev.filter((it) => it.userId !== incoming.userId);
      return [incoming, ...rest];
    });
  }, [channelData]);

  useEffect(() => {
    document.title = "Admin Panel | User Auto SQ Alert";
    handleGetExchange();
    fetchDataFromAPI(1);
    return () => {
      document.title = "Admin Panel";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchDataFromAPI(0); /* refetch on pagination */
  }, [currentPage]);

  return (

        <div className="space-y-4 p-4 bg-[#181a20] overflow-y-auto h-full">
          {/* Heading */}
<div className="bg-[#181a20] mb-10 ">
  {/* <CardHeader className="pb-2">
    <CardTitle className="flex items-center justify-between text-base">
      <span className="text-yellow-400">Filter & Search</span>
      <Badge variant="secondary" className="rounded-full bg-amber-400">
        Records: {totalCount}
      </Badge>
    </CardTitle>
  </CardHeader> */}

  <CardContent className="space-y-3">
    {/* Search bar + Export/Refresh buttons */}
    <div className="flex items-end justify-between gap-3 flex-wrap">
      {/* Search */}
      <div className="flex-1 min-w-[250px]">
        <Label htmlFor="search" className="mb-1 block text-white">
          Search
        </Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="search"
            placeholder="Search text (server side)"
            className="pl-9"
            onChange={(e) => debouncedSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Export / Refresh Buttons */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          onClick={exportToExcel}
          className="gap-2 bg-yellow-400 border border-yellow-400 hover:bg-yellow-400"
        >
          <Download className="h-4 w-4" /> Export
        </Button>

        <Button
          variant="secondary"
          onClick={() => fetchDataFromAPI(0)}
          className="gap-2 bg-yellow-400 hover:bg-amber-400"
        >
          <RefreshCcw className="h-4 w-4" /> Refresh
        </Button>
      </div>
    </div>

    {/* All filters in one line + Clear/Apply at right */}
<div className="flex flex-wrap items-end justify-between gap-3 mt-5">
  <div className="flex flex-wrap items-end gap-3 flex-1">
    {/* User */}
    <div className="">
      <Label className="mb-1 block text-white">User</Label>
      <Select
        value={formData.user?.value ?? undefined}
        onValueChange={(val) => {
          const selected = userData.find((opt) => opt.value === val) || null;
          setFormData((p) => ({ ...p, user: selected }));
        }}
        disabled={userData.length === 0}
      >
        <SelectTrigger className="bg-[#2a2f36] text-white border-gray-700">
          <SelectValue placeholder="Select user" />
        </SelectTrigger>
        <SelectContent className="bg-[#2a2f36] text-white border-gray-700 max-h-72">
          {userData.length === 0 ? (
            // Do NOT use <SelectItem value=""> here
            <div className="px-3 py-2 text-sm text-muted-foreground">No users found</div>
          ) : (
            userData.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
    </div>

    {/* Exchange */}
    <div className="">
      <Label className="mb-1 block text-white">Exchange</Label>
      <Select
        value={formData.exchange?.value ?? undefined}
        onValueChange={(val) => {
          const selected = exchangeData.find((opt) => opt.value === val) || null;
          handleChangeExchange(selected);
        }}
        disabled={exchangeData.length === 0}
      >
        <SelectTrigger className="bg-[#2a2f36] text-white border-gray-700">
          <SelectValue placeholder="Select exchange"  className="!text-white"/>
        </SelectTrigger>
        <SelectContent className="bg-[#2a2f36] text-white border-gray-700 max-h-72">
          {exchangeData.length === 0 ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">No exchanges</div>
          ) : (
            exchangeData.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
    </div>

    {/* Symbol */}
    <div className="">
      <Label className="mb-1 block text-white">Symbol</Label>
      <Select
        disabled={!formData.exchange || symbolData.length === 0}
        value={formData.symbol?.value ?? undefined}
        onValueChange={(val) => {
          const selected = symbolData.find((opt) => opt.value === val) || null;
          setFormData((p) => ({ ...p, symbol: selected }));
        }}
      >
        <SelectTrigger
          className={cn(
            "bg-[#2a2f36] text-white border-gray-700",
            (!formData.exchange || symbolData.length === 0) && "opacity-50"
          )}
        >
          <SelectValue
            placeholder={
              !formData.exchange
                ? "Select exchange first"
                : symbolData.length === 0
                ? "No symbols"
                : "Select symbol"
            }
          />
        </SelectTrigger>
        <SelectContent className="bg-[#2a2f36] text-white border-gray-700 max-h-72">
          {symbolData.length === 0 ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">No symbols</div>
          ) : (
            symbolData.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
    </div>

    {/* Start Date */}
    <div className="min-w-[160px]">
      <Label htmlFor="startDate" className="mb-1 block text-white">
        Start Date
      </Label>
      <Input
        id="startDate"
        type="date"
        value={formData.startDate}
        onChange={(e) =>
          setFormData((p) => ({ ...p, startDate: e.target.value }))
        }
        className="bg-[#2a2f36] text-white border-gray-700"
      />
    </div>

    {/* End Date */}
    <div className="min-w-[160px]">
      <Label htmlFor="endDate" className="mb-1 block text-white">
        End Date
      </Label>
      <Input
        id="endDate"
        type="date"
        value={formData.endDate}
        onChange={(e) =>
          setFormData((p) => ({ ...p, endDate: e.target.value }))
        }
        className="bg-[#2a2f36] text-white border-gray-700"
      />
    </div>
  </div>

  {/* Clear / Apply buttons at far right */}
  <div className="flex items-center gap-2">
    <Button
      onClick={handleReset}
      className="gap-2 bg-yellow-400 hover:bg-yellow-400 text-black"
    >
      <X className="h-4 w-4" /> Clear
    </Button>
    <Button
      onClick={handleFilter}
      className="gap-2 bg-yellow-400 hover:bg-yellow-400 text-black"
    >
      Apply
    </Button>
  </div>
</div>


  </CardContent>
</div>

          {/* Table */}
          <div className="bg-[#181a20]">
       
            <CardContent>
              <div className="rounded-md border max-h-[70vh] overflow-auto">
                <Table id="autoSQTable" className="relative">
                  <TableHeader className="sticky top-0 z-10 ">
                    <TableRow>
                      <TableHead
                        className="min-w-[180px] cursor-pointer"
                        onClick={() => requestSort("userName")}
                      >
                        <div className="flex items-center gap-2">
                          U.NAME <SortIcon col={"userName"} />
                        </div>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer"
                        onClick={() => requestSort("balance")}
                      >
                        <div className="flex items-center gap-2">
                          Balance <SortIcon col={"balance"} />
                        </div>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer"
                        onClick={() => requestSort("cutOffBalance")}
                      >
                        <div className="flex items-center gap-2">
                          Cut Off Balance <SortIcon col={"cutOffBalance"} />
                        </div>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer"
                        onClick={() => requestSort("cutOffBalanceForAlert")}
                      >
                        <div className="flex items-center gap-2">
                          Cut Off Balance For Alert{" "}
                          <SortIcon col={"cutOffBalanceForAlert"} />
                        </div>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer"
                        onClick={() => requestSort("dateTime")}
                      >
                        <div className="flex items-center gap-2">
                          Date Time <SortIcon col={"dateTime"} />
                        </div>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <LoadingRows rows={10} cols={5} />
                    ) : sortedTableData.length === 0 ? (
                      <EmptyRow colSpan={5} />
                    ) : (
                      sortedTableData.map((item, idx) => (
                        <TableRow
                          key={item.userId ?? idx}
                          className={cn(
                            item.autoSQStatus === false && "bg-destructive/5 text-white"
                          )}
                        >
                          <TableCell className="font-medium text-white">
                            {item.userName}
                          </TableCell>
                          <TableCell className="text-white">
                            {Number(item.balance ?? 0).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-white">
                            {Number(item.cutOffBalance ?? 0).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-white">
                            {Number(item.cutOffBalanceForAlert ?? 0).toFixed(2)}
                          </TableCell >
                          <TableCell className="text-white">{formatDateTime(item.dateTime)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm text-white">
                  Page {currentPage} of {totalPages}
                  
                </div>
                <div className="flex items-center gap-2 ">
                  <Button
                   
                  
                        className="bg-yellow-400 hover:bg-yellow-400 "
                    disabled={currentPage === 1}
                    onClick={() =>
                      handlePageChange(Math.max(1, currentPage - 1))
                    }
                  >
                    Previous
                  </Button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .slice(
                      Math.max(0, currentPage - 3),
                      Math.min(totalPages, currentPage + 2)
                    )
                    .map((page) => (
                      <Button
                        key={page}
                        size="sm"
                            className="bg-transparent text-white border border-gray-200 hover:bg-transparent"
                        variant={currentPage === page ? "default" : "outline"}
                        onClick={() => handlePageChange(page)}
                      >
                        {page}
                      </Button>
                    ))}
                  <Button
             
         
                    className="bg-yellow-400 hover:bg-yellow-400"
                    disabled={currentPage === totalPages}
                    onClick={() =>
                      handlePageChange(Math.min(totalPages, currentPage + 1))
                    }
                  >
                    Next
                  </Button>
                </div>
              </div>
            </CardContent>
          </div>
        </div>
   
 
  );
};

export default UserAutoSQAlert;
