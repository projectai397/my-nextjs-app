"use client";

import apiClient from "@/lib/axiosInstance";

import React, { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Select from "react-select";

import {
  ADMIN,
  ADMIN_API_ENDPOINT,
  ADMIN_CHANGE_PASSWORD,
  ADMIN_CHANGE_STATUS,
  ALL_USER_BALANCE,
  BROKER,
  CLIENT,
  MASTER,
  NEGATIVE_USER_CHILD_LIST,
  NEGATIVE_USER_LIST,
  ROLE_LIST,
  SHIFT_USER,
  SUCCESS,
  SUPER_ADMIN,
  UPDATE_NEGATIVE_USER_CHILD_LIST,
  UPDATE_NEGATIVE_USER_LIST,
  USER_CHILD_LIST,
  USER_LIST_EXPORT,
  USER_SEARCH_LIST,
} from "@/constant/index";
import {
  formatDateForExportExcelName,
  formatDateTime,
} from "@/hooks/dateUtils";

import { saveAs } from "file-saver";
import * as XLSX from "xlsx";

import { encryptData, decryptData } from "@/hooks/crypto";
import { toast } from "sonner";
// shadcn/ui imports
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  RefreshCw,
  Download,
  Plus,
  Search,
  MoreHorizontal,
  Key,
  UserX,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Image,
  Share,
} from "lucide-react";

// ---------- Types ----------
type AnyObj = Record<string, any>;

interface StatusOption {
  value: number | "";
  label: string;
}

interface SortConfig {
  key: string | null;
  direction: "ascending" | "descending";
}

interface TableItem {
  userId: string;
  role: string; // MASTER | ADMIN | CLIENT | BROKER | etc.
  name: string;
  phone: string;
  roleName?: string;
  parentUser?: string;
  profitAndLossSharing?: number;
  brkSharing?: number;
  createdAt: string | number | Date | null;
  lastLoginTime: string | number | Date | null;
  domain?: string;
  depositWithdrawAtsSystem?: boolean;
  balance: number;
  ipAddress?: string;
  deviceId?: string;
  status: number; // 1/2/3
  profitLoss?: number;
  brokerageTotal?: number;
  [key: string]: any;
}

