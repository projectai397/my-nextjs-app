"use client";

import apiClient from "@/lib/axiosInstance";

import React, { Fragment, useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ADMIN_API_ENDPOINT,
  CLIENT,
  SETTLEMENT_LIST,
  SUCCESS,
} from "@/constant/index";
import { decryptData, encryptData } from "@/hooks/crypto";
import { formatDateInput } from "@/hooks/dateUtils";
import { toastError } from "@/hooks/toastMsg";

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

type RoleType = string;

interface SettlementRow {
  userId: string;
  displayName: string;
  role?: RoleType;
  profitLoss: number;
  brokerageTotal: number;
  total: number;
}
interface TotalsProfit {
  PLprofitLoss?: string;
  PLbrokerageTotal?: string;
  PLTotal?: string;
}
interface TotalsLoss {
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
interface DecryptPayload {
  profit: SettlementRow[];
  loss: SettlementRow[];
  [k: string]: any;
}

type ChildSettlementProps = {
  /** If provided, overrides route param and makes the component embeddable */
  userId?: string;
  /** Hide the page header when embedded in a sheet */
  hideHeader?: boolean;
};

const ChildSettlement: React.FC<ChildSettlementProps> = ({
  userId: userIdProp,
  hideHeader,
}) => {
  const routeParams = useParams<{ userId: string }>();
  const userId = userIdProp ?? routeParams.userId; // <- effective userId

  const deviceType =
    (typeof window !== "undefined" && localStorage.getItem("deviceType")) || "";
  const jwt_token =
    (typeof window !== "undefined" && localStorage.getItem("token")) || "";

  const [tableProfitData, setTableProfitData] = useState<SettlementRow[]>([]);
  const [tableLossData, setTableLossData] = useState<SettlementRow[]>([]);
  const [profitTotalData, setProfitTotalData] = useState<TotalsProfit>({});
  const [lossTotalData, setLossTotalData] = useState<TotalsLoss>({});
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
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const fetchDataFromAPI = async (
    startDate: string | Date,
    endDate: string | Date
  ) => {
    if (!userId) return;
    setLoading(true);
    setErr(null);
    try {
      const payload = encryptData({ userId, startDate, endDate });
      const body = JSON.stringify({ data: payload });

      const resp = await apiClient.post(
        SETTLEMENT_LIST,
        body,
      );

      if (resp.data?.statusCode == SUCCESS) {
        const rdata: DecryptPayload = decryptData(resp.data.data) || {
          profit: [],
          loss: [],
        };
        const profitArr = Array.isArray(rdata.profit) ? rdata.profit : [];
        const lossArr = Array.isArray(rdata.loss) ? rdata.loss : [];

        setTableProfitData(profitArr);
        setTableLossData(lossArr);

        let PLprofitLoss = 0,
          PLbrokerageTotal = 0,
          PLTotal = 0;
        for (let i = 0; i < profitArr.length; i++) {
          PLprofitLoss += profitArr[i].profitLoss;
          PLbrokerageTotal += profitArr[i].brokerageTotal;
          PLTotal += profitArr[i].total;
        }
        let LSprofitLoss = 0,
          LSbrokerageTotal = 0,
          LSTotal = 0;
        for (let i = 0; i < lossArr.length; i++) {
          LSprofitLoss += lossArr[i].profitLoss;
          LSbrokerageTotal += lossArr[i].brokerageTotal;
          LSTotal += lossArr[i].total;
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
      console.error("ChildSettlement fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setFormData((s) => ({ ...s, [e.target.name]: e.target.value }));

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
    let st = formData.startDate,
      et = formData.endDate;
    if (time === "2") {
      st = dateData.previousWeekStartDate;
      et = dateData.previousWeekEndDate;
    }
    fetchDataFromAPI(st, et);
  };

  useEffect(() => {
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - today.getDay() + 1);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const prevMon = new Date(monday);
    prevMon.setDate(monday.getDate() - 7);
    const prevSun = new Date(prevMon);
    prevSun.setDate(prevMon.getDate() + 6);

    const currentWeekStart = formatDateInput(monday);
    const currentWeekEnd = formatDateInput(sunday);
    const previousWeekStart = formatDateInput(prevMon);
    const previousWeekEnd = formatDateInput(prevSun);

    setFormData({ startDate: currentWeekStart, endDate: currentWeekEnd });
    setDateData({
      currentWeekStartDate: currentWeekStart,
      currentWeekEndDate: currentWeekEnd,
      previousWeekStartDate: previousWeekStart,
      previousWeekEndDate: previousWeekEnd,
    });

    fetchDataFromAPI(currentWeekStart, currentWeekEnd);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  return (
<Fragment>
  {/* Hide the header when embedded in a sheet */}
  {!hideHeader && (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-2xl font-semibold text-yellow-500">Settlement – User</h1>
        <p className="text-sm text-gray-400">
          Detailed P/L for user <Badge variant="secondary">{userId}</Badge>
        </p>
      </div>
      <Link to="/settlement">
        <Button variant="outline" className="border border-yellow-500 text-yellow-500 hover:bg-yellow-500 hover:text-white">
          ← Back
        </Button>
      </Link>
    </div>
  )}

  <Card className=" bg-[#181a20] border-none p-4">
    <CardHeader>
      {/* <CardTitle className="text-base text-yellow-400">Filters</CardTitle> */}
    </CardHeader>
    <CardContent className="">
      {/* Filters Section */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Label htmlFor="time" className="text-gray-400">Time</Label>
          <Select value={time} onValueChange={(v: any) => setTime(v)}>
            <SelectTrigger id="time" className="bg-gray-700 text-white border border-gray-600">
              <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1" className="text-white">
                This Week ({dateData.currentWeekStartDate} → {dateData.currentWeekEndDate})
              </SelectItem>
              <SelectItem value="2" className="text-white">
                Previous Week ({dateData.previousWeekStartDate} → {dateData.previousWeekEndDate})
              </SelectItem>
              <SelectItem value="3" className="text-white">Custom Period</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {time === "3" && (
          <div className="space-y-2">
            <Label htmlFor="startDate" className="text-gray-400">From Date</Label>
            <Input
              id="startDate"
              name="startDate"
              type="date"
              value={formData.startDate}
              onChange={handleChange}
              className="bg-gray-700 text-white border border-gray-600"
            />
          </div>
        )}

        {time === "3" && (
          <div className="space-y-2">
            <Label htmlFor="endDate" className="text-gray-400">To Date</Label>
            <Input
              id="endDate"
              name="endDate"
              type="date"
              value={formData.endDate}
              onChange={handleChange}
              className="bg-gray-700 text-white border border-gray-600"
            />
          </div>
        )}

        <div className="flex items-end gap-2">
          <Button
            onClick={handleFilter}
            disabled={loading}
            className="w-full md:w-auto bg-yellow-500 hover:bg-yellow-400 text-white"
          >
            {loading ? "Loading…" : "View"}
          </Button>
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={loading}
            className="w-full md:w-auto border border-yellow-500 bg-yellow-500 hover:bg-yellow-500 text-white"
          >
            Clear
          </Button>
        </div>
      </div>
    </CardContent>


    {/* Tables Section (Profit and Loss) */}
    <div className="flex space-x-6 ">
      {/* Profit Table */}
      <Card className="w-full bg-[#181a20]">
        <CardHeader>
          <CardTitle className="text-yellow-400">Profit Data</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader className="bg-gray-700">
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Profit/Loss</TableHead>
                <TableHead>Brokerage</TableHead>
                <TableHead>Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableProfitData.length > 0 ? (
                tableProfitData.map((row, index) => (
                  <TableRow key={index}>
                    <TableCell className="text-white">{row.displayName}</TableCell>
                    <TableCell className="text-white">{row.profitLoss.toFixed(2)}</TableCell>
                    <TableCell className="text-white">{row.brokerageTotal.toFixed(2)}</TableCell>
                    <TableCell className="text-white">{row.total.toFixed(2)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-gray-400">No data available</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {/* Total row for profit */}
          {tableProfitData.length > 0 && (
            <div className="mt-4 text-gray-300">
              <div><strong>Total Profit/Loss: </strong>{profitTotalData.PLprofitLoss}</div>
              <div><strong>Total Brokerage: </strong>{profitTotalData.PLbrokerageTotal}</div>
              <div><strong>Total: </strong>{profitTotalData.PLTotal}</div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Loss Table */}
      <Card className="w-full bg-[#181a20]">
        <CardHeader>
          <CardTitle className="text-red-500">Loss Data</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader className="bg-gray-700">
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Profit/Loss</TableHead>
                <TableHead>Brokerage</TableHead>
                <TableHead>Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableLossData.length > 0 ? (
                tableLossData.map((row, index) => (
                  <TableRow key={index}>
                    <TableCell className="text-white">{row.displayName}</TableCell>
                    <TableCell className="text-white">{row.profitLoss.toFixed(2)}</TableCell>
                    <TableCell className="text-white">{row.brokerageTotal.toFixed(2)}</TableCell>
                    <TableCell className="text-white">{row.total.toFixed(2)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-gray-400">No data available</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {/* Total row for loss */}
          {tableLossData.length > 0 && (
            <div className="mt-4 text-gray-300">
              <div><strong>Total Profit/Loss: </strong>{lossTotalData.LSprofitLoss}</div>
              <div><strong>Total Brokerage: </strong>{lossTotalData.LSbrokerageTotal}</div>
              <div><strong>Total: </strong>{lossTotalData.LSTotal}</div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  </Card>
</Fragment>

  );
};

export default ChildSettlement;
