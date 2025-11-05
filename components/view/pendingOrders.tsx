"use client";

import React, {
  Fragment,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import apiClient from "@/lib/axiosInstance";

import * as XLSX from "xlsx";
import { usePathname } from "next/navigation";
import { useWebSocket } from "@/components/socket/WebSocketProvider";
import { useSocket } from "@/components/socket/socketContext";
import webSocketManager from "@/components/socket/WebSocketManager";
import { useArray } from "@/components/socket/ArrayProvider";

// === Your helpers ===
import { decryptData, encryptData } from "@/hooks/crypto";
import { formatDateTime } from "@/hooks/dateUtils";
import { toastError } from "@/hooks/toastMsg";
import { formatValue } from "@/hooks/range";

// === Your constants ===
import {
  ADMIN_API_ENDPOINT,
  EXCHANGE_LIST,
  EXECUTED,
  PENDING,
  SELL,
  SUCCESS,
  SYMBOL_LIST,
  TRADE_LIST,
  USER_SEARCH_LIST,
} from "@/constant/index";
import { useSession } from "next-auth/react";
// === shadcn/ui components ===
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Command,
  CommandInput,
  CommandList,
  CommandItem,
  CommandEmpty,
  CommandGroup,
} from "@/components/ui/command";
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
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@radix-ui/react-popover"; // Corrected import
import { Check, ChevronsUpDown } from "lucide-react"; // Assuming these icons are used

// === Types ===
interface Option {
  label: string;
  value: string;
}

interface TradeRow {
  tradeId: string;
  userName: string;
  parentUserName: string;
  exchangeName: string;
  symbolTitle: string;
  tradeType: string;
  totalQuantity: number;
  quantity: number;
  price: number;
  createdAt: string | number | Date;
  updatedAt: string | number | Date;
  productTypeValue: string;
  bid: number;
  ask: number;
  referencePrice: number;
  ipAddress: string;
  deviceId: string;
  symbolName: string;
  ltp?: number;
  ch?: number;
  chp?: number;
}

interface RootState {
  array: string[];
}

