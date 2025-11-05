"use client";

import { useState } from "react";
import { KPICard } from "@/components/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  DollarSign,
  Activity,
  Users,
  Target,
  BarChart3,
  PiIcon as PieIcon,
  AlertTriangle,
  RefreshCcw,
  Download,
} from "lucide-react";
import {
  ResponsiveContainer,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
} from "recharts";

import RiskAnalysisPage from "@/components/analytics/risk-analysis-page";
import { Top10InsightsPage } from "@/components/analytics/top-10-insights-page";
import { HelpCenterPage } from "@/components/help-center-page";
import { ClientListPage } from "@/components/users/client-list-page";
import { TransactionsPage } from "@/components/account/transactions-page";
// import { StatementsPage } from "@/components/account/statements-page";
import { useApi } from "@/hooks/all_api";

// import UserListPage from "@/components/users";
import NegativeUserPage from "../users/negative-user-page";
import PaymentRequestPage from "../payment/d-w-reports-page";
import WithdrawReqPage from "../payment/withdrawal-page";
import DepositReqPage from "../payment/depositReq-page";
import ManualTradePage from "../view/cmt";
import TradeList from "../view/tradeList";
import BankDetails from "../payment/BankDetails";
import PendingOrderList from "../view/pendingOrders";
import Positions from "../view/positions";
import ManualTradeListPage from "../view/ManualTL";
import RejectionTradeList from "@/components/view/RejectionTradeList";
import TradeLogList from "@/components/view/TradeLogList";
import PositionLogList from "@/components/view/PositionLogList";
import Client from "@/components/view/Client";
import Downloadbill from "@/components/view/Downloadbill";
import UserAutoSQAlert from "@/components/reports/UserAutoSQAlert";
import LedgerAccountReport from "@/components/reports/LedgerAccountReport";
import Account from "@/components/reports/Account";
import Settlement from "@/components/reports/Settlement";
import ProfitLoss from "@/components/reports/ProfitLoss";
import Banner from "@/components/banner/Banner";
import RulesRegulation from "@/components/rules-&-regulation";
import Announcement from "@/components/announcement";
import WatchList from "@/components/watch-list";
import ListPhoneInquiryPage from "../users/DemoUserLead";
import ScriptQuantity from "../view/ScriptQty";
import MarketTiming from "../view/marketTiming";

const COLORS = [
  "#FCD535",
  "#0ECB81",
  "#F6465D",
  "#6C7293",
  "#8B5CF6",
  "#EC4899",
  "#06B6D4",
];

interface DashboardContentProps {
  currentPage: string;
}

