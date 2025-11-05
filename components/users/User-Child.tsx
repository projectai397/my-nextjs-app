"use client";

import apiClient from "@/lib/axiosInstance";
import React, { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Select from "react-select";
import ChildUserList from "./child-user-list";
import {
  ADMIN,
  ADMIN_API_ENDPOINT,
  ADMIN_CHANGE_PASSWORD,
  ADMIN_CHANGE_STATUS,
  ALL_USER_BALANCE,
  BROKER,
  CLIENT,
  MASTER,
  ROLE_LIST,
  SHIFT_USER,
  SUCCESS,
  SUPER_ADMIN,
  USER_CHILD_LIST,
  USER_LIST,
  USER_LIST_EXPORT,
  USER_SEARCH_LIST,
  USER_CHECK_U_DATA,
} from "@/constant/index";

import {
  formatDateForExportExcelName,
  formatDateTime,
} from "@/hooks/dateUtils";
import { ssGet, ssGetJSON } from "@/hooks/helper";
import { decryptData, decryptData1, encryptData } from "@/hooks/crypto";
import { getTodayRange } from "@/hooks/range";
import { toast } from "sonner";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";

/* ===== Sub-pages ===== */
import TradeList from "@/components/view/tradeList";
import Positions from "@/components/view/positions";
import Orders from "@/components/view/pendingOrders";
import RejectionTradeList from "@/components/view/RejectionTradeList";
import ChildDepositWithdrawal from "@/components/payment/ChildWithdraw";

/* ===== shadcn/ui ===== */
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, Settings } from "lucide-react";

/* ================= Types ================= */
interface User {
  userId: string;
  userName: string;
  name: string;
  phone: string;
  roleName: string;
  role: number | string;
  parentId?: string;
  parentUser?: string;
  profitAndLossSharing?: number;
  brkSharing?: number;
  balance: number;
  profitLoss: number;
  brokerageTotal: number;
  createdAt: string;
  lastLoginTime: string;
  deviceType: string;
  deviceId: string;
  ipAddress: string;
  domain?: string;
  depositWithdrawAtsSystem?: boolean;
  status: number;
}

interface AuthenticatedUser {
  role: string;
  userId: string;
  userName: string;
  domain: string;
}

interface SearchFormData {
  search: string;
  roleId: string | number;
  startDate: string;
  endDate: string;
  status: number;
}

interface FormData {
  newPassword?: string;
  confirmPassword?: string;
  [key: string]: any;
}

interface FormStatusData {
  status?: number;
  [key: string]: any;
}

interface FormFilterData {
  user?: { label: string; value: string } | null;
  [key: string]: any;
}

interface SortConfig {
  key: keyof User | "script" | null;
  direction: "ascending" | "descending";
}

type TabTitle =
  | "Position"
  | "Trade"
  | "Pending order"
  | "D/W"
  | "Rejection log"
  | "User List";
interface TabData {
  id: number;
  title: TabTitle;
}
interface RoleOption {
  value: string | number;
  label: string;
}
interface StatusOption {
  value: number;
  label: string;
}

/* ============== Small UI helpers ============== */
const StatusBadge = ({ status }: { status: number }) => {
  const map: Record<
    number,
    {
      label: string;
      variant: "default" | "secondary" | "destructive" | "outline";
    }
  > = {
    1: { label: "Active", variant: "default" },
    2: { label: "In-Active", variant: "secondary" },
    0: { label: "Deleted", variant: "destructive" },
  };
  const v = map[status] || { label: "Unknown", variant: "outline" };
  return <Badge variant={v.variant}>{v.label}</Badge>;
};

const RoleBadge = ({ role }: { role: string }) => (
  <Badge variant="outline" className="text-xs">
    {role}
  </Badge>
);

const PL = ({ value }: { value: number }) => (
  <span className={value >= 0 ? "text-emerald-400" : "text-rose-400"}>
    {value.toFixed(2)}
  </span>
);

const RowSkeleton: React.FC<{ rows?: number }> = ({ rows = 10 }) => (
  <div className="p-3">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="h-9 animate-pulse bg-[#151a20] rounded mb-2" />
    ))}
  </div>
);

