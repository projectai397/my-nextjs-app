"use client";
import React, { Fragment, useEffect, useMemo, useRef, useState } from "react";
import apiClient from "@/lib/axiosInstance";

import { saveAs } from "file-saver";
import { FaSort, FaSortDown, FaSortUp } from "react-icons/fa";
import Select, { SingleValue } from "react-select";
import * as XLSX from "xlsx";
import { useSession } from "next-auth/react";

// ===== shadcn/ui components =====
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

// ===== constants/hooks/utils (unchanged) =====
import {
  ADMIN,
  ADMIN_API_ENDPOINT,
  APPROVED_TRANSACTION,
  CREDIT,
  DEBIT,
  LEDGER_ACCOUNT_REPORT,
  LEDGER_ACCOUNT_REPORT_EXPORT,
  MASTER,
  SUCCESS,
  SUPER_ADMIN,
  TRANSACTION_TYPE,
  USER_SEARCH_LIST,
} from "@/constant/index";
import { useSocket } from "@/components/socket/socketContext";
import { decryptData, decryptData1, encryptData } from "@/hooks/crypto";
import {
  formatDateForExportExcelName,
  formatDateTime,
} from "@/hooks/dateUtils";
import { toastError } from "@/hooks/toastMsg";

// ---------- Types ----------
type RoleType =
  | typeof ADMIN
  | typeof SUPER_ADMIN
  | typeof MASTER
  | number
  | string;

type OptionType = {
  label: string;
  value: string;
};

type SortKey =
  | "parentUserName"
  | "userName"
  | "paymentRequestType"
  | "amount"
  | "status"
  | "transactionId"
  | "beneficiaryName"
  | "bankName"
  | "accountNumber"
  | "ifsc"
  | "upiId"
  | "createdAt"
  | "comment";

type SortDirection = "ascending" | "descending";

interface SortConfig {
  key: SortKey | null;
  direction: SortDirection;
}

interface Authenticated {
  userId: string;
  userName: string;
  role: RoleType;
}

interface TableItem {
  parentUserName?: string;
  userName: string;
  paymentRequestType: typeof DEBIT | typeof CREDIT | number | string;
  amount: number;
  status?: number; // 1=Approved, 2=Pending, else Dis-Approved
  transactionId?: string;
  beneficiaryName?: string;
  bankName?: string;
  accountNumber?: string;
  ifsc?: string;
  upiId?: string;
  createdAt: string | number | Date;
  comment?: string;
  paymentRequestId?: string | number;
}

// Filter form state
interface FormFilterData {
  user?: OptionType | null;
  transactionId?: string;
  startDate?: string;
  endDate?: string;
  paymentRequestType?: OptionType | null;
}