export default function DashboardContent({
  currentPage,
}: DashboardContentProps) {
  // ── API Calls ────────────────────────────────────────────────────────────────
  const { data, error } = useApi("/analysis/me/kpis");
  const graphData = useApi("/exchange-trade-counts");
  const weekgraphData = useApi("/weekly-trade-volume");
  const portfoliographData = useApi("/monthly-trade-volume");

  // ── Early routing (pages that bypass dashboard) ─────────────────────────────
  if (currentPage === "risk-analysis") return <RiskAnalysisPage />;
  if (currentPage === "top-10-insights") return <Top10InsightsPage />;
  if (currentPage === "help-center") return <HelpCenterPage />;
  if (currentPage === "client-list") return <ClientListPage />;
  if (currentPage === "watch-list") return <WatchList />;
  if (currentPage === "bank-details") return <BankDetails />; // you had BankDetails import earlier; keep your own mapping if needed
  // if (currentPage === "user-list") return <UserListPage />;
  if (currentPage === "negative-user") return <NegativeUserPage />;
  if (currentPage === "d/w report") return <PaymentRequestPage />;
  if (currentPage === "DemoUL") return <ListPhoneInquiryPage />;
  if (currentPage === "withdrawReq") return <WithdrawReqPage />;
  if (currentPage === "depositReq") return <DepositReqPage />;
  if (currentPage === "tradList") return <TradeList />;
  if (currentPage === "pending-order") return <PendingOrderList />;
  if (currentPage === "script-qty") return <ScriptQuantity />;
  if (currentPage === "positions") return <Positions />;
  if (currentPage === "manualTL") return <ManualTradeListPage />;
  if (currentPage === "rejection-list") return <RejectionTradeList />;
  if (currentPage === "trade-log-list") return <TradeLogList />;
  if (currentPage === "position-log-list") return <PositionLogList />;
  if (currentPage === "client") return <Client />;
  if (currentPage === "download-bill") return <Downloadbill />;
  if (currentPage === "account-report") return <Account />;
  if (currentPage === "settlement") return <Settlement />;
  if (currentPage === "profit-loss") return <ProfitLoss />;
  if (currentPage === "ledger-account-report") return <LedgerAccountReport />;
  if (currentPage === "user-auto-sq-alert") return <UserAutoSQAlert />;
  if (currentPage === "transactions") return <TransactionsPage />;
  if (currentPage === "banner") return <Banner />;
  if (currentPage === "announcement") return <Announcement />;
  if (currentPage === "rules&regulation") return <RulesRegulation />;
  if (currentPage === "create-group") return <CreateGroup />;
  if (currentPage === "market-time") return <MarketTiming />;

  // if (currentPage === "statements") return <StatementsPage />;

  // ── Loading / Error / Empty states for KPI data (hard requirement) ──────────
  if (!data && !error) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] text-[#fcd535]">
        <p className="text-lg font-semibold animate-pulse">Loading data...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-[#181a20] text-white">
        <p className="text-lg font-semibold">Data not Available </p>
        <p className="text-sm text-gray-400 mt-2">Please try after Sometime</p>
      </div>
    );
  }

  // ── Helpers / Formatters ────────────────────────────────────────────────────
  const indianNumberFormatter = (num: number): string => {
    if (num >= 1_00_00_000) {
      // 1 crore = 1e7
      return (num / 1_00_00_000).toFixed(2).replace(/\.00$/, "") + " Cr";
    } else if (num >= 1_00_000) {
      // 1 lakh = 1e5
      return (num / 1_00_000).toFixed(2).replace(/\.00$/, "") + " L";
    } else if (num >= 1000) {
      // Optional: show thousands
      return (num / 1000).toFixed(2).replace(/\.00$/, "") + " K";
    } else {
      return num.toString();
    }
  };
  const weeklyData =
    weekgraphData?.data?.days?.map((d: any) => ({
      name: d?.day,
      trades: Number(d?.groups ?? 0),
      volume: Number(d?.volume ?? 0),
      date: d?.date,
    })) ?? [];

  const portfolioData =
    (portfoliographData?.data?.months ?? []).map((d: any) => ({
      name: d?.label ?? d?.lable,
      volume: d?.volume ?? 0,
      formattedVolume: indianNumberFormatter(d?.volume ?? 0),
    })) ?? [];

  return (
    <div className="flex-1 p-3 md:p-6 space-y-4 md:space-y-6 custom-scrollbar overflow-y-auto bg-[#181a20] min-h-screen">
      {/* Header */}
      {/* <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#1e2329] rounded-xl p-4 md:p-6 border border-[#2B3139]">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-[#fcd535]">
            Trading Dashboard
          </h1>
          <p className="text-[#848E9C] mt-1 text-sm md:text-base">
            Welcome back! Here's your portfolio overview.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            className="bg-gradient-to-r from-[#FCD535] to-[#F0B90B] text-[#0B0E11] text-xs md:text-sm font-semibold"
          >
            <Download className="w-4 h-4" /> Export Report
          </Button>
          <Button
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
            className="bg-gradient-to-r from-[#FCD535] to-[#F0B90B] text-[#0B0E11] text-xs md:text-sm font-semibold"
          >
            <RefreshCcw
              className={`h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2 ${
                loading ? "animate-spin" : ""
              }`}
            />
            {loading ? "Refreshing..." : "Refresh data"}
          </Button>
        </div>
      </div> */}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 text-white">
        <KPICard
          title="Total Portfolio Value"
          value={data.total_volume}
          // change={12.5}
          changeType="positive"
          icon={<DollarSign className="h-4 w-4 md:h-5 md:w-5" />}
          // description="vs last month"
          className="bg-[#1e2329] border-[#2B3139]"
        />
        <KPICard
          title="Total Trades"
          value={data.total_trades}
          // change={8.2}
          changeType="positive"
          icon={<Activity className="h-4 w-4 md:h-5 md:w-5" />}
          // description="this week"
          className="bg-[#1e2329] border-[#2B3139]"
        />
        <KPICard
          title="Win Rate"
          value={data.win_percent}
          // change={-2.1}
          changeType="negative"
          icon={<Target className="h-4 w-4 md:h-5 md:w-5" />}
          // description="vs last week"
          className="bg-[#1e2329] border-[#2B3139]"
        />
        <KPICard
          title="Total Clients"
          value={data.total_users}
          // change={15.3}
          changeType="positive"
          icon={<Users className="h-4 w-4 md:h-5 md:w-5" />}
          // description="this month"
          className="bg-[#1e2329] border-[#2B3139]"
        />
        <KPICard
          title="Active Clients"
          value={data.active_users}
          // change={15.3}
          changeType="positive"
          icon={<Users className="h-4 w-4 md:h-5 md:w-5" />}
          // description="this month"
          className="bg-[#1e2329] border-[#2B3139]"
        />
        <KPICard
          title="Live Clients"
          value={data.live_users}
          // change={15.3}
          changeType="positive"
          icon={<Users className="h-4 w-4 md:h-5 md:w-5" />}
          // description="this month"
          className="bg-[#1e2329] border-[#2B3139]"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6">
        {/* Portfolio Performance */}
        <Card className="bg-[#1e2329] border-[#2B3139]">
          <CardHeader className="pb-3 md:pb-6 border-b border-[#2B3139]">
            <CardTitle className="flex items-center gap-2 text-base md:text-lg text-[#fcd535]">
              <div className="w-8 h-8 bg-[#fcd535] rounded-lg flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-[#0B0E11]" />
              </div>
              Portfolio Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6">
            {portfolioData.length === 0 ? (
              <div className="text-sm text-[#848E9C] py-6 text-center">
                No portfolio data yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={portfolioData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2B3139" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 12, fill: "#848E9C" }}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: "#848E9C" }}
                    domain={[1, "auto"]}
                    tickFormatter={(v) => indianNumberFormatter(v)}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e2329",
                      border: "1px solid #2B3139",
                      borderRadius: "8px",
                      fontSize: "12px",
                      color: "#fff",
                    }}
                    formatter={(val: number) => [
                      indianNumberFormatter(val),
                      `Volume (${portfoliographData?.data?.currency ?? "INR"})`,
                    ]}
                    labelFormatter={(label) => label}
                  />
                  <Line
                    type="monotone"
                    dataKey="volume"
                    stroke="#0ECB81"
                    strokeWidth={2}
                    dot={{ r: 4, fill: "#0ECB81" }}
                    activeDot={{ r: 6, fill: "#0ECB81" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Asset Allocation */}
        <Card className="bg-[#1e2329] border-[#2B3139]">
          <CardHeader className="pb-3 md:pb-6 border-b border-[#2B3139]">
            <CardTitle className="flex items-center gap-2 text-base md:text-lg text-[#fcd535]">
              <div className="w-8 h-8 bg-gradient-to-br from-[#FCD535] to-[#F0B90B] rounded-lg flex items-center justify-center">
                <PieIcon className="h-4 w-4 text-[#0B0E11]" />
              </div>
              Asset Allocation
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6">
            {(graphData?.data?.exchanges?.length ?? 0) === 0 ? (
              <div className="text-sm text-[#848E9C] py-6 text-center">
                No allocation data yet.
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={250}>
                  <RechartsPieChart>
                    <Pie
                      data={graphData?.data?.exchanges || []}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={110}
                      dataKey="pct"
                      nameKey="name"
                      labelLine={false}
                    >
                      {(graphData?.data?.exchanges || []).map(
                        (_: any, i: number) => (
                          <Cell
                            key={`cell-${i}`}
                            fill={COLORS[i % COLORS.length]}
                          />
                        )
                      )}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1e2329",
                        border: "1px solid #2B3139",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      labelStyle={{ color: "#9aa4af" }}
                      itemStyle={{ color: "#fff" }}
                      formatter={(val: number, name: string) => [
                        <span style={{ color: "#fcd535" }}>{val}%</span>,
                        name,
                      ]}
                    />
                  </RechartsPieChart>
                </ResponsiveContainer>

                {/* Legend */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 mt-4">
                  {(graphData?.data?.exchanges || []).map(
                    (item: any, index: number) => (
                      <div
                        key={item.exchangeId ?? index}
                        className="flex items-center gap-2 p-2 rounded-lg bg-[#0B0E11]/50"
                      >
                        <div
                          className="w-3 h-3 md:w-4 md:h-4 rounded-full"
                          style={{
                            backgroundColor: COLORS[index % COLORS.length],
                          }}
                        />
                        <span className="text-xs md:text-sm text-gray-300 font-medium">
                          {item.name}: {item.pct}%
                        </span>
                      </div>
                    )
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Weekly Trading Activity */}
      <Card className="bg-[#1e2329] border-[#2B3139]">
        <CardHeader className="pb-3 md:pb-6 border-b border-[#2B3139]">
          <CardTitle className="flex items-center gap-2 text-base md:text-lg text-[#fcd535]">
            <div className="w-8 h-8 bg-gradient-to-br from-[#FCD535] to-[#F0B90B] rounded-lg flex items-center justify-center">
              <BarChart3 className="h-4 w-4 text-[#0B0E11]" />
            </div>
            Weekly Trading Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 md:p-6">
          {(weeklyData?.length ?? 0) === 0 ? (
            <div className="text-sm text-[#848E9C] py-6 text-center">
              No weekly data yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2B3139" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12, fill: "#848E9C" }}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: "#848E9C" }}
                  domain={[0, "auto"]}
                  tickFormatter={(v) => indianNumberFormatter(v)}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e2329",
                    border: "1px solid #2B3139",
                    borderRadius: "8px",
                    fontSize: "12px",
                    color: "#fff",
                  }}
                  formatter={(val: number, key: string, { payload }) => {
                    if (key === "volume") {
                      return [
                        indianNumberFormatter(val),
                        `Volume (${weekgraphData?.data?.currency ?? "INR"})`,
                      ];
                    }
                    return [val, key];
                  }}
                  labelFormatter={(label, items) => {
                    const p = items?.[0]?.payload;
                    if (!p) return label;
                    return (
                      <>
                        <div>{`${label} • ${p.date}`}</div>
                        <div>{`Trades: ${p.trades}`}</div>
                      </>
                    );
                  }}
                />
                <Bar
                  dataKey="volume"
                  barSize={80}
                  fill="#FCD535"
                  radius={[4, 4, 0, 0]}
                  activeBar={{
                    fill: "#F0B90B",
                    stroke: "#FCD535",
                    strokeWidth: 2,
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Risk Analysis */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6 mt-5 mb-12">
        <KPICard
          title="Average Risk Score"
          value={data.avg_risk_score}
          description="Moderate Risk"
          icon={<AlertTriangle className="h-4 w-4 md:h-5 md:w-5" />}
          className="bg-[#1e2329] border-[#2B3139]"
        />
        <KPICard
          title="Total Volume"
          value={data.total_volume}
          // change={18.7}
          changeType="positive"
          icon={<Activity className="h-4 w-4 md:h-5 md:w-5" />}
          // description="this week"
          className="bg-[#1e2329] border-[#2B3139]"
        />
        <KPICard
          title="Average Risk Status"
          value={data.avg_risk_status}
          icon={<Target className="h-4 w-4 md:h-5 md:w-5" />}
          description="Well balanced"
          className="bg-[#1e2329] border-[#2B3139]"
        />
      </div>
    </div>
  );
}
