"use client";

import apiClient from "@/lib/axiosInstance";

import React, {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

// --- shadcn/ui ---
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

// --- Icons ---
import {
  CheckCircle2,
  Clock3,
  XCircle,
  ChevronLeft,
  ChevronRight,
  PlusSquare,
  ArrowUpDown,
} from "lucide-react";

import {
  ACTIVE,
  ADMIN,
  ADMIN_API_ENDPOINT,
  CREDIT,
  DEBIT,
  LIST_PAYMENT_REQUEST,
  MASTER,
  PAYMENT_REQUEST_CHANGE_STATUS,
  SUCCESS,
  SUPER_ADMIN,
  USER_SEARCH_LIST,
} from "@/constant/index";
import { useSocket } from "@/components/socket/socketContext";
import { encryptData, decryptData } from "@/hooks/crypto";
import { toast } from "sonner";
import { formatDateTime } from "@/hooks/dateUtils";
import CreateDepositDialog from "./CreateDepositDialog";
// --- Types ---
type TableItem = {
  paymentRequestId: string;
  parentUser?: string;
  userName: string;
  amount: number;
  transactionId?: string;
  imageDataUrl?: string;
  beneficiaryName?: string;
  bankName?: string;
  accountNumber?: string;
  ifsc?: string;
  upiId?: string;
  paymentRequestType: typeof CREDIT | typeof DEBIT | string | number;
  status: 1 | 2 | 3 | number;
  createdAt: string | number | Date;
  comment?: string;
  [k: string]: any;
};

type UserOption = { label: string; value: string };
type SortConfig = { key: string | null; direction: "ascending" | "descending" };

// --- Component ---
export default function DepositReqPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const { channelData } = useSocket();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // ---- pull everything from session (no localStorage) ----
  const userId = (session?.user as any)?.userId as string | undefined;
  const role = (session?.user as any)?.roleName as string | undefined;
  console.log("role for check", role);

  const token = (session as any)?.accessToken as string | undefined;
  const deviceType =
    ((session?.user as any)?.deviceType as string | undefined) ?? "web";
  const depositWithdrawAtsSystem =
    ((session?.user as any)?.depositWithdrawAtsSystem as boolean | undefined) ??
    false;

  const [userData, setUserData] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [open, setOpen] = React.useState(false);

  const [tableData, setTableData] = useState<TableItem[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);
  const itemsPerPage = 10;

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [paymentRequestId, setPaymentRequestId] = useState<string>("");
  const [transactionId, setTransactionId] = useState<string>("");
  const [paymentRequestType, setPaymentRequestType] = useState<
    typeof CREDIT | typeof DEBIT | string
  >("");
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isDisabled, setIsDisabled] = useState<boolean>(false);

  const todayIso = new Date().toISOString().split("T")[0];
  const [formFilterData, setFormFilterData] = useState<{
    startDate: string;
    endDate: string;
    user: UserOption | null | undefined;
    transactionId: string;
  }>({
    startDate: todayIso,
    endDate: todayIso,
    user: undefined,
    transactionId: "",
  });

  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: null,
    direction: "ascending",
  });

  useEffect(() => {
    document.title = "Deposit Payment Request";
    return () => {
      document.title = "Admin Panel";
    };
  }, []);

  // ----- Sorting -----
  const requestSort = (key: string) => {
    let direction: SortConfig["direction"] = "ascending";
    if (sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending";
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: string) => (
    <ArrowUpDown
      className={`h-4 w-4 inline align-[-2px] ml-1 ${
        sortConfig.key === key ? "opacity-100" : "opacity-40"
      }`}
    />
  );

  const sortedTableData = useMemo(() => {
    const sortable = [...tableData];
    if (!sortConfig.key) return sortable;

    sortable.sort((a, b) => {
      let aValue: any = a[sortConfig.key!];
      let bValue: any = b[sortConfig.key!];

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

    return sortable;
  }, [tableData, sortConfig]);

  // ----- Filters -----
  const handleFilterChange: React.ChangeEventHandler<HTMLInputElement> = (
    e
  ) => {
    const { name, value } = e.target;
    setFormFilterData((prev) => ({ ...prev, [name]: value }));
  };

  const handleUserPick = (opt: UserOption | null) => {
    setFormFilterData((p) => ({ ...p, user: opt || undefined }));
  };

  const handleFilter = () => {
    fetchDataFromAPI(0);
    setCurrentPage(1);
  };

  const handleReset = () => {
    setFormFilterData({
      startDate: "",
      endDate: "",
      user: undefined,
      transactionId: "",
    });
    setUserData([]);
    fetchDataFromAPI(1);
  };

  const handleImageClick = (url: string) => setSelectedImage(url);
  const closeImageModal = () => setSelectedImage(null);

  // ----- API (session-based) -----
  const fetchDataFromAPI = useCallback(
    (reset: 0 | 1 | 2) => {
      (async () => {
        try {
          if (!userId || !token) {
            toast.error("User not authenticated or missing ID/token.");
            return;
          }
          setLoading(true);

          const basePayload = {
            search: "",
            userId,
            transactionId:
              reset === 1 ? "" : formFilterData?.transactionId || "",
            startDate: reset === 1 ? "" : formFilterData?.startDate || "",
            endDate: reset === 1 ? "" : formFilterData?.endDate || "",
            paymentRequestType: CREDIT,
            page: currentPage,
            limit: itemsPerPage,
          };

          const encrypted = encryptData(basePayload);
          const data = JSON.stringify({ data: encrypted });

          const resp = await apiClient.post(LIST_PAYMENT_REQUEST, data);

          if (resp.data.statusCode == SUCCESS) {
            const rdata = decryptData(resp.data.data) as TableItem[];
            setTableData(rdata);
            setTotalPages(resp.data.meta.totalPage);
            setTotalCount(resp.data.meta.totalCount);
          } else {
            toast.error(resp.data.message);
          }
        } catch (err: any) {
          toast.error(err?.response?.data?.message || "Fetch failed");
          console.error("Fetch failed:", err);
        } finally {
          setLoading(false);
        }
      })();
    },
    [
      userId,
      token,
      deviceType,
      ADMIN_API_ENDPOINT,
      LIST_PAYMENT_REQUEST,
      currentPage,
      formFilterData?.transactionId,
      formFilterData?.startDate,
      formFilterData?.endDate,
    ]
  );

  const fetchOptions = useCallback(
    async (inputValue: string) => {
      if (!inputValue || inputValue.length < 3) {
        setUserData([]);
        return;
      }
      try {
        if (!token) {
          toast.error("Missing auth token.");
          return;
        }
        const payload = {
          filterType: 0,
          roleId: "",
          userId: "", // (server can infer from token if needed)
          status: 0,
          search: inputValue,
          page: 1,
          limit: 50,
        };
        const data = JSON.stringify({ data: encryptData(payload) });

        const resp = await apiClient.post(USER_SEARCH_LIST, data);

        if (resp.data.statusCode == SUCCESS) {
          const rdata = decryptData(resp.data.data) as {
            userName: string;
            userId: string;
          }[];
          const mapped: UserOption[] = rdata.map((u) => ({
            label: u.userName,
            value: u.userId,
          }));
          setUserData(mapped);
        } else {
          toast.error(resp.data.message);
        }
      } catch (err: any) {
        toast.error(err?.response?.data?.message || "Search failed");
        console.error(err);
      }
    },
    [ADMIN_API_ENDPOINT, USER_SEARCH_LIST, deviceType, token]
  );

  // ----- Status change modal -----
  const handleChangeStatus = (
    prId: string,
    prType: typeof CREDIT | typeof DEBIT | string,
    txnId?: string
  ) => {
    setTransactionId(txnId || "");
    setPaymentRequestId(prId);
    setPaymentRequestType(prType);
  };

  const closeStatusModal = () => {
    setPaymentRequestId("");
    setPaymentRequestType("");
    setFormData({});
  };

  const handleFormDataChange: React.ChangeEventHandler<
    HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
  > = (e) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
  };

  const handleChangeValueOption = async () => {
    const isConfirmed = window.confirm(
      "Are you sure you want to change the status?"
    );
    if (!isConfirmed) return;

    try {
      if (!token) {
        toast.error("Missing auth token.");
        return;
      }
      if (!formData.status) {
        toast.error("Please fill in all fields");
        return;
      }
      if (
        paymentRequestType === DEBIT &&
        +formData.status === ACTIVE &&
        !formData.transactionId
      ) {
        toast.error("Please fill in all fields");
        return;
      }

      const payload = {
        paymentRequestId,
        status: formData.status,
        transactionId: formData.transactionId,
        comment: formData.comment,
      };

      const data = JSON.stringify({ data: encryptData(payload) });
      setIsDisabled(true);

      const resp = await apiClient.post(PAYMENT_REQUEST_CHANGE_STATUS, data);

      if (resp.data.statusCode == SUCCESS) {
        const rdata = decryptData(resp.data.data) as {
          status: number;
          transactionId?: string;
          comment?: string;
        };

        setTableData((prev) =>
          prev.map((row) =>
            row.paymentRequestId === paymentRequestId
              ? {
                  ...row,
                  status: rdata.status,
                  transactionId: rdata.transactionId,
                  comment: rdata.comment,
                }
              : row
          )
        );

        setFormData({});
        closeStatusModal();
      } else {
        toast.error(resp.data.message);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Update failed");
      console.error(err);
    } finally {
      setIsDisabled(false);
    }
  };

  // ----- Realtime socket append/merge -----
  useEffect(() => {
    const pd = channelData && (channelData as any).paymentData;
    if (!pd) return;
    if (pd.paymentRequestType !== "credit") return;

    setTableData((prev) => {
      const exists = prev.some(
        (i) => i.paymentRequestId === pd.paymentRequestId
      );
      if (!exists) return [pd, ...prev];
      return prev.map((i) =>
        i.paymentRequestId === pd.paymentRequestId ? pd : i
      );
    });
  }, [channelData]);

  // initial + page change
  useEffect(() => {
    if (status === "loading") return; // wait for session
    if (status === "authenticated") fetchDataFromAPI(2);
    // optional: redirect if unauthenticated
    // if (status === "unauthenticated") router.push("/auth/login");
  }, [currentPage, fetchDataFromAPI, status]);

  // ----- Helpers -----
  const handlePageChange = (page: number) => setCurrentPage(page);
  const UserMenuRedirect = (href: string) => router.push(href);

  const LoadingView = (
    <div className="flex items-center justify-center h-[200px]">
      <div className="h-6 w-6 rounded-full border-2 border-current border-t-transparent animate-spin" />
    </div>
  );

  // --- Render ---
  return (
    <Fragment>
      <div
        className="px-4 sm:px-6 pb-6 pt-5"
        style={{ backgroundColor: "#181a20", minHeight: "100vh" }}
      >
        <div className="rounded-2xl ">
          {/* Filters */}
          <div className="px-4 sm:px-3 py-4 overflow-x-auto">
            <div className="flex flex-nowrap items-end gap-3 min-w-max">
              {/* Transaction ID */}
              <div className="shrink-0 w-[220px] xl:w-[280px]">
                <Label htmlFor="transactionId" style={{ color: "#fcd535" }}>
                  Transaction Id
                </Label>
                <Input
                  id="transactionId"
                  name="transactionId"
                  value={formFilterData.transactionId}
                  onChange={handleFilterChange}
                  placeholder="Transaction Id"
                  className="mt-1 truncate text-white placeholder-white border border-[#3a3f46] bg-[#2a2f36] focus-visible:ring-0 focus:border-[#fcd535]"
                />
              </div>

              {/* From Date */}
              <div className="shrink-0 w-[160px]">
                <Label htmlFor="startDate" style={{ color: "#fcd535" }}>
                  From Date
                </Label>
                <Input
                  id="startDate"
                  name="startDate"
                  type="date"
                  value={formFilterData.startDate}
                  onChange={handleFilterChange}
                  className="mt-1"
                  style={{
                    backgroundColor: "#2a2f36",
                    borderColor: "#3a3f46",
                    color: "#ffffff",
                  }}
                />
              </div>

              {/* To Date */}
              <div className="shrink-0 w-[160px]">
                <Label htmlFor="endDate" style={{ color: "#fcd535" }}>
                  To Date
                </Label>
                <Input
                  id="endDate"
                  name="endDate"
                  type="date"
                  value={formFilterData.endDate}
                  onChange={handleFilterChange}
                  className="mt-1"
                  style={{
                    backgroundColor: "#2a2f36",
                    borderColor: "#3a3f46",
                    color: "#ffffff",
                  }}
                />
              </div>

              {/* User Picker (Popover + live search) */}
              <div className="shrink-0 w-[280px]">
                <Label style={{ color: "#fcd535" }}>User Name</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-between mt-1"
                      style={{
                        backgroundColor: "#2a2f36",
                        borderColor: "#3a3f46",
                        color: "#ffffff",
                      }}
                    >
                      <span className="truncate">
                        {formFilterData.user?.label ?? "Type to search…"}
                      </span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    align="start"
                    className="w-[min(28rem,90vw)] p-2"
                    style={{
                      backgroundColor: "#2a2f36",
                      borderColor: "#3a3f46",
                    }}
                  >
                    <div className="flex items-center gap-2 p-2">
                      <Input
                        type="text"
                        placeholder="Search user (min 3 chars)…"
                        onChange={(e) => fetchOptions(e.target.value)}
                        style={{
                          backgroundColor: "#3a3f46",
                          borderColor: "#4a4f56",
                          color: "#ffffff",
                        }}
                      />
                      {formFilterData.user && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUserPick(null)}
                          style={{
                            backgroundColor: "#3a3f46",
                            borderColor: "#4a4f56",
                            color: "#ffffff",
                          }}
                        >
                          Clear
                        </Button>
                      )}
                    </div>
                    <ScrollArea
                      className="h-[260px] rounded-md border"
                      style={{ borderColor: "#3a3f46" }}
                    >
                      <ul
                        className="divide-y"
                        style={{ borderColor: "#3a3f46" }}
                      >
                        {userData.length === 0 && (
                          <li
                            className="p-3 text-sm"
                            style={{ color: "#848E9C" }}
                          >
                            Start typing to search…
                          </li>
                        )}
                        {userData.map((u) => (
                          <li key={u.value}>
                            <Button
                              variant="ghost"
                              className="w-full justify-start px-3 py-2 text-sm"
                              onClick={() => handleUserPick(u)}
                              style={{ color: "#ffffff" }}
                            >
                              {u.label}
                            </Button>
                          </li>
                        ))}
                      </ul>
                    </ScrollArea>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Buttons in-line */}
              <div className="shrink-0 flex items-end gap-2">
                <Button
                  onClick={() => setOpen(true)}
                  className="gap-2"
                  style={{ backgroundColor: "#fcd535", color: "#181a20" }}
                >
                  Create Deposit
                </Button>
                <Button
                  onClick={() => handleFilter()}
                  style={{ backgroundColor: "#fcd535", color: "#181a20" }}
                >
                  View
                </Button>
                <Button variant="destructive" onClick={handleReset}>
                  Clear
                </Button>
              </div>
            </div>
          </div>

          <Separator style={{ backgroundColor: "#3a3f46" }} />

          {/* Table */}
          {loading ? (
            LoadingView
          ) : (
            <div className="px-2 sm:px-4 py-4">
              <div
                className="overflow-hidden rounded-lg border"
                style={{ borderColor: "#3a3f46" }}
              >
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="sticky top-0 z-10">
                      <TableRow>
                        {(role === ADMIN || role === SUPER_ADMIN) && (
                          <TableHead
                            className="cursor-pointer"
                            onClick={() => requestSort("parentUser")}
                            style={{ color: "#fcd535" }}
                          >
                            Parent {getSortIcon("parentUser")}
                          </TableHead>
                        )}
                        <TableHead
                          className="cursor-pointer"
                          onClick={() => requestSort("userName")}
                          style={{ color: "#fcd535" }}
                        >
                          UserName {getSortIcon("userName")}
                        </TableHead>
                        <TableHead
                          className="cursor-pointer"
                          onClick={() => requestSort("amount")}
                          style={{ color: "#fcd535" }}
                        >
                          Amount {getSortIcon("amount")}
                        </TableHead>
                        <TableHead
                          className="cursor-pointer"
                          onClick={() => requestSort("transactionId")}
                          style={{ color: "#fcd535" }}
                        >
                          TransactionId {getSortIcon("transactionId")}
                        </TableHead>
                        <TableHead style={{ color: "#fcd535" }}>
                          Image
                        </TableHead>
                        <TableHead
                          className="cursor-pointer"
                          onClick={() => requestSort("beneficiaryName")}
                          style={{ color: "#fcd535" }}
                        >
                          Beneficiary Name {getSortIcon("beneficiaryName")}
                        </TableHead>
                        <TableHead
                          className="cursor-pointer"
                          onClick={() => requestSort("bankName")}
                          style={{ color: "#fcd535" }}
                        >
                          Bank Name {getSortIcon("bankName")}
                        </TableHead>
                        <TableHead
                          className="cursor-pointer"
                          onClick={() => requestSort("accountNumber")}
                          style={{ color: "#fcd535" }}
                        >
                          Account Number {getSortIcon("accountNumber")}
                        </TableHead>
                        <TableHead
                          className="cursor-pointer"
                          onClick={() => requestSort("ifsc")}
                          style={{ color: "#fcd535" }}
                        >
                          IFSC {getSortIcon("ifsc")}
                        </TableHead>
                        <TableHead
                          className="cursor-pointer"
                          onClick={() => requestSort("upiId")}
                          style={{ color: "#fcd535" }}
                        >
                          UPI ID {getSortIcon("upiId")}
                        </TableHead>
                        <TableHead
                          className="cursor-pointer"
                          onClick={() => requestSort("paymentRequestType")}
                          style={{ color: "#fcd535" }}
                        >
                          Payment Request Type{" "}
                          {getSortIcon("paymentRequestType")}
                        </TableHead>
                        {(role === "Master" ||
                          role === "Admin" ||
                          role === "superAdmin") && (
                          <TableHead
                            className="cursor-pointer text-center"
                            onClick={() => requestSort("status")}
                            style={{ color: "#fcd535" }}
                          >
                            Status {getSortIcon("status")}
                          </TableHead>
                        )}
                        <TableHead
                          className="cursor-pointer"
                          onClick={() => requestSort("createdAt")}
                          style={{ color: "#fcd535" }}
                        >
                          Created At {getSortIcon("createdAt")}
                        </TableHead>
                        <TableHead
                          className="cursor-pointer"
                          onClick={() => requestSort("comment")}
                          style={{ color: "#fcd535" }}
                        >
                          Comment {getSortIcon("comment")}
                        </TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {sortedTableData.map((item, idx) => (
                        <TableRow key={idx} style={{ borderColor: "#3a3f46" }}>
                          {(role === ADMIN || role === SUPER_ADMIN) && (
                            <TableCell
                              className="whitespace-nowrap"
                              style={{ color: "#ffffff" }}
                            >
                              {item.parentUser}
                            </TableCell>
                          )}

                          <TableCell
                            className="whitespace-nowrap"
                            style={{ color: "#ffffff" }}
                          >
                            {item.userName}
                          </TableCell>
                          <TableCell
                            className="whitespace-nowrap"
                            style={{ color: "#ffffff" }}
                          >
                            {item.amount}
                          </TableCell>
                          <TableCell
                            className="whitespace-nowrap"
                            style={{ color: "#ffffff" }}
                          >
                            {item.transactionId}
                          </TableCell>

                          <TableCell className="whitespace-nowrap">
                            {item.imageDataUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={item.imageDataUrl}
                                alt="Receipt"
                                className="h-16 w-24 rounded border cursor-pointer object-cover"
                                onClick={() =>
                                  handleImageClick(item.imageDataUrl!)
                                }
                                style={{ borderColor: "#3a3f46" }}
                              />
                            ) : (
                              <span
                                className="text-xs"
                                style={{ color: "#848E9C" }}
                              >
                                —
                              </span>
                            )}
                          </TableCell>

                          <TableCell className="max-w-[220px]">
                            <TooltipProvider delayDuration={250}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span
                                    className="truncate inline-block max-w-full"
                                    style={{ color: "#fcd535" }}
                                  >
                                    {item.beneficiaryName}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent
                                  side="top"
                                  style={{
                                    backgroundColor: "#2a2f36",
                                    color: "#ffffff",
                                  }}
                                >
                                  {item.beneficiaryName}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableCell>

                          <TableCell className="max-w-[220px]">
                            <TooltipProvider delayDuration={250}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span
                                    className="truncate inline-block max-w-full"
                                    style={{ color: "#fcd535" }}
                                  >
                                    {item.bankName}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent
                                  side="top"
                                  style={{
                                    backgroundColor: "#2a2f36",
                                    color: "#ffffff",
                                  }}
                                >
                                  {item.bankName}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableCell>

                          <TableCell
                            className="whitespace-nowrap"
                            style={{ color: "#ffffff" }}
                          >
                            {item.accountNumber}
                          </TableCell>
                          <TableCell
                            className="whitespace-nowrap"
                            style={{ color: "#ffffff" }}
                          >
                            {item.ifsc}
                          </TableCell>

                          <TableCell className="max-w-[220px]">
                            <TooltipProvider delayDuration={250}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span
                                    className="truncate inline-block max-w-full"
                                    style={{ color: "#fcd535" }}
                                  >
                                    {item.upiId}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent
                                  side="top"
                                  style={{
                                    backgroundColor: "#2a2f36",
                                    color: "#ffffff",
                                  }}
                                >
                                  {item.upiId}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableCell>

                          <TableCell
                            className="whitespace-nowrap"
                            style={{ color: "#ffffff" }}
                          >
                            {String(item.paymentRequestType)}
                          </TableCell>

                          {(role === "Master" ||
                            role === "Admin" ||
                            role === "superAdmin") && (
                            <TableCell className="text-center whitespace-nowrap">
                              {item.status == 1 ? (
                                <Badge
                                  variant="secondary"
                                  className="gap-1"
                                  style={{
                                    backgroundColor: "#2a2f36",
                                    color: "#ffffff",
                                  }}
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5" />{" "}
                                  Approved
                                </Badge>
                              ) : item.status == 2 ? (
                                <Badge
                                  variant="secondary"
                                  className="gap-1"
                                  style={{
                                    backgroundColor: "#2a2f36",
                                    color: "#ffffff",
                                  }}
                                >
                                  <Clock3 className="h-3.5 w-3.5" /> Pending
                                </Badge>
                              ) : (
                                <Badge variant="destructive" className="gap-1">
                                  <XCircle className="h-3.5 w-3.5" />{" "}
                                  Dis-Approved
                                </Badge>
                              )}

                              {item.status == 2 &&
                              role === "Admin" &&
                              depositWithdrawAtsSystem === false ? (
                                <div className="mt-1">
                                  <Button
                                    variant="link"
                                    className="px-0 h-auto"
                                    onClick={() =>
                                      handleChangeStatus(
                                        item.paymentRequestId,
                                        String(item.paymentRequestType),
                                        item.transactionId
                                      )
                                    }
                                    style={{ color: "#fcd535" }}
                                  >
                                    Change Status
                                  </Button>
                                </div>
                              ) : null}
                            </TableCell>
                          )}

                          <TableCell className="whitespace-nowrap">
                            <TooltipProvider delayDuration={250}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span
                                    className="truncate inline-block max-w-[220px]"
                                    style={{ color: "#ffffff" }}
                                  >
                                    {formatDateTime(item.createdAt)}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent
                                  side="top"
                                  style={{
                                    backgroundColor: "#2a2f36",
                                    color: "#ffffff",
                                  }}
                                >
                                  {formatDateTime(item.createdAt)}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableCell>

                          <TableCell
                            className="max-w-[280px] truncate"
                            style={{ color: "#ffffff" }}
                          >
                            {item.comment}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Pagination */}
              <div className="mt-4 flex justify-end">
                <nav aria-label="pagination">
                  <ul className="inline-flex items-center gap-1">
                    <li>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1"
                        onClick={() =>
                          currentPage > 1 && handlePageChange(currentPage - 1)
                        }
                        disabled={currentPage === 1}
                        style={{
                          backgroundColor: "#2a2f36",
                          borderColor: "#3a3f46",
                          color: "#ffffff",
                        }}
                      >
                        <ChevronLeft className="h-4 w-4" /> Previous
                      </Button>
                    </li>
                    {Array.from({ length: totalPages }).map((_, i) => {
                      const page = i + 1;
                      const active = currentPage === page;
                      return (
                        <li key={page}>
                          <Button
                            variant={active ? "default" : "outline"}
                            size="sm"
                            style={
                              active
                                ? {
                                    backgroundColor: "#fcd535",
                                    color: "#181a20",
                                  }
                                : {
                                    backgroundColor: "#2a2f36",
                                    borderColor: "#3a3f46",
                                    color: "#ffffff",
                                  }
                            }
                            onClick={() => handlePageChange(page)}
                          >
                            {page}
                          </Button>
                        </li>
                      );
                    })}
                    <li>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1"
                        onClick={() =>
                          currentPage < totalPages &&
                          handlePageChange(currentPage + 1)
                        }
                        disabled={
                          currentPage === totalPages || totalPages === 0
                        }
                        style={{
                          backgroundColor: "#2a2f36",
                          borderColor: "#3a3f46",
                          color: "#ffffff",
                        }}
                      >
                        Next <ChevronRight className="h-4 w-4" />
                      </Button>
                    </li>
                  </ul>
                </nav>
              </div>
            </div>
          )}
        </div>
      </div>
      <CreateDepositDialog
        open={open}
        onOpenChange={setOpen}
        onSuccess={() => {
          // re-fetch your table here if needed
        }}
      />
      {/* Change Status (Dialog) */}
      <Dialog
        open={!!paymentRequestId}
        onOpenChange={(o) => !o && closeStatusModal()}
      >
        <DialogContent
          className="max-w-[520px]"
          style={{ backgroundColor: "#1e2329" }}
        >
          <DialogHeader>
            <DialogTitle style={{ color: "#fcd535" }}>
              Change Status
            </DialogTitle>
          </DialogHeader>

          {paymentRequestType === CREDIT && (
            <div className="space-y-1">
              <Label style={{ color: "#848E9C" }}>Transaction Id</Label>
              <Input
                type="text"
                disabled
                value={transactionId}
                className="bg-gray-100"
                style={{
                  backgroundColor: "#2a2f36",
                  borderColor: "#3a3f46",
                  color: "#ffffff",
                }}
              />
            </div>
          )}

          <div className="space-y-1">
            <Label style={{ color: "#848E9C" }}>
              Select Status <span className="text-red-600">*</span>
            </Label>
            <select
              className="w-full rounded-md border px-3 py-2 text-sm outline-none"
              name="status"
              onChange={handleFormDataChange}
              value={formData.status ?? ""}
              style={{
                backgroundColor: "#2a2f36",
                borderColor: "#3a3f46",
                color: "#ffffff",
              }}
            >
              <option value="">Select Status</option>
              <option value="1">Approved</option>
              <option value="3">Dis-Approved</option>
            </select>
          </div>

          {paymentRequestType === DEBIT && (
            <div className="space-y-1">
              <Label style={{ color: "#848E9C" }}>Transaction Id</Label>
              <Input
                id="transactionId"
                name="transactionId"
                type="text"
                value={formData.transactionId ?? ""}
                placeholder="Transaction Id"
                onChange={handleFormDataChange}
                style={{
                  backgroundColor: "#2a2f36",
                  borderColor: "#3a3f46",
                  color: "#ffffff",
                }}
              />
            </div>
          )}

          <div className="space-y-1">
            <Label style={{ color: "#848E9C" }}>Comment</Label>
            <textarea
              className="w-full rounded-md border px-3 py-2 text-sm outline-none"
              id="comment"
              name="comment"
              value={formData.comment ?? ""}
              placeholder="Comment"
              onChange={handleFormDataChange}
              style={{
                backgroundColor: "#2a2f36",
                borderColor: "#3a3f46",
                color: "#ffffff",
              }}
            />
          </div>

          <DialogFooter>
            <Button
              style={{ backgroundColor: "#fcd535", color: "#181a20" }}
              onClick={handleChangeValueOption}
              disabled={isDisabled}
            >
              Save changes
            </Button>
            <Button variant="destructive" onClick={closeStatusModal}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Modal */}
      <Dialog
        open={!!selectedImage}
        onOpenChange={(o) => !o && closeImageModal()}
      >
        <DialogContent
          className="max-w-[90vw]"
          style={{ backgroundColor: "#1e2329" }}
        >
          <div className="p-2 flex justify-end" />
          {selectedImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={selectedImage}
              alt="Large View"
              className="max-h-[80vh] max-w-[80vw] object-contain mx-auto"
            />
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={closeImageModal}
              style={{
                backgroundColor: "#2a2f36",
                borderColor: "#3a3f46",
                color: "#ffffff",
              }}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Fragment>
  );
}
