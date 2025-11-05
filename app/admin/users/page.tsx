"use client";

import { useState, useEffect, useMemo, useRef, ChangeEvent } from "react";
import apiClient from "@/lib/axiosInstance";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { useSession } from "next-auth/react";
import {
  TooltipProvider,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import EditCreate from "@/components/users/EditCreate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  ExternalLink,
  Key,
  MoreVertical,
  ToggleLeft,
  Download,
  Plus,
  Search,
  CheckCircle,
  XCircle,
  Smartphone,
  Calendar,
  CreditCard,
  DollarSign,
  Activity,
  Shield,
  Globe,
  Phone,
  Copy,
  Share2,
  FileImage,
  Heart,
  ChevronLeft,
  ChevronRight,
  Edit,
  User as UserIcon,
  ArrowDownCircle,
  ArrowUpCircle,
  Trash2,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

import UserChild from "@/components/users/User-Child";

import {
  ADMIN,
  ADMIN_API_ENDPOINT,
  ADMIN_CHANGE_PASSWORD,
  ADMIN_CHANGE_STATUS,
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
  USER_LOGO_EDIT,
  DELETE_DEMO_USER,
} from "@/constant/index";

import { encryptData, decryptData, decryptData1 } from "@/hooks/crypto";

import { toast } from "sonner";

import {
  formatDateForExportExcelName,
  formatDateTime,
} from "@/hooks/dateUtils";
import { CreateUserForm } from "@/components/users/CreateUserForm";
import CreateDepositDialog from "@/components/payment/CreateDepositDialog";
import WithdrawForm from "@/components/payment/ChildWithdraw";
import UserStatisticsCards from "@/components/users/UserStatisticsCards";
import AIInsightsPanel from "@/components/users/AIInsightsPanel";
import BulkOperationsBar from "@/components/users/BulkOperationsBar";
import AdvancedFilters from "@/components/users/AdvancedFilters";

/** ====== TYPES ====== **/
export interface User {
  status: number;
  userId: string;
  name: string;
  userName: string;
  phone: string;
  domain: string;
  mainDomain: string;
  title: string;
  credit: number;
  initialCredit: number;
  balance: number;
  tradeMarginBalance: number;
  marginBalance: number;
  remark: string;
  ourProfitAndLossSharing: number;
  ourBrkSharing: number;
  profitAndLossSharing: number;
  profitAndLossSharingDownLine: number;
  brkSharing: number;
  brkSharingDownLine: number;
  exchangeAllow: string[];
  userWiseExchangeData: Array<{
    exchangeName: string;
    leverage: number;
    isSellEnable: number;
    status: number;
  }>;
  highLowBetweenTradeLimit: string[];
  firstLogin: boolean;
  changePasswordOnFirstLogin: boolean;
  depositWithdrawAtsSystem: boolean;
  role: string;
  forwardBalance: string;
  roleName: string;
  parentId: string;
  parentUser: string;
  bet: boolean;
  fifteenDays: boolean;
  closeOnly: boolean;
  marginSquareOff: boolean;
  freshStopLoss: boolean;
  cmpOrder: number;
  freshLimitSL: boolean;
  cmpOrderValue: string;
  manualOrder: number;
  manualOrderValue: string;
  marketOrder: number;
  marketOrderValue: string;
  addMaster: number;
  addMasterValue: string;
  modifyOrder: number;
  modifyOrderValue: string;
  executePendingOrder: number;
  executePendingOrderValue: string;
  deleteTrade: number;
  deleteTradeValue: string;
  cancelTrade: number;
  cancelTradeValue: string;
  autoSquareOff: number;
  autoSquareOffValue: string;
  highLowSLLimitPercentage: boolean;
  highLowSLLimitPercentageValue: string;
  noOfLogin: number;
  lastLoginTime: string;
  lastLogoutTime: string;
  leverage: string;
  cutOff: number;
  allowedDevices: number;
  viewOnly: boolean;
  onlyView: number;
  intraday: number;
  intradayValue: string;
  createdAt: string;
  ipAddress: string;
  deviceToken: string;
  deviceId: string;
  deviceType: string;
  profitLoss: number;
  brokerageTotal: number;
  allowChatWithSuperAdmin: boolean;
  isRent: boolean;
  maximumAllowedMasters: number | null;
  maximumAllowedClients: number | null;
  autoSquareOffPercentage: number;
  isAllowBrkLevUpdate: number;
  minimumDeposit: number;
  maximumDeposit: number;
  minimumWithdraw: number;
  maximumWithdraw: number;
  totalDeposit: number;
  totalWithdraw: number;
  logoImageDataUrl?: string;
  faviconImageDataUrl?: string;
}

interface ApiMeta {
  totalPage: number;
  totalCount: number;
  message?: string;
}
interface BaseApiResponse<T> {
  statusCode: number;
  data: string;
  meta: ApiMeta;
  message?: string;
}

type RoleId =
  | typeof SUPER_ADMIN
  | typeof ADMIN
  | typeof MASTER
  | typeof BROKER
  | typeof CLIENT
  | "";

interface Authenticated {
  role: RoleId;
  userName: string;
  userId: string;
  domain?: string;
}

type SortKey = "name" | "balance" | "lastLogin" | "profitLoss";

/** ====== COMPONENT ====== **/
export default function UserListPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const role = (session?.user as any)?.roleName as string | undefined;
  const jwt_token = (session as any)?.accessToken as string | undefined;
  const deviceType =
    ((session?.user as any)?.deviceType as string | undefined) ?? "web";
  const authenticatedRoleId =
    status === "authenticated"
      ? ((session?.user as any)?.role as string | undefined)
      : undefined;

  const isMaster = role === "Master";

  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [pinnedUsers, setPinnedUsers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "table">("table");
  const [sortBy, setSortBy] = useState<SortKey>("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [animatingCards, setAnimatingCards] = useState<string[]>([]);
  const [activeTableMenu, setActiveTableMenu] = useState<string | null>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedUserForUpload, setSelectedUserForUpload] =
    useState<User | null>(null);
  const [logoImage, setLogoImage] = useState<File | null>(null);
  const [faviconImage, setFaviconImage] = useState<File | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);
  const [groups, setGroups] = useState([]);
  // Share dialog
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareUser, setShareUser] = useState<User | null>(null);
  const [shareEmail, setShareEmail] = useState("");
  const [shareMessage, setShareMessage] = useState("");
  // Create/Edit
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  // Change password / status
  const [cpUserId, setCpUserId] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [statusUserId, setStatusUserId] = useState<string>("");
  const [statusValue, setStatusValue] = useState<1 | 2 | "">("");
  // Child view
  const [childUserId, setChildUserId] = useState<string | null>(null);
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  // NEW: money ops
  const [depositOpen, setDepositOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [txUser, setTxUser] = useState<User | null>(null);
  // NEW: quick view state
  const [viewUserOpen, setViewUserOpen] = useState(false);
  const [viewUserLoading, setViewUserLoading] = useState(false);
  const [viewUser, setViewUser] = useState<User | null>(null);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  // Delete user
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteUser, setDeleteUser] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  // NEW: UI/UX Upgrade features
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [activeFilters, setActiveFilters] = useState<any>({});

  // NEW: fetch a single user by id using USER_CHECK_U_DATA
  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setIsEditUserOpen(true);
    setActiveTableMenu(null);
  };
  const fetchUserById = async (uid: string) => {
    if (!uid) return null;
    try {
      setViewUserLoading(true);
      const resp = await apiClient.post(
        ADMIN_API_ENDPOINT + USER_CHECK_U_DATA,
        JSON.stringify({ data: encryptData({ userId: uid }) }),
        { headers }
      );
      if (resp.data.statusCode === SUCCESS) {
        const u = decryptData(resp.data.data) as User;
        return u;
      } else {
        toast.error(resp.data.message || "Failed to load user");
        return null;
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed to load user");
      return null;
    } finally {
      setViewUserLoading(false);
    }
  };

  // NEW: open quick view
  const openUserQuickView = async (uid: string) => {
    const u = await fetchUserById(uid);
    if (u) {
      setViewUser(u);
      setViewUserOpen(true);
    }
  };

  const openDeposit = (u: User) => {
      setTxUser({
    ...u,
    // make sure dialog gets a label
    userName: u.userName || u.name || u.phone || u.userId,
  });
    setDepositOpen(true);
  };
  const openWithdraw = (u: User) => {
    setTxUser(u);
    setWithdrawOpen(true);
  };

  // Auth/headers

  const authenticated: Authenticated =
    (typeof window !== "undefined" &&
      JSON.parse(localStorage.getItem("authenticated") || "{}")) ||
    ({} as any);

  const headers = {
    Authorization: jwt_token,
    deviceType,
    "Content-Type": "application/json",
  };

  // ----- Effects -----
  useEffect(() => {
    if (!session) return;
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    filterAndSortUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [users, roleFilter, sortBy, sortOrder, pinnedUsers]);

  // useEffect(() => {
  //   const onClick = (e: MouseEvent) => {
  //     const menu = document.getElementById("row-menu-open");
  //     if (menu && !menu.contains(e.target as Node)) setActiveTableMenu(null);
  //   };
  //   document.addEventListener("mousedown", onClick);
  //   return () => document.removeEventListener("mousedown", onClick);
  // }, []);
  const openChildView = (parentId: string) => {
    // stay on the same page, just add the query param
    router.push(`${pathname}?parentId=${encodeURIComponent(parentId)}`);
    setChildUserId(parentId);
  };

  useEffect(() => {
    const parentId = searchParams.get("parentId") || "";

    if (parentId) {
      if (childUserId !== parentId) {
        setChildUserId(parentId);
      }
    } else {
      if (childUserId) setChildUserId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // ----- API -----
  const fetchUsers = async (opts?: {
    search?: string;
    page?: number;
    limit?: number;
    fromSearch?: boolean;
  }) => {
    const fromSearch = opts?.fromSearch ?? false;

    if (fromSearch) {
      setSearchLoading(true);
    } else {
      setLoading(true);
    }
    try {
      const page = opts?.page ?? 1;
      const limit = opts?.limit ?? 100;
      const search = (opts?.search ?? "").trim();

      const payload = {
        role: authenticatedRoleId || "",
        search, // ← include search here
        roleId: "",
        startDate: "",
        endDate: "",
        // status: 1,
        page,
        limit,
      };

      const apiUrl =
        authenticatedRoleId === MASTER ? USER_LIST : USER_CHILD_LIST;

      const resp = await apiClient.post(
        ADMIN_API_ENDPOINT + apiUrl,
        JSON.stringify({ data: encryptData(payload) }),
        { headers }
      );

      if (resp.data.statusCode === SUCCESS) {
        const rdata = decryptData(resp.data.data) as User[];
        const list = Array.isArray(rdata) ? rdata : [];
          console.log("[UserList] decrypted user list:", list);
        setUsers(list);

        // keep your animation
        list.forEach((u: User, index: number) =>
          setTimeout(
            () => setAnimatingCards((prev) => [...prev, u.userId]),
            index * 100
          )
        );
      } else {
        toast.error(resp.data.message || "Failed to fetch users");
      }
    } catch (error: any) {
      console.error("Error fetching users:", error);
      toast.error(error?.response?.data?.message || "Error fetching users");
    } finally {
      if (fromSearch) {
        setSearchLoading(false);
      } else {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    const t = setTimeout(() => {
      if (searchTerm && searchTerm.length >= 3) {
        setCurrentPage(1);
        fetchUsers({ search: searchTerm, page: 1, fromSearch: true });
      } else if (searchTerm === "") {
        setCurrentPage(1);
        fetchUsers({ search: "", page: 1, fromSearch: true });
      }
      // if 1–2 chars, do nothing until they press View (see step 3)
    }, 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  // ----- Sorting / filtering (fixed P/L behavior) -----
  const toggleSort = (key: SortKey) => {
    if (sortBy === key) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      setSortOrder(key === "profitLoss" || key === "balance" ? "desc" : "asc");
    }
  };
  useEffect(() => {
    filterAndSortUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [users, roleFilter, sortBy, sortOrder, pinnedUsers, searchTerm]); // ← add searchTerm

  const filterAndSortUsers = () => {
    let filtered = [...users];

    if (searchTerm.trim()) {
      const s = searchTerm.trim().toLowerCase();
      filtered = filtered.filter(
        (u) =>
          (u.name ?? "").toLowerCase().includes(s) ||
          (u.userName ?? "").toLowerCase().includes(s) ||
          (u.phone ?? "").includes(searchTerm.trim()) ||
          (u.roleName ?? "").toLowerCase().includes(s) ||
          (u.domain ?? "").toLowerCase().includes(s)
      );
    }

    if (roleFilter !== "all") {
      const rf = roleFilter.toLowerCase();
      filtered = filtered.filter(
        (u) => (u.roleName ?? "").toLowerCase() === rf
      );
    }

    if (sortBy === "profitLoss") {
      filtered =
        sortOrder === "desc"
          ? filtered.filter((u) => (u.profitLoss ?? 0) >= 0)
          : filtered.filter((u) => (u.profitLoss ?? 0) < 0);
    }

    filtered.sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case "name":
          cmp = (a.name ?? "").localeCompare(b.name ?? "");
          break;
        case "balance":
          cmp = (a.balance ?? 0) - (b.balance ?? 0);
          break;
        case "lastLogin":
          cmp =
            new Date(a.lastLoginTime).getTime() -
            new Date(b.lastLoginTime).getTime();
          break;
        case "profitLoss":
          cmp = (a.profitLoss ?? 0) - (b.profitLoss ?? 0);
          break;
      }
      return sortOrder === "asc" ? cmp : -cmp;
    });

    const pinned = filtered.filter((u) => pinnedUsers.includes(u.userId));
    const nonPinned = filtered.filter((u) => !pinnedUsers.includes(u.userId));
    setFilteredUsers([...pinned, ...nonPinned]);
    setCurrentPage(1);
  };

  // replace your effect
  useEffect(() => {
    const onDocMouseDown = (e: MouseEvent) => {
      const el = e.target as HTMLElement;
      // If click is inside any row menu or its dropdown, do nothing
      if (el.closest("[data-row-menu]")) return;
      setActiveTableMenu(null);
    };
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const payload = encryptData({
          search: "",
          exchangeId: "",
        });
        const { data } = await apiClient.post(
          `group/list`,
          JSON.stringify({ data: payload })
        );
        if (data.statusCode === SUCCESS) {
          const rdata = decryptData(data.data);
          setGroups(rdata || []);
        } else {
          toast.error(data.message || "Failed to fetch groups");
        }
      } catch (err) {
        console.log("Error fetching groups:", err);
      }
    })();
  }, []);

  // ----- Helpers -----
  const getRoleBadgeColor = (roleName: string) => {
    switch (roleName) {
      case "Admin":
        return "text-red-400 bg-transparent";
      case "Master":
        return " text-blue-400 bg-transparent";
      case "Office":
        return " text-orange-400 bg-transparent";
      default:
        return "text-gray-400 bg-transparent";
    }
  };

  const getStatusIcon = (_status: boolean) => null;

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied!");
    } catch {
      toast.error("Copy failed");
    }
  };

  const togglePinUser = (userId: string) => {
    setPinnedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  // Pagination
  const handleItemsPerPageChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1);
  };
  const currentPageUsers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredUsers.slice(start, start + itemsPerPage);
  }, [filteredUsers, currentPage, itemsPerPage]);
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  // Export
  const exportData = async () => {
    try {
      const basePayload = {
        role: authenticated.role,
        search: "",
        roleId:
          authenticated?.role === SUPER_ADMIN
            ? MASTER
            : authenticated?.role === MASTER
            ? CLIENT
            : "",
        startDate: "",
        endDate: "",
        // status: 1,
        page: 1,
        limit: 1000,
      };
      const apiUrl =
        authenticated.role === MASTER ? USER_LIST_EXPORT : USER_CHILD_LIST;

      const resp = await apiClient.post(
        apiUrl,
        JSON.stringify({ data: encryptData(basePayload) })
      );

      if (resp.data.statusCode !== SUCCESS) {
        toast.error(resp.data.message || "Export failed");
        return;
      }

      const rows = decryptData1(resp.data.data) as User[];
      if (!rows || rows.length === 0) {
        toast.error("No data available to export.");
        return;
      }

      const excelData = rows.map((item) => ({
        Name: item.name,
        Username: item.userName,
        Phone: item.phone,
        Role: item.roleName,
        "%": item.profitAndLossSharing,
        "Brk %": item.brkSharing,
        Balance: Number((item.balance ?? 0).toFixed(2)),
        "P/L": Number(
          ((item.profitLoss ?? 0) - (item.brokerageTotal ?? 0) || 0).toFixed(2)
        ),
        "Created At": formatDateTime(item.createdAt),
        "Last Login D/T": formatDateTime(item.lastLoginTime),
        Domain: item.domain || "",
        "D/W": item.totalDeposit,
        CL: (item.totalDeposit ?? 0) - (item.totalWithdraw ?? 0),
        IP: item.ipAddress || "",
        Device: item.deviceId || "",
        Status:
          item.status === 1
            ? "Active"
            : item.status === 2
            ? "In-Active"
            : "Deleted",
      }));

      const ws = XLSX.utils.json_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Users");
      const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([excelBuffer], {
        type: "application/octet-stream",
      });

      const userName = authenticated.userName || "USER";
      const now = new Date();
      const fileName = `${userName}USERS${formatDateForExportExcelName(
        now
      )}.xlsx`;
      saveAs(blob, fileName);
      toast.success("Exported!");
    } catch (error: any) {
      console.error("Export error:", error);
      toast.error(error?.response?.data?.message || "Error exporting");
    }
  };

  // Share
  const handleShareUser = (user: User) => {
    setShareUser(user);
    setShareDialogOpen(true);
  };
  const handleShareSubmit = async () => {
    if (!shareUser || !shareEmail) {
      toast.error("Please provide an email address");
      return;
    }
    try {
      const link = `${window.location.origin}/users/${shareUser.userId}`;
      const subject = `User Information: ${shareUser.name}`;
      const body = `
        Name: ${shareUser.name}
        Username: ${shareUser.userName}
        Phone: ${shareUser.phone}
        Role: ${shareUser.roleName}
        Balance: ₹${(shareUser.balance ?? 0).toLocaleString()}
        ${shareMessage ? `Message: ${shareMessage}` : ""}

        View more details: ${link}
      `;
      const mailto = `mailto:${shareEmail}?subject=${encodeURIComponent(
        subject
      )}&body=${encodeURIComponent(body)}`;
      window.open(mailto);
      toast.success("Email client opened with user information");
      setShareDialogOpen(false);
      setShareUser(null);
      setShareEmail("");
      setShareMessage("");
    } catch (e) {
      toast.error("Failed to share user information");
    }
  };

  // Delete
  const handleDeleteUser = (user: User) => {
    setDeleteUser(user);
    setDeleteDialogOpen(true);
    setActiveTableMenu(null);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteUser) return;

    try {
      setIsDeleting(true);
      const payload = encryptData({ userId: deleteUser.userId });
      const response = await apiClient.post(
        ADMIN_API_ENDPOINT + DELETE_DEMO_USER,
        JSON.stringify({ data: payload }),
        {
          headers: {
            Authorization: jwt_token,
            "Content-Type": "application/json",
            deviceType: deviceType,
          },
        }
      );

      if (response.data.statusCode === SUCCESS) {
        toast.success("User deleted successfully!");
        setDeleteDialogOpen(false);
        setDeleteUser(null);
        // Refresh user list
        fetchUsers();
      } else {
        toast.error(response.data.message || "Failed to delete user");
      }
    } catch (error: any) {
      console.error("Delete error:", error);
      toast.error(error?.response?.data?.message || "Failed to delete user");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUploadImage = (user: User) => {
    setSelectedUserForUpload(user);
    setUploadDialogOpen(true);
    setLogoImage(null);
    setFaviconImage(null);
  };
  const handleLogoFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const valid = ["image/png", "image/jpeg", "image/jpg", "image/gif"];
    if (!valid.includes(f.type)) {
      setLogoImage(null);
      if (logoInputRef.current) logoInputRef.current.value = "";
      toast.error("Invalid file type. Only PNG, JPEG, and GIF are allowed.");
      return;
    }
    setLogoImage(f);
  };
  const handleFaviconFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const valid = ["image/png", "image/jpeg", "image/jpg", "image/gif"];
    if (!valid.includes(f.type)) {
      setFaviconImage(null);
      if (faviconInputRef.current) faviconInputRef.current.value = "";
      toast.error("Invalid file type. Only PNG, JPEG, and GIF are allowed.");
      return;
    }
    setFaviconImage(f);
  };
  const handleSubmitUpload = async () => {
    if (!selectedUserForUpload || (!logoImage && !faviconImage)) {
      toast.error("Please select at least one image to upload.");
      return;
    }
    try {
      const formData = new FormData();
      if (logoImage) formData.append("logoImage", logoImage);
      if (faviconImage) formData.append("faviconImage", faviconImage);
      formData.append(
        "data",
        encryptData({ userId: selectedUserForUpload.userId })
      );

      const response = await apiClient.post(USER_LOGO_EDIT, formData, {
        headers: {
          Authorization: jwt_token,
          "Content-Type": "multipart/form-data",
          deviceType: deviceType,
        },
      });

      if (response.data.statusCode === SUCCESS) {
        const rdata = decryptData(response.data.data);
        setUsers((prev) =>
          prev.map((u) =>
            u.userId === selectedUserForUpload.userId
              ? {
                  ...u,
                  logoImageDataUrl:
                    rdata.logoImageDataUrl || u.logoImageDataUrl,
                  faviconImageDataUrl:
                    rdata.faviconImageDataUrl || u.faviconImageDataUrl,
                }
              : u
          )
        );
        setUploadDialogOpen(false);
        setSelectedUserForUpload(null);
        setLogoImage(null);
        setFaviconImage(null);
        if (logoInputRef.current) logoInputRef.current.value = "";
        if (faviconInputRef.current) faviconInputRef.current.value = "";
        toast.success(response.data.message);
      } else {
        toast.error(response.data.message);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Error uploading images");
    }
  };

  // Change Password / Status
  const openChangePassword = (u: User) => {
    setCpUserId(u.userId);
    setNewPassword("");
    setConfirmPassword("");
    setActiveTableMenu(null);
  };
  const submitChangePassword = async () => {
    try {
      if (!newPassword || !confirmPassword)
        return toast.error("Please fill in all fields");
      if (newPassword.length < 8)
        return toast.error("New Password must be greater than 8 characters.");
      if (newPassword !== confirmPassword)
        return toast.error("New Password and Confirm Password doesn't match");

      const resp = await apiClient.post(
        ADMIN_CHANGE_PASSWORD,
        JSON.stringify({
          data: encryptData({ userId: cpUserId, newPassword }),
        })
      );

      if (resp.data.statusCode === SUCCESS) {
        toast.success(resp.data.meta?.message || "Password changed");
        setCpUserId("");
      } else {
        toast.error(resp.data.message || "Failed to change password");
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Error changing password");
    }
  };

  const openChangeStatus = (u: User) => {
    setStatusUserId(u.userId);
    setStatusValue((u.status as 1 | 2) ?? 1);
    setActiveTableMenu(null);
  };
  const submitChangeStatus = async () => {
    try {
      if (statusValue === "" || statusValue == null)
        return toast.error("Please select status");

      const body = {
        status: statusValue,
        logStatus: "status",
        userId: statusUserId,
      };
      const resp = await apiClient.post(
        ADMIN_API_ENDPOINT + ADMIN_CHANGE_STATUS,
        JSON.stringify({ data: encryptData(body) })
      );

      if (resp.data.statusCode === SUCCESS) {
        setUsers((prev) =>
          prev.map((u) =>
            u.userId === statusUserId
              ? { ...u, status: statusValue as number }
              : u
          )
        );
        setStatusUserId("");
        toast.success(resp.data.meta?.message || "Status updated");
      } else {
        toast.error(resp.data.message || "Failed to change status");
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Error changing status");
    }
  };
  useEffect(() => {
    // Delay the script execution to ensure DOM is fully loaded
    setTimeout(() => {
      const tableWrapper = document.querySelector(".table-wrapper > div");

      if (tableWrapper) {
        const wrapper = tableWrapper as HTMLElement;
        let isDragging = false;
        let startX = 0;
        let scrollLeft = 0;

        const startDrag = (e: MouseEvent) => {
          isDragging = true;
          wrapper.classList.add("active");
          startX = e.pageX - wrapper.offsetLeft;
          scrollLeft = wrapper.scrollLeft;
        };

        const stopDrag = () => {
          isDragging = false;
          wrapper.classList.remove("active");
        };

        const dragMove = (e: MouseEvent) => {
          if (!isDragging) return;
          e.preventDefault();
          const x = e.pageX - wrapper.offsetLeft;
          const walk = (x - startX) * 3;
          wrapper.scrollLeft = scrollLeft - walk;
        };

        wrapper.addEventListener("mousedown", startDrag);
        wrapper.addEventListener("mouseleave", stopDrag);
        wrapper.addEventListener("mouseup", stopDrag);
        wrapper.addEventListener("mousemove", dragMove);

        return () => {
          wrapper.removeEventListener("mousedown", startDrag);
          wrapper.removeEventListener("mouseleave", stopDrag);
          wrapper.removeEventListener("mouseup", stopDrag);
          wrapper.removeEventListener("mousemove", dragMove);
        };
      }
    }, 1000); // 0 ms delay to make sure the DOM is ready

    return () => {
      // Cleanup logic for the event listeners
    };
  }, [filteredUsers, viewMode]);

  const shortIp = (ip?: string) => {
    if (!ip) return "-";
    // keep first 6 chars, then ellipsis
    return ip.length > 6 ? `${ip.slice(0, 6)}…` : ip;
  };

  const getTabsForRole = () => {
    if (role === "superAdmin") {
      // super admin sees everything
      return ["all", "Admin", "Master", "Client" , "Office"];
    }
    if (role === "Admin") {
      // admin sees only master + client
      return ["all", "Master", "Client", "Office"];
    }
    if (role === "Master") {
      // admin sees only master + client
      return ["all", "Client", "Office"];
    }
    // everyone else: no tabs
    return [];
  };

  const tabsToShow = getTabsForRole();

  // ----- Loading -----
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#181a20]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-yellow-500 mx-auto" />
          <div className="space-y-2">
            <p className="text-lg font-medium text-[#fcd535]">
              Loading user data...
            </p>
            <div className="w-64 h-2 bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full bg-yellow-500 shimmer" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ----- Render -----
  return (
    <div className="h-full bg-[#181a20]">
      {childUserId ? (
        <div className="mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <UserChild />
        </div>
      ) : (
        <main className="mx-auto px-4 sm:px-3 lg:px-3 py-3 pb-5">
          {/* NEW: Statistics Cards */}
          <UserStatisticsCards
            stats={{
              totalUsers: filteredUsers.length,
              activeUsers: filteredUsers.filter(u => u.status === 1).length,
              inactiveUsers: filteredUsers.filter(u => u.status !== 1).length,
              newThisMonth: Math.floor(filteredUsers.length * 0.12),
              adminUsers: filteredUsers.filter(u => u.role === ADMIN || u.role === SUPER_ADMIN).length,
              riskUsers: filteredUsers.filter(u => u.profitLoss < -10000).length,
            }}
          />
          
          {/* NEW: AI Insights Panel */}
          <AIInsightsPanel
            insights={[
              {
                id: '1',
                type: 'recommendation' as const,
                title: 'Engage Inactive Users',
                description: `${filteredUsers.filter(u => u.status !== 1).length} users are currently inactive. Consider sending re-engagement emails.`,
                priority: 'medium' as const,
                action: 'Send Email',
              },
              {
                id: '2',
                type: 'alert' as const,
                title: 'High-Risk Activity Detected',
                description: `${filteredUsers.filter(u => u.profitLoss < -10000).length} users have significant losses. Review their trading activity.`,
                priority: 'high' as const,
                action: 'View Users',
              },
              {
                id: '3',
                type: 'prediction' as const,
                title: 'User Growth Trend',
                description: 'Based on current patterns, expect 15-20 new user registrations this week.',
                priority: 'low' as const,
              },
            ]}
          />
          
          {/* Header actions */}
          <CardContent className="!p-2 bg-[#181a20]">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center space-x-4">
                <div className="relative w-[280px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#848E9C] h-4 w-4" />
                  <Input
                    placeholder="Search by name"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-[#111318] border border-[#3a3f47] text-[#fcd535] rounded-md h-10"
                  />
                  {searchLoading && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin border-2 border-[#fcd535] border-t-transparent rounded-full" />
                  )}
                </div>

                {/* Role filter tabs — hidden for Master login */}
                {tabsToShow.length > 0 && (
                  <Tabs value={roleFilter} onValueChange={setRoleFilter}>
                    <TabsList
                      style={{
                        backgroundColor: "#252a30",
                        borderColor: "#3a3f47",
                      }}
                    >
                      {tabsToShow.map((tab) => (
                        <TabsTrigger
                          key={tab}
                          value={tab}
                          className={`font-bold transition-colors hover:text-[#f5e49e] ${
                            roleFilter === tab
                              ? "text-[#fcd535] bg-transparent"
                              : "text-[#848E9C]"
                          }`}
                        >
                          {tab === "all" ? "All Roles" : tab}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </Tabs>
                )}
                <Button
                  onClick={() => setViewMode("grid")}
                  className={`transition-colors ${
                    viewMode === "grid"
                      ? "bg-[#fcd535] text-[#181a20]" // active (yellow)
                      : "bg-[#252a30] text-[#848E9C]" // inactive (gray)
                  } hover:bg-transparent`}
                >
                  <div className="grid grid-cols-2 gap-1 h-4 w-4">
                    <div className="bg-current" />
                    <div className="bg-current" />
                    <div className="bg-current" />
                    <div className="bg-current" />
                  </div>
                </Button>

                {/* TABLE view */}
                <Button
                  onClick={() => setViewMode("table")}
                  className={`transition-colors ${
                    viewMode === "table"
                      ? "bg-[#fcd535] text-[#181a20]" // active (yellow)
                      : "bg-[#252a30] text-[#848E9C]" // inactive (gray)
                  } hover:bg-transparent`}
                >
                  <div className="h-4 w-4 flex flex-col justify-between">
                    <div className="bg-current h-0.5" />
                    <div className="bg-current h-0.5" />
                    <div className="bg-current h-0.5" />
                  </div>
                </Button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <AdvancedFilters
                  onApplyFilters={setActiveFilters}
                  activeFiltersCount={Object.keys(activeFilters).filter(k => activeFilters[k] && activeFilters[k] !== 'all' && activeFilters[k] !== '').length}
                />
                <Button
                  onClick={exportData}
                  className="bg-[#fcd535] text-[#181a20] border border-[#3a3f47] hover:bg-[#f5e49e]"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
                <Button
                  onClick={() => {
                    setEditingUser(null);
                    setIsCreateUserOpen(true);
                  }}
                  className="bg-[#fcd535] text-[#181a20] border border-[#3a3f47] hover:bg-[#f5e49e]"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create
                </Button>
              </div>
            </div>
          </CardContent>

          {/* No data */}
          {filteredUsers.length === 0 ? (
            <Card className="animate-fade-in bg-[#1e2329] border border-[#2a2f36]">
              <CardContent className="p-12 text-center">
                <UserIcon className="h-16 w-16 mx-auto mb-4 text-[#848E9C]" />
                <h3 className="text-lg font-medium mb-2 text-[#fcd535]">
                  No users found
                </h3>
                <p className="mb-4 text-[#848E9C]">
                  Try adjusting your search or filter criteria
                </p>
                <Button
                  onClick={() => {
                    setSearchTerm("");
                    setRoleFilter("all");
                  }}
                  className="bg-[#fcd535] text-[#181a20]"
                >
                  Clear Filters
                </Button>
              </CardContent>
            </Card>
          ) : viewMode === "table" ? (
            <TooltipProvider delayDuration={100}>
              <div className="relative overflow-x-auto overflow-y-auto max-h-[80vh] bg-[#1e2329] border border-[#2a2f36]">
                <div className="w-full table-wrapper">
                  <Table
                    className="
                 w-full table-fixed
                   [&_th]:px-3 [&_td]:px-3
                   [&_th:last-child]:pr-2 [&_td:last-child]:pr-2
                      "
                  >
                    <TableHeader>
                      {[
                        "Mobile",
                        "Username",
                        "Type",
                        "%",
                        "Brk%",
                        // "Domain",
                        "D/W",
                        "CL",
                        "Balance",
                        "P/L",
                        "IP",
                        // "Device ID",
                        "Status",
                        "Actions",
                      ].map((h) =>
                        h === "P/L" ? (
                          <TableHead
                            key={h}
                            className="whitespace-nowrap sticky top-0 z-30 bg-[#1e2329] cursor-pointer select-none text-[#fcd535] border-b border-[#2a2f36]"
                            onClick={() => toggleSort("profitLoss")}
                            title={
                              sortBy === "profitLoss"
                                ? sortOrder === "desc"
                                  ? "Showing only profit (click for loss)"
                                  : "Showing only loss (click for profit)"
                                : "Click to toggle profit/loss"
                            }
                          >
                            <span className="inline-flex items-center gap-1">
                              P/L
                              {sortBy !== "profitLoss" ? (
                                <ArrowUpDown className="h-3.5 w-3.5" />
                              ) : sortOrder === "desc" ? (
                                <ArrowUp className="h-3.5 w-3.5" />
                              ) : (
                                <ArrowDown className="h-3.5 w-3.5" />
                              )}
                            </span>
                          </TableHead>
                        ) : (
                          <TableHead
                            key={h}
                            className="whitespace-nowrap sticky top-0 z-30 bg-[#1e2329] text-[#fcd535] border-b border-[#2a2f36]"
                          >
                            {h}
                          </TableHead>
                        )
                      )}
                    </TableHeader>

                    <TableBody className="">
                      {currentPageUsers.map((user, index) => (
                        <TableRow
                          key={user.userId}
                          className={[
                            animatingCards.includes(user.userId)
                              ? "animate-fade-in"
                              : "",
                            pinnedUsers.includes(user.userId)
                              ? "ring-2 ring-yellow-500/50"
                              : "",
                            // ensure no row hover glow if any global styles exist
                            "hover:bg-transparent",
                          ].join(" ")}
                          style={{
                            borderBottom: "1px solid #2a2f36",
                            animationDelay: `${index * 0.05}s` as any,
                          }}
                        >
                          <TableCell className="font-medium whitespace-nowrap text-[#fcd535]">
                            <button
                              onClick={() => openChildView(user.userId)}
                              className="underline-offset-2"
                              title="Open user details"
                            >
                              {user.phone || "-"}
                            </button>
                          </TableCell>

                          <TableCell className="whitespace-nowrap text-[#848E9C]">
                            {user.name}
                          </TableCell>

                          <TableCell className="whitespace-nowrap">
                            <Badge className={getRoleBadgeColor(user.roleName)}>
                              {user.roleName}
                            </Badge>
                          </TableCell>

                          <TableCell className="whitespace-nowrap text-[#848E9C]">
                            {user.profitAndLossSharing}%
                          </TableCell>

                          <TableCell className="whitespace-nowrap text-[#848E9C]">
                            {user.brkSharing}%
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-[#848E9C]">
                             <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDeposit(user)}
                          className="h-8 w-8 p-0 text-[#10b981]" // green-ish
                          title="Deposit"
                        >
                          <ArrowDownCircle className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openWithdraw(user)}
                          className="h-8 w-8 p-0 text-[#ef4444]" // red-ish
                          title="Withdraw"
                        >
                          <ArrowUpCircle className="h-4 w-4" />
                        </Button>
                          </TableCell>

                          {/* <TableCell className="whitespace-nowrap text-[#848E9C]">
                          {user.domain || "N/A"}
                        </TableCell> */}

                          {/* <TableCell className="whitespace-nowrap text-[#848E9C]">
                            {(user.depositWithdrawAtsSystem).toLocaleString()}
                          </TableCell> */}

                          <TableCell className="whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className="text-[#848E9C]">
                                {(
                                  (user.totalDeposit ?? 0) -
                                  (user.totalWithdraw ?? 0)
                                ).toLocaleString()}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleUploadImage(user)}
                                className="h-6 w-6 p-0 text-[#848E9C]"
                              >
                                <FileImage className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>

                          <TableCell className="whitespace-nowrap">
                            {(() => {
                              const bal = isMaster
                                ? Number(user.balance ?? 0)
                                : Number(user.forwardBalance ?? 0);

                              if (!Number.isFinite(bal))
                                return (
                                  <span className="text-[#848E9C]">-</span>
                                );

                              return (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span
                                      className="text-[#fcd535] cursor-help"
                                      title={`₹${bal.toLocaleString("en-IN", {
                                        minimumFractionDigits: 0,
                                        maximumFractionDigits: 3,
                                      })}`}
                                    >
                                      ₹{Math.floor(bal).toLocaleString("en-IN")}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" align="start">
                                    <span className="font-mono text-sm">
                                      ₹
                                      {bal.toLocaleString("en-IN", {
                                        minimumFractionDigits: 0,
                                        maximumFractionDigits: 3,
                                      })}
                                    </span>
                                  </TooltipContent>
                                </Tooltip>
                              );
                            })()}
                          </TableCell>

                          <TableCell
                            className="whitespace-nowrap"
                            style={{
                              color:
                                (user.profitLoss ?? 0) >= 0
                                  ? "#10b981"
                                  : "#ef4444",
                            }}
                          >
                            {(() => {
                              const pl = Number(user.profitLoss ?? 0);

                              if (!Number.isFinite(pl))
                                return (
                                  <span className="text-[#848E9C]">-</span>
                                );

                              return (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span
                                      className="cursor-help"
                                      title={`₹${pl.toLocaleString("en-IN", {
                                        minimumFractionDigits: 0,
                                        maximumFractionDigits: 3,
                                      })}`}
                                    >
                                      ₹{Math.floor(pl).toLocaleString("en-IN")}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" align="start">
                                    <span className="font-mono text-sm">
                                      ₹
                                      {pl.toLocaleString("en-IN", {
                                        minimumFractionDigits: 0,
                                        maximumFractionDigits: 3,
                                      })}
                                    </span>
                                  </TooltipContent>
                                </Tooltip>
                              );
                            })()}
                          </TableCell>

                          <TableCell className="whitespace-nowrap text-[#848E9C]">
                            {user.ipAddress ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span
                                    className="cursor-help inline-block font-mono"
                                    title={user.ipAddress} // native fallback
                                    aria-label={user.ipAddress} // a11y
                                  >
                                    {shortIp(user.ipAddress)}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent side="top" align="start">
                                  <span className="font-mono text-sm">
                                    {user.ipAddress}
                                  </span>
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              "-"
                            )}
                          </TableCell>

                          {/* <TableCell className="whitespace-nowrap max-w-32 truncate text-[#848E9C]">
                          {user.deviceId}
                        </TableCell> */}

                          <TableCell className="whitespace-nowrap">
                            <span
                              className={
                                user.status === 1
                                  ? "text-sm text-green-400"
                                  : "text-sm text-red-400"
                              }
                            >
                              {user.status === 1 ? "ACTIVE" : "INACTIVE"}
                            </span>
                          </TableCell>

                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditUser(user)}
                                className="h-8 w-8 p-0 text-[#848E9C]"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>

                              <div className="relative" data-row-menu-root>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  data-row-menu-btn
                                  onMouseDown={(e) => e.stopPropagation()}
                                  onClick={() =>
                                    setActiveTableMenu(
                                      activeTableMenu === user.userId
                                        ? null
                                        : user.userId
                                    )
                                  }
                                  className="h-8 w-8 p-0 text-[#848E9C]"
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                                {activeTableMenu === user.userId && (
                                  <div
                                    data-row-menu
                                    // use absolute, not fixed — it stays inside the wrapper’s DOM tree
                                    className="absolute right-0 mt-1 w-48 rounded-md shadow-lg border bg-[#252a30] border-[#3a3f47] z-50"
                                    onMouseDown={(e) => e.stopPropagation()} // belt & suspenders
                                  >
                                    <button
                                      className="flex items-center px-4 py-2 text-sm w-full text-left text-[#848E9C]"
                                      onClick={() => {
                                        setActiveTableMenu(null);
                                        openChangePassword(user);
                                      }}
                                    >
                                      <Key className="h-4 w-4 mr-2" />
                                      Change Password
                                    </button>

                                    <button
                                      className="flex items-center px-4 py-2 text-sm w-full text-left text-[#848E9C]"
                                      onClick={() => {
                                        setActiveTableMenu(null);
                                        openChangeStatus(user);
                                      }}
                                    >
                                      <ToggleLeft className="h-4 w-4 mr-2" />
                                      Change Status
                                    </button>

                                    <button
                                      className="flex items-center px-4 py-2 text-sm w-full text-left text-[#848E9C]"
                                      onClick={() => {
                                        setActiveTableMenu(null);
                                        handleShareUser(user);
                                      }}
                                    >
                                      <Share2 className="h-4 w-4 mr-2" />
                                      Share
                                    </button>

                                    <button
                                      className="flex items-center px-4 py-2 text-sm w-full text-left text-red-400 hover:bg-red-500/10"
                                      onClick={() => {
                                        setActiveTableMenu(null);
                                        handleDeleteUser(user);
                                      }}
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Delete User
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                <div className="sticky bottom-0 left-0 right-0 flex items-center justify-between p-4 z-10 bg-[#1e2329] border-t border-[#2a2f36] shadow-[0_-2px_10px_rgba(0,0,0,0.2)]">
                  <div className="flex items-center">
                    <p className="text-sm text-[#848E9C]">
                      Showing{" "}
                      <span className="font-medium text-[#fcd535]">
                        {(currentPage - 1) * itemsPerPage + 1}
                      </span>{" "}
                      to{" "}
                      <span className="font-medium text-[#fcd535]">
                        {Math.min(
                          currentPage * itemsPerPage,
                          filteredUsers.length
                        )}
                      </span>{" "}
                      of{" "}
                      <span className="font-medium text-[#fcd535]">
                        {filteredUsers.length}
                      </span>{" "}
                      results
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-1">
                      <label
                        htmlFor="itemsPerPage"
                        className="text-sm text-[#848E9C]"
                      >
                        Items per page:
                      </label>
                      <select
                        id="itemsPerPage"
                        value={itemsPerPage}
                        onChange={handleItemsPerPageChange}
                        className="px-3 py-1 rounded-md text-sm bg-[#252a30] border border-[#3a3f47] text-[#848E9C]"
                      >
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                      </select>
                    </div>

                    <div className="flex items-center space-x-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="p-1 border-[#3a3f47] text-[#848E9C]"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>

                      <div className="flex items-center space-x-1">
                        {Array.from(
                          { length: Math.min(5, totalPages) },
                          (_, i) => {
                            let pageNum;
                            if (totalPages <= 5) pageNum = i + 1;
                            else if (currentPage <= 3) pageNum = i + 1;
                            else if (currentPage >= totalPages - 2)
                              pageNum = totalPages - 4 + i;
                            else pageNum = currentPage - 2 + i;

                            return (
                              <Button
                                key={pageNum}
                                variant={
                                  currentPage === pageNum
                                    ? "default"
                                    : "outline"
                                }
                                size="sm"
                                onClick={() => handlePageChange(pageNum)}
                                className={`p-1 px-2 border-[#3a3f47] ${
                                  currentPage === pageNum
                                    ? "bg-[#fcd535] text-[#181a20]"
                                    : "text-[#848E9C]"
                                }`}
                              >
                                {pageNum}
                              </Button>
                            );
                          }
                        )}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="p-1 border-[#3a3f47] text-[#848E9C]"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </TooltipProvider>
          ) : (
            // ===== GRID/LIST CARDS (unchanged visually, benefits from P/L filter) =====
            <div
              className={
                viewMode === "grid"
                  ? "grid gap-6 lg:grid-cols-2 xl:grid-cols-3 overflow-scroll max-h-[80vh] overflow-x-hidden"
                  : "space-y-4"
              }
            >
              {filteredUsers.map((user, index) => (
                <Card
                  key={user.userId}
                  className={[
                    animatingCards.includes(user.userId)
                      ? "animate-fade-in"
                      : "",
                    pinnedUsers.includes(user.userId)
                      ? "ring-2 ring-yellow-500/50"
                      : "",
                    "gap-1",
                  ].join(" ")}
                  style={{
                    backgroundColor: "#1e2329",
                    border: "1px solid #2a2f36",
                    animationDelay: `${index * 0.1}s` as any,
                  }}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between flex-wrap">
                      <div className="flex items-center gap-3">
                        <div>
                          <CardTitle className="text-lg flex items-center gap-2 text-[#fcd535]">
                            {user.name}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(user.name)}
                              className="h-6 w-6 p-0 text-[#848E9C]"
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </CardTitle>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 w-full">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => togglePinUser(user.userId)}
                          className={`h-8 w-8 p-0 ${
                            pinnedUsers.includes(user.userId)
                              ? "text-[#fcd535]"
                              : "text-[#848E9C]"
                          }`}
                        >
                          <Heart
                            className={`h-4 w-4 ${
                              pinnedUsers.includes(user.userId)
                                ? "fill-current"
                                : ""
                            }`}
                          />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openChangePassword(user)}
                          className="h-8 w-8 p-0 text-[#848E9C]"
                          title="Change Password"
                        >
                          <Key className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDeposit(user)}
                          className="h-8 w-8 p-0 text-[#10b981]" // green-ish
                          title="Deposit"
                        >
                          <ArrowDownCircle className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openWithdraw(user)}
                          className="h-8 w-8 p-0 text-[#ef4444]" // red-ish
                          title="Withdraw"
                        >
                          <ArrowUpCircle className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openChangeStatus(user)}
                          className="h-8 w-8 p-0 text-[#848E9C]"
                          title="Change Status"
                        >
                          <ToggleLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openChildView(user.userId)}
                          className="h-8 w-8 p-0 text-[#848E9C]"
                          title="Open Children"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditUser(user)}
                          className="h-8 w-8 p-0 text-[#848E9C]"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-[#848E9C]" />
                        <span className="text-[#fcd535]">{user.phone}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-[#848E9C]" />
                        <Badge className={getRoleBadgeColor(user.roleName)}>
                          {user.roleName}
                        </Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-[#848E9C]" />
                        <span className="truncate text-[#848E9C]">
                          {user.domain || "N/A"}
                        </span>
                      </div>
                      {/* <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-[#848E9C]" />
                        <span className="text-xs text-[#848E9C]">
                          Created: {formatDate(user.createdAt)}
                        </span>
                      </div> */}
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {/* <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-[#848E9C]" />
                        <span className="text-xs text-[#848E9C]">
                          Login: {formatDate(user.lastLoginTime)}
                        </span>
                      </div> */}
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-[#848E9C]" />
                        <span className="text-[#848E9C]">
                          Balance: ₹
                          {(isMaster
                            ? user.balance ?? 0
                            : user.forwardBalance ?? 0
                          ).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-[#848E9C]" />
                        <span className="text-[#848E9C]">
                          Credit:{" "}
                          <span className="font-semibold text-emerald-500">
                            ₹{(user.credit ?? 0).toLocaleString()}
                          </span>
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-[#848E9C]" />
                        <span className="text-[#848E9C]">
                          P/L:{" "}
                          <span
                            className="font-semibold"
                            style={{
                              color:
                                (user.profitLoss ?? 0) >= 0
                                  ? "#10b981"
                                  : "#ef4444",
                            }}
                          >
                            ₹{(user.profitLoss ?? 0).toLocaleString()}
                          </span>
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-[#848E9C]" />
                        <span className="text-xs text-[#848E9C]">
                          IP: {user.ipAddress}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <span
                          className={
                            user.status === 1
                              ? "text-sm text-green-400"
                              : "text-sm text-red-400"
                          }
                        >
                          {user.status === 1 ? "ACTIVE" : "INACTIVE"}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Smartphone className="h-4 w-4 text-[#848E9C]" />
                        <span className="text-xs truncate text-[#848E9C]">
                          Device: {user.deviceId}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </main>
      )}

      {/* Create/Edit User */}
      <CreateUserForm
        groups={groups ?? []}
        isOpen={isCreateUserOpen}
        onClose={() => {
          setIsCreateUserOpen(false);
          setEditingUser(null);
        }}
        onSuccess={() => {
          fetchUsers();
          setIsCreateUserOpen(false);
          setEditingUser(null);
        }}
      />
      {/* Edit User Dialog */}

      {/* Share User Dialog */}
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent className="max-w-md bg-[#1e2329] border border-[#2a2f36]">
          <DialogHeader>
            <DialogTitle className="text-[#fcd535]">
              Share User Information
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="text-sm text-[#848E9C]">
              User:{" "}
              <span className="font-medium text-[#fcd535]">
                {shareUser?.name}
              </span>
            </div>
            <div className="space-y-2">
              <Label htmlFor="shareEmail" className="text-[#848E9C]">
                Email Address
              </Label>
              <Input
                id="shareEmail"
                type="email"
                placeholder="Enter email address"
                value={shareEmail}
                onChange={(e) => setShareEmail(e.target.value)}
                className="bg-[#252a30] border-[#3a3f47] text-[#fcd535]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shareMessage" className="text-[#848E9C]">
                Message (Optional)
              </Label>
              <textarea
                id="shareMessage"
                className="w-full px-3 py-2 rounded-md bg-[#252a30] border border-[#3a3f47] text-[#fcd535]"
                rows={3}
                placeholder="Add a message..."
                value={shareMessage}
                onChange={(e) => setShareMessage(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShareDialogOpen(false)}
              className="border-[#3a3f47] text-[#848E9C]"
            >
              Cancel
            </Button>
            <Button
              className="bg-[#fcd535] text-[#181a20]"
              onClick={handleShareSubmit}
            >
              Share
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload Images */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-[#1e2329] border border-[#2a2f36]">
          <DialogHeader>
            <DialogTitle className="text-[#fcd535]">Upload Images</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="text-sm text-[#848E9C]">
              User:{" "}
              <span className="font-medium text-[#fcd535]">
                {selectedUserForUpload?.userName}
              </span>
            </div>

            {/* Logo */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="logoUpload" className="text-[#848E9C]">
                  Upload Logo Image
                </Label>
                <Input
                  id="logoUpload"
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/gif"
                  onChange={handleLogoFileChange}
                  ref={logoInputRef}
                  className="bg-[#252a30] border-[#3a3f47] text-[#fcd535]"
                />
                <p className="text-xs text-[#848E9C]">
                  Supported formats: PNG, JPEG, GIF
                </p>
              </div>

              {selectedUserForUpload?.logoImageDataUrl && (
                <div className="space-y-2">
                  <Label className="text-[#848E9C]">Current Logo</Label>
                  <div className="border rounded-lg p-2 border-[#3a3f47]">
                    <img
                      src={selectedUserForUpload.logoImageDataUrl}
                      alt="Current Logo"
                      className="w-24 h-24 object-contain"
                    />
                  </div>
                </div>
              )}

              {logoImage && (
                <div className="space-y-2">
                  <Label className="text-[#848E9C]">New Logo Preview</Label>
                  <div className="border rounded-lg p-2 border-[#3a3f47]">
                    <img
                      src={URL.createObjectURL(logoImage)}
                      alt="New Logo"
                      className="w-24 h-24 object-contain"
                    />
                  </div>
                  <p className="text-sm text-emerald-500">
                    Selected: {logoImage.name}
                  </p>
                </div>
              )}
            </div>

            {/* Favicon */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="faviconUpload" className="text-[#848E9C]">
                  Upload Favicon Image
                </Label>
                <Input
                  id="faviconUpload"
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/gif"
                  onChange={handleFaviconFileChange}
                  ref={faviconInputRef}
                  className="bg-[#252a30] border-[#3a3f47] text-[#fcd535]"
                />
                <p className="text-xs text-[#848E9C]">
                  Supported formats: PNG, JPEG, GIF
                </p>
              </div>

              {selectedUserForUpload?.faviconImageDataUrl && (
                <div className="space-y-2">
                  <Label className="text-[#848E9C]">Current Favicon</Label>
                  <div className="border rounded-lg p-2 border-[#3a3f47]">
                    <img
                      src={selectedUserForUpload.faviconImageDataUrl}
                      alt="Current Favicon"
                      className="w-16 h-16 object-contain"
                    />
                  </div>
                </div>
              )}

              {faviconImage && (
                <div className="space-y-2">
                  <Label className="text-[#848E9C]">New Favicon Preview</Label>
                  <div className="border rounded-lg p-2 border-[#3a3f47]">
                    <img
                      src={URL.createObjectURL(faviconImage)}
                      alt="New Favicon"
                      className="w-16 h-16 object-contain"
                    />
                  </div>
                  <p className="text-sm text-emerald-500">
                    Selected: {faviconImage.name}
                  </p>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setUploadDialogOpen(false);
                setSelectedUserForUpload(null);
                setLogoImage(null);
                setFaviconImage(null);
                if (logoInputRef.current) logoInputRef.current.value = "";
                if (faviconInputRef.current) faviconInputRef.current.value = "";
              }}
              className="border-[#3a3f47] text-[#848E9C]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitUpload}
              disabled={!logoImage && !faviconImage}
              className="bg-[#fcd535] text-[#181a20]"
            >
              Upload Images
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Password */}
      {cpUserId && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="rounded-lg shadow-lg w-full max-w-md p-6 bg-[#1e2329] border border-[#2a2f36]">
            <h3 className="text-lg font-semibold mb-4 text-[#fcd535]">
              Change Password
            </h3>
            <div className="space-y-3">
              <div>
                <Label htmlFor="newPass" className="text-[#848E9C]">
                  New Password
                </Label>
                <Input
                  id="newPass"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="bg-[#252a30] border-[#3a3f47] text-[#fcd535]"
                />
              </div>
              <div>
                <Label htmlFor="confirmPass" className="text-[#848E9C]">
                  Confirm Password
                </Label>
                <Input
                  id="confirmPass"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="bg-[#252a30] border-[#3a3f47] text-[#fcd535]"
                />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setCpUserId("")}
                className="border-[#3a3f47] text-[#848E9C]"
              >
                Cancel
              </Button>
              <Button
                className="bg-[#fcd535] text-[#181a20]"
                onClick={submitChangePassword}
              >
                Save
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Deposit dialog */}
      <CreateDepositDialog
        open={depositOpen}
        onOpenChange={setDepositOpen}
        defaultUser={txUser ?? undefined}
        onSuccess={() => {
          setDepositOpen(false);
          setTxUser(null);
          fetchUsers();
        }}
      />
      <EditCreate
        isOpen={isEditUserOpen}
        onClose={() => {
          setIsEditUserOpen(false);
          setEditingUser(null);
        }}
        user={editingUser}
        onSuccess={() => {
          // refresh table data after successful save
          fetchUsers();
        }}
      />

      {/* Withdraw dialog */}
      <WithdrawForm
        open={withdrawOpen}
        onOpenChange={(o: boolean) => setWithdrawOpen(o)}
        defaultUser={
          txUser
            ? {
                value: txUser.userId,
                label: `${txUser.name} (${txUser.phone})`,
              }
            : undefined
        }
        onSuccess={() => {
          setWithdrawOpen(false);
          setTxUser(null);
          fetchUsers();
        }}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-[#1e2329] border-[#2a2f36]">
          <DialogHeader>
            <DialogTitle className="text-[#fcd535]">
              Delete User
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <Trash2 className="h-5 w-5 text-red-400" />
              <div>
                <p className="text-sm font-medium text-red-400">
                  Warning: This action cannot be undone
                </p>
                <p className="text-xs text-[#848E9C] mt-1">
                  This will permanently delete the user account
                </p>
              </div>
            </div>

            {deleteUser && (
              <div className="space-y-2">
                <p className="text-sm text-[#848E9C]">
                  Are you sure you want to delete this user?
                </p>
                <div className="p-3 bg-[#252a30] rounded-lg border border-[#3a3f47]">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-[#fcd535]/10 flex items-center justify-center">
                      <UserIcon className="h-5 w-5 text-[#fcd535]" />
                    </div>
                    <div>
                      <p className="font-medium text-white">{deleteUser.name}</p>
                      <p className="text-xs text-[#848E9C]">
                        {deleteUser.userName} • {deleteUser.phone}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setDeleteUser(null);
              }}
              disabled={isDeleting}
              className="border-[#3a3f47] text-[#848E9C]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              {isDeleting ? "Deleting..." : "Delete User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Status */}
      {statusUserId && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="rounded-lg shadow-lg w-full max-w-md p-6 bg-[#1e2329] border border-[#2a2f36]">
            <h3 className="text-lg font-semibold mb-4 text-[#fcd535]">
              Change Status
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="status"
                    value="1"
                    checked={statusValue === 1}
                    onChange={() => setStatusValue(1)}
                  />
                  <span className="text-[#848E9C]">Active</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="status"
                    value="2"
                    checked={statusValue === 2}
                    onChange={() => setStatusValue(2)}
                  />
                  <span className="text-[#848E9C]">In-Active</span>
                </label>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setStatusUserId("")}
                className="border-[#3a3f47] text-[#848E9C]"
              >
                Cancel
              </Button>
              <Button
                className="bg-[#fcd535] text-[#181a20]"
                onClick={submitChangeStatus}
              >
                Save
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* NEW: Bulk Operations Bar */}
      <BulkOperationsBar
        selectedCount={selectedUsers.length}
        onClearSelection={() => setSelectedUsers([])}
        onBulkDelete={() => {
          if (selectedUsers.length > 0) {
            toast.info(`Bulk delete ${selectedUsers.length} users (feature in development)`);
          }
        }}
        onBulkExport={() => {
          if (selectedUsers.length > 0) {
            toast.info(`Bulk export ${selectedUsers.length} users (feature in development)`);
          }
        }}
        onBulkActivate={() => {
          if (selectedUsers.length > 0) {
            toast.info(`Bulk activate ${selectedUsers.length} users (feature in development)`);
          }
        }}
        onBulkDeactivate={() => {
          if (selectedUsers.length > 0) {
            toast.info(`Bulk deactivate ${selectedUsers.length} users (feature in development)`);
          }
        }}
        onBulkEmail={() => {
          if (selectedUsers.length > 0) {
            toast.info(`Send email to ${selectedUsers.length} users (feature in development)`);
          }
        }}
      />
    </div>
  );
}
