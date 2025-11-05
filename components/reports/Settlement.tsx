"use client";
import apiClient from "@/lib/axiosInstance";

import React, { Fragment, useEffect, useMemo, useState } from "react";
import {
  ADMIN_API_ENDPOINT,
  CLIENT,
  SETTLEMENT_LIST,
  SUCCESS,
  SUPER_ADMIN,
} from "@/constant/index";
import { decryptData, encryptData } from "@/hooks/crypto";
import { formatDateInput } from "@/hooks/dateUtils";
import { toastError } from "@/hooks/toastMsg";
import ChildSettlement from "@/components/reports/ChildSettlement";

// shadcn/ui
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type RoleType = string;

interface SettlementRow {
  userId: string;
  displayName: string;
  role?: RoleType;
  profitLoss: number;
  brokerageTotal: number;
  total: number;
}

interface ProfitTotals {
  PLprofitLoss?: string;
  PLbrokerageTotal?: string;
  PLTotal?: string;
}

interface LossTotals {
  LSprofitLoss?: string;
  LSbrokerageTotal?: string;
  LSTotal?: string;
}

interface DateData {
  currentWeekStartDate: string;
  currentWeekEndDate: string;
  previousWeekStartDate: string;
  previousWeekEndDate: string;
}

interface FormData {
  startDate: string;
  endDate: string;
}

interface AuthLike {
  userId?: string;
  role?: string;
}

/* ---------------- helpers ---------------- */
const safeGet = (k: string) =>
  typeof window !== "undefined" ? localStorage.getItem(k) : null;

function safeJSON<T = any>(s: string | null): T | null {
  if (!s) return null;
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}

function b64urlDecode(str: string) {
  try {
    const pad = (s: string) => s + "=".repeat((4 - (s.length % 4)) % 4);
    const base64 = pad(str.replace(/-/g, "+").replace(/_/g, "/"));
    if (typeof window !== "undefined") {
      return decodeURIComponent(
        Array.prototype.map
          .call(window.atob(base64), (c: string) => {
            return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
          })
          .join("")
      );
    }
  } catch {}
  return "";
}

function extractFromJwt(token: string | null): AuthLike | null {
  if (!token) return null;
  try {
    const raw = token.startsWith("Bearer ") ? token.split(" ")[1] : token;
    const [, payload] = raw.split(".");
    if (!payload) return null;
    const json = b64urlDecode(payload);
    const obj = safeJSON<any>(json) || {};
    const userId =
      obj.userId || obj.user_id || obj.uid || obj.id || obj.sub || obj._id;
    const role = obj.role || obj.userRole || obj.type;
    return userId
      ? { userId: String(userId), role: role ? String(role) : undefined }
      : null;
  } catch {
    return null;
  }
}

function getLocalAuthenticated(): AuthLike | null {
  const a = safeJSON<any>(safeGet("authenticated"));
  const fromA: AuthLike | null =
    a && (a.userId || a.user?.id || a.user?.userId || a.id)
      ? {
          userId: String(a.userId ?? a.user?.id ?? a.user?.userId ?? a.id),
          role: a.role ?? a.user?.role,
        }
      : null;
  if (fromA?.userId) return fromA;

  const b = safeJSON<any>(safeGet("user"));
  if (b && (b.userId || b.id || b._id)) {
    return { userId: String(b.userId ?? b.id ?? b._id), role: b.role };
  }
  const c = safeJSON<any>(safeGet("session"));
  if (c && (c.userId || c.id || c._id || c.user?.id)) {
    return {
      userId: String(c.userId ?? c.id ?? c._id ?? c.user?.id),
      role: c.role ?? c.user?.role,
    };
  }
  return extractFromJwt(safeGet("token"));
}

