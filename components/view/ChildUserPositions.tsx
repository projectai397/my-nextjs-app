
"use client";

import React, {
  Fragment,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import apiClient from "@/lib/axiosInstance";
import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import * as XLSX from "xlsx";

// ---- your app imports (unchanged) ----
import {
  ADMIN_API_ENDPOINT,
  BUY,
  EXCHANGE_LIST,
  POSITION_LIST,
  SELL,
  SUCCESS,
  SYMBOL_LIST,
} from "@/constant/index";
import { useWebSocket } from "@/components/socket/WebSocketProvider";
import { useSocket } from "@/components/socket/socketContext";
import webSocketManager from "@/components/socket/WebSocketManager";
import { addItem } from "@/hooks/arraySlice";
import { decryptData, encryptData } from "@/hooks/crypto";

import { toast } from "sonner";
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
interface RootState {
  array: string[];
}

type SortDirection = "ascending" | "descending";

type PositionRow = {
  userId: string;
  userName: string;
  exchangeName: string;
  symbolId: string;
  symbolTitle: string;
  symbolName: string;
  buyTotalQuantity: number;
  sellTotalQuantity: number;
  totalQuantity: number;
  price: number; // avg price
  bid: number;
  ask: number;
  ltp?: number;
  ch?: number;
  chp?: number;
  tradeType: typeof BUY | typeof SELL;
  m2m?: number;
  m2mTotal?: string | number;
};

type SortKey =
  | "userName"
  | "exchangeName"
  | "symbolTitle"
  | "buyTotalQuantity"
  | "sellTotalQuantity"
  | "totalQuantity"
  | "price"
  | "m2mTotal";

interface OptionKV {
  label: string;
  value: string;
}

// ============================ Component ============================
const ChildUserPositions: React.FC = () => {
  const { userId = "" } = useParams<{ userId: string }>();
  const { tickData } = useWebSocket();
  const { channelData } = useSocket();

  const deviceType =
    (typeof window !== "undefined" && localStorage.getItem("deviceType")) || "";
  const jwt_token =
    (typeof window !== "undefined" && localStorage.getItem("token")) || "";

  const array = useSelector((state: RootState) => state.array);
  const localArray = [...array];
  const dispatch = useDispatch();

  const [tableData, setTableData] = useState<PositionRow[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);
  const itemsPerPage = 800;

  const [netplTotal, setNetplTotal] = useState<string>("0.00");
  const [exchangeData, setExchangeData] = useState<OptionKV[]>([]);
  const [symbolData, setSymbolData] = useState<OptionKV[]>([]);
  const [formData, setFormData] = useState<{
    exchange?: OptionKV;
    symbol?: OptionKV;
  } | null>({});

  const [sortConfig, setSortConfig] = useState<{
    key: SortKey | null;
    direction: SortDirection;
  }>({
    key: null,
    direction: "ascending",
  });

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
    if (!sortConfig.key) return items;
    return items.sort((a, b) => {
      const k = sortConfig.key!;
      const aVal = (a as any)[k];
      const bVal = (b as any)[k];
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortConfig.direction === "ascending"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      if (aVal < bVal) return sortConfig.direction === "ascending" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "ascending" ? 1 : -1;
      return 0;
    });
  }, [tableData, sortConfig]);

  const addSymbolNameInArray = async (symbolName: string) => {
    if (!localArray.includes(symbolName)) {
      // @ts-ignore - your slice typing
      await dispatch(addItem(symbolName));
      localArray.push(symbolName);
    }
  };

  const socketSubscribeSymbols = async (rows: PositionRow[]) => {
    for (const r of rows) await addSymbolNameInArray(r.symbolName);
    webSocketManager.sendSymbols(localArray);
  };

  const handleSetPositionM2m = (rows: PositionRow[]) => {
    let netpl = 0;
    const next = rows.map((row) => {
      let m2m: number;
      if (row.tradeType === SELL && row.totalQuantity > 0) {
        m2m = (row.ask - Number(row.price.toFixed(2))) * row.totalQuantity;
      } else {
        if (row.totalQuantity < 0) {
          m2m = (row.ask - Number(row.price.toFixed(2))) * row.totalQuantity;
        } else {
          m2m = (row.bid - Number(row.price.toFixed(2))) * row.totalQuantity;
        }
      }
      netpl += m2m;
      return { ...row, m2m, m2mTotal: m2m.toFixed(2) } as PositionRow;
    });
    setNetplTotal(netpl.toFixed(2));
    setTableData(next);
    socketSubscribeSymbols(next);
  };

  const fetchExchanges = async () => {
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
      const res = await apiClient.post(EXCHANGE_LIST, body);
      if (res.data.statusCode === SUCCESS) {
        const items = decryptData(res.data.data) as Array<{
          name: string;
          exchangeId: string;
        }>;
        setExchangeData(
          items.map((i) => ({ label: i.name, value: i.exchangeId }))
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSymbols = async (exchangeId: string) => {
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
      const res = await apiClient.post(SYMBOL_LIST, body);
      if (res.data.statusCode === SUCCESS) {
        const items = decryptData(res.data.data) as Array<{
          symbolName: string;
          symbolId: string;
        }>;
        setSymbolData(
          items.map((i) => ({ label: i.symbolName, value: i.symbolId }))
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchPositions = async (reset: 0 | 1) => {
    try {
      const payload = reset
        ? encryptData({
            search: "",
            userId: userId || "",
            symbolId: "",
            exchangeId: "",
            status: "",
            page: currentPage,
            limit: itemsPerPage,
          })
        : encryptData({
            search: "",
            userId: userId || (formData?.exchange ? "" : ""),
            symbolId: formData?.symbol?.value || "",
            exchangeId: formData?.exchange?.value || "",
            status: "",
            page: currentPage,
            limit: itemsPerPage,
          });

      const res = await apiClient.post(
        POSITION_LIST,
        JSON.stringify({ data: payload })
      );

      if (res.data.statusCode === SUCCESS) {
        const rows = decryptData(res.data.data) as PositionRow[];
        handleSetPositionM2m(rows);
        setTotalPages(res.data.meta.totalPage);
        setTotalCount(res.data.meta.totalCount);
      } else {
        toast.error(res.data.message);
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message);
    }
  };

  const onView = () => {
    setCurrentPage(1);
    fetchPositions(0);
  };

  const onClear = () => {
    setFormData({});
    setSymbolData([]);
    setCurrentPage(1);
    fetchPositions(1);
  };

  const exportToExcel = () => {
    const table = document.getElementById("posTable");
    if (!table) return;
    const ws = XLSX.utils.table_to_sheet(table);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Positions");
    XLSX.writeFile(wb, "PositionData.xlsx");
  };

  // Realtime updates
  useEffect(() => {
    if (
      channelData?.position?.symbolId &&
      channelData?.position?.userId === userId
    ) {
      const incoming = channelData.position.data as PositionRow | undefined;
      if (!incoming) {
        const filtered = tableData.filter(
          (r) => r.symbolId !== channelData.position.symbolId
        );
        handleSetPositionM2m(filtered);
      } else {
        const exists = tableData.some((r) => r.symbolId === incoming.symbolId);
        const next = exists
          ? tableData.map((r) =>
              r.symbolId === incoming.symbolId ? incoming : r
            )
          : [incoming, ...tableData];
        handleSetPositionM2m(next);
      }
    }
  }, [channelData]);

  useEffect(() => {
    if (tickData?.data && tableData.length) {
      let netpl = 0;
      const next = tableData.map((row) => {
        if (row.symbolName === tickData.data.symbol) {
          const bid = tickData.data.bid as number;
          const ask = tickData.data.ask as number;
          let m2m: number;
          if (row.tradeType === SELL && row.totalQuantity > 0) {
            m2m = (ask - Number(row.price.toFixed(2))) * row.totalQuantity;
          } else {
            m2m =
              (row.totalQuantity < 0 ? ask : bid) * row.totalQuantity -
              Number(row.price.toFixed(2)) * row.totalQuantity;
          }
          netpl += m2m;
          return {
            ...row,
            ltp: tickData.data.ltp,
            bid,
            ask,
            ch: tickData.data.ch,
            chp: tickData.data.chp,
            m2m,
            m2mTotal: m2m.toFixed(2),
          };
        }
        netpl += Number(row.m2mTotal || 0);
        return row;
      });
      setNetplTotal(netpl.toFixed(2));
      setTableData(next);
    }
  }, [tickData]);

  // init
  useEffect(() => {
    fetchPositions(0);
    fetchExchanges();
    document.title = "Admin Panel | Position";
    return () => {
      document.title = "Admin Panel";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  return (
    <Fragment>
      <div className="px-4 sm:px-6 py-6">
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl md:text-2xl font-semibold tracking-tight text-[#003B5C]">
                Position
              </CardTitle>
              <Badge variant="secondary" className="rounded-full">
                Records — {totalCount}
              </Badge>
            </div>
            <Separator className="mt-3" />

            {/* Filters */}
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-4">
              <div>
                <Label className="text-sm text-gray-700">Exchange</Label>
                <Select
                  value={formData?.exchange?.value}
                  onValueChange={(val) => {
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
                  onValueChange={(val) => {
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
                      {symbolData.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              <div className="xl:col-span-2 md:col-span-2 flex items-end gap-2">
                <Button onClick={onView} className="w-full md:w-auto">
                  View
                </Button>
                <Button
                  variant="destructive"
                  onClick={onClear}
                  className="w-full md:w-auto"
                >
                  Clear
                </Button>
                <Button
                  variant="outline"
                  onClick={exportToExcel}
                  className="w-full md:w-auto"
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
              <Table className="min-w-full border-collapse" id="posTable">
                <TableCaption className="text-xs text-gray-500">
                  Live positions. Click a symbol or net qty to drill down.
                </TableCaption>
                <TableHeader className="sticky top-0 z-20 bg-gray-50/95 backdrop-blur supports-[backdrop-filter]:bg-gray-50/70 text-gray-700 text-sm font-medium shadow-sm">
                  <TableRow className="hover:bg-transparent border-b border-gray-200">
                    <TableHead
                      onClick={() => requestSort("userName")}
                      className="px-3 py-2 cursor-pointer"
                    >
                      U. NAME <i className={getSortIcon("userName")} />
                    </TableHead>
                    <TableHead
                      onClick={() => requestSort("exchangeName")}
                      className="px-3 py-2 cursor-pointer"
                    >
                      EXCHANGE <i className={getSortIcon("exchangeName")} />
                    </TableHead>
                    <TableHead
                      onClick={() => requestSort("symbolTitle")}
                      className="px-3 py-2 cursor-pointer"
                    >
                      SYMBOL <i className={getSortIcon("symbolTitle")} />
                    </TableHead>
                    <TableHead
                      onClick={() => requestSort("buyTotalQuantity")}
                      className="px-3 py-2 cursor-pointer"
                    >
                      BUY QTY <i className={getSortIcon("buyTotalQuantity")} />
                    </TableHead>
                    <TableHead
                      onClick={() => requestSort("sellTotalQuantity")}
                      className="px-3 py-2 cursor-pointer"
                    >
                      SELL QTY{" "}
                      <i className={getSortIcon("sellTotalQuantity")} />
                    </TableHead>
                    <TableHead
                      onClick={() => requestSort("totalQuantity")}
                      className="px-3 py-2 cursor-pointer"
                    >
                      NET QTY <i className={getSortIcon("totalQuantity")} />
                    </TableHead>
                    <TableHead
                      onClick={() => requestSort("price")}
                      className="px-3 py-2 cursor-pointer"
                    >
                      NET AVG PRICE <i className={getSortIcon("price")} />
                    </TableHead>
                    <TableHead className="px-3 py-2">CMP</TableHead>
                    <TableHead
                      onClick={() => requestSort("m2mTotal")}
                      className="px-3 py-2 cursor-pointer text-right"
                    >
                      M2M AMT <i className={getSortIcon("m2mTotal")} />
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-sm">
                  {sortedTableData.map((item, idx) => (
                    <TableRow
                      key={`${item.symbolId}-${idx}`}
                      className="hover:bg-gray-50 even:bg-gray-50/40 transition-colors"
                    >
                      <TableCell className="px-3 py-2">
                        {item.userName}
                      </TableCell>
                      <TableCell className="px-3 py-2">
                        {item.exchangeName}
                      </TableCell>
                      <TableCell className="px-3 py-2">
                        <button
                          className="text-[#003B5C] underline underline-offset-2 hover:opacity-80"
                          //   onClick={() => navigate(`/positions/${item.symbolId}/child`)}
                        >
                          {item.symbolTitle}
                        </button>
                      </TableCell>
                      <TableCell className="px-3 py-2">
                        {item.buyTotalQuantity}
                      </TableCell>
                      <TableCell className="px-3 py-2">
                        {item.sellTotalQuantity}
                      </TableCell>
                      <TableCell className="px-3 py-2">
                        <button
                          className="text-[#003B5C] underline underline-offset-2 hover:opacity-80"
                          //   onClick={() => navigate(`/positions/${item.symbolId}/child`)}
                        >
                          {item.totalQuantity}
                        </button>
                      </TableCell>
                      <TableCell className="px-3 py-2">
                        {item.price.toFixed(2)}
                      </TableCell>
                      <TableCell className="px-3 py-2">
                        {item.tradeType === BUY ? item.bid : item.ask}
                      </TableCell>
                      <TableCell
                        className={`px-3 py-2 text-right ${
                          Number(item.m2mTotal) > 0
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {item.m2mTotal}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell colSpan={8} className="px-3 py-2 font-medium">
                      Total
                    </TableCell>
                    <TableCell
                      className={`px-3 py-2 font-semibold ${
                        Number(netplTotal) > 0
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {netplTotal}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </Fragment>
  );
};

export default ChildUserPositions;
