"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  Download,
  Calendar,
  TrendingUp,
  BarChart3,
  PieChart,
  Activity,
  DollarSign,
  Target,
  Search,
  Filter,
  Mail,
  Clock,
} from "lucide-react";
import { KPICard } from "@/components/kpi-card";

const accountStatementsData = [
  {
    id: "AS001",
    date: "2024-01-15",
    type: "Daily",
    period: "Jan 15, 2024",
    balance: 285000,
    pnl: 2500,
    status: "Available",
  },
  {
    id: "AS002",
    date: "2024-01-01",
    type: "Monthly",
    period: "December 2023",
    balance: 275000,
    pnl: 15000,
    status: "Available",
  },
  {
    id: "AS003",
    date: "2024-01-01",
    type: "Yearly",
    period: "2023",
    balance: 260000,
    pnl: 45000,
    status: "Available",
  },
];

const performanceReportsData = [
  {
    id: "PR001",
    type: "Portfolio Performance",
    period: "Q4 2023",
    returns: 18.5,
    benchmark: 12.3,
    status: "Available",
  },
  {
    id: "PR002",
    type: "Strategy Performance",
    period: "Dec 2023",
    returns: 22.1,
    benchmark: 15.8,
    status: "Available",
  },
  {
    id: "PR003",
    type: "PnL Statement",
    period: "Jan 2024",
    realized: 25000,
    unrealized: 8500,
    status: "Available",
  },
];