export default function NegativeUserPage() {
  const router = useRouter();
  const params = useParams<{ role?: string }>();
  const role = params?.role;

  // NOTE: Keeping original localStorage reads as-is (component is client)
  const deviceType =
    typeof window !== "undefined" ? localStorage.getItem("deviceType") : "";
  const jwt_token =
    typeof window !== "undefined" ? localStorage.getItem("token") || "" : "";
  const authenticated: AnyObj =
    typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem("authenticated") || "{}")
      : {};

  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);
  const itemsPerPage = 100;
  const [tableData, setTableData] = useState<TableItem[]>([]);
  const [copied, setCopied] = useState<null | string | boolean>(false);
  const [cpUserId, setCpUserId] = useState<string>("");
  const [statusUserId, setStatusUserId] = useState<string>("");
  const [shareUserId, setShareUserId] = useState<string>("");
  const [shareUrl, setShareUrl] = useState<string>("");
  const [formData, setFormData] = useState<AnyObj>({});
  const [searchFormData, setSearchFormData] = useState<{
    search: string;
    roleId: string | number | "";
    status: number | "";
  }>({
    search: "",
    roleId:
      authenticated.role === SUPER_ADMIN
        ? MASTER
        : authenticated.role === MASTER
        ? CLIENT
        : "",
    status: 1,
  });
  const [formStatusData, setFormStatusData] = useState<AnyObj>({});
  const [allUserTotal, setAllUserTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [totalUserCountTotal, setTotalUserCountTotal] = useState<number>(0);
  const [suUserId, setSuUserId] = useState<string>("");
  const [userData, setUserData] = useState<
    Array<{ label: string; value: string }>
  >([]);
  const [formFilterData, setFormFilterData] = useState<AnyObj>({});
  const [roleData, setRoleData] = useState<
    Array<{ value: string | number | ""; label: string }>
  >([]);
  const [statusData] = useState<StatusOption[]>([
    { value: 1, label: "Active" },
    { value: 2, label: "In-Active" },
    { value: "", label: "All" },
  ]);

  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: null,
    direction: "ascending",
  });
  const tableRef = useRef<HTMLTableElement | null>(null);

  // Resizable column widths (if you want to keep using)
  const [colWidths, setColWidths] = useState<Record<string, number>>({
    action: 100,
    phone: 150,
    roleName: 150,
    parentUser: 150,
    type: 150,
    profitAndLossSharing: 100,
    brkSharing: 100,
    createdAt: 200,
    lastLoginTime: 200,
    domain: 150,
    depositWithdrawAtsSystem: 100,
    cl: 100,
    balance: 150,
    ipAddress: 150,
    deviceId: 150,
    status: 100,
  });

  const handleMouseDown = (
    e: React.MouseEvent<HTMLDivElement>,
    colKey: string
  ) => {
    e.preventDefault();
    const th = (e.target as HTMLElement).parentElement as HTMLTableCellElement;
    const startX = e.clientX;
    const startWidth = th.offsetWidth;
    document.body.style.cursor = "col-resize";

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const newWidth = startWidth + (moveEvent.clientX - startX);
      if (newWidth > 50) {
        setColWidths((prev) => ({ ...prev, [colKey]: newWidth }));
      }
    };

    const handleMouseUp = () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "auto";
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const requestSort = (key: string) => {
    let direction: SortConfig["direction"] = "ascending";
    if (sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending";
    }
    setSortConfig({ key, direction });
  };

  const sortedTableData = useMemo(() => {
    const sortableItems = [...tableData];
    if (sortConfig.key !== null) {
      sortableItems.sort((a: AnyObj, b: AnyObj) => {
        let aValue: any;
        let bValue: any;

        if (sortConfig.key === "script") {
          const getDisplayName = (item: AnyObj) => {
            if ((item.exchangeName || "").toLowerCase() === "usstock")
              return item.symbolName;
            if ((item.exchangeName || "").toLowerCase() === "ce/pe")
              return item.symbolTitle;
            return item.masterName;
          };
          aValue = getDisplayName(a);
          bValue = getDisplayName(b);
        } else {
          aValue = a[sortConfig.key!];
          bValue = b[sortConfig.key!];
        }

        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;

        if (typeof aValue === "string") {
          return sortConfig.direction === "ascending"
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        } else {
          if (aValue < bValue) {
            return sortConfig.direction === "ascending" ? -1 : 1;
          }
          if (aValue > bValue) {
            return sortConfig.direction === "ascending" ? 1 : -1;
          }
          return 0;
        }
      });
    }
    return sortableItems;
  }, [tableData, sortConfig]);

  const getSortIcon = (key: string) => {
    if (sortConfig.key !== key) {
      return <ArrowUpDown className="w-4 h-4" />;
    }
    if (sortConfig.direction === "ascending") {
      return <ArrowUpDown className="w-4 h-4 text-blue-600" />;
    }
    return <ArrowUpDown className="w-4 h-4 text-blue-600 rotate-180" />;
  };

  const handleCopy = async (id: string) => {
    await navigator.clipboard.writeText(id);
    toast.success("Copied successfully");
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  };

  const fetchUserBalance = async () => {
    try {
      let data = encryptData({ userId: "" });
      data = JSON.stringify({ data: data });
      apiClient
        .post(ALL_USER_BALANCE, data, {
          headers: {
            Authorization: jwt_token,
            "Content-Type": "application/json",
            deviceType: deviceType || "",
          },
        })
        .then((response) => {
          if (response.data.statusCode == SUCCESS) {
            const rdata = decryptData(response.data.data);
            setAllUserTotal(rdata.balanceTotal);
            setTotalUserCountTotal(rdata.userCount);
          }
        })
        .catch((error) => {
          console.error("Login error:", error);
        });
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const fetchDataFromAPI = async (_: number) => {
    try {
      let data = encryptData({
        role: authenticated.role,
        search: searchFormData?.search ? searchFormData.search : "",
        roleId: searchFormData?.roleId ? searchFormData.roleId : "",
        status: searchFormData?.status ? searchFormData.status : 1,
        page: currentPage,
        limit: itemsPerPage,
        balanceNegative: true,
      });
      data = JSON.stringify({ data: data });

      let apiUrl = NEGATIVE_USER_CHILD_LIST;
      if (authenticated.role === MASTER) {
        apiUrl = NEGATIVE_USER_LIST;
      }

      apiClient
        .post(apiUrl, data, {
          headers: {
            Authorization: jwt_token,
            "Content-Type": "application/json",
            deviceType: deviceType || "",
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
          toast.error(error?.response?.data?.message || "Request failed");
          console.error("Login error:", error);
        });
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const handlePageChange = async (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  const UserMenuRedirect = (redirect: string) => {
    router.push(redirect);
  };
  const UserEditRedirect = (_item: AnyObj, redirect: string) => {
    router.push(redirect);
  };
  const UserChildRedirect = (_item: AnyObj, redirect: string) => {
    router.push(redirect);
  };

  const CopyCreateUserURL = () => {
    const uname = authenticated.userName;
    const userId = authenticated.userName;
    const domain = authenticated.domain;
    const urlToCopy =
      "https://" + domain + "/r/" + btoa(uname) + "/register/" + btoa(userId);
    navigator.clipboard.writeText(urlToCopy).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      },
      (err) => {
        console.error("Failed to copy URL: ", err);
      }
    );
  };

  const onClose = () => {
    setCpUserId("");
    setFormData({});
  };
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };
  const handleChangeCP = (userId: string) => {
    setCpUserId(userId);
  };
  const handleChangeSU = (userId: string) => {
    setSuUserId(userId);
  };
  const handleChangePassword = async () => {
    try {
      if (!formData.newPassword || !formData.confirmPassword) {
        toast.error("Please fill in all fields");
        return;
      }
      if ((formData.newPassword as string).length < 8) {
        toast.error("New Password must be greater than 8 characters.");
        return;
      }
      if (formData.newPassword !== formData.confirmPassword) {
        toast.error("New Password and Confirm Password doesn't match");
        return;
      }
      let data = encryptData({
        newPassword: formData.newPassword,
        userId: cpUserId,
      });
      data = JSON.stringify({ data: data });
      apiClient
        .post(ADMIN_CHANGE_PASSWORD, data, {
          headers: {
            Authorization: jwt_token,
            "Content-Type": "application/json",
            deviceType: deviceType || "",
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
        .catch((error) => {
          toast.error(error?.response?.data?.message || "Request failed");
        });
    } catch (error) {}
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormStatusData({ ...formStatusData, [name]: value });
  };
  const onStatusClose = () => {
    setStatusUserId("");
    setFormData({});
  };
  const onSUClose = () => {
    setSuUserId("");
    setFormFilterData({});
    setUserData([]);
  };
  const onShareClose = () => {
    setShareUserId("");
    setShareUrl("");
  };
  const onResetShiftUser = () => {
    handleChangeUserDataValueOption(null, "user");
    setFormFilterData({});
    setUserData([]);
  };
  const handleChangeStatus = (userId: string, status: number) => {
    setFormStatusData({ ...formStatusData, status: status });
    setStatusUserId(userId);
  };
  const handleChangeST = async () => {
    try {
      if (!formStatusData.status) {
        toast.error("Please fill in all fields");
        return;
      }
      let data = encryptData({
        status: formStatusData.status,
        logStatus: "status",
        userId: statusUserId,
      });
      data = JSON.stringify({ data: data });
      apiClient
        .post(ADMIN_CHANGE_STATUS, data, {
          headers: {
            Authorization: jwt_token,
            "Content-Type": "application/json",
            deviceType: deviceType || "",
          },
        })
        .then((response) => {
          if (response.data.statusCode == SUCCESS) {
            setStatusUserId("");
            setFormStatusData({});
            toast.success(response.data.meta.message);
            fetchDataFromAPI(0);
          } else {
            toast.error(response.data.message);
          }
        })
        .catch((error) => {
          toast.error(error?.response?.data?.message || "Request failed");
        });
    } catch (error) {}
  };

  const handleReset = async () => {
    setSearchFormData({
      ...searchFormData,
      search: "",
      roleId: MASTER,
      status: 1,
    });
    fetchDataFromAPI(1);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSearchFormData({ ...searchFormData, [name]: value });
  };

  const handleFilter = async () => {
    fetchDataFromAPI(0);
    setCurrentPage(1);
  };

  const exportToExcel = () => {
    setLoading(true);
    try {
      let data = encryptData({
        search: searchFormData?.search ? searchFormData.search : "",
        roleId: searchFormData?.roleId ? searchFormData.roleId : "",
        status: searchFormData?.status ? searchFormData.status : 1,
        page: currentPage,
        limit: itemsPerPage,
      });
      data = JSON.stringify({ data: data });
      let apiUrl = USER_CHILD_LIST;
      if (authenticated.role === MASTER) {
        apiUrl = USER_LIST_EXPORT;
      }
      apiClient
        .post(apiUrl, data)
        .then((response) => {
          if (response.data.statusCode == SUCCESS) {
            const rdata = decryptData(response.data.data);
            generateExcel(rdata);
          } else {
            toast.error(response.data.message);
            setLoading(false);
          }
        })
        .catch((error) => {
          console.error("Login error:", error);
          toast.error(error?.response?.data?.message || "Request failed");
          setLoading(false);
        });
    } catch (error) {
      console.error("Error fetching data:", error);
      setLoading(false);
    }
  };

  const generateExcel = (data: AnyObj[]) => {
    if (!data || data.length === 0) {
      alert("No data available to export.");
      setLoading(false);
      return;
    }

    setTimeout(() => {
      const excelData = data.map((item: AnyObj) => ({
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
        Balance: Number(Number(item.balance).toFixed(2)),
        "P/L":
          item.role === CLIENT
            ? Number(Number(item.profitLoss - item.brokerageTotal).toFixed(2))
            : Number(Number(item.profitLoss + item.brokerageTotal).toFixed(2)),
        "Created At": formatDateTime(item.createdAt),
        "Last Login D/T": formatDateTime(item.lastLoginTime),
        "Device ID": item.deviceId,
        "IP Address": item.ipAddress,
        Domain: item.domain,
        "D/W": item.depositWithdrawAtsSystem ? "YES" : "NO",
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

  const handleShiftUser = async () => {
    const isConfirmed = window.confirm(
      "Are you sure you want to shift the user?"
    );
    if (isConfirmed) {
      try {
        let data = encryptData({
          newParent: formFilterData?.user?.value
            ? formFilterData?.user.value
            : authenticated.userId,
          logStatus: "shift_user",
          userId: suUserId,
        });
        data = JSON.stringify({ data: data });
        apiClient
          .post(SHIFT_USER, data)
          .then((response) => {
            if (response.data.statusCode == SUCCESS) {
              const rdata = decryptData(response.data.data);
              let tempTableData = [...tableData];
              tempTableData = tempTableData.map((user) => {
                if (user.userId === rdata.userId) {
                  return {
                    ...user,
                    parentId: rdata.parentId,
                    parentUser: rdata.parentUser,
                  };
                }
                return user;
              });
              setTableData(tempTableData);
              setSuUserId("");
              setFormFilterData({});
              toast.success(response.data.meta.message);
            } else {
              toast.error(response.data.message);
            }
          })
          .catch((error) => {
            toast.error(error?.response?.data?.message || "Request failed");
            console.error("Login error:", error);
          });
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    }
  };

  const handleShareUser = (userId: string) => {
    setShareUserId(userId);
    const user = tableData.find((item) => item.userId === userId);
    if (user) {
      const url = `https://${user.domain}/r/${btoa(user.name)}/register/${btoa(
        userId
      )}`;
      setShareUrl(url);
      navigator.clipboard
        .writeText(url)
        .then(() => toast.success("Share URL copied to clipboard!"))
        .catch((err) => {
          console.error("Failed to copy URL: ", err);
          toast.error("Failed to copy URL");
        });
    }
  };

  const fetchOptions = async (inputValue: string) => {
    if (inputValue && 2 < inputValue.length) {
      try {
        let data = encryptData({
          filterType: 0,
          roleId: BROKER,
          userId: "",
          status: 0,
          search: inputValue,
          page: 1,
          limit: 50,
        });
        data = JSON.stringify({ data: data });
        apiClient
          .post(USER_SEARCH_LIST, data)
          .then((response) => {
            if (response.data.statusCode == SUCCESS) {
              const rdata = decryptData(response.data.data);
              const rRes = rdata.map((item: AnyObj) => ({
                label: item.userName,
                value: item.userId,
              }));
              setUserData(rRes);
            } else {
              toast.error(response.data.message);
            }
          })
          .catch((error) => {
            toast.error(error?.response?.data?.message || "Request failed");
            console.error("Login error:", error);
          });
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    } else {
      setUserData([]);
    }
  };

  const handleInputChange = (inputValue: string) => {
    fetchOptions(inputValue);
  };

  const handleChangeUserDataValueOption = (
    selectedOptions: { label: string; value: string } | null,
    name: string
  ) => {
    setFormFilterData({
      ...formFilterData,
      [name]: selectedOptions as any,
    });
  };

  const handleGetRole = async () => {
    apiClient
      .post(ROLE_LIST, [], {
        headers: {
          deviceType: deviceType || "",
          Authorization: jwt_token,
        },
      })
      .then((response) => {
        if (response.data.statusCode == SUCCESS) {
          const rdata = decryptData(response.data.data);
          const formattedOptions = [
            ...rdata.map((item: AnyObj) => ({
              value: item.roleId,
              label: item.name,
            })),
            { value: "", label: "All" },
          ];
          setRoleData(formattedOptions);
        }
      })
      .catch((error) => {
        console.error("Error fetching data:", error);
      });
  };

  const allUserBalanceSetToZero = async () => {
    const isConfirmed = window.confirm(
      "Are you sure you want to set balance and trade Margin Balance to 0 for all negative balance users?"
    );
    if (isConfirmed) {
      try {
        let data = encryptData({
          role: authenticated.role,
          search: searchFormData?.search ? searchFormData.search : "",
          roleId: searchFormData?.roleId ? searchFormData.roleId : "",
          status: searchFormData?.status ? searchFormData.status : 1,
          page: currentPage,
          limit: itemsPerPage,
          balance: 0,
          tradeMarginBalance: 0,
          balanceNegative: true,
        });
        data = JSON.stringify({ data: data });
        let apiUrl = UPDATE_NEGATIVE_USER_LIST;
        if (authenticated.role === MASTER) {
          apiUrl = UPDATE_NEGATIVE_USER_CHILD_LIST;
        }
        apiClient
          .post(apiUrl, data, {
            headers: {
              Authorization: jwt_token,
              "Content-Type": "application/json",
              deviceType: deviceType || "",
            },
          })
          .then((response) => {
            if (response.data.statusCode == SUCCESS) {
              fetchDataFromAPI(0);
              toast.success(response.data.meta.message);
            } else {
              toast.error(response.data.message);
            }
          })
          .catch((error) => {
            toast.error(error?.response?.data?.message || "Request failed");
            console.error("Login error:", error);
          });
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    }
  };

  useEffect(() => {
    fetchDataFromAPI(0);
  }, [currentPage]);

  useEffect(() => {
    const storedAuth =
      typeof window !== "undefined"
        ? localStorage.getItem("authenticated")
        : null;
    const parsedAuth = storedAuth ? JSON.parse(storedAuth) : {};
    setSearchFormData((prev) => ({
      ...prev,
      roleId:
        parsedAuth.role === SUPER_ADMIN
          ? MASTER
          : parsedAuth.role === MASTER
          ? CLIENT
          : "",
    }));
    fetchUserBalance();
    handleGetRole();
    document.title = "Admin Panel | Users";
    return () => {
      document.title = "Admin Panel";
    };
  }, []);
  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "#181a20" }}
      >
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-yellow-500 mx-auto"></div>
          <div className="space-y-2">
            <p className="text-lg font-medium" style={{ color: "#fcd535" }}>
              Loading user data...
            </p>
            <div className="w-64 h-2 bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full bg-yellow-500 shimmer"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Fragment>
      <div className="min-h-screen bg-[#181a20] p-6">
        {" "}
        {/* Main Background Color */}
        <Card className="max-w-full mx-auto bg-[#1e2329]">
          {" "}
          {/* Card Background Color */}
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="text-2xl font-bold text-[#fcd535]">
                {" "}
                 Negative User Management
              </CardTitle>
              <p className="text-sm text-[#848E9C] mt-1">
                {" "}
                {/* Sub-title Text Color */}
                {totalCount} Users
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                style={{
                  backgroundColor: "#fcd535",
                  color: "#181a20",
                  borderColor: "#3a3f47",
                }}
                onClick={() => fetchDataFromAPI(0)}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              <Button
                style={{
                  backgroundColor: "#fcd535",
                  color: "#181a20",
                  borderColor: "#3a3f47",
                }}
                onClick={exportToExcel}
                disabled={loading}
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <Button
                style={{
                  backgroundColor: "#fcd535",
                  color: "#181a20",
                  borderColor: "#3a3f47",
                }}
                onClick={allUserBalanceSetToZero}
              >
                <Plus className="w-4 h-4 mr-2" />
                Set Balance
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Table */}
            <div className="rounded-md bg-[#1e2329]">
              {" "}
              {/* Card Background Color */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#181a20] ">
                    {" "}
                    {/* Header Background */}
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-[#848E9C] uppercase tracking-wider">
                        Actions
                      </th>
                      <th
                        className="px-4 py-3 text-left text-xs font-medium text-[#848E9C] uppercase tracking-wider cursor-pointer"
                        onClick={() => requestSort("phone")}
                      >
                        <div className="flex items-center gap-1">
                          Mobile
                          {getSortIcon("phone")}
                        </div>
                      </th>
                      <th
                        className="px-4 py-3 text-left text-xs font-medium text-[#848E9C] uppercase tracking-wider cursor-pointer"
                        onClick={() => requestSort("name")}
                      >
                        <div className="flex items-center gap-1">
                          Username
                          {getSortIcon("name")}
                        </div>
                      </th>
                      {/* Continue applying the same color changes to other columns */}
                    </tr>
                  </thead>
                  <tbody className="bg-[#1e2329] divide-y divide-gray-200">
                    {" "}
                    {/* Table Row Background */}
                    {sortedTableData.map((item, index) => (
                      <tr key={index} className="hover:bg-[#1e2329]">
                        {" "}
                        {/* Row Hover Background Removed */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                aria-label="Actions"
                              >
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem
                                className="cursor-pointer"
                                onClick={() => handleChangeCP(item.userId)}
                              >
                                <Key className="w-4 h-4 mr-2" />
                                Change Password
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="cursor-pointer"
                                onClick={() =>
                                  handleChangeStatus(item.userId, item.status)
                                }
                              >
                                <UserX className="w-4 h-4 mr-2" />
                                Change Status
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="cursor-pointer"
                                onClick={() => handleShareUser(item.userId)}
                              >
                                <Share className="w-4 h-4 mr-2" />
                                Share
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-[#848E9C]">
                          {item.phone}
                        </td>{" "}
                        {/* Mobile Text Color */}
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-[#848E9C]">
                          {item.name}
                        </td>{" "}
                        {/* Username Text Color */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <Badge
                            variant={
                              item.role === MASTER ? "default" : "secondary"
                            }
                          >
                            {item.roleName}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-[#848E9C]">
                          {item.profitAndLossSharing}%
                        </td>{" "}
                        {/* % Text Color */}
                        {/* Apply the same color for other columns as needed */}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between">
              <div className="text-sm text-[#848E9C]">
                Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                {Math.min(currentPage * itemsPerPage, totalCount)} of{" "}
                {totalCount} results
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {[...Array(Math.min(5, totalPages))].map((_, index) => {
                    const pageNumber = index + 1;
                    return (
                      <Button
                        key={pageNumber}
                        variant={
                          currentPage === pageNumber ? "default" : "outline"
                        }
                        size="sm"
                        onClick={() => handlePageChange(pageNumber)}
                      >
                        {pageNumber}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        {/* Change Password Dialog */}
        <Dialog open={!!cpUserId} onOpenChange={(open) => !open && onClose()}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Change Password</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  value={formData.newPassword || ""}
                  onChange={handleChange}
                  placeholder="Enter new password"
                />
              </div>
              <div>
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  value={formData.confirmPassword || ""}
                  onChange={handleChange}
                  placeholder="Confirm new password"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleChangePassword}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        {/* Change Status Dialog */}
        <Dialog
          open={!!statusUserId}
          onOpenChange={(open) => !open && onStatusClose()}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Change Status</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Label>Status</Label>
              <RadioGroup
                value={formStatusData.status?.toString()}
                onValueChange={(value) =>
                  setFormStatusData({
                    ...formStatusData,
                    status: parseInt(value),
                  })
                }
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="1" id="active" />
                  <Label htmlFor="active">Active</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="2" id="inactive" />
                  <Label htmlFor="inactive">In-Active</Label>
                </div>
              </RadioGroup>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={onStatusClose}>
                Cancel
              </Button>
              <Button onClick={handleChangeST}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        {/* Shift User Dialog */}
        <Dialog open={!!suUserId} onOpenChange={(open) => !open && onSUClose()}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Shift User</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Label>New Parent</Label>
              <Select
                value={(formFilterData.user as any) || null}
                onChange={(selected) =>
                  handleChangeUserDataValueOption(selected as any, "user")
                }
                options={userData}
                onInputChange={handleInputChange}
                isSearchable
                placeholder="Type to search..."
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={onSUClose}>
                Cancel
              </Button>
              <Button variant="outline" onClick={onResetShiftUser}>
                Clear
              </Button>
              <Button onClick={handleShiftUser}>Shift</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        {/* Share User Dialog */}
        <Dialog
          open={!!shareUserId}
          onOpenChange={(open) => !open && onShareClose()}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Share User</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p>Registration link has been copied to clipboard!</p>
              <div className="p-3 bg-gray-100 rounded-md">
                <p className="text-sm text-gray-600 break-all">{shareUrl}</p>
              </div>
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(shareUrl);
                    toast.success("URL copied to clipboard!");
                  }}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy URL
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={onShareClose}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Fragment>
  );
}
