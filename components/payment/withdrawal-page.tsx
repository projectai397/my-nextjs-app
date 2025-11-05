"use client";

import apiClient from "@/lib/axiosInstance";
import * as React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import {
  ACTIVE,
  ADMIN_API_ENDPOINT,
  ATS_METHOD_LIST,
  ATS_TRANSACTION_STATUS_CHECK,
  CREDIT,
  DEBIT,
  DELETED,
  LIST_PAYMENT_REQUEST,
  PAYMENT_REQUEST_CHANGE_STATUS,
  SEND_TO_ATS,
  SEND_TO_WITHDRAWAL,
  SUCCESS,
  USER_SEARCH_LIST,
} from "@/constant/index";

import { useSocket } from "@/components/socket/socketContext";
import { encryptData, decryptData } from "@/hooks/crypto";
import { toastError, toastSuccess } from "@/hooks/toastMsg";
import { formatDateTime } from "@/hooks/dateUtils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import WithdrawForm from "@/components/payment/ChildWithdraw";

/** ---------- Types ---------- */
type UserOption = { label: string; value: string };

type TableItem = {
  userName: string;
  amount: number | string;
  transactionId: string;
  imageDataUrl?: string;
  beneficiaryName?: string;
  bankName?: string;
  accountNumber?: string | number;
  ifsc?: string;
  upiId?: string;
  paymentRequestType: typeof CREDIT | typeof DEBIT | string | number;
  balance?: number | string;
  status: number; // 1=Approved, 2=Pending, 3=Dis-Approved
  pendingApprovalForAtsSystem?: boolean;
  atsMethod?: string;
  createdAt: string | number | Date;
  comment?: string;
  paymentRequestId: string;
  exchangeName?: string;
  symbolName?: string;
  symbolTitle?: string;
  masterName?: string;
};

type SortConfig = {
  key: keyof TableItem | "script" | null;
  direction: "ascending" | "descending";
};

type ChannelData = { paymentData?: TableItem };

const ITEMS_PER_PAGE = 10;

