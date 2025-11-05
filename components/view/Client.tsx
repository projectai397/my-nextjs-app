
"use client";

import apiClient from "@/lib/axiosInstance";

import React, { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Container } from "reactstrap";
import {
  ADMIN,
  ADMIN_API_ENDPOINT,
  ADMIN_CHANGE_PASSWORD,
  ADMIN_CHANGE_STATUS,
  ALL_USER_LIST,
  CLIENT,
  DELETE_DEMO_USER,
  SUCCESS,
  SUPER_ADMIN,
  USER_SEARCH_LIST,
} from "@/constant/index";
import { formatDateTime } from "@/hooks/range";
import Select, { SingleValue } from "react-select";
import { decryptData, encryptData } from "@/hooks/crypto";

// shadcn bottom sheet
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from "@/components/ui/sheet";
import { toast } from "sonner";
// (optional) a compact close button
import { Button as UIButton } from "@/components/ui/button";

// Your child views (adjust paths if different)
import ChildUserTradeList from "@/components/ChildUserTradeList";
import ChildUserPositions from "@/components/view/ChildUserPositions";

// ---- shadcn/ui ----
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table as STable,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";

/* ============================ Types ============================ */
type SortDirection = "ascending" | "descending";
type SortKey =
  | "parentUser"
  | "name"
  | "userName"
  | "phone"
  | "roleName"
  | "profitAndLossSharing"
  | "brkSharing"
  | "balance"
  | "p/l"
  | "autoSquareOffReachStatus"
  | "createdAt"
  | "lastLoginTime"
  | "deviceId"
  | "ipAddress";

type SortConfig = { key: SortKey | null; direction: SortDirection };
type OptionType = { label: string; value: string };

type SearchForm = {
  user?: OptionType | null;
  search?: string;
};

type FormCP = {
  newPassword?: string;
  confirmPassword?: string;
};

type FormStatus = {
  userId?: string | number;
  status?: number;
  bet?: number | boolean;
  closeOnly?: number | boolean;
};

type UserItem = {
  userId: string | number;
  parentUser?: string;
  name?: string;
  userName?: string;
  phone?: string;
  roleName?: string;
  role?: string | number;
  profitAndLossSharing?: number;
  brkSharing?: number;
  balance: number;
  profitLoss: number;
  brokerageTotal: number;
  autoSquareOffReachStatus?: string | number;
  createdAt?: string | number | Date;
  lastLoginTime?: string | number | Date;
  deviceId?: string;
  ipAddress?: string;
  isDemoAccount?: boolean;
};

type ApiMeta = { totalPage: number; totalCount: number };

