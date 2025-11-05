"use client";

import React, { useEffect, useMemo, useState } from "react";
import apiClient from "@/lib/axiosInstance";

import * as XLSX from "xlsx";
import Select from "react-select";
import { v4 as uuidv4 } from "uuid";
import { useSocket } from "@/components/socket/socketContext";
import { toastError, toastSuccess } from "@/hooks/toastMsg";
import { formatValue } from "@/hooks/range";
import { decryptData, encryptData } from "@/hooks/crypto";
import { formatDateTime } from "@/hooks/dateUtils";
import { cn } from "@/lib/utils";
import { Download } from "lucide-react";
import axios from "axios";
// ---- constants ----
import {
  ADMIN_API_ENDPOINT,
  EXCHANGE_LIST,
  EXECUTED,
  MANUALLY_TRADE_LIST,
  MANUALLY_TRADE_SUPER_ADMIN,
  SUCCESS,
  SYMBOL_LIST,
  USER_SEARCH_LIST,
  INTRADAY,
  CLIENT,
  MANUALLY_TRADE_ADDED_FOR,
} from "@/constant/index";

// ---- shadcn/ui ----
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter as DialogFooterUI,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import {
  ChevronDown,
  Check,
  Loader2,
  Calendar as CalendarIcon,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
// ------------ Types ------------
type Option = { label: string; value: string };
type SortConfig = { key: string | null; direction: "ascending" | "descending" };

type TableItem = {
  sequence: string | number;
  userName: string;
  parentUserName: string;
  exchangeName: string;
  symbolTitle: string;
  createdAt: string | number | Date;
  tradeType: string;
  totalQuantity: number;
  quantity: number;
  productTypeValue: string;
  profitLoss: number;
  price: number;
  brokerageAmount: number;
  executionDateTime: string | number | Date;
  referencePrice: number;
  ipAddress: string;
  deviceId: string;
  m2mTotal: number;
  tradeId?: string | number;
};

type FormData = {
  user: Option | null;
  symbol: Option | null;
  exchange: Option | null;
  startDate: string;
  endDate: string;
};

// ---------- SearchableSelect ----------
function SearchableSelect({
  value,
  options,
  placeholder = "Select...",
  emptyText = "No results.",
  onSelect,
  onSearch,
  isLoading = false,
  disabled = false,
  triggerClassName,
}: {
  value: Option | null;
  options: Option[];
  placeholder?: string;
  emptyText?: string;
  onSelect: (opt: Option) => void;
  onSearch?: (q: string) => void;
  isLoading?: boolean;
  disabled?: boolean;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between h-10 border-gray-700 bg-gray-800 text-gray-100 hover:bg-gray-700",
            triggerClassName
          )}
          style={{
            backgroundColor: "#1e2329",
            borderColor: "#2b3139",
            color: "#eaecef",
          }}
        >
          {value ? value.label : placeholder}
          <ChevronDown className="ml-2 h-4 w-4 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="p-0 w-[var(--radix-popover-trigger-width)] border-gray-700"
        style={{
          backgroundColor: "#1e2329",
          borderColor: "#2b3139",
        }}
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Type to search..."
            onValueChange={(q) => onSearch?.(q)}
            className="bg-gray-800 text-gray-100 border-gray-700"
            style={{
              backgroundColor: "#1e2329",
              borderColor: "#2b3139",
              color: "#eaecef",
            }}
          />
        </Command>
        {isLoading ? (
          <div className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading...
          </div>
        ) : (
          <>
            <CommandEmpty className="text-gray-400">{emptyText}</CommandEmpty>
            <CommandList>
              <CommandGroup>
                {options.map((opt) => (
                  <CommandItem
                    key={opt.value}
                    value={opt.label}
                    onSelect={() => {
                      onSelect(opt);
                      setOpen(false);
                    }}
                    className="text-gray-100 hover:bg-gray-700 focus:bg-gray-700"
                    style={{ color: "#eaecef" }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value?.value === opt.value ? "opacity-100" : "opacity-0"
                      )}
                      style={{ color: "#fcd535" }}
                    />
                    {opt.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}

// =====================================
// Create Manual Trade Dialog (popup)
// =====================================
type OptionType = { label: string; value: any; data?: any };

type CreateFormState = {
  userId: any;
  symbolId: any;
  exchangeId: any;
  quantity: number;
  totalQuantity: number;
  price: number;
  referencePrice: number;
  lotSize: number;
  orderType: string;
  tradeType: string;
  productType: string;
  executionDateTime: string;
  isBrokerageCalculatedOrNot: number | string;
  manuallyTradeAddedFor: any;
  ipAddress: string;
  deviceId: string;
  userAgent: string;
  browser: string;
  deviceType: string;
};

function CreateManualTradeDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
}) {
  const deviceTypeLS =
    typeof window !== "undefined" ? localStorage.getItem("deviceType") : null;
  const jwt_token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const authenticated =
    typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem("authenticated") || "{}")
      : {};

  const [userData, setUserData] = useState<OptionType[]>([]);
  const [exchangeData, setExchangeData] = useState<OptionType[]>([]);
  const [symbolData, setSymbolData] = useState<OptionType[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const initialFormData: CreateFormState = {
    userId: [] as any,
    symbolId: [] as any,
    exchangeId: [] as any,
    quantity: 0,
    totalQuantity: 0,
    price: 0,
    referencePrice: 0,
    lotSize: 0,
    orderType: "market",
    tradeType: "",
    productType: INTRADAY,
    executionDateTime: "",
    isBrokerageCalculatedOrNot: "" as any,
    manuallyTradeAddedFor: [] as any,
    ipAddress: "",
    deviceId: "",
    userAgent: "",
    browser: "",
    deviceType: "",
  };

  const [formData, setFormData] = useState<CreateFormState>(initialFormData);

  const handleChangeValueOption = (
    selectedOptions: any,
    name: keyof CreateFormState
  ) => {
    if (name === "symbolId") {
      setFormData((prev) => ({
        ...prev,
        [name]: selectedOptions,
        lotSize: selectedOptions?.data?.lotSize ?? 0,
        totalQuantity: selectedOptions?.data?.lotSize ?? 0,
        quantity: 1,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: selectedOptions,
      }));
    }

    if (name === "exchangeId" && selectedOptions?.value) {
      const payload = JSON.stringify({
        data: encryptData({
          page: 1,
          limit: 1000,
          search: "",
          exchangeId: selectedOptions.value,
          sortKey: "name",
          sortBy: 1,
        }),
      });

      axios
        .post(ADMIN_API_ENDPOINT + SYMBOL_LIST, payload, {
          headers: {
            "Content-Type": "application/json",
            deviceType: deviceTypeLS || "",
            Authorization: jwt_token || "",
          },
        })
        .then((response) => {
          if (response.data.statusCode == SUCCESS) {
            const rdata = decryptData(response.data.data) as any[];
            const rRes: OptionType[] = rdata.map((item: any) => ({
              label: item.symbolName,
              value: item.symbolId,
              data: item,
            }));
            setSymbolData(rRes);
            setFormData((prev) => ({
              ...prev,
              symbolId: [] as any,
              lotSize: 0,
              totalQuantity: 0,
              quantity: 0,
            }));
          }
        })
        .catch((error) => console.error("Error fetching symbols:", error));
    }
  };

  const handleFormInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target as {
      name: keyof CreateFormState;
      value: any;
    };

    if (name === "totalQuantity") {
      const q = Number(value);
      const lot = formData.lotSize || 0;
      const lots = lot ? q / lot : 0;
      setFormData((prev) => ({ ...prev, totalQuantity: q, quantity: lots }));
    } else if (name === "quantity") {
      const lots = Number(value);
      const lot = formData.lotSize || 0;
      const qty = lot ? lots * lot : 0;
      setFormData((prev) => ({ ...prev, quantity: lots, totalQuantity: qty }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: name === "price" ? Number(value) : value,
      }));
    }
  };

  const handleInputChange = (inputValue: string) => {
    fetchUserOptions(inputValue);
  };

  const fetchUserOptions = async (inputValue: string) => {
    if (inputValue && inputValue.length > 2) {
      const payload = JSON.stringify({
        data: encryptData({
          filterType: 0,
          userId: "",
          status: 0,
          roleId: CLIENT,
          search: inputValue,
          page: 1,
          limit: 50,
        }),
      });

      axios
        .post(ADMIN_API_ENDPOINT + USER_SEARCH_LIST, payload, {
          headers: {
            Authorization: jwt_token || "",
            "Content-Type": "application/json",
            deviceType: deviceTypeLS || "",
          },
        })
        .then((response) => {
          if (response.data.statusCode == SUCCESS) {
            const rdata = decryptData(response.data.data) as any[];
            const rRes: OptionType[] = rdata.map((item: any) => ({
              label: item.userName,
              value: item.userId,
            }));
            setUserData(rRes);
          } else {
            toastError(response.data.message);
          }
        })
        .catch((error) => {
          toastError(error?.response?.data?.message || "Error");
          console.error("Login error:", error);
        });
    } else {
      setUserData([]);
    }
  };

  const handleGetExchange = async () => {
    const payload = JSON.stringify({
      data: encryptData({
        page: 1,
        limit: 10,
        search: "",
        sortKey: "createdAt",
        sortBy: -1,
      }),
    });

    axios
      .post(ADMIN_API_ENDPOINT + EXCHANGE_LIST, payload, {
        headers: {
          "Content-Type": "application/json",
          deviceType: deviceTypeLS || "",
          Authorization: jwt_token || "",
        },
      })
      .then((response) => {
        if (response.data.statusCode == SUCCESS) {
          const rdata = decryptData(response.data.data) as any[];
          const rRes: OptionType[] = rdata.map((item: any) => ({
            label: item.name,
            value: item.exchangeId,
          }));
          setExchangeData(rRes);
        }
      })
      .catch((error) => console.error("Error fetching exchanges:", error));
  };

  const getDeviceInfo = async () => {
    const userAgent = navigator.userAgent;
    let newDeviceType = /Mobi|Android/i.test(userAgent) ? "mobile" : "desktop";
    let browser = "Unknown";
    if (userAgent.includes("Chrome")) browser = "Chrome";
    else if (userAgent.includes("Firefox")) browser = "Firefox";
    else if (userAgent.includes("Safari")) browser = "Safari";
    else if (userAgent.includes("Edge")) browser = "Edge";

    let newDeviceId = localStorage.getItem("deviceId") || "";
    if (!newDeviceId) {
      newDeviceId = uuidv4();
      localStorage.setItem("deviceId", newDeviceId);
    }

    let deviceType = localStorage.getItem("deviceType") || "";
    if (!deviceType) {
      deviceType = newDeviceType;
      localStorage.setItem("deviceType", deviceType);
    }

    let ip = "";
    try {
      const response = await axios.get("https://api.ipify.org?format=json");
      ip = response.data.ip;
    } catch {
      // ignore
    }
    return { deviceType, browser, userAgent, newDeviceId, ip };
  };

  const submitTrade = async (tradeType: "BUY" | "SELL") => {
    try {
      if (
        !formData.userId?.value ||
        !formData.symbolId?.value ||
        !formData.exchangeId?.value ||
        !formData.price ||
        Number(formData.price) <= 0 ||
        !formData.totalQuantity ||
        Number(formData.totalQuantity) <= 0 ||
        !formData.quantity ||
        Number(formData.quantity) <= 0 ||
        !formData.executionDateTime ||
        !formData.isBrokerageCalculatedOrNot ||
        !formData.manuallyTradeAddedFor
      ) {
        toastError("Please fill in all required fields");
        return;
      }
      setSubmitting(true);

      const { deviceType, browser, userAgent, newDeviceId, ip } =
        await getDeviceInfo();

      const payload = JSON.stringify({
        data: encryptData({
          userId: formData.userId.value,
          parentId: authenticated.userId,
          symbolId: formData.symbolId.value,
          quantity: parseFloat(String(formData.quantity)).toFixed(2),
          totalQuantity: parseFloat(String(formData.totalQuantity)).toFixed(2),
          price: parseFloat(String(formData.price)),
          referencePrice: parseFloat(String(formData.price)),
          lotSize: parseFloat(String(formData.lotSize)),
          tradeType,
          exchangeId: formData.exchangeId.value,
          orderType: formData.orderType,
          productType: INTRADAY,
          executionDateTime: formData.executionDateTime,
          isBrokerageCalculatedOrNot: formData.isBrokerageCalculatedOrNot,
          manuallyTradeAddedFor: formData.manuallyTradeAddedFor.value,
          ipAddress: ip,
          deviceId: newDeviceId,
          userAgent,
          browser,
          deviceType,
        }),
      });

      const res = await apiClient.post(
        MANUALLY_TRADE_SUPER_ADMIN,
        payload,
      );

      if (res.data.statusCode == SUCCESS) {
        toastSuccess(res?.data?.meta?.message || "Trade created");
        const preservedExchange = formData.exchangeId;
        const preservedUser = formData.userId;
        const preservedTime = formData.executionDateTime;

        const nextState = { ...initialFormData };
        nextState.exchangeId = preservedExchange as any;
        nextState.userId = preservedUser as any;
        nextState.executionDateTime = preservedTime;
        setFormData(nextState);

        onCreated();
        onOpenChange(false);
      } else {
        toastError(res.data.message);
      }
    } catch (err: any) {
      toastError(err?.response?.data?.message || "Error");
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (open) handleGetExchange();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Create Manual Trade</DialogTitle>
          <DialogDescription>
            Fill the details to create a manual trade.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* User */}
          <div className="md:col-span-2">
            <Label htmlFor="userId">
              User Name <span className="text-red-500">*</span>
            </Label>
            <div className="mt-2">
              <Select
                inputId="userId"
                value={formData.userId as any}
                onChange={(opt) => handleChangeValueOption(opt, "userId")}
                options={userData}
                onInputChange={(v) => handleInputChange(v)}
                isSearchable
                placeholder="Type to search..."
                classNamePrefix="react-select"
              />
            </div>
          </div>

          {/* Exchange */}
          <div>
            <Label htmlFor="exchangeId">
              Select Exchange <span className="text-red-500">*</span>
            </Label>
            <div className="mt-2">
              <Select
                inputId="exchangeId"
                options={exchangeData}
                value={formData.exchangeId as any}
                onChange={(opt) => handleChangeValueOption(opt, "exchangeId")}
                isLoading={!exchangeData.length}
                classNamePrefix="react-select"
              />
            </div>
          </div>

          {/* Symbol */}
          <div>
            <Label htmlFor="symbolId">
              Select Symbol <span className="text-red-500">*</span>
            </Label>
            <div className="mt-2">
              <Select
                inputId="symbolId"
                options={symbolData}
                value={formData.symbolId as any}
                onChange={(opt) => handleChangeValueOption(opt, "symbolId")}
                isLoading={!!formData.exchangeId && !symbolData.length}
                classNamePrefix="react-select"
              />
            </div>
          </div>

          {/* Quantity / Lot */}
          <div>
            <Label htmlFor="totalQuantity">
              Quantity <span className="text-red-500">*</span>
            </Label>
            <Input
              id="totalQuantity"
              name="totalQuantity"
              type="number"
              min={0}
              value={formData.totalQuantity}
              placeholder="Enter Quantity"
              onChange={handleFormInputChange}
              className="mt-2"
            />
          </div>
          <div>
            <Label htmlFor="quantity">
              Lot <span className="text-red-500">*</span>
            </Label>
            <Input
              id="quantity"
              name="quantity"
              type="number"
              min={0}
              value={formData.quantity}
              placeholder="Enter Lot"
              onChange={handleFormInputChange}
              className="mt-2"
            />
          </div>

          {/* Rate */}
          <div>
            <Label htmlFor="price">
              Rate <span className="text-red-500">*</span>
            </Label>
            <Input
              id="price"
              name="price"
              type="number"
              min={0}
              value={formData.price}
              placeholder="Enter Rate"
              onChange={handleFormInputChange}
              className="mt-2"
            />
          </div>

          {/* Execution time */}
          <div>
            <Label htmlFor="executionDateTime">
              Execution Time <span className="text-red-500">*</span>
            </Label>
            <Input
              id="executionDateTime"
              name="executionDateTime"
              type="datetime-local"
              value={formData.executionDateTime}
              placeholder="Execution Time"
              onChange={handleFormInputChange}
              className="mt-2"
            />
          </div>

          {/* Brokerage calculated? */}
          <div className="md:col-span-2">
            <Label>
              Is Brokerage Calculated Or Not{" "}
              <span className="text-red-500">*</span>
            </Label>
            <div className="mt-2 flex items-center gap-6">
              <label className="inline-flex items-center gap-2">
                <input
                  className="h-4 w-4"
                  id="isBrokerageCalculatedOrNotYes"
                  name="isBrokerageCalculatedOrNot"
                  type="radio"
                  value="1"
                  checked={String(formData.isBrokerageCalculatedOrNot) === "1"}
                  onChange={handleFormInputChange}
                />
                <span>Yes</span>
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  className="h-4 w-4"
                  id="isBrokerageCalculatedOrNotNo"
                  name="isBrokerageCalculatedOrNot"
                  type="radio"
                  value="2"
                  checked={String(formData.isBrokerageCalculatedOrNot) === "2"}
                  onChange={handleFormInputChange}
                />
                <span>No</span>
              </label>
            </div>
          </div>

          {/* Trade display for */}
          <div className="md:col-span-2">
            <Label htmlFor="manuallyTradeAddedFor">
              Trade display for <span className="text-red-500">*</span>
            </Label>
            <div className="mt-2">
              <Select
                inputId="manuallyTradeAddedFor"
                options={MANUALLY_TRADE_ADDED_FOR as any}
                value={formData.manuallyTradeAddedFor as any}
                onChange={(opt) =>
                  handleChangeValueOption(opt, "manuallyTradeAddedFor")
                }
                classNamePrefix="react-select"
              />
            </div>
          </div>
        </div>

        <DialogFooterUI className="mt-6">
          <div className="flex items-center gap-3">
            <Button disabled={submitting} onClick={() => submitTrade("BUY")}>
              {submitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Buy
            </Button>
            <Button
              disabled={submitting}
              variant="destructive"
              onClick={() => submitTrade("SELL")}
            >
              {submitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Sell
            </Button>
          </div>
          <Button
            variant="secondary"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Close
          </Button>
        </DialogFooterUI>
      </DialogContent>
    </Dialog>
  );
}

// =====================================
// Main Page: ManualTradeListPage
// =====================================
export default function ManualTradeListPage() {
  const { channelData } = useSocket();

  const deviceType =
    typeof window !== "undefined" ? localStorage.getItem("deviceType") : "";
  const jwt_token =
    typeof window !== "undefined" ? localStorage.getItem("token") : "";

  const [tableData, setTableData] = useState<TableItem[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);
  const itemsPerPage = 200;

  const [userData, setUserData] = useState<Option[]>([]);
  const [exchangeData, setExchangeData] = useState<Option[]>([]);
  const [symbolData, setSymbolData] = useState<Option[]>([]);
  const [formData, setFormData] = useState<FormData>({
    user: null,
    symbol: null,
    exchange: null,
    startDate: "",
    endDate: "",
  });

  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: null,
    direction: "ascending",
  });

  const [openCreate, setOpenCreate] = useState(false);

  // ---- helpers ----
  const fmtYMD = (d: Date) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const displayRangeText = () => {
    if (formData.startDate && formData.endDate) {
      return `${formData.startDate} → ${formData.endDate}`;
    }
    if (formData.startDate) return `${formData.startDate} →`;
    if (formData.endDate) return `→ ${formData.endDate}`;
    return "Start date → End date";
  };

  const requestSort = (key: string) => {
    let direction: SortConfig["direction"] = "ascending";
    if (sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending";
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: string) =>
    sortConfig.key !== key
      ? "fa-solid fa-sort"
      : sortConfig.direction === "ascending"
      ? "fa-solid fa-sort-up"
      : "fa-solid fa-sort-down";

  const sortedTableData = useMemo(() => {
    const items = [...tableData];
    if (sortConfig.key !== null) {
      items.sort((a: any, b: any) => {
        let aValue: any;
        let bValue: any;

        if (sortConfig.key === "script") {
          const getDisplayName = (item: any) => {
            if (item.exchangeName?.toLowerCase() === "usstock")
              return item.symbolName;
            if (item.exchangeName?.toLowerCase() === "ce/pe")
              return item.symbolTitle;
            return item.masterName;
          };
          aValue = getDisplayName(a);
          bValue = getDisplayName(b);
        } else {
          aValue = a[sortConfig.key as keyof TableItem];
          bValue = b[sortConfig.key as keyof TableItem];
        }

        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;

        if (typeof aValue === "string") {
          return sortConfig.direction === "ascending"
            ? String(aValue).localeCompare(String(bValue))
            : String(bValue).localeCompare(String(aValue));
        } else {
          if (aValue < bValue)
            return sortConfig.direction === "ascending" ? -1 : 1;
          if (aValue > bValue)
            return sortConfig.direction === "ascending" ? 1 : -1;
          return 0;
        }
      });
    }
    return items;
  }, [tableData, sortConfig]);

  // ---------- API calls ----------
  const fetchDataFromAPI = async (reset: number, pageArg?: number) => {
    try {
      const page = pageArg ?? currentPage;
      let payload: any = {
        search: "",
        userId: formData?.user?.value ?? "",
        symbolId: formData?.symbol?.value ?? "",
        exchangeId: formData?.exchange?.value ?? "",
        status: EXECUTED,
        startDate: formData?.startDate ?? "",
        endDate: formData?.endDate ?? "",
        manualTrade: "yes",
        page,
        limit: itemsPerPage,
      };

      if (reset === 1) {
        payload = {
          search: "",
          userId: "",
          symbolId: "",
          exchangeId: "",
          status: EXECUTED,
          startDate: "",
          endDate: "",
          manualTrade: "yes",
          page,
          limit: itemsPerPage,
        };
      }

      const data = JSON.stringify({ data: encryptData(payload) });

      axios
        .post(ADMIN_API_ENDPOINT + MANUALLY_TRADE_LIST, data, {
          headers: {
            Authorization: jwt_token || "",
            "Content-Type": "application/json",
            deviceType: deviceType || "",
          },
        })
        .then((response) => {
          if (response.data.statusCode == SUCCESS) {
            const rdata = decryptData(response.data.data) as TableItem[];
            setTableData(rdata);
            setTotalPages(response.data.meta.totalPage);
            setTotalCount(response.data.meta.totalCount);
          } else {
            toastError(response.data.message);
          }
        })
        .catch((error) => {
          toastError(error?.response?.data?.message || "Request failed");
          console.error("Fetch error:", error);
        });
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const handleGetExchange = async () => {
    const data = JSON.stringify({
      data: encryptData({
        page: 1,
        limit: 100,
        search: "",
        sortKey: "createdAt",
        sortBy: -1,
      }),
    });

    axios
      .post(ADMIN_API_ENDPOINT + EXCHANGE_LIST, data, {
        headers: {
          "Content-Type": "application/json",
          deviceType: deviceType || "",
          Authorization: jwt_token || "",
        },
      })
      .then((response) => {
        if (response.data.statusCode == SUCCESS) {
          const rdata = decryptData(response.data.data) as Array<{
            name: string;
            exchangeId: string;
          }>;
          setExchangeData(
            rdata.map((i) => ({ label: i.name, value: i.exchangeId }))
          );
        }
      })
      .catch((error) => console.error("Error fetching exchanges:", error));
  };

  const fetchOptions = async (inputValue: string) => {
    if (inputValue && inputValue.length > 2) {
      try {
        const data = JSON.stringify({
          data: encryptData({
            filterType: 0,
            roleId: "",
            userId: "",
            status: 0,
            search: inputValue,
            page: 1,
            limit: 50,
          }),
        });

        axios
          .post(ADMIN_API_ENDPOINT + USER_SEARCH_LIST, data, {
            headers: {
              Authorization: jwt_token || "",
              "Content-Type": "application/json",
              deviceType: deviceType || "",
            },
          })
          .then((response) => {
            if (response.data.statusCode == SUCCESS) {
              const rdata = decryptData(response.data.data) as Array<{
                userName: string;
                userId: string;
              }>;
              setUserData(
                rdata.map((u) => ({ label: u.userName, value: u.userId }))
              );
            } else {
              toastError(response.data.message);
            }
          })
          .catch((error) => {
            toastError(error?.response?.data?.message || "Request failed");
            console.error("Login error:", error);
          });
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    } else {
      setUserData([]);
    }
  };

  const handleChangeValueOption = (
    selectedOption: Option | null,
    name: keyof FormData
  ) => {
    setFormData((prev) => ({ ...prev, [name]: selectedOption as any }));

    if (name === "exchange" && selectedOption) {
      const data = JSON.stringify({
        data: encryptData({
          page: 1,
          limit: 1000,
          search: "",
          exchangeId: selectedOption.value,
          sortKey: "createdAt",
          sortBy: -1,
        }),
      });

      axios
        .post(ADMIN_API_ENDPOINT + SYMBOL_LIST, data, {
          headers: {
            "Content-Type": "application/json",
            deviceType: deviceType || "",
            Authorization: jwt_token || "",
          },
        })
        .then((response) => {
          if (response.data.statusCode == SUCCESS) {
            const rdata = decryptData(response.data.data) as Array<{
              symbolName: string;
              symbolId: string;
            }>;
            setSymbolData(
              rdata.map((s) => ({ label: s.symbolName, value: s.symbolId }))
            );
          }
        })
        .catch((error) => console.error("Error fetching symbols:", error));

      // clear symbol when exchange changes
      setFormData((prev) => ({ ...prev, symbol: null }));
    }
  };

  const handleFilter = () => {
    setCurrentPage(1);
    fetchDataFromAPI(0, 1);
  };

  const handleReset = () => {
    setFormData({
      user: null,
      symbol: null,
      exchange: null,
      startDate: "",
      endDate: "",
    });
    setUserData([]);
    setSymbolData([]);
    setCurrentPage(1);
    fetchDataFromAPI(1, 1);
  };

  const exportToExcel = () => {
    if (sortedTableData.length === 0) {
      // Optional toast: toastError("No data to export");
      return;
    }
    const table = document.getElementById("myTable");
    if (!table) return;
    const worksheet = XLSX.utils.table_to_sheet(table);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
    XLSX.writeFile(workbook, "TradeData.xlsx");
  };

  // ---- socket merge ----
  useEffect(() => {
    if (channelData) {
      if ((channelData as any)?.trade) {
        const trade = (channelData as any).trade as any;
        if (trade?.status === EXECUTED) {
          setTableData((prev) => {
            const exists = prev.some((p) => p.tradeId === trade.tradeId);
            return exists ? prev : [trade, ...prev];
          });
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
  }, [channelData]);

  // initial + paginate
  useEffect(() => {
    fetchDataFromAPI(0);
    handleGetExchange();
    document.title = "Manual Trade List";
    return () => {
      document.title = "Admin Panel";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  const safeTotalPages = Math.max(1, totalPages || 0);

  return (
    <div className=" overflow-y-auto h-full bg-[#181a20]">
      <CardContent className="space-y-4">
        <div className=" pb-2 mt-2">
          <div className="flex flex-nowrap items-end gap-3 min-w-max">
            {/* Date Range */}
            <div className="flex flex-col gap-1 shrink-0">
              <Label style={{ color: "#848E9C" }}>Date Range</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-10 w-[260px] justify-start"
                    style={{
                      backgroundColor: "#2b3139",
                      borderColor: "#2b3139",
                      color: "#eaecef",
                      boxShadow: "none",
                    }}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 opacity-70" />
                    <span className="truncate">{displayRangeText()}</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  align="start"
                  className="p-0"
                  style={{ backgroundColor: "#2b3139", border: "none" }}
                >
                  <Calendar
                    mode="range"
                    selected={{
                      from: formData.startDate
                        ? new Date(formData.startDate)
                        : undefined,
                      to: formData.endDate
                        ? new Date(formData.endDate)
                        : undefined,
                    }}
                    onSelect={(val) => {
                      setFormData((prev) => ({
                        ...prev,
                        startDate: val?.from ? fmtYMD(val.from) : "",
                        endDate: val?.to ? fmtYMD(val.to) : "",
                      }));
                    }}
                    numberOfMonths={2}
                    pagedNavigation
                    showOutsideDays
                    style={{ backgroundColor: "#2b3139" }}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* User */}
            <div className="flex flex-col gap-1 shrink-0">
              <Label style={{ color: "#fff" }}>User Name</Label>
              <SearchableSelect
                value={formData.user}
                options={userData}
                onSelect={(opt) => handleChangeValueOption(opt, "user")}
                onSearch={(q) => fetchOptions(q)}
                placeholder="Type to search..."
                emptyText="No users."
                triggerClassName="h-10 w-[200px]"
              />
            </div>

            {/* Exchange */}
            <div className="flex flex-col gap-1 shrink-0">
              <Label style={{ color: "#fff" }}>Exchange</Label>
              <SearchableSelect
                value={formData.exchange}
                options={exchangeData}
                onSelect={(opt) => handleChangeValueOption(opt, "exchange")}
                placeholder="Select exchange"
                emptyText="No exchanges."
                isLoading={!exchangeData.length}
                triggerClassName="h-10 w-[180px]"
              />
            </div>

            {/* Symbols */}
            <div className="flex flex-col gap-1 shrink-0">
              <Label style={{ color: "#fff" }}>Symbols</Label>
              <SearchableSelect
                value={formData.symbol}
                options={symbolData}
                onSelect={(opt) => handleChangeValueOption(opt, "symbol")}
                placeholder="Select symbol"
                emptyText="No symbols."
                isLoading={!!formData.exchange && !symbolData.length}
                disabled={!formData.exchange}
                triggerClassName="h-10 w-[220px]"
              />
            </div>

            {/* Actions */}
            <div className="flex items-end gap-2 shrink-0 pl-2">
              <Button
                variant="outline"
                onClick={exportToExcel}
                className="gap-2 bg-[#fcd535] text-black hover:bg-[#fcd535] "
              >
                <Download className="h-3 w-3 mr-1" /> Export
              </Button>
              <Button
                onClick={handleFilter}
                className="gap-2 bg-[#fcd535] text-black hover:bg-[#fcd535] "
              >
                View
              </Button>
              <Button
                variant="destructive"
                onClick={handleReset}
                style={{ backgroundColor: "#e74c3c", boxShadow: "none" }}
              >
                Reset
              </Button>
              <Button
                onClick={() => setOpenCreate(true)}
                style={{
                  backgroundColor: "#2b3139",
                  color: "#eaecef",
                  boxShadow: "none",
                }}
              >
                Create
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-1 flex items-center justify-end" />
      </CardContent>

      <CardContent className="p-1">
        <div className="overflow-x-auto">
          <Table id="myTable">
            <TableHeader>
              <TableRow style={{ backgroundColor: "#2b3139" }}>
                <TableHead
                  className="min-w-[140px] cursor-pointer"
                  onClick={() => requestSort("sequence")}
                  style={{ color: "#848E9C" }}
                >
                  ORDER ID <i className={getSortIcon("sequence")} />
                </TableHead>
                <TableHead
                  className="cursor-pointer"
                  onClick={() => requestSort("userName")}
                  style={{ color: "#848E9C" }}
                >
                  U.NAME <i className={getSortIcon("userName")} />
                </TableHead>
                <TableHead
                  className="cursor-pointer"
                  onClick={() => requestSort("parentUserName")}
                  style={{ color: "#848E9C" }}
                >
                  P.USER <i className={getSortIcon("parentUserName")} />
                </TableHead>
                <TableHead
                  className="cursor-pointer"
                  onClick={() => requestSort("exchangeName")}
                  style={{ color: "#848E9C" }}
                >
                  EXCH <i className={getSortIcon("exchangeName")} />
                </TableHead>
                <TableHead
                  className="cursor-pointer"
                  onClick={() => requestSort("symbolTitle")}
                  style={{ color: "#848E9C" }}
                >
                  SYMBOL <i className={getSortIcon("symbolTitle")} />
                </TableHead>
                <TableHead
                  className="cursor-pointer"
                  onClick={() => requestSort("createdAt")}
                  style={{ color: "#848E9C" }}
                >
                  ORDER D/T <i className={getSortIcon("createdAt")} />
                </TableHead>
                <TableHead style={{ color: "#848E9C" }}>B/S</TableHead>
                <TableHead
                  className="cursor-pointer"
                  onClick={() => requestSort("totalQuantity")}
                  style={{ color: "#848E9C" }}
                >
                  QTY <i className={getSortIcon("totalQuantity")} />
                </TableHead>
                <TableHead
                  className="cursor-pointer"
                  onClick={() => requestSort("quantity")}
                  style={{ color: "#848E9C" }}
                >
                  LOT <i className={getSortIcon("quantity")} />
                </TableHead>
                <TableHead style={{ color: "#848E9C" }}>TYPE</TableHead>
                <TableHead
                  className="cursor-pointer"
                  onClick={() => requestSort("profitLoss")}
                  style={{ color: "#848E9C" }}
                >
                  P/L <i className={getSortIcon("profitLoss")} />
                </TableHead>
                <TableHead
                  className="cursor-pointer"
                  onClick={() => requestSort("price")}
                  style={{ color: "#848E9C" }}
                >
                  TRADE PRICE <i className={getSortIcon("price")} />
                </TableHead>
                <TableHead
                  className="cursor-pointer"
                  onClick={() => requestSort("brokerageAmount")}
                  style={{ color: "#848E9C" }}
                >
                  BRK <i className={getSortIcon("brokerageAmount")} />
                </TableHead>
                <TableHead
                  className="cursor-pointer"
                  onClick={() => requestSort("executionDateTime")}
                  style={{ color: "#848E9C" }}
                >
                  EXECUTION D/T{" "}
                  <i className={getSortIcon("executionDateTime")} />
                </TableHead>
                <TableHead
                  className="cursor-pointer"
                  onClick={() => requestSort("referencePrice")}
                  style={{ color: "#848E9C" }}
                >
                  R. PRICE <i className={getSortIcon("referencePrice")} />
                </TableHead>
                <TableHead
                  className="cursor-pointer"
                  onClick={() => requestSort("ipAddress")}
                  style={{ color: "#848E9C" }}
                >
                  IP ADDRESS <i className={getSortIcon("ipAddress")} />
                </TableHead>
                <TableHead
                  className="cursor-pointer"
                  onClick={() => requestSort("deviceId")}
                  style={{ color: "#848E9C" }}
                >
                  DEVICE ID <i className={getSortIcon("deviceId")} />
                </TableHead>
                <TableHead style={{ color: "#848E9C" }} />
              </TableRow>
            </TableHeader>

            <TableBody>
              {sortedTableData.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={18}
                    className="h-32 text-center text-sm"
                    style={{ color: "#9ca3af" }}
                  >
                    No data available
                  </TableCell>
                </TableRow>
              ) : (
                sortedTableData.map((item, idx) => (
                  <TableRow key={idx} style={{ color: "#eaecef" }}>
                    <TableCell>{item.sequence}</TableCell>
                    <TableCell>{item.userName}</TableCell>
                    <TableCell>{item.parentUserName}</TableCell>
                    <TableCell>{item.exchangeName}</TableCell>
                    <TableCell>
                      <div
                        className="truncate max-w-[220px]"
                        title={item.symbolTitle}
                      >
                        {item.symbolTitle}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div
                        className="truncate max-w-[220px]"
                        title={formatDateTime(item.createdAt)}
                      >
                        {formatDateTime(item.createdAt)}
                      </div>
                    </TableCell>
                    <TableCell>{item.tradeType}</TableCell>
                    <TableCell>{item.totalQuantity.toFixed(2)}</TableCell>
                    <TableCell>{item.quantity.toFixed(2)}</TableCell>
                    <TableCell>{item.productTypeValue}</TableCell>
                    <TableCell>{item.profitLoss.toFixed(2)}</TableCell>
                    <TableCell>
                      {formatValue(item.price, item.exchangeName)}
                    </TableCell>
                    <TableCell>{item.brokerageAmount.toFixed(2)}</TableCell>
                    <TableCell>
                      <div
                        className="truncate max-w-[220px]"
                        title={formatDateTime(item.executionDateTime)}
                      >
                        {formatDateTime(item.executionDateTime)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {formatValue(item.referencePrice, item.exchangeName)}
                    </TableCell>
                    <TableCell>{item.ipAddress}</TableCell>
                    <TableCell>
                      <div
                        className="truncate max-w-[220px]"
                        title={item.deviceId}
                      >
                        {item.deviceId}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "font-medium",
                          item.m2mTotal > 0 ? "text-green-600" : "text-red-600"
                        )}
                      >
                        {item.m2mTotal}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex justify-end p-4">
          <nav>
            <ul className="flex items-center gap-2">
              <li>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  style={{
                    backgroundColor: "#2b3139",
                    borderColor: "#2b3139",
                    color: "#eaecef",
                    boxShadow: "none",
                  }}
                >
                  Previous
                </Button>
              </li>
              {Array.from({ length: safeTotalPages }, (_, i) => i + 1).map(
                (page) => (
                  <li key={page}>
                    <Button
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                      style={{
                        backgroundColor:
                          currentPage === page ? "#fcd535" : "#2b3139",
                        color: currentPage === page ? "#000" : "#eaecef",
                        borderColor: "#2b3139",
                        boxShadow: "none",
                      }}
                    >
                      {page}
                    </Button>
                  </li>
                )
              )}
              <li>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((p) => Math.min(safeTotalPages, p + 1))
                  }
                  disabled={currentPage === safeTotalPages}
                  style={{
                    backgroundColor: "#2b3139",
                    borderColor: "#2b3139",
                    color: "#eaecef",
                    boxShadow: "none",
                  }}
                >
                  Next
                </Button>
              </li>
            </ul>
          </nav>
        </div>
      </CardContent>

      {/* The Create popup */}
      <CreateManualTradeDialog
        open={openCreate}
        onOpenChange={setOpenCreate}
        onCreated={() => {
          setCurrentPage(1);
          fetchDataFromAPI(0, 1);
        }}
      />
    </div>
  );
}
