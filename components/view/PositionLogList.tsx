"use client";

import apiClient from "@/lib/axiosInstance";

import React, { Fragment, useEffect, useMemo, useState } from "react";
import Select, { SingleValue } from "react-select";
import { motion } from "framer-motion";
import {
  ADMIN_API_ENDPOINT,
  EXCHANGE_LIST,
  INTRADAY,
  POSITION_LOG_LIST,
  SUCCESS,
  SYMBOL_LIST,
  USER_SEARCH_LIST,
} from "@/constant/index";
import { decryptData, encryptData } from "@/hooks/crypto";
import { formatDateTime } from "@/hooks/dateUtils";
import { toastError } from "@/hooks/toastMsg";
import { formatValue } from "@/hooks/range";

// ---- shadcn/ui ----
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// ---------------- Types ----------------
type SortDirection = "ascending" | "descending";
type SortKey =
  | "userName"
  | "exchangeName"
  | "symbolTitle"
  | "buyTotalQuantity"
  | "sellTotalQuantity"
  | "totalQuantity"
  | "price"
  | "createdAt"
  | "tradeMarginTotal";

interface SortConfig {
  key: SortKey | null;
  direction: SortDirection;
}
type OptionType = { label: string; value: string };
interface TableRow {
  userName: string;
  exchangeName: string;
  symbolTitle: string;
  oldProductType: string;
  productType: string;
  buyTotalQuantity: number;
  sellTotalQuantity: number;
  totalQuantity: number;
  price: number;
  createdAt: string | number | Date;
  tradeMarginTotal: number;
  symbolName?: string;
  masterName?: string;
}
interface MetaPayload {
  totalPage: number;
  totalCount: number;
}
interface ApiResponseEncrypted {
  statusCode: number;
  data: string;
  meta: MetaPayload;
  message?: string;
}

