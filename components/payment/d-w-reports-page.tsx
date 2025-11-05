"use client";

import apiClient from "@/lib/axiosInstance";

import { Fragment, useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import dynamic from "next/dynamic";

// import { Breadcrumbs } from "../../AbstractElements";
const UserChildListSheet = dynamic(() => import("./UserChildListSheet"), {
  ssr: false,
});
import {
  ADMIN,
  ADMIN_API_ENDPOINT,
  CLIENT,
  MASTER,
  SUCCESS,
  SUPER_ADMIN,
  USER_CHILD_LIST,
  USER_LIST,
  USER_LIST_EXPORT,
} from "@/constant/index";
import {
  formatDateForExportExcelName,
  formatDateTime,
} from "@/hooks/dateUtils";
import { useSession } from "next-auth/react";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";
import { decryptData, decryptData1, encryptData } from "@/hooks/crypto";
import { toast } from "sonner";

export default function PaymentRequestPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const params = useParams();
  const role = (params?.role as string) || undefined;

  const deviceType =
    typeof window !== "undefined" ? localStorage.getItem("deviceType") : null;
  const jwt_token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const authenticated = useMemo(() => {
    if (typeof window === "undefined") return {};
    const raw = localStorage.getItem("authenticated");
    return raw ? JSON.parse(raw) : {};
  }, []);

  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 100;
  const [tableData, setTableData] = useState<any[]>([]);
  const [formFilterData, setFormFilterData] = useState<any>({});
  const [searchFormData, setSearchFormData] = useState<any>({
    search: "",
    roleId: MASTER,
  });
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedParent, setSelectedParent] = useState<{
    userId: string;
    name: string;
    userName: string;
    role: string | number;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  // NEW: flags to control "No match found" vs "No records"
  const [isFilterActive, setIsFilterActive] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  const [sortConfig, setSortConfig] = useState<{
    key: any;
    direction: "ascending" | "descending";
  }>({
    key: null,
    direction: "ascending",
  });

  const requestSort = (key: any) => {
    let direction: "ascending" | "descending" = "ascending";
    if (sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending";
    }
    setSortConfig({ key, direction });
  };

  const sortedTableData = useMemo(() => {
    let sortableItems = [...tableData];
    if (sortConfig.key !== null) {
      sortableItems.sort((a: any, b: any) => {
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
        } else if (sortConfig.key === "netBal") {
          aValue = Number(a.totalDeposit ?? 0) - Number(a.totalWithdraw ?? 0);
          bValue = Number(b.totalDeposit ?? 0) - Number(b.totalWithdraw ?? 0);
        } else {
          aValue = a[sortConfig.key];
          bValue = b[sortConfig.key];
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

  const getSortIcon = (key: any) => {
    if (sortConfig.key !== key) return "fa-solid fa-sort";
    return sortConfig.direction === "ascending"
      ? "fa-solid fa-sort-up"
      : "fa-solid fa-sort-down";
  };

  const handleFilterChange = (e: any) => {
    const { name, value } = e.target;
    const updated = { ...formFilterData, [name]: value };

    const start = new Date(updated.startDate);
    const end = new Date(updated.endDate);
    if (updated.startDate && updated.endDate) {
      const diffDays =
        (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
      // range validation if needed
    }
    setFormFilterData(updated);
  };

  const fetchDataFromAPI = async () => {
    try {
      let basePayload: any = {
        role: authenticated.role,
        search: searchFormData?.search ? searchFormData.search : "",
        roleId: searchFormData?.roleId ? searchFormData.roleId : MASTER,
        page: currentPage,
        limit: itemsPerPage,
        dwrStatus: 1,
      };

      if (formFilterData.startDate && formFilterData.endDate) {
        basePayload.startDate = formFilterData.startDate;
        basePayload.endDate = formFilterData.endDate;
      } else {
        basePayload.startDate = "";
        basePayload.endDate = "";
      }

      let data = encryptData(basePayload);
      data = JSON.stringify({ data });
      let apiUrl = USER_CHILD_LIST;
      if (authenticated.role === MASTER) {
        apiUrl = USER_LIST;
      }

      apiClient
        .post(ADMIN_API_ENDPOINT + apiUrl, data, {
          headers: {
            Authorization: (jwt_token as string) || "",
            "Content-Type": "application/json",
            deviceType: (deviceType as string) || "",
          },
        })
        .then((response) => {
          if (response.data.statusCode == SUCCESS) {
            const rdata = decryptData(response.data.data);
            setTableData(rdata);
            setTotalPages(response.data.meta.totalPage);
            setTotalCount(response.data.meta.totalCount);
          } else {
            toast.error(response.data.message);
          }
        })
        .catch((error) => {
          toast.error(error?.response?.data?.message || "Error");
          console.error("Login error:", error);
        });
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const handlePageChange = async (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  const UserChildRedirect = (item: any, redirect: string) => {
    const valueToSend = { item };
    if (typeof window !== "undefined") {
      sessionStorage.setItem(
        "userChildRedirectPayload",
        JSON.stringify(valueToSend)
      );
    }
    router.push(redirect);
  };

  // UPDATED: full reset incl. date, search, roleId, page
  const handleReset = async () => {
    const defaultRoleId =
      authenticated?.roleId === SUPER_ADMIN ? MASTER : MASTER;
    setFormFilterData({});
    setSearchFormData({ search: "", roleId: defaultRoleId });
    setCurrentPage(1);
    setIsFilterActive(false);
    await fetchDataFromAPI();
  };

  const handleSearchChange = (e: any) => {
    const { name, value } = e.target;
    setSearchFormData((prev: any) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFilter = async () => {
    // Mark filter active if any filter present
    const active =
      !!formFilterData.startDate ||
      !!formFilterData.endDate ||
      !!searchFormData.search;
    setIsFilterActive(active);
    setCurrentPage(1);
    await fetchDataFromAPI();
  };

  const exportToExcel = () => {
    setLoading(true);
    try {
      let data = encryptData({
        search: searchFormData?.search ? searchFormData.search : "",
        roleId: searchFormData?.roleId ? searchFormData.roleId : MASTER,
        page: currentPage,
        limit: itemsPerPage,
      });
      data = JSON.stringify({ data });
      let apiUrl = USER_CHILD_LIST;
      if (authenticated.role === MASTER) {
        apiUrl = USER_LIST_EXPORT;
      }
      apiClient
        .post(ADMIN_API_ENDPOINT + apiUrl, data, {
          headers: {
            Authorization: (jwt_token as string) || "",
            "Content-Type": "application/json",
            deviceType: (deviceType as string) || "",
          },
        })
        .then((response) => {
          if (response.data.statusCode == SUCCESS) {
            const rdata = decryptData1(response.data.data);
            generateExcel(rdata);
          } else {
            toast.error(response.data.message);
            setLoading(false);
          }
        })
        .catch((error) => {
          console.error("Login error:", error);
          toast.error(error?.response?.data?.message || "Error");
          setLoading(false);
        });
    } catch (error) {
      console.error("Error fetching data:", error);
      setLoading(false);
    }
  };

  const generateExcel = (data: any[]) => {
    if (!data || data.length === 0) {
      alert("No data available to export.");
      setLoading(false);
      return;
    }

    setTimeout(() => {
      const excelData = data.map((item: any) => ({
        ...(authenticated.role === ADMIN || authenticated.role === SUPER_ADMIN
          ? { Parent: item.name }
          : {}),
        Name: item.name,
        Phone: item.phone,
        ...(authenticated.role === MASTER ||
        authenticated.role === ADMIN ||
        authenticated.role === SUPER_ADMIN
          ? { Role: item.roleName }
          : {}),
        ...(authenticated.role === MASTER
          ? { "Parent Name": item.parentUser }
          : {}),
        ...(authenticated.role === ADMIN || authenticated.role === SUPER_ADMIN
          ? { "%": item.profitAndLossSharing }
          : {}),
        ...(authenticated.role === ADMIN || authenticated.role === SUPER_ADMIN
          ? { "Brk %": item.brkSharing }
          : {}),
        Balance: Number(item.balance.toFixed(2)),
        "P/L":
          item.role === CLIENT
            ? Number((item.profitLoss - item.brokerageTotal).toFixed(2))
            : Number((item.profitLoss + item.brokerageTotal).toFixed(2)),
        "Created At": formatDateTime(item.createdAt),
        "Last Login D/T": formatDateTime(item.lastLoginTime),
        "Device ID": item.deviceId,
        "IP Address": item.ipAddress,
      }));

      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "UserList");

      const excelBuffer = XLSX.write(workbook, {
        bookType: "xlsx",
        type: "array",
      });
      const blob = new Blob([excelBuffer], {
        type: "application/octet-stream",
      });
      const userName = authenticated.userName;
      const now = new Date();
      const fileName = `${userName}USERS${formatDateForExportExcelName(
        now
      )}.xlsx`;
      saveAs(blob, fileName);
      setLoading(false);
    }, 100);
    return true;
  };

  useEffect(() => {
    fetchDataFromAPI();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  useEffect(() => {
    document.title = "Admin Panel | Deposit Withdrwals";
    return () => {
      document.title = "Admin Panel";
    };
  }, []);

  useEffect(() => {
    const roleId = authenticated?.roleId === SUPER_ADMIN ? MASTER : MASTER;
    if (searchFormData.roleId !== roleId) {
      setSearchFormData((prev: any) => ({ ...prev, roleId }));
    }
  }, [authenticated]); // eslint-disable-line

  const totalDepositTotal = useMemo(() => {
    return sortedTableData
      .reduce(
        (sum: number, item: any) => sum + Number(item.totalDeposit ?? 0),
        0
      )
      .toFixed(2);
  }, [sortedTableData]);

  const totalWithdrawTotal = useMemo(() => {
    return sortedTableData
      .reduce(
        (sum: number, item: any) => sum + Number(item.totalWithdraw ?? 0),
        0
      )
      .toFixed(2);
  }, [sortedTableData]);

  const netPLBalanceTotal = useMemo(() => {
    return sortedTableData
      .reduce(
        (sum: number, item: any) =>
          sum +
          (Number(item.totalDeposit ?? 0) - Number(item.totalWithdraw ?? 0)),
        0
      )
      .toFixed(2);
  }, [sortedTableData]);

  return (
    <Fragment>
      <div className="h-full w-full bg-[#181a20] text-[#EAECEF] overflow-y-auto">
        {/* Header / Breadcrumbs (optional) */}
        {/* <div className="px-4 pt-4">
          <Breadcrumbs mainTitle={"Child List"} parent="Dashboard" title={"Deposit/Withdrawal Report"} />
        </div> */}

        <div className="!px-2 !py-2">
          <div className="">
            {/* Header */}
            <div className="p-1">
              {/* <div className="mb-3 flex flex-wrap items-center justify-end">
                <div className="rounded-full bg-[#2b3139] px-3 py-1 font-semibold text-[#EAECEF]">
                  Records - {totalCount}
                </div>
              </div> */}

              {/* Filters Row */}
              <div className="grid grid-cols-12 gap-2 p-2">
                <div className="col-span-12 sm:col-span-3">
                  <label className="block text-sm font-medium text-[#848E9C]">
                    Search
                  </label>
                  <input
                    className="mt-1 w-full rounded-md border border-[#2b3139] bg-[#0b0e11] px-3 py-2 text-sm text-[#EAECEF] outline-none"
                    id="search"
                    name="search"
                    type="text"
                    value={searchFormData.search}
                    onChange={(e) => handleSearchChange(e)}
                    placeholder="Search"
                  />
                </div>
                <div className="col-span-12 sm:col-span-3">
                  <label className="block text-sm font-medium text-[#fff]">
                    From Date
                  </label>
                  <input
                    className="calendar-input mt-1 w-full rounded-md border border-[#2b3139] bg-[#0b0e11] px-3 py-2 text-sm text-[#EAECEF] outline-none"
                    id="startDate"
                    name="startDate"
                    type="date"
                    value={formFilterData.startDate || ""}
                    onChange={(e) => handleFilterChange(e)}
                    placeholder="Select Date"
                    max={
                      formFilterData.endDate
                        ? formFilterData.endDate
                        : undefined
                    }
                  />
                </div>

                <div className="col-span-12 sm:col-span-3">
                  <label className="block text-sm font-medium text-[#fff]">
                    To Date
                  </label>
                  <input
                    className="mt-1 w-full rounded-md border border-[#2b3139] bg-[#0b0e11] px-3 py-2 text-sm text-[#EAECEF] outline-none"
                    id="endDate"
                    name="endDate"
                    type="date"
                    value={formFilterData.endDate || ""}
                    onChange={(e) => handleFilterChange(e)}
                    placeholder="Select Date"
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

                <div className="col-span-12 sm:col-span-3">
                  <label className="invisible block text-sm font-medium sm:visible">
                    &nbsp;
                  </label>
                  <div className="flex gap-2">
                    <button
                      className="inline-flex items-center rounded-md bg-[#fcd535] px-4 py-2 font-bold text-[#0b0e11] focus:outline-none"
                      onClick={handleFilter}
                    >
                      View
                    </button>

                    {/* NEW: Clear Button */}
                    <button
                      className="inline-flex items-center rounded-md bg-[#2b3139] px-4 py-2 font-bold text-[#EAECEF] focus:outline-none"
                      onClick={handleReset}
                    >
                      Clear
                    </button>
                  </div>
                </div>
              </div>

              {/* Export (Master only) */}
              <div className="mt-4 grid grid-cols-12">
                <div className="col-span-12 sm:col-span-6 sm:col-start-7">
                  <div className="flex justify-end">
                    {authenticated.role === MASTER ? (
                      <button
                        className="rounded-md bg-[#fcd535] px-4 py-2 font-bold text-[#0b0e11] disabled:opacity-60"
                        onClick={exportToExcel}
                        disabled={loading}
                      >
                        {loading ? "Exporting..." : "Export to Excel"}
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="p-4">
              <div className="overflow-hidden rounded-lg border border-[#2b3139]">
                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse text-sm">
                    <thead className="bg-[#1e2329] text-[#848E9C]">
                      <tr className="border-b border-[#2b3139]">
                        <th className="px-3 py-2 text-left">Sr No.</th>

                        <th
                          onClick={() => requestSort("name")}
                          className="cursor-pointer px-3 py-2 text-left"
                        >
                          <span className="select-none">USERNAME</span>
                          <i className={`${getSortIcon("name")} ml-2`} />
                        </th>

                        <th
                          onClick={() => requestSort("userName")}
                          className="cursor-pointer px-3 py-2 text-left"
                        >
                          <span className="select-none">MOBILE</span>
                          <i className={`${getSortIcon("userName")} ml-2`} />
                        </th>

                        <th
                          onClick={() => requestSort("totalDeposit")}
                          className="cursor-pointer px-3 py-2 text-left"
                        >
                          <span className="select-none">TOTAL DEPOSIT</span>
                          <i
                            className={`${getSortIcon("totalDeposit")} ml-2`}
                          />
                        </th>

                        <th
                          onClick={() => requestSort("totalWithdraw")}
                          className="cursor-pointer px-3 py-2 text-left"
                        >
                          <span className="select-none">TOTAL WITHDRAWAL</span>
                          <i
                            className={`${getSortIcon("totalWithdraw")} ml-2`}
                          />
                        </th>

                        <th
                          onClick={() => requestSort("netBal")}
                          className="cursor-pointer px-3 py-2 text-left"
                        >
                          <span className="select-none">NET BAL</span>
                          <i className={`${getSortIcon("netBal")} ml-2`} />
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {sortedTableData.length === 0 ? (
                        <tr>
                          <td
                            className="px-3 py-6 text-center text-[#848E9C]"
                            colSpan={6}
                          >
                            {isFilterActive && hasFetched
                              ? "No match found"
                              : "No records"}
                          </td>
                        </tr>
                      ) : (
                        sortedTableData.map((item: any, index: number) => (
                          <tr
                            key={index}
                            className={
                              index % 2 === 0 ? "bg-[#171a1f]" : "bg-[#1b1f25]"
                            }
                          >
                            <td className="px-3 py-2">{index + 1}</td>
                            <td className="px-3 py-2">{item.name}</td>
                            <td className="px-3 py-2">
                              {item.role === CLIENT ? (
                                item.userName
                              ) : (
                                <button
                                  type="button"
                                  className="text-left text-[#EAECEF] focus:outline-none"
                                  onClick={() => {
                                    setSelectedParent({
                                      userId: item.userId,
                                      name: item.name,
                                      userName: item.userName,
                                      role: item.role,
                                    });
                                    setSheetOpen(true);
                                  }}
                                >
                                  {item.userName}
                                </button>
                              )}
                            </td>
                            <td className="px-3 py-2 text-right">
                              {Number(item.totalDeposit ?? 0).toFixed(2)}
                            </td>
                            <td className="px-3 py-2 text-right">
                              {Number(item.totalWithdraw ?? 0).toFixed(2)}
                            </td>
                            <td className="px-3 py-2 text-right">
                              {(
                                Number(item.totalDeposit ?? 0) -
                                Number(item.totalWithdraw ?? 0)
                              ).toFixed(2)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>

                    <tfoot>
                      <tr className="bg-[#0b0e11]">
                        <th className="px-3 py-2 text-center font-bold text-[#fcd535]">
                          Total
                        </th>
                        <th className="px-3 py-2 text-right font-bold text-[#fcd535]"></th>
                        <th className="px-3 py-2 text-right font-bold text-[#fcd535]"></th>
                        <th className="px-3 py-2 text-right font-bold text-[#fcd535]">
                          {totalDepositTotal}
                        </th>
                        <th className="px-3 py-2 text-right font-bold text-[#fcd535]">
                          {totalWithdrawTotal}
                        </th>
                        <th className="px-3 py-2 text-right font-bold text-[#fcd535]">
                          {netPLBalanceTotal}
                        </th>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>

            {/* Pagination */}
            <div className="px-4 pb-4">
              <div className="flex justify-end">
                <nav aria-label="Page navigation example">
                  <ul className="flex gap-2">
                    <li>
                      <button
                        className={`rounded-md bg-[#2b3139] px-3 py-2 text-sm text-[#EAECEF] ${
                          currentPage === 1 ? "opacity-60" : ""
                        }`}
                        disabled={currentPage === 1}
                        onClick={() => handlePageChange(currentPage - 1)}
                      >
                        Previous
                      </button>
                    </li>

                    {[...Array(totalPages).keys()].map((pageNumber) => (
                      <li key={pageNumber}>
                        <button
                          className={`rounded-md px-3 py-2 text-sm ${
                            currentPage === pageNumber + 1
                              ? "bg-[#fcd535] text-[#0b0e11] font-bold"
                              : "bg-[#2b3139] text-[#EAECEF]"
                          }`}
                          onClick={() => handlePageChange(pageNumber + 1)}
                        >
                          {pageNumber + 1}
                        </button>
                      </li>
                    ))}

                    <li>
                      <button
                        className={`rounded-md bg-[#2b3139] px-3 py-2 text-sm text-[#EAECEF] ${
                          currentPage === totalPages ? "opacity-60" : ""
                        }`}
                        disabled={currentPage === totalPages}
                        onClick={() => handlePageChange(currentPage + 1)}
                      >
                        Next
                      </button>
                    </li>
                  </ul>
                </nav>
              </div>
            </div>

            <UserChildListSheet
              open={sheetOpen}
              onOpenChange={(v) => setSheetOpen(v)}
              parentUser={selectedParent}
            />
          </div>
        </div>
      </div>
    </Fragment>
  );
}
