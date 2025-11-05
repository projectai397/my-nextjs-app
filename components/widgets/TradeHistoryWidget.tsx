"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { History, TrendingUp, TrendingDown, Clock, RefreshCw, Filter } from 'lucide-react';

interface Trade {
  id: string;
  symbol: string;
  type: 'buy' | 'sell';
  price: number;
  amount: number;
  total: number;
  timestamp: Date;
  status: 'completed' | 'pending' | 'cancelled';
}

export default function TradeHistoryWidget() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'buy' | 'sell'>('all');

  useEffect(() => {
    loadTrades();
  }, []);

  const loadTrades = () => {
    setLoading(true);
    
    // Mock trade data
    const symbols = ['BTC/USD', 'ETH/USD', 'SOL/USD', 'ADA/USD'];
    const mockTrades: Trade[] = [];

    for (let i = 0; i < 20; i++) {
      const type = Math.random() > 0.5 ? 'buy' : 'sell';
      const symbol = symbols[Math.floor(Math.random() * symbols.length)];
      const price = Math.random() * 50000 + 1000;
      const amount = Math.random() * 2;
      
      mockTrades.push({
        id: `trade-${i}`,
        symbol,
        type,
        price,
        amount,
        total: price * amount,
        timestamp: new Date(Date.now() - Math.random() * 3600000),
        status: 'completed'
      });
    }

    // Sort by timestamp (newest first)
    mockTrades.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    setTrades(mockTrades);
    setLoading(false);
  };

  const getTimeAgo = (date: Date) => {
    const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  const formatPrice = (price: number) => {
    return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatAmount = (amount: number) => {
    return amount.toFixed(4);
  };

  const filteredTrades = filter === 'all' 
    ? trades 
    : trades.filter(trade => trade.type === filter);

  const stats = {
    totalTrades: trades.length,
    buyTrades: trades.filter(t => t.type === 'buy').length,
    sellTrades: trades.filter(t => t.type === 'sell').length,
    totalVolume: trades.reduce((sum, t) => sum + t.total, 0)
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5" />
            <CardTitle>Trade History</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={loadTrades}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 mt-4">
          <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded">
            <div className="text-xs text-gray-600 dark:text-gray-400">Total Trades</div>
            <div className="text-lg font-semibold">{stats.totalTrades}</div>
          </div>
          <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded">
            <div className="text-xs text-gray-600 dark:text-gray-400">Volume</div>
            <div className="text-lg font-semibold">${(stats.totalVolume / 1000).toFixed(1)}K</div>
          </div>
        </div>

        {/* Filter */}
        <div className="flex gap-2 mt-4">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            All ({stats.totalTrades})
          </Button>
          <Button
            variant={filter === 'buy' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('buy')}
            className={filter === 'buy' ? 'bg-green-600 hover:bg-green-700' : ''}
          >
            <TrendingUp className="w-3 h-3 mr-1" />
            Buy ({stats.buyTrades})
          </Button>
          <Button
            variant={filter === 'sell' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('sell')}
            className={filter === 'sell' ? 'bg-red-600 hover:bg-red-700' : ''}
          >
            <TrendingDown className="w-3 h-3 mr-1" />
            Sell ({stats.sellTrades})
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="space-y-2">
            {filteredTrades.map((trade) => (
              <div
                key={trade.id}
                className={`border rounded-lg p-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                  trade.type === 'buy' 
                    ? 'border-l-4 border-l-green-500' 
                    : 'border-l-4 border-l-red-500'
                }`}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {trade.type === 'buy' ? (
                      <TrendingUp className="w-4 h-4 text-green-600" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-600" />
                    )}
                    <span className="font-semibold text-sm">{trade.symbol}</span>
                    <Badge 
                      variant="outline"
                      className={trade.type === 'buy' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}
                    >
                      {trade.type.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Clock className="w-3 h-3" />
                    {getTimeAgo(trade.timestamp)}
                  </div>
                </div>

                {/* Details */}
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <div className="text-gray-600 dark:text-gray-400">Price</div>
                    <div className="font-mono font-semibold">${formatPrice(trade.price)}</div>
                  </div>
                  <div>
                    <div className="text-gray-600 dark:text-gray-400">Amount</div>
                    <div className="font-mono">{formatAmount(trade.amount)}</div>
                  </div>
                  <div>
                    <div className="text-gray-600 dark:text-gray-400">Total</div>
                    <div className="font-mono font-semibold">${formatPrice(trade.total)}</div>
                  </div>
                </div>

                {/* Status */}
                <div className="mt-2 flex items-center justify-between">
                  <Badge 
                    variant="outline"
                    className={
                      trade.status === 'completed' 
                        ? 'bg-blue-100 text-blue-800' 
                        : trade.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }
                  >
                    {trade.status}
                  </Badge>
                  <span className="text-xs text-gray-500">ID: {trade.id}</span>
                </div>
              </div>
            ))}

            {filteredTrades.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                No trades found
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