const PositionLogList: React.FC = () => {
  const deviceType =
    typeof window !== "undefined"
      ? localStorage.getItem("deviceType") || ""
      : "";
  const jwt_token =
    typeof window !== "undefined" ? localStorage.getItem("token") || "" : "";

  const [tableData, setTableData] = useState<TableRow[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);
  const itemsPerPage = 1000;
  const [loading, setLoading] = useState<boolean>(false);

  const [userData, setUserData] = useState<OptionType[]>([]);
  const [exchangeData, setExchangeData] = useState<OptionType[]>([]);
  const [symbolData, setSymbolData] = useState<OptionType[]>([]);
  const [formData, setFormData] = useState<{
    user: OptionType | null;
    symbol: OptionType | null;
    exchange: OptionType | null;
    startDate: string;
    endDate: string;
  }>({
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
  const requestSort = (key: SortKey) => {
    let direction: SortDirection = "ascending";
    if (sortConfig.key === key && sortConfig.direction === "ascending")
      direction = "descending";
    setSortConfig({ key, direction });
  };

  const sortedTableData = useMemo<TableRow[]>(() => {
    const sortableItems = [...tableData];
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        const key = sortConfig.key as SortKey;
        let aValue: any = (a as any)[key];
        let bValue: any = (b as any)[key];
        if (aValue == null) return 1;
        if (bValue == null) return -1;
        if (typeof aValue === "string")
          return sortConfig.direction === "ascending"
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        return sortConfig.direction === "ascending"
          ? aValue - bValue
          : bValue - aValue;
      });
    }
    return sortableItems;
  }, [tableData, sortConfig]);

  const fetchDataFromAPI = async (reset: 0 | 1) => {
    try {
      setLoading(true);
      let payload = {
        search: "",
        userId: formData.user?.value ?? "",
        symbolId: formData.symbol?.value ?? "",
        exchangeId: formData.exchange?.value ?? "",
        status: "",
        startDate: formData.startDate,
        endDate: formData.endDate,
        page: currentPage,
        limit: itemsPerPage,
      };
      if (reset === 1)
        payload = {
          ...payload,
          userId: "",
          symbolId: "",
          exchangeId: "",
          startDate: "",
          endDate: "",
        };
      const data = JSON.stringify({ data: encryptData(payload) });
      const response = await apiClient.post(POSITION_LOG_LIST, data);
      if (response.data.statusCode === SUCCESS) {
        const rdata = decryptData(response.data.data) as TableRow[];
        setTableData(Array.isArray(rdata) ? rdata : []);
        setTotalPages(response.data.meta.totalPage);
        setTotalCount(response.data.meta.totalCount);
      } else toastError(response.data.message || "Failed");
    } catch (error: any) {
      toastError(error?.response?.data?.message || "Request failed");
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (pageNumber: number) => setCurrentPage(pageNumber);
  const handleReset = async () => {
    setFormData({
      user: null,
      symbol: null,
      exchange: null,
      startDate: "",
      endDate: "",
    });
    fetchDataFromAPI(1);
  };
  const handleFilter = async () => {
    fetchDataFromAPI(0);
    setCurrentPage(1);
  };
  const getSortIcon = (key: SortKey) => {
    if (sortConfig.key !== key) return "fa-solid fa-sort text-gray-400 ml-1";
    return sortConfig.direction === "ascending"
      ? "fa-solid fa-sort-up text-blue-500 ml-1"
      : "fa-solid fa-sort-down text-blue-500 ml-1";
  };

  useEffect(() => {
    fetchDataFromAPI(0);
  }, [currentPage]);

  return (
    <div className="h-full">
      <div className="!px-2 !py-2 h-full text-white bg-[#181a20]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-7xl mx-auto"
        >
          <CardContent className="p-6 space-y-5">
            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
              <div>
                <Label style={{ color: "#fff" }}>From Date</Label>
                <Input
                  name="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) =>
                    setFormData({ ...formData, startDate: e.target.value })
                  }
                  className="bg-[#2b3139] border-[#2b3139] text-white"
                />
              </div>
              <div>
                <Label style={{ color: "#fff" }}>To Date</Label>
                <Input
                  name="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) =>
                    setFormData({ ...formData, endDate: e.target.value })
                  }
                  className="bg-[#2b3139] border-[#2b3139] text-white"
                />
              </div>
              <div>
                <Label style={{ color: "#fff" }}>User</Label>
                <Select
                  options={userData}
                  placeholder="Search user..."
                  styles={{
                    control: (base) => ({
                      ...base,
                      backgroundColor: "#2b3139",
                      borderColor: "#2b3139",
                      color: "white",
                    }),
                    menu: (base) => ({
                      ...base,
                      backgroundColor: "#2b3139",
                    }),
                    option: (base) => ({
                      ...base,
                      backgroundColor: "#2b3139",
                      color: "white",
                    }),
                    singleValue: (base) => ({
                      ...base,
                      color: "white",
                    }),
                    placeholder: (base) => ({
                      ...base,
                      color: "#848E9C",
                    }),
                  }}
                />
              </div>
              <div>
                <Label style={{ color: "#fff" }}>Exchange</Label>
                <Select
                  options={exchangeData}
                  placeholder="Select exchange"
                  styles={{
                    control: (base) => ({
                      ...base,
                      backgroundColor: "#2b3139",
                      borderColor: "#2b3139",
                      color: "white",
                    }),
                    menu: (base) => ({
                      ...base,
                      backgroundColor: "#2b3139",
                    }),
                    option: (base) => ({
                      ...base,
                      backgroundColor: "#2b3139",
                      color: "white",
                    }),
                    singleValue: (base) => ({
                      ...base,
                      color: "white",
                    }),
                    placeholder: (base) => ({
                      ...base,
                      color: "#848E9C",
                    }),
                  }}
                />
              </div>
              <div>
                <Label style={{ color: "#fff" }}>Symbol</Label>
                <Select
                  options={symbolData}
                  placeholder="Select symbol"
                  styles={{
                    control: (base) => ({
                      ...base,
                      backgroundColor: "#2b3139",
                      borderColor: "#2b3139",
                      color: "white",
                    }),
                    menu: (base) => ({
                      ...base,
                      backgroundColor: "#2b3139",
                    }),
                    option: (base) => ({
                      ...base,
                      backgroundColor: "#2b3139",
                      color: "white",
                    }),
                    singleValue: (base) => ({
                      ...base,
                      color: "white",
                    }),
                    placeholder: (base) => ({
                      ...base,
                      color: "#848E9C",
                    }),
                  }}
                />
              </div>
              <div className="flex gap-2 items-end justify-end">
                <Button
                  onClick={handleFilter}
                  className="bg-[#FCD535] hover:bg-[#FCD535] text-black"
                >
                  View
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleReset}
                  className="bg-[#e74c3c] hover:bg-[#e74c3c]"
                >
                  Clear
                </Button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-auto rounded-lg border border-white/10 mt-6 max-h-[65vh]">
              <table className="w-full border-collapse text-sm text-left">
                <thead className="sticky top-0 bg-[#1e2329] text-white/70">
                  <tr>
                    {[
                      "U.NAME",
                      "EXCH",
                      "SYMBOL",
                      "Old Position Type",
                      "Position Type",
                      "BUY QTY",
                      "SELL QTY",
                      "NET QTY",
                      "PRICE",
                      "UPDATED TIME",
                      "PUM",
                    ].map((col, idx) => (
                      <th
                        key={idx}
                        className="px-4 py-3 font-semibold whitespace-nowrap border-b border-white/10 !text-white"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    [...Array(8)].map((_, i) => (
                      <tr key={i}>
                        <td colSpan={11} className="p-3">
                          <Skeleton className="h-4 w-full bg-white/10" />
                        </td>
                      </tr>
                    ))
                  ) : sortedTableData.length > 0 ? (
                    sortedTableData.map((item, idx) => (
                      <tr key={idx} className="border-b border-white/5">
                        <td className="px-4 py-2">{item.userName}</td>
                        <td className="px-4 py-2">{item.exchangeName}</td>
                        <td className="px-4 py-2">{item.symbolTitle}</td>
                        <td className="px-4 py-2">
                          {item.oldProductType === INTRADAY ? "INTRADAY" : "CF"}
                        </td>
                        <td className="px-4 py-2">
                          {item.productType === INTRADAY ? "INTRADAY" : "CF"}
                        </td>
                        <td className="px-4 py-2">
                          {item.buyTotalQuantity.toFixed(2)}
                        </td>
                        <td className="px-4 py-2">
                          {item.sellTotalQuantity.toFixed(2)}
                        </td>
                        <td className="px-4 py-2">
                          {item.totalQuantity.toFixed(2)}
                        </td>
                        <td className="px-4 py-2">
                          {formatValue(item.price, item.exchangeName)}
                        </td>
                        <td className="px-4 py-2">
                          {formatDateTime(item.createdAt)}
                        </td>
                        <td className="px-4 py-2">
                          {item.tradeMarginTotal.toFixed(2)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={11}
                        className="text-center py-6"
                        style={{ color: "#fff" }}
                      >
                        No records found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex justify-end items-center pt-4">
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => handlePageChange(currentPage - 1)}
                  className="bg-[#2b3139] border-[#2b3139] text-white hover:bg-[#2b3139]"
                >
                  Previous
                </Button>
                <span style={{ color: "#848E9C" }}>
                  Page {currentPage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === totalPages}
                  onClick={() => handlePageChange(currentPage + 1)}
                  className="bg-[#2b3139] border-[#2b3139] text-white hover:bg-[#2b3139]"
                >
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </motion.div>
      </div>
    </div>
  );
};

export default PositionLogList;
