"use client";

import React, { Fragment, useEffect, useMemo, useRef, useState } from "react";
import apiClient from "@/lib/axiosInstance";

import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { useRouter, useParams } from "next/navigation";
import { Download } from "lucide-react";
// ---- shadcn/ui ----
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

// ---- your app imports (unchanged) ----
import {
  ADMIN_API_ENDPOINT,
  SUCCESS,
  USER_PHONE_INQUIRY_LIST,
  USER_PHONE_INQUIRY_LIST_EXPORT,
} from "@/constant/index";
import { toast } from "sonner";
import { encryptData, decryptData, decryptData1 } from "@/hooks/crypto";
import {
  formatDateForExportExcelName,
  formatDateTime,
} from "@/hooks/dateUtils";

// ---------- Types ----------
type SortDirection = "ascending" | "descending";

type SortKey =
  | "name"
  | "phone"
  | "createdAt"
  | "deviceType"
  | "ipAddress"
  | "script"
  | null;

interface SortConfig {
  key: SortKey;
  direction: SortDirection;
}

interface PhoneInquiryItem {
  name: string;
  phone: string;
  createdAt: string | number | Date;
  parentUserName: string;
  deviceType: string;
  ipAddress: string;
  // optional fields used by the original "script" sort logic
  exchangeName?: string;
  symbolName?: string;
  symbolTitle?: string;
  masterName?: string;
  [k: string]: any;
}

interface Authenticated {
  userName: string;
  [k: string]: unknown;
}

