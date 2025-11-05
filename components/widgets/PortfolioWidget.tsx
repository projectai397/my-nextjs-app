"use client";

import React, { useState, useEffect } from 'react';
import { Wallet, TrendingUp, TrendingDown, PieChart, RefreshCw } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { fetchPortfolio, PortfolioSummary } from '@/lib/dashboardApiService';

export const PortfolioWidget: React.FC = () => {
  const [portfolio, setPortfolio] = useState<PortfolioSummary | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadPortfolio();
    const interval = setInterval(loadPortfolio, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadPortfolio = async () => {
    setLoading(true);
    try {
      const data = await fetchPortfolio();
      setPortfolio(data);
    } catch (error) {
      console.error('Failed to load portfolio:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!portfolio) {
    return <div className="h-full flex items-center justify-center">Loading...</div>;
  }

  const mockPortfolio = {
    totalValue: 125430.50,
    totalInvested: 100000.00,
    totalGain: 25430.50,
    totalGainPercent: 25.43,
    dayChange: 1250.30,
    dayChangePercent: 1.01,
    assets: [
      {
        symbol: 'BTC',
        name: 'Bitcoin',
        quantity: 2.5,
        avgPrice: 38000,
        currentPrice: 43250.50,
        value: 108126.25,
        allocation: 86.2,
        gain: 13126.25,
        gainPercent: 13.82,
      },
      {
        symbol: 'ETH',
        name: 'Ethereum',
        quantity: 5.0,
        avgPrice: 2100,
        currentPrice: 2285.75,
        value: 11428.75,
        allocation: 9.1,
        gain: 928.75,
        gainPercent: 8.84,
      },
      {
        symbol: 'AAPL',
        name: 'Apple',
        quantity: 30,
        avgPrice: 165.50,
        currentPrice: 178.32,
        value: 5349.60,
        allocation: 4.3,
        gain: 384.60,
        gainPercent: 7.75,
      },
    ],
  };


  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Wallet className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Portfolio Summary</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={loadPortfolio}
          disabled={loading}
          className="h-8 w-8 p-0"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Total Value */}
      <div className="mb-6">
        <div className="text-3xl font-bold mb-1">
          {formatCurrency(portfolio.totalValue)}
        </div>
        <div className="flex items-center gap-2 text-sm mt-1">
          <span
            className={`flex items-center gap-1 ${
              portfolio.totalChange24h >= 0 ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {portfolio.totalChange24h >= 0 ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {portfolio.totalChange24h >= 0 ? '+' : ''}
            {formatCurrency(Math.abs(portfolio.totalChange24h))} (
            {portfolio.totalChangePercent24h >= 0 ? '+' : ''}
            {portfolio.totalChangePercent24h.toFixed(2)}%)
          </span>
          <span className="text-muted-foreground">24h</span>
        </div>
      </div>

      {/* Assets */}
      <div className="flex-1 overflow-auto space-y-3">
        {portfolio.assets.map((asset) => (
          <div key={asset.symbol} className="p-3 border rounded-lg">
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="font-semibold text-sm">{asset.symbol}</div>
                <div className="text-xs text-muted-foreground">
                  {asset.quantity} @ {formatCurrency(asset.avgPrice)}
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-sm">
                  {formatCurrency(asset.value)}
                </div>
                <div
                  className={`text-xs ${
                    asset.gain >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {asset.gain >= 0 ? '+' : ''}
                  {formatCurrency(asset.gain)} (
                  {asset.gain >= 0 ? '+' : ''}
                  {asset.gainPercent.toFixed(2)}%)
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Allocation</span>
                <span className="font-medium">{asset.allocation.toFixed(1)}%</span>
              </div>
              <Progress value={asset.allocation} className="h-1" />
            </div>
          </div>
        ))}
      </div>

      {/* Summary Stats */}
      <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-4 text-sm">
        <div>
          <div className="text-xs text-muted-foreground uppercase mb-1">
            Invested
          </div>
          <div className="font-semibold">
            {formatCurrency(portfolio.totalInvested)}
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground uppercase mb-1">
            Assets
          </div>
          <div className="font-semibold">{portfolio.assets.length}</div>
        </div>
      </div>
    </div>
  );
};

export default PortfolioWidget;
