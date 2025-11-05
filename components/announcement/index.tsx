"use client"
import React, {
  Fragment,
  useEffect,
  useMemo,
  useState,
  useRef,
  MouseEvent,
} from "react";
import {
  ADMIN_API_ENDPOINT,
  ANNOUNCEMENT_LIST_LIST,
  SUCCESS,
} from "@/constant/index";
import { toastError } from "@/hooks/toastMsg";
import { decryptData, encryptData } from "@/hooks/crypto";
import { useSession } from "next-auth/react";
import apiClient from "@/lib/axiosInstance";
/* ---------- Types ---------- */
type Nullable<T> = T | null;

interface AnnouncementItem {
  title: string;
  announcement: string;
  status: number;
  announcementId: string;
  exchangeName?: string;
  symbolName?: string;
  symbolTitle?: string;
  masterName?: string;
  [k: string]: any;
}

type SortKey = keyof AnnouncementItem | "script";
type SortDirection = "ascending" | "descending";
interface SortConfig {
  key: Nullable<SortKey>;
  direction: SortDirection;
}

const ANNOUNCEMENTS_PER_PAGE = 10;

const Announcement: React.FC = () => {
  const { data: session } = useSession();

  /* ---------------------------- Auth / session ---------------------------- */
  const jwt_token = (session as any)?.accessToken as string | undefined;
  const deviceType =
    ((session?.user as any)?.deviceType as string | undefined) ?? "web";
  const authenticatedUserId = (session?.user as any)?.id as string | undefined;
  const authenticatedRole = (session?.user as any)?.role as string | undefined;

  /* --------------------------------- State -------------------------------- */
  const [tableData, setTableData] = useState<AnnouncementItem[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [selectedRow, setSelectedRow] =
    useState<Nullable<AnnouncementItem>>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [search, setSearch] = useState<string>("");
  const [pageSize, setPageSize] = useState<number>(ANNOUNCEMENTS_PER_PAGE);

  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: null,
    direction: "ascending",
  });

  const tableRef = useRef<HTMLTableElement | null>(null);
  const [colWidths, setColWidths] = useState<
    Record<"title" | "announcement" | "status" | "action", number>
  >({
    title: 240,
    announcement: 520,
    status: 140,
    action: 140,
  });

  /* ---------------------------- Column resizing --------------------------- */
  const handleMouseDown = (
    e: MouseEvent<HTMLDivElement>,
    colKey: "title" | "announcement" | "status" | "action"
  ) => {
    const th = (e.currentTarget as HTMLElement)
      .parentElement as HTMLTableCellElement;
    const startX = (e as unknown as MouseEvent & { clientX: number }).clientX;
    const startWidth = th?.offsetWidth || 0;

    const onMouseMove = (ev: MouseEvent) => {
      const clientX = (ev as unknown as MouseEvent & { clientX: number })
        .clientX;
      const newWidth = Math.max(96, startWidth + (clientX - startX));
      setColWidths((prev) => ({ ...prev, [colKey]: newWidth }));
    };

    const onMouseUp = () => {
      window.removeEventListener(
        "mousemove",
        onMouseMove as unknown as EventListener
      );
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener(
      "mousemove",
      onMouseMove as unknown as EventListener
    );
    window.addEventListener("mouseup", onMouseUp);
  };

  /* -------------------------------- Sorting ------------------------------- */
  const requestSort = (key: SortKey) => {
    let direction: SortDirection = "ascending";
    if (sortConfig.key === key && sortConfig.direction === "ascending")
      direction = "descending";
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: SortKey) => {
    if (sortConfig.key !== key) return "fa-solid fa-sort";
    return sortConfig.direction === "ascending"
      ? "fa-solid fa-sort-up"
      : "fa-solid fa-sort-down";
  };

  /* ---------------------------- Derived datasets -------------------------- */
  const filteredData = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tableData;
    return tableData.filter((item) => {
      const hay = `${item.title} ${item.announcement}`.toLowerCase();
      return hay.includes(q);
    });
  }, [tableData, search]);

  const sortedTableData = useMemo(() => {
    const sortableItems = [...filteredData];
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        let aValue: any;
        let bValue: any;
        if (sortConfig.key === "script") {
          const getDisplayName = (item: AnnouncementItem) => {
            if (item.exchangeName?.toLowerCase() === "usstock")
              return item.symbolName;
            if (item.exchangeName?.toLowerCase() === "ce/pe")
              return item.symbolTitle;
            return item.masterName;
          };
          aValue = getDisplayName(a);
          bValue = getDisplayName(b);
        } else {
          aValue = a[sortConfig.key];
          bValue = b[sortConfig.key];
        }
        if (aValue == null) return 1;
        if (bValue == null) return -1;
        if (typeof aValue === "string") {
          return sortConfig.direction === "ascending"
            ? String(aValue).localeCompare(String(bValue))
            : String(bValue).localeCompare(String(aValue));
        }
        if (aValue < bValue)
          return sortConfig.direction === "ascending" ? -1 : 1;
        if (aValue > bValue)
          return sortConfig.direction === "ascending" ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [filteredData, sortConfig]);

  const pagedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedTableData.slice(start, start + pageSize);
  }, [sortedTableData, currentPage, pageSize]);

  /* ------------------------------- Effects -------------------------------- */
  useEffect(() => {
    document.title = "Admin Panel | Announcement";
    return () => {
      document.title = "Admin Panel";
    };
  }, []);

  const fetchDataFromAPI = async () => {
    setLoading(true);
    try {
      const data = encryptData({
        userId: authenticatedUserId,
        role: authenticatedRole,
        page: currentPage,
        limit: pageSize,
      } as any);
      const payload = JSON.stringify({ data });

      const response = await apiClient.post(ANNOUNCEMENT_LIST_LIST, payload);

      if (response.data.statusCode === SUCCESS) {
        const rdata = decryptData(response.data.data) as AnnouncementItem[];
        setTableData(rdata || []);
        setTotalPages(response.data.meta?.totalPage ?? 1);
        setTotalCount(response.data.meta?.totalCount ?? rdata?.length ?? 0);
      } else {
        toastError(response.data.message || "Failed to load announcements");
      }
    } catch (error: any) {
      toastError(error?.response?.data?.message || "Request failed");
      console.error("Announcements load error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDataFromAPI();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, pageSize]);

  /* --------------------------------- UI ----------------------------------- */
  return (
    <Fragment>
      <div className="min-h-screen w-full bg-[#181a20] text-[#EAECEF]">
        <div className="max-w-[1400px] mx-auto px-4 py-6">
          <div className="bg-[#1e2329] border border-[#2b3139] rounded-xl overflow-hidden">
            {/* Header */}
            <div className="px-4 sm:px-6 py-4 border-b border-[#2b3139]">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-[#848E9C] border border-[#2b3139] rounded-full px-3 py-1">
                    Records - {totalCount}
                  </span>
                  <button
                    className="text-sm px-3 py-1.5 rounded-md border border-[#2b3139] text-[#848E9C] bg-transparent"
                    onClick={() => fetchDataFromAPI()}
                    disabled={loading}
                    title="Refresh"
                  >
                    <i
                      className={`fa-solid fa-rotate ${
                        loading ? "fa-spin" : ""
                      }`}
                    />
                    &nbsp;Refresh
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <input
                    className="h-9 w-72 max-w-full bg-[#1e2329] border border-[#2b3139] rounded-md px-3 text-sm placeholder:text-[#848E9C] focus:outline-none"
                    placeholder="Search title or announcement…"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setCurrentPage(1);
                    }}
                  />
                  <select
                    className="h-9 bg-[#1e2329] border border-[#2b3139] rounded-md px-2 text-sm"
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                  >
                    {[10, 20, 50].map((n) => (
                      <option key={n} value={n}>
                        {n}/page
                      </option>
                    ))}
                  </select>
                  <a
                    className="inline-flex items-center h-9 px-3 rounded-md bg-[#fcd535] text-[#181a20] text-sm"
                    href="/announcement/create"
                  >
                    <i className="fa-solid fa-plus-square" />
                    &nbsp;Create New
                  </a>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="px-2 sm:px-4 py-4">
              <div className="max-h-[560px] overflow-auto rounded-md">
                <table ref={tableRef} className="w-full text-sm">
                  <thead className="sticky top-0 z-10 bg-[#1e2329]">
                    <tr className="border-b border-[#2b3139]">
                      <th
                        className="relative text-left font-semibold text-[#fcd535] px-3 py-2 whitespace-nowrap"
                        style={{ width: colWidths.title }}
                        onClick={() => requestSort("title")}
                      >
                        <div className="flex items-center gap-2">
                          <span>Title</span>
                          <i className={getSortIcon("title")} />
                        </div>
                        <div
                          className="absolute top-0 right-0 h-full w-[6px] cursor-col-resize select-none"
                          onMouseDown={(e) => handleMouseDown(e, "title")}
                        />
                      </th>
                      <th
                        className="relative text-left font-semibold text-[#fcd535] px-3 py-2 whitespace-nowrap"
                        style={{ width: colWidths.announcement }}
                        onClick={() => requestSort("announcement")}
                      >
                        <div className="flex items-center gap-2">
                          <span>Announcement</span>
                          <i className={getSortIcon("announcement")} />
                        </div>
                        <div
                          className="absolute top-0 right-0 h-full w-[6px] cursor-col-resize select-none"
                          onMouseDown={(e) =>
                            handleMouseDown(e, "announcement")
                          }
                        />
                      </th>
                      <th
                        className="relative text-left font-semibold text-[#fcd535] px-3 py-2 whitespace-nowrap"
                        style={{ width: colWidths.status }}
                        onClick={() => requestSort("status")}
                      >
                        <div className="flex items-center gap-2">
                          <span>Status</span>
                          <i className={getSortIcon("status")} />
                        </div>
                        <div
                          className="absolute top-0 right-0 h-full w-[6px] cursor-col-resize select-none"
                          onMouseDown={(e) => handleMouseDown(e, "status")}
                        />
                      </th>
                      <th
                        className="relative text-right font-semibold text-[#fcd535] px-3 py-2 whitespace-nowrap"
                        style={{ width: colWidths.action }}
                      >
                        Action
                        <div
                          className="absolute top-0 right-0 h-full w-[6px] cursor-col-resize select-none"
                          onMouseDown={(e) => handleMouseDown(e, "action")}
                        />
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {loading && (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-3 py-6 text-center text-[#848E9C]"
                        >
                          <i className="fa-solid fa-circle-notch fa-spin" />
                          &nbsp;Loading announcements…
                        </td>
                      </tr>
                    )}

                    {!loading && pagedData.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-3 py-10">
                          <div className="text-center text-[#848E9C]">
                            <i className="fa-regular fa-bell-slash text-xl" />
                            <div className="mt-2">No announcements found</div>
                          </div>
                        </td>
                      </tr>
                    )}

                    {!loading &&
                      pagedData.map((item, index) => (
                        <tr
                          key={`${item.announcementId}-${index}`}
                          className="border-b border-[#2b3139]"
                          onClick={() => setSelectedRow(item)}
                        >
                          <td
                            className="px-3 py-3 font-medium text-[#EAECEF] max-w-[1px] overflow-hidden text-ellipsis whitespace-nowrap"
                            title={item.title}
                          >
                            {item.title}
                          </td>
                          <td className="px-3 py-3 text-[#848E9C]">
                            <div
                              className="line-clamp-2"
                              title={item.announcement}
                            >
                              {item.announcement}
                            </div>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            {item.status === 1 ? (
                              <span className="text-[#10b981] bg-[rgba(16,185,129,.15)] text-xs font-semibold px-2.5 py-1 rounded-full">
                                Active
                              </span>
                            ) : (
                              <span className="text-[#ef4444] bg-[rgba(239,68,68,.15)] text-xs font-semibold px-2.5 py-1 rounded-full">
                                In-Active
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-3 text-right">
                            <a
                              className="inline-flex items-center h-8 px-2 text-sm rounded-md border border-[#2b3139] text-[#EAECEF] bg-transparent"
                              href={`announcement/${item.announcementId}/edit`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <i className="fa-regular fa-pen-to-square" />
                              &nbsp;Edit
                            </a>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex justify-end items-center gap-2 pt-4">
                <nav aria-label="Announcements pages">
                  <ul className="flex items-center gap-1">
                    <li>
                      <button
                        className={`h-9 min-w-9 px-2 rounded-md border border-[#2b3139] text-[#EAECEF] ${
                          currentPage === 1
                            ? "opacity-40 cursor-not-allowed"
                            : ""
                        }`}
                        onClick={() => setCurrentPage(1)}
                        disabled={currentPage === 1}
                        title="First"
                      >
                        «
                      </button>
                    </li>
                    <li>
                      <button
                        className={`h-9 px-3 rounded-md border border-[#2b3139] text-[#EAECEF] ${
                          currentPage === 1
                            ? "opacity-40 cursor-not-allowed"
                            : ""
                        }`}
                        onClick={() =>
                          setCurrentPage(Math.max(1, currentPage - 1))
                        }
                        disabled={currentPage === 1}
                      >
                        Previous
                      </button>
                    </li>

                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .slice(
                        Math.max(0, currentPage - 3),
                        Math.min(totalPages, currentPage + 2)
                      )
                      .map((pageNumber) => (
                        <li key={pageNumber}>
                          <button
                            className={`h-9 min-w-9 px-3 rounded-md border text-sm ${
                              currentPage === pageNumber
                                ? "bg-[#fcd535] border-[#fcd535] text-[#181a20]"
                                : "bg-transparent border-[#2b3139] text-[#EAECEF]"
                            }`}
                            onClick={() => setCurrentPage(pageNumber)}
                          >
                            {pageNumber}
                          </button>
                        </li>
                      ))}

                    <li>
                      <button
                        className={`h-9 px-3 rounded-md border border-[#2b3139] text-[#EAECEF] ${
                          currentPage === totalPages
                            ? "opacity-40 cursor-not-allowed"
                            : ""
                        }`}
                        onClick={() =>
                          setCurrentPage(Math.min(totalPages, currentPage + 1))
                        }
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </button>
                    </li>
                    <li>
                      <button
                        className={`h-9 min-w-9 px-2 rounded-md border border-[#2b3139] text-[#EAECEF] ${
                          currentPage === totalPages
                            ? "opacity-40 cursor-not-allowed"
                            : ""
                        }`}
                        onClick={() => setCurrentPage(totalPages)}
                        disabled={currentPage === totalPages}
                        title="Last"
                      >
                        »
                      </button>
                    </li>
                  </ul>
                </nav>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Preview Modal */}
        {selectedRow && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            onClick={() => setSelectedRow(null)}
          >
            <div
              className="w-[95vw] max-w-3xl rounded-xl border border-[#2b3139] bg-[#1e2329] text-[#EAECEF]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#2b3139]">
                <h5 className="text-lg font-semibold text-[#fcd535]">
                  {selectedRow.title}
                </h5>
                <button
                  type="button"
                  className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-[#2b3139] text-[#EAECEF]"
                  onClick={() => setSelectedRow(null)}
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>
              <div className="px-4 py-4">
                <p className="mb-3 whitespace-pre-wrap">
                  {selectedRow.announcement}
                </p>
                <div>
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                      selectedRow.status === 1
                        ? "text-[#10b981] bg-[rgba(16,185,129,.15)]"
                        : "text-[#ef4444] bg-[rgba(239,68,68,.15)]"
                    }`}
                  >
                    {selectedRow.status === 1 ? "Active" : "In-Active"}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-[#2b3139]">
                <a
                  className="inline-flex items-center h-9 px-3 rounded-md bg-[#fcd535] text-[#181a20] text-sm"
                  href={`announcement/${selectedRow.announcementId}/edit`}
                >
                  <i className="fa-regular fa-pen-to-square" />
                  &nbsp;Edit
                </a>
                <button
                  className="h-9 px-3 rounded-md border border-[#2b3139] text-[#848E9C] bg-transparent text-sm"
                  onClick={() => setSelectedRow(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Fragment>
  );
};

export default Announcement;
