"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Users, UserCheck, UserPlus, TrendingUp, AlertTriangle, Shield } from "lucide-react";

interface UserStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  newThisMonth: number;
  adminUsers: number;
  riskUsers: number;
}

interface UserStatisticsCardsProps {
  stats: UserStats;
}

export default function UserStatisticsCards({ stats }: UserStatisticsCardsProps) {
  const cards = [
    {
      title: "Total Users",
      value: stats.totalUsers,
      icon: Users,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      trend: "+12%",
    },
    {
      title: "Active Users",
      value: stats.activeUsers,
      icon: UserCheck,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
      trend: "+8%",
    },
    {
      title: "Inactive Users",
      value: stats.inactiveUsers,
      icon: AlertTriangle,
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10",
      trend: "-3%",
    },
    {
      title: "New This Month",
      value: stats.newThisMonth,
      icon: UserPlus,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
      trend: "+24%",
    },
    {
      title: "Admin Users",
      value: stats.adminUsers,
      icon: Shield,
      color: "text-red-500",
      bgColor: "bg-red-500/10",
      trend: "0%",
    },
    {
      title: "Risk Alerts",
      value: stats.riskUsers,
      icon: TrendingUp,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
      trend: "+5%",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
      {cards.map((card, index) => (
        <Card
          key={index}
          className="border-border/50 bg-card/50 backdrop-blur-sm hover:shadow-lg transition-all duration-300 hover:scale-105"
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-lg ${card.bgColor}`}>
                <card.icon className={`h-6 w-6 ${card.color}`} />
              </div>
              <span className={`text-sm font-medium ${card.trend.startsWith('+') ? 'text-green-500' : card.trend.startsWith('-') ? 'text-red-500' : 'text-gray-500'}`}>
                {card.trend}
              </span>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">{card.title}</p>
              <p className="text-2xl font-bold">{card.value.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
