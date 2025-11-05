"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import * as ScrollArea from "@radix-ui/react-scroll-area";
import apiClient from "@/lib/axiosInstance";
import {
  ADMIN_API_ENDPOINT,
  CLIENT,
  MASTER,
  SUCCESS,
  SUPER_ADMIN,
  USER_CHILD_LIST,
} from "@/constant/index";
import { encryptData, decryptData } from "@/hooks/crypto";
import { toastError } from "@/hooks/toastMsg";

type AnyObj = Record<string, any>;

export type ParentUser = {
  userId: string;
  name: string;
  userName: string;
  role: string | number;
};

type ChildRow = {
  userId: string;
  name: string;
  userName: string;
  role: string | number;
  totalDeposit?: number;
  totalWithdraw?: number;
};

type SortDirection = "ascending" | "descending";
interface SortConfig {
  key: keyof ChildRow | "netBal" | "script" | null;
  direction: SortDirection;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  parentUser: ParentUser | null; // the row user you clicked
}

export default function UserChildListSheet({
  open,
  onOpenChange,
  parentUser,
}: Props) {
  const [loading, setLoading] = React.useState(false);
  const [tableData, setTableData] = React.useState<ChildRow[]>([]);
  const [totalPages, setTotalPages] = React.useState<number>(1);
  const [totalCount, setTotalCount] = React.useState<number>(0);
  const [currentPage, setCurrentPage] = React.useState<number>(1);
  const itemsPerPage = 100;

  const deviceType =
    (typeof window !== "undefined" && localStorage.getItem("deviceType")) || "";
  const jwt_token =
    (typeof window !== "undefined" && localStorage.getItem("token")) || "";
  const authenticated = React.useMemo(() => {
    if (typeof window === "undefined") return null;
    try {
      return JSON.parse(localStorage.getItem("authenticated") || "null");
    } catch {
      return null;
    }
  }, []);

  const [search, setSearch] = React.useState<string>("");

  const [dateRange, setDateRange] = React.useState<{
    startDate?: string;
    endDate?: string;
  }>({});

  const [sortConfig, setSortConfig] = React.useState<SortConfig>({
    key: null,
    direction: "ascending",
  });

  const requestSort = (key: SortConfig["key"]) => {
    let direction: SortDirection = "ascending";
    if (sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending";
    }
    setSortConfig({ key, direction });
  };

  const sortedTableData = React.useMemo(() => {
    const data = [...tableData];
    if (!sortConfig.key) return data;

    return data.sort((a: ChildRow, b: ChildRow) => {
      let aValue: any;
      let bValue: any;

      if (sortConfig.key === "netBal") {
        aValue = Number(a.totalDeposit ?? 0) - Number(a.totalWithdraw ?? 0);
        bValue = Number(b.totalDeposit ?? 0) - Number(b.totalWithdraw ?? 0);
      } else if (sortConfig.key !== null) {
        aValue = (a as AnyObj)[sortConfig.key];
        bValue = (b as AnyObj)[sortConfig.key];
      } else {
        aValue = undefined;
        bValue = undefined;
      }

      if (aValue == null) return 1;
      if (bValue == null) return -1;

      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortConfig.direction === "ascending"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      if (aValue < bValue) return sortConfig.direction === "ascending" ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === "ascending" ? 1 : -1;
      return 0;
    });
  }, [tableData, sortConfig]);

  const getSortIcon = (key: SortConfig["key"]) => {
    if (sortConfig.key !== key) return "fa-solid fa-sort";
    return sortConfig.direction === "ascending"
      ? "fa-solid fa-sort-up"
      : "fa-solid fa-sort-down";
  };

  const fetchData = React.useCallback(async () => {
    if (!parentUser) return;
    setLoading(true);
    try {
      const basePayload: AnyObj = {
        role: authenticated?.role,
        search,
        userId: parentUser.userId,
        page: currentPage,
        limit: itemsPerPage,
        status: 1,
        dwrStatus: 1,
      };

      if (dateRange.startDate && dateRange.endDate) {
        basePayload.startDate = dateRange.startDate;
        basePayload.endDate = dateRange.endDate;
      } else {
        basePayload.startDate = "";
        basePayload.endDate = "";
      }

      let data = encryptData(basePayload);
      data = JSON.stringify({ data });

      const resp = await apiClient.post(USER_CHILD_LIST, data);

      if (resp.data.statusCode == SUCCESS) {
        const rdata = decryptData(resp.data.data) as ChildRow[];
        setTableData(rdata || []);
        setTotalPages(resp.data.meta?.totalPage ?? 1);
        setTotalCount(resp.data.meta?.totalCount ?? rdata?.length ?? 0);
      } else {
        toastError(resp.data.message);
      }
    } catch (e: any) {
      toastError(e?.response?.data?.message || "Failed to load child list");
    } finally {
      setLoading(false);
    }
  }, [
    parentUser,
    authenticated?.role,
    search,
    currentPage,
    itemsPerPage,
    jwt_token,
    deviceType,
    dateRange.startDate,
    dateRange.endDate,
  ]);

  React.useEffect(() => {
    if (open) fetchData();
  }, [open, fetchData]);

  const resetFilters = () => {
    setSearch("");
    setDateRange({});
    setCurrentPage(1);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/30 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in data-[state=closed]:fade-out" />
        <Dialog.Content
          // Bottom sheet style
          className="fixed left-0 right-0 bottom-0 z-50 rounded-t-2xl bg-[#181a20] shadow-2xl border-t border-slate-200
                     data-[state=open]:animate-in data-[state=closed]:animate-out
                     data-[state=open]:slide-in-from-bottom-10 data-[state=closed]:slide-out-to-bottom-10"
        >
          {/* Handle / Header */}
          <div className="px-6 pt-4 pb-2">
            <div className="mx-auto h-1.5 w-12 rounded-full bg-slate-300" />
            <div className="mt-3 flex items-center justify-between">
              <div>
                <Dialog.Title className="text-lg font-semibold text-[#fcd535]">
                  {parentUser
                    ? `Child list of ${parentUser.name}`
                    : "Child list"}
                </Dialog.Title>
                <p className="text-xs text-[#848E9C]">
                  {totalCount} records • page {currentPage} of {totalPages}
                </p>
              </div>
              <Dialog.Close asChild>
                <button
                  className="rounded-lg px-3 py-1.5 text-sm bg-transparent text-[#fcd535]"
                  aria-label="Close"
                >
                  Close
                </button>
              </Dialog.Close>
            </div>
          </div>

          {/* Filters */}
          <div className="px-6 pb-3">
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-[#fcd535] mb-1 placeholder-white ">
                  Search
                </label>
                <input
                  className="w-full rounded-lg border-2 px-3 py-2 text-sm outline-none border-gray-600 placeholder-white"
                  placeholder="Search name / mobile..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>
              <div className="sm:col-span-1">
                <label className="block text-xs font-medium text-[#fcd535] mb-1">
                  From
                </label>
                <input
                  type="date"
                  className="w-full rounded-lg border-2 px-3 py-2 text-sm outline-none 
               border-gray-600 bg-white text-black placeholder-gray-500"
                  value={dateRange.startDate || ""}
                  onChange={(e) =>
                    setDateRange((p) => ({ ...p, startDate: e.target.value }))
                  }
                  max={dateRange.endDate || undefined}
                />
              </div>

              <div className="sm:col-span-1">
                <label className="block text-xs font-medium text-[#fcd535] mb-1">
                  To
                </label>
                <input
                  type="date"
                  className="w-full rounded-lg border-2 px-3 py-2 text-sm outline-none 
               border-gray-600 bg-white text-black placeholder-gray-500"
                  value={dateRange.endDate || ""}
                  onChange={(e) =>
                    setDateRange((p) => ({ ...p, endDate: e.target.value }))
                  }
                  min={dateRange.startDate || undefined}
                  max={
                    dateRange.startDate
                      ? new Date(
                          new Date(dateRange.startDate).getTime() + 7 * 86400000
                        )
                          .toISOString()
                          .split("T")[0]
                      : undefined
                  }
                />
              </div>

              <div className="sm:col-span-1 flex items-end gap-2">
                <button
                  className="flex-1 rounded-lg bg-[#fcd535] text-sm font-semibold px-4 py-2.5"
                  onClick={() => {
                    setCurrentPage(1);
                    fetchData();
                  }}
                >
                  View
                </button>
                <button
                  className="rounded-lg text-white text-sm font-semibold px-4 py-2.5"
                  onClick={resetFilters}
                  style={{
                    backgroundColor: "#fcd535",
                    color: "#181a20",
                    borderColor: "#3a3f47",
                  }}
                >
                  Reset
                </button>
              </div>
            </div>
          </div>

          {/* Table area (scrollable) */}
          <ScrollArea.Root className="h-[55vh] border-t border-slate-200">
            <ScrollArea.Viewport className="w-full h-full">
              <div className="min-w-full">
                <table className="min-w-full">
                  <thead>
                    <tr className="bg-[#1e2329]">
                      <th className="px-4 py-3 text-left text-[11px] font-bold text-[#fcd535] uppercase tracking-wider">
                        #
                      </th>
                      <th
                        className="px-4 py-3 text-left text-[11px] font-bold text-[#fcd535] uppercase tracking-wider cursor-pointer select-none"
                        onClick={() => requestSort("name")}
                      >
                        <span className="inline-flex items-center gap-2">
                          Username <i className={getSortIcon("name")} />
                        </span>
                      </th>
                      <th
                        className="px-4 py-3 text-left text-[11px] font-bold text-[#fcd535] uppercase tracking-wider cursor-pointer select-none"
                        onClick={() => requestSort("userName")}
                      >
                        <span className="inline-flex items-center gap-2">
                          Mobile <i className={getSortIcon("userName")} />
                        </span>
                      </th>
                      <th
                        className="px-4 py-3 text-right text-[11px] font-bold text-[#fcd535] uppercase tracking-wider cursor-pointer select-none"
                        onClick={() => requestSort("totalDeposit")}
                      >
                        <span className="inline-flex items-center gap-2 justify-end">
                          Total Deposit{" "}
                          <i className={getSortIcon("totalDeposit")} />
                        </span>
                      </th>
                      <th
                        className="px-4 py-3 text-right text-[11px] font-bold text-[#fcd535] uppercase tracking-wider cursor-pointer select-none"
                        onClick={() => requestSort("totalWithdraw")}
                      >
                        <span className="inline-flex items-center gap-2 justify-end">
                          Total Withdrawal{" "}
                          <i className={getSortIcon("totalWithdraw")} />
                        </span>
                      </th>
                      <th
                        className="px-4 py-3 text-right text-[11px] font-bold text-[#fcd535] uppercase tracking-wider cursor-pointer select-none"
                        onClick={() => requestSort("netBal")}
                      >
                        <span className="inline-flex items-center gap-2 justify-end">
                          Net Bal <i className={getSortIcon("netBal")} />
                        </span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {loading ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="py-8 text-center text-slate-500"
                        >
                          Loading...
                        </td>
                      </tr>
                    ) : sortedTableData.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="py-8 text-center text-slate-500"
                        >
                          No records found.
                        </td>
                      </tr>
                    ) : (
                      sortedTableData.map((item, idx) => (
                        <tr
                          key={`${item.userId}-${idx}`}
                          className="hover:bg-blue-50"
                        >
                          <td className="px-4 py-3 text-sm text-white">
                            {(currentPage - 1) * itemsPerPage + idx + 1}
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold text-[#fcd535]">
                            {item.name}
                          </td>
                          <td className="px-4 py-3 text-sm text-white">
                            {item.userName}
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-semibold text-green-600">
                            ₹{Number(item.totalDeposit ?? 0).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-semibold text-red-600">
                            ₹{Number(item.totalWithdraw ?? 0).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-sm text-right">
                            <span
                              className={`font-bold ${
                                Number(item.totalDeposit ?? 0) -
                                  Number(item.totalWithdraw ?? 0) >=
                                0
                                  ? "text-[#2EBD85]"
                                  : "text-[#F6465D]"
                              }`}
                            >
                              ₹
                              {(
                                Number(item.totalDeposit ?? 0) -
                                Number(item.totalWithdraw ?? 0)
                              ).toFixed(2)}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </ScrollArea.Viewport>
            <ScrollArea.Scrollbar
              orientation="vertical"
              className="flex select-none touch-none p-0.5 bg-slate-100"
            >
              <ScrollArea.Thumb className="flex-1 rounded bg-slate-300" />
            </ScrollArea.Scrollbar>
          </ScrollArea.Root>

          {/* Pagination / Footer actions */}
          <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
            <div className="text-xs text-[#848E9C]">
              Showing{" "}
              <span className="font-semibold">
                {(currentPage - 1) * itemsPerPage + 1} -{" "}
                {Math.min(currentPage * itemsPerPage, totalCount)}
              </span>{" "}
              of <span className="font-semibold">{totalCount}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                className={`px-3 py-1.5 text-sm rounded-lg border ${
                  currentPage === 1
                    ? "opacity-50 cursor-not-allowed bg-slate-100 border-slate-200 text-slate-400"
                    : "bg-white border-slate-300 text-slate-700"
                }`}
                onClick={() => currentPage > 1 && setCurrentPage((p) => p - 1)}
                disabled={currentPage === 1}
                style={{
                  backgroundColor: "#fcd535",
                  color: "#181a20",
                  borderColor: "#3a3f47",
                }}
              >
                Previous
              </button>
              <button
                className={`px-3 py-1.5 text-sm rounded-lg border ${
                  currentPage >= totalPages || totalPages === 0
                    ? "opacity-50 cursor-not-allowed bg-slate-100 border-slate-200 text-slate-400"
                    : "bg-white border-slate-300 text-slate-700"
                }`}
                onClick={() =>
                  currentPage < totalPages && setCurrentPage((p) => p + 1)
                }
                disabled={currentPage >= totalPages || totalPages === 0}
                style={{
                  backgroundColor: "#fcd535",
                  color: "#181a20",
                  borderColor: "#3a3f47",
                }}
              >
                Next
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
