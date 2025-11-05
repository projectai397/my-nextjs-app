"use client";
import apiClient from "@/lib/axiosInstance";

import { useSession } from "next-auth/react";
import React, { Fragment, useEffect, useMemo, useState } from "react";
import {
  ADMIN,
  ADMIN_API_ENDPOINT,
  CLIENT,
  MASTER,
  SELL,
  SUCCESS,
  SUPER_ADMIN,
  USER_WISE_PROFIT_LOSS_LIST,
} from "@/constant/index";
import { decryptData, encryptData } from "@/hooks/crypto";
import { formatDateForExportExcelName } from "@/hooks/dateUtils";
import { saveAs } from "file-saver";
import { useWebSocket } from "@/components/socket/WebSocketProvider";
import { useDispatch, useSelector } from "react-redux";
import * as XLSX from "xlsx";
import webSocketManager from "@/components/socket/WebSocketManager";
import { addItem } from "@/hooks/arraySlice";
import { toastError } from "@/hooks/toastMsg";
import { getCurrentWeekRange, getTodayRange } from "@/hooks/range";
import { FaSort, FaSortDown, FaSortUp } from "react-icons/fa";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Download,
  RefreshCcw,
  Search,
  X,
} from "lucide-react";
// shadcn/ui
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type TickDataType = { data?: { symbol: string; bid: number; ask: number } };

type AuthenticatedUser = {
  userId: string;
  userName: string;
  role: number | string;
  brkSharing?: number;
  profitAndLossSharing?: number;
  profitAndLossSharingDownLine?: number;
};

type ChildPosition = {
  symbolName: string;
  tradeType: number | string;
  totalQuantity: number;
  price: number;
  m2m?: number;
};

type RowItem = {
  userId: string;
  userName: string;
  role: number | string;
  profitAndLossSharing: string | number;
  profitAndLossSharingDownLine: string | number;
  profitLoss: string | number;
  childUserProfitLossTotal: string | number;
  brokerageTotal: string | number;
  childUserBrokerageTotal: string | number;
  parentBrokerageTotal: string | number;
  symbolData: Array<{ name: string; bid: number; ask: number }>;
  childUserDataPosition: ChildPosition[];
  // computed fields we add:
  netpl?: string | number;
  m2mTotal?: string | number;
  our?: string | number;
  ourPnl?: number;
  m2mOur?: string | number;
};

type SortConf = { key: string | null; direction: "ascending" | "descending" };

