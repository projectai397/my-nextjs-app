"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star, TrendingUp, TrendingDown, Plus, X, RefreshCw } from 'lucide-react';

interface WatchlistItem {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  changePercent24h: number;
  volume24h: number;
  marketCap: number;
}

export default function WatchlistWidget() {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadWatchlist();
    const interval = setInterval(updatePrices, 3000); // Update every 3 seconds
    return () => clearInterval(interval);
  }, []);

  const loadWatchlist = () => {
    setLoading(true);
    
    // Mock watchlist data
    const mockData: WatchlistItem[] = [
      {
        symbol: 'BTC/USD',
        name: 'Bitcoin',
        price: 45234.56,
        change24h: 1234.56,
        changePercent24h: 2.8,
        volume24h: 28500000000,
        marketCap: 885000000000
      },
      {
        symbol: 'ETH/USD',
        name: 'Ethereum',
        price: 2345.67,
        change24h: -45.23,
        changePercent24h: -1.9,
        volume24h: 12300000000,
        marketCap: 282000000000
      },
      {
        symbol: 'SOL/USD',
        name: 'Solana',
        price: 98.45,
        change24h: 5.67,
        changePercent24h: 6.1,
        volume24h: 1200000000,
        marketCap: 42000000000
      },
      {
        symbol: 'ADA/USD',
        name: 'Cardano',
        price: 0.5234,
        change24h: 0.0234,
        changePercent24h: 4.7,
        volume24h: 450000000,
        marketCap: 18500000000
      },
      {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        price: 178.45,
        change24h: -2.34,
        changePercent24h: -1.3,
        volume24h: 52000000,
        marketCap: 2800000000000
      }
    ];

    setWatchlist(mockData);
    setLoading(false);
  };

  const updatePrices = () => {
    setWatchlist(prev => prev.map(item => ({
      ...item,
      price: item.price * (1 + (Math.random() - 0.5) * 0.001), // Small random price change
      change24h: item.change24h * (1 + (Math.random() - 0.5) * 0.01)
    })));
  };

  const removeFromWatchlist = (symbol: string) => {
    setWatchlist(prev => prev.filter(item => item.symbol !== symbol));
  };

  const formatPrice = (price: number) => {
    if (price < 1) {
      return price.toFixed(4);
    }
    return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatVolume = (volume: number) => {
    if (volume >= 1000000000) {
      return `$${(volume / 1000000000).toFixed(2)}B`;
    }
    if (volume >= 1000000) {
      return `$${(volume / 1000000).toFixed(2)}M`;
    }
    return `$${(volume / 1000).toFixed(2)}K`;
  };

  const formatMarketCap = (marketCap: number) => {
    if (marketCap >= 1000000000000) {
      return `$${(marketCap / 1000000000000).toFixed(2)}T`;
    }
    if (marketCap >= 1000000000) {
      return `$${(marketCap / 1000000000).toFixed(2)}B`;
    }
    return `$${(marketCap / 1000000).toFixed(2)}M`;
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
            <CardTitle>Watchlist</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm">
              <Plus className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={loadWatchlist}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-2 mt-4">
          <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded">
            <div className="text-xs text-gray-600 dark:text-gray-400">Assets</div>
            <div className="text-lg font-semibold">{watchlist.length}</div>
          </div>
          <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded">
            <div className="text-xs text-gray-600 dark:text-gray-400">Gainers</div>
            <div className="text-lg font-semibold text-green-600">
              {watchlist.filter(item => item.changePercent24h > 0).length}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="space-y-2">
            {watchlist.map((item) => (
              <div
                key={item.symbol}
                className="border rounded-lg p-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group"
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <div>
                      <div className="font-semibold text-sm">{item.symbol}</div>
                      <div className="text-xs text-gray-500">{item.name}</div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                    onClick={() => removeFromWatchlist(item.symbol)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>

                {/* Price */}
                <div className="flex items-center justify-between mb-2">
                  <div className="text-lg font-bold font-mono">
                    ${formatPrice(item.price)}
                  </div>
                  <div className={`flex items-center gap-1 text-sm font-semibold ${
                    item.changePercent24h >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {item.changePercent24h >= 0 ? (
                      <TrendingUp className="w-4 h-4" />
                    ) : (
                      <TrendingDown className="w-4 h-4" />
                    )}
                    {Math.abs(item.changePercent24h).toFixed(2)}%
                  </div>
                </div>

                {/* Change */}
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="text-gray-600 dark:text-gray-400">24h Change:</span>
                  <span className={`font-semibold ${
                    item.change24h >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {item.change24h >= 0 ? '+' : ''}{formatPrice(item.change24h)}
                  </span>
                </div>

                {/* Volume & Market Cap */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <div className="text-gray-600 dark:text-gray-400">Volume 24h</div>
                    <div className="font-semibold">{formatVolume(item.volume24h)}</div>
                  </div>
                  <div>
                    <div className="text-gray-600 dark:text-gray-400">Market Cap</div>
                    <div className="font-semibold">{formatMarketCap(item.marketCap)}</div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-2">
                  <div className="h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${
                        item.changePercent24h >= 0 ? 'bg-green-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(Math.abs(item.changePercent24h) * 10, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}

            {watchlist.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                <Star className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>Your watchlist is empty</p>
                <Button variant="outline" size="sm" className="mt-2">
                  <Plus className="w-4 h-4 mr-1" />
                  Add Assets
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
