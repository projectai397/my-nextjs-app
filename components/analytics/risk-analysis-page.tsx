"use client";

import { useMemo, useState, useEffect } from "react";
import { useApi } from "@/hooks/all_api";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { KPICard } from "@/components/kpi-card";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

import {
  Users,
  Search,
  Eye,
  TrendingUp,
  Activity,
  DollarSign,
  ArrowDownRight,
  ArrowUpRight,
} from "lucide-react";

/* ----------------------------- Shared Types ----------------------------- */

type WindowInfo = { start?: string; end?: string; tz?: string };

type ApiItem = {
  _id: string;
  superadmin_id?: string;
  user_id?: string;
  email?: string | null;
  name?: string;
  status?: number | string;
  balance?: number;
  total_trades?: number;
  win_trades?: number;
  win_percent?: number;
  total_volume?: number;
  avg_risk_status?: string;
  avg_risk_score?: number;
  generated_at?: string;
  window?: WindowInfo;
  [key: string]: unknown;
};

type ApiResponse = {
  ok: boolean;
  count: number;
  limit: number;
  items: ApiItem[];
};

type Row = {
  id: string;
  name: string;
  userId: string;
  avatar: string | null;
  riskScore: number;
  status: string;
  totalTrades: number;
  volume: number;
  winRate: number;
  generatedAt?: string;
  _src?: ApiItem;
};

type FilterType = "All Users" | "High Risk" | "Medium Risk" | "Low Risk";

/* ----------------------------- Utilities ----------------------------- */

const getRiskColor = (status: string) => {
  switch (status) {
    case "High Risk":
      return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400";
    case "Medium Risk":
      return "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400";
    case "Low Risk":
      return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400";
  }
};

const getRiskScoreColor = (score: number) => {
  if (score >= 8) return "text-red-600 dark:text-red-400 font-bold";
  if (score >= 6) return "text-orange-600 dark:text-orange-400 font-semibold";
  return "text-green-600 dark:text-green-400 font-semibold";
};

const formatVolume = (volume: number) => {
  if (volume >= 1_000_000) return `₹${(volume / 1_000_000).toFixed(1)}M`;
  return `₹${(volume / 1_000).toFixed(0)}K`;
};

/* ============================ Merged Page ============================ */