export default function WithdrawReqPage() {
  const { channelData } = useSocket();
  const router = useRouter();
  const { data: session, status } = useSession();

  // ---- derive everything only from session ----
  const sessionUser = session?.user as any | undefined;
  const token: string | undefined = (session as any)?.accessToken;
  const userId: string | undefined = sessionUser?.userId;
  const role: string | undefined = sessionUser?.roleName;
  const deviceType: string = sessionUser?.deviceType ?? "web";
  const depositWithdrawAtsSystem: boolean =
    !!sessionUser?.depositWithdrawAtsSystem;

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [userData, setUserData] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // ✅ single state for popup
  const [withdrawOpen, setWithdrawOpen] = useState(false);

  const [tableData, setTableData] = useState<TableItem[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [paymentRequestId, setPaymentRequestId] = useState<string>("");
  const [transactionId, setTransactionId] = useState<string>("");
  const [paymentRequestType, setPaymentRequestType] = useState<string | number>(
    ""
  );

  const [formData, setFormData] = useState<{
    transactionId?: string;
    status?: string;
    comment?: string;
  }>({});

  const today = new Date().toISOString().split("T")[0];
  const [formFilterData, setFormFilterData] = useState<{
    startDate: string;
    endDate: string;
    user: UserOption | null | any;
    transactionId: string;
    userName?: string;
  }>({
    startDate: today,
    endDate: today,
    user: [],
    transactionId: "",
    userName: "",
  });

  const [isDisabled, setIsDisabled] = useState<boolean>(false);
  const [atsMethodCodes, setAtsMethodCodes] = useState<string[]>([]);

  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: null,
    direction: "ascending",
  });

  const authHeaders = () => ({
    Authorization: token || "",
    "Content-Type": "application/json",
    deviceType: deviceType || "",
  });

  const requestSort = (key: SortConfig["key"]) => {
    setSortConfig((prev) => ({
      key,
      direction:
        prev.key === key && prev.direction === "ascending"
          ? "descending"
          : "ascending",
    }));
  };

  const sortedTableData = useMemo(() => {
    const items = [...tableData];
    if (sortConfig.key !== null) {
      items.sort((a, b) => {
        let aValue: any;
        let bValue: any;

        if (sortConfig.key === "script") {
          const getDisplayName = (item: TableItem) => {
            if ((item.exchangeName || "").toLowerCase() === "usstock")
              return item.symbolName;
            if ((item.exchangeName || "").toLowerCase() === "ce/pe")
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
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }
        if (aValue < bValue)
          return sortConfig.direction === "ascending" ? -1 : 1;
        if (aValue > bValue)
          return sortConfig.direction === "ascending" ? 1 : -1;
        return 0;
      });
    }
    return items;
  }, [tableData, sortConfig]);

  const getSortIcon = (key: SortConfig["key"]) =>
    sortConfig.key !== key ? (
      <span className="text-[#848E9C]">↕</span>
    ) : sortConfig.direction === "ascending" ? (
      <span className="text-[#848E9C]">↑</span>
    ) : (
      <span className="text-[#848E9C]">↓</span>
    );

  useEffect(() => {
    document.title = "Withdraw Payment Request";
    return () => {
      document.title = "Admin Panel";
    };
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  const handleFilter = async () => {
    setCurrentPage(1);
    await fetchDataFromAPI(2, 1);
  };

  const handleReset = async () => {
    setFormFilterData({
      user: [],
      transactionId: "",
      startDate: "",
      endDate: "",
      userName: "",
    } as any);
    setUserData([]);
    setCurrentPage(1);
    await fetchDataFromAPI(1, 1);
  };

  const handleImageClick = (imageUrl: string) => setSelectedImage(imageUrl);
  const closeModal = () => setSelectedImage(null);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((s) => ({ ...s, [name]: value }));
  };

  const buildListPayload = (page: number, reset?: number) => {
    const common = {
      search: "",
      userId,
      transactionId: reset === 1 ? "" : formFilterData?.transactionId || "",
      startDate: reset === 1 ? "" : formFilterData?.startDate || "",
      endDate: reset === 1 ? "" : formFilterData?.endDate || "",
      paymentRequestType: DEBIT,
      status: [1, 2, 4],
      page,
      limit: ITEMS_PER_PAGE,
    };
    return JSON.stringify({ data: encryptData(common) });
  };

  const fetchDataFromAPI = async (reset?: number, pageOverride?: number) => {
    if (!userId) return;
    setLoading(true);
    try {
      const page = pageOverride ?? currentPage;
      const payload = buildListPayload(page, reset);
      const response = await apiClient.post(LIST_PAYMENT_REQUEST, payload);

      if (response.data.statusCode == SUCCESS) {
        const rdata: TableItem[] = decryptData(response.data.data);
        setTableData(rdata);
        setTotalPages(response.data.meta.totalPage);
        setTotalCount(response.data.meta.totalCount);
      } else {
        toastError(response.data.message);
      }
    } catch (error: any) {
      toastError(error?.response?.data?.message || "Something went wrong");
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
    fetchDataFromAPI(2, pageNumber);
  };

  const handleChangeStatus = (
    paymentRequestIdV: string,
    paymentRequestTypeV: string | number,
    transactionIdV: string
  ) => {
    setTransactionId(transactionIdV);
    setPaymentRequestId(paymentRequestIdV);
    setPaymentRequestType(paymentRequestTypeV);
  };

  const handleSendToAts = async (paymentRequestIdV: string) => {
    if (!confirm("Are you sure you want to send this to ATS?")) return;
    if (!paymentRequestIdV)
      return toastError(
        "We couldn't find the payment request in the system at this time."
      );

    setLoading(true);
    try {
      const payload = JSON.stringify({
        data: encryptData({ paymentRequestId: paymentRequestIdV }),
      });
      const response = await apiClient.post(SEND_TO_ATS, payload);

      if (response.data.statusCode == SUCCESS) {
        const rdata = decryptData(response.data.data) as {
          pendingApprovalForAtsSystem: boolean;
        };
        const nTableData = tableData.map((item) =>
          item.paymentRequestId === paymentRequestIdV
            ? {
                ...item,
                pendingApprovalForAtsSystem: rdata.pendingApprovalForAtsSystem,
              }
            : item
        );
        setTableData(nTableData);
      } else {
        toastError(response.data.message);
      }
    } catch (error: any) {
      toastError(error?.response?.data?.message || "Something went wrong");
      console.error("SendToATS error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendToWithdrawal = async (paymentRequestIdV: string) => {
    if (!confirm("Are you sure you want to send this to withdrawal?")) return;
    if (!paymentRequestIdV)
      return toastError(
        "We couldn't find the payment request in the system at this time."
      );

    setLoading(true);
    try {
      const payload = JSON.stringify({
        data: encryptData({ paymentRequestId: paymentRequestIdV }),
      });
      const response = await apiClient.post(SEND_TO_WITHDRAWAL, payload);

      if (response.data.statusCode == SUCCESS) {
        const rdata = decryptData(response.data.data) as {
          pendingApprovalForAtsSystem: boolean;
          atsMethod?: string;
        };
        const nTableData = tableData.map((item) =>
          item.paymentRequestId === paymentRequestIdV
            ? {
                ...item,
                pendingApprovalForAtsSystem: rdata.pendingApprovalForAtsSystem,
                atsMethod: rdata.atsMethod,
              }
            : item
        );
        setTableData(nTableData);
      } else {
        toastError(response.data.message);
      }
    } catch (error: any) {
      toastError(error?.response?.data?.message || "Something went wrong");
      console.error("SendToWithdrawal error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckWithdrawalStatus = async (paymentRequestIdV: string) => {
    if (!paymentRequestIdV)
      return toastError(
        "We couldn't find the payment request in the system at this time."
      );
    setLoading(true);
    try {
      const payload = JSON.stringify({
        data: encryptData({ paymentRequestId: paymentRequestIdV }),
      });
      const response = await apiClient.post(
        ATS_TRANSACTION_STATUS_CHECK,
        payload
      );

      if (response.data.statusCode == SUCCESS) {
        const rdata = decryptData(response.data.data) as {
          pendingApprovalForAtsSystem: boolean;
          atsMethod?: string;
          status: number;
        };
        const nTableData = tableData.map((item) =>
          item.paymentRequestId === paymentRequestIdV
            ? {
                ...item,
                pendingApprovalForAtsSystem: rdata.pendingApprovalForAtsSystem,
                atsMethod: rdata.atsMethod,
                status: rdata.status,
              }
            : item
        );
        setTableData(nTableData);
      } else {
        toastError(response.data.message);
      }
    } catch (error: any) {
      toastError(error?.response?.data?.message || "Something went wrong");
      console.error("CheckWithdrawalStatus error:", error);
    } finally {
      setLoading(false);
    }
  };

  const onClose = () => {
    setPaymentRequestId("");
    setPaymentRequestType("");
    setFormData({});
  };

  const handleChangeValueOption = (
    passedPaymentRequestId: string = paymentRequestId,
    passedTransactionId: string | undefined = formData.transactionId,
    passedPaymentStatus: string | undefined = formData.status,
    passedComment: string | undefined = formData.comment
  ) => {
    const isConfirmed = window.confirm(
      "Are you sure you want to change the status?"
    );
    if (!isConfirmed) return;

    try {
      if (!passedPaymentStatus) return toastError("Please fill in all fields");
      if (
        paymentRequestType === DEBIT &&
        Number(passedPaymentStatus) === ACTIVE &&
        !formData.transactionId
      ) {
        return toastError("Please fill in all fields");
      }

      const data = encryptData({
        paymentRequestId: passedPaymentRequestId,
        status: passedPaymentStatus,
        transactionId: passedTransactionId,
        comment: passedComment,
      });
      const payload = JSON.stringify({ data });
      setIsDisabled(true);

      apiClient
        .post(ADMIN_API_ENDPOINT + PAYMENT_REQUEST_CHANGE_STATUS, payload, {
          headers: authHeaders(),
        })
        .then((response) => {
          if (response.data.statusCode == SUCCESS) {
            const rdata = decryptData(response.data.data) as {
              status: number;
              transactionId?: string;
              comment?: string;
            };
            setPaymentRequestId("");
            setPaymentRequestType("");
            const nTableData = tableData.map((item) =>
              item.paymentRequestId === passedPaymentRequestId
                ? {
                    ...item,
                    status: rdata.status,
                    transactionId: rdata.transactionId || item.transactionId,
                    comment: rdata.comment || item.comment,
                  }
                : item
            );
            setFormData({});
            setTableData(nTableData);
            setIsDisabled(false);
            toastSuccess("Status updated");
          } else {
            setIsDisabled(false);
            toastError(response.data.message);
          }
        })
        .catch((error) => {
          setIsDisabled(false);
          toastError(
            (error as any)?.response?.data?.message || "Something went wrong"
          );
          console.error("ChangeStatus error:", error);
        });
    } catch (error) {
      console.error("ChangeStatus error:", error);
    }
  };

  const fetchOptions = async (inputValue: string) => {
    if (inputValue && inputValue.length > 2) {
      try {
        const payload = JSON.stringify({
          data: encryptData({
            filterType: 0,
            roleId: "",
            userId: "",
            status: 0,
            search: inputValue,
            page: 1,
            limit: 50,
          }),
        });

        const response = await apiClient.post(USER_SEARCH_LIST, payload);

        if (response.data.statusCode === SUCCESS) {
          const rdata = decryptData(response.data.data) as Array<{
            userName: string;
            userId: string;
          }>;

          const mapped = rdata.map((item) => ({
            label: item.userName,
            value: item.userId,
          }));

          setUserData(mapped);
        } else {
          toastError(response.data.message);
        }
      } catch (error: any) {
        toastError(error?.response?.data?.message || "Something went wrong");
        console.error("User search error:", error);
      }
    } else {
      setUserData([]);
    }
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormFilterData((s) => ({ ...s, [name]: value }));
  };

  const getAtsMethodList = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(ATS_METHOD_LIST);
      if (response.data.statusCode == SUCCESS) {
        const rdata = decryptData(response.data.data) as Array<{
          code: string;
        }>;
        setAtsMethodCodes(rdata.map((x) => x.code));
      } else {
        toastError(response.data.message);
      }
    } catch (error: any) {
      toastError(error?.response?.data?.message || "Something went wrong");
      console.error("ATS method list error:", error);
    } finally {
      setLoading(false);
    }
  };

  // realtime: socket payloads
  useEffect(() => {
    if (!channelData) return;
    const cd = channelData as ChannelData;
    if (!cd.paymentData) return;

    if (cd.paymentData.paymentRequestType === DEBIT) {
      const idExists = tableData.some(
        (item) => item.paymentRequestId === cd.paymentData!.paymentRequestId
      );
      if (!idExists) {
        setTableData([cd.paymentData, ...tableData]);
        audioRef.current?.pause();
        audioRef.current?.play().catch(() => {});
      } else {
        setTableData((prev) =>
          prev.map((x) =>
            x.paymentRequestId === cd.paymentData!.paymentRequestId
              ? cd.paymentData!
              : x
          )
        );
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelData]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetchDataFromAPI(2, currentPage);
    getAtsMethodList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, status]);

  const getStatusBadge = (status: number) => {
    switch (status) {
      case 1:
        return <Badge className="bg-green-900 text-green-300">Approved</Badge>;
      case 2:
        return <Badge className="bg-yellow-900 text-yellow-300">Pending</Badge>;
      case 3:
        return <Badge className="bg-red-900 text-red-300">Dis-Approved</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-[#181a20] p-6">
        <div className="max-w-full mx-auto">
          <div className="flex justify-center items-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#fcd535]" />
          </div>
        </div>
      </div>
    );
  }

  // Optional: preselect user for the dialog; set to null for now
  const txUser: { userId: string; name: string; phone?: string } | null = null;

  return (
    <div
      className="px-4 sm:px-6 pb-6 pt-5"
      style={{ backgroundColor: "#181a20", minHeight: "100vh" }}
    >
      <audio ref={audioRef} src="/notification.mp3" preload="auto" hidden />

      <div className="max-w-full mx-auto space-y-6">
        {/* Filters */}
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[220px] xl:min-w-[280px]">
              <Label
                htmlFor="transactionId"
                className="flex items-center gap-2 text-[#fcd535]"
              >
                Transaction ID
              </Label>
              <Input
                id="transactionId"
                name="transactionId"
                type="text"
                value={formFilterData.transactionId}
                onChange={handleFilterChange}
                placeholder="Enter transaction ID"
                className="mt-1 truncate text-white placeholder-white border border-[#3a3f46] bg-[#2a2f36] focus-visible:ring-0 focus:border-[#fcd535]"
              />
            </div>

            <div className="flex-1 min-w-[160px]">
              <Label
                htmlFor="startDate"
                className="flex items-center gap-2 text-[#fcd535]"
              >
                From Date
              </Label>
              <Input
                id="startDate"
                name="startDate"
                type="date"
                value={formFilterData.startDate}
                onChange={handleFilterChange}
                className="mt-1 truncate text-white placeholder-white border border-[#3a3f46] bg-[#2a2f36] focus-visible:ring-0 focus:border-[#fcd535]"
              />
            </div>
            <div className="flex-1 min-w-[160px]">
              <Label
                htmlFor="endDate"
                className="flex items-center gap-2 text-[#fcd535]"
              >
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

            <div className="flex-1 min-w-[220px] xl:min-w-[280px]">
              <Label
                htmlFor="userName"
                className="flex items-center gap-2 text-[#fcd535]"
              >
                User Name
              </Label>
              <Input
                id="userName"
                name="userName"
                type="text"
                value={formFilterData.userName}
                onChange={handleFilterChange}
                placeholder="Type to search..."
                className="mt-1 truncate text-white placeholder-white border border-[#3a3f46] bg-[#2a2f36] focus-visible:ring-0 focus:border-[#fcd535]"
              />
            </div>

            <Button variant="destructive" onClick={handleReset}>
              Clear
            </Button>
            <Button
              style={{ backgroundColor: "#fcd535", color: "#181a20" }}
              onClick={handleFilter}
            >
              View
            </Button>

            {/* ✅ open dialog */}
            <Button
              onClick={() => setWithdrawOpen(true)}
              className="bg-[#fcd535] text-[#181a20] hover:opacity-90"
            >
              + Withdraw
            </Button>
          </div>
        </CardContent>

        <Separator style={{ backgroundColor: "#3a3f46" }} />

        {/* Table */}
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#fcd535]" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-md border border-gray-700 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead
                        className="cursor-pointer whitespace-nowrap"
                        onClick={() => requestSort("userName")}
                      >
                        <div className="flex items-center gap-2 text-[#fcd535]">
                          UserName {getSortIcon("userName")}
                        </div>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer whitespace-nowrap"
                        onClick={() => requestSort("amount")}
                      >
                        <div className="flex items-center gap-2 text-[#fcd535]">
                          Amount {getSortIcon("amount")}
                        </div>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer whitespace-nowrap"
                        onClick={() => requestSort("transactionId")}
                      >
                        <div className="flex items-center gap-2 text-[#fcd535]">
                          TransactionId {getSortIcon("transactionId")}
                        </div>
                      </TableHead>
                      <TableHead className="whitespace-nowrap text-[#fcd535] ">
                        Image
                      </TableHead>
                      <TableHead
                        className="cursor-pointer whitespace-nowrap text-[#fcd535]"
                        onClick={() => requestSort("beneficiaryName")}
                      >
                        <div className="flex items-center gap-2 text-[#fcd535]">
                          Beneficiary Name {getSortIcon("beneficiaryName")}
                        </div>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer whitespace-nowrap"
                        onClick={() => requestSort("bankName")}
                      >
                        <div className="flex items-center gap-2 text-[#fcd535]">
                          Bank Name {getSortIcon("bankName")}
                        </div>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer whitespace-nowrap text-right"
                        onClick={() => requestSort("accountNumber")}
                      >
                        <div className="flex items-center gap-2 justify-end text-[#fcd535] ">
                          Account Number {getSortIcon("accountNumber")}
                        </div>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer whitespace-nowrap"
                        onClick={() => requestSort("ifsc")}
                      >
                        <div className="flex items-center gap-2 text-[#fcd535]">
                          IFSC {getSortIcon("ifsc")}
                        </div>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer whitespace-nowrap"
                        onClick={() => requestSort("upiId")}
                      >
                        <div className="flex items-center gap-2 text-[#fcd535]">
                          UPI ID {getSortIcon("upiId")}
                        </div>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer whitespace-nowrap"
                        onClick={() => requestSort("paymentRequestType")}
                      >
                        <div className="flex items-center gap-2 text-[#fcd535]">
                          Payment Request Type{" "}
                          {getSortIcon("paymentRequestType")}
                        </div>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer whitespace-nowrap text-right"
                        onClick={() => requestSort("balance")}
                      >
                        <div className="flex items-center gap-2 justify-end text-[#fcd535]">
                          Balance {getSortIcon("balance")}
                        </div>
                      </TableHead>
                      {(role === "Master" ||
                        role === "Admin" ||
                        role === "superAdmin") && (
                        <TableHead
                          className="cursor-pointer whitespace-nowrap text-center"
                          onClick={() => requestSort("status")}
                        >
                          <div className="flex items-center gap-2 justify-center text-[#fcd535]">
                            Status {getSortIcon("status")}
                          </div>
                        </TableHead>
                      )}
                      {role === "Master" &&
                        depositWithdrawAtsSystem === true && (
                          <TableHead className="whitespace-nowrap text-center text-[#fcd535] ">
                            Send to ATS
                          </TableHead>
                        )}
                      <TableHead
                        className="cursor-pointer whitespace-nowrap"
                        onClick={() => requestSort("createdAt")}
                      >
                        <div className="flex items-center gap-2 text-[#fcd535]">
                          Created At {getSortIcon("createdAt")}
                        </div>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer whitespace-nowrap"
                        onClick={() => requestSort("comment")}
                      >
                        <div className="flex items-center gap-2 text-[#fcd535]">
                          Comment {getSortIcon("comment")}
                        </div>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedTableData.map((item, index) => (
                      <TableRow key={index} className="border-gray-700">
                        <TableCell className="font-medium whitespace-nowrap text-white">
                          {item.userName}
                        </TableCell>
                        <TableCell className="text-right font-mono whitespace-nowrap text-white">
                          {typeof item.amount === "number"
                            ? item.amount.toLocaleString()
                            : item.amount}
                        </TableCell>
                        <TableCell className="font-mono text-sm whitespace-nowrap text-white">
                          {item.transactionId}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {item.imageDataUrl ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <img
                                    src={item.imageDataUrl}
                                    className="w-12 h-12 rounded-md object-cover cursor-pointer border border-gray-600"
                                    onClick={() =>
                                      handleImageClick(item.imageDataUrl!)
                                    }
                                    alt="Proof"
                                  />
                                </TooltipTrigger>
                                <TooltipContent className="bg-gray-800 text-white border-gray-700">
                                  <p>Click to view full image</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : (
                            <span className="text-white">No image</span>
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-white">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="truncate max-w-[120px] block">
                                  {item.beneficiaryName}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent className="bg-gray-800 text-white border-gray-700">
                                <p>{item.beneficiaryName}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-white">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="truncate max-w-[120px] block">
                                  {item.bankName}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent className="bg-gray-800 text-white border-gray-700">
                                <p>{item.bankName}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                        <TableCell className="text-right font-mono whitespace-nowrap text-white">
                          {item.accountNumber}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-white">
                          {item.ifsc}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-white">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="truncate max-w-[120px] block">
                                  {item.upiId}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent className="bg-gray-800 text-white border-gray-700">
                                <p>{item.upiId}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <Badge
                            variant={
                              item.paymentRequestType === CREDIT
                                ? "default"
                                : "secondary"
                            }
                            className="bg-gray-700 text-white"
                          >
                            {String(item.paymentRequestType).toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono whitespace-nowrap text-white">
                          {item.balance
                            ? parseFloat(String(item.balance)).toFixed(2)
                            : "0.00"}
                        </TableCell>

                        {(role === "Master" ||
                          role === "Admin" ||
                          role === "superAdmin") && (
                          <TableCell className="text-center whitespace-nowrap">
                            <div className="space-y-1">
                              {getStatusBadge(item.status)}
                              {item.status == 2 &&
                                role === "Master" &&
                                !depositWithdrawAtsSystem && (
                                  <div className="mt-1">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() =>
                                        handleChangeStatus(
                                          item.paymentRequestId,
                                          item.paymentRequestType,
                                          item.transactionId
                                        )
                                      }
                                      className="text-xs bg-gray-700 border-gray-600 text-white"
                                    >
                                      Change Status
                                    </Button>
                                  </div>
                                )}
                              {item.status == 2 &&
                                role === "Master" &&
                                depositWithdrawAtsSystem &&
                                item.pendingApprovalForAtsSystem === false && (
                                  <div className="mt-1">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() =>
                                        handleChangeValueOption(
                                          item.paymentRequestId,
                                          item.transactionId,
                                          String(DELETED),
                                          "Rejected"
                                        )
                                      }
                                      disabled={isDisabled}
                                      className="text-xs bg-gray-700 border-gray-600 text-white"
                                    >
                                      Reject
                                    </Button>
                                  </div>
                                )}
                            </div>
                          </TableCell>
                        )}

                        {role === "Master" && depositWithdrawAtsSystem && (
                          <TableCell className="text-center whitespace-nowrap">
                            {item.pendingApprovalForAtsSystem === false &&
                            item.status === 2 ? (
                              <div className="space-y-1">
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    handleSendToAts(item.paymentRequestId)
                                  }
                                  className="text-xs bg-gray-700 text-white"
                                >
                                  Send to ATS
                                </Button>
                                {atsMethodCodes.includes("finsvix") && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      handleSendToWithdrawal(
                                        item.paymentRequestId
                                      )
                                    }
                                    className="text-xs w-full bg-gray-700 border-gray-600 text-white"
                                  >
                                    Send to Withdraw
                                  </Button>
                                )}
                              </div>
                            ) : item.status === 3 ? null : (
                              <div className="space-y-1">
                                <Badge className="bg-green-900 text-green-300">
                                  Sent to ATS
                                </Badge>
                                {atsMethodCodes.includes(
                                  item.atsMethod || ""
                                ) &&
                                  item.atsMethod === "finsvix" && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() =>
                                        handleCheckWithdrawalStatus(
                                          item.paymentRequestId
                                        )
                                      }
                                      className="text-xs w-full bg-gray-700 border-gray-600 text-white"
                                    >
                                      Check Status
                                    </Button>
                                  )}
                              </div>
                            )}
                          </TableCell>
                        )}

                        <TableCell className="whitespace-nowrap text-white">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="text-sm text-white">
                                  {formatDateTime(item.createdAt)}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent className="bg-gray-800 text-white border-gray-700">
                                <p>{formatDateTime(item.createdAt)}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-white">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="truncate max-w-[150px] block">
                                  {item.comment}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent className="bg-gray-800 text-white border-gray-700">
                                <p>{item.comment}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <div className="text-sm text-[#848E9C]">
                    Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{" "}
                    {Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} of{" "}
                    {totalCount} records
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        handlePageChange(Math.max(1, currentPage - 1))
                      }
                      disabled={currentPage === 1}
                      className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
                    >
                      Previous
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }).map(
                        (_, idx) => {
                          let pageNum;
                          if (totalPages <= 5) pageNum = idx + 1;
                          else if (currentPage <= 3) pageNum = idx + 1;
                          else if (currentPage >= totalPages - 2)
                            pageNum = totalPages - 4 + idx;
                          else pageNum = currentPage - 2 + idx;

                          return (
                            <Button
                              key={pageNum}
                              variant={
                                currentPage === pageNum ? "default" : "outline"
                              }
                              size="sm"
                              onClick={() => handlePageChange(pageNum)}
                              className={
                                currentPage === pageNum
                                  ? "bg-[#fcd535] text-black"
                                  : "bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
                              }
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
                      onClick={() =>
                        handlePageChange(Math.min(totalPages, currentPage + 1))
                      }
                      disabled={currentPage === totalPages}
                      className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>

        {/* Change Status Modal */}
        <Dialog
          open={!!paymentRequestId}
          onOpenChange={(open) => !open && onClose()}
        >
          <DialogContent className="sm:max-w-md bg-[#1e2329] border-gray-700">
            <DialogHeader>
              <DialogTitle className="text-[#fcd535]">
                Change Status
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {paymentRequestType === CREDIT && (
                <div className="space-y-2">
                  <Label
                    htmlFor="creditTransactionId"
                    className="text-[#848E9C]"
                  >
                    Transaction ID
                  </Label>
                  <Input
                    id="creditTransactionId"
                    type="text"
                    disabled
                    value={transactionId}
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="statusSelect" className="text-[#848E9C]">
                  Select Status <span className="text-red-500">*</span>
                </Label>
                <select
                  className="w-full p-2 border rounded-md bg-gray-800 border-gray-700 text-white"
                  name="status"
                  onChange={handleChange}
                  value={formData.status || ""}
                >
                  <option value="">Select Status</option>
                  <option value="1">Approved</option>
                  <option value="3">Dis-Approved</option>
                </select>
              </div>

              {paymentRequestType === DEBIT && (
                <div className="space-y-2">
                  <Label
                    htmlFor="debitTransactionId"
                    className="text-[#848E9C]"
                  >
                    Transaction ID
                  </Label>
                  <Input
                    id="debitTransactionId"
                    name="transactionId"
                    type="text"
                    value={formData.transactionId || ""}
                    placeholder="Enter transaction ID"
                    onChange={handleChange}
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="commentTextarea" className="text-[#848E9C]">
                  Comment
                </Label>
                <Textarea
                  id="commentTextarea"
                  name="comment"
                  value={formData.comment || ""}
                  placeholder="Add a comment..."
                  onChange={handleChange}
                  rows={3}
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="outline"
                onClick={onClose}
                className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleChangeValueOption()}
                disabled={isDisabled}
                className="bg-gray-700 text-white hover:bg-gray-600"
              >
                Save Changes
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Image Preview Modal */}
        <Dialog
          open={!!selectedImage}
          onOpenChange={(open) => !open && closeModal()}
        >
          <DialogContent className="sm:max-w-4xl bg-[#1e2329] border-gray-700">
            <DialogHeader>
              <DialogTitle className="text-[#fcd535]">
                Image Preview
              </DialogTitle>
            </DialogHeader>
            <div className="flex justify-center">
              {selectedImage && (
                <img
                  src={selectedImage}
                  alt="Preview"
                  className="max-w-full max-h-96 rounded-lg"
                />
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* ✅ Withdraw Form (self-contained dialog) */}
        <WithdrawForm
          open={withdrawOpen}
          onOpenChange={setWithdrawOpen}
          defaultUser={
            // preselect if you have a user
            null
              ? {
                  value: "", // txUser.userId
                  label: "", // `${txUser.name}${txUser.phone ? ` (${txUser.phone})` : ""}`
                }
              : undefined
          }
          onSuccess={() => {
            setWithdrawOpen(false);
            fetchDataFromAPI(2, currentPage); // refresh list after submit
          }}
        />
      </div>
    </div>
  );
}