const Clients: React.FC = () => {
  const { role } = useParams<{ role?: string }>();

  const deviceType =
    (typeof window !== "undefined" && localStorage.getItem("deviceType")) || "";
  const jwt_token =
    (typeof window !== "undefined" && localStorage.getItem("token")) || "";
  const authenticated = (typeof window !== "undefined" &&
    JSON.parse(localStorage.getItem("authenticated") || "null")) as any;

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);
  const itemsPerPage = 100;

  const [tableData, setTableData] = useState<UserItem[]>([]);
  const [searchFormData, setSearchFormData] = useState<SearchForm>({});
  const [userData, setUserData] = useState<OptionType[]>([]);
  const [cpUserId, setCpUserId] = useState<string | number | "">("");
  const [formData, setFormData] = useState<FormCP>({});
  const [formStatusData, setFormStatusData] = useState<FormStatus>({});
  const [statusUserId, setStatusUserId] = useState<string | number | "">("");
  type PanelKind = "trades" | "positions";

  const [panelOpen, setPanelOpen] = useState(false);
  const [panelKind, setPanelKind] = useState<PanelKind>("trades");
  const [panelUser, setPanelUser] = useState<UserItem | null>(null);

  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: null,
    direction: "ascending",
  });

  // Infinite scroll controls
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const sentinelRef = useRef<HTMLTableRowElement | null>(null);

  /* ============================ Sorting ============================ */
  const requestSort = (key: SortKey) => {
    let direction: SortDirection = "ascending";
    if (sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending";
    }
    setSortConfig({ key, direction });
  };

  const sortedTableData = useMemo<UserItem[]>(() => {
    const items = [...tableData];
    if (sortConfig.key === null) return items;

    return items.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      if (sortConfig.key === "p/l") {
        aValue =
          a.role === CLIENT
            ? a.profitLoss - a.brokerageTotal
            : a.profitLoss + a.brokerageTotal;
        bValue =
          b.role === CLIENT
            ? b.profitLoss - b.brokerageTotal
            : b.profitLoss + b.brokerageTotal;
      } else if (sortConfig.key !== null) {
        aValue = (a as any)[sortConfig.key];
        bValue = (b as any)[sortConfig.key];
      } else {
        aValue = undefined;
        bValue = undefined;
      }

      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      if (typeof aValue === "string" && typeof bValue === "string") {
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
  }, [tableData, sortConfig]);

  const getSortIcon = (key: SortKey) => {
    if (sortConfig.key !== key) return "fa-solid fa-sort";
    return sortConfig.direction === "ascending"
      ? "fa-solid fa-sort-up"
      : "fa-solid fa-sort-down";
  };

  /* ============================ API ============================ */
  const fetchDataFromAPI = async (reset: 0 | 1) => {
    try {
      setIsLoading(true);
      const payload = encryptData({
        userId:
          !reset && searchFormData?.user?.value
            ? searchFormData.user.value
            : "",
        role: authenticated?.role,
        search: !reset && searchFormData?.search ? searchFormData.search : "",
        page: currentPage,
        limit: itemsPerPage,
        roleId: CLIENT,
      });
      const data = JSON.stringify({ data: payload });

      apiClient
        .post(ADMIN_API_ENDPOINT + ALL_USER_LIST, data, {
          headers: {
            Authorization: jwt_token,
            "Content-Type": "application/json",
            deviceType: deviceType,
          },
        })
        .then((response) => {
          if (response.data.statusCode == SUCCESS) {
            const rdata = decryptData(response.data.data) as UserItem[];
            const meta = response.data.meta as ApiMeta;

            if (reset === 1 || currentPage === 1) {
              setTableData(rdata);
            } else {
              setTableData((prev) => [...prev, ...rdata]);
            }

            setTotalPages(meta.totalPage);
            setTotalCount(meta.totalCount);
            setHasMore(currentPage < meta.totalPage);
          } else {
            toast.error(response.data.message);
          }
        })
        .catch((error: any) => {
          toast.error(error?.response?.data?.message);
          console.error("List error:", error);
        })
        .finally(() => setIsLoading(false));
    } catch (error) {
      console.error("Error fetching data:", error);
      setIsLoading(false);
    }
  };

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  const UserTradesRedirect = (item: UserItem, _redirect: string) => {
    setPanelKind("trades");
    setPanelUser(item);
    setPanelOpen(true);
  };

  const UserPositionsRedirect = (item: UserItem, _redirect: string) => {
    setPanelKind("positions");
    setPanelUser(item);
    setPanelOpen(true);
  };

  // --- just above fetchOptions ---
  const fetchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchOptions = (inputValue: string) => {
    // show results starting at the very first character
    const q = (inputValue || "").trim();

    if (fetchTimer.current) clearTimeout(fetchTimer.current);

    fetchTimer.current = setTimeout(() => {
      if (!q) {
        setUserData([]); // empty query -> empty list
        return;
      }

      try {
        const payload = encryptData({
          filterType: 0,
          roleId: "",
          userId: "",
          status: 0,
          search: q, // send the 1+ char query
          page: 1,
          limit: 50,
        });
        const data = JSON.stringify({ data: payload });

        apiClient
          .post(ADMIN_API_ENDPOINT + USER_SEARCH_LIST, data, {
            headers: {
              Authorization: jwt_token,
              "Content-Type": "application/json",
              deviceType: deviceType,
            },
          })
          .then((response) => {
            if (response.data.statusCode == SUCCESS) {
              const rdata = decryptData(response.data.data) as Array<{
                userName: string;
                phone: string;
                userId: string;
              }>;
              const rRes: OptionType[] = rdata.map((i) => ({
                label: `${i.userName} ${i.phone}`,
                value: i.userId,
              }));
              setUserData(rRes);
            } else {
              toast.error(response.data.message);
            }
          })
          .catch((error: any) => {
            toast.error(error?.response?.data?.message);
          });
      } catch (err) {
        console.error("Error fetching options:", err);
      }
    }, 250); // small debounce so we don't hammer the API
  };

  const handleInputChange = (value: string) => {
    fetchOptions(value);
  };
  const handleReset = async () => {
    setSearchFormData({ ...searchFormData, user: null, search: "" });
    setUserData([]);
    setCurrentPage(1);
    setHasMore(true);
    queueMicrotask(() => fetchDataFromAPI(1));
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSearchFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFilter = async () => {
    setCurrentPage(1);
    setHasMore(true);
    queueMicrotask(() => fetchDataFromAPI(0));
  };

  const handleChangeUserDataValueOption = (
    selectedOption: SingleValue<OptionType>,
    name: keyof SearchForm
  ) => {
    setSearchFormData((prev) => ({ ...prev, [name]: selectedOption ?? null }));
  };

  const onClose = () => {
    setCpUserId("");
    setFormData({});
  };

  const handleChangeCP = (userId: string | number) => {
    setCpUserId(userId);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleChangePassword = async () => {
    try {
      if (!formData.newPassword || !formData.confirmPassword) {
        toast.error("Please fill in all fields");
        return;
      }
      if ((formData.newPassword || "").length < 8) {
        toast.error("New Password must be greater than 8 characters.");
        return;
      }
      if (formData.newPassword !== formData.confirmPassword) {
        toast.error("New Password and Confirm Password doesn't match");
        return;
      }

      const payload = encryptData({
        newPassword: formData.newPassword,
        userId: cpUserId,
      });
      const data = JSON.stringify({ data: payload });

      apiClient
        .post(ADMIN_API_ENDPOINT + ADMIN_CHANGE_PASSWORD, data, {
          headers: {
            Authorization: jwt_token,
            "Content-Type": "application/json",
            deviceType: deviceType,
          },
        })
        .then((response) => {
          if (response.data.statusCode == SUCCESS) {
            setCpUserId("");
            setFormData({});
            toast.success(response.data.meta.message);
          } else {
            toast.error(response.data.message);
          }
        })
        .catch((error: any) => {
          toast.error(error?.response?.data?.message);
        });
    } catch {
      // no-op
    }
  };

  const handleChangeStatus = (userId: string | number, item: UserItem) => {
    const next: FormStatus = {
      ...item,
      userId,
      status: (item as any).status,
      bet: (item as any).bet ? 1 : 2,
      closeOnly: (item as any).closeOnly ? 1 : 2,
    };
    setFormStatusData(next);
    setStatusUserId(userId);
  };

  const handleStatusChange = (e: React.MouseEvent<HTMLInputElement>) => {
    const target = e.target as HTMLInputElement;
    const { name, value } = target;
    setFormStatusData((prev) => ({ ...prev, [name]: Number(value) }));
    handleChangeST(name as keyof FormStatus, Number(value) as any);
  };

  const onStatusClose = () => {
    setStatusUserId("");
    setFormStatusData({});
  };

  const handleChangeST = async (
    name: keyof FormStatus,
    value: number | boolean
  ) => {
    try {
      const ar: any = { logStatus: name, userId: statusUserId };

      if (name === "status") {
        (formStatusData as any).status = value;
        ar.status = value;
      }
      if (name === "bet") {
        (formStatusData as any).bet = value;
        ar.bet = Number(value) === 1;
      }
      if (name === "closeOnly") {
        (formStatusData as any).closeOnly = value;
        ar.closeOnly = Number(value) === 1;
      }

      const payload = encryptData(ar);
      const data = JSON.stringify({ data: payload });

      apiClient
        .post(ADMIN_API_ENDPOINT + ADMIN_CHANGE_STATUS, data, {
          headers: {
            Authorization: jwt_token,
            "Content-Type": "application/json",
            deviceType: deviceType,
          },
        })
        .then((response) => {
          if (response.data.statusCode == SUCCESS) {
            const idExists = tableData.some(
              (i) => i.userId === formStatusData.userId
            );
            if (idExists) {
              const patched: any = { ...formStatusData };
              patched.bet = Number(patched.bet) === 1;
              patched.closeOnly = Number(patched.closeOnly) === 1;
              const newData = tableData.map((i) =>
                i.userId === formStatusData.userId ? patched : i
              );
              setTableData(newData);
            }
            toast.success(response.data.meta.message);
          } else {
            toast.error(response.data.message);
          }
        })
        .catch((error: any) => {
          toast.error(error?.response?.data?.message);
        });
    } catch {
      // no-op
    }
  };

  const handleDeleteDemo = async (userId: string | number) => {
    const isConfirmed = window.confirm(
      "Are you sure you want to delete demo user?"
    );
    if (!isConfirmed) return;

    try {
      const payload = encryptData({ userId });
      const data = JSON.stringify({ data: payload });

      apiClient
        .post(ADMIN_API_ENDPOINT + DELETE_DEMO_USER, data, {
          headers: {
            Authorization: jwt_token,
            "Content-Type": "application/json",
            deviceType: deviceType,
          },
        })
        .then((response) => {
          setCurrentPage(1);
          setHasMore(true);
          queueMicrotask(() => fetchDataFromAPI(1));

          if (response.data.statusCode == SUCCESS) {
            toast.success(response.data.meta.message);
          } else {
            toast.error(response.data.meta.message);
          }
        })
        .catch((error: any) => {
          toast.error(error?.response?.data?.message);
        });
    } catch {
      // no-op
    }
  };

  /* ============================ Effects ============================ */
  useEffect(() => {
    fetchDataFromAPI(currentPage === 1 ? 1 : 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  useEffect(() => {
    document.title = "Admin Panel | Clients";
    return () => {
      document.title = "Admin Panel";
    };
  }, []);

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting && !isLoading && hasMore) {
          handlePageChange(currentPage + 1);
        }
      },
      { root: null, rootMargin: "800px 0px 800px 0px", threshold: 0.01 }
    );

    observer.observe(node);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, hasMore, currentPage]);

  /* ============================ UI ============================ */
  return (
    <div
      className="overflow-y-auto h-full "
      style={{ backgroundColor: "#181a20" }}
    >
      <CardHeader className="space-y-2">
        {/* <div className="flex items-center justify-between">
        <CardTitle className="text-xl md:text-2xl font-semibold tracking-tight" style={{ color: "#fcd535" }}>
          Clients
        </CardTitle>
        <Badge variant="secondary" className="rounded-full" style={{ backgroundColor: "#2b3139", color: "#848E9C" }}>
          Records — {totalCount}
        </Badge>
      </div>
      <Separator style={{ backgroundColor: "#2b3139" }} /> */}
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-4">
          <div className="xl:col-span-2">
            <Label
              htmlFor="searchable-select"
              className="text-sm"
              style={{ color: "#fff" }}
            >
              User Name
            </Label>
            <div className="mt-1">
              <Select
                id="searchable-select"
                value={searchFormData.user || null}
                onChange={(opt) =>
                  handleChangeUserDataValueOption(
                    opt as SingleValue<OptionType>,
                    "user"
                  )
                }
                options={userData}
                onInputChange={handleInputChange}
                isSearchable
                // open as soon as user focuses, then filter as they type
                openMenuOnFocus
                openMenuOnClick
                placeholder="Type to search..."
                noOptionsMessage={() => "Type a name or phone…"}
                styles={{
                  control: (base) => ({
                    ...base,
                    borderColor: "#2b3139",
                    backgroundColor: "#181a20",
                    boxShadow: "none",
                    minHeight: 40,
                    color: "#fcd535",
                  }),
                  input: (base) => ({ ...base, color: "#fcd535" }),
                  menu: (base) => ({
                    ...base,
                    zIndex: 40,
                    backgroundColor: "#1e2329",
                    color: "#fcd535",
                  }),
                  option: (base, state) => ({
                    ...base,
                    backgroundColor: state.isFocused ? "#2b3139" : "#1e2329",
                    color: "#fcd535",
                  }),
                  singleValue: (base) => ({
                    ...base,
                    color: "#fcd535",
                  }),
                }}
              />
            </div>
          </div>

          {/* <div className="xl:col-span-2">
          <Label htmlFor="search" className="text-sm" style={{ color: "#fff" }}>
            Search
          </Label>
          <Input
            id="search"
            name="search"
            type="text"
            value={searchFormData.search || ""}
            onChange={handleSearchChange}
            placeholder="Search"
            className="mt-1"
            style={{
              backgroundColor: "#181a20",
              borderColor: "#2b3139",
              color: "#fcd535"
            }}
          />
        </div> */}

          <div className="xl:col-span-2 flex items-end justify-end md:justify-end gap-2">
            <Button
              onClick={() => handleFilter()}
              className="w-full md:w-auto"
              style={{
                backgroundColor: "#fcd535",
                color: "#000",
                border: "none",
              }}
            >
              View
            </Button>
            <Button
              variant="destructive"
              onClick={handleReset}
              className="w-full md:w-auto"
              style={{
                backgroundColor: "#e74c3c",
                color: "#fff",
                border: "none",
              }}
            >
              Clear
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-2">
        {/* Scrollable, compact, sticky header table */}
        <div
          className="relative rounded-xl border shadow-sm"
          style={{
            maxHeight: "79vh",
            backgroundColor: "#1e2329",
            borderColor: "#2b3139",
            overflowX: "auto",
          }}
        >
          <div className="pointer-events-none absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-gray-100/70 to-transparent z-10" />

          <STable className="min-w-full border-collapse">
            {/* <TableCaption className="text-xs" style={{ color: "#848E9C" }}>
            Infinite Scroll: more rows load automatically as you reach
            the end.
          </TableCaption> */}

            <TableHeader
              className="sticky top-0 z-20 text-sm font-medium shadow-sm"
              style={{
                backgroundColor: "#2b3139",
                color: "#fcd535",
              }}
            >
              <TableRow className="border-b" style={{ borderColor: "#2b3139" }}>
                <TableHead
                  onClick={() => requestSort("parentUser")}
                  className="whitespace-nowrap px-3 py-1 cursor-pointer select-none !text-white"
                >
                  Parent <i className={getSortIcon("parentUser")} />
                </TableHead>
                <TableHead
                  onClick={() => requestSort("name")}
                  className="whitespace-nowrap px-3 py-1 cursor-pointer select-none w-[180px] !text-white"
                >
                  Name <i className={getSortIcon("name")} />
                </TableHead>
                <TableHead
                  onClick={() => requestSort("userName")}
                  className="whitespace-nowrap px-3 py-1 cursor-pointer select-none !text-white"
                >
                  Username <i className={getSortIcon("userName")} />
                </TableHead>
                <TableHead
                  onClick={() => requestSort("phone")}
                  className="whitespace-nowrap px-3 py-1 cursor-pointer select-none !text-white"
                >
                  Mobile <i className={getSortIcon("phone")} />
                </TableHead>
                <TableHead
                  onClick={() => requestSort("roleName")}
                  className="whitespace-nowrap px-3 py-1 cursor-pointer select-none !text-white"
                >
                  Type <i className={getSortIcon("roleName")} />
                </TableHead>

                {(authenticated?.role === ADMIN ||
                  authenticated?.role === SUPER_ADMIN) && (
                  <TableHead
                    onClick={() => requestSort("profitAndLossSharing")}
                    className="whitespace-nowrap px-3 py-1 cursor-pointer text-center select-none !text-white"
                  >
                    % <i className={getSortIcon("profitAndLossSharing")} />
                  </TableHead>
                )}

                {(authenticated?.role === ADMIN ||
                  authenticated?.role === SUPER_ADMIN) && (
                  <TableHead
                    onClick={() => requestSort("brkSharing")}
                    className="whitespace-nowrap px-3 py-1 cursor-pointer text-center select-none !text-white"
                  >
                    Brk % <i className={getSortIcon("brkSharing")} />
                  </TableHead>
                )}

                <TableHead
                  onClick={() => requestSort("balance")}
                  className="whitespace-nowrap px-3 py-1 cursor-pointer text-right select-none !text-white"
                >
                  Balance <i className={getSortIcon("balance")} />
                </TableHead>

                <TableHead
                  onClick={() => requestSort("p/l")}
                  className="whitespace-nowrap px-3 py-1 cursor-pointer text-right select-none !text-white"
                >
                  P/L <i className={getSortIcon("p/l")} />
                </TableHead>

                <TableHead
                  onClick={() => requestSort("autoSquareOffReachStatus")}
                  className="whitespace-nowrap px-3 py-1 cursor-pointer select-none !text-white"
                >
                  Auto Square Off Limit{" "}
                  <i className={getSortIcon("autoSquareOffReachStatus")} />
                </TableHead>

                <TableHead
                  onClick={() => requestSort("createdAt")}
                  className="whitespace-nowrap px-3 py-1 cursor-pointer select-none !text-white"
                >
                  Created Date <i className={getSortIcon("createdAt")} />
                </TableHead>

                <TableHead
                  onClick={() => requestSort("lastLoginTime")}
                  className="whitespace-nowrap px-3 py-1 cursor-pointer select-none !text-white"
                >
                  Last Login D/T <i className={getSortIcon("lastLoginTime")} />
                </TableHead>

                <TableHead
                  onClick={() => requestSort("deviceId")}
                  className="whitespace-nowrap px-3 py-1 cursor-pointer select-none !text-white"
                >
                  Device ID <i className={getSortIcon("deviceId")} />
                </TableHead>

                <TableHead
                  onClick={() => requestSort("ipAddress")}
                  className="whitespace-nowrap px-3 py-1 cursor-pointer select-none !text-white"
                >
                  IP Address <i className={getSortIcon("ipAddress")} />
                </TableHead>

                {/* Blue header like your screenshot */}
                <TableHead
                  className="whitespace-nowrap px-3 py-1 text-center select-none"
                  style={{
                    // backgroundColor: "#fcd535",
                    color: "#fff",
                  }}
                >
                  ACTION
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody className="text-sm" style={{ color: "#ffffff" }}>
              {sortedTableData.map((item, index) => (
                <TableRow
                  key={`${item.userId}-${index}`}
                  className="transition-colors hover:bg-gray-800"
                  style={{
                    backgroundColor: "#1e2329",
                    color: "#ffffff",
                  }}
                >
                  <TableCell className="px-3 py-1 font-medium">
                    {item.parentUser}
                  </TableCell>

                  <TableCell className="px-3 py-1">
                    <div className="truncate max-w-[180px]" title={item.name}>
                      {item.name}
                    </div>
                  </TableCell>

                  <TableCell className="px-3 py-1">{item.userName}</TableCell>
                  <TableCell className="px-3 py-1">{item.phone}</TableCell>
                  <TableCell className="px-3 py-1">
                    <Badge
                      variant="outline"
                      className="rounded-sm text-xs"
                      style={{
                        backgroundColor: "#2b3139",
                        borderColor: "#fcd535",
                        color: "#fcd535",
                      }}
                    >
                      {item.roleName}
                    </Badge>
                  </TableCell>

                  {(authenticated?.role === ADMIN ||
                    authenticated?.role === SUPER_ADMIN) && (
                    <TableCell className="px-3 py-1 text-center">
                      {item.profitAndLossSharing}
                    </TableCell>
                  )}

                  {(authenticated?.role === ADMIN ||
                    authenticated?.role === SUPER_ADMIN) && (
                    <TableCell className="px-3 py-1 text-center">
                      {item.brkSharing}
                    </TableCell>
                  )}

                  <TableCell className="px-3 py-1 text-right">
                    {Number(item.balance || 0).toFixed(2)}
                  </TableCell>

                  <TableCell className="px-3 py-1 text-right">
                    {item.role === CLIENT
                      ? Number(
                          (item.profitLoss || 0) - (item.brokerageTotal || 0)
                        ).toFixed(2)
                      : Number(
                          (item.profitLoss || 0) + (item.brokerageTotal || 0)
                        ).toFixed(2)}
                  </TableCell>

                  <TableCell className="px-3 py-1" style={{ color: "#848E9C" }}>
                    {(item as any).autoSquareOffReachStatus as any}
                  </TableCell>

                  <TableCell className="px-3 py-1">
                    {formatDateTime(item.createdAt)}
                  </TableCell>

                  <TableCell className="px-3 py-1">
                    {formatDateTime(item.lastLoginTime)}
                  </TableCell>

                  <TableCell className="px-3 py-1 truncate max-w-[200px]">
                    {item.deviceId}
                  </TableCell>

                  <TableCell className="px-3 py-1">{item.ipAddress}</TableCell>

                  <TableCell className="px-3 py-1">
                    {/* --- PILL STYLE like screenshot --- */}
                    <div className="flex gap-1 justify-center whitespace-nowrap">
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full px-2 h-6 text-xs"
                        style={{
                          borderColor: "#fcd535",
                          color: "#fcd535",
                          backgroundColor: "transparent",
                        }}
                        onClick={() =>
                          UserTradesRedirect(
                            item,
                            `/clients/${item.userId}/trades`
                          )
                        }
                      >
                        Trades
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full px-2 h-6 text-xs"
                        style={{
                          borderColor: "#fcd535",
                          color: "#fcd535",
                          backgroundColor: "transparent",
                        }}
                        onClick={() =>
                          UserPositionsRedirect(
                            item,
                            `/clients/${item.userId}/positions`
                          )
                        }
                      >
                        Positions
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full px-2 h-6 text-xs"
                        style={{
                          borderColor: "#fcd535",
                          color: "#fcd535",
                          backgroundColor: "transparent",
                        }}
                        onClick={() => handleChangeCP(item.userId)}
                      >
                        CP
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full px-2 h-6 text-xs"
                        style={{
                          borderColor: "#fcd535",
                          color: "#fcd535",
                          backgroundColor: "transparent",
                        }}
                        onClick={() => handleChangeStatus(item.userId, item)}
                      >
                        Action
                      </Button>
                      {item.isDemoAccount &&
                        (authenticated?.role === ADMIN ||
                          authenticated?.role === SUPER_ADMIN) && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-full px-2 h-6 text-xs"
                            style={{
                              borderColor: "#e74c3c",
                              color: "#e74c3c",
                              backgroundColor: "transparent",
                            }}
                            onClick={() => handleDeleteDemo(item.userId)}
                          >
                            Delete
                          </Button>
                        )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}

              {/* Sentinel / Loading Row */}
              <TableRow ref={sentinelRef}>
                <TableCell
                  colSpan={15}
                  className="py-2 text-center text-sm"
                  style={{ color: "#848E9C" }}
                >
                  {isLoading
                    ? "Loading more…"
                    : hasMore
                    ? "Scroll to load more"
                    : "No more records"}
                </TableCell>
              </TableRow>
            </TableBody>
          </STable>
        </div>
      </CardContent>

      {/* Change Password Dialog */}
      <Dialog
        open={Boolean(cpUserId)}
        onOpenChange={(open) => !open && onClose()}
      >
        <DialogContent
          className="sm:max-w-md"
          style={{ backgroundColor: "#1e2329", border: "1px solid #2b3139" }}
        >
          <DialogHeader>
            <DialogTitle style={{ color: "#fcd535" }}>
              Change Password
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="newPassword" style={{ color: "#848E9C" }}>
                Password
              </Label>
              <Input
                id="newPassword"
                name="newPassword"
                type="password"
                value={formData.newPassword || ""}
                placeholder="Enter Password"
                onChange={handleChange}
                style={{
                  backgroundColor: "#181a20",
                  borderColor: "#2b3139",
                  color: "#fcd535",
                }}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword" style={{ color: "#848E9C" }}>
                Confirm Password
              </Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword || ""}
                placeholder="Enter Confirm Password"
                onChange={handleChange}
                style={{
                  backgroundColor: "#181a20",
                  borderColor: "#2b3139",
                  color: "#fcd535",
                }}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              onClick={handleChangePassword}
              style={{
                backgroundColor: "#fcd535",
                color: "#000",
                border: "none",
              }}
            >
              Save changes
            </Button>
            <Button
              variant="destructive"
              type="button"
              onClick={onClose}
              style={{
                backgroundColor: "#e74c3c",
                color: "#fff",
                border: "none",
              }}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status Dialog */}
      <Dialog
        open={Boolean(statusUserId)}
        onOpenChange={(open) => !open && onStatusClose()}
      >
        <DialogContent
          className="sm:max-w-md"
          style={{ backgroundColor: "#1e2329", border: "1px solid #2b3139" }}
        >
          <DialogHeader>
            <DialogTitle style={{ color: "#fcd535" }}>Action</DialogTitle>
          </DialogHeader>

          <div className="grid gap-6 py-2">
            {/* Status */}
            <div>
              <Label className="mb-2 block" style={{ color: "#848E9C" }}>
                Status <span className="text-red-500">*</span>
              </Label>
              <div className="flex items-center gap-6">
                <label className="inline-flex items-center gap-2">
                  <input
                    className="h-4 w-4"
                    id="status"
                    name="status"
                    type="radio"
                    value="1"
                    checked={formStatusData.status == 1}
                    onClick={handleStatusChange}
                  />
                  <span style={{ color: "#fcd535" }}>Active</span>
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    className="h-4 w-4"
                    id="status2"
                    name="status"
                    type="radio"
                    value="2"
                    checked={formStatusData.status == 2}
                    onClick={handleStatusChange}
                  />
                  <span style={{ color: "#fcd535" }}>In-Active</span>
                </label>
              </div>
            </div>

            {/* Bet */}
            <div>
              <Label className="mb-2 block" style={{ color: "#848E9C" }}>
                Bet <span className="text-red-500">*</span>
              </Label>
              <div className="flex items-center gap-6">
                <label className="inline-flex items-center gap-2">
                  <input
                    className="h-4 w-4"
                    id="bet1"
                    name="bet"
                    type="radio"
                    value={1}
                    checked={formStatusData.bet == 1}
                    onClick={handleStatusChange}
                  />
                  <span style={{ color: "#fcd535" }}>On</span>
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    className="h-4 w-4"
                    id="bet2"
                    name="bet"
                    type="radio"
                    value={2}
                    checked={formStatusData.bet == 2}
                    onClick={handleStatusChange}
                  />
                  <span style={{ color: "#fcd535" }}>Off</span>
                </label>
              </div>
            </div>

            {/* Close Only */}
            <div>
              <Label className="mb-2 block" style={{ color: "#848E9C" }}>
                Close Only <span className="text-red-500">*</span>
              </Label>
              <div className="flex items-center gap-6">
                <label className="inline-flex items-center gap-2">
                  <input
                    className="h-4 w-4"
                    id="closeOnly1"
                    name="closeOnly"
                    type="radio"
                    value={1}
                    checked={formStatusData.closeOnly == 1}
                    onClick={handleStatusChange}
                  />
                  <span style={{ color: "#fcd535" }}>On</span>
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    className="h-4 w-4"
                    id="closeOnly2"
                    name="closeOnly"
                    type="radio"
                    value={2}
                    checked={formStatusData.closeOnly == 2}
                    onClick={handleStatusChange}
                  />
                  <span style={{ color: "#fcd535" }}>Off</span>
                </label>
              </div>
            </div>
          </div>
        </DialogContent>
        {/* Bottom Sheet for Trades / Positions */}
        <Sheet open={panelOpen} onOpenChange={setPanelOpen}>
          <SheetContent
            side="bottom"
            className="h-[80vh] p-0 border-t"
            style={{ backgroundColor: "#1e2329", borderColor: "#2b3139" }}
          >
            <div
              className="sticky top-0 z-10 border-b"
              style={{ backgroundColor: "#1e2329", borderColor: "#2b3139" }}
            >
              <SheetHeader className="px-4 py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <SheetTitle
                      className="text-base md:text-lg"
                      style={{ color: "#fcd535" }}
                    >
                      {panelKind === "trades"
                        ? "User Trades"
                        : "User Positions"}
                    </SheetTitle>
                    <SheetDescription
                      className="text-xs md:text-sm"
                      style={{ color: "#848E9C" }}
                    >
                      {panelUser
                        ? `${panelUser.userName} • ${panelUser.phone ?? ""}`
                        : ""}
                    </SheetDescription>
                  </div>
                  <SheetClose asChild>
                    <UIButton
                      variant="outline"
                      size="sm"
                      style={{
                        borderColor: "#fcd535",
                        color: "#fcd535",
                        backgroundColor: "transparent",
                      }}
                    >
                      Close
                    </UIButton>
                  </SheetClose>
                </div>
              </SheetHeader>
            </div>

            <div className="h-[calc(80vh-64px)] overflow-auto">
              {panelUser && panelKind === "trades" && (
                <ChildUserTradeList
                  userId={String(panelUser.userId)}
                  user={panelUser}
                  onClose={() => setPanelOpen(false)}
                />
              )}
              {panelUser && panelKind === "positions" && (
                <ChildUserPositions
                  userId={String(panelUser.userId)}
                  user={panelUser}
                  onClose={() => setPanelOpen(false)}
                />
              )}
            </div>
          </SheetContent>
        </Sheet>
      </Dialog>
    </div>
  );
};

export default Clients;