export function StatementsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [periodFilter, setPeriodFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      Available: "bg-green-900/20 text-green-400",
      Ready: "bg-green-900/20 text-green-400",
      Processing: "bg-yellow-900/20 text-yellow-400",
      Pending: "bg-orange-900/20 text-orange-400",
    };
    return statusConfig[status] || "bg-gray-900/20 text-gray-400";
  };

  return (
    <div className="h-full overflow-y-auto bg-[#181a20] min-h-screen">
      <div className="space-y-6 p-4 md:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-3xl md:text-4xl font-bold text-[#fcd535]">
              Statement Center
            </h1>
            <p className="text-[#848E9C] text-lg">
              Access all your account statements, reports, and compliance
              documents
            </p>
          </div>
          <div className="flex gap-2">
            <Button className="bg-transparent border-[#2a2f36] text-[#fcd535] shadow-none hover:bg-transparent hover:text-[#fcd535] focus-visible:ring-0 active:scale-100">
              <Mail className="h-4 w-4 mr-2" />
              Email Reports
            </Button>

            <Button className="bg-transparent border-[#2a2f36] text-[#fcd535] shadow-none hover:bg-transparent hover:text-[#fcd535] focus-visible:ring-0 active:scale-100">
              <Download className="h-4 w-4 mr-2" />
              Bulk Download
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
          <KPICard
            title="Available Reports"
            icon={<FileText className="h-8 w-8 text-[#fcd535]" />}
            value={24}
          />
          <KPICard
            title="YTD Returns"
            icon={<TrendingUp className="h-8 w-8 text-[#fcd535]" />}
            value="18.5%"
          />
          <KPICard
            title="Tax Savings"
            icon={<Target className="h-8 w-8 text-[#fcd535]" />}
            value="₹2,200"
          />
          <KPICard
            title="Portfolio Value"
            icon={<DollarSign className="h-8 w-8 text-[#fcd535]" />}
            value="₹2,85,000"
          />
        </div>

        {/* Filters */}
        <Card className="bg-[#1e2329] border-[#2a2f36]">
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#848E9C]" />
                  <Input
                    placeholder="Search statements and reports..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-[#181a20] border-[#2a2f36] text-white placeholder:text-[#848E9C]"
                  />
                </div>
              </div>
              <Select value={periodFilter} onValueChange={setPeriodFilter}>
                <SelectTrigger className="w-full sm:w-48 bg-[#181a20] border-[#2a2f36] text-white">
                  <Calendar className="h-4 w-4 mr-2 text-[#848E9C]" />
                  <SelectValue placeholder="Period" />
                </SelectTrigger>
                <SelectContent className="bg-[#1e2329] text-white border-[#2a2f36]">
                  <SelectItem value="all">All Periods</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full sm:w-48 bg-[#181a20] border-[#2a2f36] text-white">
                  <Filter className="h-4 w-4 mr-2 text-[#848E9C]" />
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent className="bg-[#1e2329] text-white border-[#2a2f36]">
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="account">Account Statements</SelectItem>
                  <SelectItem value="performance">
                    Performance Reports
                  </SelectItem>
                  <SelectItem value="tax">Tax & Compliance</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="account" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 bg-[#1e2329] border border-[#2a2f36]">
            <TabsTrigger
              value="account"
              className="text-[#fcd535] data-[state=inactive]:text-[#848E9C]"
            >
              Account
            </TabsTrigger>
            <TabsTrigger
              value="performance"
              className="text-[#fcd535] data-[state=inactive]:text-[#848E9C]"
            >
              Performance
            </TabsTrigger>
          </TabsList>

          {/* Account Statements */}
          <TabsContent value="account">
            <Card className="bg-[#1e2329] border-[#2a2f36]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-[#fcd535]">
                  <FileText className="h-5 w-5" />
                  Account Statements
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-[#2a2f36]">
                      <TableHead className="text-[#848E9C]">Type</TableHead>
                      <TableHead className="text-[#848E9C]">Period</TableHead>
                      <TableHead className="text-[#848E9C]">Balance</TableHead>
                      <TableHead className="text-[#848E9C]">P&L</TableHead>
                      <TableHead className="text-[#848E9C]">Status</TableHead>
                      <TableHead className="text-[#848E9C]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accountStatementsData.map((statement) => (
                      <TableRow
                        key={statement.id}
                        className="border-b border-[#2a2f36]"
                      >
                        <TableCell className="text-white">
                          {statement.type}
                        </TableCell>
                        <TableCell className="text-[#848E9C]">
                          {statement.period}
                        </TableCell>
                        <TableCell className="text-white font-semibold">
                          ₹{statement.balance.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-green-400 font-semibold">
                          ₹{statement.pnl.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusBadge(statement.status)}>
                            {statement.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="bg-[#181a20] border-[#2a2f36] text-[#fcd535]"
                            >
                              <Download className="h-3 w-3 mr-1" /> PDF
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="bg-[#181a20] border-[#2a2f36] text-[#fcd535]"
                            >
                              <Download className="h-3 w-3 mr-1" /> Excel
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Performance Reports */}
          <TabsContent value="performance">
            <Card className="bg-[#1e2329] border-[#2a2f36]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-[#fcd535]">
                  <BarChart3 className="h-5 w-5" />
                  Performance Reports
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-[#2a2f36]">
                      <TableHead className="text-[#848E9C]">
                        Report Type
                      </TableHead>
                      <TableHead className="text-[#848E9C]">Period</TableHead>
                      <TableHead className="text-[#848E9C]">Returns</TableHead>
                      <TableHead className="text-[#848E9C]">
                        Benchmark
                      </TableHead>
                      <TableHead className="text-[#848E9C]">Status</TableHead>
                      <TableHead className="text-[#848E9C]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {performanceReportsData.map((report) => (
                      <TableRow
                        key={report.id}
                        className="border-b border-[#2a2f36]"
                      >
                        <TableCell className="text-white">
                          {report.type}
                        </TableCell>
                        <TableCell className="text-[#848E9C]">
                          {report.period}
                        </TableCell>
                        <TableCell className="text-green-400 font-semibold">
                          {report.returns
                            ? `${report.returns}%`
                            : `₹${report.realized?.toLocaleString()}`}
                        </TableCell>
                        <TableCell className="text-blue-400">
                          {report.benchmark
                            ? `${report.benchmark}%`
                            : `₹${report.unrealized?.toLocaleString()}`}
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusBadge(report.status)}>
                            {report.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="bg-[#181a20] border-[#2a2f36] text-[#fcd535]"
                            >
                              <Download className="h-3 w-3 mr-1" /> Download
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="bg-[#181a20] border-[#2a2f36] text-[#fcd535]"
                            >
                              <Mail className="h-3 w-3 mr-1" /> Email
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
