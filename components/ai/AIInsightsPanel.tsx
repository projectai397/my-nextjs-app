"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Sparkles,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Info,
  Loader2,
  RefreshCw,
  Eye
} from 'lucide-react';
import { toast } from 'sonner';

interface AIInsight {
  id: string;
  type: 'info' | 'warning' | 'success' | 'error';
  title: string;
  description: string;
  confidence: number;
  timestamp: Date;
}

interface AIInsightsPanelProps {
  userId?: string;
  context?: 'dashboard' | 'users' | 'reports';
}

const AIInsightsPanel: React.FC<AIInsightsPanelProps> = ({ userId, context = 'dashboard' }) => {
  const [behaviorInsights, setBehaviorInsights] = useState<AIInsight[]>([]);
  const [anomalies, setAnomalies] = useState<AIInsight[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('behavior');

  const fetchInsights = async () => {
    if (!userId) return;
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/ai/analyze-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          analysisType: 'all'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch insights');
      }

      const data = await response.json();
      setBehaviorInsights(data.data.behavior || []);
      setAnomalies(data.data.anomalies || []);
    } catch (error) {
      console.error('Insights Error:', error);
      toast.error('Failed to load AI insights');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchInsights();
    }
  }, [userId]);

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'error':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      default:
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  const getInsightBadgeVariant = (type: string) => {
    switch (type) {
      case 'success':
        return 'default';
      case 'warning':
        return 'secondary';
      case 'error':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const renderInsightsList = (insights: AIInsight[]) => {
    if (insights.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Eye className="h-12 w-12 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">No insights available yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            AI will analyze user behavior and provide insights
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {insights.map((insight) => (
          <Card key={insight.id} className="border-l-4" style={{
            borderLeftColor: insight.type === 'error' ? '#ef4444' :
                            insight.type === 'warning' ? '#eab308' :
                            insight.type === 'success' ? '#22c55e' : '#3b82f6'
          }}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  {getInsightIcon(insight.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h4 className="text-sm font-medium">{insight.title}</h4>
                    <Badge variant={getInsightBadgeVariant(insight.type)} className="text-xs">
                      {insight.confidence}%
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{insight.description}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            <CardTitle>AI Insights</CardTitle>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchInsights}
            disabled={isLoading || !userId}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {!userId ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Info className="h-12 w-12 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              Select a user to view AI-powered insights
            </p>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="behavior" className="gap-2">
                <TrendingUp className="h-4 w-4" />
                Behavior
                {behaviorInsights.length > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {behaviorInsights.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="anomalies" className="gap-2">
                <AlertTriangle className="h-4 w-4" />
                Anomalies
                {anomalies.length > 0 && (
                  <Badge variant="destructive" className="ml-1">
                    {anomalies.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="behavior" className="mt-4">
              {renderInsightsList(behaviorInsights)}
            </TabsContent>

            <TabsContent value="anomalies" className="mt-4">
              {renderInsightsList(anomalies)}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
};

export default AIInsightsPanel;