const ProfitLoss: React.FC = () => {
  const { tickData } = useWebSocket() as { tickData?: TickDataType };
    const { data: session, status } = useSession();

  // const deviceType =
  //   typeof window !== "undefined"
  //     ? localStorage.getItem("deviceType") || ""
  //     : "";
  // const jwt_token =
  //   typeof window !== "undefined" ? localStorage.getItem("token") || "" : "";
  const authenticated: AuthenticatedUser =
    typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem("authenticated") || "{}")
      : ({} as any);

  const authenticatedUserId = (session?.user as any)?.id as string | undefined; 
      const jwt_token = (session as any)?.accessToken as string | undefined; 
      const deviceType = ((session?.user as any)?.deviceType as string | undefined) ?? "web";
   
       const role = (session?.user as any)?.role as string | undefined; 
     



  const array = useSelector((state: any) => state.array);
  const localArray = [...array];
  const dispatch = useDispatch();

  const [plData, setPLData] = useState<RowItem[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 1000;

  const [netplTotal, setNetplTotal] = useState<number>(0);
  const [ourTotal, setOurTotal] = useState<number>(0);
  const [brkTotal, setBrkTotal] = useState<number>(0);
  const [m2mOurTotal, setM2mOurTotal] = useState<number>(0);
  const [rplOurTotal, setRplOurTotal] = useState<number>(0);

  const [uplineTotal, setUplineTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [plDailyData, setPLDailyData] = useState<RowItem[]>([]);
  const [ourDailyTotal, setOurDailyTotal] = useState<number>(0);
  const [releasePLTotal, setReleasePLTotal] = useState<number>(0);
  const [brokerageGTotal, setBrokerageGTotal] = useState<number>(0);
  const [m2mGTotal, setM2MGTotal] = useState<number>(0);
  const [plShareTotal, setPlShareTotal] = useState<number>(0);

  const { startDate, endDate } = getCurrentWeekRange();
  const [sortConfig, setSortConfig] = useState<SortConf>({
    key: null,
    direction: "ascending",
  });
  const [sortConfig1, setSortConfig1] = useState<SortConf>({
    key: null,
    direction: "ascending",
  });
  const [formFilterData, setFormFilterData] = useState<{
    startDate: string;
    endDate: string;
  }>({
    startDate,
    endDate,
  });

  // bottom sheet state
  const [sheetOpen, setSheetOpen] = useState<boolean>(false);
  const [selectedUser, setSelectedUser] = useState<{
    userId: string;
    userName: string;
  } | null>(null);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormFilterData((prev) => ({ ...prev, [name]: value }));
    const updated = { ...formFilterData, [name]: value };
    const s = new Date(updated.startDate);
    const eD = new Date(updated.endDate);
    if (updated.startDate && updated.endDate) {
      const diffDays = (Number(eD) - Number(s)) / (1000 * 60 * 60 * 24);
      if (diffDays > 7 || diffDays < 0)
        toastError("Please select a date range of up to 7 days only.");
    }
  };

  const addSymbolNameInArray = async (symbolName: string) => {
    if (!localArray.includes(symbolName)) {
      await dispatch(addItem(symbolName));
      localArray.push(symbolName);
    }
  };

  const socketData = async (userPLDataN: RowItem[]) => {
    let m2mTotal = 0,
      ourT = 0,
      brkT = 0,
      RPLT = 0,
      brokerageGT = 0,
      m2mGT = 0,
      plShareGT = 0;

    const newData = userPLDataN.map((userItem) => {
      const symbolData = userItem.symbolData;

      for (let i = 0; i < userItem.childUserDataPosition.length; i++) {
        addSymbolNameInArray(userItem.childUserDataPosition[i].symbolName);
        const matchSymbol = symbolData.find(
          (s) => s.name === userItem.childUserDataPosition[i].symbolName
        );
        if (!matchSymbol) continue;

        const price = Number(
          userItem.childUserDataPosition[i].price.toFixed(2)
        );
        const qty = userItem.childUserDataPosition[i].totalQuantity;

        if (userItem.childUserDataPosition[i].tradeType === SELL && qty > 0) {
          userItem.childUserDataPosition[i].m2m =
            (price - matchSymbol.ask) * qty;
        } else {
          if (qty < 0) {
            userItem.childUserDataPosition[i].m2m =
              (matchSymbol.ask - price) * qty;
          } else {
            userItem.childUserDataPosition[i].m2m =
              (matchSymbol.bid - price) * qty;
          }
        }
      }

      let m2mPln = 0;
      userItem.childUserDataPosition.forEach((p) => (m2mPln += p.m2m || 0));

      const ourP =
        userItem.role === CLIENT
          ? parseFloat(String(userItem.profitAndLossSharingDownLine))
          : parseFloat(String(userItem.profitAndLossSharing));
      const profitLoss =
        userItem.role === CLIENT
          ? parseFloat(String(userItem.profitLoss))
          : parseFloat(String(userItem.childUserProfitLossTotal));
      const brokerageTotal =
        userItem.role === CLIENT
          ? parseFloat(String(userItem.brokerageTotal))
          : parseFloat(String(userItem.childUserBrokerageTotal));

      const rTo = profitLoss - brokerageTotal;
      m2mTotal += m2mPln + rTo;

      const netpl = m2mPln + rTo;
      let our = ((m2mPln + profitLoss) * ourP) / 100;
      our = our * -1;
      our = our + parseFloat(String(userItem.parentBrokerageTotal));

      ourT += our;
      brkT += parseFloat(String(userItem.parentBrokerageTotal));
      RPLT += profitLoss;
      brokerageGT += brokerageTotal;
      m2mGT += m2mPln;
      plShareGT += ourP;

      return {
        ...userItem,
        netpl: Number(netpl.toFixed(2)),
        m2mTotal: Number(m2mPln.toFixed(2)),
        our: Number(our.toFixed(2)),
        total: Number((netpl + our).toFixed(2)),
        childUserDataPosition: userItem.childUserDataPosition,
      };
    });

    setNetplTotal(Number(m2mTotal.toFixed(2)));
    setOurTotal(Number(ourT.toFixed(2)));
    setBrkTotal(Number(brkT.toFixed(2)));
    setReleasePLTotal(Number(RPLT.toFixed(2)));
    setBrokerageGTotal(Number(brokerageGT.toFixed(2)));
    setM2MGTotal(Number(m2mGT.toFixed(2)));
    setPlShareTotal(Number(plShareGT.toFixed(2)));

    let upLineAmount = (m2mTotal * (authenticated?.brkSharing || 0)) / 100;
    let showUpLineAmount = parseFloat(upLineAmount as any as string).toFixed(2);
    const upLineNumber = Number(
      m2mTotal < 0 ? parseFloat(showUpLineAmount) * -1 : showUpLineAmount
    );
    setUplineTotal(upLineNumber);

    setPLData(newData);
    webSocketManager.sendSymbols(localArray);
  };

  const calculateDailyPLData = async (userPLDataN: RowItem[]) => {
    let ourDT = 0;

    const newDailyData = userPLDataN.map((userItem) => {
      const symbolData = userItem.symbolData;

      for (let i = 0; i < userItem.childUserDataPosition.length; i++) {
        addSymbolNameInArray(userItem.childUserDataPosition[i].symbolName);
        const matchSymbol = symbolData.find(
          (s) => s.name === userItem.childUserDataPosition[i].symbolName
        );
        if (!matchSymbol) continue;

        const price = Number(
          userItem.childUserDataPosition[i].price.toFixed(2)
        );
        const qty = userItem.childUserDataPosition[i].totalQuantity;

        if (userItem.childUserDataPosition[i].tradeType === SELL && qty > 0) {
          userItem.childUserDataPosition[i].m2m =
            (price - matchSymbol.ask) * qty;
        } else {
          if (qty < 0) {
            userItem.childUserDataPosition[i].m2m =
              (matchSymbol.ask - price) * qty;
          } else {
            userItem.childUserDataPosition[i].m2m =
              (matchSymbol.bid - price) * qty;
          }
        }
      }

      let m2mPln = 0;
      userItem.childUserDataPosition.forEach((p) => (m2mPln += p.m2m || 0));

      const ourP =
        userItem.role === CLIENT
          ? parseFloat(String(userItem.profitAndLossSharingDownLine))
          : parseFloat(String(userItem.profitAndLossSharing));
      const profitLoss =
        userItem.role === CLIENT
          ? parseFloat(String(userItem.profitLoss))
          : parseFloat(String(userItem.childUserProfitLossTotal));
      const brokerageTotal =
        userItem.role === CLIENT
          ? parseFloat(String(userItem.brokerageTotal))
          : parseFloat(String(userItem.childUserBrokerageTotal));

      const rTo = profitLoss - brokerageTotal;
      const netpl = m2mPln + rTo;

      let our = ((m2mPln + profitLoss) * ourP) / 100;
      our = our * -1;
      our = our + parseFloat(String(userItem.parentBrokerageTotal));
      ourDT += our;

      return {
        ...userItem,
        netpl: Number(netpl.toFixed(2)),
        m2mTotal: Number(m2mPln.toFixed(2)),
        our: Number(our.toFixed(2)),
        total: Number((netpl + our).toFixed(2)),
        childUserDataPosition: userItem.childUserDataPosition,
      };
    });

    setOurDailyTotal(Number(ourDT.toFixed(2)));
    setPLDailyData(newDailyData);
  };

  const fetchDataFromAPI = async (
    withDateRange = false,
    startD: string | null = null,
    endD: string | null = null
  ) => {
    try {
      const basePayload: any = {
        userId:authenticatedUserId,
        page: currentPage,
        limit: itemsPerPage,
      };

      if (!withDateRange) {
        basePayload.startDate = formFilterData.startDate;
        basePayload.endDate = formFilterData.endDate;
      } else {
        basePayload.startDate = startD;
        basePayload.endDate = endD;
      }

      let data = encryptData(basePayload);
      data = JSON.stringify({ data });

      axios
        .post(ADMIN_API_ENDPOINT + USER_WISE_PROFIT_LOSS_LIST, data, {
          headers: {
            Authorization: jwt_token as string,
            "Content-Type": "application/json",
            deviceType: deviceType as string,
          },
        })
        .then((response) => {
          if (response.data.statusCode == SUCCESS) {
            if (withDateRange) {
              const userPLDataDaily = decryptData(response.data.data);
              calculateDailyPLData(userPLDataDaily);
            } else {
              const userPLDataN = decryptData(response.data.data);
              socketData(userPLDataN);
            }
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
  };

  const handlePageChange = async (pageNumber: number) =>
    setCurrentPage(pageNumber);

  const exportToExcel = () => {
    if (!plData || plData.length === 0) {
      alert("No data available to export.");
      return;
    }
    setLoading(true);
    setTimeout(() => {
      const excelData = plData.map((item: RowItem) => ({
        UserName: item.userName,
        "%":
          item.role === CLIENT
            ? item.profitAndLossSharingDownLine
            : item.profitAndLossSharing,
        M2M: item.m2mTotal,
        BRK:
          item.role === CLIENT
            ? Number(item.brokerageTotal).toFixed(2)
            : Number(item.childUserBrokerageTotal).toFixed(2),
        "Release P/L":
          item.role === CLIENT
            ? Number(item.profitLoss).toFixed(2)
            : Number(item.childUserProfitLossTotal).toFixed(2),
        "NET P/L": item.netpl,
        "OUR BRK": Number(item.parentBrokerageTotal).toFixed(2),
        "OUR %": item.our,
      }));

      excelData.push({} as any);
      excelData.push({
        UserName:
         role=== "admin" || role === "superadmin"
            ? "Admin"
            : "",
        "%": plShareTotal,
        M2M: m2mGTotal,
        BRK: brokerageGTotal,
        "Release P/L": releasePLTotal,
        "NET P/L": netplTotal,
        "OUR BRK": brkTotal,
        "OUR %": ourTotal,
      } as any);

      const worksheet = XLSX.utils.json_to_sheet(excelData);
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
      const userName = authenticated.userName;
      const fileName = `${userName}PROFITLOSS${formatDateForExportExcelName(
        now
      )}.xlsx`;
      saveAs(blob, fileName);
      setLoading(false);
    }, 100);
    return true;
  };

  const getSortIcon = (key: string) =>
    sortConfig.key !== key ? (
      <FaSort />
    ) : sortConfig.direction === "ascending" ? (
      <FaSortUp />
    ) : (
      <FaSortDown />
    );
  const requestSort = (key: string) =>
    setSortConfig((prev) => ({
      key,
      direction:
        prev.key === key && prev.direction === "ascending"
          ? "descending"
          : "ascending",
    }));
  const getSortIcon1 = (key: string) =>
    sortConfig1.key !== key ? (
      <FaSort />
    ) : sortConfig1.direction === "ascending" ? (
      <FaSortUp />
    ) : (
      <FaSortDown />
    );
  const requestSort1 = (key: string) =>
    setSortConfig1((prev) => ({
      key,
      direction:
        prev.key === key && prev.direction === "ascending"
          ? "descending"
          : "ascending",
    }));

  const sortedTableData = useMemo(() => {
    let sortableItems = [...plData];
    if (sortConfig.key !== null) {
      sortableItems.sort((a: any, b: any) => {
        let aValue: any, bValue: any;
        if (sortConfig.key === "script") {
          const getDisplayName = (item: any) => {
            if ((item.exchangeName || "").toLowerCase() === "usstock")
              return item.symbolName;
            if ((item.exchangeName || "").toLowerCase() === "ce/pe")
              return item.symbolTitle;
            return item.masterName;
          };
          aValue = getDisplayName(a);
          bValue = getDisplayName(b);
        } else {
          aValue = a[sortConfig.key as keyof RowItem];
          bValue = b[sortConfig.key as keyof RowItem];
        }
        if (aValue == null) return 1;
        if (bValue == null) return -1;
        if (typeof aValue === "string")
          return sortConfig.direction === "ascending"
            ? aValue.localeCompare(bValue)
            : (bValue as string).localeCompare(aValue);
        if (aValue < bValue)
          return sortConfig.direction === "ascending" ? -1 : 1;
        if (aValue > bValue)
          return sortConfig.direction === "ascending" ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [plData, sortConfig]);

  const sortedTableData1 = useMemo(() => {
    let sortableItems = [...plData];
    if (sortConfig1.key !== null) {
      sortableItems.sort((a: any, b: any) => {
        let aValue: any, bValue: any;
        if (sortConfig1.key === "script") {
          const getDisplayName = (item: any) => {
            if ((item.exchangeName || "").toLowerCase() === "usstock")
              return item.symbolName;
            if ((item.exchangeName || "").toLowerCase() === "ce/pe")
              return item.symbolTitle;
            return item.masterName;
          };
          aValue = getDisplayName(a);
          bValue = getDisplayName(b);
        } else {
          aValue = a[sortConfig1.key as keyof RowItem];
          bValue = b[sortConfig1.key as keyof RowItem];
        }
        if (aValue == null) return 1;
        if (bValue == null) return -1;
        if (typeof aValue === "string")
          return sortConfig1.direction === "ascending"
            ? aValue.localeCompare(bValue)
            : (bValue as string).localeCompare(aValue);
        if (aValue < bValue)
          return sortConfig1.direction === "ascending" ? -1 : 1;
        if (aValue > bValue)
          return sortConfig1.direction === "ascending" ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [plData, sortConfig1]);

  useEffect(() => {
    if (tickData?.data) {
      let m2mTotal = 0,
        ourT = 0,
        brkT = 0,
        RPLT = 0,
        m2mOur = 0,
        ourPnl = 0,
        rplOurT = 0,
        brokerageGT = 0,
        m2mGT = 0,
        plShareGT = 0;

      const newDataForp = plData.map((userItem) => {
        for (let i = 0; i < userItem.childUserDataPosition.length; i++) {
          if (
            userItem.childUserDataPosition[i].symbolName ===
            tickData.data!.symbol
          ) {
            const price = Number(
              userItem.childUserDataPosition[i].price.toFixed(2)
            );
            const qty = userItem.childUserDataPosition[i].totalQuantity;

            if (
              userItem.childUserDataPosition[i].tradeType === SELL &&
              qty > 0
            ) {
              userItem.childUserDataPosition[i].m2m =
                (price - tickData.data!.ask) * qty;
            } else {
              if (qty < 0) {
                userItem.childUserDataPosition[i].m2m =
                  (tickData.data!.ask - price) * qty;
              } else {
                userItem.childUserDataPosition[i].m2m =
                  (tickData.data!.bid - price) * qty;
              }
            }
          }
        }

        let m2mPln = 0;
        userItem.childUserDataPosition.forEach((p) => (m2mPln += p.m2m || 0));

        const ourP =
          userItem.role === CLIENT
            ? parseFloat(String(userItem.profitAndLossSharingDownLine))
            : parseFloat(String(userItem.profitAndLossSharing));
        const profitLoss =
          userItem.role === CLIENT
            ? parseFloat(String(userItem.profitLoss))
            : parseFloat(String(userItem.childUserProfitLossTotal));
        const brokerageTotal =
          userItem.role === CLIENT
            ? parseFloat(String(userItem.brokerageTotal))
            : parseFloat(String(userItem.childUserBrokerageTotal));

        const rTo = profitLoss - brokerageTotal;
        m2mTotal += m2mPln + rTo;

        const netpl = m2mPln + rTo;
        let our = ((m2mPln + profitLoss) * ourP) / 100;
        our = our * -1;
        our = our + parseFloat(String(userItem.parentBrokerageTotal));

        ourT += our;
        brkT += parseFloat(String(userItem.parentBrokerageTotal));
        RPLT += profitLoss;
        brokerageGT += brokerageTotal;

        const ourProfitLoss =
          userItem.role === CLIENT
            ? Number(userItem.profitLoss).toFixed(2)
            : Number(userItem.childUserProfitLossTotal).toFixed(2);
        ourPnl =
          isNaN(ourProfitLoss as any) || isNaN(ourP) || ourP === 0
            ? 0
            : (Number(ourProfitLoss) * ourP) / 100;
        (userItem as any).ourPnl = ourPnl;

        m2mGT += m2mPln;
        plShareGT += ourP;
        (userItem as any).m2mOur = ((m2mPln * ourP) / 100).toFixed(2);
        rplOurT += parseFloat(ourPnl as any);

        return {
          ...userItem,
          netpl: Number(netpl.toFixed(2)),
          m2mTotal: Number(m2mPln.toFixed(2)),
          our: Number(our.toFixed(2)),
          total: Number((netpl + our).toFixed(2)),
          childUserDataPosition: userItem.childUserDataPosition,
        };
      });

      setNetplTotal(Number(m2mTotal.toFixed(2)));
      setOurTotal(Number(ourT.toFixed(2)));
      setBrkTotal(Number(brkT.toFixed(2)));
      setReleasePLTotal(Number(RPLT.toFixed(2)));
      setBrokerageGTotal(Number(brokerageGT.toFixed(2)));
      setM2mOurTotal(Number(m2mOur.toFixed(2)));
      setRplOurTotal(Number(rplOurT.toFixed(2)));
      setM2MGTotal(Number(m2mGT.toFixed(2)));
      setPlShareTotal(Number(plShareGT.toFixed(2)));

      let upLineAmount = (m2mTotal * (authenticated?.brkSharing || 0)) / 100;
      let showUpLineAmount = parseFloat(upLineAmount as any as string).toFixed(
        2
      );
      if (m2mTotal < 0)
        showUpLineAmount = String(parseFloat(showUpLineAmount) * -1);

      setUplineTotal(Number(showUpLineAmount));
      setPLData(newDataForp);

      // daily block
      const newDailyDataForp = plDailyData.map((userItem) => {
        for (let i = 0; i < userItem.childUserDataPosition.length; i++) {
          if (
            userItem.childUserDataPosition[i].symbolName ===
            tickData.data!.symbol
          ) {
            const price = Number(
              userItem.childUserDataPosition[i].price.toFixed(2)
            );
            const qty = userItem.childUserDataPosition[i].totalQuantity;

            if (
              userItem.childUserDataPosition[i].tradeType === SELL &&
              qty > 0
            ) {
              userItem.childUserDataPosition[i].m2m =
                (price - tickData.data!.ask) * qty;
            } else {
              if (qty < 0) {
                userItem.childUserDataPosition[i].m2m =
                  (tickData.data!.ask - price) * qty;
              } else {
                userItem.childUserDataPosition[i].m2m =
                  (tickData.data!.bid - price) * qty;
              }
            }
          }
        }

        let m2mPln = 0;
        userItem.childUserDataPosition.forEach((p) => (m2mPln += p.m2m || 0));

        const ourP =
          userItem.role === CLIENT
            ? parseFloat(String(userItem.profitAndLossSharingDownLine))
            : parseFloat(String(userItem.profitAndLossSharing));
        const profitLoss =
          userItem.role === CLIENT
            ? parseFloat(String(userItem.profitLoss))
            : parseFloat(String(userItem.childUserProfitLossTotal));
        const brokerageTotal =
          userItem.role === CLIENT
            ? parseFloat(String(userItem.brokerageTotal))
            : parseFloat(String(userItem.childUserBrokerageTotal));

        const rTo = profitLoss - brokerageTotal;
        const netpl = m2mPln + rTo;

        let our = ((m2mPln + profitLoss) * ourP) / 100;
        our = our * -1;
        our = our + parseFloat(String(userItem.parentBrokerageTotal));

        return {
          ...userItem,
          netpl: Number(netpl.toFixed(2)),
          m2mDailyTotal: Number(m2mPln.toFixed(2)),
          our: Number(our.toFixed(2)),
          total: Number((netpl + our).toFixed(2)),
          childUserDataPosition: userItem.childUserDataPosition,
        };
      });

      setPLDailyData(newDailyDataForp);
    }
  }, [tickData, sortConfig]); // logic unchanged

  const fetchBothData = async () => {
    await fetchDataFromAPI();
    const { startDate: s, endDate: e } = getTodayRange();
    await new Promise((r) => setTimeout(r, 200));
    await fetchDataFromAPI(true, s, e);
  };

  useEffect(() => {
    fetchBothData();
    document.title = "Admin Panel | Profit & Loss";
    return () => {
      document.title = "Admin Panel";
    };
  }, [currentPage]);

  const openUserSheet = (userId: string, userName: string) => {
    setSelectedUser({ userId, userName });
    setSheetOpen(true);
  };

  return (
    <div className="bg-[#181a20]">
      <div className="min-h-full text-white">
        <main className="mx-auto w-full max-w-8xl px-4 py-6 h-[calc(100vh-64px)] overflow-y-auto space-y-6">
          <CardContent className="flex justify-between items-end gap-4 bg-[#181a20]">
            {/* Left Section for Date Filters */}
            <div className="flex  gap-4">
              <div>
                <label
                  htmlFor="startDate"
                  className="block text-sm mb-2 opacity-80"
                >
                  From Date
                </label>
                <Input
                  id="startDate"
                  name="startDate"
                  type="date"
                  value={formFilterData.startDate}
                  onChange={handleFilterChange}
                  className="bg-black/20 border-white/10 text-white"
                  max={formFilterData.endDate || undefined}
                />
              </div>
              <div>
                <label
                  htmlFor="endDate"
                  className="block text-sm mb-2 opacity-80"
                >
                  To Date
                </label>
                <Input
                  id="endDate"
                  name="endDate"
                  type="date"
                  value={formFilterData.endDate}
                  onChange={handleFilterChange}
                  className="bg-black/20 border-white/10 !text-white"
                  min={formFilterData.startDate}
                  max={
                    formFilterData.startDate
                      ? new Date(
                          new Date(formFilterData.startDate).getTime() +
                            7 * 86400000
                        )
                          .toISOString()
                          .split("T")[0]
                      : undefined
                  }
                />
              </div>
            </div>

            {/* Right Section for Buttons */}
            <div className="flex gap-2">
              <Button
                className="text-black bg-yellow-400 hover:bg-amber-300"
                onClick={() => fetchBothData()}
              >
                View
              </Button>
              <Button
                variant="secondary"
                className="bg-yellow-400 hover:bg-amber-300"
                onClick={exportToExcel}
                disabled={loading}
              >
                  <Download className="h-4 w-4" /> {loading ? "Exporting…" : "Export"}
              </Button>
            </div>
          </CardContent>

          {/* TABLE 1: PROFIT & LOSS % */}
          <Card className="border-white/10 overflow-hidden bg-[#181a20]">
            <CardHeader className="px-4 ">
              <CardTitle className="text-base text-yellow-400">Profit &amp; Loss %</CardTitle>
            </CardHeader>
            <Separator className="bg-white/10" />
            <CardContent className="px-0">
              <div className="max-h-[45vh] overflow-auto">
                <Table>
                  <TableHeader className="sticky top-0 z-10 shadow-[0_2px_0_rgba(255,255,255,0.06)]">
                    {role !== "master" ? (
                      <TableRow className="hover:bg-transparent text-white">
                        <TableHead
                          className="w-[200px] cursor-pointer text-white"
                          onClick={() => requestSort("userName")}
                        >
                          <div className="flex items-center gap-2">
                            UserName {getSortIcon("userName")}
                          </div>
                        </TableHead>
                        <TableHead
                          className="w-[160px] cursor-pointer"
                          onClick={() => requestSort("m2mOur")}
                        >
                          <div className="flex items-center gap-2">
                            M2M% {getSortIcon("m2mOur")}
                          </div>
                        </TableHead>
                        <TableHead
                          className="w-[160px] cursor-pointer"
                          onClick={() => requestSort("parentBrokerageTotal")}
                        >
                          <div className="flex items-center gap-2">
                            BRK% {getSortIcon("parentBrokerageTotal")}
                          </div>
                        </TableHead>
                        <TableHead
                          className="w-[180px] cursor-pointer"
                          onClick={() => requestSort("ourPnl")}
                        >
                          <div className="flex items-center gap-2">
                            Release P/L% {getSortIcon("ourPnl")}
                          </div>
                        </TableHead>
                        <TableHead
                          className="w-[160px] cursor-pointer"
                          onClick={() => requestSort("our")}
                        >
                          <div className="flex items-center gap-2">
                            NET P/L% {getSortIcon("our")}
                          </div>
                        </TableHead>
                      </TableRow>
                    ) : (
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="w-[200px]">UserName</TableHead>
                        <TableHead className="w-[180px]">
                          Total Client P/L
                        </TableHead>
                        <TableHead className="w-[160px]">Our</TableHead>
                        <TableHead className="w-[160px]">Admin</TableHead>
                      </TableRow>
                    )}
                  </TableHeader>

                  <TableBody>
                    {role === "master" ? (
                      <TableRow>
                        <TableCell />
                        <TableCell className="text-right">
                          <span
                            className={`${
                              Number(netplTotal) >= 0
                                ? "text-emerald-400"
                                : "text-red-400"
                            } font-semibold`}
                          >
                            {netplTotal}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className={`${
                              -(
                                (netplTotal *
                                  (authenticated?.profitAndLossSharing || 0)) /
                                100
                              ) >= 0
                                ? "text-emerald-400"
                                : "text-red-400"
                            } font-semibold`}
                          >
                            {
                              -(
                                (netplTotal *
                                  (authenticated?.profitAndLossSharing || 0)) /
                                100
                              )
                            }
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className={`${
                              -(
                                (netplTotal *
                                  (authenticated?.profitAndLossSharingDownLine ||
                                    0)) /
                                100
                              ) >= 0
                                ? "text-emerald-400"
                                : "text-red-400"
                            } font-semibold`}
                          >
                            {
                              -(
                                (netplTotal *
                                  (authenticated?.profitAndLossSharingDownLine ||
                                    0)) /
                                100
                              )
                            }
                          </span>
                        </TableCell>
                      </TableRow>
                    ) : (
                      <>
                        {sortedTableData.map((item: RowItem, index: number) => (
                          <TableRow key={index} className="hover:bg-white/5 text-white">
                            <TableCell className="text-left text-white">
                              {item.role !== CLIENT ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    openUserSheet(item.userId, item.userName)
                                  }
                                  className="hover:underline text-left w-full"
                                  title="Open details"
                                >
                                  {item.userName}
                                </button>
                              ) : (
                                <span>{item.userName}</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {(item as any).m2mOur}
                            </TableCell>
                            <TableCell className="text-right">
                              {Number(item.parentBrokerageTotal).toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right">
                              {Number((item as any).ourPnl ?? 0).toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right">
                              <span
                                className={`${
                                  Number(item.our ?? 0) >= 0
                                    ? "text-emerald-400"
                                    : "text-red-400"
                                } font-medium`}
                              >
                                {Number(item.our ?? 0).toFixed(2)}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow>
                          <TableCell className="text-left text-white">
                            {(role === "admin"||
                              role === "superadmin") && (
                              <strong>GRAND TOTAL</strong>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <strong
                              className={`${
                                Number(m2mOurTotal) >= 0
                                  ? "text-emerald-400"
                                  : "text-red-400"
                              }`}
                            >
                              {m2mOurTotal}
                            </strong>
                          </TableCell>
                          <TableCell className="text-right">
                            <strong
                              className={`${
                                Number(brkTotal) >= 0
                                  ? "text-emerald-400"
                                  : "text-red-400"
                              }`}
                            >
                              {brkTotal}
                            </strong>
                          </TableCell>
                          <TableCell className="text-right">
                            <strong
                              className={`${
                                Number(rplOurTotal) >= 0
                                  ? "text-emerald-400"
                                  : "text-red-400"
                              }`}
                            >
                              {rplOurTotal}
                            </strong>
                          </TableCell>
                          <TableCell className="text-right">
                            <strong
                              className={`${
                                Number(ourTotal) >= 0
                                  ? "text-emerald-400"
                                  : "text-red-400"
                              }`}
                            >
                              {ourTotal}
                            </strong>
                          </TableCell>
                        </TableRow>
                      </>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* TABLE 2: PROFIT & LOSS (CLIENTWISE) */}
          <Card className="border-white/10 overflow-hidden bg-[#181a20]">
            <CardHeader className="px-4 ">
              <CardTitle className="text-base text-yellow-400">
                Profit &amp; Loss{" "}
                {role === "master"? "Clientwise" : ""}
              </CardTitle>
            </CardHeader>
            <Separator className="bg-white/10" />
            <CardContent className="px-0">
              <div className="max-h-[50vh] overflow-auto">
                <Table>
                  <TableHeader className="sticky top-0 z-10 shadow-[0_2px_0_rgba(255,255,255,0.06)]">
                    <TableRow className="hover:bg-transparent">
                      <TableHead
                        className="w-[200px] cursor-pointer"
                        onClick={() => requestSort1("userName")}
                      >
                        <div className="flex items-center gap-2">
                          UserName {getSortIcon1("userName")}
                        </div>
                      </TableHead>
                      <TableHead className="w-[90px]">% </TableHead>
                      <TableHead
                        className="w-[160px] cursor-pointer"
                        onClick={() => requestSort1("m2mTotal")}
                      >
                        <div className="flex items-center gap-2">
                          M2M% {getSortIcon1("m2mTotal")}
                        </div>
                      </TableHead>
                      <TableHead
                        className="w-[160px] cursor-pointer"
                        onClick={() => requestSort1("childUserBrokerageTotal")}
                      >
                        <div className="flex items-center gap-2">
                          BRK% {getSortIcon1("childUserBrokerageTotal")}
                        </div>
                      </TableHead>
                      <TableHead
                        className="w-[180px] cursor-pointer"
                        onClick={() => requestSort1("childUserProfitLossTotal")}
                      >
                        <div className="flex items-center gap-2">
                          Release P/L%{" "}
                          {getSortIcon1("childUserProfitLossTotal")}
                        </div>
                      </TableHead>
                      <TableHead
                        className="w-[160px] cursor-pointer"
                        onClick={() => requestSort1("netpl")}
                      >
                        <div className="flex items-center gap-2">
                          NET P/L% {getSortIcon1("netpl")}
                        </div>
                      </TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {sortedTableData1.map((item: RowItem, index: number) => (
                      <TableRow key={index} className="hover:bg-white/5 text-white">
                        <TableCell className="text-left text-white">
                          {item.role !== CLIENT ? (
                            <button
                              type="button"
                              onClick={() =>
                                openUserSheet(item.userId, item.userName)
                              }
                              className="hover:underline text-left w-full"
                              title="Open details"
                            >
                              {item.userName}
                            </button>
                          ) : (
                            <span>{item.userName}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right ">
                          {item.role === CLIENT
                            ? item.profitAndLossSharingDownLine
                            : item.profitAndLossSharing}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.m2mTotal}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.role === CLIENT
                            ? Number(item.brokerageTotal).toFixed(2)
                            : Number(item.childUserBrokerageTotal).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.role === CLIENT
                            ? Number(item.profitLoss).toFixed(2)
                            : Number(item.childUserProfitLossTotal).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className={`${
                              Number(item.netpl ?? 0) >= 0
                                ? "text-emerald-400"
                                : "text-red-400"
                            } font-medium`}
                          >
                            {item.netpl}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}

                    <TableRow>
                      <TableCell className="text-left text-white">
                        {(role === "admin" ||
                          role === "superadmin") && (
                          <strong>GRAND TOTAL</strong>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <strong />
                      </TableCell>
                      <TableCell className="text-right">
                        <strong
                          className={`${
                            Number(m2mGTotal) >= 0
                              ? "text-emerald-400"
                              : "text-red-400"
                          }`}
                        >
                          {m2mGTotal}
                        </strong>
                      </TableCell>
                      <TableCell className="text-right">
                        <strong
                          className={`${
                            Number(brokerageGTotal) >= 0
                              ? "text-emerald-400"
                              : "text-red-400"
                          }`}
                        >
                          {brokerageGTotal}
                        </strong>
                      </TableCell>
                      <TableCell className="text-right">
                        <strong
                          className={`${
                            Number(releasePLTotal) >= 0
                              ? "text-emerald-400"
                              : "text-red-400"
                          }`}
                        >
                          {releasePLTotal}
                        </strong>
                      </TableCell>
                      <TableCell className="text-right">
                        <strong
                          className={`${
                            Number(netplTotal) >= 0
                              ? "text-emerald-400"
                              : "text-red-400"
                          }`}
                        >
                          {netplTotal}
                        </strong>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <div className="h-6" />
        </main>
      </div>

      {/* BOTTOM SHEET: USER DETAILS */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="bottom"
          className="h-[85vh] p-0 bg-[#1e2329] text-white border-t border-white/10"
        >
          <SheetHeader className="px-4 py-3 border-b border-white/10">
            <SheetTitle className="text-base text-yellow-400">
              {selectedUser
                ? `Clientwise P/L — ${selectedUser.userName}`
                : "Clientwise P/L"}
            </SheetTitle>
          </SheetHeader>

          {selectedUser && (
            <div className="h-[calc(85vh-56px)] overflow-y-auto">
              <UserPLBottomSheet
                parentUserId={selectedUser.userId}
                startDate={formFilterData.startDate}
                endDate={formFilterData.endDate}
                jwtToken={jwt_token || ""}
                deviceType={deviceType}
              />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default ProfitLoss;

/** -----------------------------------------------------------
 *  Bottom-sheet child component (TypeScript)
 *  Loads USER_WISE_PROFIT_LOSS_LIST for a specific userId
 *------------------------------------------------------------*/
type UserPLBottomSheetProps = {
  parentUserId: string;
  startDate: string;
  endDate: string;
  jwtToken: string;
  deviceType: string;
};

const UserPLBottomSheet: React.FC<UserPLBottomSheetProps> = ({
  parentUserId,
  startDate,
  endDate,
  jwtToken,
  deviceType,
}) => {
  const { tickData } = useWebSocket() as {
    tickData?: { data?: { symbol: string; bid: number; ask: number } };
  };
  const [rows, setRows] = useState<RowItem[]>([]);
  const [loading, setLoading] = useState(false);

  const [totals, setTotals] = useState({ m2m: 0, brk: 0, rel: 0, net: 0 });

  // --- helpers ---------------------------------------------------------
  const recalcUsingTick = (
    list: RowItem[],
    tick?: { symbol: string; bid: number; ask: number } | null
  ) => {
    if (!tick) return list;

    return list.map((userItem) => {
      // update positions for only the ticked symbol
      for (let i = 0; i < userItem.childUserDataPosition.length; i++) {
        const pos = userItem.childUserDataPosition[i];
        if (pos.symbolName !== tick.symbol) continue;

        const price = Number(pos.price.toFixed(2));
        const qty = pos.totalQuantity;

        if (pos.tradeType === "SELL" || pos.tradeType === 2) {
          // SELL=2 in your constants; adjust if different
          if (qty > 0) {
            pos.m2m = (price - tick.ask) * qty;
          } else if (qty < 0) {
            pos.m2m = (tick.ask - price) * qty;
          }
        } else {
          // BUY or others
          if (qty < 0) {
            pos.m2m = (tick.ask - price) * qty;
          } else {
            pos.m2m = (tick.bid - price) * qty;
          }
        }
      }

      // recompute m2mTotal/netpl for the row
      let m2mPln = 0;
      userItem.childUserDataPosition.forEach(
        (p) => (m2mPln += Number(p.m2m || 0))
      );

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

      return {
        ...userItem,
        m2mTotal: Number(m2mPln.toFixed(2)),
        netpl: Number(netpl.toFixed(2)),
      };
    });
  };

  const recomputeTotals = (list: RowItem[]) => {
    let m2m = 0,
      brk = 0,
      rel = 0,
      net = 0;
    list.forEach((it) => {
      m2m += Number(it.m2mTotal || 0);
      brk +=
        it.role === CLIENT
          ? Number(it.brokerageTotal || 0)
          : Number(it.childUserBrokerageTotal || 0);
      rel +=
        it.role === CLIENT
          ? Number(it.profitLoss || 0)
          : Number(it.childUserProfitLossTotal || 0);
      net += Number(it.netpl || 0);
    });
    setTotals({
      m2m: Number(m2m.toFixed(2)),
      brk: Number(brk.toFixed(2)),
      rel: Number(rel.toFixed(2)),
      net: Number(net.toFixed(2)),
    });
  };

  // --- data load -------------------------------------------------------
  const fetchUserRows = async () => {
    try {
      setLoading(true);
      let data = encryptData({
        userId: parentUserId,
        page: 1,
        limit: 1000,
        startDate,
        endDate,
      });
      const payload = JSON.stringify({ data });

      const res = await apiClient.post(
        USER_WISE_PROFIT_LOSS_LIST,
        payload,
      );

      if (res?.data?.statusCode === SUCCESS) {
        const list: RowItem[] = decryptData(res.data.data) || [];

        // subscribe sheet-specific symbols (optional but nice)
        const sheetSymbols = new Set<string>();
        list.forEach((u) =>
          u.childUserDataPosition.forEach((p) => {
            if (p?.symbolName) sheetSymbols.add(p.symbolName);
          })
        );
        if (sheetSymbols.size) {
          webSocketManager.sendSymbols(Array.from(sheetSymbols));
        }

        // initial recompute (no tick yet, but ensures numbers are normalized)
        const normalized = recalcUsingTick(list, null);
        setRows(normalized);
        recomputeTotals(normalized);
      } else {
        throw new Error(res?.data?.message || "Failed to load user data");
      }
    } catch (err: any) {
      setRows([]);
      setTotals({ m2m: 0, brk: 0, rel: 0, net: 0 });
    } finally {
      setLoading(false);
    }
  };

  // load on mount / when inputs change
  useEffect(() => {
    fetchUserRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parentUserId, startDate, endDate]);

  // live update: apply each tick to current rows
  useEffect(() => {
    const t = tickData?.data;
    if (!t || rows.length === 0) return;
    const updated = recalcUsingTick(rows, t);
    setRows(updated);
    recomputeTotals(updated);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tickData]);

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm opacity-80">
          Range: <span className="font-medium">{startDate}</span> to{" "}
          <span className="font-medium">{endDate}</span>
        </div>
        <Button
          variant="secondary"
          className="bg-yellow-400 hover:bg-yellow-400"
          onClick={fetchUserRows}
          disabled={loading}
        >
          {loading ? "Refreshing…" : "Refresh"}
        </Button>
      </div>

      <div className="rounded-lg border border-white/10 !bg-[#181a20] overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">UserName</TableHead>
              <TableHead className="w-[140px]">M2M</TableHead>
              <TableHead className="w-[140px]">BRK</TableHead>
              <TableHead className="w-[160px]">Release P/L</TableHead>
              <TableHead className="w-[140px]">NET P/L</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((it, idx) => (
              <TableRow key={idx}>
                <TableCell className="text-left">{it.userName}</TableCell>
                <TableCell className="text-right">
                  {Number(it.m2mTotal || 0).toFixed(2)}
                </TableCell>
                <TableCell className="text-right">
                  {(it.role === CLIENT
                    ? Number(it.brokerageTotal || 0)
                    : Number(it.childUserBrokerageTotal || 0)
                  ).toFixed(2)}
                </TableCell>
                <TableCell className="text-right">
                  {(it.role === CLIENT
                    ? Number(it.profitLoss || 0)
                    : Number(it.childUserProfitLossTotal || 0)
                  ).toFixed(2)}
                </TableCell>
                <TableCell className="text-right">
                  <span
                    className={`${
                      Number(it.netpl || 0) >= 0
                        ? "text-emerald-400"
                        : "text-red-400"
                    } font-medium`}
                  >
                    {Number(it.netpl || 0).toFixed(2)}
                  </span>
                </TableCell>
              </TableRow>
            ))}

            <TableRow>
              <TableCell className="text-left text-white">
                <strong>Grand Total</strong>
              </TableCell>
              <TableCell className="text-right">
                <strong
                  className={`${
                    totals.m2m >= 0 ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {totals.m2m}
                </strong>
              </TableCell>
              <TableCell className="text-right">
                <strong
                  className={`${
                    totals.brk >= 0 ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {totals.brk}
                </strong>
              </TableCell>
              <TableCell className="text-right">
                <strong
                  className={`${
                    totals.rel >= 0 ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {totals.rel}
                </strong>
              </TableCell>
              <TableCell className="text-right">
                <strong
                  className={`${
                    totals.net >= 0 ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {totals.net}
                </strong>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
