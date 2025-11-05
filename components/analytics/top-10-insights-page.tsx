"use client";

import { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useApi } from "@/hooks/all_api";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Target,
  Download,
  RefreshCw,
  Zap,
  Clock,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  ShoppingCart,
  Tag,
} from "lucide-react";

interface Row {
  id: string;
  symbolName?: string;
  productType?: string;
  tradeValue?: number;
  pnl?: number;
  trades?: number;
  date?: string;
  amount?: number;
  method?: string;
  status?: string;
  totalAmount?: number;
  price?: number;
  quantity?: number;
  userId?: string;
}

const insightCategories = [
  {
    id: "profitable-trades",
    title: "Top Profitable Trades",
    description: "Highest earning trades",
    icon: TrendingUp,
    color: "text-green-600",
    bgColor: "bg-transparent",
    // trend: "+12.5%",
  },
  {
    id: "loser-trades",
    title: "Biggest Loss Trades",
    description: "Largest losses",
    icon: TrendingDown,
    color: "text-red-600",
    bgColor: "bg-transparent",
    // trend: "-8.2%",
  },
  {
    id: "biggest-unleveraged",
    title: "Largest Capital Trades",
    description: "Biggest by capital",
    icon: Target,
    color: "text-blue-600",
    bgColor: "bg-transparent",
    // trend: "+6.8%",
  },
  {
    id: "most-traded-scripts",
    title: "Most Active Instruments",
    description: "High activity instruments",
    icon: Zap,
    color: "text-emerald-600",
    bgColor: "bg-transparent",
    // trend: "+31.4%",
  },
  {
    id: "least-traded-scripts",
    title: "Underutilized Instruments",
    description: "Least popular instruments",
    icon: AlertTriangle,
    color: "text-gray-400",
    bgColor: "bg-transparent",
    // trend: "-15.3%",
  },
  {
    id: "top-deposits",
    title: "Top Deposits",
    description: "Largest incoming funds",
    icon: ArrowUpRight,
    color: "text-green-600",
    bgColor: "bg-transparent",
    // trend: "+9.1%",
  },
  {
    id: "top-withdrawals",
    title: "Top Withdrawals",
    description: "Largest outgoing funds",
    icon: ArrowDownRight,
    color: "text-red-600",
    bgColor: "bg-transparent",
    // trend: "-4.6%",
  },
  {
    id: "top-buys",
    title: "Top Buy Transactions",
    description: "Biggest executed buys",
    icon: ShoppingCart,
    color: "text-blue-500",
    bgColor: "bg-transparent",
    // trend: "+5.4%",
  },
  {
    id: "top-sells",
    title: "Top Sell Transactions",
    description: "Biggest executed sells",
    icon: Tag,
    color: "text-amber-500",
    bgColor: "bg-transparent",
    // trend: "+3.7%",
  },
] as const;

function rid() {
  return Math.random().toString(36).slice(2, 10);
}
function n(x: any) {
  const v = Number(x);
  return Number.isFinite(v) ? v : undefined;
}
function s(x: any) {
  if (x === null || x === undefined) return undefined;
  return String(x);
}

function normalizeRow(raw: any): Row {
  const symbolName =
    s(
      raw.symbolName ??
        raw.symbol ??
        raw.script ??
        raw.instrument ??
        raw.scrip ??
        raw.name
    ) ?? "—";
  const productType = s(raw.productType ?? raw.product_type);
  const tradeValue = n(
    raw.tradeValue ??
      raw.trade_value ??
      raw.exposure ??
      raw.volume ??
      raw.total_value
  );
  const pnl = n(raw.pnl ?? raw.profit ?? raw.pandl ?? raw.loss);
  return {
    id: s(raw.id ?? raw._id ?? raw.tx_id) ?? rid(),
    symbolName,
    productType,
    tradeValue,
    pnl,
  };
}

function normalizeScriptRow(raw: any): Row {
  const symbolName =
    s(
      raw.symbolName ??
        raw.symbol ??
        raw.script ??
        raw.instrument ??
        raw.scrip ??
        raw.name
    ) ?? "—";
  const trades = n(raw.totalTrades);
  return {
    id: s(raw.id ?? raw._id ?? `${symbolName}-${trades ?? 0}`) ?? rid(),
    symbolName,
    trades,
  };
}

const fmtDateIST = (iso?: string) => {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
};

