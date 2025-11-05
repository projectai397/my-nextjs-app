"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Shield,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

interface RiskScoreCardProps {
  userId: string;
  userName?: string;
}

interface RiskData {
  overallScore: number;
  breakdown: {
    leverageRisk: number;
    balanceRisk: number;
    patternRisk: number;
  };
  recommendations: string[];
}

const RiskScoreCard: React.FC<RiskScoreCardProps> = ({ userId, userName }) => {
  const [riskData, setRiskData] = useState<RiskData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchRiskScore = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/ai/analyze-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          analysisType: 'risk'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch risk score');
      }

      const data = await response.json();
      setRiskData(data.data);
    } catch (error) {
      console.error('Risk Score Error:', error);
      toast.error('Failed to calculate risk score');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRiskScore();
  }, [userId]);

  const getRiskLevel = (score: number): { label: string; color: string; icon: React.ReactNode } => {
    if (score >= 75) {
      return {
        label: 'High Risk',
        color: 'text-red-500',
        icon: <AlertTriangle className="h-5 w-5 text-red-500" />
      };
    } else if (score >= 50) {
      return {
        label: 'Medium Risk',
        color: 'text-yellow-500',
        icon: <TrendingUp className="h-5 w-5 text-yellow-500" />
      };
    } else if (score >= 25) {
      return {
        label: 'Low Risk',
        color: 'text-blue-500',
        icon: <TrendingDown className="h-5 w-5 text-blue-500" />
      };
    } else {
      return {
        label: 'Very Low Risk',
        color: 'text-green-500',
        icon: <Shield className="h-5 w-5 text-green-500" />
      };
    }
  };

  if (isLoading && !riskData) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!riskData) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">No risk data available</p>
        </CardContent>
      </Card>
    );
  }

  const riskLevel = getRiskLevel(riskData.overallScore);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {riskLevel.icon}
            <CardTitle>Risk Assessment</CardTitle>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchRiskScore}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
        {userName && (
          <p className="text-sm text-muted-foreground">User: {userName}</p>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Overall Risk Score */}
        <div className="text-center space-y-2">
          <div className="relative inline-flex items-center justify-center">
            <div className="w-32 h-32 rounded-full border-8 border-muted flex items-center justify-center">
              <div className="text-center">
                <p className={`text-3xl font-bold ${riskLevel.color}`}>
                  {riskData.overallScore}
                </p>
                <p className="text-xs text-muted-foreground">/ 100</p>
              </div>
            </div>
          </div>
          <Badge variant={riskData.overallScore >= 75 ? 'destructive' : 'secondary'}>
            {riskLevel.label}
          </Badge>
        </div>

        {/* Risk Breakdown */}
        <div className="space-y-4">
          <p className="text-sm font-medium">Risk Breakdown:</p>
          
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Leverage Risk</span>
                <span className="font-medium">{riskData.breakdown.leverageRisk}%</span>
              </div>
              <Progress value={riskData.breakdown.leverageRisk} className="h-2" />
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Balance Risk</span>
                <span className="font-medium">{riskData.breakdown.balanceRisk}%</span>
              </div>
              <Progress value={riskData.breakdown.balanceRisk} className="h-2" />
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Pattern Risk</span>
                <span className="font-medium">{riskData.breakdown.patternRisk}%</span>
              </div>
              <Progress value={riskData.breakdown.patternRisk} className="h-2" />
            </div>
          </div>
        </div>

        {/* Recommendations */}
        {riskData.recommendations && riskData.recommendations.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">AI Recommendations:</p>
            <ul className="space-y-2">
              {riskData.recommendations.map((rec, idx) => (
                <li key={idx} className="text-sm flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span className="flex-1">{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RiskScoreCard;