const Users: React.FC = ({}: any) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const authenticated = ssGetJSON<AuthenticatedUser>("authenticated", {
    role: "",
    userId: "",
    userName: "",
    domain: "",
  });

  useEffect(() => {
    const prev = document.title;
    document.title = "Admin Panel | Users";
    return () => {
      document.title = prev || "Admin Panel";
    };
  }, []);

  const { startDate, endDate } = getTodayRange(); // (kept if you later use it)

  /** ========= TABS ========= */
  const tabs: TabData[] = [
    { id: 1, title: "Position" },
    { id: 2, title: "Trade" },
    { id: 3, title: "Pending order" },
    { id: 4, title: "D/W" },
    { id: 5, title: "Rejection log" },
    { id: 6, title: "User List" },
  ];
  const [selected, setSelected] = useState<TabData>(tabs[0]);

  /** ========= PAGE STATE ========= */
  const itemParam = searchParams?.get("item");
  const itemFromQuery: User | undefined = useMemo(() => {
    if (!itemParam) return undefined;
    try {
      return JSON.parse(atob(itemParam)) as User;
    } catch {
      return undefined;
    }
  }, [itemParam]);
  const paramUserId = searchParams?.get("userId") || "";

  const [userDetails, setUserDetails] = useState<User | null>(
    itemFromQuery ?? null
  );

  const [tableData, setTableData] = useState<User[]>([]);
  const [roleData, setRoleData] = useState<RoleOption[]>([]);
  const [userData, setUserData] = useState<{ label: string; value: string }[]>(
    []
  );
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 100;
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [childUserId, setChildUserId] = useState<string | null>(null);
  const [cpUserId, setCpUserId] = useState("");
  const [statusUserId, setStatusUserId] = useState("");
  const [suUserId, setSuUserId] = useState("");

  const [formData, setFormData] = useState<FormData>({});
  const [formStatusData, setFormStatusData] = useState<FormStatusData>({});
  const [formFilterData, setFormFilterData] = useState<FormFilterData>({});

  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: null,
    direction: "ascending",
  });

  const [searchFormData, setSearchFormData] = useState<SearchFormData>({
    search: "",
    roleId:
      authenticated.role === SUPER_ADMIN
        ? MASTER
        : authenticated.role === MASTER
        ? CLIENT
        : "",
    startDate: "",
    endDate: "",
    status: 1,
  });

  const statusData: StatusOption[] = [
    { value: 1, label: "Active" },
    { value: 2, label: "In-Active" },
    { value: 0, label: "All" },
  ];

  const isRoleName = (
    u: Pick<User, "roleName"> | null | undefined,
    target: string
  ) => (u?.roleName ?? "").toLowerCase() === target.toLowerCase();

  const navTo = (path: string, state?: { item?: User } | any) => {
    if (state?.item) {
      const q = new URLSearchParams({ item: btoa(JSON.stringify(state.item)) });
      router.push(`${path}?${q.toString()}`);
    } else {
      router.push(path);
    }
  };

  /** ========= SORT ========= */
  const requestSort = (key: SortConfig["key"]) => {
    let direction: SortConfig["direction"] = "ascending";
    if (sortConfig.key === key && sortConfig.direction === "ascending")
      direction = "descending";
    setSortConfig({ key, direction });
  };

  const sortedTableData = useMemo(() => {
    const items = [...tableData];
    if (!sortConfig.key) return items;
    const key = sortConfig.key;
    items.sort((a, b) => {
      let av: any;
      let bv: any;
      if (key === "script") {
        av = (a as any).masterName ?? "";
        bv = (b as any).masterName ?? "";
      } else {
        av = a[key as keyof User];
        bv = b[key as keyof User];
      }
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "string" && typeof bv === "string") {
        return sortConfig.direction === "ascending"
          ? av.localeCompare(bv)
          : bv.localeCompare(av);
      }
      if (av < bv) return sortConfig.direction === "ascending" ? -1 : 1;
      if (av > bv) return sortConfig.direction === "ascending" ? 1 : -1;
      return 0;
    });
    return items;
  }, [tableData, sortConfig]);

  /** ========= CLIPBOARD ========= */
  const handleCopy = async (value: string, msg = "Copied successfully") => {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    toast.success(msg);
  };

  /** ========= API ========= */
  const fetchUserBalance = async () => {
    try {
      const payload = JSON.stringify({ data: encryptData({ userId: "" }) });
      await apiClient.post(ALL_USER_BALANCE, payload);
    } catch {
      /* silent */
    }
  };

  const fetchRoles = async (uid?: string) => {
    try {
      const data = JSON.stringify({ data: encryptData({ userId: uid || "" }) });
      const res = await apiClient.post(ROLE_LIST, data);
      if (res.data.statusCode !== SUCCESS) return;
      const r = decryptData(res.data.data) as {
        roleId: string;
        name: string;
      }[];
      setRoleData(r.map((x) => ({ value: x.roleId, label: x.name })));
    } catch {
      /* silent */
    }
  };

  const fetchUserDetailsById = async (uid: string) => {
    if (!uid) return;
    try {
      const payload = JSON.stringify({ data: encryptData({ userId: uid }) });
      const res = await apiClient.post(USER_CHECK_U_DATA, payload);
      if (res.data.statusCode === SUCCESS) {
        const user = decryptData(res.data.data) as User;
        setUserDetails(user);
        setSelected(tabs[0]);
      } else {
        toast.error(res.data.message || "User not found");
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed to load user");
    }
  };

  const fetchList = async (overrideUserId?: string) => {
    try {
      setLoading(true);
      const basePayload = {
        role: authenticated.role,
        userId: overrideUserId ?? userDetails?.userId ?? "",
        search: searchFormData.search || "",
        roleId: searchFormData.roleId || "",
        startDate: searchFormData.startDate || "",
        endDate: searchFormData.endDate || "",
        status: searchFormData.status || 1,
        page: currentPage,
        limit: itemsPerPage,
      };
      const data = JSON.stringify({ data: encryptData(basePayload) });
      const apiUrl =
        authenticated.role === MASTER ? USER_LIST : USER_CHILD_LIST;
      const res = await apiClient.post(apiUrl, data);

      if (res.data.statusCode === SUCCESS) {
        const rdata = decryptData(res.data.data) as User[];
        setTableData(rdata);
        setTotalPages(res.data.meta?.totalPage || 1);
        setTotalCount(res.data.meta?.totalCount || 0);

        // If opened fresh without query context, preselect first user for positions
        if (
          !itemFromQuery &&
          !paramUserId &&
          !userDetails &&
          rdata.length > 0
        ) {
          setUserDetails(rdata[0]);
          setSelected(tabs[0]);
        }
      } else {
        toast.error(res.data.message || "Error fetching data");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Error fetching data");
    } finally {
      setLoading(false);
    }
  };

  /** ========= EVENTS ========= */
  const onSearchChange = (
    e:
      | React.ChangeEvent<HTMLInputElement>
      | { target: { name: string; value: any } }
  ) => {
    const { name, value } = e.target;
    if (name === "search") {
      setSearchFormData((s) => ({
        ...s,
        search: value,
        startDate: "",
        endDate: "",
      }));
    } else {
      setSearchFormData((s) => ({ ...s, [name]: value }));
    }
  };

  const onFilter = (e?: React.MouseEvent) => {
    e?.preventDefault();
    setCurrentPage(1);
  };

  const onReset = (e?: React.MouseEvent) => {
    e?.preventDefault();
    setSearchFormData({
      search: "",
      roleId:
        authenticated.role === SUPER_ADMIN
          ? MASTER
          : authenticated.role === MASTER
          ? CLIENT
          : "",
      status: 1,
      startDate: "",
      endDate: "",
    });
    setCurrentPage(1);
  };

  const changePassword = async () => {
    try {
      if (!formData.newPassword || !formData.confirmPassword)
        return toast.error("Please fill in all fields");
      if ((formData.newPassword ?? "").length < 8)
        return toast.error("New Password must be greater than 8 characters.");
      if (formData.newPassword !== formData.confirmPassword)
        return toast.error("New Password and Confirm Password doesn't match");

      const data = JSON.stringify({
        data: encryptData({
          newPassword: formData.newPassword,
          userId: cpUserId,
        }),
      });
      const res = await apiClient.post(ADMIN_CHANGE_PASSWORD, data);
      if (res.data.statusCode === SUCCESS) {
        setCpUserId("");
        setFormData({});
        toast.success(
          res.data.meta?.message || "Password changed successfully"
        );
      } else {
        toast.error(res.data.message || "Error changing password");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Error changing password");
    }
  };

  const changeStatus = async () => {
    try {
      if (!formStatusData.status) return toast.error("Please select a status");
      const data = JSON.stringify({
        data: encryptData({
          status: formStatusData.status,
          logStatus: "status",
          userId: statusUserId,
        }),
      });
      const res = await apiClient.post(ADMIN_CHANGE_STATUS, data);
      if (res.data.statusCode === SUCCESS) {
        setStatusUserId("");
        setFormStatusData({});
        toast.success(res.data.meta?.message || "Status changed successfully");
        // refresh list after status change
        fetchList();
      } else {
        toast.error(res.data.message || "Error changing status");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Error changing status");
    }
  };

  const shiftUser = async () => {
    if (!suUserId) return;
    if (!window.confirm("Are you sure you want to shift the user?")) return;
    try {
      const newParent = formFilterData.user?.value || authenticated.userId;
      const data = JSON.stringify({
        data: encryptData({
          newParent,
          logStatus: "shift_user",
          userId: suUserId,
        }),
      });
      const res = await apiClient.post(SHIFT_USER, data);
      if (res.data.statusCode === SUCCESS) {
        const r = decryptData(res.data.data) as User;
        setTableData((prev) =>
          prev.map((u) =>
            u.userId === r.userId
              ? { ...u, parentId: r.parentId, parentUser: r.parentUser }
              : u
          )
        );
        setSuUserId("");
        setFormFilterData({});
        toast.success(res.data.meta?.message || "User shifted successfully");
      } else {
        toast.error(res.data.message || "Error shifting user");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Error shifting user");
    }
  };

  const exportToExcel = async () => {
    setLoading(true);
    try {
      const basePayload = {
        role: authenticated.role,
        search: searchFormData.search || "",
        roleId: searchFormData.roleId || "",
        startDate: searchFormData.startDate || "",
        endDate: searchFormData.endDate || "",
        status: searchFormData.status || 1,
        page: currentPage,
        limit: itemsPerPage,
      };
      const data = JSON.stringify({ data: encryptData(basePayload) });
      const apiUrl =
        authenticated.role === MASTER ? USER_LIST_EXPORT : USER_CHILD_LIST;
      const res = await apiClient.post(apiUrl, data);

      if (res.data.statusCode !== SUCCESS) {
        toast.error(res.data.message || "Error exporting data");
        setLoading(false);
        return;
      }
      const rdata = decryptData1(res.data.data);
      if (!rdata || !rdata.length) {
        toast.error("No data available to export.");
        setLoading(false);
        return;
      }

      const excelData = rdata.map((it: User) => ({
        ...(authenticated.role === ADMIN || authenticated.role === SUPER_ADMIN
          ? { Parent: it.name }
          : {}),
        Name: it.name,
        Phone: it.phone,
        ...(authenticated.role === MASTER ||
        authenticated.role === ADMIN ||
        authenticated.role === SUPER_ADMIN
          ? { Role: it.roleName }
          : {}),
        ...(authenticated.role === MASTER
          ? { "Parent Name": it.parentUser }
          : {}),
        ...(authenticated.role === ADMIN || authenticated.role === SUPER_ADMIN
          ? { "%": it.profitAndLossSharing }
          : {}),
        ...(authenticated.role === ADMIN || authenticated.role === SUPER_ADMIN
          ? { "Brk %": it.brkSharing }
          : {}),
        Balance: Number(it.balance.toFixed(2)),
        "P/L": isRoleName(it, "Client")
          ? Number((it.profitLoss - it.brokerageTotal).toFixed(2))
          : Number((it.profitLoss + it.brokerageTotal).toFixed(2)),
        "Created At": formatDateTime(it.createdAt),
        "Last Login D/T": formatDateTime(it.lastLoginTime),
        "Device ID": it.deviceId,
        "IP Address": it.ipAddress,
      }));

      const ws = XLSX.utils.json_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "UserList");
      const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([excelBuffer], {
        type: "application/octet-stream",
      });
      const fileName = `${
        authenticated.userName
      }USERS${formatDateForExportExcelName(new Date())}.xlsx`;
      saveAs(blob, fileName);
      setLoading(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Error exporting data");
      setLoading(false);
    }
  };
  const goBack = () => router.push(pathname);

  /** ========= EFFECTS ========= */

  // initialize defaults (roleId), balance, roles, and hydrate by URL userId if present
  useEffect(() => {
    const parsed = ssGetJSON<AuthenticatedUser>("authenticated", {
      role: "",
      userId: "",
      userName: "",
      domain: "",
    });
    setSearchFormData((prev) => ({
      ...prev,
      roleId:
        parsed.role === SUPER_ADMIN
          ? MASTER
          : parsed.role === MASTER
          ? CLIENT
          : "",
    }));

    fetchUserBalance();

    if (!itemFromQuery && paramUserId) {
      // hydrate initial user directly (Positions tab will open)
      fetchUserDetailsById(paramUserId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramUserId, itemFromQuery]);

  // Unified fetch: runs when (userId / filters / page) change with debounce
  useEffect(() => {
    const uid = itemFromQuery?.userId ?? userDetails?.userId ?? "";

    const t = setTimeout(() => {
      fetchRoles(uid);
      fetchList(uid);
    }, 350); // debounce to collapse quick changes

    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    userDetails?.userId,
    currentPage,
    searchFormData.search,
    searchFormData.roleId,
    searchFormData.status,
    searchFormData.startDate,
    searchFormData.endDate,
    itemFromQuery?.userId,
  ]);

  /** ========= UI: TOOLBAR ========= */
  const Toolbar = (
    <Card className="border rounded-2xl bg-[#141a22] border-[#2a3038] sticky top-[72px] z-20">
      <CardContent className="py-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
          <div className="md:col-span-3">
            <Label className="text-[#8ea2b8]">Search</Label>
            <Input
              id="search"
              name="search"
              placeholder="Name / Phone / IP / Device"
              value={searchFormData.search}
              onChange={onSearchChange}
              className="bg-[#181a20] text-white border-gray-700"
            />
          </div>
          <div className="md:col-span-3">
            <Label className="text-[#8ea2b8]">User Role</Label>
            <Select<RoleOption, false>
              options={roleData}
              value={
                roleData.find((o) => o.value === searchFormData.roleId) || null
              }
              onChange={(opt) =>
                onSearchChange({
                  target: { name: "roleId", value: opt?.value ?? "" },
                })
              }
              isLoading={!roleData.length}
              placeholder="Select role"
              isClearable
            />
          </div>
          <div className="md:col-span-2">
            <Label className="text-[#8ea2b8]">Status</Label>
            <Select<StatusOption, false>
              options={statusData}
              value={
                statusData.find((o) => o.value === searchFormData.status) ||
                null
              }
              onChange={(opt) =>
                onSearchChange({
                  target: { name: "status", value: opt?.value ?? 1 },
                })
              }
              placeholder="Select status"
            />
          </div>
          <div className="md:col-span-2">
            <Label className="text-[#8ea2b8]">From Date</Label>
            <Input
              id="startDate"
              name="startDate"
              type="date"
              value={searchFormData.startDate}
              onChange={onSearchChange}
              className="bg-[#181a20] text-white border-gray-700"
            />
          </div>
          <div className="md:col-span-2">
            <Label className="text-[#8ea2b8]">To Date</Label>
            <Input
              id="endDate"
              name="endDate"
              type="date"
              value={searchFormData.endDate}
              onChange={onSearchChange}
              className="bg-[#181a20] text-white border-gray-700"
            />
          </div>
          <div className="md:col-span-12 flex flex-wrap items-center gap-2 justify-between">
            <div className="inline-flex items-center gap-2 rounded-xl border border-[#2a3038] bg-[#11161c] px-3 py-2">
              <span className="text-[#8ea2b8] text-xs">Records</span>
              <span className="text-[#d7e7ff] font-semibold tabular-nums">
                {totalCount}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={onFilter}
                className="bg-[#fcd535] text-black hover:bg-[#fcd535]"
              >
                View
              </Button>
              <Button
                variant="secondary"
                onClick={exportToExcel}
                disabled={loading}
                className="bg-[#2b3139] text-white hover:bg-[#363c46]"
              >
                {loading ? "Exporting…" : "Export"}
              </Button>
              <Button
                variant="destructive"
                onClick={onReset}
                className="bg-rose-600 hover:bg-rose-600"
              >
                Clear
              </Button>
              {(authenticated.role === ADMIN ||
                authenticated.role === SUPER_ADMIN ||
                authenticated.role === MASTER) && (
                <Button
                  onClick={() => navTo(`/users/create`)}
                  className="bg-[#1f2937] hover:bg-[#243041] text-white"
                >
                  + Create New
                </Button>
              )}
              {authenticated.role === MASTER && (
                <Button
                  onClick={async () => {
                    const url =
                      "https://" +
                      authenticated.domain +
                      "/r/" +
                      btoa(authenticated.userName) +
                      "/register/" +
                      btoa(authenticated.userName);
                    await handleCopy(url, "URL Copied!");
                  }}
                  className="bg-[#1f2937] hover:bg-[#243041] text-white"
                >
                  Copy Create User URL
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  /** ========= RENDER ========= */
  return (
    <div className="h-full overflow-y-auto ">
      {/* Tabs + Back in one line */}
      <div className="sticky top-0 z-30 mb-4">
        <div className="flex w-full items-center gap-2 rounded-xl  p-1">
          {/* Back button */}
          <button
            onClick={goBack}
            className="shrink-0 inline-flex items-center gap-2 rounded-lg bg-transparent px-3 py-2 text-sm text-[#fff] hover:text-red-500 focus:outline-none focus:ring-2 focus:ring-[#fcd535]/40"
            aria-label="Go back"
          >
            ← Back
          </button>

          {/* Tabs (fills remaining space) */}
          <Tabs
            value={String(selected.id)}
            onValueChange={(val) =>
              setSelected(tabs.find((t) => String(t.id) === val) || tabs[0])
            }
            className="flex-1"
          >
            <TabsList className="w-full overflow-x-auto bg-transparent p-0">
              <div
                className="grid w-full gap-1"
                style={{
                  gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))`,
                }}
              >
                {tabs.map((t) => (
                  <TabsTrigger
                    key={t.id}
                    value={String(t.id)}
                    className="rounded-lg data-[state=active]:bg-transparent data-[state=active]:text-[#fcd535] data-[state=active]:shadow-sm
                         text-[#9fb0c6] hover:text-white transition-colors"
                  >
                    {t.title}
                  </TabsTrigger>
                ))}
              </div>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Panels */}
      <div className="mt-2 animate-in fade-in duration-200">
        {selected.title === "Position" && userDetails?.userId && (
          <Positions
            userId={userDetails.userId}
            userName={userDetails.userName}
          />
        )}

        {selected.title === "Trade" && userDetails?.userId && (
          <TradeList
            userId={userDetails.userId}
            userName={userDetails.userName}
          />
        )}

        {selected.title === "Pending order" && userDetails?.userId && (
          <Orders
          userId={userDetails.userId}
          userName={userDetails.userName}
          />
        )}

        {selected.title === "D/W" && userDetails?.userId && (
          <Card className="border rounded-2xl bg-[#141a22] border-[#2a3038]">
            <CardHeader>
              <CardTitle className="text-[#fcd535]">
                Deposit / Withdrawal
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChildDepositWithdrawal
                open={false}
                onOpenChange={function (o: boolean) {}} // userName={userDetails.userName}
                // roleId={userDetails.role}
              />
            </CardContent>
          </Card>
        )}

        {selected.title === "Rejection log" && userDetails?.userId && (
          <RejectionTradeList
          userId={userDetails.userId}
          userName={userDetails.userName}
          />
        )}

        {selected.title === "User List" && (
          <ChildUserList
            authenticated={authenticated}
            apiClient={apiClient}
            onUserSelect={(user: any) => {
              setUserDetails(user);
              setSelected(tabs[0]); // Switch to Positions tab
            }}
            initialUser={userDetails} // 👈 this is the parent we want children of
            onNavigate={(path: any, state: any) => {
              navTo(path, state);
            }}
          />
        )}
        {false && (
          <>
            {Toolbar}
            <Card className="border rounded-2xl bg-[#141a22] border-[#2a3038] mt-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-[#fcd535]">
                  Users
                </CardTitle>
              </CardHeader>
              <CardContent className="overflow-hidden p-0">
                <div className="max-h-[65vh] overflow-auto">
                  <Table className="[&_th]:sticky [&_th]:top-0 [&_th]:z-10">
                    <TableHeader>
                      <TableRow className="bg-[#151a20] border-b border-[#2a3038]">
                        <TableHead className="w-[60px] text-[#8ea2b8]">
                          Action
                        </TableHead>
                        <TableHead
                          className="min-w-[140px] cursor-pointer text-[#fff]"
                          onClick={() => requestSort("phone")}
                        >
                          Mobile
                        </TableHead>
                        <TableHead
                          className="min-w-[160px] cursor-pointer text-[#fff]"
                          onClick={() => requestSort("name")}
                        >
                          User Name
                        </TableHead>
                        {(authenticated.role === MASTER ||
                          authenticated.role === ADMIN ||
                          authenticated.role === SUPER_ADMIN) && (
                          <TableHead
                            className="min-w-[120px] cursor-pointer text-[#8ea2b8]"
                            onClick={() => requestSort("roleName")}
                          >
                            Role
                          </TableHead>
                        )}
                        {authenticated.role === MASTER && (
                          <TableHead
                            className="min-w-[160px] cursor-pointer text-[#8ea2b8]"
                            onClick={() => requestSort("parentUser")}
                          >
                            Parent
                          </TableHead>
                        )}
                        {(authenticated.role === ADMIN ||
                          authenticated.role === SUPER_ADMIN) && (
                          <>
                            <TableHead
                              className="min-w-[80px] cursor-pointer text-[#8ea2b8]"
                              onClick={() =>
                                requestSort("profitAndLossSharing")
                              }
                            >
                              %
                            </TableHead>
                            <TableHead
                              className="min-w-[80px] cursor-pointer text-[#8ea2b8]"
                              onClick={() => requestSort("brkSharing")}
                            >
                              Brk %
                            </TableHead>
                          </>
                        )}
                        <TableHead
                          className="min-w-[150px] cursor-pointer text-[#8ea2b8]"
                          onClick={() => requestSort("createdAt")}
                        >
                          Created
                        </TableHead>
                        <TableHead
                          className="min-w-[170px] cursor-pointer text-[#8ea2b8]"
                          onClick={() => requestSort("lastLoginTime")}
                        >
                          Last Login
                        </TableHead>
                        {(authenticated.role === ADMIN ||
                          authenticated.role === SUPER_ADMIN) && (
                          <>
                            <TableHead
                              className="min-w-[160px] cursor-pointer text-[#8ea2b8]"
                              onClick={() => requestSort("domain")}
                            >
                              Domain
                            </TableHead>
                            <TableHead className="min-w-[70px] text-[#8ea2b8]">
                              D/W
                            </TableHead>
                            <TableHead className="min-w-[90px] text-[#8ea2b8]">
                              Logo
                            </TableHead>
                          </>
                        )}
                        <TableHead
                          className="min-w-[120px] cursor-pointer text-[#8ea2b8]"
                          onClick={() => requestSort("balance")}
                        >
                          Balance
                        </TableHead>
                        <TableHead
                          className="min-w-[100px] cursor-pointer text-[#8ea2b8]"
                          onClick={() => requestSort("profitLoss")}
                        >
                          P/L
                        </TableHead>
                        <TableHead
                          className="min-w-[140px] cursor-pointer text-[#8ea2b8]"
                          onClick={() => requestSort("ipAddress")}
                        >
                          IP Address
                        </TableHead>
                        <TableHead
                          className="min-w-[140px] cursor-pointer text-[#8ea2b8]"
                          onClick={() => requestSort("deviceId")}
                        >
                          Device ID
                        </TableHead>
                        <TableHead
                          className="min-w-[100px] cursor-pointer text-[#8ea2b8]"
                          onClick={() => requestSort("status")}
                        >
                          Status
                        </TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {loading ? (
                        <tr>
                          <td colSpan={15}>
                            <RowSkeleton rows={10} />
                          </td>
                        </tr>
                      ) : (
                        sortedTableData.map((u, idx) => (
                          <TableRow
                            key={u.userId ?? idx}
                            className="border-[#2a3038] even:bg-[#171c22]/40 hover:bg-[#1e2630] transition-colors"
                          >
                            <TableCell className="align-middle">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                  >
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                  align="start"
                                  className="w-48"
                                >
                                  {(u.role === MASTER || u.role === BROKER) && (
                                    <DropdownMenuItem
                                      onClick={() =>
                                        navTo(`/users/${u.userId}/edit`, {
                                          item: u,
                                        })
                                      }
                                    >
                                      <Settings className="h-4 w-4 mr-2" /> Edit
                                    </DropdownMenuItem>
                                  )}
                                  {u.role === CLIENT && (
                                    <DropdownMenuItem
                                      onClick={() => setUserDetails(u)}
                                    >
                                      <Settings className="h-4 w-4 mr-2" />{" "}
                                      Update Brokerage/Leverage
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem
                                    onClick={() => setCpUserId(u.userId)}
                                  >
                                    Change Password
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setFormStatusData({ status: u.status });
                                      setStatusUserId(u.userId);
                                    }}
                                  >
                                    Change Status
                                  </DropdownMenuItem>
                                  {u.role !== ADMIN && u.role !== BROKER && (
                                    <DropdownMenuItem
                                      onClick={() =>
                                        navTo(
                                          `/users/${u.userId}/symbol-quantity-settings`
                                        )
                                      }
                                    >
                                      SQS
                                    </DropdownMenuItem>
                                  )}
                                  {u.role === CLIENT && (
                                    <DropdownMenuItem
                                      onClick={() => setSuUserId(u.userId)}
                                    >
                                      Shift Client
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>

                            {/* PHONE → open child (Positions) instantly */}
                            <TableCell className="text-left">
                              <button
                                className="text-[#fcd535] underline underline-offset-2 focus:outline-none focus:ring-2 focus:ring-[#fcd535]/40 rounded"
                                onClick={() => {
                                  setSelected(tabs[0]);
                                  setUserDetails(u);
                                }}
                                title="Open Positions"
                                aria-label={`Open positions for ${
                                  u.name || u.userName
                                }`}
                              >
                                {u.phone}
                              </button>
                            </TableCell>

                            <TableCell className="text-left">
                              {u.name}
                            </TableCell>

                            {(authenticated.role === MASTER ||
                              authenticated.role === ADMIN ||
                              authenticated.role === SUPER_ADMIN) && (
                              <TableCell className="text-left">
                                <RoleBadge role={u.roleName} />
                              </TableCell>
                            )}

                            {authenticated.role === MASTER && (
                              <TableCell className="text-left">
                                {u.parentUser}
                              </TableCell>
                            )}

                            {(authenticated.role === ADMIN ||
                              authenticated.role === SUPER_ADMIN) && (
                              <>
                                <TableCell className="text-left">
                                  {u.profitAndLossSharing}
                                </TableCell>
                                <TableCell className="text-left">
                                  {u.brkSharing}
                                </TableCell>
                              </>
                            )}

                            <TableCell className="text-left">
                              <span className="tabular-nums">
                                {formatDateTime(u.createdAt)}
                              </span>
                            </TableCell>
                            <TableCell className="text-left">
                              <span className="tabular-nums">
                                {formatDateTime(u.lastLoginTime)}
                              </span>
                            </TableCell>

                            {(authenticated.role === ADMIN ||
                              authenticated.role === SUPER_ADMIN) && (
                              <>
                                <TableCell className="text-left">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="truncate">{u.domain}</span>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        handleCopy(
                                          u.domain || "",
                                          "Copied Successfully!"
                                        )
                                      }
                                    >
                                      Copy
                                    </Button>
                                  </div>
                                </TableCell>
                                <TableCell className="text-left">
                                  {u.role === MASTER
                                    ? u.depositWithdrawAtsSystem
                                      ? "YES"
                                      : "NO"
                                    : null}
                                </TableCell>
                                <TableCell className="text-center">
                                  {u.role === MASTER && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() =>
                                        navTo(`/users/${u.userId}/change-logo`)
                                      }
                                    >
                                      Change Logo
                                    </Button>
                                  )}
                                </TableCell>
                              </>
                            )}

                            <TableCell className="text-left tabular-nums">
                              {u.balance?.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-left tabular-nums">
                              <PL value={u.profitLoss} />
                            </TableCell>

                            <TableCell className="text-left">
                              <div className="flex items-center gap-2">
                                <span className="truncate">{u.ipAddress}</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    handleCopy(
                                      u.ipAddress,
                                      "Copied Successfully!"
                                    )
                                  }
                                >
                                  Copy
                                </Button>
                              </div>
                            </TableCell>

                            <TableCell className="text-left">
                              <div className="flex items-center gap-2">
                                <span className="truncate">{u.deviceId}</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    handleCopy(
                                      u.deviceId,
                                      "Copied Successfully!"
                                    )
                                  }
                                >
                                  Copy
                                </Button>
                              </div>
                            </TableCell>

                            <TableCell className="text-left">
                              <StatusBadge status={u.status} />
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>

                    <TableFooter className="bg-transparent">
                      <TableRow className="border-[#2a3038]">
                        <TableCell colSpan={15}>
                          <div className="flex items-center justify-end gap-2 py-2">
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={currentPage === 1}
                              onClick={() =>
                                setCurrentPage((p) => Math.max(1, p - 1))
                              }
                            >
                              Previous
                            </Button>
                            {Array.from(
                              { length: totalPages },
                              (_, i) => i + 1
                            ).map((p) => (
                              <Button
                                key={p}
                                variant={
                                  p === currentPage ? "default" : "outline"
                                }
                                size="sm"
                                onClick={() => setCurrentPage(p)}
                              >
                                {p}
                              </Button>
                            ))}
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={currentPage === totalPages}
                              onClick={() =>
                                setCurrentPage((p) =>
                                  Math.min(totalPages, p + 1)
                                )
                              }
                            >
                              Next
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    </TableFooter>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Change Password Dialog */}
      <Dialog
        open={!!cpUserId}
        onOpenChange={(open) => {
          if (!open) {
            setCpUserId("");
            setFormData({});
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Password</Label>
              <Input
                type="password"
                value={formData.newPassword || ""}
                onChange={(e) =>
                  setFormData((f) => ({ ...f, newPassword: e.target.value }))
                }
                placeholder="Enter Password"
              />
            </div>
            <div>
              <Label>Confirm Password</Label>
              <Input
                type="password"
                value={formData.confirmPassword || ""}
                onChange={(e) =>
                  setFormData((f) => ({
                    ...f,
                    confirmPassword: e.target.value,
                  }))
                }
                placeholder="Enter Confirm Password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={changePassword}>Save changes</Button>
            <Button
              variant="destructive"
              onClick={() => {
                setCpUserId("");
                setFormData({});
              }}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Status Dialog */}
      <Dialog
        open={!!statusUserId}
        onOpenChange={(open) => {
          if (!open) {
            setStatusUserId("");
            setFormStatusData({});
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Status</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="status"
                  value={1}
                  checked={formStatusData.status === 1}
                  onChange={(e) =>
                    setFormStatusData({ status: Number(e.target.value) })
                  }
                />
                Active
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="status"
                  value={2}
                  checked={formStatusData.status === 2}
                  onChange={(e) =>
                    setFormStatusData({ status: Number(e.target.value) })
                  }
                />
                In-Active
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={changeStatus}>Save changes</Button>
            <Button
              variant="destructive"
              onClick={() => {
                setStatusUserId("");
                setFormStatusData({});
              }}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Shift User Dialog */}
      <Dialog
        open={!!suUserId}
        onOpenChange={(open) => {
          if (!open) {
            setSuUserId("");
            setFormFilterData({});
            setUserData([]);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Shift User</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>New Parent</Label>
              <Select
                value={formFilterData.user || null}
                onChange={(opt) =>
                  setFormFilterData((f) => ({
                    ...f,
                    user: (opt as { label: string; value: string }) ?? null,
                  }))
                }
                options={userData}
                onInputChange={async (txt) => {
                  if (txt && txt.length > 2) {
                    try {
                      const data = JSON.stringify({
                        data: encryptData({
                          filterType: 0,
                          roleId: BROKER,
                          userId: "",
                          status: 0,
                          search: txt,
                          page: 1,
                          limit: 50,
                        }),
                      });
                      const res = await apiClient.post(USER_SEARCH_LIST, data);
                      if (res.data.statusCode === SUCCESS) {
                        const r = decryptData(res.data.data) as User[];
                        setUserData(
                          r.map((x) => ({ label: x.userName, value: x.userId }))
                        );
                      } else setUserData([]);
                    } catch {
                      setUserData([]);
                    }
                  } else setUserData([]);
                  return txt;
                }}
                isSearchable
                placeholder="Type to search..."
                isClearable
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button onClick={shiftUser}>Shift</Button>
            <Button
              variant="destructive"
              onClick={() => {
                setSuUserId("");
                setFormFilterData({});
              }}
            >
              Cancel
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setFormFilterData({});
                setUserData([]);
              }}
            >
              Clear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Users;