function normalizeDeposit(raw: any, idx: number): Row {
  return {
    id: s(raw.tx_id) ?? `dep-${idx}`,
    date: fmtDateIST(s(raw.created_at)),
    amount: n(raw.amount) ?? 0,
    method: s(raw.transactionType) ?? "—",
    status: "Completed",
  };
}
function normalizeWithdrawal(raw: any, idx: number): Row {
  return {
    id: s(raw.tx_id) ?? `wth-${idx}`,
    date: fmtDateIST(s(raw.created_at)),
    amount: n(raw.amount) ?? 0,
    method: s(raw.transactionType) ?? "—",
    status: "Processed",
  };
}

function qtyFromLots(raw: any): number | undefined {
  const lots = Number(raw.lotSize ?? raw.lot_size ?? 0);
  const q = Number(raw.quantity ?? raw.qty ?? 0);
  const val = Math.floor(lots * q + 0.5);
  return Number.isFinite(val) ? val : undefined;
}
function normalizeBuy(raw: any, idx: number): Row {
  return {
    id: s(raw.orderId ?? raw.order_id) ?? `buy-${idx}`,
    date: fmtDateIST(s(raw.executionDateTime ?? raw.executed_at)),
    totalAmount: Math.floor(Number(raw.tradeValue ?? raw.total ?? 0)),
    price: Math.floor(Number(raw.price ?? 0)),
    symbolName: s(raw.symbolName ?? raw.symbol ?? raw.script),
    quantity: qtyFromLots(raw),
    userId: s(raw.userId ?? raw.user_id),
  };
}
function normalizeSell(raw: any, idx: number): Row {
  return {
    id: s(raw.orderId ?? raw.order_id) ?? `sell-${idx}`,
    date: fmtDateIST(s(raw.executionDateTime ?? raw.executed_at)),
    totalAmount: Math.floor(Number(raw.tradeValue ?? raw.total ?? 0)),
    price: Math.floor(Number(raw.price ?? 0)),
    symbolName: s(raw.symbolName ?? raw.symbol ?? raw.script),
    quantity: qtyFromLots(raw),
    userId: s(raw.userId ?? raw.user_id),
  };
}

