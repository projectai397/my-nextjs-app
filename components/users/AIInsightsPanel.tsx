"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Brain,
  TrendingUp,
  AlertTriangle,
  Target,
  Zap,
  ChevronRight,
} from "lucide-react";

interface AIInsight {
  id: string;
  type: "recommendation" | "alert" | "prediction" | "anomaly";
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  action?: string;
}

interface AIInsightsPanelProps {
  insights: AIInsight[];
}

export default function AIInsightsPanel({ insights }: AIInsightsPanelProps) {
  const getIcon = (type: string) => {
    switch (type) {
      case "recommendation":
        return Target;
      case "alert":
        return AlertTriangle;
      case "prediction":
        return TrendingUp;
      case "anomaly":
        return Zap;
      default:
        return Brain;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-500/10 text-red-500 border-red-500/20";
      case "medium":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      case "low":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      default:
        return "bg-gray-500/10 text-gray-500 border-gray-500/20";
    }
  };

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-500" />
            <CardTitle className="text-lg">AI Insights & Recommendations</CardTitle>
          </div>
          <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/20">
            {insights.length} Active
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {insights.map((insight) => {
            const Icon = getIcon(insight.type);
            return (
              <div
                key={insight.id}
                className="flex items-start gap-4 p-4 rounded-lg border border-border/50 bg-background/50 hover:bg-background/80 transition-all duration-200"
              >
                <div className={`p-2 rounded-lg ${getPriorityColor(insight.priority)}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-1">
                    <h4 className="font-semibold text-sm">{insight.title}</h4>
                    <Badge
                      variant="outline"
                      className={`text-xs ${getPriorityColor(insight.priority)}`}
                    >
                      {insight.priority}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{insight.description}</p>
                  {insight.action && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 text-xs hover:bg-primary/10"
                    >
                      {insight.action}
                      <ChevronRight className="h-3 w-3 ml-1" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
