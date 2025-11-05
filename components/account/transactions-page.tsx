"use client";

import { useState, useEffect, ChangeEvent, useRef } from "react";
import apiClient from "@/lib/axiosInstance";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

import {
  User as UserIcon,
  Phone,
  Globe,
  CreditCard,
  TrendingUp,
  Calendar,
  Shield,
  DollarSign,
  Activity,
  Search,
  Heart,
  Share2,
  Edit,
  Trash2,
  Copy,
  ExternalLink,
  MoreVertical,
  RefreshCw,
  Download,
  Users as UsersIcon,
  FileImage,
  CheckCircle,
  XCircle,
  Monitor,
  Smartphone,
  Plus,
  X,
  Settings,
  Lock,
  Unlock,
  UserCheck,
  Mail,
  MessageSquare,
  Key,
  ToggleLeft,
} from "lucide-react";

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
} from "@/constant";

import { encryptData, decryptData, decryptData1 } from "@/hooks/crypto";
import { toastError, toastSuccess } from "@/hooks/toastMsg";
import {
  formatDateForExportExcelName,
  formatDateTime,
} from "@/hooks/dateUtils";
import { CreateUserForm } from "@/components/users/CreateUserForm";

/** ====== TYPES (using your shape) ====== **/
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

type SortKey = "name" | "balance" | "lastLogin";