// number formatter
const fmt = (n: number | string | undefined) =>
  Number(n ?? 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

// reusable skeleton row
const SkeletonRow: React.FC<{ cols?: number }> = ({ cols = 4 }) => (
  <TableRow>
    {Array.from({ length: cols }).map((_, i) => (
      <TableCell key={i}>
        <Skeleton className="h-4 w-full" />
      </TableCell>
    ))}
  </TableRow>
);

const Settlement: React.FC = () => {
  const deviceType = safeGet("deviceType");
  const jwt_token = safeGet("token");

  const [authenticated, setAuthenticated] = useState<AuthLike | null>(
    getLocalAuthenticated()
  );
  useEffect(() => {
    const onStorage = () => setAuthenticated(getLocalAuthenticated());
    window.addEventListener("storage", onStorage);
    const t = setTimeout(() => setAuthenticated(getLocalAuthenticated()), 0);
    return () => {
      window.removeEventListener("storage", onStorage);
      clearTimeout(t);
    };
  }, []);
  function isRoleSuperAdmin(role: unknown, SUPER_ADMIN_CONST?: unknown) {
    const norm = (v: unknown) => (v ?? "").toString().trim().toLowerCase();

    const r = norm(role);
    const c = norm(SUPER_ADMIN_CONST);

    // treat many common variants as super admin
    const aliases = new Set([
      "super_admin",
      "superadmin",
      "super admin",
      "super-admin",
      "sa",
      "1",
      c || "super_admin",
    ]);

    return aliases.has(r);
  }

  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [selectedName, setSelectedName] = useState<string>("");
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const [tableProfitData, setTableProfitData] = useState<SettlementRow[]>([]);
  const [tableLossData, setTableLossData] = useState<SettlementRow[]>([]);
  const [profitTotalData, setProfitTotalData] = useState<ProfitTotals>({});
  const [lossTotalData, setLossTotalData] = useState<LossTotals>({});
  const [time, setTime] = useState<"1" | "2" | "3">("1");
  const [dateData, setDateData] = useState<DateData>({
    currentWeekStartDate: "",
    currentWeekEndDate: "",
    previousWeekStartDate: "",
    previousWeekEndDate: "",
  });
  const [formData, setFormData] = useState<FormData>({
    startDate: "",
    endDate: "",
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [err, setErr] = useState<string | null>(null);

  const isSuperAdmin = isRoleSuperAdmin(authenticated?.role, SUPER_ADMIN);

  // derived label
  const timeBadge = useMemo(() => {
    if (time === "1")
      return `This Week (${dateData.currentWeekStartDate} → ${dateData.currentWeekEndDate})`;
    if (time === "2")
      return `Previous Week (${dateData.previousWeekStartDate} → ${dateData.previousWeekEndDate})`;
    return formData.startDate && formData.endDate
      ? `Custom (${formData.startDate} → ${formData.endDate})`
      : "Custom Period";
  }, [time, dateData, formData]);

  const fetchDataFromAPI = async (
    startDate: string | Date,
    endDate: string | Date
  ) => {
    setLoading(true);
    setErr(null);
    try {
      if (!jwt_token) {
        const msg = "Missing auth token; please login again.";
        toastError(msg);
        setErr(msg);
        return;
      }
      if (!authenticated?.userId) {
        const msg = "Missing userId in session; cannot fetch settlement list.";
        toastError(msg);
        setErr(msg);
        return;
      }

      const payload = encryptData({
        userId: authenticated.userId,
        startDate,
        endDate,
      });
      const body = JSON.stringify({ data: payload });

      const resp = await apiClient.post(
        SETTLEMENT_LIST,
        body,
      );

      if (resp.data?.statusCode == SUCCESS) {
        const rdata = decryptData(resp.data.data) || {};
        const profitArr: SettlementRow[] = Array.isArray(rdata.profit)
          ? rdata.profit
          : [];
        const lossArr: SettlementRow[] = Array.isArray(rdata.loss)
          ? rdata.loss
          : [];

        setTableProfitData(profitArr);
        setTableLossData(lossArr);

        let PLprofitLoss = 0,
          PLbrokerageTotal = 0,
          PLTotal = 0;
        for (let i = 0; i < profitArr.length; i++) {
          PLprofitLoss += Number(profitArr[i].profitLoss || 0);
          PLbrokerageTotal += Number(profitArr[i].brokerageTotal || 0);
          PLTotal += Number(profitArr[i].total || 0);
        }
        let LSprofitLoss = 0,
          LSbrokerageTotal = 0,
          LSTotal = 0;
        for (let i = 0; i < lossArr.length; i++) {
          LSprofitLoss += Number(lossArr[i].profitLoss || 0);
          LSbrokerageTotal += Number(lossArr[i].brokerageTotal || 0);
          LSTotal += Number(lossArr[i].total || 0);
        }

        setProfitTotalData({
          PLprofitLoss: PLprofitLoss.toFixed(2),
          PLbrokerageTotal: PLbrokerageTotal.toFixed(2),
          PLTotal: PLTotal.toFixed(2),
        });
        setLossTotalData({
          LSprofitLoss: LSprofitLoss.toFixed(2),
          LSbrokerageTotal: LSbrokerageTotal.toFixed(2),
          LSTotal: LSTotal.toFixed(2),
        });
      } else {
        const msg = resp.data?.message || "Unknown error";
        toastError(msg);
        setErr(msg);
      }
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || "Request failed";
      toastError(msg);
      setErr(msg);
      console.error("Settlement fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((s) => ({ ...s, [name]: value }));
  };

  const handleReset = () => {
    setTime("1");
    setFormData({
      startDate: dateData.currentWeekStartDate,
      endDate: dateData.currentWeekEndDate,
    });
    fetchDataFromAPI(
      dateData.currentWeekStartDate,
      dateData.currentWeekEndDate
    );
  };

  const handleFilter = () => {
    let st = formData.startDate;
    let et = formData.endDate;
    if (time === "2") {
      st = dateData.previousWeekStartDate;
      et = dateData.previousWeekEndDate;
    }
    fetchDataFromAPI(st, et);
  };

  // init dates + first fetch
  useEffect(() => {
    const today = new Date();
    const currentMonday = new Date(today);
    currentMonday.setDate(today.getDate() - today.getDay() + 1);
    const currentSunday = new Date(currentMonday);
    currentSunday.setDate(currentMonday.getDate() + 6);

    const previousMonday = new Date(currentMonday);
    previousMonday.setDate(currentMonday.getDate() - 7);
    const previousSunday = new Date(previousMonday);
    previousSunday.setDate(previousMonday.getDate() + 6);

    const currentWeekStart = formatDateInput(currentMonday);
    const currentWeekEnd = formatDateInput(currentSunday);
    const prevWeekStart = formatDateInput(previousMonday);
    const prevWeekEnd = formatDateInput(previousSunday);

    setFormData({ startDate: currentWeekStart, endDate: currentWeekEnd });
    setDateData({
      currentWeekStartDate: currentWeekStart,
      currentWeekEndDate: currentWeekEnd,
      previousWeekStartDate: prevWeekStart,
      previousWeekEndDate: prevWeekEnd,
    });

    fetchDataFromAPI(currentWeekStart, currentWeekEnd);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // click handler (Profit & Loss tables)
  const openChild = (u: SettlementRow) => {
    setSelectedUser(u.userId);
    setSelectedName(u.displayName);
    setIsSheetOpen(true);
  };

  // --- UI ---
  return (
    <div className="bg-[#181a20] h-full">
      <div className="md:p-2 lg:p-2 bg-[#181a20]">
        {/* Header & Filters */}
       
   
       
        <CardContent className="!px-0 py-6">
  {/* One-line filter bar (never wraps) */}
  <div className="overflow-x-auto ">
    <div className="flex  items-center justify-between gap-3 min-w-[720px] px-0">
      {/* Time box */}
      <div className="flex flex-nowrap items-center gap-2 bg-[#181a20] text-yellow-400 rounded-lg px-3 py-2">
        {/* Time range selector */}
        <Select value={time} onValueChange={(v: any) => setTime(v)}>
          <SelectTrigger className="min-w-[260px]">
            <SelectValue placeholder="Select time range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1" className="text-white">
              This Week ({dateData.currentWeekStartDate} → {dateData.currentWeekEndDate})
            </SelectItem>
            <SelectItem value="2">
              Previous Week ({dateData.previousWeekStartDate} → {dateData.previousWeekEndDate})
            </SelectItem>
            <SelectItem value="3">Custom Period</SelectItem>
          </SelectContent>
        </Select>

        {/* Inline custom dates */}
        {time === "3" && (
          <>
            <div className="flex flex-col mb-5">
              <Label htmlFor="startDate" className="text-xs mb-1">
                From
              </Label>
              <Input
                id="startDate"
                name="startDate"
                type="date"
                value={formData.startDate}
                onChange={handleChange}
                className="w-[160px] h-9 text-white"
              />
            </div>
            <div className="flex flex-col mb-5">
              <Label htmlFor="endDate" className="text-xs mb-1">
                To
              </Label>
              <Input
                id="endDate"
                name="endDate"
                type="date"
                value={formData.endDate}
                onChange={handleChange}
                className="w-[160px] h-9 text-white"
              />
            </div>
          </>
        )}
      </div>

      {/* Actions (stay pinned right and center horizontally) */}
      <div className="flex justify-end gap-4 w-full">
        <Button
          onClick={handleFilter}
          disabled={loading}
          className="bg-[#fcd535] hover:bg-[#f5e49e] text-black font-medium"
        >
          {loading ? "Loading…" : "View"}
        </Button>
        <Button
          variant="destructive"
          onClick={handleReset}
          disabled={loading}
          className="font-medium"
        >
          Clear
        </Button>
      </div>
    </div>
  </div>

  {err && (
    <Alert variant="destructive" className="mt-4">
      <AlertTitle>Fetch failed</AlertTitle>
      <AlertDescription>{err}</AlertDescription>
    </Alert>
  )}
</CardContent>



        {/* Two responsive cards */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 bg-[#181a20]">
          {/* PROFIT (matches OLD logic) */}
          <div className="shadow-sm bg-[#181a20]">
            <div className="sticky top-0 z-10 rounded-t-md bg-yellow-400 px-5 py-3 text-white">
              <span className="text-sm font-semibold tracking-wide">
                PROFIT
              </span>
            </div>
            <CardContent className="p-0">
              <ScrollArea className="max-h-[480px]">
                <Table>
                  <TableHeader className="">
                    <TableRow className="text-white">
                      <TableHead className="w-[40%]">U. NAME</TableHead>
                      <TableHead className="text-right">P/L</TableHead>
                      <TableHead className="text-right">BRK</TableHead>
                      <TableHead className="text-right">TOTAL</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading && (
                      <>
                        <SkeletonRow />
                        <SkeletonRow />
                        <SkeletonRow />
                      </>
                    )}

                    {/* OLD logic: SUPER_ADMIN → loss data; others → profit data */}
                    {!loading &&
                      (isSuperAdmin ? tableLossData : tableProfitData).map(
                        (item, index) => (
                          <TableRow key={index} className="text-white">
                            <TableCell className="font-medium">
                              {item?.role && item.role !== CLIENT ? (
                                <button
                                  onClick={() => openChild(item)}
                                  className="text-white uppercase tracking-wide"
                                >
                                  {item.displayName}
                                </button>
                              ) : (
                                item.displayName
                              )}
                            </TableCell>

                            {/* P/L */}
                            <TableCell className="text-right">
                              {isSuperAdmin
                                ? fmt(Math.abs(item.profitLoss))
                                : fmt(item.profitLoss)}
                            </TableCell>

                            {/* BRK */}
                            <TableCell className="text-right">
                              {fmt(Math.abs(item.brokerageTotal))}
                            </TableCell>

                            {/* TOTAL */}
                            <TableCell className="text-right">
                              {isSuperAdmin
                                ? fmt(
                                    item.profitLoss <= 0
                                      ? Math.abs(
                                          item.profitLoss - item.brokerageTotal
                                        )
                                      : Math.abs(
                                          item.profitLoss + item.brokerageTotal
                                        )
                                  )
                                : fmt(item.total)}
                            </TableCell>
                          </TableRow>
                        )
                      )}

                    {!loading &&
                      (isSuperAdmin ? tableLossData : tableProfitData)
                        .length === 0 && (
                        <TableRow>
                          <TableCell
                            colSpan={4}
                            className="py-10 text-center text-sm text-muted-foreground"
                          >
                            No data for this range.
                          </TableCell>
                        </TableRow>
                      )}

                    {/* Net Profit row must use profit totals */}
                    {!loading && (
                      <TableRow className="text-white">
                        <TableCell className="font-semibold text-green-400 uppercase">
                          Net Profit
                        </TableCell>
                        <TableCell className="text-right">
                          {fmt(profitTotalData.PLprofitLoss)}
                        </TableCell>
                        <TableCell className="text-right">
                          {fmt(profitTotalData.PLbrokerageTotal)}
                        </TableCell>
                        <TableCell className="text-right">
                          {fmt(profitTotalData.PLTotal)}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </div>

          {/* LOSS (matches OLD logic) */}
          <div className="shadow-sm bg-[#181a20]">
            <div className="sticky top-0 z-10 rounded-t-md bg-[#dc2626] px-5 py-3 text-white">
              <span className="text-sm font-semibold tracking-wide">LOSS</span>
            </div>
            <CardContent className="p-0">
              <ScrollArea className="max-h-[480px]">
                <Table>
                  <TableHeader className="">
                    <TableRow>
                      <TableHead className="w-[40%]">U. NAME</TableHead>
                      <TableHead className="text-right">P/L</TableHead>
                      <TableHead className="text-right">BRK</TableHead>
                      <TableHead className="text-right">TOTAL</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading && (
                      <>
                        <SkeletonRow />
                        <SkeletonRow />
                        <SkeletonRow />
                      </>
                    )}

                    {/* OLD logic: SUPER_ADMIN → profit data; others → loss data */}
                    {!loading &&
                      (isSuperAdmin ? tableProfitData : tableLossData).map(
                        (item, index) => (
                          <TableRow key={index} className="text-white">
                            <TableCell className="font-medium">
                              {item?.role && item.role !== CLIENT ? (
                                <button
                                  onClick={() => openChild(item)}
                                  className="text-[#0d6efd]  underline-offset-2 uppercase tracking-wide"
                                >
                                  {item.displayName}
                                </button>
                              ) : (
                                item.displayName
                              )}
                            </TableCell>

                            {/* P/L */}
                            <TableCell className="text-right">
                              {isSuperAdmin
                                ? fmt(-Math.abs(item.profitLoss))
                                : fmt(item.profitLoss)}
                            </TableCell>

                            {/* BRK */}
                            <TableCell className="text-right">
                              {fmt(Math.abs(item.brokerageTotal))}
                            </TableCell>

                            {/* TOTAL */}
                            <TableCell className="text-right">
                              {isSuperAdmin
                                ? fmt(
                                    -(item.profitLoss <= 0
                                      ? item.profitLoss - item.brokerageTotal
                                      : item.profitLoss + item.brokerageTotal)
                                  )
                                : fmt(item.total)}
                            </TableCell>
                          </TableRow>
                        )
                      )}

                    {!loading &&
                      (isSuperAdmin ? tableProfitData : tableLossData)
                        .length === 0 && (
                        <TableRow>
                          <TableCell
                            colSpan={4}
                            className="py-10 text-center text-sm text-muted-foreground"
                          >
                            No data for this range.
                          </TableCell>
                        </TableRow>
                      )}

                    {/* Net Loss row must use loss totals */}
                    {!loading && (
                      <TableRow className="text-white">
                        <TableCell className="font-semibold text-red-400 uppercase">
                          Net Loss
                        </TableCell>
                        <TableCell className="text-right ">
                          {fmt(lossTotalData.LSprofitLoss)}
                        </TableCell>
                        <TableCell className="text-right ">
                          {fmt(lossTotalData.LSbrokerageTotal)}
                        </TableCell>
                        <TableCell className="text-right">
                          {fmt(lossTotalData.LSTotal)}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </div>
        </div>
      </div>

      {/* Bottom Sheet – Child view */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent side="bottom" className="h-[85vh] overflow-y-auto bg-[#181a20]">
      
          {selectedUser && (
            <div className="">
              <ChildSettlement userId={selectedUser} hideHeader />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default Settlement;