function AsyncComboBox({
  placeholder,
  value,
  options,
  onChange,
  onSearch,
  className,
  emptyText = "No results",
  disabled,
}: {
  placeholder?: string;
  value: Option | null | undefined;
  options: Option[];
  onChange: (opt: Option) => void;
  onSearch?: (query: string) => void;
  className?: string;
  emptyText?: string;
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
          className={className}
          disabled={disabled}
        >
          {value ? value.label : placeholder || "Select"}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command shouldFilter={false} className="bg-[#1e2329]">
          <CommandInput
            placeholder={placeholder || "Search..."}
            onValueChange={(val) => onSearch?.(val)}
            className="bg-[#1e2329] text-white border-gray-700"
          />
          <CommandList className="bg-[#1e2329]">
            <CommandEmpty className="text-gray-400">{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((opt) => (
                <CommandItem
                  key={opt.value}
                  value={opt.label}
                  onSelect={() => {
                    onChange(opt);
                    setOpen(false);
                  }}
                  className="cursor-pointer text-white hover:bg-[#2a3142]"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value?.value === opt.value ? "opacity-100" : "opacity-0"
                    )}
                  />
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

// ===== Component =====
export default function PendingOrderList() {
  const { tickData } = useWebSocket();
  const { channelData } = useSocket();
  const { addItem } = useArray();
  const{data:session} = useSession();

 
    
  const jwt_token = (session as any)?.accessToken as string | undefined;
  const deviceType =
    ((session?.user as any)?.deviceType as string | undefined) ?? "web";
  const authenticatedUserId = (session?.user as any)?.userId as string | undefined;
  const authenticatedRole = (session?.user as any)?.roleName as string | undefined;
  const authenticated =
    typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem("authenticated") || "null")
      : null;

  const localArray = React.useRef<string[]>([]);

  const [tableData, setTableData] = useState<TradeRow[]>([]);
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
  }>({ user: null, symbol: null, exchange: null, startDate: "", endDate: "" });

  const [sortConfig, setSortConfig] = useState<{
    key: keyof TradeRow | "script" | null;
    direction: "ascending" | "descending";
  }>({ key: null, direction: "ascending" });

  const requestSort = (key: keyof TradeRow | "script") => {
    let direction: "ascending" | "descending" = "ascending";
    if (sortConfig.key === key && sortConfig.direction === "ascending")
      direction = "descending";
    setSortConfig({ key, direction });
  };

  const sortedTableData = useMemo(() => {
    const sortableItems = [...tableData];
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        let aValue: any;
        let bValue: any;

        if (sortConfig.key === "script") {
          const getDisplayName = (item: TradeRow) => {
            if (item.exchangeName?.toLowerCase() === "usstock")
              return (item as any).symbolName;
            if (item.exchangeName?.toLowerCase() === "ce/pe")
              return item.symbolTitle;
            return (item as any).masterName ?? item.symbolTitle;
          };
          aValue = getDisplayName(a);
          bValue = getDisplayName(b);
        } else {
          if (sortConfig.key !== null) {
            aValue = (a as any)[sortConfig.key];
            bValue = (b as any)[sortConfig.key];
          } else {
            aValue = undefined;
            bValue = undefined;
          }
        }

        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;

        if (typeof aValue === "string") {
          return sortConfig.direction === "ascending"
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        } else {
          if (aValue < bValue)
            return sortConfig.direction === "ascending" ? -1 : 1;
          if (aValue > bValue)
            return sortConfig.direction === "ascending" ? 1 : -1;
          return 0;
        }
      });
    }
    return sortableItems;
  }, [tableData, sortConfig]);

  const getSortIcon = (key: keyof TradeRow | "script") => {
    if (sortConfig.key !== key) return "fa-solid fa-sort";
    return sortConfig.direction === "ascending"
      ? "fa-solid fa-sort-up"
      : "fa-solid fa-sort-down";
  };

  const addSymbolNameInArray = async (symbolName: string) => {
    if (!localArray.current.includes(symbolName)) {
      localArray.current.push(symbolName);
    }
  };

  const socketData = async (symbols: TradeRow[]) => {
    for (let i = 0; i < symbols.length; i++) {
      await addSymbolNameInArray(symbols[i].symbolName);
    }
    webSocketManager.sendSymbols(localArray.current);
  };

  const handleReset = async () => {
    setFormData({
      user: null,
      symbol: null,
      exchange: null,
      startDate: "",
      endDate: "",
    });
    setUserData([]);
    setSymbolData([]);
    fetchDataFromAPI(1);
    setCurrentPage(1);
  };

  const handleFilter = async () => {
    fetchDataFromAPI(0);
    setCurrentPage(1);
  };

  const fetchDataFromAPI = async (reset: 0 | 1) => {
    try {
      let payload = {
        search: "",
        userId: formData?.user?.value || "",
        symbolId: formData?.symbol?.value || "",
        exchangeId: formData?.exchange?.value || "",
        status: PENDING,
        startDate: formData?.startDate || "",
        endDate: formData?.endDate || "",
        page: currentPage,
        limit: itemsPerPage,
      } as any;

      if (reset === 1) {
        payload = {
          search: "",
          userId: "",
          symbolId: "",
          exchangeId: "",
          status: PENDING,
          startDate: "",
          endDate: "",
          page: currentPage,
          limit: itemsPerPage,
        };
      }

      let data = encryptData(payload);
      const body = JSON.stringify({ data });

      const response = await apiClient.post(TRADE_LIST, body);

      if (response.data.statusCode == SUCCESS) {
        const rdata: TradeRow[] = decryptData(response.data.data);
        setTableData(rdata);
        socketData(rdata);
        setTotalPages(response.data.meta.totalPage);
        setTotalCount(response.data.meta.totalCount);
      } else {
        toastError(response.data.message);
      }
    } catch (error: any) {
      toastError(error?.response?.data?.message || "Failed to fetch");
      console.error("Fetch error:", error);
    }
  };

  const handlePageChange = async (pageNumber: number) =>
    setCurrentPage(pageNumber);

  const fetchOptions = async (inputValue: string | any[]) => {
    if (inputValue && 2 < inputValue.length) {
      try {
        const data = encryptData({
          filterType: 0,
          roleId: "",
          userId: "",
          status: 0,
          search: inputValue,
          page: 1,
          limit: 50,
        });

        const body = JSON.stringify({ data });
        const response = await apiClient.post(
          USER_SEARCH_LIST,
          body,
        );

        if (response.data.statusCode === SUCCESS) {
          const rdata = decryptData(response.data.data);
          const rRes = rdata.map((item: { userName: any; userId: any }) => ({
            label: item.userName,
            value: item.userId,
          }));
          setUserData(rRes);
        } else {
          toastError(response.data.message);
        }
      } catch (error: any) {
        toastError(error?.response?.data?.message || "Failed to load users");
        console.error("User search error:", error);
      }
    } else {
      setUserData([]); // Clear if search input is too short
    }
  };

  const handleGetExchange = async () => {
    try {
      const data = encryptData({
        page: 1,
        limit: 100,
        search: "",
        sortKey: "createdAt",
        sortBy: -1,
      });
      const body = JSON.stringify({ data });
      const response = await apiClient.post(
        EXCHANGE_LIST,
        body,
      );
      if (response.data.statusCode == SUCCESS) {
        const rdata = decryptData(response.data.data) as Array<{
          name: string;
          exchangeId: string;
        }>;
        const rRes: Option[] = rdata.map((item) => ({
          label: item.name,
          value: item.exchangeId,
        }));
        setExchangeData(rRes);
      }
    } catch (error) {
      console.error("Error fetching exchanges:", error);
    }
  };

  const handleChangeValueOption = async (
    selectedOption: Option | null,
    name: "user" | "symbol" | "exchange"
  ) => {
    setFormData((prev) => ({ ...prev, [name]: selectedOption }));

    if (name === "exchange") {
      try {
        const data = encryptData({
          page: 1,
          limit: 1000,
          search: "",
            exchangeId: selectedOption ? selectedOption.value : null,
          sortKey: "createdAt",
          sortBy: -1,
        });
        const body = JSON.stringify({ data });
        const response = await apiClient.post(
          SYMBOL_LIST,
          body,
        );
        if (response.data.statusCode == SUCCESS) {
          const rdata = decryptData(response.data.data) as Array<{
            symbolName: string;
            symbolId: string;
          }>;
          const rRes: Option[] = rdata.map((item) => ({
            label: item.symbolName,
            value: item.symbolId,
          }));
          setSymbolData(rRes);
        }
      } catch (error) {
        console.error("Error fetching symbols:", error);
      }
    }
  };

  const exportToExcel = () => {
    const table = document.getElementById("myTable");
    if (!table) return;
    const worksheet = XLSX.utils.table_to_sheet(table);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
    XLSX.writeFile(workbook, "TradeData.xlsx");
  };

  const handleDateChange = (name: "startDate" | "endDate", value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // ---- Effects ----
  useEffect(() => {
    if (channelData) {
      if ((channelData as any)?.trade) {
        const trade = (channelData as any).trade as TradeRow;
        if (trade.status === PENDING || trade.status === EXECUTED) {
          const idExists = tableData.some(
            (item) => item.tradeId === trade.tradeId
          );
          if (!idExists) {
            const updated = [trade, ...tableData];
            setTableData(updated);
          } else {
            const newData = tableData.map((item) =>
              item.tradeId === trade.tradeId ? (trade as any) : item
            );
            setTableData(newData);
          }
        }
      }
      if (
        (channelData as any)?.userData &&
        Object.keys((channelData as any).userData).length > 0
      ) {
        localStorage.setItem(
          "authenticated",
          JSON.stringify((channelData as any).userData)
        );
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelData]);

  useEffect(() => {
    if ((tickData as any)?.data && tableData.length !== 0) {
      const newData = tableData.map((userItem) => {
        if (userItem.symbolName === (tickData as any).data.symbol) {
          const updated: TradeRow = {
            ...userItem,
            ltp: (tickData as any).data.ltp,
            ask: (tickData as any).data.ask,
            bid: (tickData as any).data.bid,
            ch: (tickData as any).data.ch,
            chp: (tickData as any).data.chp,
          };
          return updated;
        }
        return userItem;
      });
      // original logic had a likely typo setting old tableData; using newData keeps intent without changing API
      setTableData(newData);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tickData]);

  useEffect(() => {
    fetchDataFromAPI(0);
    handleGetExchange();
    const prev = document.title;
    document.title = "Pending Order List";
    return () => {
      document.title = prev || "Admin Panel";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  return (
    <div
      className="px-4 sm:px-6 pb-6 pt-5"
      style={{ backgroundColor: "#181a20", minHeight: "100vh" }}
    >
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <div className="space-y-2">
            <Label htmlFor="startDate" style={{ color: "#848E9C" }}>
              From Date
            </Label>
            <Input
              id="startDate"
              name="startDate"
              type="date"
              value={formData.startDate}
              onChange={(e) => handleDateChange("startDate", e.target.value)}
              style={{
                backgroundColor: "#2a3142",
                border: "1px solid #3e4551",
                color: "white",
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="endDate" style={{ color: "#848E9C" }}>
              To Date
            </Label>
            <Input
              id="endDate"
              name="endDate"
              type="date"
              value={formData.endDate}
              onChange={(e) => handleDateChange("endDate", e.target.value)}
              style={{
                backgroundColor: "#2a3142",
                border: "1px solid #3e4551",
                color: "white",
              }}
            />
          </div>
          {/* <div className="space-y-2">
            <Label style={{ color: "#848E9C" }}>User Name</Label>
            <select
                value={formData.user?.value || ""} 
              
          onChange={(e) => {
    const selected =
      userData.find((opt) => opt.value === e.target.value) || null;
    handleChangeValueOption(selected, "user"); // Update form data with selected user
  }}
              className="bg-[#181a20] text-white border-gray-700 w-full py-2 px-3 rounded-md"
            >
              <option value="">Type to search...</option> 
              {userData.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div> */}

          <div className="space-y-2">
            <Label style={{ color: "#848E9C" }}>Exchange</Label>
            <select
              value={formData.exchange?.value || ""} // Set the value from formData
              onChange={(e) => {
                const selected =
                  exchangeData.find((opt) => opt.value === e.target.value) ||
                  null;
                handleChangeValueOption(selected, "exchange"); // Update formData with selected exchange
              }}
              className="bg-[#181a20] text-white border-gray-700 w-full py-2 px-3 rounded-md"
            >
              <option value="">Select Exchange...</option>{" "}
              {/* Placeholder option */}
              {exchangeData.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label} {/* Display the label of each exchange */}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label style={{ color: "#848E9C" }}>Symbols</Label>

            <select
              value={formData.symbol?.value || ""} // Bind the selected symbol value
              onChange={(e) => {
                const selected =
                  symbolData.find((opt) => opt.value === e.target.value) ||
                  null;
                handleChangeValueOption(selected, "symbol"); // Update formData with selected symbol
              }}
              className="bg-[#181a20] text-white border-gray-700 w-full py-2 px-3 rounded-md"
              disabled={!formData.exchange} // Disable if no exchange is selected
            >
              <option value="">Select Symbol...</option>{" "}
              {/* Placeholder option */}
              {symbolData.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label} {/* Option label */}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label className="opacity-0">Actions</Label>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                className="w-full"
                onClick={exportToExcel}
                style={{
                  backgroundColor: "#2a3142",
                  border: "1px solid #3e4551",
                  color: "white",
                }}
              >
                Export
              </Button>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 justify-end">
          <Button
            onClick={() => handleFilter()}
            className=""
            style={{ backgroundColor: "#fcd535", color: "#181a20" }}
          >
            View
          </Button>
          <Button
            variant="destructive"
            onClick={handleReset}
            style={{ backgroundColor: "#e74c3c", color: "white" }}
          >
            Clear
          </Button>
        </div>
      </CardContent>

      <Separator className="my-6" style={{ backgroundColor: "#3e4551" }} />

      <Card
        className="shadow-sm"
        style={{ backgroundColor: "#1e2329", border: "1px solid #3e4551" }}
      >
    
          <Table id="myTable">
            <TableHeader>
              <TableRow className="hover:bg-transperent" style={{ borderBottom: "1px solid #3e4551" }}>
                <TableHead
                  onClick={() => requestSort("userName")}
                  style={{ color: "#fcd535" }}
                >
                  U.NAME <i className={getSortIcon("userName")} />
                </TableHead>
                <TableHead
                  onClick={() => requestSort("parentUserName")}
                  className="cursor-pointer"
                  style={{ color: "#fcd535" }}
                >
                  P.USER <i className={getSortIcon("parentUserName")} />
                </TableHead>
                <TableHead
                  onClick={() => requestSort("exchangeName")}
                  className="cursor-pointer"
                  style={{ color: "#fcd535" }}
                >
                  EXCH <i className={getSortIcon("exchangeName")} />
                </TableHead>
                <TableHead
                  onClick={() => requestSort("symbolTitle")}
                  className="cursor-pointer"
                  style={{ color: "#fcd535" }}
                >
                  SYMBOL <i className={getSortIcon("symbolTitle")} />
                </TableHead>
                <TableHead style={{ color: "#fcd535" }}>B/S</TableHead>
                <TableHead
                  onClick={() => requestSort("totalQuantity")}
                  className="cursor-pointer"
                  style={{ color: "#fcd535" }}
                >
                  QTY <i className={getSortIcon("totalQuantity")} />
                </TableHead>
                <TableHead
                  onClick={() => requestSort("quantity")}
                  className="cursor-pointer"
                  style={{ color: "#fcd535" }}
                >
                  LOT <i className={getSortIcon("quantity")} />
                </TableHead>
                <TableHead
                  onClick={() => requestSort("price")}
                  className="cursor-pointer"
                  style={{ color: "#fcd535" }}
                >
                  PRICE <i className={getSortIcon("price")} />
                </TableHead>
                <TableHead
                  onClick={() => requestSort("createdAt")}
                  className="cursor-pointer"
                  style={{ color: "#fcd535" }}
                >
                  ORDER D/T <i className={getSortIcon("createdAt")} />
                </TableHead>
                <TableHead
                  onClick={() => requestSort("updatedAt")}
                  className="cursor-pointer"
                  style={{ color: "#fcd535" }}
                >
                  ORDER D/T <i className={getSortIcon("updatedAt")} />
                </TableHead>
                <TableHead style={{ color: "#fcd535" }}>TYPE</TableHead>
                <TableHead style={{ color: "#fcd535" }}>CMP</TableHead>
                <TableHead
                  onClick={() => requestSort("referencePrice")}
                  className="cursor-pointer"
                  style={{ color: "#fcd535" }}
                >
                  M. PRICE <i className={getSortIcon("referencePrice")} />
                </TableHead>
                <TableHead
                  onClick={() => requestSort("ipAddress")}
                  className="cursor-pointer"
                  style={{ color: "#fcd535" }}
                >
                  IP ADDRESS <i className={getSortIcon("ipAddress")} />
                </TableHead>
                <TableHead
                  onClick={() => requestSort("deviceId")}
                  className="cursor-pointer"
                  style={{ color: "#fcd535" }}
                >
                  DEVICE ID <i className={getSortIcon("deviceId")} />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
               {sortedTableData.length === 0 ? (
    <TableRow >
      <TableCell
        colSpan={15}
        className="text-center py-6 text-gray-400"
        style={{
          backgroundColor: "#1e2329",
          borderBottom: "1px solid #3e4551",
        }}
      >
        No Data Found
      </TableCell>
    </TableRow>
  ) : (
    <>
              {sortedTableData.map((item, index) => (
                <TableRow
                  key={index}
                  className="hover:bg-transperent"
                  style={{ borderBottom: "1px solid #3e4551" }}
                >
                  <TableCell style={{ color: "white" }}>
                    {item.userName}
                  </TableCell>
                  <TableCell style={{ color: "white" }}>
                    {item.parentUserName}
                  </TableCell>
                  <TableCell style={{ color: "white" }}>
                    {item.exchangeName}
                  </TableCell>
                  <TableCell style={{ color: "white" }}>
                    {item.symbolTitle}
                  </TableCell>
                  <TableCell style={{ color: "white" }}>
                    {item.tradeType}
                  </TableCell>
                  <TableCell style={{ color: "white" }}>
                    {item.totalQuantity?.toFixed?.(2)}
                  </TableCell>
                  <TableCell style={{ color: "white" }}>
                    {item.quantity?.toFixed?.(2)}
                  </TableCell>
                  <TableCell style={{ color: "white" }}>
                    {formatValue(item.price, item.exchangeName)}
                  </TableCell>
                  <TableCell>
                    <div
                      style={{ color: "#848E9C" }}
                      title={String(formatDateTime(item.createdAt))}
                    >
                      {formatDateTime(item.createdAt)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div
                      style={{ color: "#848E9C" }}
                      title={String(formatDateTime(item.updatedAt))}
                    >
                      {formatDateTime(item.updatedAt)}
                    </div>
                  </TableCell>
                  <TableCell style={{ color: "white" }}>
                    {item.productTypeValue}
                  </TableCell>
                  <TableCell style={{ color: "white" }}>
                    {item.tradeType === SELL
                      ? formatValue(item.bid, item.exchangeName)
                      : formatValue(item.ask, item.exchangeName)}
                  </TableCell>
                  <TableCell style={{ color: "white" }}>
                    {formatValue(item.referencePrice, item.exchangeName)}
                  </TableCell>
                  <TableCell style={{ color: "white" }}>
                    {item.ipAddress}
                  </TableCell>
                  <TableCell>
                    <div style={{ color: "#848E9C" }} title={item.deviceId}>
                      {item.deviceId}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              </>
            )}
            </TableBody>
          </Table>
      </Card>
    </div>
  );
}
