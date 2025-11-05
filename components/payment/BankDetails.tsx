"use client";

import apiClient from "@/lib/axiosInstance";
import { useEffect, useMemo, useState, useRef } from "react";
import {
  ADMIN_API_ENDPOINT,
  BANK_DETAILS_LIST,
  SUCCESS,
} from "@/constant/index";
import { toastError } from "@/hooks/toastMsg";
import { decryptData, encryptData } from "@/hooks/crypto";
import { useSession } from "next-auth/react";
import CreateBankDetailForm from "./createBankDetail"; // your reusable component

interface BankDetail {
  bankDetailsId: string;
  bankName: string;
  accountHolderName: string;
  accountNumber: string;
  ifsc: string;
  upiId: string;
  status: number;
}
type SortKey = keyof BankDetail | "script" | null;

const BankDetails = () => {
  const { data: session } = useSession();

  const [tableData, setTableData] = useState<BankDetail[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 10;

  const [sortConfig, setSortConfig] = useState<{
    key: SortKey;
    direction: "ascending" | "descending";
  }>({ key: null, direction: "ascending" });

  const tableRef = useRef<HTMLTableElement | null>(null);
  const [colWidths, setColWidths] = useState({
    bankName: 180,
    accountHolderName: 200,
    accountNumber: 180,
    ifsc: 150,
    upiId: 150,
    status: 150,
    action: 150,
  });

  // Single modal used for both create and edit
  const [openForm, setOpenForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const jwtToken = (session as any)?.accessToken as string | undefined;
  const deviceType =
    ((session?.user as any)?.deviceType as string | undefined) ?? "web";
  const authenticatedUserId = (session?.user as any)?.userId as string | undefined;
  const authenticatedRole = (session?.user as any)?.rolename as string | undefined;

  const handleMouseDown = (
    e: React.MouseEvent<HTMLDivElement>,
    colKey: keyof typeof colWidths
  ) => {
    const th = (e.target as HTMLDivElement).parentElement as HTMLTableCellElement;
    const startX = e.clientX;
    const startWidth = th.offsetWidth;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = startWidth + (e.clientX - startX);
      if (newWidth > 50) {
        setColWidths((prev) => ({ ...prev, [colKey]: newWidth }));
      }
    };

    const handleMouseUp = () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const requestSort = (key: SortKey) => {
    let direction: "ascending" | "descending" = "ascending";
    if (sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending";
    }
    setSortConfig({ key, direction });
  };

  const sortedTableData = useMemo(() => {
    const sortableItems = [...tableData];
    if (sortConfig.key !== null) {
      sortableItems.sort((a: any, b: any) => {
        let aValue: any;
        let bValue: any;

        if (sortConfig.key === "script") {
          const getDisplayName = (item: any) => {
            if (item.exchangeName?.toLowerCase?.() === "usstock") return item.symbolName;
            if (item.exchangeName?.toLowerCase?.() === "ce/pe") return item.symbolTitle;
            return item.masterName;
          };
          aValue = getDisplayName(a);
          bValue = getDisplayName(b);
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
          if (aValue < bValue) return sortConfig.direction === "ascending" ? -1 : 1;
          if (aValue > bValue) return sortConfig.direction === "ascending" ? 1 : -1;
          return 0;
        }
      });
    }
    return sortableItems;
  }, [tableData, sortConfig]);

  const getSortIcon = (key: SortKey) => {
    if (sortConfig.key !== key) return "fa-solid fa-sort";
    return sortConfig.direction === "ascending" ? "fa-solid fa-sort-up" : "fa-solid fa-sort-down";
  };

  useEffect(() => {
    document.title = "Bank Details";
    return () => {
      document.title = "Admin Panel";
    };
  }, []);

  const fetchDataFromAPI = async () => {
    try {
      if (!jwtToken) return;

      const url = BANK_DETAILS_LIST;
      const authHeader = jwtToken.startsWith("Bearer ")
        ? jwtToken
        : `Bearer ${jwtToken}`;
      const userId = authenticatedUserId;
      const role = authenticatedRole;
      if (!userId) return;

      const rawPayload = {
        userId,
        role,
        page: currentPage,
        limit: itemsPerPage,
      };

      const data = encryptData(rawPayload);
      const payload = JSON.stringify({ data });
      const headers = {
        Authorization: authHeader,
        "Content-Type": "application/json",
        deviceType: deviceType || "",
      };

      const response = await apiClient.post(url, payload, { headers });

      if (response.data.statusCode === SUCCESS) {
        const rdata = decryptData(response.data.data);
        setTableData(rdata);
        setTotalPages(response.data.meta.totalPage);
        setTotalCount(response.data.meta.totalCount);
      } else {
        toastError(response.data.message);
      }
    } catch (error: any) {
      toastError(error?.response?.data?.message || "Something went wrong");
    }
  };

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  useEffect(() => {
    if (!jwtToken) return;
    fetchDataFromAPI();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, jwtToken, deviceType]);

  return (
    <div className="min-h-screen bg-[#181a20] p-4">
      <div className="rounded-xl border border-[#2b3139] bg-[#1e2329] shadow-sm">
        {/* Header */}
        <div className="border-b border-[#2b3139] px-4 py-4">
          <div className="flex flex-wrap items-center justify-end gap-3">

            {/* CREATE opens modal with no editingId */}
            <button
              className="ml-auto inline-flex items-center gap-2 rounded-lg bg-[#fcd535] px-4 py-2 text-sm font-semibold text-black transition-opacity hover:opacity-80"
              onClick={() => {
                setEditingId(null);
                setOpenForm(true);
              }}
              aria-label="Create New"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="12" y1="8" x2="12" y2="16"></line>
                <line x1="8" y1="12" x2="16" y2="12"></line>
              </svg>
              Create New
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="px-4 py-4">
          <div className="overflow-x-auto rounded-lg bg-[#1e2329]">
            <table ref={tableRef} className="min-w-full text-left">
              <thead>
                <tr className="bg-[#1e2329]">
                  {[
                    { key: "bankName" as const, label: "Bank Name", w: colWidths.bankName },
                    { key: "accountHolderName" as const, label: "Account Holder Name", w: colWidths.accountHolderName },
                    { key: "accountNumber" as const, label: "Account Number", w: colWidths.accountNumber },
                    { key: "ifsc" as const, label: "IFSC", w: colWidths.ifsc },
                    { key: "upiId" as const, label: "UpiId", w: colWidths.upiId },
                  ].map((col) => (
                    <th
                      key={col.key}
                      scope="col"
                      style={{ width: col.w }}
                      onClick={() => requestSort(col.key)}
                      className="relative select-none whitespace-nowrap border-b border-[#2b3139] px-4 py-3 text-sm font-semibold text-[#fcd535] transition-colors hover:bg-[#232a31]"
                    >
                      <div className="flex items-center gap-2">
                        {col.label} <i className={getSortIcon(col.key)} />
                      </div>
                      <div
                        className="absolute right-0 top-0 h-full w-1 cursor-col-resize select-none"
                        onMouseDown={(e) => handleMouseDown(e, col.key)}
                        aria-hidden
                      />
                    </th>
                  ))}

                  <th
                    scope="col"
                    style={{ width: colWidths.status }}
                    className="relative select-none whitespace-nowrap border-b border-[#2b3139] px-4 py-3 text-sm font-semibold text-[#fcd535]"
                  >
                    Status
                    <div
                      className="absolute right-0 top-0 h-full w-1 cursor-col-resize select-none"
                      onMouseDown={(e) => handleMouseDown(e, "status")}
                      aria-hidden
                    />
                  </th>

                  <th
                    scope="col"
                    style={{ width: colWidths.action }}
                    className="relative select-none whitespace-nowrap border-b border-[#2b3139] px-4 py-3 text-sm font-semibold text-[#fcd535]"
                  >
                    Action
                    <div
                      className="absolute right-0 top-0 h-full w-1 cursor-col-resize select-none"
                      onMouseDown={(e) => handleMouseDown(e, "action")}
                      aria-hidden
                    />
                  </th>
                </tr>
              </thead>

              <tbody>
                {sortedTableData.map((item: BankDetail, index) => (
                  <tr
                    key={item.bankDetailsId}
                    className={`border-b border-[#2b3139] ${
                      index % 2 === 0 ? "bg-[#1e2329]" : "bg-[#252a31]"
                    }`}
                  >
                    <td className="px-4 py-3 text-sm text-[#eaecef]">
                      {item.bankName}
                    </td>
                    <td className="px-4 py-3 text-sm text-[#eaecef]">
                      {item.accountHolderName}
                    </td>
                    <td className="px-4 py-3 text-sm text-[#eaecef]">
                      {item.accountNumber}
                    </td>
                    <td className="px-4 py-3 text-sm text-[#eaecef]">
                      {item.ifsc}
                    </td>
                    <td className="px-4 py-3 text-sm text-[#eaecef]">
                      {item.upiId}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-[#eaecef]">
                      {item.status == 1 ? "Active" : "In-Active"}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {/* EDIT opens modal with editingId */}
                      <button
                        type="button"
                        className="font-medium text-[#fcd535] hover:opacity-80"
                        onClick={() => {
                          setEditingId(item.bankDetailsId);
                          setOpenForm(true);
                        }}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}

                {sortedTableData.length === 0 && (
                  <tr>
                    <td className="px-4 py-8 text-center text-sm text-[#848E9C]" colSpan={7}>
                      No records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        <div className="px-4 pb-4">
          <div className="flex justify-end">
            <nav aria-label="Page navigation">
              <ul className="inline-flex items-center gap-2">
                <li>
                  <button
                    className={`rounded-md border border-[#2b3139] bg-[#1e2329] px-3 py-1.5 text-sm text-[#eaecef] transition-opacity hover:opacity-80 ${
                      currentPage === 1 ? "pointer-events-none text-[#848E9C]" : ""
                    }`}
                    onClick={() => handlePageChange(currentPage - 1)}
                  >
                    Previous
                  </button>
                </li>

                {[...Array(totalPages).keys()].map((pageNumber) => {
                  const page = pageNumber + 1;
                  const isActive = currentPage === page;
                  return (
                    <li key={pageNumber}>
                      <button
                        className={`rounded-md px-3 py-1.5 text-sm transition-opacity ${
                          isActive
                            ? "bg-[#fcd535] text-black"
                            : "border border-[#2b3139] bg-[#1e2329] text-[#eaecef] hover:opacity-80"
                        }`}
                        onClick={() => handlePageChange(page)}
                      >
                        {page}
                      </button>
                    </li>
                  );
                })}

                <li>
                  <button
                    className={`rounded-md border border-[#2b3139] bg-[#1e2329] px-3 py-1.5 text-sm text-[#eaecef] transition-opacity hover:opacity-80 ${
                      currentPage === totalPages || totalPages === 0
                        ? "pointer-events-none text-[#848E9C]"
                        : ""
                    }`}
                    onClick={() => handlePageChange(currentPage + 1)}
                  >
                    Next
                  </button>
                </li>
              </ul>
            </nav>
          </div>
        </div>
      </div>

      {/* CREATE / EDIT MODAL */}
      {openForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* backdrop */}
          <button
            className="absolute inset-0 bg-black/60"
            aria-label="Close"
            onClick={() => setOpenForm(false)}
          />
          {/* panel */}
          <div className="relative z-10 w-full max-w-3xl rounded-xl border border-[#2b3139] bg-[#181a20] p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[#fcd535]">
                {editingId ? "Edit Bank" : "Create Bank"}
              </h3>
              <button
                className="rounded-md bg-[#2b3139] px-3 py-1.5 text-sm text-[#EAECEF]"
                onClick={() => setOpenForm(false)}
              >
                Close
              </button>
            </div>

            <CreateBankDetailForm
              key={editingId || "create"}              // resets form between modes
              jwtToken={(session as any)?.accessToken || ""}
              deviceType={((session?.user as any)?.deviceType as string) ?? "web"}
              authenticatedUserId={(session?.user as any)?.id || ""}
              bankDetailsId={editingId || undefined}   // <-- this enables EDIT mode when set
              onClose={() => setOpenForm(false)}
              onCreated={() => {
                setOpenForm(false);
                fetchDataFromAPI();                     // refresh list after save
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default BankDetails;
