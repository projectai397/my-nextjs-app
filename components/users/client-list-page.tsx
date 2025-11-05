"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useApi } from "@/hooks/all_api";
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
import { KPICard } from "@/components/kpi-card";

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
  _src: ApiItem;
};

export function ClientListPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selected, setSelected] = useState<Row | null>(null);

  const { data, loading, error } = useApi<ApiResponse>("/analysis/user-list");
  const kpis = useApi("/analysis/me/kpis");
  const items = data?.items ?? [];

  const totalClients = items.length;
  const activeClients = useMemo(
    () =>
      items.filter(
        (x) =>
          String(x.status) === "1" ||
          String(x.status).toLowerCase() === "active"
      ).length,
    [items]
  );
  const avgWinPct = useMemo(() => {
    const arr = items.map((x) => Number(x.win_percent ?? 0));
    if (!arr.length) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }, [items]);

  const rows: Row[] = useMemo(() => {
    const list = items.map((it: ApiItem) => ({
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
    const q = searchTerm.trim().toLowerCase();
    if (!q) return list;
    return list.filter((r) =>
      [r.name, r.userId, r.id].join(" ").toLowerCase().includes(q)
    );
  }, [items, searchTerm]);

  return (
    <div
      className="space-y-6 p-4 md:p-6 h-full overflow-y-auto"
      style={{ backgroundColor: "#181a20" }}
    >
      {/* Header */}
      {/* <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1
            className="text-2xl md:text-3xl font-bold"
            style={{ color: "#fcd535" }}
          >
            Client Management
          </h1>
          <p
            className="text-muted-foreground mt-1"
            style={{ color: "#848E9C" }}
          >
            Comprehensive AUM trader client portal and menu structure
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Users className="h-4 w-4 mr-2" />
            Add Client
          </Button>
        </div>
      </div> */}

      {/* Search */}
      <Card style={{ backgroundColor: "#1e2329", border: "none" }}>
        <CardHeader>
          <CardTitle
            className="flex items-center gap-2"
            style={{ color: "#fcd535" }}
          >
            <Search className="h-5 w-5 text-primary" />
            Client Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Type to filter..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-white"
          />
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
        <KPICard
          title="Total Clients"
          value={totalClients}
          icon={<Users className="h-8 w-8 text-[#fcd535]" />}
        />
        <KPICard
          title="Total AUM"
          value={kpis.data?.trading_volume}
          icon={<DollarSign className="h-8 w-8 text-[#fcd535]" />}
        />
        <KPICard
          title="Active Clients"
          value={activeClients}
          icon={<Activity className="h-8 w-8 text-[#fcd535]" />}
        />
        <KPICard
          title="Avg Win %"
          value={
            avgWinPct >= 0 ? (
              <span className="inline-flex items-center gap-1 text-[#2EBD85]">
                <ArrowUpRight className="h-5 w-5" />
                {avgWinPct.toFixed(1)}%
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[#F6465D]">
                <ArrowDownRight className="h-5 w-5" />
                {Math.abs(avgWinPct).toFixed(1)}%
              </span>
            )
          }
          icon={<TrendingUp className="h-8 w-8 text-primary" />}
        />
      </div>

      {/* Error / Loading */}
      {error && (
        <Card style={{ backgroundColor: "#1e2329" }}>
          <CardHeader>
            <CardTitle style={{ color: "#fcd535" }}>Error</CardTitle>
            <CardDescription className="text-red-600">
              {(error as any)?.message || "Failed to load /analysis/user-list"}
            </CardDescription>
          </CardHeader>
        </Card>
      )}
      {loading && (
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

      {/* Table — ONLY requested fields */}
      <Card style={{ backgroundColor: "#1e2329", border: "none" }}>
        <CardHeader>
          <CardTitle style={{ color: "#fcd535" }}>
            Client Portfolio Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader
                style={{ color: "#fcd535", backgroundColor: "#1e2329" }}
              >
                <TableRow>
                  <TableHead style={{ color: "#fcd535" }}>Name</TableHead>
                  <TableHead style={{ color: "#fcd535" }}>
                    Risk Status
                  </TableHead>
                  <TableHead style={{ color: "#fcd535" }}>Risk Score</TableHead>
                  <TableHead style={{ color: "#fcd535" }}>
                    Total Trades
                  </TableHead>
                  <TableHead style={{ color: "#fcd535" }}>Volume</TableHead>
                  <TableHead style={{ color: "#fcd535" }}>Win Rate</TableHead>
                  <TableHead style={{ color: "#fcd535" }}>Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id} className="transition-colors">
                    <TableCell
                      className="font-medium"
                      style={{ color: "#ffffff" }}
                    >
                      {r.name}
                    </TableCell>
                    <TableCell>
                      <Badge>{r.status}</Badge>
                    </TableCell>
                    <TableCell style={{ color: "#ffffff" }}>
                      {r.riskScore}
                    </TableCell>
                    <TableCell style={{ color: "#ffffff" }}>
                      {r.totalTrades}
                    </TableCell>
                    <TableCell style={{ color: "#ffffff" }}>
                      {r.volume}
                    </TableCell>
                    <TableCell style={{ color: "#ffffff" }}>
                      {r.winRate}%
                    </TableCell>
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
                                <div className="text-[#fcd535]">
                                  Risk Status
                                </div>
                                <div className="text-[#ffffff]">
                                  {selected.status}
                                </div>
                              </div>
                              <div className="space-y-1">
                                <div className="text-[#fcd535]">Risk Score</div>
                                <div className="font-medium text-[#ffffff] ">
                                  {selected.riskScore}
                                </div>
                              </div>
                              <div className="space-y-1">
                                <div className="text-[#fcd535]">
                                  Total Trades
                                </div>
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

                {!loading && rows.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center text-muted-foreground"
                    >
                      No results found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
