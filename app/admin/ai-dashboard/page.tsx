"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Bot,
  Sparkles,
  Shield,
  TrendingUp,
  Users,
  BarChart3,
  Brain,
  Zap
} from 'lucide-react';
import AICoPilot from '@/components/ai/AICoPilot';
import RiskScoreCard from '@/components/ai/RiskScoreCard';
import AIInsightsPanel from '@/components/ai/AIInsightsPanel';

export default function AIDashboardPage() {
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [activeTab, setActiveTab] = useState('copilot');

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg">
              <Brain className="h-8 w-8 text-white" />
            </div>
            AI Dashboard
          </h1>
          <p className="text-muted-foreground mt-2">
            Powered by advanced AI to help you make smarter decisions
          </p>
        </div>
        <Badge variant="outline" className="gap-2 px-4 py-2">
          <Zap className="h-4 w-4 text-yellow-500" />
          <span className="font-semibold">AI-Powered</span>
        </Badge>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Bot className="h-4 w-4 text-blue-500" />
              AI Queries Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,247</div>
            <p className="text-xs text-muted-foreground">+12% from yesterday</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Shield className="h-4 w-4 text-red-500" />
              High Risk Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">23</div>
            <p className="text-xs text-muted-foreground">Requires attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              Insights Generated
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">456</div>
            <p className="text-xs text-muted-foreground">Last 24 hours</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-500" />
              Anomalies Detected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
            <p className="text-xs text-muted-foreground">3 resolved</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="copilot" className="gap-2">
            <Bot className="h-4 w-4" />
            AI Co-Pilot
          </TabsTrigger>
          <TabsTrigger value="risk" className="gap-2">
            <Shield className="h-4 w-4" />
            Risk Analysis
          </TabsTrigger>
          <TabsTrigger value="insights" className="gap-2">
            <Sparkles className="h-4 w-4" />
            Insights
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="copilot" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <AICoPilot context="dashboard" />
            </div>
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Quick Actions</CardTitle>
                  <CardDescription>Common AI-powered tasks</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button variant="outline" className="w-full justify-start" size="sm">
                    <Users className="h-4 w-4 mr-2" />
                    Analyze All Users
                  </Button>
                  <Button variant="outline" className="w-full justify-start" size="sm">
                    <Shield className="h-4 w-4 mr-2" />
                    Risk Assessment Report
                  </Button>
                  <Button variant="outline" className="w-full justify-start" size="sm">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Predict Churn Risk
                  </Button>
                  <Button variant="outline" className="w-full justify-start" size="sm">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Generate Insights
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Recent AI Activity</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm">
                    <p className="font-medium">Risk score calculated</p>
                    <p className="text-xs text-muted-foreground">User: john_doe • 2 min ago</p>
                  </div>
                  <div className="text-sm">
                    <p className="font-medium">Anomaly detected</p>
                    <p className="text-xs text-muted-foreground">User: trader_123 • 15 min ago</p>
                  </div>
                  <div className="text-sm">
                    <p className="font-medium">Insights generated</p>
                    <p className="text-xs text-muted-foreground">Dashboard • 1 hour ago</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="risk" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>User Risk Analysis</CardTitle>
                <CardDescription>
                  Enter a user ID to analyze risk score
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 mb-4">
                  <input
                    type="text"
                    placeholder="Enter User ID"
                    className="flex-1 px-3 py-2 border rounded-md"
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                  />
                  <Button onClick={() => {}}>Analyze</Button>
                </div>
                {selectedUserId && (
                  <RiskScoreCard userId={selectedUserId} />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>High Risk Users</CardTitle>
                <CardDescription>Users requiring immediate attention</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">User {i}</p>
                        <p className="text-xs text-muted-foreground">user{i}@example.com</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive">Risk: {85 + i}</Badge>
                        <Button size="sm" variant="outline">View</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AIInsightsPanel userId={selectedUserId} context="dashboard" />
            
            <Card>
              <CardHeader>
                <CardTitle>AI Recommendations</CardTitle>
                <CardDescription>Smart suggestions for your platform</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-950 rounded">
                  <p className="font-medium text-sm">Optimize Trading Hours</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Peak activity detected between 9 AM - 11 AM. Consider targeted promotions during this time.
                  </p>
                </div>
                <div className="p-4 border-l-4 border-green-500 bg-green-50 dark:bg-green-950 rounded">
                  <p className="font-medium text-sm">User Retention Opportunity</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    45 users haven't traded in 30 days. Send re-engagement campaign.
                  </p>
                </div>
                <div className="p-4 border-l-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-950 rounded">
                  <p className="font-medium text-sm">Risk Management Alert</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    23 users approaching margin call threshold. Consider proactive notifications.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Predictive Analytics</CardTitle>
              <CardDescription>AI-powered forecasts and predictions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <BarChart3 className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Advanced analytics features coming soon
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