/** ====== COMPONENT ====== **/
export function TransactionsPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [pinnedUsers, setPinnedUsers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<"grid" | "list" | "table">("grid");
  const [sortBy, setSortBy] = useState<SortKey>("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [animatingCards, setAnimatingCards] = useState<string[]>([]);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [createUserDialogOpen, setCreateUserDialogOpen] = useState(false);
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<User | null>(
    null
  );
  const [selectedUserForUpload, setSelectedUserForUpload] =
    useState<User | null>(null);
  const [editedUser, setEditedUser] = useState<Partial<User>>({});
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [newUser, setNewUser] = useState<Partial<User>>({});
  const [activeTableMenu, setActiveTableMenu] = useState<string | null>(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareUser, setShareUser] = useState<User | null>(null);
  const [shareEmail, setShareEmail] = useState("");
  const [shareMessage, setShareMessage] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);

  // Change Password / Change Status dialogs (use native dialogs or add shadcn Dialogs if you wish)
  const [cpUserId, setCpUserId] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [statusUserId, setStatusUserId] = useState<string>("");
  const [statusValue, setStatusValue] = useState<1 | 2 | "">("");

  // auth + headers
  const deviceType = (typeof window !== "undefined" &&
    (localStorage.getItem("deviceType") || "desktop")) as string;
  const jwt_token =
    (typeof window !== "undefined" && localStorage.getItem("token")) || "";
  const authenticated: Authenticated =
    (typeof window !== "undefined" &&
      JSON.parse(localStorage.getItem("authenticated") || "{}")) ||
    ({} as any);

  const headers = {
    Authorization: jwt_token,
    deviceType,
    "Content-Type": "application/json",
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    filterAndSortUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [users, searchTerm, roleFilter, sortBy, sortOrder]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveTableMenu(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  /** ====== API: Fetch Users (encrypted) ====== **/
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const payload = {
        role: authenticated?.role || "",
        search: "", // server-side search disabled; using client-side search below
        roleId:
          authenticated?.role === SUPER_ADMIN
            ? MASTER
            : authenticated?.role === MASTER
            ? CLIENT
            : "",
        startDate: "",
        endDate: "",
        status: 1,
        page: 1,
        limit: 500, // pull a big page; adjust if needed
      };
      const apiUrl =
        authenticated?.role === MASTER ? USER_LIST : USER_CHILD_LIST;

      const resp = await apiClient.post(
        apiUrl,
        JSON.stringify({ data: encryptData(payload) }),
        { headers }
      );

      if (resp.data.statusCode === SUCCESS) {
        const rdata = decryptData(resp.data.data) as User[];
        setUsers(Array.isArray(rdata) ? rdata : []);
        // Animate cards on load
        (Array.isArray(rdata) ? rdata : []).forEach(
          (u: User, index: number) => {
            setTimeout(
              () => setAnimatingCards((prev) => [...prev, u.userId]),
              index * 100
            );
          }
        );
      } else {
        toastError(resp.data.message || "Failed to fetch users");
      }
    } catch (error: any) {
      console.error("Error fetching users:", error);
      toastError(error?.response?.data?.message || "Error fetching users");
    } finally {
      setLoading(false);
    }
  };

  /** ====== Client-side filter/sort (kept from your UI) ====== **/
  const filterAndSortUsers = () => {
    let filtered = users.filter((user) => user.status === 1);

    // Search
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (user) =>
          user.name.toLowerCase().includes(s) ||
          user.userName.toLowerCase().includes(s) ||
          user.phone.includes(searchTerm) ||
          user.roleName.toLowerCase().includes(s)
      );
    }

    // Role tabs
    if (roleFilter !== "all") {
      filtered = filtered.filter((user) => user.roleName === roleFilter);
    }

    // Sort
    filtered.sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case "name":
          cmp = a.name.localeCompare(b.name);
          break;
        case "balance":
          cmp = a.balance - b.balance;
          break;
        case "lastLogin":
          cmp =
            new Date(a.lastLoginTime).getTime() -
            new Date(b.lastLoginTime).getTime();
          break;
      }
      return sortOrder === "asc" ? cmp : -cmp;
    });

    // Separate pinned users
    const pinned = filtered.filter((user) => pinnedUsers.includes(user.userId));
    const nonPinned = filtered.filter(
      (user) => !pinnedUsers.includes(user.userId)
    );

    // Combine pinned users at the top with filtered users
    setFilteredUsers([...pinned, ...nonPinned]);
  };

  /** ====== Helpers ====== **/
  const toggleUserExpansion = (userId: string) => {
    setExpandedUser(expandedUser === userId ? null : userId);
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const togglePinUser = (userId: string) => {
    setPinnedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const selectAllUsers = () => {
    if (selectedUsers.length === filteredUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredUsers.map((user) => user.userId));
    }
  };

  const refreshData = () => {
    setAnimatingCards([]);
    fetchUsers();
  };

  /** ====== EXPORT to Excel via server export API (encrypted) ====== **/
  const exportData = async () => {
    try {
      const basePayload = {
        role: authenticated.role,
        search: "", // exporting full filtered set from server; keep as needed
        roleId:
          authenticated?.role === SUPER_ADMIN
            ? MASTER
            : authenticated?.role === MASTER
            ? CLIENT
            : "",
        startDate: "",
        endDate: "",
        status: 1,
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
        toastError(resp.data.message || "Export failed");
        return;
      }

      const rows = decryptData1(resp.data.data) as User[];
      if (!rows || rows.length === 0) {
        toastError("No data available to export.");
        return;
      }

      // Prepare Excel (keeping close to your earlier export style)
      const excelData = rows.map((item) => ({
        Name: item.name,
        Username: item.userName,
        Phone: item.phone,
        Role: item.roleName,
        "%": item.profitAndLossSharing,
        "Brk %": item.brkSharing,
        Balance: Number(item.balance?.toFixed(2)),
        "P/L": Number(
          ((item.profitLoss ?? 0) - (item.brokerageTotal ?? 0)).toFixed(2)
        ),
        "Created At": formatDateTime(item.createdAt),
        "Last Login D/T": formatDateTime(item.lastLoginTime),
        Domain: item.domain || "",
        "D/W": item.totalDeposit,
        CL: item.totalDeposit - item.totalWithdraw,
        IP: item.ipAddress || "",
        Device: item.deviceId || "",
        Status:
          item.status === 1
            ? "Active"
            : item.status === 2
            ? "In-Active"
            : "Deleted",
      }));

      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Users");

      const excelBuffer = XLSX.write(workbook, {
        bookType: "xlsx",
        type: "array",
      });
      const blob = new Blob([excelBuffer], {
        type: "application/octet-stream",
      });
      const userName = authenticated.userName || "USER";
      const now = new Date();
      const fileName = `${userName}USERS${formatDateForExportExcelName(
        now
      )}.xlsx`;
      saveAs(blob, fileName);
      toastSuccess("Exported!");
    } catch (error: any) {
      console.error("Export error:", error);
      toastError(error?.response?.data?.message || "Error exporting");
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toastSuccess("Copied!");
    } catch {
      toastError("Copy failed");
    }
  };

  const handleShareUser = (user: User) => {
    setShareUser(user);
    setShareDialogOpen(true);
  };

  const handleShareSubmit = async () => {
    if (!shareUser || !shareEmail) {
      toastError("Please provide an email address");
      return;
    }

    try {
      // Create shareable link
      const shareableLink = `${window.location.origin}/users/${shareUser.userId}`;

      // Create email content
      const emailSubject = `User Information: ${shareUser.name}`;
      const emailBody = `
        Name: ${shareUser.name}
        Username: ${shareUser.userName}
        Phone: ${shareUser.phone}
        Role: ${shareUser.roleName}
        Balance: ₹${shareUser.balance.toLocaleString()}
        
        ${shareMessage ? `Message: ${shareMessage}` : ""}
        
        View more details: ${shareableLink}
      `;

      // Create mailto link
      const mailtoLink = `mailto:${shareEmail}?subject=${encodeURIComponent(
        emailSubject
      )}&body=${encodeURIComponent(emailBody)}`;

      // Open email client
      window.open(mailtoLink);

      toastSuccess("Email client opened with user information");
      setShareDialogOpen(false);
      setShareUser(null);
      setShareEmail("");
      setShareMessage("");
    } catch (error) {
      console.error("Error sharing user:", error);
      toastError("Failed to share user information");
    }
  };

  const handleEditUser = (user: User) => {
    setSelectedUserForEdit(user);
    setEditedUser({ ...user });
    setEditDialogOpen(true);
  };

  // Local-only update for UI preview (no edit API provided in constants)
  const handleSaveEdit = () => {
    if (selectedUserForEdit && editedUser) {
      setUsers((prev) =>
        prev.map((u) =>
          u.userId === selectedUserForEdit.userId
            ? ({ ...u, ...editedUser } as User)
            : u
        )
      );
      setEditDialogOpen(false);
      setSelectedUserForEdit(null);
      setEditedUser({});
      toastSuccess("Saved locally.");
    }
  };

  const handleUploadImage = (user: User) => {
    setSelectedUserForUpload(user);
    setUploadDialogOpen(true);
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) setUploadedImage(file);
  };

  const handleSubmitUpload = () => {
    // No upload API given; just demo close
    setUploadDialogOpen(false);
    setSelectedUserForUpload(null);
    setUploadedImage(null);
    toastSuccess("Image queued (demo).");
  };

  const handleCreateUser = () => {
    // Demo create user
    setCreateUserDialogOpen(false);
    setNewUser({});
    toastSuccess("User created (demo).");
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const getRoleBadgeColor = (roleName: string) => {
    switch (roleName) {
      case "Admin":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300 badge-glow";
      case "Master":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 badge-glow";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  const getStatusIcon = (status: boolean) =>
    status ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <XCircle className="h-4 w-4 text-red-500" />
    );

  /** ====== Change Password / Change Status logic ====== **/
  const openChangePassword = (u: User) => {
    setCpUserId(u.userId);
    setNewPassword("");
    setConfirmPassword("");
    setActiveTableMenu(null);
  };
  const submitChangePassword = async () => {
    try {
      if (!newPassword || !confirmPassword)
        return toastError("Please fill in all fields");
      if (newPassword.length < 8)
        return toastError("New Password must be greater than 8 characters.");
      if (newPassword !== confirmPassword)
        return toastError("New Password and Confirm Password doesn't match");

      const resp = await apiClient.post(
        ADMIN_CHANGE_PASSWORD,
        JSON.stringify({ data: encryptData({ userId: cpUserId, newPassword }) })
      );
      if (resp.data.statusCode === SUCCESS) {
        toastSuccess(resp.data.meta?.message || "Password changed");
        setCpUserId("");
      } else {
        toastError(resp.data.message || "Failed to change password");
      }
    } catch (e: any) {
      toastError(e?.response?.data?.message || "Error changing password");
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
        return toastError("Please select status");

      const body = {
        status: statusValue,
        logStatus: "status",
        userId: statusUserId,
      };
      const resp = await apiClient.post(
        ADMIN_CHANGE_STATUS,
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
        toastSuccess(resp.data.meta?.message || "Status updated");
      } else {
        toastError(resp.data.message || "Failed to change status");
      }
    } catch (e: any) {
      toastError(e?.response?.data?.message || "Error changing status");
    }
  };

  const handleCreateUserSuccess = () => {
    // Refresh user list or perform other actions after successful user creation
    console.log("User created successfully");
  };

  const getDeviceIcon = (deviceType: string) =>
    deviceType === "desktop" ? (
      <Monitor className="h-4 w-4" />
    ) : (
      <Smartphone className="h-4 w-4" />
    );

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto"></div>
          <div className="space-y-2">
            <p className="text-lg font-medium">Loading user data...</p>
            <div className="w-64 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-primary shimmer"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 overflow-y-auto">
      <main className=" mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Action Buttons */}
        <Card
          className="mb-6 animate-fade-in"
          style={{ animationDelay: "0.2s" }}
        >
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
                    <UsersIcon className="h-5 w-5 text-white" />
                  </div>
                  <h1 className="text-xl font-bold text-gray-900">
                    User Management
                  </h1>
                </div>
                <Badge variant="outline" className="animate-pulse-slow">
                  {filteredUsers.length} Users
                </Badge>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refreshData}
                  className="button-hover"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportData}
                  className="button-hover"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
                <Button
                  size="sm"
                  className="button-hover bg-blue-600 hover:bg-blue-700"
                  onClick={() => setIsCreateUserOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create User
                </Button>
                <CreateUserForm
                  isOpen={isCreateUserOpen}
                  onClose={() => setIsCreateUserOpen(false)}
                  onSuccess={handleCreateUserSuccess}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Search and Filters */}
        <Card
          className="mb-6 animate-fade-in"
          style={{ animationDelay: "0.4s" }}
        >
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search by name, username, phone, or role..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 smooth-transition"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Tabs value={roleFilter} onValueChange={setRoleFilter}>
                  <TabsList>
                    <TabsTrigger value="all">All Roles</TabsTrigger>
                    <TabsTrigger value="Admin">Admin</TabsTrigger>
                    <TabsTrigger value="Master">Master</TabsTrigger>
                  </TabsList>
                </Tabs>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortKey)}
                  className="px-3 py-2 border border-border rounded-md bg-background smooth-transition"
                >
                  <option value="name">Sort by Name</option>
                  <option value="balance">Sort by Balance</option>
                  <option value="lastLogin">Sort by Last Login</option>
                </select>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                  }
                >
                  {sortOrder === "asc" ? "↑" : "↓"}
                </Button>

                <div className="flex items-center border border-border rounded-md">
                  <Button
                    variant={viewMode === "grid" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("grid")}
                  >
                    <div className="grid grid-cols-2 gap-1 h-4 w-4">
                      <div className="bg-current"></div>
                      <div className="bg-current"></div>
                      <div className="bg-current"></div>
                      <div className="bg-current"></div>
                    </div>
                  </Button>
                  <Button
                    variant={viewMode === "list" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("list")}
                  >
                    <div className="space-y-1 h-4 w-4">
                      <div className="bg-current h-1"></div>
                      <div className="bg-current h-1"></div>
                      <div className="bg-current h-1"></div>
                    </div>
                  </Button>
                  <Button
                    variant={viewMode === "table" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("table")}
                  >
                    <div className="h-4 w-4 flex flex-col justify-between">
                      <div className="bg-current h-0.5"></div>
                      <div className="bg-current h-0.5"></div>
                      <div className="bg-current h-0.5"></div>
                    </div>
                  </Button>
                </div>
              </div>
            </div>

            {selectedUsers.length > 0 && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <span className="text-sm text-blue-800">
                  {selectedUsers.length} user
                  {selectedUsers.length > 1 ? "s" : ""} selected
                </span>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    Message
                  </Button>
                  <Button variant="outline" size="sm">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Users Display */}
        {filteredUsers.length === 0 ? (
          <Card className="animate-fade-in">
            <CardContent className="p-12 text-center">
              <UserIcon className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No users found</h3>
              <p className="text-muted-foreground mb-4">
                Try adjusting your search or filter criteria
              </p>
              <Button
                onClick={() => {
                  setSearchTerm("");
                  setRoleFilter("all");
                }}
              >
                Clear Filters
              </Button>
            </CardContent>
          </Card>
        ) : viewMode === "table" ? (
          <Card className="overflow-x-auto">
            <CardContent className="p-0">
              <div className="min-w-full">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <input
                          type="checkbox"
                          checked={
                            selectedUsers.length === filteredUsers.length
                          }
                          onChange={selectAllUsers}
                          className="h-4 w-4 text-blue-600 rounded border-gray-300"
                        />
                      </TableHead>
                      <TableHead className="whitespace-nowrap">
                        Actions
                      </TableHead>
                      <TableHead className="whitespace-nowrap">
                        Mobile
                      </TableHead>
                      <TableHead className="whitespace-nowrap">
                        Username
                      </TableHead>
                      <TableHead className="whitespace-nowrap">Type</TableHead>
                      <TableHead className="whitespace-nowrap">%</TableHead>
                      <TableHead className="whitespace-nowrap">Brk%</TableHead>
                      <TableHead className="whitespace-nowrap">
                        Created Date
                      </TableHead>
                      <TableHead className="whitespace-nowrap">
                        Last Login
                      </TableHead>
                      <TableHead className="whitespace-nowrap">
                        Domain
                      </TableHead>
                      <TableHead className="whitespace-nowrap">D/W</TableHead>
                      <TableHead className="whitespace-nowrap">CL</TableHead>
                      <TableHead className="whitespace-nowrap">
                        Balance
                      </TableHead>
                      <TableHead className="whitespace-nowrap">P/L</TableHead>
                      <TableHead className="whitespace-nowrap">IP</TableHead>
                      <TableHead className="whitespace-nowrap">
                        Device ID
                      </TableHead>
                      <TableHead className="whitespace-nowrap">
                        Status
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user, index) => (
                      <TableRow
                        key={user.userId}
                        className={`hover:bg-gray-50 ${
                          selectedUsers.includes(user.userId)
                            ? "bg-blue-50"
                            : ""
                        } ${
                          animatingCards.includes(user.userId)
                            ? "animate-fade-in"
                            : ""
                        } ${
                          pinnedUsers.includes(user.userId)
                            ? "ring-2 ring-yellow-400"
                            : ""
                        }`}
                        style={{ animationDelay: `${index * 0.05}s` }}
                      >
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedUsers.includes(user.userId)}
                            onChange={() => toggleUserSelection(user.userId)}
                            className="h-4 w-4 text-blue-600 rounded border-gray-300"
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(user.userId)}
                              className="h-8 w-8 p-0"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditUser(user)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <div className="relative" ref={menuRef}>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  setActiveTableMenu(
                                    activeTableMenu === user.userId
                                      ? null
                                      : user.userId
                                  )
                                }
                                className="h-8 w-8 p-0"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                              {activeTableMenu === user.userId && (
                                <div className="fixed z-50 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200">
                                  <div className="py-1">
                                    <button
                                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                                      onClick={() => openChangePassword(user)}
                                    >
                                      <Key className="h-4 w-4 mr-2" />
                                      Change Password
                                    </button>
                                    <button
                                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                                      onClick={() => openChangeStatus(user)}
                                    >
                                      <ToggleLeft className="h-4 w-4 mr-2" />
                                      Change Status
                                    </button>
                                    <button
                                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                                      onClick={() => handleShareUser(user)}
                                    >
                                      <Share2 className="h-4 w-4 mr-2" />
                                      Share
                                    </button>
                                    <button
                                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                                      onClick={() => handleUploadImage(user)}
                                    >
                                      <FileImage className="h-4 w-4 mr-2" />
                                      Upload Image
                                    </button>
                                    <button
                                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                                      onClick={() => togglePinUser(user.userId)}
                                    >
                                      <Heart
                                        className={`h-4 w-4 mr-2 ${
                                          pinnedUsers.includes(user.userId)
                                            ? "fill-current text-red-500"
                                            : ""
                                        }`}
                                      />
                                      {pinnedUsers.includes(user.userId)
                                        ? "Unpin"
                                        : "Pin"}
                                    </button>
                                    <button
                                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                                      onClick={() =>
                                        copyToClipboard(user.userId)
                                      }
                                    >
                                      <Copy className="h-4 w-4 mr-2" />
                                      Copy ID
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium whitespace-nowrap">
                          {user.phone}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {user.userName}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <Badge className={getRoleBadgeColor(user.roleName)}>
                            {user.roleName}
                          </Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {user.profitAndLossSharing}%
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {user.brkSharing}%
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {formatDate(user.createdAt)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {formatDate(user.lastLoginTime)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {user.domain || "N/A"}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {user.totalDeposit.toLocaleString()}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span>
                              {(
                                user.totalDeposit - user.totalWithdraw
                              ).toLocaleString()}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleUploadImage(user)}
                              className="h-6 w-6 p-0"
                            >
                              <FileImage className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          ₹{user.balance.toLocaleString()}
                        </TableCell>
                        <TableCell
                          className={`whitespace-nowrap ${
                            user.profitLoss >= 0
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          ₹{user.profitLoss.toLocaleString()}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {user.ipAddress}
                        </TableCell>
                        <TableCell className="whitespace-nowrap max-w-32 truncate">
                          {user.deviceId}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            {getStatusIcon(user.status === 1)}
                            <span className="text-sm">
                              {user.status === 1 ? "ACTIVE" : "INACTIVE"}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div
            className={
              viewMode === "grid"
                ? "grid gap-6 lg:grid-cols-2 xl:grid-cols-3"
                : "space-y-4"
            }
          >
            {filteredUsers.map((user, index) => (
              <Card
                key={user.userId}
                className={`card-hover smooth-transition ${
                  animatingCards.includes(user.userId) ? "animate-fade-in" : ""
                } ${
                  selectedUsers.includes(user.userId)
                    ? "ring-2 ring-blue-500"
                    : ""
                } ${
                  pinnedUsers.includes(user.userId)
                    ? "ring-2 ring-yellow-400"
                    : ""
                }`}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(user.userId)}
                        onChange={() => toggleUserSelection(user.userId)}
                        className="h-4 w-4 text-blue-600 rounded border-gray-300"
                      />
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          {user.name}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(user.userId)}
                            className="h-6 w-6 p-0"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </CardTitle>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getRoleBadgeColor(user.roleName)}>
                        {user.roleName}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => togglePinUser(user.userId)}
                        className={`h-8 w-8 p-0 ${
                          pinnedUsers.includes(user.userId)
                            ? "text-yellow-500"
                            : ""
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
                        className="h-8 w-8 p-0"
                        title="Change Password"
                      >
                        <Key className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openChangeStatus(user)}
                        className="h-8 w-8 p-0"
                        title="Change Status"
                      >
                        <ToggleLeft className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Basic Info */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{user.phone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <UserIcon className="h-4 w-4 text-muted-foreground" />
                      <span>{user.userName}</span>
                    </div>
                  </div>

                  {/* Type and Percentages */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-muted-foreground" />
                      <Badge className={getRoleBadgeColor(user.roleName)}>
                        {user.roleName}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      <span>
                        %: {user.profitAndLossSharing}% | Brk%:{" "}
                        {user.brkSharing}%
                      </span>
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs">
                        Created: {formatDate(user.createdAt)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs">
                        Login: {formatDate(user.lastLoginTime)}
                      </span>
                    </div>
                  </div>

                  {/* Financial Info */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate">{user.domain || "N/A"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span>
                        Balance:{" "}
                        <span className="font-semibold text-green-600">
                          ₹{user.balance.toLocaleString()}
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* D/W and CL */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      <span>D/W: {user.totalDeposit.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-muted-foreground" />
                      <div className="flex items-center gap-1">
                        <span>
                          CL:{" "}
                          {(
                            user.totalDeposit - user.totalWithdraw
                          ).toLocaleString()}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUploadImage(user)}
                          className="h-5 w-5 p-0"
                        >
                          <FileImage className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* P&L and Status */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-muted-foreground" />
                      <span>
                        P/L:{" "}
                        <span
                          className={`font-semibold ${
                            user.profitLoss >= 0
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          ₹{user.profitLoss.toLocaleString()}
                        </span>
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(user.status === 1)}
                      <span className="text-sm">
                        {user.status === 1 ? "ACTIVE" : "INACTIVE"}
                      </span>
                    </div>
                  </div>

                  {/* IP and Device */}
                  <div className="grid grid-cols-1 gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs">IP: {user.ipAddress}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Smartphone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs truncate">
                        Device: {user.deviceId}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditUser(user)}
                      className="flex-1 smooth-transition"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit User
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="smooth-transition"
                      onClick={() => copyToClipboard(user.userId)}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Edit User Dialog (local state update) */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          {selectedUserForEdit && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={editedUser.name || ""}
                  onChange={(e) =>
                    setEditedUser({ ...editedUser, name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="userName">Username</Label>
                <Input
                  id="userName"
                  value={editedUser.userName || ""}
                  onChange={(e) =>
                    setEditedUser({ ...editedUser, userName: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Mobile</Label>
                <Input
                  id="phone"
                  value={editedUser.phone || ""}
                  onChange={(e) =>
                    setEditedUser({ ...editedUser, phone: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="domain">Domain</Label>
                <Input
                  id="domain"
                  value={editedUser.domain || ""}
                  onChange={(e) =>
                    setEditedUser({ ...editedUser, domain: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="balance">Balance</Label>
                <Input
                  id="balance"
                  type="number"
                  value={editedUser.balance ?? ""}
                  onChange={(e) =>
                    setEditedUser({
                      ...editedUser,
                      balance: Number(e.target.value),
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profitLoss">P/L</Label>
                <Input
                  id="profitLoss"
                  type="number"
                  value={editedUser.profitLoss ?? ""}
                  onChange={(e) =>
                    setEditedUser({
                      ...editedUser,
                      profitLoss: Number(e.target.value),
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="totalDeposit">Total Deposit</Label>
                <Input
                  id="totalDeposit"
                  type="number"
                  value={editedUser.totalDeposit ?? ""}
                  onChange={(e) =>
                    setEditedUser({
                      ...editedUser,
                      totalDeposit: Number(e.target.value),
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="totalWithdraw">Total Withdraw</Label>
                <Input
                  id="totalWithdraw"
                  type="number"
                  value={editedUser.totalWithdraw ?? ""}
                  onChange={(e) =>
                    setEditedUser({
                      ...editedUser,
                      totalWithdraw: Number(e.target.value),
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ipAddress">IP Address</Label>
                <Input
                  id="ipAddress"
                  value={editedUser.ipAddress || ""}
                  onChange={(e) =>
                    setEditedUser({ ...editedUser, ipAddress: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deviceId">Device ID</Label>
                <Input
                  id="deviceId"
                  value={editedUser.deviceId || ""}
                  onChange={(e) =>
                    setEditedUser({ ...editedUser, deviceId: e.target.value })
                  }
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create User Dialog */}
      <Dialog
        open={createUserDialogOpen}
        onOpenChange={setCreateUserDialogOpen}
      >
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newName">Name</Label>
              <Input
                id="newName"
                value={newUser.name || ""}
                onChange={(e) =>
                  setNewUser({ ...newUser, name: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newUserName">Username</Label>
              <Input
                id="newUserName"
                value={newUser.userName || ""}
                onChange={(e) =>
                  setNewUser({ ...newUser, userName: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPhone">Mobile</Label>
              <Input
                id="newPhone"
                value={newUser.phone || ""}
                onChange={(e) =>
                  setNewUser({ ...newUser, phone: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newDomain">Domain</Label>
              <Input
                id="newDomain"
                value={newUser.domain || ""}
                onChange={(e) =>
                  setNewUser({ ...newUser, domain: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newRole">Role</Label>
              <select
                id="newRole"
                value={newUser.roleName || ""}
                onChange={(e) =>
                  setNewUser({ ...newUser, roleName: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">Select Role</option>
                <option value="Admin">Admin</option>
                <option value="Master">Master</option>
                <option value="Broker">Broker</option>
                <option value="Client">Client</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="newBalance">Initial Balance</Label>
              <Input
                id="newBalance"
                type="number"
                value={newUser.balance ?? ""}
                onChange={(e) =>
                  setNewUser({ ...newUser, balance: Number(e.target.value) })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateUserDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateUser}>Create User</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share User Dialog */}
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Share User Information</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="text-sm text-muted-foreground">
              User: <span className="font-medium">{shareUser?.name}</span>
            </div>
            <div className="space-y-2">
              <Label htmlFor="shareEmail">Email Address</Label>
              <Input
                id="shareEmail"
                type="email"
                placeholder="Enter email address"
                value={shareEmail}
                onChange={(e) => setShareEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shareMessage">Message (Optional)</Label>
              <textarea
                id="shareMessage"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                rows={3}
                placeholder="Add a message..."
                value={shareMessage}
                onChange={(e) => setShareMessage(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShareDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleShareSubmit}>Share</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload Image Dialog (demo) */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Image</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="text-sm text-muted-foreground">
              User:{" "}
              <span className="font-medium">
                {selectedUserForUpload?.userName}
              </span>
            </div>
            <div className="space-y-2">
              <Label htmlFor="imageUpload">Select Image</Label>
              <Input
                id="imageUpload"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
              />
            </div>
            {uploadedImage && (
              <div className="text-sm text-green-600">
                Selected: {uploadedImage.name}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setUploadDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmitUpload} disabled={!uploadedImage}>
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Password Inline Dialog (simple) */}
      {cpUserId && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">Change Password</h3>
            <div className="space-y-3">
              <div>
                <Label htmlFor="newPass">New Password</Label>
                <Input
                  id="newPass"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="confirmPass">Confirm Password</Label>
                <Input
                  id="confirmPass"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCpUserId("")}>
                Cancel
              </Button>
              <Button onClick={submitChangePassword}>Save</Button>
            </div>
          </div>
        </div>
      )}

      {/* Change Status Inline Dialog (simple) */}
      {statusUserId && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">Change Status</h3>
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
                  <span>Active</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="status"
                    value="2"
                    checked={statusValue === 2}
                    onChange={() => setStatusValue(2)}
                  />
                  <span>In-Active</span>
                </label>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setStatusUserId("")}>
                Cancel
              </Button>
              <Button onClick={submitChangeStatus}>Save</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
