"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import apiClient from "@/lib/axiosInstance";

// ---- use your existing helpers / constants (unchanged) ----
import {
  ADMIN_API_ENDPOINT,
  BUY,
  SELL,
  SUCCESS,
  SYMBOL_POSITION_LIST,
} from "@/constant/index";
import { decryptData, encryptData } from "@/hooks/crypto";
import { toastError } from "@/hooks/toastMsg";
import { useWebSocket } from "@/components/socket/WebSocketProvider";
import { useSocket } from "@/components/socket/socketContext";
import webSocketManager from "@/components/socket/WebSocketManager";

// ---- shadcn/ui ----
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

// ---------------- Types ----------------
type PositionRow = {
  userName: string;
  symbolId: string;
  symbolTitle: string;
  symbolName: string;
  exchangeName: string;
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
  m2m?: number;
  m2mTotal?: number | string;
};

type SortKey =
  | "userName"
  | "exchangeName"
  | "symbolTitle"
  | "buyTotalQuantity"
  | "sellTotalQuantity"
  | "totalQuantity"
  | "price"
  | "m2mTotal"
  | "cmp";

type SortConfig = {
  key: SortKey | null;
  direction: "ascending" | "descending";
};

export type ChildPositionSheetProps = {
  /** provided by parent from NET QTY click */
  symbolId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

// ---------------- Consts ----------------
const ITEMS_PER_PAGE = 800;

// =======================================================
//  ChildPositionSheet  (Next.js + shadcn version of your component)
// =======================================================
export default function ChildPositionSheet({
  symbolId,
  open,
  onOpenChange,
}: ChildPositionSheetProps) {
  const { tickData } = useWebSocket();
  const { channelData } = useSocket();

  // env headers (same as your code)
  const deviceType =
    typeof window !== "undefined"
      ? localStorage.getItem("deviceType") ?? ""
      : "";
  const jwt_token =
    typeof window !== "undefined" ? localStorage.getItem("token") ?? "" : "";

  const subscribedSymbolsRef = useRef<string[]>([]);
  const [tableData, setTableData] = useState<PositionRow[]>([]);
  const [netplTotal, setNetplTotal] = useState<string>("0");
  const [totalCount, setTotalCount] = useState<number>(0);
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: null,
    direction: "ascending",
  });

  // ---- sorting (same behavior) ----
  const requestSort = (key: SortKey) => {
    let direction: SortConfig["direction"] = "ascending";
    if (sortConfig.key === key && sortConfig.direction === "ascending")
      direction = "descending";
    setSortConfig({ key, direction });
  };
  const getSortIcon = (key: SortKey) =>
    sortConfig.key !== key
      ? "fa-solid fa-sort"
      : sortConfig.direction === "ascending"
      ? "fa-solid fa-sort-up"
      : "fa-solid fa-sort-down";

  const sortedTableData = useMemo(() => {
    const items = [...tableData];
    if (!sortConfig.key) return items;

    items.sort((a: any, b: any) => {
      let aValue: any;
      let bValue: any;

      if (sortConfig.key === "cmp") {
        aValue = a.tradeType === BUY ? a.bid : a.ask;
        bValue = b.tradeType === BUY ? b.bid : b.ask;
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

  // ---- subscribe symbols (same) ----
  const addSymbolIfAbsent = (s: string) => {
    const arr = subscribedSymbolsRef.current;
    if (!arr.includes(s)) {
      arr.push(s);
      webSocketManager.sendSymbols(arr);
    }
  };

  // ---- M2M + totals (same math) ----
  const handleSetPositionM2m = (rdata: PositionRow[]) => {
    let netpl = 0;
    const newData = rdata.map((row) => {
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

      if (row.symbolName) addSymbolIfAbsent(row.symbolName);

      netpl += m2m;
      return { ...row, m2m, m2mTotal: Number(m2m.toFixed(2)) };
    });

    setNetplTotal(netpl.toFixed(2));
    setTableData(newData);
  };

  // ---- API fetch (unchanged payload/headers) ----
  const fetchDataFromAPI = async () => {
    if (!symbolId) return;
    try {
      const body = JSON.stringify({
        data: encryptData({
          search: "",
          userId: "",
          symbolId,
          exchangeId: "",
          status: "",
          page: 1,
          limit: ITEMS_PER_PAGE,
        }),
      });

      const res = await apiClient.post(
        SYMBOL_POSITION_LIST,
        body,
      );

      if (res.data.statusCode === SUCCESS) {
        const rdata: PositionRow[] = decryptData(res.data.data);
        handleSetPositionM2m(rdata);
        setTotalCount(res.data?.meta?.totalCount ?? rdata.length);
      } else {
        toastError(res.data.message);
      }
    } catch (err: any) {
      toastError(err?.response?.data?.message || "Failed to load positions");
      console.error("SYMBOL_POSITION_LIST error:", err);
    }
  };

  // ---- open → load ----
  useEffect(() => {
    if (open) fetchDataFromAPI();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, symbolId]);

  // ---- channel updates (same logic) ----
  useEffect(() => {
    if (!channelData) return;
    const d = channelData as any;

    if (d?.position?.symbolId === symbolId) {
      if (d?.position?.data) {
        const exists = tableData.some(
          (x) => x.symbolId === d.position.symbolId
        );
        if (!exists) {
          handleSetPositionM2m([d.position.data, ...tableData]);
        } else {
          handleSetPositionM2m(
            tableData.map((r) =>
              r.symbolId === d.position.symbolId ? d.position.data : r
            )
          );
        }
      } else {
        handleSetPositionM2m(
          tableData.filter((r) => r.symbolId !== d.position.symbolId)
        );
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelData]);

  // ---- tick updates (same math) ----
  useEffect(() => {
    if (!tickData || typeof tickData !== "object" || !("data" in tickData))
      return;
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

        netpl += m2m;
        return {
          ...row,
          ltp: Number(t.ltp),
          ask: Number(t.ask),
          bid: Number(t.bid),
          ch: Number(t.ch),
          chp: Number(t.chp),
          m2m,
          m2mTotal: Number(m2m.toFixed(2)),
        };
      } else {
        netpl += Number(row.m2mTotal ?? 0);
        return row;
      }
    });

    setNetplTotal(netpl.toFixed(2));
    setTableData(updated);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tickData]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[80vh] p-0 bg-[#181a20]">
        <SheetHeader className="!px-2 !py-1 ">
          <SheetTitle className="flex items-center gap-3 text-[#fcd535]">
            Open Position
          </SheetTitle>
        </SheetHeader>

        <div className="h-[calc(80vh-56px)] overflow-auto p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm text-[#fcd535]">Records — {totalCount}</div>
            <div className="text-sm text-white">
              Net M2M:&nbsp;
              <span
                className={
                  Number(netplTotal) >= 0 ? "text-green-600" : "text-red-600"
                }
              >
                {netplTotal}
              </span>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead
                  onClick={() => requestSort("userName")}
                  className="cursor-pointer "
                >
                  U.NAME <i className={getSortIcon("userName")} />
                </TableHead>
                <TableHead
                  onClick={() => requestSort("exchangeName")}
                  className="cursor-pointer"
                >
                  EXCHANGE <i className={getSortIcon("exchangeName")} />
                </TableHead>
                <TableHead
                  onClick={() => requestSort("symbolTitle")}
                  className="cursor-pointer"
                >
                  SYMBOL <i className={getSortIcon("symbolTitle")} />
                </TableHead>
                <TableHead
                  onClick={() => requestSort("buyTotalQuantity")}
                  className="cursor-pointer text-center"
                >
                  BUY QTY <i className={getSortIcon("buyTotalQuantity")} />
                </TableHead>
                <TableHead
                  onClick={() => requestSort("sellTotalQuantity")}
                  className="cursor-pointer text-center"
                >
                  SELL QTY <i className={getSortIcon("sellTotalQuantity")} />
                </TableHead>
                <TableHead
                  onClick={() => requestSort("totalQuantity")}
                  className="cursor-pointer"
                >
                  NET QTY <i className={getSortIcon("totalQuantity")} />
                </TableHead>
                <TableHead
                  onClick={() => requestSort("price")}
                  className="cursor-pointer"
                >
                  NET AVG PRICE <i className={getSortIcon("price")} />
                </TableHead>
                <TableHead
                  onClick={() => requestSort("cmp")}
                  className="cursor-pointer"
                >
                  CMP <i className={getSortIcon("cmp")} />
                </TableHead>
                <TableHead
                  onClick={() => requestSort("m2mTotal")}
                  className="cursor-pointer"
                >
                  M2M AMT <i className={getSortIcon("m2mTotal")} />
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {sortedTableData.map((item, idx) => (
                <TableRow key={`${item.symbolId}-${idx}`}>
                  <TableCell className="text-white">{item.userName}</TableCell>
                  <TableCell className="text-white">
                    {item.exchangeName}
                  </TableCell>
                  <TableCell className="text-white">
                    {item.symbolTitle}
                  </TableCell>
                  <TableCell className="text-center text-white ">
                    {Number(item.buyTotalQuantity).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-center text-white">
                    {Number(item.sellTotalQuantity).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-center text-white ">
                    {Number(item.totalQuantity).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right text-white ">
                    {Number(item.price).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right text-white ">
                    {item.tradeType === BUY
                      ? Number(item.bid).toFixed(2)
                      : Number(item.ask).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right text-white">
                    <span
                      className={
                        Number(item.m2mTotal) >= 0
                          ? "text-[#2EBD85]"
                          : "text-[#F6465D]"
                      }
                    >
                      {item.m2mTotal}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>

            <TableFooter className="bg-transparent">
              <TableRow>
                <TableCell>
                  <h6 className="m-0 font-semibold text-[#fcd535]">Total</h6>
                </TableCell>
                <TableCell />
                <TableCell />
                <TableCell />
                <TableCell />
                <TableCell />
                <TableCell />
                <TableCell />
                <TableCell className="text-right">
                  <span
                    className={`font-semibold ${
                      Number(netplTotal) >= 0
                        ? "text-[#2EBD85]"
                        : "text-[#F6465D]"
                    }`}
                  >
                    {netplTotal}
                  </span>
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      </SheetContent>
    </Sheet>
  );
}
