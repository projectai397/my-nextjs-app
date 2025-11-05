"use client";

import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Activity, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { fetchMarketData, MarketDataItem as ApiMarketDataItem } from '@/lib/widgetApiService';

type MarketDataItem = ApiMarketDataItem;

interface _MarketDataItem {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  high: number;
  low: number;
}

export const MarketDataWidget: React.FC = () => {
  const [marketData, setMarketData] = useState<MarketDataItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadMarketData();
    const interval = setInterval(loadMarketData, 10000); // Update every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const loadMarketData = async () => {
    setLoading(true);
    try {
      const data = await fetchMarketData();
      if (data && data.length > 0) {
        setMarketData(data.slice(0, 6)); // Show top 6
      } else {
        // Fallback to mock data
        setMarketData(getMockMarketData());
      }
    } catch (error) {
      console.error('Failed to load market data:', error);
      setMarketData(getMockMarketData());
    } finally {
      setLoading(false);
    }
  };

  const getMockMarketData = (): MarketDataItem[] => [
    {
      symbol: 'BTC/USD',
      name: 'Bitcoin',
      price: 43250.50,
      change: 1250.30,
      changePercent: 2.98,
      volume: 28500000000,
      high: 43500.00,
      low: 41800.00,
    },
    {
      symbol: 'ETH/USD',
      name: 'Ethereum',
      price: 2285.75,
      change: -45.20,
      changePercent: -1.94,
      volume: 12300000000,
      high: 2350.00,
      low: 2250.00,
    },
    {
      symbol: 'AAPL',
      name: 'Apple Inc.',
      price: 178.32,
      change: 2.15,
      changePercent: 1.22,
      volume: 52000000,
      high: 179.50,
      low: 176.80,
    },
    {
      symbol: 'TSLA',
      name: 'Tesla Inc.',
      price: 242.84,
      change: -5.67,
      changePercent: -2.28,
      volume: 98000000,
      high: 248.50,
      low: 241.20,
    },
  ];


  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setMarketData((prev) =>
        prev.map((item) => {
          const randomChange = (Math.random() - 0.5) * 10;
          const newPrice = item.price + randomChange;
          const change = newPrice - item.price;
          const changePercent = (change / item.price) * 100;

          return {
            ...item,
            price: newPrice,
            change,
            changePercent,
          };
        })
      );
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const formatNumber = (num: number, decimals: number = 2) => {
    return num.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  const formatVolume = (num: number) => {
    if (num >= 1000000000) {
      return `$${(num / 1000000000).toFixed(2)}B`;
    }
    if (num >= 1000000) {
      return `$${(num / 1000000).toFixed(2)}M`;
    }
    return `$${num.toLocaleString()}`;
  };

  return (
    <div className="h-full flex flex-col">
          <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-blue-500" />
          <h3 className="font-semibold">Market Data</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={loadMarketData}
          disabled={loading}
          className="h-8 w-8 p-0"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <div className="flex-1 overflow-auto space-y-3">
        {marketData.map((item) => (
          <div
            key={item.symbol}
            className="p-3 border rounded-lg hover:bg-accent/50 transition-colors"
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="font-semibold text-sm">{item.symbol}</div>
                <div className="text-xs text-muted-foreground">{item.name}</div>
              </div>
              <div className="text-right">
                <div className="font-bold text-lg">
                  ${formatNumber(item.price)}
                </div>
                <div
                  className={`flex items-center justify-end gap-1 text-xs ${
                    item.change >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {item.change >= 0 ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  <span>
                    {item.change >= 0 ? '+' : ''}
                    {formatNumber(item.change)} (
                    {item.change >= 0 ? '+' : ''}
                    {formatNumber(item.changePercent)}%)
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
              <div>
                <div className="text-[10px] uppercase">Volume</div>
                <div className="font-medium text-foreground">
                  {formatVolume(item.volume)}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase">High</div>
                <div className="font-medium text-foreground">
                  ${formatNumber(item.high)}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase">Low</div>
                <div className="font-medium text-foreground">
                  ${formatNumber(item.low)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MarketDataWidget;