export default function RiskAnalysisPage() {
  // --- Top 10 (Risk Analysis) data ---
  const { data: topData, loading: topLoading } = useApi<ApiResponse>("/analysis/users/top-risk");

  // --- All Clients data + KPIs ---
  const { data: allData, loading: allLoading, error: allError } = useApi<ApiResponse>("/analysis/user-list");
  const kpis = useApi("/analysis/me/kpis");

  const [activeTab, setActiveTab] = useState<"top10" | "all">("top10");

  // ----- Filters (shared) -----
  const [activeFilter, setActiveFilter] = useState<FilterType>("All Users");

  // ----- All Clients: search + selection -----
  const [searchTermAll, setSearchTermAll] = useState("");
  const [selected, setSelected] = useState<Row | null>(null);

  useEffect(() => {
    document.title = activeTab === "top10" ? "Risk Analysis" : "Client List";
    return () => {
      document.title = "Risk Analysis";
    };
  }, [activeTab]);

  /* ------------------ Map: Top 10 Risk rows ------------------ */
  const topRows: Row[] = useMemo(() => {
    const items = topData?.items ?? [];
    return items.map((it: any) => ({
      id: it._id || it.user_id,
      name: it.name ?? "—",
      userId: it.user_id ?? "—",
      avatar: null,
      riskScore: Math.round(it.avg_risk_score ?? 0),
      status: it.avg_risk_status ?? "—",
      totalTrades: it.total_trades ?? 0,
      volume: it.total_volume ?? 0,
      winRate: Math.round(it.win_percent ?? 0),
      generatedAt: it.generated_at,
    }));
  }, [topData]);

  // Apply risk filter (no search on Top-10)
  const filteredTopRows: Row[] = useMemo(() => {
    const rows = topRows.filter((u) => {
      const matchesFilter =
        activeFilter === "All Users" ||
        String(u.status).toLowerCase() === activeFilter.toLowerCase();
      return matchesFilter;
    });
    return rows.slice(0, 10);
  }, [topRows, activeFilter]);

  /* ------------------ Map: All Clients rows ------------------ */
  const allItems = allData?.items ?? [];
  const totalClients = allItems.length;
  const activeClients = useMemo(
    () =>
      allItems.filter(
        (x) =>
          String(x.status) === "1" ||
          String(x.status).toLowerCase() === "active"
      ).length,
    [allItems]
  );

  const avgWinPct = useMemo(() => {
    const arr = allItems.map((x) => Number(x.win_percent ?? 0));
    if (!arr.length) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }, [allItems]);

  // Base (unsearched) list for counts
  const allRowsBase: Row[] = useMemo(() => {
    return allItems.map((it: ApiItem) => ({
      id: (it._id as string) || (it.user_id as string),
      name: it.name ?? "—",
      userId: it.user_id ?? "—",
      avatar: null,
      riskScore: Math.round((it.avg_risk_score as number) ?? 0),
      status: (it.avg_risk_status as string) ?? "—",
      totalTrades: (it.total_trades as number) ?? 0,
      volume: (it.total_volume as number) ?? 0,
      winRate: Math.round((it.win_percent as number) ?? 0),
      generatedAt: it.generated_at,
      _src: it,
    }));
  }, [allItems]);

  // Apply risk filter THEN search for All Clients
  const filteredAllRows: Row[] = useMemo(() => {
    const byRisk =
      activeFilter === "All Users"
        ? allRowsBase
        : allRowsBase.filter(
            (r) => String(r.status).toLowerCase() === activeFilter.toLowerCase()
          );

    const q = searchTermAll.trim().toLowerCase();
    if (!q) return byRisk;

    return byRisk.filter((r) =>
      [r.name, r.userId, r.id].join(" ").toLowerCase().includes(q)
    );
  }, [allRowsBase, activeFilter, searchTermAll]);

  /* ------------------ Filter Count (per active tab) ------------------ */
  const getFilterCount = (filter: FilterType) => {
    const source = activeTab === "top10" ? topRows : allRowsBase;
    if (filter === "All Users") return source.length;
    return source.filter(
      (user) => String(user.status).toLowerCase() === filter.toLowerCase()
    ).length;
  };

  /* ================================ UI ================================ */

  // Shared search bar (Top-10 style). Disabled on Top-10, enabled on All Clients.
  const sharedSearchDisabled = activeTab !== "all";
  const sharedSearchValue = activeTab === "all" ? searchTermAll : "";

  return (
    <div className="space-y-6 p-4 md:p-6 h-full overflow-y-auto" style={{ backgroundColor: "#181a20" }}>
      {/* SINGLE SHARED SEARCH + FILTERS */}
      <Card className="animate-fade-in border-none" style={{ backgroundColor: "#1e2329" }}>
        <CardContent>
          <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder={
                  sharedSearchDisabled
                    ? "Search disabled for Top 10"
                    : "Search by name, email, or user ID..."
                }
                value={sharedSearchValue}
                disabled={sharedSearchDisabled}
                onChange={(e) => {
                  if (!sharedSearchDisabled) setSearchTermAll(e.target.value);
                }}
                className={cn(
                  "pl-10 placeholder-gray-400 text-white",
                  sharedSearchDisabled && "opacity-60 cursor-not-allowed"
                )}
                style={{ backgroundColor: "#2a2f36" }}
              />
            </div>

            {/* Risk Filter Buttons — work for BOTH tabs */}
            <div className="flex flex-wrap gap-2">
              {(["All Users", "High Risk", "Medium Risk", "Low Risk"] as FilterType[]).map((filter) => (
                <Button
                  key={filter}
                  variant={activeFilter === filter ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveFilter(filter)}
                  className={cn(
                    "transition-all duration-200",
                    activeFilter === filter && "bg-primary text-primary-foreground shadow-lg"
                  )}
                >
                  {filter}
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {getFilterCount(filter)}
                  </Badge>
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ONE TABS ROOT + ONE CARD WITH HEADER (title left, tabs right) */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "top10" | "all")} className="w-full">
        <Card style={{ backgroundColor: "#1e2329", border: "none" }}>
          <CardHeader className="flex items-center justify-between gap-3">
            {/* Title changes with active tab */}
            <CardTitle style={{ color: "#fcd535" }}>
              {activeTab === "top10" ? "Top 10 Client Risk Overview" : "Client Portfolio Overview"}
            </CardTitle>

            {/* The ONLY TabList (inside the card, right side) */}
            <TabsList className="bg-[#1e2329]">
              <TabsTrigger
                value="top10"
                className="data-[state=inactive]:text-white data-[state=active]:bg-[#fcd535] data-[state=active]:text-[#181a20]"
              >
                Top 10
              </TabsTrigger>
              <TabsTrigger
                value="all"
                className="data-[state=inactive]:text-white data-[state=active]:bg-[#fcd535] data-[state=active]:text-[#181a20]"
              >
                All Clients
              </TabsTrigger>
            </TabsList>
          </CardHeader>

          <CardContent>
            {/* ---------------------------- TOP 10 CONTENT ---------------------------- */}
            <TabsContent value="top10">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader style={{ color: "#fcd535", backgroundColor: "#1e2329" }}>
                    <TableRow className="border-b border-border/50">
                      <TableHead style={{ color: "#fcd535" }}>User</TableHead>
                      <TableHead style={{ color: "#fcd535" }}>Risk Score</TableHead>
                      <TableHead style={{ color: "#fcd535" }}>Status</TableHead>
                      <TableHead style={{ color: "#fcd535" }}>Total Trades</TableHead>
                      <TableHead style={{ color: "#fcd535" }}>Volume</TableHead>
                      <TableHead style={{ color: "#fcd535" }}>Win Rate</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {filteredTopRows.map((user, index) => (
                      <TableRow
                        key={user.id}
                        className="border-b border-border/30 transition-all duration-200 animate-slide-in"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <TableCell className="font-semibold text-sm md:text-base text-white" >
                          {user.name}
                        </TableCell>

                        <TableCell>
                          <span className={cn("text-lg  font-bold", getRiskScoreColor(user.riskScore))}>
                            {user.riskScore}
                          </span>
                        </TableCell>

                        <TableCell>
                          <Badge className={cn("font-medium", getRiskColor(user.status))}>{user.status}</Badge>
                        </TableCell>

                        <TableCell className="text-white">
                          {user.totalTrades.toLocaleString()}
                        </TableCell>

                        <TableCell className="text-white">
                          {formatVolume(user.volume)}
                        </TableCell>

                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs md:text-sm">
                              <span className="font-medium text-white" >
                                {user.winRate}%
                              </span>
                            </div>
                            <Progress value={user.winRate} className="h-1.5 md:h-2 w-16 md:w-20" />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}

                    {!topLoading && filteredTopRows.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center">
                          <div className="text-center py-8 md:py-12">
                            <Users className="h-12 w-12 md:h-16 md:w-16 mx-auto text-muted-foreground/50 mb-4" />
                            <h3 className="text-lg md:text-xl font-semibold mb-2" style={{ color: "#fcd535" }}>
                              No users found
                            </h3>
                            <p className="text-sm md:text-base" style={{ color: "#848E9C" }}>
                              Try adjusting your filter criteria
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* ---------------------------- ALL CLIENTS CONTENT ---------------------------- */}
            <TabsContent value="all" className="space-y-6">
              {/* Error / Loading for All Clients (shown in All tab only) */}
              {allError && (
                <Card style={{ backgroundColor: "#1e2329" }}>
                  <CardHeader>
                    <CardTitle style={{ color: "#fcd535" }}>Error</CardTitle>
                    <CardDescription className="text-red-600">
                      {(allError as any)?.message || "Failed to load /analysis/user-list"}
                    </CardDescription>
                  </CardHeader>
                </Card>
              )}
              {allLoading && (
                <Card style={{ backgroundColor: "#1e2329" }}>
                  <CardHeader>
                    <CardTitle style={{ color: "#fcd535" }}>Loading…</CardTitle>
                    <CardDescription style={{ color: "#848E9C" }}>
                      Please wait while we fetch data.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Progress value={60} className="h-2" />
                  </CardContent>
                </Card>
              )}

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader style={{ color: "#fcd535", backgroundColor: "#1e2329" }}>
                    <TableRow>
                      <TableHead style={{ color: "#fcd535" }}>Name</TableHead>
                      <TableHead style={{ color: "#fcd535" }}>Risk Status</TableHead>
                      <TableHead style={{ color: "#fcd535" }}>Risk Score</TableHead>
                      <TableHead style={{ color: "#fcd535" }}>Total Trades</TableHead>
                      <TableHead style={{ color: "#fcd535" }}>Volume</TableHead>
                      <TableHead style={{ color: "#fcd535" }}>Win Rate</TableHead>
                      <TableHead style={{ color: "#fcd535" }}>Actions</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {filteredAllRows.map((r) => (
                      <TableRow key={r.id} className="transition-colors">
                        <TableCell className="font-medium" style={{ color: "#ffffff" }}>
                          {r.name}
                        </TableCell>
                        <TableCell>
                          <Badge>{r.status}</Badge>
                        </TableCell>
                        <TableCell style={{ color: "#ffffff" }}>{r.riskScore}</TableCell>
                        <TableCell style={{ color: "#ffffff" }}>{r.totalTrades}</TableCell>
                        <TableCell style={{ color: "#ffffff" }}>{r.volume}</TableCell>
                        <TableCell style={{ color: "#ffffff" }}>{r.winRate}%</TableCell>
                        <TableCell>
                          <Dialog
                            onOpenChange={(open) => {
                              if (!open) setSelected(null);
                            }}
                          >
                            <DialogTrigger asChild>
                              <Button
                                size="sm"
                                onClick={() => setSelected(r)}
                                style={{
                                  backgroundColor: "#fcd535",
                                  color: "#181a20",
                                  borderColor: "#3a3f47",
                                }}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl bg-[#181a20]">
                              <DialogHeader>
                                <DialogTitle style={{ color: "#fcd535" }}>
                                  Client Details — {r.name}
                                </DialogTitle>
                              </DialogHeader>
                              {selected && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                                  <div className="space-y-1">
                                    <div className="text-[#fcd535]">Name</div>
                                    <div className="font-medium text-[#ffffff]">
                                      {selected.name}
                                    </div>
                                  </div>
                                  <div className="space-y-1">
                                    <div className="text-[#fcd535]">Risk Status</div>
                                    <div className="text-[#ffffff]">{selected.status}</div>
                                  </div>
                                  <div className="space-y-1">
                                    <div className="text-[#fcd535]">Risk Score</div>
                                    <div className="font-medium text-[#ffffff] ">
                                      {selected.riskScore}
                                    </div>
                                  </div>
                                  <div className="space-y-1">
                                    <div className="text-[#fcd535]">Total Trades</div>
                                    <div className="font-medium text-[#ffffff]">
                                      {selected.totalTrades}
                                    </div>
                                    
                                  </div>
                                  <div className="space-y-1">
                                    <div className="text-[#fcd535]">Volume</div>
                                    <div className="font-medium text-[#ffffff]">
                                      {selected.volume}
                                    </div>
                                  </div>
                                  <div className="space-y-1">
                                    <div className="text-[#fcd535]">Win Rate</div>
                                    <div className="font-medium text-[#ffffff]">
                                      {selected.winRate}%
                                    </div>
                                  </div>
                                </div>
                              )}
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))}

                    {!allLoading && filteredAllRows.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground">
                          No results found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </CardContent>
        </Card>
      </Tabs>
    </div>
  );
}