// ---------- Component ----------
const LedgerAccountReport: React.FC = () => {
  const { channelData } = useSocket();
    const { data: session } = useSession();

    const deviceType =
  ((session?.user as any)?.deviceType as string | undefined) ?? "web";

const authenticatedUserId =
  (session?.user as any)?.userId as string | undefined;
  console.log("userId",authenticatedUserId);
  

    const jwt_token = (session as any)?.accessToken as string | undefined;
  const authenticated: Authenticated =
    typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem("authenticated") || "{}")
      : ({} as Authenticated);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [userData, setUserData] = useState<OptionType[]>([]);
  const [tableData, setTableData] = useState<TableItem[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);
  const itemsPerPage = 10;

  const [formFilterData, setFormFilterData] = useState<FormFilterData>({});
  const [depositTotal, setDepositTotal] = useState<number | null>(null);
  const [withdrawTotal, setWithdrawTotal] = useState<number | null>(null);
  const [bonusTotal, setBonusTotal] = useState<number | null>(null);

  const [exportTableData, setExportTableData] = useState<TableItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: null,
    direction: "ascending",
  });

  // ---- sorting (unchanged logic) ----
  const requestSort = (key: SortKey) => {
    let direction: SortDirection = "ascending";
    if (sortConfig.key === key && sortConfig.direction === "ascending")
      direction = "descending";
    setSortConfig({ key, direction });
  };

  const sortedTableData = useMemo(() => {
    const sortableItems = [...tableData];
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        const aValue = (a as any)[sortConfig.key!];
        const bValue = (b as any)[sortConfig.key!];
        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;
        if (typeof aValue === "string") {
          return sortConfig.direction === "ascending"
            ? String(aValue).localeCompare(String(bValue))
            : String(bValue).localeCompare(String(aValue));
        } else {
          if (aValue < bValue)
            return sortConfig.direction === "ascending" ? -1 : 1;
          if (aValue > bValue)
            return sortConfig.direction === "ascending" ? 1 : -1;
          return 0;
        }
      });
    }
    return sortableItems;
  }, [tableData, sortConfig]);

  const getSortIcon = (key: SortKey) => {
    if (sortConfig.key !== key)
      return <FaSort className="inline-block ml-2 opacity-60" />;
    if (sortConfig.direction === "ascending")
      return <FaSortUp className="inline-block ml-2" />;
    return <FaSortDown className="inline-block ml-2" />;
  };

  // ---- effects ----
  useEffect(() => {
    document.title = "Admin Panel | Ledger Account Report";
    return () => {
      document.title = "Admin Panel";
    };
  }, []);

  useEffect(() => {
    fetchDataFromAPI(2);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  useEffect(() => {
    if (channelData && (channelData as any)?.paymentData) {
      const paymentData = (channelData as any).paymentData as TableItem & {
        paymentRequestType: any;
        paymentRequestId?: any;
      };
      if (paymentData.paymentRequestType === CREDIT) {
        const idExists = tableData.some(
          (item) => item.paymentRequestId === paymentData.paymentRequestId
        );
        if (!idExists) {
          setTableData([paymentData, ...tableData]);
          if (audioRef.current) {
            const audio = audioRef.current;
            audio.pause();
            audio.play();
          }
        }
      }
    }
  }, [channelData, tableData]);

  // ---- handlers (logic unchanged) ----
  const handleFilter = async () => {
    fetchDataFromAPI(0);
    setCurrentPage(1);
  };

  const handleReset = async () => {
    setFormFilterData({
      user: null,
      transactionId: "",
      startDate: "",
      endDate: "",
      paymentRequestType: null,
    });
    setUserData([]);
    fetchDataFromAPI(1);
  };

  const handlePageChange = async (pageNumber: number) =>
    setCurrentPage(pageNumber);

  const handleInputChange = (inputValue: string) => fetchOptions(inputValue);

  const handleChangeUserDataValueOption = (
    selectedOption: SingleValue<OptionType>,
    name: keyof FormFilterData
  ) => {
    setFormFilterData((prev) => ({ ...prev, [name]: selectedOption || null }));
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormFilterData((prev) => ({ ...prev, [name]: value }));
  };

  // ---- API calls (unchanged) ----
  const fetchDataFromAPI = async (reset: 0 | 1 | 2) => {
    try {
      let payload: any = {
        search: "",
        userId: authenticatedUserId ,
        transactionId: formFilterData?.transactionId
          ? formFilterData.transactionId
          : "",
        startDate: formFilterData?.startDate ? formFilterData.startDate : "",
        endDate: formFilterData?.endDate ? formFilterData.endDate : "",
        paymentRequestType: formFilterData?.paymentRequestType?.value
          ? formFilterData.paymentRequestType.value
          : "",
        status: [APPROVED_TRANSACTION],
        page: currentPage,
        limit: itemsPerPage,
      };

      if (reset === 1) {
        payload = {
          search: "",
          userId: authenticatedUserId,
          transactionId: "",
          startDate: "",
          endDate: "",
          paymentRequestType: "",
          status: [APPROVED_TRANSACTION],
          page: currentPage,
          limit: itemsPerPage,
        };
      }

      const data = JSON.stringify({ data: encryptData(payload) });

      apiClient
        .post(ADMIN_API_ENDPOINT + LEDGER_ACCOUNT_REPORT, data, {
          headers: {
            Authorization: jwt_token,
            "Content-Type": "application/json",
            deviceType: deviceType,
          },
        })
        .then((response) => {
          if (response.data.statusCode == SUCCESS) {
            const rdata: TableItem[] = decryptData(response.data.data);
            const depositTotalResp: number = decryptData(
              response.data.meta.depositTotal
            );
            const withdrawTotalResp: number = decryptData(
              response.data.meta.withdrawTotal
            );
            const bonusTotalResp: number = decryptData(
              response.data.meta.bonusTotal
            );
            setDepositTotal(depositTotalResp);
            setWithdrawTotal(withdrawTotalResp);
            setBonusTotal(bonusTotalResp);
            setTableData(rdata);
            setTotalPages(response.data.meta.totalPage);
            setTotalCount(response.data.meta.totalCount);
          } else {
            toastError(response.data.message);
          }
        })
        .catch((error: any) => {
          toastError(error?.response?.data?.message || "Request failed");
          console.error("Login error:", error);
        });
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const fetchOptions = async (inputValue: string) => {
    if (inputValue && 2 < inputValue.length) {
      try {
        const reqPayload = {
          filterType: 0,
          roleId: "",
          userId: "",
          status: 0,
          search: inputValue,
          page: 1,
          limit: 50,
        };
        const data = JSON.stringify({ data: encryptData(reqPayload) });
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
                userId: string;
              }>;
              const rRes: OptionType[] = rdata.map((item) => ({
                label: item.userName,
                value: item.userId,
              }));
              setUserData(rRes);
            } else {
              toastError(response.data.message);
            }
          })
          .catch((error: any) => {
            toastError(error?.response?.data?.message || "Request failed");
            console.error("Login error:", error);
          });
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    } else {
      setUserData([]);
    }
  };

  const exportToExcel = () => {
    setLoading(true);
    try {
      const payload = {
        search: "",
        userId: formFilterData?.user?.value
          ? formFilterData.user.value
          : authenticated.userId,
        transactionId: formFilterData?.transactionId
          ? formFilterData.transactionId
          : "",
        startDate: formFilterData?.startDate ? formFilterData.startDate : "",
        endDate: formFilterData?.endDate ? formFilterData.endDate : "",
        paymentRequestType: formFilterData?.paymentRequestType?.value
          ? formFilterData.paymentRequestType.value
          : "",
        status: [APPROVED_TRANSACTION],
      };
      const data = JSON.stringify({ data: encryptData(payload) });

      apiClient
        .post(ADMIN_API_ENDPOINT + LEDGER_ACCOUNT_REPORT_EXPORT, data, {
          headers: {
            Authorization: jwt_token,
            "Content-Type": "application/json",
            deviceType: deviceType,
          },
        })
        .then((response) => {
          if (response.data.statusCode == SUCCESS) {
            const rdata = decryptData1(response.data.data) as TableItem[];
            const exportDepositTotal: number = decryptData(
              response.data.meta.depositTotal
            );
            const exportWithdrawTotal: number = decryptData(
              response.data.meta.withdrawTotal
            );
            setExportTableData(rdata);
            generateExcel(rdata, exportDepositTotal, exportWithdrawTotal);
          } else {
            toastError(response.data.message);
            setLoading(false);
          }
        })
        .catch((error: any) => {
          toastError(error?.response?.data?.message || "Request failed");
          console.error("Login error:", error);
          setLoading(false);
        });
    } catch (error) {
      console.error("Error fetching data:", error);
      setLoading(false);
    }
  };

  const generateExcel = (
    data: TableItem[],
    exportDepositTotal: number,
    exportWithdrawTotal: number
  ) => {
    if (!data || data.length === 0) {
      alert("No data available to export.");
      setLoading(false);
      return;
    }
    setTimeout(() => {
      const excelData = data.map((item) => ({
        ...(authenticated.role === ADMIN || authenticated.role === SUPER_ADMIN
          ? { Parent: item.parentUserName }
          : {}),
        UserName: item.userName,
        "Payment Request Type":
          item.paymentRequestType === DEBIT ? "Debit" : "Credit",
        Amount: Number(item.amount.toFixed(2)),
        ...(authenticated.role === MASTER ||
        authenticated.role === ADMIN ||
        authenticated.role === SUPER_ADMIN
          ? {
              Status:
                item.status === 1
                  ? "Approved"
                  : item.status === 2
                  ? "Pending"
                  : "Dis-Approved",
            }
          : {}),
        TransactionId: item.transactionId,
        "Beneficiary Name": item.beneficiaryName,
        "Bank Name": item.bankName,
        "Account Number": item.accountNumber,
        IFSC: item.ifsc,
        "UPI ID": item.upiId,
        "Created At": formatDateTime(item.createdAt),
        Comment: item.comment,
      }));

      excelData.push({} as any);
      excelData.push({
        UserName: "Total Deposit",
        Amount: Number(exportDepositTotal.toFixed(2)),
      } as any);
      excelData.push({
        UserName: "Total Withdraw",
        Amount: Number(exportWithdrawTotal.toFixed(2)),
      } as any);

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
      const userName = authenticated.userName || "USER";
      const now = new Date();
      const fileName = `${userName}LEDGER${formatDateForExportExcelName(
        now
      )}.xlsx`;
      saveAs(blob, fileName);
      setLoading(false);
    }, 100);
    return true;
  };

  // ---- UI ----
  return (
    <Fragment>
      <div className="w-full h-full !p-2 md:p-6 overflow-auto bg-[#181a20]">

        {/* Summary cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-3">
          <Card className="bg-[#1e2329] backdrop-blur-md shadow-sm border border-[#848E9C]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-white font-medium">
                Total Deposit
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {depositTotal ?? 0}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-[#1e2329] backdrop-blur-md shadow-sm border border-[#848E9C]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-white">
                Total Withdraw
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {withdrawTotal ?? 0}
              </div>
            </CardContent>
          </Card>
          <Card
            className={cn(
              "bg-[#1e2329] backdrop-blur-md shadow-sm",
              (depositTotal || 0) - (withdrawTotal || 0) > 0
                ? "border-green-500/20"
                : "border-[#E53E3E]/20",
              "border"
            )}
          >
            <CardHeader className="pb-2 text-white">
              <CardTitle className="text-sm font-medium text-white ">
                Net Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className={cn(
                  "text-2xl font-bold",
                  (depositTotal || 0) - (withdrawTotal || 0) > 0
                    ? "text-[#2EBD85]"
                    : "text-[#F6465D]"
                )}
              >
                {(depositTotal || 0) - (withdrawTotal || 0)}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-[#1e2329] backdrop-blur-md shadow-sm border border-[#848E9C] ">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-white">
                Total Bonus
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {bonusTotal ?? 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-2 bg-transparent border-[#848E9C]">
          <CardContent className="pt-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              {/* Transaction ID Field */}
              <div className="space-y-1">
                <Label htmlFor="transactionId" className="text-white">
                  Transaction Id
                </Label>
                <Input
                  id="transactionId"
                  name="transactionId"
                  value={formFilterData.transactionId || ""}
                  onChange={handleFilterChange}
                  placeholder="Transaction Id"
                  className="input-field"
                />
              </div>

              {/* Date Range Fields */}
              <div className="space-y-1">
                <Label htmlFor="startDate" className="text-white">
                  From Date
                </Label>
                <Input
                  id="startDate"
                  name="startDate"
                  type="date"
                  value={formFilterData.startDate || ""}
                  onChange={handleFilterChange}
                  className="input-field"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="endDate" className="text-white">
                  To Date
                </Label>
                <Input
                  id="endDate"
                  name="endDate"
                  type="date"
                  value={formFilterData.endDate || ""}
                  onChange={handleFilterChange}
                  className="input-field"
                />
              </div>

              {/* User Name Field */}
              <div className="space-y-1">
                <Label className="text-white">User Name</Label>
                <div className="[&_.react-select__control]:min-h-10">
                  <Select<OptionType, false>
                    classNamePrefix="react-select"
                    value={formFilterData.user || null}
                    onChange={(opt) =>
                      handleChangeUserDataValueOption(opt, "user")
                    }
                    options={userData}
                    onInputChange={handleInputChange}
                    isSearchable
                    placeholder="Search user..."
                  />
                </div>
                
              </div>

              {/* Transaction Type Field */}
              <div className="space-y-1">
                <Label className="text-white">Type</Label>
                <div className="[&_.react-select__control]:min-h-10">
                  <Select<OptionType, false>
               
                    value={formFilterData.paymentRequestType || null}
                    onChange={(opt) =>
                      handleChangeUserDataValueOption(opt, "paymentRequestType")
                    }
                    options={TRANSACTION_TYPE as OptionType[]}
                    onInputChange={handleInputChange}
                    isSearchable
                    placeholder="Select transacti..."

                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 mt-4 lg:col-span-2 xl:col-span-1">
                {/* <Button
                  variant="outline"
                  onClick={exportToExcel}
                  disabled={loading}
                  className="w-auto"
                >
                  {loading ? "Exporting..." : "Export"}
                </Button> */}
                <Button onClick={handleFilter} className="w-auto">
                  View
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleReset}
                  className="w-auto"
                >
                  Clear
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table */}

        <CardContent>
          <div className="rounded-lg border-[#848E9C]">
            <Table>
              <TableHeader>
                <TableRow>
                  {(authenticated.role === ADMIN ||
                    authenticated.role === SUPER_ADMIN) && (
                    <TableHead
                      className="cursor-pointer"
                      onClick={() => requestSort("parentUserName")}
                    >
                      Parent {getSortIcon("parentUserName")}
                    </TableHead>
                  )}
                  <TableHead
                    className="cursor-pointer"
                    onClick={() => requestSort("userName")}
                  >
                    UserName {getSortIcon("userName")}
                  </TableHead>
                  <TableHead
                    className="cursor-pointer"
                    onClick={() => requestSort("paymentRequestType")}
                  >
                    Payment Request Type {getSortIcon("paymentRequestType")}
                  </TableHead>
                  <TableHead
                    className="cursor-pointer"
                    onClick={() => requestSort("amount")}
                  >
                    Amount {getSortIcon("amount")}
                  </TableHead>
                  {(authenticated.role === MASTER ||
                    authenticated.role === ADMIN ||
                    authenticated.role === SUPER_ADMIN) && (
                    <TableHead
                      className="cursor-pointer text-center"
                      onClick={() => requestSort("status")}
                    >
                      Status {getSortIcon("status")}
                    </TableHead>
                  )}
                  <TableHead
                    className="cursor-pointer"
                    onClick={() => requestSort("transactionId")}
                  >
                    TransactionId {getSortIcon("transactionId")}
                  </TableHead>
                  <TableHead
                    className="cursor-pointer"
                    onClick={() => requestSort("beneficiaryName")}
                  >
                    Beneficiary Name {getSortIcon("beneficiaryName")}
                  </TableHead>
                  <TableHead
                    className="cursor-pointer"
                    onClick={() => requestSort("bankName")}
                  >
                    Bank Name {getSortIcon("bankName")}
                  </TableHead>
                  <TableHead
                    className="cursor-pointer"
                    onClick={() => requestSort("accountNumber")}
                  >
                    Account Number {getSortIcon("accountNumber")}
                  </TableHead>
                  <TableHead
                    className="cursor-pointer"
                    onClick={() => requestSort("ifsc")}
                  >
                    IFSC {getSortIcon("ifsc")}
                  </TableHead>
                  <TableHead
                    className="cursor-pointer"
                    onClick={() => requestSort("upiId")}
                  >
                    UPI ID {getSortIcon("upiId")}
                  </TableHead>
                  <TableHead
                    className="cursor-pointer"
                    onClick={() => requestSort("createdAt")}
                  >
                    Created At {getSortIcon("createdAt")}
                  </TableHead>
                  <TableHead
                    className="cursor-pointer"
                    onClick={() => requestSort("comment")}
                  >
                    Comment {getSortIcon("comment")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedTableData && sortedTableData.length > 0 ? (
                  sortedTableData.map((item, index) => (
                    <TableRow key={index} className="hover:bg-muted/50">
                      {(authenticated.role === ADMIN ||
                        authenticated.role === SUPER_ADMIN) && (
                        <TableCell
                          className="max-w-[180px] truncate"
                          title={item.parentUserName}
                        >
                          {item.parentUserName}
                        </TableCell>
                      )}
                      <TableCell
                        className="max-w-[160px] truncate"
                        title={item.userName}
                      >
                        {item.userName}
                      </TableCell>
                      <TableCell>
                        {item.paymentRequestType === DEBIT ? (
                          <Badge variant="destructive">Debit</Badge>
                        ) : (
                          <Badge>Credit</Badge>
                        )}
                      </TableCell>
                      <TableCell>{item.amount}</TableCell>
                      {(authenticated.role === MASTER ||
                        authenticated.role === ADMIN ||
                        authenticated.role === SUPER_ADMIN) && (
                        <TableCell className="text-center">
                          {item.status === 1 ? (
                            <Badge className="bg-emerald-600 hover:bg-emerald-600">
                              Approved
                            </Badge>
                          ) : item.status === 2 ? (
                            <Badge variant="secondary">Pending</Badge>
                          ) : (
                            <Badge variant="destructive">Dis-Approved</Badge>
                          )}
                        </TableCell>
                      )}
                      <TableCell
                        className="max-w-[160px] truncate"
                        title={item.transactionId}
                      >
                        {item.transactionId}
                      </TableCell>
                      <TableCell
                        className="max-w-[160px] truncate"
                        title={item.beneficiaryName}
                      >
                        {item.beneficiaryName}
                      </TableCell>
                      <TableCell
                        className="max-w-[160px] truncate"
                        title={item.bankName}
                      >
                        {item.bankName}
                      </TableCell>
                      <TableCell
                        className="max-w-[160px] truncate"
                        title={item.accountNumber}
                      >
                        {item.accountNumber}
                      </TableCell>
                      <TableCell>{item.ifsc}</TableCell>
                      <TableCell
                        className="max-w-[180px] truncate"
                        title={item.upiId}
                      >
                        {item.upiId}
                      </TableCell>
                      <TableCell
                        className="whitespace-nowrap"
                        title={String(item.createdAt)}
                      >
                        {formatDateTime(item.createdAt)}
                      </TableCell>
                      <TableCell
                        className="max-w-[220px] truncate"
                        title={item.comment}
                      >
                        {item.comment}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={13}
                      className="h-24 text-center text-muted-foreground"
                    >
                      No records found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
              {sortedTableData.length > 0 && (
                <TableCaption className="pt-4">
                  Showing page {currentPage} of {totalPages}
                </TableCaption>
              )}
            </Table>
          </div>

          {/* Pagination */}
          {tableData && tableData.length > 0 && (
            <div className="mt-4 flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => handlePageChange(currentPage - 1)}
              >
                Previous
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }).map((_, i) => (
                  <Button
                    key={i}
                    variant={currentPage === i + 1 ? "default" : "ghost"}
                    size="sm"
                    onClick={() => handlePageChange(i + 1)}
                  >
                    {i + 1}
                  </Button>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === totalPages}
                onClick={() => handlePageChange(currentPage + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>

        {/* <audio controls={false} ref={audioRef} preload="auto">
          <source src={notification} type="audio/mpeg" />
        </audio> */}
      </div>
    </Fragment>
  );
};

export default LedgerAccountReport;
