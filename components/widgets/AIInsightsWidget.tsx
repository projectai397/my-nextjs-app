"use client";

import React from 'react';
import { Brain, AlertTriangle, TrendingUp, Info, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface Insight {
  id: string;
  type: 'opportunity' | 'warning' | 'info' | 'prediction';
  title: string;
  description: string;
  confidence: number;
  impact: 'high' | 'medium' | 'low';
  timestamp: Date;
}

export const AIInsightsWidget: React.FC = () => {
  const insights: Insight[] = [
    {
      id: '1',
      type: 'opportunity',
      title: 'Strong Buy Signal Detected',
      description: 'BTC showing bullish momentum with high volume. RSI indicates oversold conditions.',
      confidence: 87,
      impact: 'high',
      timestamp: new Date(Date.now() - 5 * 60 * 1000),
    },
    {
      id: '2',
      type: 'warning',
      title: 'Increased Volatility Alert',
      description: 'ETH volatility 45% above average. Consider adjusting position sizes.',
      confidence: 92,
      impact: 'high',
      timestamp: new Date(Date.now() - 15 * 60 * 1000),
    },
    {
      id: '3',
      type: 'prediction',
      title: 'Market Trend Forecast',
      description: 'AI predicts 65% probability of upward movement in next 24h based on historical patterns.',
      confidence: 65,
      impact: 'medium',
      timestamp: new Date(Date.now() - 30 * 60 * 1000),
    },
    {
      id: '4',
      type: 'info',
      title: 'Portfolio Rebalancing Suggestion',
      description: 'Your BTC allocation is 12% above target. Consider rebalancing for optimal diversification.',
      confidence: 78,
      impact: 'medium',
      timestamp: new Date(Date.now() - 60 * 60 * 1000),
    },
  ];

  const getInsightIcon = (type: Insight['type']) => {
    switch (type) {
      case 'opportunity':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'prediction':
        return <Sparkles className="h-4 w-4 text-purple-600" />;
      case 'info':
        return <Info className="h-4 w-4 text-blue-600" />;
    }
  };

  const getImpactColor = (impact: Insight['impact']) => {
    switch (impact) {
      case 'high':
        return 'bg-red-500/10 text-red-600 border-red-500/20';
      case 'medium':
        return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      case 'low':
        return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
    }
  };

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000 / 60);
    
    if (diff < 1) return 'Just now';
    if (diff < 60) return `${diff}m ago`;
    const hours = Math.floor(diff / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">AI Insights</span>
        </div>
        <Badge variant="outline" className="text-xs">
          <Sparkles className="h-3 w-3 mr-1" />
          Powered by AI
        </Badge>
      </div>

      {/* Insights List */}
      <div className="flex-1 overflow-auto space-y-3">
        {insights.map((insight) => (
          <div
            key={insight.id}
            className="p-3 border rounded-lg hover:bg-accent/50 transition-colors"
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5">{getInsightIcon(insight.type)}</div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h4 className="font-semibold text-sm">{insight.title}</h4>
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${getImpactColor(insight.impact)}`}
                  >
                    {insight.impact}
                  </Badge>
                </div>
                
                <p className="text-xs text-muted-foreground mb-3">
                  {insight.description}
                </p>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Confidence</span>
                    <span className="font-medium">{insight.confidence}%</span>
                  </div>
                  <Progress value={insight.confidence} className="h-1" />
                </div>

                <div className="mt-2 text-[10px] text-muted-foreground">
                  {formatTimestamp(insight.timestamp)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-4 pt-4 border-t">
        <div className="text-xs text-muted-foreground text-center">
          AI analyzes 100+ data points in real-time
        </div>
      </div>
    </div>
  );
};

export default AIInsightsWidget;