export default function ListPhoneInquiryPage(): JSX.Element {
  const router = useRouter();
  const params = useParams(); // if you had /:role route
  const role = (params?.role as string) ?? undefined;

  // ---- original localStorage pulls ----
  const deviceType =
    typeof window !== "undefined" ? localStorage.getItem("deviceType") : null;
  const jwt_token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const authenticated: Authenticated =
    typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem("authenticated") || "{}")
      : ({} as Authenticated);

  const [isLoggedIn] = useState<boolean>(true);

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);
  const itemsPerPage = 100;

  const [tableData, setTableData] = useState<PhoneInquiryItem[]>([]);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [searchFormData, setSearchFormData] = useState<{ search?: string }>({
    search: "",
  });
  const [loading, setLoading] = useState<boolean>(false);

  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: null,
    direction: "ascending",
  });

  const tableRef = useRef<HTMLTableElement | null>(null);
  const [colWidths, setColWidths] = useState<Record<string, number>>({
    name: 150,
    mobile: 150,
    createdDate: 200,
    deviceType: 150,
    ipAddress: 150,
  });

  // ---- column resizer (unchanged logic) ----
  const handleMouseDown = (
    e: React.MouseEvent<HTMLDivElement>,
    colKey: string
  ) => {
    const th = (e.target as HTMLElement).parentElement as HTMLElement;
    const startX = e.clientX;
    const startWidth = th.offsetWidth;

    const handleMouseMove = (ev: MouseEvent) => {
      const newWidth = startWidth + (ev.clientX - startX);
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

  // ---- sorting (unchanged logic) ----
  const requestSort = (key: SortKey) => {
    let direction: SortDirection = "ascending";
    if (sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending";
    }
    setSortConfig({ key, direction });
  };

  const sortedTableData = useMemo(() => {
    const items = [...tableData];
    const { key, direction } = sortConfig;

    if (key !== null) {
      items.sort((a, b) => {
        let aValue: any;
        let bValue: any;

        if (key === "script") {
          const getDisplayName = (item: PhoneInquiryItem) => {
            if (item.exchangeName?.toLowerCase() === "usstock")
              return item.symbolName;
            if (item.exchangeName?.toLowerCase() === "ce/pe")
              return item.symbolTitle;
            return item.masterName;
          };
          aValue = getDisplayName(a);
          bValue = getDisplayName(b);
        } else if (key === "deviceType") {
          aValue = `${a.parentUserName}-${a.deviceType}`;
          bValue = `${b.parentUserName}-${b.deviceType}`;
        } else {
          aValue = (a as any)[key];
          bValue = (b as any)[key];
        }

        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;

        if (typeof aValue === "string") {
          return direction === "ascending"
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        } else {
          if (aValue < bValue) return direction === "ascending" ? -1 : 1;
          if (aValue > bValue) return direction === "ascending" ? 1 : -1;
          return 0;
        }
      });
    }

    return items;
  }, [tableData, sortConfig]);

  const getSortIconClass = (key: SortKey) => {
    if (sortConfig.key !== key) return "fa-solid fa-sort";
    return sortConfig.direction === "ascending"
      ? "fa-solid fa-sort-up"
      : "fa-solid fa-sort-down";
  };

  // ---- API calls (unchanged logic/endpoint/payload/headers) ----
  const fetchDataFromAPI = async () => {
    try {
      let data = encryptData({
        search: searchFormData?.search ? searchFormData.search : "",
        page: currentPage,
        limit: itemsPerPage,
      });
      const body = JSON.stringify({ data });

      apiClient
        .post(USER_PHONE_INQUIRY_LIST, body)
        .then((response) => {
          if (response.data.statusCode == SUCCESS) {
            const rdata = decryptData(response.data.data) as PhoneInquiryItem[];
            setTableData(rdata);
            setTotalPages(response.data.meta.totalPage);
            setTotalCount(response.data.meta.totalCount);
          } else {
            toast.error(response.data.message);
          }
        })
        .catch((error) => {
          toast.error(error?.response?.data?.message || "Request failed");
          console.error("API error:", error);
        });
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  const handleReset = () => {
    setSearchFormData({ ...searchFormData, search: "" });
    fetchDataFromAPI();
  };

  const exportToExcel = () => {
    setLoading(true);
    try {
      let data = encryptData({
        search: searchFormData?.search ? searchFormData.search : "",
      });
      const body = JSON.stringify({ data });

      apiClient
        .post(USER_PHONE_INQUIRY_LIST_EXPORT, body)
        .then((response) => {
          if (response.data.statusCode == SUCCESS) {
            const rdata = decryptData1(
              response.data.data
            ) as PhoneInquiryItem[];
            generateExcel(rdata);
          } else {
            toast.error(response.data.message);
            setLoading(false);
          }
        })
        .catch((error) => {
          toast.error(error?.response?.data?.message || "Request failed");
          console.error("API error:", error);
          setLoading(false);
        });
    } catch (error) {
      console.error("Error exporting:", error);
      setLoading(false);
    }
  };

  // ---- Excel (unchanged logic) ----
  const generateExcel = (data: PhoneInquiryItem[]) => {
    if (!data || data.length === 0) {
      alert("No data available to export.");
      setLoading(false);
      return;
    }
    setTimeout(() => {
      const excelData = data.map((item) => ({
        Name: item.name,
        Mobile: item.phone,
        "Created At": formatDateTime(item.createdAt),
        "Device Type": `${item.parentUserName}-${item.deviceType}`,
        "IP Address": item.ipAddress,
      }));

      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "PaymentRequests");

      const excelBuffer = XLSX.write(workbook, {
        bookType: "xlsx",
        type: "array",
      });
      const blob = new Blob([excelBuffer], {
        type: "application/octet-stream",
      });
      const userName = authenticated?.userName || "User";
      const now = new Date();
      const fileName = `${userName}DEMOUSERLEAD${formatDateForExportExcelName(
        now
      )}.xlsx`;
      saveAs(blob, fileName);
      setLoading(false);
    }, 100);
    return true;
  };

  // ---- handlers (unchanged logic) ----
  const handleSearchChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    _name?: string
  ) => {
    const { name, value } = e.target;
    setSearchFormData({
      ...formData,
      [name || "search"]: value,
    });
  };

  const handleFilter = () => {
    fetchDataFromAPI();
    setCurrentPage(1);
  };

  // ---- debounced search (unchanged logic) ----
  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchFormData.search && searchFormData.search.length >= 3) {
        fetchDataFromAPI();
      } else if (searchFormData.search === "") {
        fetchDataFromAPI();
      }
    }, 500);
    return () => clearTimeout(handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchFormData.search]);

  // ---- fetch on mount + page change (unchanged logic) ----
  useEffect(() => {
    fetchDataFromAPI();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  // ---- document title (unchanged effect) ----
  useEffect(() => {
    const prev = document.title;
    document.title = "Admin Panel | Demo User lead";
    return () => {
      document.title = prev || "Admin Panel";
    };
  }, []);

  return (
    <Fragment>
      <style>{`
        .resizer {
          position: absolute;
          top: 0;
          right: 0;
          width: 6px;
          cursor: col-resize;
          user-select: none;
          height: 100%;
        }
        th {
          position: relative;
        }
        /* Custom Binance theme styles */
        .binance-theme {
          background-color: #181a20;
          color: #ffffff;
        }
        .binance-card {
          background-color: #1e2329;
          border-color: #2b3139;
        }
        .binance-title {
          color: #fcd535;
      
        }
        .binance-subtitle {
          color: #848E9C;
        }
        .binance-input {
          background-color: #2b3139;
          border-color: #3e4651;
          color: #ffffff;
        }
        .binance-input::placeholder {
          color: #848E9C;
        }
        .binance-button-primary {
          background-color: #fcd535;
          color: #000000;
        }
        .binance-button-primary:hover {
          background-color: #fcd535;
          opacity: 0.9;
        }
        .binance-button-secondary {
          background-color: #2b3139;
          color: #ffffff;
          border-color: #3e4651;
        }
        .binance-button-secondary:hover {
          background-color: #2b3139;
          opacity: 0.9;
        }
        .binance-button-destructive {
          background-color: #e74c3c;
          color: #ffffff;
        }
        .binance-button-destructive:hover {
          background-color: #e74c3c;
          opacity: 0.9;
        }
        .binance-button-outline {
          background-color: transparent;
          color: #848E9C;
          border-color: #3e4651;
        }
        .binance-button-outline:hover {
          background-color: transparent;
          color: #fcd535;
          border-color: #fcd535;
        }
        .binance-table {
          background-color: #1e2329;
          color: #ffffff;
        }
        .binance-table-header {
          background-color: #2b3139;
          color: #fcd535;
        }
        .binance-table-row {
          border-color: #2b3139;
        }
        .binance-table-row:hover {
          background-color: #2b3139;
        }
        .binance-pagination {
          color: #848E9C;
        }
        .binance-pagination-active {
          background-color: #fcd535;
          color: #000000;
        }
        .binance-badge {
          background-color: #2b3139;
          color: #848E9C;
        }
      `}</style>

      <div className="px-4 py-4 binance-theme min-h-screen">
        <Card className="w-full binance-card">
          <CardContent className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
              <div className="flex flex-col gap-2">
                <Input
                  id="search"
                  name="search"
                  value={searchFormData.search || ""}
                  onChange={(e) => handleSearchChange(e, "search")}
                  placeholder="Search"
                  className="binance-input"
                />
              </div>

              <div className="flex items-end gap-2">
                <Button
                  variant="default"
                  className="w-full md:w-auto binance-button-primary"
                  onClick={() => exportToExcel()}
                  disabled={loading}
                >
                  <Download className="h-4 w-4 mr-2" />
                  {loading ? "Exporting..." : "Export"}
                </Button>

                <Button
                  variant="secondary"
                  className="w-full md:w-auto binance-button-secondary"
                  onClick={() => handleFilter()}
                >
                  View
                </Button>

                <Button
                  variant="destructive"
                  className="w-full md:w-auto binance-button-destructive"
                  onClick={() => handleReset()}
                >
                  Clear
                </Button>
              </div>
            </div>

            {/* Table */}
            <div className="rounded-md border border-gray-700">
              <Table ref={tableRef} className="binance-table">
                <TableHeader className="binance-table-header">
                  <TableRow className="binance-table-row">
                    <TableHead
                      style={{ width: colWidths.name }}
                      onClick={() => requestSort("name")}
                      className="whitespace-nowrap binance-title cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        Name <i className={getSortIconClass("name")} />
                      </div>
                      <div
                        className="resizer"
                        onMouseDown={(e) => handleMouseDown(e, "name")}
                      />
                    </TableHead>

                    <TableHead
                      style={{ width: colWidths.mobile }}
                      onClick={() => requestSort("phone")}
                      className="whitespace-nowrap binance-title cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        Mobile <i className={getSortIconClass("phone")} />
                      </div>
                      <div
                        className="resizer"
                        onMouseDown={(e) => handleMouseDown(e, "mobile")}
                      />
                    </TableHead>

                    <TableHead
                      style={{ width: colWidths.createdDate }}
                      onClick={() => requestSort("createdAt")}
                      className="whitespace-nowrap binance-title cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        Created Date{" "}
                        <i className={getSortIconClass("createdAt")} />
                      </div>
                      <div
                        className="resizer"
                        onMouseDown={(e) => handleMouseDown(e, "createdDate")}
                      />
                    </TableHead>

                    <TableHead
                      style={{ width: colWidths.deviceType }}
                      onClick={() => requestSort("deviceType")}
                      className="whitespace-nowrap binance-title cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        Device Type{" "}
                        <i className={getSortIconClass("deviceType")} />
                      </div>
                      <div
                        className="resizer"
                        onMouseDown={(e) => handleMouseDown(e, "deviceType")}
                      />
                    </TableHead>

                    <TableHead
                      style={{ width: colWidths.ipAddress }}
                      onClick={() => requestSort("ipAddress")}
                      className="whitespace-nowrap binance-title cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        IP Address{" "}
                        <i className={getSortIconClass("ipAddress")} />
                      </div>
                      <div
                        className="resizer"
                        onMouseDown={(e) => handleMouseDown(e, "ipAddress")}
                      />
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {sortedTableData.map((item, idx) => (
                    <TableRow key={idx} className="binance-table-row">
                      <TableCell className="whitespace-nowrap">
                        {item.name}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {item.phone}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatDateTime(item.createdAt)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {item.parentUserName + "-" + item.deviceType}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {item.ipAddress}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination (same logic, shadcn buttons) */}
            <div className="flex items-center justify-end gap-2 binance-pagination">
              <Button
                variant="outline"
                disabled={currentPage === 1}
                onClick={() => handlePageChange(currentPage - 1)}
                className="binance-button-outline"
              >
                Previous
              </Button>

              {/* simple numeric pages */}
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (p) => (
                    <Button
                      key={p}
                      variant={currentPage === p ? "default" : "outline"}
                      onClick={() => handlePageChange(p)}
                      className={
                        currentPage === p
                          ? "binance-button-primary"
                          : "binance-button-outline"
                      }
                    >
                      {p}
                    </Button>
                  )
                )}
              </div>

              <Button
                variant="outline"
                disabled={currentPage === totalPages}
                onClick={() => handlePageChange(currentPage + 1)}
                className="binance-button-outline"
              >
                Next
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Fragment>
  );
}
