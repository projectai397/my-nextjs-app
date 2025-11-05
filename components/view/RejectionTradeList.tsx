"use client";

import React, { useEffect, useState } from "react";
import apiClient from "@/lib/axiosInstance";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
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
} from "@/components/ui/command";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { ChevronsUpDown, Check, ChevronLeft, ChevronRight } from "lucide-react";
import {
  ADMIN_API_ENDPOINT,
  EXCHANGE_LIST,
  REJECT_TRADE_LIST,
  SUCCESS,
  USER_SEARCH_LIST,
} from "@/constant/index";
import { decryptData, encryptData } from "@/hooks/crypto";
import { formatDateTime } from "@/hooks/dateUtils";
import { formatValue } from "@/hooks/range";

type OptionType = { label: string; value: string };

type TableRowT = {
  createdAt: string | number | Date;
  updatedAt: string | number | Date;
  status: string;
  userName: string;
  symbolTitle: string;
  symbolName?: string;
  exchangeName: string;
  tradeType: string;
  totalQuantity: number;
  price: number;
  comment: string;
  ipAddress: string;
  deviceId: string;
};

type FormDataState = {
  user: OptionType | null;
  symbol: OptionType | null;
  exchange: OptionType | null;
  startDate: string;
  endDate: string;
};

function UserCombobox({ value, onChange, fetchOptions, options }: any) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className="w-full justify-between bg-[#1e2329] border-gray-700 text-white"
        >
          {value ? value.label : "TYPE TO SEARCH..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0 bg-[#1e2329] border-gray-700">
        <Command className="bg-[#1e2329]">
          <CommandInput
            placeholder="Search user..."
            onValueChange={(v) => fetchOptions(v)}
            className="text-white"
          />
          <CommandEmpty className="!text-[#fff]">No user found.</CommandEmpty>
          <CommandGroup>
            {options.map((opt: OptionType) => (
              <CommandItem
                key={opt.value}
                value={opt.label}
                onSelect={() => {
                  onChange(opt);
                  setOpen(false);
                }}
                className="text-white"
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
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default function RejectionTradeList() {
  const deviceType =
    (typeof window !== "undefined" && localStorage.getItem("deviceType")) || "";
  const jwt_token =
    (typeof window !== "undefined" && localStorage.getItem("token")) || "";

  const [tableData, setTableData] = useState<TableRowT[]>([]);
  const [exchangeData, setExchangeData] = useState<OptionType[]>([]);
  const [symbolData] = useState<OptionType[]>([]); // (filled elsewhere if needed)
  const [userData, setUserData] = useState<OptionType[]>([]);
  const [formData, setFormData] = useState<FormDataState>({
    user: null,
    symbol: null,
    exchange: null,
    startDate: "",
    endDate: "",
  });
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const fetchOptions = async (query: string) => {
    if (query.length < 3) return;
    try {
      const body = JSON.stringify({
        data: encryptData({ search: query, page: 1, limit: 50 }),
      });

      const res = await apiClient.post(
        USER_SEARCH_LIST,
        body,
      );

      if (res.data.statusCode === SUCCESS) {
        const dec = decryptData(res.data.data) as any[];
        setUserData(dec.map((u) => ({ label: u.userName, value: u.userId })));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleFetch = async () => {
    const payload = {
      userId: formData.user?.value || "",
      symbolId: formData.symbol?.value || "",
      exchangeId: formData.exchange?.value || "",
      startDate: formData.startDate || "",
      endDate: formData.endDate || "",
      page,
      limit: 100,
    };
    try {
      setIsLoading(true);
      const body = JSON.stringify({ data: encryptData(payload) });
      const res = await apiClient.post(
        REJECT_TRADE_LIST,
        body,
      );
      if (res.data.statusCode === SUCCESS) {
        const dec = decryptData(res.data.data) as TableRowT[];
        setTableData(dec);
        setTotalCount(res.data.meta?.totalCount ?? dec.length ?? 0);
        setTotalPages(Math.max(1, res.data.meta?.totalPage ?? 1));
      } else {
        setTableData([]);
        setTotalCount(0);
        setTotalPages(1);
      }
    } catch (e) {
      console.error(e);
      setTableData([]);
      setTotalCount(0);
      setTotalPages(1);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGetExchange = async () => {
    try {
      const body = JSON.stringify({
        data: encryptData({ page: 1, limit: 50 }),
      });
      const res = await apiClient.post(EXCHANGE_LIST, body);
      if (res.data.statusCode === SUCCESS) {
        const dec = decryptData(res.data.data) as any[];
        setExchangeData(
          dec.map((x) => ({ label: x.name, value: x.exchangeId }))
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    handleFetch();
    handleGetExchange();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  return (
    <div
      className="!p-2 space-y-4 h-full overflow-y-auto "
      style={{ backgroundColor: "#181a20" }}
    >
      <CardContent className="mb-10">
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-7 gap-3 mb-4">
          <Input
            type="date"
            value={formData.startDate}
            onChange={(e) =>
              setFormData({ ...formData, startDate: e.target.value })
            }
            className="bg-[#1e2329] border-gray-700 text-white"
          />
          <Input
            type="date"
            value={formData.endDate}
            onChange={(e) =>
              setFormData({ ...formData, endDate: e.target.value })
            }
            className="bg-[#1e2329] border-gray-700 text-white"
          />

          <UserCombobox
            value={formData.user}
            onChange={(v: any) => setFormData({ ...formData, user: v })}
            fetchOptions={fetchOptions}
            options={userData}
          />

          <select
            value={formData.exchange?.value || ""}
            onChange={(e) =>
              setFormData({
                ...formData,
                exchange:
                  exchangeData.find((x) => x.value === e.target.value) || null,
              })
            }
            className="bg-[#1e2329] border-gray-700 text-white"
          >
            <option value="">SELECT...</option>
            {exchangeData.map((x) => (
              <option key={x.value} value={x.value} className="text-white">
                {x.label}
              </option>
            ))}
          </select>

          <select
            value={formData.symbol?.value || ""}
            onChange={(e) =>
              setFormData({
                ...formData,
                symbol:
                  symbolData.find((x) => x.value === e.target.value) || null,
              })
            }
            className="bg-[#1e2329] border-gray-700 text-white"
          >
            <option value="">SELECT...</option>
            {symbolData.map((x) => (
              <option key={x.value} value={x.value} className="text-white">
                {x.label}
              </option>
            ))}
          </select>

          <Button
            className="bg-amber-500 hover:bg-amber-600"
            onClick={handleFetch}
            disabled={isLoading}
          >
            {isLoading ? "Loading..." : "View"}
          </Button>
          <Button
            variant="destructive"
            onClick={() =>
              setFormData({
                user: null,
                symbol: null,
                exchange: null,
                startDate: "",
                endDate: "",
              })
            }
          >
            Clear
          </Button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <ScrollArea className="h-full rounded-md border border-gray-700">
            <div className="">
              <Table className="text-sm">
                <TableHeader className="bg-[#1e2329] sticky top-0 z-10">
                  <TableRow>
                    <TableHead className="!text-[#fff]">ORDER D/T</TableHead>
                    <TableHead className="!text-[#fff]">STATUS</TableHead>
                    <TableHead className="!text-[#fff]">U.NAME</TableHead>
                    <TableHead className="!text-[#fff]">SYMBOL</TableHead>
                    <TableHead className="!text-[#fff]">TYPE</TableHead>
                    <TableHead className="!text-[#fff]">QTY</TableHead>
                    <TableHead className="!text-[#fff]">PRICE</TableHead>
                    <TableHead className="!text-[#fff]">COMMENT</TableHead>
                    <TableHead className="!text-[#fff]">IP ADDRESS</TableHead>
                    <TableHead className="!text-[#fff]">DEVICE ID</TableHead>
                    <TableHead className="!text-[#fff]">DATE</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell
                        colSpan={11}
                        className="text-center !text-[#fff] py-6"
                      >
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : tableData.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={11}
                        className="text-center !text-[#fff] py-6"
                      >
                        No data available
                      </TableCell>
                    </TableRow>
                  ) : (
                    tableData.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="!text-[#fff]">
                          {formatDateTime(item.createdAt)}
                        </TableCell>
                        <TableCell className="text-red-600 font-semibold">
                          {item.status}
                        </TableCell>
                        <TableCell className="!text-white">
                          {item.userName}
                        </TableCell>
                        <TableCell className="text-white">
                          {item.symbolTitle}
                        </TableCell>
                        <TableCell className="text-white">
                          {item.tradeType}
                        </TableCell>
                        <TableCell className="text-white">
                          {Number(item.totalQuantity).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-white">
                          {formatValue(item.price, item.exchangeName)}
                        </TableCell>
                        <TableCell className="text-white">
                          <div
                            className="truncate max-w-[200px]"
                            title={item.comment}
                          >
                            {item.comment}
                          </div>
                        </TableCell>
                        <TableCell className="text-white">
                          {item.ipAddress}
                        </TableCell>
                        <TableCell className="text-white">
                          {item.deviceId}
                        </TableCell>
                        <TableCell className="text-white">
                          {formatDateTime(item.updatedAt)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </ScrollArea>
        </div>

        {/* Pagination */}
        <div className="flex justify-end gap-2 mt-3">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1 || isLoading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="bg-[#1e2329] border-gray-700 text-white"
          >
            <ChevronLeft className="h-4 w-4" />
            Prev
          </Button>
          <span className="text-sm !text-[#fff] mt-1">
            Page {page}/{totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page === totalPages || isLoading}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="bg-[#1e2329] border-gray-700 text-white"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </div>
  );
}
