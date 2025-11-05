"use client";
import apiClient from "@/lib/axiosInstance";

import React, { Fragment, useEffect, useMemo, useRef, useState } from "react";
import Select from "react-select";
import {
  ADMIN,
  ADMIN_API_ENDPOINT,
  CLIENT,
  SELL,
  SUCCESS,
  SUPER_ADMIN,
  USER_SEARCH_LIST,
  USER_WISE_PROFIT_LOSS_LIST,
} from "@/constant/index";
import { decryptData, encryptData } from "@/hooks/crypto";
import {
  formatDateForExportExcelName,
  getCurrentWeekRange,
  getTodayRange,
} from "@/hooks/dateUtils";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";
import ChildList from "@/components/reports/ChildList";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import { useDispatch, useSelector } from "react-redux";
import { useWebSocket } from "@/components/socket/WebSocketProvider";
import webSocketManager from "@/components/socket/WebSocketManager";
import { addItem } from "@/hooks/arraySlice";


import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Download,
  Eye,
  X,
  UserRound,
  Phone as PhoneIcon,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Wallet,
  Gift,
  Activity,
} from "lucide-react";

// -------------------------------
// Types
// -------------------------------
type RootState = { array: string[] };

type AuthenticatedUser = {
  userId: string;
  userName: string;
  role: number | string;
};

type SymbolQuote = { name: string; bid: number; ask: number };

type ChildPosition = {
  symbolName: string;
  tradeType: string;
  totalQuantity: number;
  price: number;
  m2m?: number;
};

type UserPLItem = {
  userId: string;
  role: number | string;
  userName?: string;
  name: string;
  phone?: string;

  totalDeposit: number;
  totalWithdraw: number;
  totalBonus?: number;
  profitLoss?: number;
  childUserProfitLossTotal?: number;
  brokerageTotal?: number;
  childUserBrokerageTotal?: number;
  parentBrokerageTotal?: number;
  profitAndLossSharing?: number;
  profitAndLossSharingDownLine?: number;

  childUserDataPosition: ChildPosition[];
  symbolData: SymbolQuote[];

  netpl?: number;
  m2mTotal?: number;
  our?: number;
  total?: number;
  rpl?: number;
  dwBalance?: number;
  netPLBalance?: number;
};

type SortConfig = {
  key: keyof Partial<UserPLItem> | null;
  direction: "ascending" | "descending";
};

type SelectOption = { label: string; value: string };

