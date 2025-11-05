"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Shield,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  Users,
  FileText,
  Download,
  RefreshCw,
} from "lucide-react";
import { complianceService, type ComplianceCheck, type AMLAlert } from "@/lib/complianceService";

export default function CompliancePage() {
  const [checks, setChecks] = useState<ComplianceCheck[]>([]);
  const [amlAlerts, setAMLAlerts] = useState<AMLAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalChecks: 0,
    pendingReviews: 0,
    highRisk: 0,
    openAlerts: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    // Load all compliance checks
    const allChecks = complianceService['getAllChecks']();
    setChecks(allChecks);

    // Load AML alerts
    const alerts = complianceService.getOpenAMLAlerts();
    setAMLAlerts(alerts);

    // Calculate stats
    setStats({
      totalChecks: allChecks.length,
      pendingReviews: allChecks.filter(c => c.status === 'review_required').length,
      highRisk: allChecks.filter(c => c.riskLevel === 'high' || c.riskLevel === 'critical').length,
      openAlerts: alerts.length,
    });
  };

  const runKYCCheck = async () => {
    setLoading(true);
    try {
      // Mock KYC data for demonstration
      const mockKYCData = {
        userId: 'user-' + Date.now(),
        fullName: 'John Doe',
        dateOfBirth: '1990-01-15',
        nationality: 'United States',
        address: '123 Main St, New York, NY 10001',
        documentType: 'passport' as const,
        documentNumber: 'P1234567',
        documentExpiry: '2027-12-31',
        documentImages: ['doc1.jpg', 'doc2.jpg'],
        selfieImage: 'selfie.jpg',
        verificationStatus: 'pending' as const,
      };

      await complianceService.verifyKYC(mockKYCData);
      loadData();
    } catch (error) {
      console.error('KYC check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const runAMLCheck = async () => {
    setLoading(true);
    try {
      // Mock transaction data for demonstration
      const mockTransactions = [
        { amount: 9500, date: new Date(), type: 'deposit' },
        { amount: 9800, date: new Date(), type: 'withdrawal' },
        { amount: 9900, date: new Date(), type: 'deposit' },
        { amount: 15000, date: new Date(), type: 'deposit' },
        { amount: 25000, date: new Date(), type: 'withdrawal' },
      ];

      await complianceService.monitorAML('user-' + Date.now(), mockTransactions);
      loadData();
    } catch (error) {
      console.error('AML check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRiskBadge = (level: string) => {
    const colors = {
      low: 'bg-green-500/10 text-green-500 border-green-500/20',
      medium: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
      high: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
      critical: 'bg-red-500/10 text-red-500 border-red-500/20',
    };
    return colors[level as keyof typeof colors] || colors.low;
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      pending: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      approved: 'bg-green-500/10 text-green-500 border-green-500/20',
      rejected: 'bg-red-500/10 text-red-500 border-red-500/20',
      review_required: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    };
    return colors[status as keyof typeof colors] || colors.pending;
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6" style={{ backgroundColor: '#0B0E11' }}>
      {/* Header */}
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <Shield className="h-8 w-8 text-[#F0B90B]" />
            AI Compliance Assistant
          </h2>
          <p className="text-gray-400 mt-1">
            Automated KYC/AML monitoring with AI-powered risk assessment
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={runKYCCheck}
            disabled={loading}
            className="bg-[#F0B90B] hover:bg-[#F0B90B]/90 text-black"
          >
            {loading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
            Run KYC Check
          </Button>
          <Button
            onClick={runAMLCheck}
            disabled={loading}
            variant="outline"
            className="border-gray-700 text-white hover:bg-gray-800"
          >
            {loading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <AlertTriangle className="h-4 w-4 mr-2" />}
            Run AML Check
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card style={{ backgroundColor: '#1E2329', borderColor: '#2B3139' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Total Checks</CardTitle>
            <FileText className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.totalChecks}</div>
            <p className="text-xs text-gray-500 mt-1">All compliance checks</p>
          </CardContent>
        </Card>

        <Card style={{ backgroundColor: '#1E2329', borderColor: '#2B3139' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Pending Reviews</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{stats.pendingReviews}</div>
            <p className="text-xs text-gray-500 mt-1">Require manual review</p>
          </CardContent>
        </Card>

        <Card style={{ backgroundColor: '#1E2329', borderColor: '#2B3139' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">High Risk</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{stats.highRisk}</div>
            <p className="text-xs text-gray-500 mt-1">High/Critical risk level</p>
          </CardContent>
        </Card>

        <Card style={{ backgroundColor: '#1E2329', borderColor: '#2B3139' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Open Alerts</CardTitle>
            <Shield className="h-4 w-4 text-[#F0B90B]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#F0B90B]">{stats.openAlerts}</div>
            <p className="text-xs text-gray-500 mt-1">Active AML alerts</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="checks" className="space-y-4">
        <TabsList className="bg-[#1E2329] border border-gray-700">
          <TabsTrigger value="checks" className="data-[state=active]:bg-[#F0B90B] data-[state=active]:text-black">
            Compliance Checks
          </TabsTrigger>
          <TabsTrigger value="alerts" className="data-[state=active]:bg-[#F0B90B] data-[state=active]:text-black">
            AML Alerts
          </TabsTrigger>
        </TabsList>

        <TabsContent value="checks" className="space-y-4">
          <Card style={{ backgroundColor: '#1E2329', borderColor: '#2B3139' }}>
            <CardHeader>
              <CardTitle className="text-white">Recent Compliance Checks</CardTitle>
              <CardDescription className="text-gray-400">
                AI-powered KYC and AML verification results
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {checks.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    No compliance checks yet. Run a KYC or AML check to get started.
                  </div>
                ) : (
                  checks.slice(0, 10).map((check) => (
                    <div
                      key={check.id}
                      className="flex items-start justify-between p-4 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors"
                      style={{ backgroundColor: '#0B0E11' }}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={getRiskBadge(check.riskLevel)}>
                            {check.riskLevel.toUpperCase()}
                          </Badge>
                          <Badge className={getStatusBadge(check.status)}>
                            {check.status.replace('_', ' ').toUpperCase()}
                          </Badge>
                          <span className="text-sm text-gray-400">
                            {check.type.toUpperCase()} Check
                          </span>
                        </div>
                        <p className="text-sm text-white mb-2">{check.aiAnalysis}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>Risk Score: {check.riskScore}/100</span>
                          <span>Findings: {check.findings.length}</span>
                          <span>User: {check.userId}</span>
                          <span>{new Date(check.checkedAt).toLocaleString()}</span>
                        </div>
                        {check.recommendations.length > 0 && (
                          <div className="mt-2 text-xs text-gray-400">
                            <strong>Recommendations:</strong> {check.recommendations.join(', ')}
                          </div>
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="text-3xl font-bold text-white">{check.riskScore}</div>
                        <div className="text-xs text-gray-500 text-center">Risk</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card style={{ backgroundColor: '#1E2329', borderColor: '#2B3139' }}>
            <CardHeader>
              <CardTitle className="text-white">Active AML Alerts</CardTitle>
              <CardDescription className="text-gray-400">
                Suspicious activity requiring investigation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {amlAlerts.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    No active AML alerts. System is monitoring for suspicious activity.
                  </div>
                ) : (
                  amlAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      className="flex items-start justify-between p-4 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors"
                      style={{ backgroundColor: '#0B0E11' }}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={getRiskBadge(alert.severity)}>
                            {alert.severity.toUpperCase()}
                          </Badge>
                          <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">
                            {alert.status.toUpperCase()}
                          </Badge>
                          <span className="text-sm text-gray-400">
                            {alert.alertType.replace(/_/g, ' ').toUpperCase()}
                          </span>
                        </div>
                        <p className="text-sm text-white mb-2">{alert.description}</p>
                        <p className="text-xs text-gray-400 mb-2">{alert.details}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>User: {alert.userId}</span>
                          <span>{new Date(alert.triggeredAt).toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="ml-4 flex gap-2">
                        <Button size="sm" variant="outline" className="border-gray-700 text-white hover:bg-gray-800">
                          Investigate
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
