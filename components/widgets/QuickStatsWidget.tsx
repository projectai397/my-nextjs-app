"use client";

import React from 'react';
import { Users, DollarSign, TrendingUp, Activity } from 'lucide-react';

export const QuickStatsWidget: React.FC = () => {
  const stats = [
    {
      label: 'Total Users',
      value: '12,458',
      change: '+12.5%',
      trend: 'up',
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-500/10',
    },
    {
      label: 'Total Volume',
      value: '$2.4M',
      change: '+8.2%',
      trend: 'up',
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-500/10',
    },
    {
      label: 'Active Trades',
      value: '1,234',
      change: '-3.1%',
      trend: 'down',
      icon: Activity,
      color: 'text-purple-600',
      bgColor: 'bg-purple-500/10',
    },
    {
      label: 'Profit Today',
      value: '$45.2K',
      change: '+15.8%',
      trend: 'up',
      icon: TrendingUp,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-500/10',
    },
  ];

  return (
    <div className="h-full">
      <div className="grid grid-cols-2 gap-3 h-full">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className="p-4 border rounded-lg hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </div>
                <div
                  className={`text-xs font-medium ${
                    stat.trend === 'up' ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {stat.change}
                </div>
              </div>
              <div className="text-2xl font-bold mb-1">{stat.value}</div>
              <div className="text-xs text-muted-foreground">{stat.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default QuickStatsWidget;