// -------------------------------
// Component
// -------------------------------
const Account: React.FC = () => {
  type TickDataType = { data?: { symbol: string; bid: number; ask: number } };
  const { tickData } = useWebSocket() as { tickData?: TickDataType };
  const dispatch = useDispatch();

  const deviceType =
    typeof window !== "undefined"
      ? localStorage.getItem("deviceType") || ""
      : "";
  const jwt_token =
    typeof window !== "undefined" ? localStorage.getItem("token") || "" : "";
  const authenticated: AuthenticatedUser =
    typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem("authenticated") || "{}")
      : ({} as any);

  const array = useSelector((state: RootState) => state.array);

  const pendingSymbolsRef = useRef<Set<string>>(new Set());
  const queueSymbol = (symbolName: string) => {
    if (!array.includes(symbolName)) pendingSymbolsRef.current.add(symbolName);
  };

  const [plData, setPLData] = useState<UserPLItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [sheetOpen, setSheetOpen] = useState<boolean>(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUserName, setSelectedUserName] = useState<string>("");

  const [totalDepositTotal, setTotalDepositTotal] = useState<string>("0.00");
  const [totalBonusTotal, setTotalBonusTotal] = useState<string>("0.00");
  const [totalWithdrawTotal, setTotalWithdrawTotal] = useState<string>("0.00");
  const [dwBalanceTotal, setDwBalanceTotal] = useState<string>("0.00");
  const [m2mTotalTotal, setM2mTotalTotal] = useState<string>("0.00");
  const [rpTotal, setRpTotal] = useState<string>("0.00");
  const [netPLBalanceTotal, setNetPLBalanceTotal] = useState<string>("0.00");

  // group totals (already used in export)
  const [netplTotal, setNetplTotal] = useState<number>(0);
  const [ourTotal, setOurTotal] = useState<number>(0);
  const [brkTotal, setBrkTotal] = useState<number>(0);
  const [m2mGTotal, setM2mGTotal] = useState<number>(0);
  const [releasePLTotal, setReleasePLTotal] = useState<number>(0);
  const [brokerageGTotal, setBrokerageGTotal] = useState<number>(0);
  const [plShareTotal, setPlShareTotal] = useState<number>(0);

  const { startDate, endDate } = getCurrentWeekRange();
  const [userData, setUserData] = useState<SelectOption[]>([]);
  const [formFilterData, setFormFilterData] = useState<{
    startDate: string;
    endDate: string;
    user: SelectOption | null | undefined;
  }>({
    startDate,
    endDate,
    user: undefined,
  });

  const [searchInputValue, setSearchInputValue] = useState<string>("");
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: null,
    direction: "ascending",
  });

  const tableRef = useRef<HTMLTableElement | null>(null);

  // ─────────────────────────────────────────────────────────────
  // Sorting helpers
  // ─────────────────────────────────────────────────────────────
  const requestSort = (key: keyof UserPLItem) => {
    setSortConfig((prev) => ({
      key,
      direction:
        prev.key === key && prev.direction === "ascending"
          ? "descending"
          : "ascending",
    }));
  };

  const SortIcon = ({ col }: { col: keyof UserPLItem }) => {
    if (sortConfig.key !== col)
      return <ArrowUpDown className="h-3.5 w-3.5 opacity-60" />;
    return sortConfig.direction === "ascending" ? (
      <ArrowUp className="h-3.5 w-3.5" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5" />
    );
  };

  // ─────────────────────────────────────────────────────────────
  // Filters
  // ─────────────────────────────────────────────────────────────
  const handleReset = async () => {
    setFormFilterData((prev) => ({
      ...prev,
      user: undefined,
      startDate: "",
      endDate: "",
    }));
    setUserData([]);
    fetchDataFromAPI(0);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormFilterData((prev) => ({ ...prev, [name]: value }));
  };

  const handleChangeValueOption = (
    selectedOption: SelectOption | null,
    name: "user"
  ) => {
    setFormFilterData((prev) => ({
      ...prev,
      [name]: selectedOption || undefined,
    }));
  };

  // ─────────────────────────────────────────────────────────────
  // API
  // ─────────────────────────────────────────────────────────────
  const fetchOptions = async (inputValue: string) => {
    if (!inputValue || inputValue.length < 3) {
      setUserData([]);
      return;
    }
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
      const payload = JSON.stringify({ data });
      const response = await apiClient.post(
        USER_SEARCH_LIST,
        payload,
      );
      if (response.data.statusCode === SUCCESS) {
        const rdata: Array<{ userName: string; userId: string }> = decryptData(
          response.data.data
        );
        setUserData(
          rdata.map((it) => ({
            label: it.userName,
            value: it.userId,
          }))
        );
      } else {
        toast.error(response.data.message);
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Error");
      console.error("fetchOptions error:", error);
    }
  };

  const socketData = (userPLDataN: UserPLItem[]) => {
    let ourTotalLocal = 0;
    let m2mLocal = 0;
    let netplLocal = 0;
    let brkLocal = 0;
    let rplLocal = 0;

    const newData = userPLDataN.map((userItem) => {
      const symbolData = userItem.symbolData || [];

      for (let i = 0; i < userItem.childUserDataPosition.length; i++) {
        const pos = userItem.childUserDataPosition[i];
        queueSymbol(pos.symbolName);

        const matchSymbol = symbolData.find((s) => s.name === pos.symbolName);
        if (!matchSymbol) {
          pos.m2m = 0;
          continue;
        }

        if (pos.tradeType === SELL && pos.totalQuantity > 0) {
          pos.m2m =
            (Number(pos.price.toFixed(2)) - matchSymbol.ask) *
            pos.totalQuantity;
        } else {
          if (pos.totalQuantity < 0) {
            pos.m2m =
              (matchSymbol.ask - Number(pos.price.toFixed(2))) *
              pos.totalQuantity;
          } else {
            pos.m2m =
              (matchSymbol.bid - Number(pos.price.toFixed(2))) *
              pos.totalQuantity;
          }
        }
      }

      let m2mPln = 0;
      userItem.childUserDataPosition.forEach(
        (p) => (m2mPln += Number(p.m2m || 0))
      );

      const ourP =
        userItem.role === CLIENT
          ? Number(userItem.profitAndLossSharingDownLine || 0)
          : Number(userItem.profitAndLossSharing || 0);

      const profitLoss =
        userItem.role === CLIENT
          ? Number(userItem.profitLoss || 0)
          : Number(userItem.childUserProfitLossTotal || 0);

      const brokerageTotal =
        userItem.role === CLIENT
          ? Number(userItem.brokerageTotal || 0)
          : Number(userItem.childUserBrokerageTotal || 0);

      const rTo = profitLoss - brokerageTotal;
      const netpl = m2mPln + rTo;

      let our = ((m2mPln + profitLoss) * ourP) / 100;
      our = our * -1;
      our = our + Number(userItem.parentBrokerageTotal || 0);
      ourTotalLocal += our;

      const dwBalanceNum =
        Number(userItem.totalDeposit) - Number(userItem.totalWithdraw);
      const netPLBalanceNum = dwBalanceNum + m2mPln + profitLoss;
      const total = netpl + our;

      // group totals
      m2mLocal += m2mPln;
      rplLocal += profitLoss;
      brkLocal += brokerageTotal;
      netplLocal += netpl;

      return {
        ...userItem,
        netpl,
        m2mTotal: m2mPln,
        our,
        total,
        rpl: profitLoss,
        dwBalance: dwBalanceNum,
        netPLBalance: netPLBalanceNum,
      };
    });

    setM2mGTotal(m2mLocal);
    setNetplTotal(netplLocal);
    setOurTotal(ourTotalLocal);
    setBrokerageGTotal(brkLocal);
    setReleasePLTotal(rplLocal);

    setPLData(newData);
  };

  const fetchDataFromAPI = async (withDateRange: 0 | 1 = 0) => {
    try {
      setLoading(true);
      const basePayload: any = {
        userId: formFilterData?.user?.value
          ? formFilterData.user.value
          : authenticated.userId,
        page: 1,
        limit: 1000,
        dwrStatus: 1,
        search: searchInputValue ? searchInputValue : "",
      };

      if (!withDateRange) {
        basePayload.startDate = formFilterData.startDate;
        basePayload.endDate = formFilterData.endDate;
      } else {
        const { startDate: sd, endDate: ed } = getTodayRange();
        basePayload.startDate = sd;
        basePayload.endDate = ed;
      }

      const data = encryptData(basePayload);
      const payload = JSON.stringify({ data });

      const response = await apiClient.post(
        USER_WISE_PROFIT_LOSS_LIST,
        payload,
      );

      if (response.data.statusCode === SUCCESS) {
        const userPLDataN: UserPLItem[] = decryptData(response.data.data);
        socketData(userPLDataN);
      } else {
        toast.error(response.data.message);
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Error");
      console.error("fetchDataFromAPI error:", error);
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    if (!plData || plData.length === 0) {
      alert("No data available to export.");
      return false;
    }

    setLoading(true);
    try {
      const rows = plData.map((item) => {
        const sharePct =
          item.role === CLIENT
            ? Number(item.profitAndLossSharingDownLine ?? 0)
            : Number(item.profitAndLossSharing ?? 0);

        const brk =
          item.role === CLIENT
            ? Number(item.brokerageTotal ?? 0)
            : Number(item.childUserBrokerageTotal ?? 0);

        const rpl =
          item.role === CLIENT
            ? Number(item.profitLoss ?? 0)
            : Number(item.childUserProfitLossTotal ?? 0);

        return {
          "User Name": item.userName ?? item.name,
          "%": Number.isFinite(sharePct) ? sharePct : 0,
          M2M: Number(item.m2mTotal ?? 0),
          BRK: Number(brk),
          "Release P/L": Number(rpl),
          "NET P/L": Number(item.netpl ?? 0),
          "OUR BRK": Number(item.parentBrokerageTotal ?? 0),
          "OUR %": Number(item.our ?? 0),
        };
      });

      rows.push({} as any);

      const adminLabel =
        authenticated.role === ADMIN || authenticated.role === SUPER_ADMIN
          ? "Admin"
          : "";

      rows.push({
        "User Name": adminLabel,
        "%": Number(plShareTotal ?? 0),
        M2M: Number(m2mGTotal ?? 0),
        BRK: Number(brokerageGTotal ?? 0),
        "Release P/L": Number(releasePLTotal ?? 0),
        "NET P/L": Number(netplTotal ?? 0),
        "OUR BRK": Number(brkTotal ?? 0),
        "OUR %": Number(ourTotal ?? 0),
      } as any);

      const headers = [
        "User Name",
        "%",
        "M2M",
        "BRK",
        "Release P/L",
        "NET P/L",
        "OUR BRK",
        "OUR %",
      ] as const;

      const worksheet = XLSX.utils.json_to_sheet(rows, {
        header: headers as unknown as string[],
        skipHeader: false,
      });

      worksheet["!cols"] = [
        { wch: 24 },
        { wch: 8 },
        { wch: 14 },
        { wch: 14 },
        { wch: 16 },
        { wch: 14 },
        { wch: 14 },
        { wch: 12 },
      ];

      if (worksheet["!ref"]) {
        worksheet["!autofilter"] = { ref: worksheet["!ref"] };
        const range = XLSX.utils.decode_range(worksheet["!ref"]);
        for (let R = range.s.r + 1; R <= range.e.r; ++R) {
          for (let C = 1; C <= 7; ++C) {
            const addr = XLSX.utils.encode_cell({ r: R, c: C });
            const cell = worksheet[addr];
            if (!cell) continue;
            if (typeof cell.v === "number" && !isNaN(cell.v)) {
              cell.t = "n";
              cell.z = "#,##0.00";
            }
          }
          const addrPct = XLSX.utils.encode_cell({ r: R, c: 1 });
          const cellPct = worksheet[addrPct];
          if (cellPct && typeof cellPct.v === "number" && !isNaN(cellPct.v)) {
            cellPct.t = "n";
            cellPct.z = "0.00";
          }
        }
      }

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "ProfitLoss");

      const now = new Date();
      const excelBuffer = XLSX.write(workbook, {
        bookType: "xlsx",
        type: "array",
      });
      const blob = new Blob([excelBuffer], {
        type: "application/octet-stream",
      });

      const userName = (authenticated?.userName || "USER").toUpperCase();
      const fileName = `${userName}PROFITLOSS${formatDateForExportExcelName(
        now
      )}.xlsx`;

      saveAs(blob, fileName);
      return true;
    } catch (err) {
      console.error("Excel export failed:", err);
      toast.error("Failed to export Excel");
      return false;
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // Tick updates
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const t = tickData?.data;
    if (!t) return;

    setPLData((prev) =>
      prev.map((userItem) => {
        let m2mPln = 0;

        const nextPositions = userItem.childUserDataPosition.map((pos) => {
          let nextM2M = pos.m2m ?? 0;

          if (pos.symbolName === t.symbol) {
            const price = Number(pos.price.toFixed(2));
            if (pos.tradeType === SELL && pos.totalQuantity > 0) {
              nextM2M = (price - Number(t.ask)) * pos.totalQuantity;
            } else if (pos.totalQuantity < 0) {
              nextM2M = (Number(t.ask) - price) * pos.totalQuantity;
            } else {
              nextM2M = (Number(t.bid) - price) * pos.totalQuantity;
            }
          }

          m2mPln += Number(nextM2M || 0);
          return { ...pos, m2m: nextM2M };
        });

        const ourP =
          userItem.role === CLIENT
            ? Number(userItem.profitAndLossSharingDownLine || 0)
            : Number(userItem.profitAndLossSharing || 0);

        const profitLoss =
          userItem.role === CLIENT
            ? Number(userItem.profitLoss || 0)
            : Number(userItem.childUserProfitLossTotal || 0);

        const brokerageTotal =
          userItem.role === CLIENT
            ? Number(userItem.brokerageTotal || 0)
            : Number(userItem.childUserBrokerageTotal || 0);

        const rTo = profitLoss - brokerageTotal;
        const netpl = m2mPln + rTo;

        let our = ((m2mPln + profitLoss) * ourP) / 100;
        our = our * -1;
        our = our + Number(userItem.parentBrokerageTotal || 0);

        const total = netpl + our;
        const dwBalanceNum =
          Number(userItem.totalDeposit) - Number(userItem.totalWithdraw);
        const netPLBalanceNum = dwBalanceNum + m2mPln + profitLoss;

        return {
          ...userItem,
          childUserDataPosition: nextPositions,
          netpl,
          m2mTotal: m2mPln,
          our,
          total,
          rpl: profitLoss,
          dwBalance: dwBalanceNum,
          netPLBalance: netPLBalanceNum,
        };
      })
    );
  }, [tickData]);

  // first fetch (today's)
  useEffect(() => {
    (async () => {
      const { startDate: sd, endDate: ed } = getTodayRange();
      document.title = "Admin Panel | Account Report";
      setTimeout(() => fetchDataFromAPI(1), 150);
      return () => {
        document.title = "Admin Panel";
      };
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  function formatINRShort(input?: number | string | null) {
    const n = Number(input ?? 0);
    if (!isFinite(n)) return "0.00";
    const sign = n < 0 ? "-" : "";
    const abs = Math.abs(n);

    if (abs >= 1e7) return `${sign}${(abs / 1e7).toFixed(2)} Cr`;
    if (abs >= 1e5) return `${sign}${(abs / 1e5).toFixed(2)} L`;
    if (abs >= 1e3) return `${sign}${(abs / 1e3).toFixed(2)} K`;
    return `${sign}${abs.toFixed(2)}`;
  }

  // compute running totals for top stat chips + sticky total row
  useEffect(() => {
    let depositTotal = 0;
    let withdrawTotal = 0;
    let dwBalanceTotalNum = 0;
    let m2mTotalNum = 0;
    let rpTotalNum = 0;
    let netPLBalanceTotalNum = 0;
    let bonusTotal = 0;

    plData.forEach((item) => {
      depositTotal += Number(item.totalDeposit || 0);
      bonusTotal += Number(item.totalBonus || 0);
      withdrawTotal += Number(item.totalWithdraw || 0);
      dwBalanceTotalNum += Number(item.dwBalance || 0);
      m2mTotalNum += Number(item.m2mTotal || 0);
      rpTotalNum +=
        item.role === CLIENT
          ? Number(item.profitLoss || 0)
          : Number(item.childUserProfitLossTotal || 0);
      netPLBalanceTotalNum += Number(item.netPLBalance || 0);
    });

    setTotalDepositTotal(depositTotal.toFixed(2));
    setTotalBonusTotal(bonusTotal.toFixed(2));
    setTotalWithdrawTotal(withdrawTotal.toFixed(2));
    setDwBalanceTotal(dwBalanceTotalNum.toFixed(2));
    setM2mTotalTotal(m2mTotalNum.toFixed(2));
    setRpTotal(rpTotalNum.toFixed(2));
    setNetPLBalanceTotal(netPLBalanceTotalNum.toFixed(2));
  }, [plData]);

  // subscribe newly queued symbols
  useEffect(() => {
    if (pendingSymbolsRef.current.size > 0) {
      pendingSymbolsRef.current.forEach((s) => dispatch(addItem(s)));
      pendingSymbolsRef.current.clear();
      webSocketManager.sendSymbols([...new Set(array)]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plData]);

  const openUserBottomBar = (userId: string, userName: string) => {
    setSelectedUserId(userId);
    setSelectedUserName(userName);
    setSheetOpen(true);
  };

  const sortedPlData = useMemo(() => {
    let items = [...plData];

    if (searchInputValue.trim() !== "") {
      const q = searchInputValue.toLowerCase();
      items = items.filter((item) =>
        [
          item.name,
          item.userName,
          item.phone,
          item.totalDeposit,
          item.totalWithdraw,
          item.dwBalance,
          item.totalBonus,
          item.m2mTotal,
          item.rpl,
          item.netPLBalance,
        ]
          .map((v) => String(v ?? ""))
          .some((v) => v.toLowerCase().includes(q))
      );
    }

    if (sortConfig.key) {
      const key = sortConfig.key as keyof UserPLItem;
      items.sort((a: any, b: any) => {
        if (a[key] < b[key])
          return sortConfig.direction === "ascending" ? -1 : 1;
        if (a[key] > b[key])
          return sortConfig.direction === "ascending" ? 1 : -1;
        return 0;
      });
    }
    return items;
  }, [plData, sortConfig, searchInputValue]);

  return (
    <>
      <div className="!px-2 md:px-2 py-2 min-h-screen bg-[#181a20] text-[#EAECEF]">
      
          

          <CardContent className="relative p-3 md:p-4">
            {/* Filters */}
            <div className="rounded-xl p-3 md:p-4 mb-3 md:mb-4 border border-[#2a2f36] bg-[#1e2329]">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="startDate"
                    className="text-sm font-semibold text-[#848E9C]"
                  >
                    From Date
                  </Label>
                  <Input
                    id="startDate"
                    name="startDate"
                    type="date"
                    value={formFilterData.startDate}
                    onChange={handleChange}
                    className="border-[#2a2f36] bg-[#181a20] text-[#EAECEF] focus-visible:ring-0 focus-visible:border-[#3a4048] transition-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="endDate"
                    className="text-sm font-semibold text-[#848E9C]"
                  >
                    To Date
                  </Label>
                  <Input
                    id="endDate"
                    name="endDate"
                    type="date"
                    value={formFilterData.endDate}
                    onChange={handleChange}
                    className="border-[#2a2f36] bg-[#181a20] text-[#EAECEF] focus-visible:ring-0 focus-visible:border-[#3a4048] transition-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="searchable-select"
                    className="text-sm font-semibold text-[#848E9C]"
                  >
                    User Name
                  </Label>
                  <div className="rounded-md border border-[#2a2f36] bg-[#181a20]">
                    <Select
                      id="searchable-select"
                      value={formFilterData.user || null}
                      onChange={(opt) =>
                        handleChangeValueOption(
                          opt as SelectOption | null,
                          "user"
                        )
                      }
                      options={userData}
                      onInputChange={(value, actionMeta) => {
                        if (actionMeta.action === "input-change") {
                          setSearchInputValue(value);
                          fetchOptions(value);
                          setFormFilterData((prev) =>
                            value === ""
                              ? { ...prev, startDate, endDate }
                              : { ...prev, startDate: "", endDate: "" }
                          );
                        }
                      }}
                      inputValue={searchInputValue}
                      isSearchable
                      placeholder="Type to search..."
                      noOptionsMessage={() =>
                        searchInputValue.length < 3
                          ? "Type 3+ chars"
                          : "No results"
                      }
                      styles={{
                        control: (base) => ({
                          ...base,
                          backgroundColor: "#181a20",
                          border: "none",
                          boxShadow: "none",
                          minHeight: "38px",
                        }),
                        valueContainer: (base) => ({
                          ...base,
                          color: "#EAECEF",
                        }),
                        input: (base) => ({
                          ...base,
                          color: "#EAECEF",
                        }),
                        singleValue: (base) => ({
                          ...base,
                          color: "#EAECEF",
                        }),
                        placeholder: (base) => ({
                          ...base,
                          color: "#848E9C",
                        }),
                        menu: (base) => ({
                          ...base,
                          backgroundColor: "#1e2329",
                          border: "1px solid #2a2f36",
                          overflow: "hidden",
                        }),
                        option: (base, state) => ({
                          ...base,
                          backgroundColor: state.isFocused
                            ? "#2a2f36"
                            : "#1e2329",
                          color: "#EAECEF",
                          cursor: "pointer",
                        }),
                        menuPortal: (base) => ({ ...base, zIndex: 50 }),
                      }}
                      menuPortalTarget={
                        typeof window !== "undefined"
                          ? document.body
                          : undefined
                      }
                    />
                  </div>
                </div>

                <div className="flex items-end gap-2">
                  <Button
                    className="flex-1 bg-[#fcd535] text-[#181a20] font-medium shadow-md transition-none"
                    onClick={exportToExcel}
                    disabled={loading}
                  >
                    <Download className="w-4 h-4" />
                    Excel
                  </Button>
                  <Button
                    className="bg-[#fcd535] text-black font-medium shadow-md transition-none"
                    onClick={() => fetchDataFromAPI(0)}
                  >
                    <Eye className="w-4 h-4 text-black" />
                    View
                  </Button>
                  <Button
                    variant="destructive"
                    className="bg-[#cf304a] text-black shadow-md transition-none"
                    onClick={handleReset}
                  >
                    <X className="w-4 h-4 text-black" />
                    Clear
                  </Button>
                </div>
              </div>
            </div>

            {/* Scrollable Table */}
            <div className="rounded-xl overflow-hidden border border-[#2a2f36] bg-[#1e2329]">
              <div className="overflow-auto max-h-[70vh]">
                <table
                  ref={tableRef}
                  className="min-w-[1100px] w-full text-sm text-[#EAECEF]"
                >
                  <thead className="">
                    <tr className="border-b border-[#2a2f36] bg-[#181a20]">
                      <Th
                        className=" min-w-[180px] text-[#848E9C]"
                        onClick={() =>
                          requestSort("userName" as keyof UserPLItem)
                        }
                        label="USER NAME"
                        icon={<SortIcon col={"userName" as keyof UserPLItem} />}
                        leftSticky
                      />
                      <Th
                        className=" min-w-[180px] text-[#848E9C]"
                        onClick={() => requestSort("phone" as keyof UserPLItem)}
                        label="MOBILE"
                        icon={<SortIcon col={"phone" as keyof UserPLItem} />}
                      />
                      <Th
                        onClick={() => requestSort("totalDeposit")}
                        label="DEPOSIT"
                        className="text-[#848E9C]"
                        icon={
                          <SortIcon col={"totalDeposit" as keyof UserPLItem} />
                        }
                      />
                      <Th
                        onClick={() => requestSort("totalWithdraw")}
                        label="WITHDRAWAL"
                        className="text-[#848E9C]"
                        icon={
                          <SortIcon col={"totalWithdraw" as keyof UserPLItem} />
                        }
                      />
                      <Th
                        onClick={() => requestSort("dwBalance")}
                        label="BALANCE"
                        className="text-[#848E9C]"
                        icon={
                          <SortIcon col={"dwBalance" as keyof UserPLItem} />
                        }
                      />
                      <Th
                        onClick={() => requestSort("totalBonus")}
                        label="BONUS"
                        className="text-[#848E9C]"
                        icon={
                          <SortIcon col={"totalBonus" as keyof UserPLItem} />
                        }
                      />
                      <Th
                        onClick={() => requestSort("m2mTotal")}
                        label="MTM"
                        className="text-[#848E9C]"
                        icon={<SortIcon col={"m2mTotal" as keyof UserPLItem} />}
                      />
                      <Th
                        onClick={() => requestSort("rpl")}
                        label="R.P/L"
                        className="text-[#848E9C]"
                        icon={<SortIcon col={"rpl" as keyof UserPLItem} />}
                      />
                      <Th
                        onClick={() => requestSort("netPLBalance")}
                        label="NET BAL"
                        className="text-[#848E9C]"
                        icon={
                          <SortIcon col={"netPLBalance" as keyof UserPLItem} />
                        }
                      />
                    </tr>
                  </thead>

                  <tbody>
                    {/* Totals row */}
                    <tr className="bg-[#181a20] font-semibold border-b border-[#2a2f36]">
                      <td className=" px-4 py-2 text-[#fcd535]">
                        <div className="flex items-center gap-2">
                          <UserRound className="w-4 h-4" />
                          Total
                        </div>
                      </td>
                      <td className=""></td>
                      <TdRight tone="text-emerald-400">
                        {fmt(totalDepositTotal)}
                      </TdRight>
                      <TdRight tone="text-orange-400">
                        {fmt(totalWithdrawTotal)}
                      </TdRight>
                      <TdRight tone="text-blue-300">
                        {fmt(dwBalanceTotal)}
                      </TdRight>
                      <TdRight tone="text-purple-300">
                        {fmt(totalBonusTotal)}
                      </TdRight>
                      <TdRight tone="text-indigo-300">
                        {fmt(m2mTotalTotal)}
                      </TdRight>
                      <TdRight tone="text-cyan-300">{fmt(rpTotal)}</TdRight>
                      <td className="px-4 py-2 text-right">
                        <span
                          className={`font-bold ${
                            Number(netPLBalanceTotal) >= 0
                              ? "text-emerald-400"
                              : "text-rose-400"
                          }`}
                        >
                          {fmt(netPLBalanceTotal)}
                        </span>
                      </td>
                    </tr>

                    {sortedPlData.length === 0 && (
                      <tr>
                        <td
                          colSpan={9}
                          className="py-10 text-center text-[#848E9C]"
                        >
                          No records found.
                        </td>
                      </tr>
                    )}

                    {sortedPlData.map((item, index) => (
                      <tr
                        key={index}
                        className="border-b border-[#2a2f36]"
                      >
                        {/* sticky col 1 */}
                        <td className=" px-4 py-2">
                          <button
                            type="button"
                            className="text-[#EAECEF] font-medium"
                            onClick={() =>
                              openUserBottomBar(item.userId, item.name)
                            }
                            title="Open details"
                          >
                            <span className="inline-flex items-center gap-1">
                              <UserRound className="w-4 h-4 text-[#848E9C]" />
                              {item.name}
                            </span>
                          </button>
                        </td>

                        {/* sticky col 2 */}
                        <td className=" px-4 py-2 text-[#848E9C]">
                          <span className="inline-flex items-center gap-1">
                            <PhoneIcon className="w-3.5 h-3.5" />
                            {item.phone}
                          </span>
                        </td>

                        <TdRight>{num(item.totalDeposit)}</TdRight>
                        <TdRight>{num(item.totalWithdraw)}</TdRight>
                        <TdRight>{num(item.dwBalance)}</TdRight>
                        <TdRight>{num(item.totalBonus)}</TdRight>
                        <TdRight>{num(item.m2mTotal)}</TdRight>
                        <TdRight>{num(item.rpl)}</TdRight>
                        <td className="px-4 py-2 text-right">
                          <span
                            className={`font-semibold ${
                              (item.netPLBalance || 0) >= 0
                                ? "text-emerald-400"
                                : "text-rose-400"
                            }`}
                          >
                            {num(item.netPLBalance)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Loading overlay */}
            {loading && (
              <div className="fixed inset-0 z-40 grid place-items-center bg-black/40">
                <div className="flex items-center gap-3 text-[#EAECEF] bg-[#1e2329] p-4 rounded-lg border border-[#2a2f36] shadow-lg">
                  <svg
                    className="animate-spin h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Loading…
                </div>
              </div>
            )}

            {/* Bottom Sheet */}
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetContent
                side="bottom"
                className="h-[85vh] p-0 rounded-t-2xl shadow-2xl bg-[#1e2329] border border-[#2a2f36]"
              >
                <SheetHeader className="p-6 border-b border-[#2a2f36] bg-[#181a20]">
                  <SheetTitle className="text-xl font-bold text-[#fcd535]">
                    {selectedUserName
                      ? `Account Report — ${selectedUserName}`
                      : "Account Report"}
                  </SheetTitle>
                </SheetHeader>
                <div className="h-[calc(85vh-80px)] overflow-auto">
                  {selectedUserId && <ChildList userId={selectedUserId} />}
                </div>
              </SheetContent>
            </Sheet>
          </CardContent>
    
      </div>
    </>
  );
};


function Th({
  label,
  onClick,
  icon,
  className,
  leftSticky,
}: {
  label: string;
  onClick?: () => void;
  icon?: React.ReactNode;
  className?: string;
  leftSticky?: boolean;
}) {
  return (
    <th
      className={`px-4 py-2 text-left font-semibold bg-[#181a20]  whitespace-nowrap select-none ${className || ""} ${
        leftSticky ? "border-r border-[#2a2f36]" : ""
      }`}
    >
      <button type="button" onClick={onClick} className="inline-flex items-center gap-2">
        {label}
        {icon}
      </button>
    </th>
  );
}

function TdRight({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone?: string;
}) {
  return (
    <td className={`px-4 py-2 text-right ${tone ?? "text-[#EAECEF]"}`}>
      {children}
    </td>
  );
}

function num(v?: number | string | null) {
  const n = Number(v ?? 0);
  return n.toFixed(2);
}
function fmt(s: string) {
  return Number(s).toFixed(2);
}

export default Account;