export function Top10InsightsPage() {
  const [selectedCategory, setSelectedCategory] =
    useState<string>("profitable-trades");
  const [searchTerm, setSearchTerm] = useState("");

  const { data, loading, error } = useApi("/analysis/me/kpis");

  const dynamicMap = useMemo(() => {
    const d = data ?? {};
    const deposits: Row[] = Array.isArray(d?.top_10_biggest_deposits)
      ? d.top_10_biggest_deposits.map(normalizeDeposit)
      : [];
    const withdrawals: Row[] = Array.isArray(d?.top_10_biggest_withdrawals)
      ? d.top_10_biggest_withdrawals.map(normalizeWithdrawal)
      : [];
    const buys: Row[] = Array.isArray(d?.top_10_biggest_buy_trades)
      ? d.top_10_biggest_buy_trades.map(normalizeBuy)
      : [];
    const sells: Row[] = Array.isArray(d?.top_10_biggest_sell_trades)
      ? d.top_10_biggest_sell_trades.map(normalizeSell)
      : [];

    return {
      "profitable-trades": (d.top_10_profitable_trades ?? []).map(normalizeRow),
      "loser-trades": (d.top_10_loser_trades ?? []).map(normalizeRow),
      "biggest-unleveraged": (d.top_10_biggest_trades ?? []).map(normalizeRow),
      "most-traded-scripts": (d.top_10_most_traded_scripts ?? []).map(
        normalizeScriptRow
      ),
      "least-traded-scripts": (d.top_10_least_traded_scripts ?? []).map(
        normalizeScriptRow
      ),
      "top-deposits": deposits,
      "top-withdrawals": withdrawals,
      "top-buys": buys,
      "top-sells": sells,
    } as Record<string, Row[]>;
  }, [data]);

  const currentData = useMemo<Row[]>(
    () => dynamicMap[selectedCategory] ?? [],
    [dynamicMap, selectedCategory]
  );

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const cfg of insightCategories)
      counts[cfg.id] = (dynamicMap[cfg.id] ?? []).length;
    return counts;
  }, [dynamicMap]);

  const selectedCategoryInfo = insightCategories.find(
    (c) => c.id === selectedCategory
  );

  const filteredData = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return currentData;
    return currentData.filter((row) => {
      const bag = [
        row.symbolName,
        row.productType,
        row.method,
        row.status,
        row.userId,
        row.date,
        String(row.price ?? ""),
        String(row.totalAmount ?? ""),
        String(row.amount ?? ""),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return bag.includes(term);
    });
  }, [currentData, searchTerm]);

  const isScriptCategory =
    selectedCategory === "most-traded-scripts" ||
    selectedCategory === "least-traded-scripts";
  const isMoneyCategory =
    selectedCategory === "top-deposits" ||
    selectedCategory === "top-withdrawals";
  const isOrderTxCategory =
    selectedCategory === "top-buys" || selectedCategory === "top-sells";
  const isBuy = selectedCategory === "top-buys";
  const isSell = selectedCategory === "top-sells";
  const isDeposit = selectedCategory === "top-deposits";

  return (
    <div className="h-full overflow-y-auto bg-[#181a20]">
      <div className="space-y-6 p-4 md:p-6">
        {/* Header */}
        {/* <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[#1e2329]">
                  <Activity className="h-6 w-6 text-[#fcd535]" />
                </div>
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold text-[#fcd535]">
                    Top 10 Insights
                  </h1>
                  <p
                    className="text-[13px] md:text-sm"
                    style={{ color: "#848E9C" }}
                  >
                    Live analytics from your KPIs
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="bg-transparent border-[#2a2f36] text-[#fcd535]"
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="bg-transparent border-[#2a2f36] text-[#fcd535]"
                disabled={loading}
              >
                <RefreshCw
                  className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
                />
                {loading ? "Refreshing" : "Refresh"}
              </Button>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-500">
              Failed to load KPIs. {String(error)}
            </p>
          )}
        </div> */}

        {/* Category Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-5 gap-4">
          {insightCategories.map((category) => {
            const Icon = category.icon;
            const isSelected = selectedCategory === category.id;
            const count = categoryCounts[category.id] ?? 0;

            return (
              <Card
                key={category.id}
                className={cn(
                  "cursor-pointer bg-[#1e2329] border border-[#2a2f36] transition-none",
                  isSelected && "ring-2 ring-[#fcd535]"
                )}
                onClick={() => setSelectedCategory(category.id)}
              >
                <CardContent>
                  <div className="flex items-start justify-between mb-3">
                    <Icon className={cn("h-6 w-6", category.color)} />
                    <Badge
                      variant={isSelected ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {count}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-semibold text-sm leading-tight text-[#fcd535]">
                      {category.title}
                    </h3>
                    <p className="text-xs" style={{ color: "#848E9C" }}>
                      {category.description}
                    </p>
                    {/* <div className="flex items-center justify-between">
                      <span
                        className={cn(
                          "text-xs font-medium",
                          category.trend.startsWith("+")
                            ? "text-green-500"
                            : "text-red-500"
                        )}
                      >
                        {category.trend}
                      </span>
                      <Clock className="h-3 w-3" style={{ color: "#848E9C" }} />
                    </div> */}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Data Display */}
        {selectedCategoryInfo && (
          <Card className="bg-[#1e2329] border border-[#2a2f36]">
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[#1e2329]">
                    <selectedCategoryInfo.icon
                      className={cn("h-6 w-6", selectedCategoryInfo.color)}
                    />
                  </div>
                  <div>
                    <CardTitle className="text-xl text-[#fcd535]">
                      {selectedCategoryInfo.title}
                    </CardTitle>
                    <CardDescription style={{ color: "#848E9C" }}>
                      {selectedCategoryInfo.description}
                    </CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <Tabs defaultValue="table" className="space-y-4">
                <TabsList className="bg-[#181a20] border border-[#2a2f36]">
                  <TabsTrigger
                    value="table"
                    className="text-gray-400 data-[state=active]:text-white data-[state=inactive]:text-gray-400 data-[state=active]:bg-[#1e2329] data-[state=active]:border data-[state=active]:border-[#2a2f36]"
                  >
                    Table View
                  </TabsTrigger>
                  <TabsTrigger
                    value="cards"
                    className="text-gray-400 data-[state=active]:text-white data-[state=inactive]:text-gray-400 data-[state=active]:bg-[#1e2329] data-[state=active]:border data-[state=active]:border-[#2a2f36]"
                  >
                    Card View
                  </TabsTrigger>
                </TabsList>

                {/* TABLE view */}
                <TabsContent value="table">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-[#2a2f36] bg-[#181a20]">
                          {isScriptCategory ? (
                            <>
                              <th
                                className="text-left p-3 font-medium text-white"
                                style={{ color: "#848E9C" }}
                              >
                                Symbol
                              </th>
                              <th
                                className="text-left p-3 font-medium text-white "
                                style={{ color: "#848E9C" }}
                              >
                                Total Trades
                              </th>
                            </>
                          ) : isMoneyCategory ? (
                            <>
                              <th
                                className="text-left p-3 font-medium text-white"
                                style={{ color: "#848E9C" }}
                              >
                                Date (IST)
                              </th>
                              <th
                                className="text-left p-3 font-medium text-white"
                                style={{ color: "#848E9C" }}
                              >
                                Amount
                              </th>
                              <th
                                className="text-left p-3 font-medium text-white"
                                style={{ color: "#848E9C" }}
                              >
                                Method
                              </th>
                              <th
                                className="text-left p-3 font-medium text-white "
                                style={{ color: "#848E9C" }}
                              >
                                Status
                              </th>
                            </>
                          ) : isOrderTxCategory ? (
                            <>
                              <th
                                className="text-left p-3 font-medium text-white"
                                style={{ color: "#848E9C" }}
                              >
                                Script
                              </th>
                              <th
                                className="text-left p-3 font-medium text-white"
                                style={{ color: "#848E9C" }}
                              >
                                Qty
                              </th>
                              <th
                                className="text-left p-3 font-medium text-white"
                                style={{ color: "#848E9C" }}
                              >
                                Price
                              </th>
                              <th
                                className="text-left p-3 font-medium text-white"
                                style={{ color: "#848E9C" }}
                              >
                                Total
                              </th>
                            </>
                          ) : (
                            <>
                              <th
                                className="text-left p-3 font-medium text-white"
                                style={{ color: "#848E9C" }}
                              >
                                Symbol
                              </th>
                              <th
                                className="text-left p-3 font-medium text-white"
                                style={{ color: "#848E9C" }}
                              >
                                Product Type
                              </th>
                              <th
                                className="text-left p-3 font-medium text-white"
                                style={{ color: "#848E9C" }}
                              >
                                Trade Value
                              </th>
                              <th
                                className="text-left p-3 font-medium text-white"
                                style={{ color: "#848E9C" }}
                              >
                                P&amp;L
                              </th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredData.length > 0 ? (
                          filteredData.map((row, index) => (
                            <tr
                              key={row.id}
                              className="border-b border-[#2a2f36] transition-none"
                              style={{ animationDelay: `${index * 100}ms` }}
                            >
                              {isScriptCategory ? (
                                <>
                                  <td className="p-3 font-medium text-white">
                                    {row.symbolName ?? "—"}
                                  </td>
                                  <td className="p-3 font-mono text-white ">
                                    {row.trades ?? "—"}
                                  </td>
                                </>
                              ) : isMoneyCategory ? (
                                <>
                                  <td className="p-3 text-white">
                                    {row.date ?? "—"}
                                  </td>
                                  <td
                                    className={cn(
                                      "p-3 font-mono text-white",
                                      isDeposit && "text-green-500"
                                    )}
                                  >
                                    {row.amount !== undefined
                                      ? `₹${row.amount.toLocaleString()}`
                                      : "—"}
                                  </td>
                                  <td className="p-3  text-white">
                                    {row.method ?? "—"}
                                  </td>
                                  <td className="p-3  text-white">
                                    <Badge
                                      variant="secondary"
                                      className="text-xs"
                                    >
                                      {row.status ?? "—"}
                                    </Badge>
                                  </td>
                                </>
                              ) : isOrderTxCategory ? (
                                <>
                                  <td className="p-3 font-medium text-white">
                                    {row.symbolName ?? "—"}
                                  </td>
                                  <td className="p-3 font-mono text-white">
                                    {row.quantity ?? "—"}
                                  </td>
                                  <td className="p-3 font-mono text-white ">
                                    {row.price !== undefined
                                      ? `₹${row.price.toLocaleString()}`
                                      : "—"}
                                  </td>
                                  <td
                                    className={cn(
                                      "p-3 font-mono text-white ",
                                      isBuy && "text-[#2EBD85]",
                                      isSell && "text-[#F6465D]"
                                    )}
                                  >
                                    {row.totalAmount !== undefined
                                      ? `₹${row.totalAmount.toLocaleString()}`
                                      : "—"}
                                  </td>
                                </>
                              ) : (
                                <>
                                  <td className="p-3 font-medium text-white ">
                                    {row.symbolName ?? "—"}
                                  </td>
                                  <td className="p-3">
                                    <Badge
                                      variant="secondary"
                                      className="text-xs"
                                    >
                                      {row.productType ?? "—"}
                                    </Badge>
                                  </td>
                                  <td className="p-3 font-mono text-white">
                                    {row.tradeValue !== undefined
                                      ? `₹${row.tradeValue.toLocaleString()}`
                                      : "—"}
                                  </td>
                                  <td className="p-3 font-mono text-white">
                                    {row.pnl !== undefined ? (
                                      <span
                                        className={
                                          row.pnl >= 0
                                            ? "text-[#2EBD85]"
                                            : "text-[#F6465D]"
                                        }
                                      >
                                        {row.pnl >= 0 ? "+" : ""}₹
                                        {Math.abs(row.pnl).toLocaleString()}
                                      </span>
                                    ) : (
                                      "—"
                                    )}
                                  </td>
                                </>
                              )}
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td
                              colSpan={
                                isScriptCategory
                                  ? 2
                                  : isMoneyCategory
                                  ? 4
                                  : isOrderTxCategory
                                  ? 4
                                  : 4
                              }
                              className="text-center p-8"
                              style={{ color: "#848E9C" }}
                            >
                              {loading
                                ? "Loading…"
                                : "No data available for this category"}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </TabsContent>

                {/* CARDS view */}
                <TabsContent value="cards">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    {filteredData.length > 0 ? (
                      filteredData.map((row, index) => (
                        <Card
                          key={row.id}
                          className="bg-[#1e2329] border border-[#2a2f36] transition-none"
                          style={{ animationDelay: `${index * 100}ms` }}
                        >
                          <CardContent className="p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold truncate text-[#fcd535]">
                                {isMoneyCategory
                                  ? row.method ?? "—"
                                  : row.symbolName ?? row.status ?? "—"}
                              </span>
                              {(() => {
                                if (isScriptCategory) return null;
                                if (isMoneyCategory)
                                  return (
                                    <Badge
                                      variant="outline"
                                      className="text-xs"
                                      style={{
                                        color: "#848E9C",
                                        borderColor: "#2a2f36",
                                      }}
                                    >
                                      {row.status ?? "—"}
                                    </Badge>
                                  );
                                return null;
                              })()}
                            </div>

                            <div className="text-sm space-y-2">
                              {isScriptCategory ? (
                                <div className="flex justify-between">
                                  <span style={{ color: "#848E9C" }}>
                                    Trades
                                  </span>
                                  <span className="font-mono text-white ">
                                    {row.trades ?? "—"}
                                  </span>
                                </div>
                              ) : isMoneyCategory ? (
                                <>
                                  <div className="flex justify-between">
                                    <span style={{ color: "#848E9C" }}>
                                      Date
                                    </span>
                                    <span className="font-mono text-white">
                                      {row.date ?? "—"}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span style={{ color: "#848E9C" }}>
                                      Amount
                                    </span>
                                    <span
                                      className={cn(
                                        "font-mono",
                                        isDeposit && "text-[#2EBD85]"
                                      )}
                                    >
                                      {row.amount !== undefined
                                        ? `₹${row.amount.toLocaleString()}`
                                        : "—"}
                                    </span>
                                  </div>
                                </>
                              ) : isOrderTxCategory ? (
                                <>
                                  <div className="flex justify-between">
                                    <span style={{ color: "#848E9C" }}>
                                      Qty
                                    </span>
                                    <span className="font-mono">
                                      {row.quantity ?? "—"}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span style={{ color: "#848E9C" }}>
                                      Price
                                    </span>
                                    <span className="font-mono">
                                      {row.price !== undefined
                                        ? `₹${row.price.toLocaleString()}`
                                        : "—"}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span style={{ color: "#848E9C" }}>
                                      Total
                                    </span>
                                    <span
                                      className={cn(
                                        "font-mono",
                                        isBuy && "text-[#2EBD85]",
                                        isSell && "text-[#F6465D]"
                                      )}
                                    >
                                      {row.totalAmount !== undefined
                                        ? `₹${row.totalAmount.toLocaleString()}`
                                        : "—"}
                                    </span>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div className="flex justify-between">
                                    <span style={{ color: "#848E9C" }}>
                                      Trade Value
                                    </span>
                                    <span className="font-mono text-white" >
                                      {row.tradeValue !== undefined
                                        ? `₹${row.tradeValue.toLocaleString()}`
                                        : "—"}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span style={{ color: "#848E9C" }}>
                                      P&amp;L
                                    </span>
                                    <span
                                      className={cn(
                                        "font-mono font-medium",
                                        row.pnl !== undefined
                                          ? row.pnl >= 0
                                            ? "text-[#2EBD85]"
                                            : "text-[#F6465D]"
                                          : ""
                                      )}
                                    >
                                      {row.pnl !== undefined
                                        ? `${
                                            row.pnl >= 0 ? "+" : ""
                                          }₹${Math.abs(
                                            row.pnl
                                          ).toLocaleString()}`
                                        : "—"}
                                    </span>
                                  </div>
                                </>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    ) : (
                      <div
                        className="col-span-full text-center p-8"
                        style={{ color: "#848E9C" }}
                      >
                        {loading
                          ? "Loading…"
                          : "No data available for this category"}
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
