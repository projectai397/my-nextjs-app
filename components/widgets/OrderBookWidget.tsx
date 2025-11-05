"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BookOpen, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';

interface OrderBookEntry {
  price: number;
  amount: number;
  total: number;
}

export default function OrderBookWidget() {
  const [symbol, setSymbol] = useState('BTC/USD');
  const [bids, setBids] = useState<OrderBookEntry[]>([]);
  const [asks, setAsks] = useState<OrderBookEntry[]>([]);
  const [spread, setSpread] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadOrderBook();
    const interval = setInterval(loadOrderBook, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, [symbol]);

  const loadOrderBook = () => {
    setLoading(true);
    
    // Mock order book data
    const basePrice = 45000;
    const mockBids: OrderBookEntry[] = [];
    const mockAsks: OrderBookEntry[]= [];

    // Generate bids (buy orders)
    for (let i = 0; i < 10; i++) {
      const price = basePrice - (i * 10) - Math.random() * 5;
      const amount = Math.random() * 2;
      mockBids.push({
        price,
        amount,
        total: price * amount
      });
    }

    // Generate asks (sell orders)
    for (let i = 0; i < 10; i++) {
      const price = basePrice + (i * 10) + Math.random() * 5;
      const amount = Math.random() * 2;
      mockAsks.push({
        price,
        amount,
        total: price * amount
      });
    }

    setBids(mockBids);
    setAsks(mockAsks);
    setSpread(mockAsks[0]?.price - mockBids[0]?.price || 0);
    setLoading(false);
  };

  const getMaxTotal = () => {
    const maxBid = Math.max(...bids.map(b => b.total));
    const maxAsk = Math.max(...asks.map(a => a.total));
    return Math.max(maxBid, maxAsk);
  };

  const formatPrice = (price: number) => {
    return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatAmount = (amount: number) => {
    return amount.toFixed(4);
  };

  const maxTotal = getMaxTotal();

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            <CardTitle>Order Book</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{symbol}</Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={loadOrderBook}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Spread Info */}
        <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Spread:</span>
            <span className="font-semibold">${formatPrice(spread)}</span>
          </div>
          <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
            <span>Best Bid:</span>
            <span className="text-green-600">${formatPrice(bids[0]?.price || 0)}</span>
          </div>
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Best Ask:</span>
            <span className="text-red-600">${formatPrice(asks[0]?.price || 0)}</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden flex flex-col">
        {/* Column Headers */}
        <div className="grid grid-cols-3 gap-2 text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">
          <div className="text-left">Price</div>
          <div className="text-right">Amount</div>
          <div className="text-right">Total</div>
        </div>

        {/* Asks (Sell Orders) */}
        <div className="flex-1 overflow-y-auto mb-2">
          <div className="space-y-1">
            {[...asks].reverse().map((ask, index) => (
              <div
                key={`ask-${index}`}
                className="relative grid grid-cols-3 gap-2 text-xs py-1 px-2 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                {/* Background bar */}
                <div
                  className="absolute inset-0 bg-red-100 dark:bg-red-900/30 rounded"
                  style={{ width: `${(ask.total / maxTotal) * 100}%` }}
                />
                
                {/* Content */}
                <div className="relative text-red-600 dark:text-red-400 font-mono">
                  ${formatPrice(ask.price)}
                </div>
                <div className="relative text-right font-mono">
                  {formatAmount(ask.amount)}
                </div>
                <div className="relative text-right text-gray-600 dark:text-gray-400 font-mono">
                  ${formatPrice(ask.total)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Spread Indicator */}
        <div className="flex items-center justify-center gap-2 py-2 my-1 border-y border-gray-200 dark:border-gray-700">
          <TrendingDown className="w-4 h-4 text-red-500" />
          <span className="text-sm font-semibold">${formatPrice(spread)}</span>
          <TrendingUp className="w-4 h-4 text-green-500" />
        </div>

        {/* Bids (Buy Orders) */}
        <div className="flex-1 overflow-y-auto mt-2">
          <div className="space-y-1">
            {bids.map((bid, index) => (
              <div
                key={`bid-${index}`}
                className="relative grid grid-cols-3 gap-2 text-xs py-1 px-2 rounded hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
              >
                {/* Background bar */}
                <div
                  className="absolute inset-0 bg-green-100 dark:bg-green-900/30 rounded"
                  style={{ width: `${(bid.total / maxTotal) * 100}%` }}
                />
                
                {/* Content */}
                <div className="relative text-green-600 dark:text-green-400 font-mono">
                  ${formatPrice(bid.price)}
                </div>
                <div className="relative text-right font-mono">
                  {formatAmount(bid.amount)}
                </div>
                <div className="relative text-right text-gray-600 dark:text-gray-400 font-mono">
                  ${formatPrice(bid.total)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
