"use client";

import React, { useState } from 'react';
import TradingViewChart from '@/components/charts/TradingViewChart';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  TrendingDown,
  Search,
  Star,
  Plus,
  BarChart3,
  Activity,
  Eye,
  EyeOff
} from 'lucide-react';

export default function WatchListProPage() {
  const [selectedSymbol, setSelectedSymbol] = useState<any>(null);
  const [showChart, setShowChart] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Sample watchlist data (replace with real API data)
  const watchlists = {
    favorites: [
      { symbol: 'NIFTY 50', ltp: 19850.25, change: 125.30, changePercent: 0.63, volume: '125.5M', high: 19920.50, low: 19750.80 },
      { symbol: 'SENSEX', ltp: 66589.93, change: -125.33, changePercent: -0.19, volume: '89.2M', high: 66750.20, low: 66450.10 },
      { symbol: 'BANKNIFTY', ltp: 44250.80, change: 245.60, changePercent: 0.56, volume: '45.8M', high: 44380.90, low: 44100.50 },
    ],
    stocks: [
      { symbol: 'RELIANCE', ltp: 2456.75, change: 12.30, changePercent: 0.50, volume: '12.5M', high: 2478.90, low: 2445.20 },
      { symbol: 'TCS', ltp: 3678.90, change: -23.45, changePercent: -0.63, volume: '8.9M', high: 3705.50, low: 3665.30 },
      { symbol: 'INFY', ltp: 1523.40, change: 8.75, changePercent: 0.58, volume: '15.2M', high: 1535.80, low: 1515.60 },
      { symbol: 'HDFC BANK', ltp: 1645.90, change: -5.60, changePercent: -0.34, volume: '10.3M', high: 1655.20, low: 1638.40 },
      { symbol: 'ICICI BANK', ltp: 945.35, change: 7.25, changePercent: 0.77, volume: '18.7M', high: 952.80, low: 938.90 },
    ],
    futures: [
      { symbol: 'NIFTY FUT', ltp: 19875.50, change: 132.40, changePercent: 0.67, volume: '78.5M', high: 19945.20, low: 19775.30 },
      { symbol: 'BANKNIFTY FUT', ltp: 44280.25, change: 258.90, changePercent: 0.59, volume: '32.1M', high: 44410.60, low: 44125.80 },
    ],
  };

  const handleSymbolClick = (symbol: any) => {
    setSelectedSymbol(symbol);
    setShowChart(true);
  };

  const renderWatchlistTable = (symbols: any[]) => (
    <div className="space-y-2">
      {symbols.map((symbol, index) => (
        <button
          key={index}
          onClick={() => handleSymbolClick(symbol)}
          className={`w-full p-3 rounded-lg text-left transition-all ${
            selectedSymbol?.symbol === symbol.symbol
              ? 'bg-yellow-500/20 border border-yellow-500/50'
              : 'bg-gray-800 hover:bg-gray-700'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-white">{symbol.symbol}</span>
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                <Star size={14} className="text-yellow-500" />
              </Button>
            </div>
            <Badge variant={symbol.change >= 0 ? 'default' : 'destructive'}>
              {symbol.change >= 0 ? '+' : ''}{symbol.changePercent.toFixed(2)}%
            </Badge>
          </div>
          
          <div className="grid grid-cols-4 gap-2 text-sm">
            <div>
              <p className="text-xs text-gray-400">LTP</p>
              <p className="font-semibold text-white">₹{symbol.ltp.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Change</p>
              <p className={`font-semibold ${symbol.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {symbol.change >= 0 ? '+' : ''}{symbol.change.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Volume</p>
              <p className="font-semibold text-white">{symbol.volume}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">H/L</p>
              <p className="text-xs text-white">{symbol.high.toFixed(2)}/{symbol.low.toFixed(2)}</p>
            </div>
          </div>
        </button>
      ))}
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Watch List Pro</h1>
          <p className="text-gray-400 mt-1">Real-time market data with advanced charting</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowChart(!showChart)}>
            {showChart ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
            {showChart ? 'Hide' : 'Show'} Chart
          </Button>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Symbol
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Watchlist Sidebar */}
        <div className={`${showChart ? 'col-span-3' : 'col-span-12'} space-y-4`}>
          {/* Search */}
          <Card className="p-4 bg-gray-900 border-gray-700">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <Input
                type="text"
                placeholder="Search symbols..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-gray-800 border-gray-700"
              />
            </div>
          </Card>

          {/* Watchlists */}
          <Card className="p-4 bg-gray-900 border-gray-700">
            <Tabs defaultValue="favorites">
              <TabsList className="grid w-full grid-cols-3 mb-4">
                <TabsTrigger value="favorites">Favorites</TabsTrigger>
                <TabsTrigger value="stocks">Stocks</TabsTrigger>
                <TabsTrigger value="futures">Futures</TabsTrigger>
              </TabsList>
              
              <TabsContent value="favorites" className="mt-0">
                {renderWatchlistTable(watchlists.favorites)}
              </TabsContent>
              
              <TabsContent value="stocks" className="mt-0">
                {renderWatchlistTable(watchlists.stocks)}
              </TabsContent>
              
              <TabsContent value="futures" className="mt-0">
                {renderWatchlistTable(watchlists.futures)}
              </TabsContent>
            </Tabs>
          </Card>

          {/* Market Overview */}
          <Card className="p-4 bg-gray-900 border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">Market Overview</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Advances</span>
                <span className="text-sm font-semibold text-green-500">1,245</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Declines</span>
                <span className="text-sm font-semibold text-red-500">892</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Unchanged</span>
                <span className="text-sm font-semibold text-gray-400">156</span>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-gray-700">
                <span className="text-sm text-gray-400">Total Volume</span>
                <span className="text-sm font-semibold text-white">₹45,678 Cr</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Chart Area */}
        {showChart && (
          <div className="col-span-9">
            {selectedSymbol ? (
              <div className="space-y-4">
                <TradingViewChart
                  symbol={selectedSymbol.symbol}
                  exchange="NSE"
                  interval="1D"
                  height={600}
                  showToolbar={true}
                />

                {/* Quick Actions */}
                <div className="grid grid-cols-4 gap-4">
                  <Button className="w-full bg-green-600 hover:bg-green-700">
                    <TrendingUp className="mr-2 h-4 w-4" />
                    Buy
                  </Button>
                  <Button className="w-full bg-red-600 hover:bg-red-700">
                    <TrendingDown className="mr-2 h-4 w-4" />
                    Sell
                  </Button>
                  <Button variant="outline" className="w-full">
                    <BarChart3 className="mr-2 h-4 w-4" />
                    Analysis
                  </Button>
                  <Button variant="outline" className="w-full">
                    <Activity className="mr-2 h-4 w-4" />
                    Alerts
                  </Button>
                </div>
              </div>
            ) : (
              <Card className="p-12 bg-gray-900 border-gray-700 text-center">
                <BarChart3 size={64} className="mx-auto text-gray-600 mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">Select a Symbol</h3>
                <p className="text-gray-400">Click on any symbol from the watchlist to view its chart</p>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
