"use client";

import React, { useState } from 'react';
import TradingViewChart from '@/components/charts/TradingViewChart';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  Activity, 
  BarChart3, 
  LineChart, 
  PieChart,
  Layers,
  Pencil,
  Ruler,
  Circle,
  Square,
  Triangle
} from 'lucide-react';

export default function ChartsPage() {
  const [selectedSymbol, setSelectedSymbol] = useState('NIFTY 50');
  const [selectedIndicators, setSelectedIndicators] = useState<string[]>(['SMA', 'Volume']);

  const popularSymbols = [
    { name: 'NIFTY 50', price: 19850.25, change: 1.25, changePercent: 0.63 },
    { name: 'SENSEX', price: 66589.93, change: -125.33, changePercent: -0.19 },
    { name: 'BANKNIFTY', price: 44250.80, change: 245.60, changePercent: 0.56 },
    { name: 'RELIANCE', price: 2456.75, change: 12.30, changePercent: 0.50 },
    { name: 'TCS', price: 3678.90, change: -23.45, changePercent: -0.63 },
    { name: 'INFY', price: 1523.40, change: 8.75, changePercent: 0.58 },
  ];

  const technicalIndicators = [
    { id: 'SMA', name: 'Simple Moving Average', category: 'Trend' },
    { id: 'EMA', name: 'Exponential Moving Average', category: 'Trend' },
    { id: 'RSI', name: 'Relative Strength Index', category: 'Momentum' },
    { id: 'MACD', name: 'MACD', category: 'Momentum' },
    { id: 'BB', name: 'Bollinger Bands', category: 'Volatility' },
    { id: 'Volume', name: 'Volume', category: 'Volume' },
    { id: 'ATR', name: 'Average True Range', category: 'Volatility' },
    { id: 'Stochastic', name: 'Stochastic', category: 'Momentum' },
  ];

  const drawingTools = [
    { id: 'trendline', name: 'Trend Line', icon: Pencil },
    { id: 'horizontal', name: 'Horizontal Line', icon: Ruler },
    { id: 'vertical', name: 'Vertical Line', icon: Ruler },
    { id: 'rectangle', name: 'Rectangle', icon: Square },
    { id: 'circle', name: 'Circle', icon: Circle },
    { id: 'triangle', name: 'Triangle', icon: Triangle },
  ];

  const toggleIndicator = (indicatorId: string) => {
    setSelectedIndicators(prev =>
      prev.includes(indicatorId)
        ? prev.filter(id => id !== indicatorId)
        : [...prev, indicatorId]
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Advanced Charts</h1>
          <p className="text-gray-400 mt-1">Professional-grade charting with TradingView</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Layers className="mr-2 h-4 w-4" />
            Save Layout
          </Button>
          <Button>
            <BarChart3 className="mr-2 h-4 w-4" />
            New Chart
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Sidebar - Symbol List & Tools */}
        <div className="col-span-3 space-y-4">
          {/* Popular Symbols */}
          <Card className="p-4 bg-gray-900 border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">Popular Symbols</h3>
            <div className="space-y-2">
              {popularSymbols.map((symbol) => (
                <button
                  key={symbol.name}
                  onClick={() => setSelectedSymbol(symbol.name)}
                  className={`w-full p-3 rounded-lg text-left transition-all ${
                    selectedSymbol === symbol.name
                      ? 'bg-yellow-500/20 border border-yellow-500/50'
                      : 'bg-gray-800 hover:bg-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">{symbol.name}</span>
                    <Badge variant={symbol.change >= 0 ? 'default' : 'destructive'}>
                      {symbol.change >= 0 ? '+' : ''}{symbol.changePercent.toFixed(2)}%
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-sm text-gray-400">₹{symbol.price.toFixed(2)}</span>
                    <span className={`text-sm ${symbol.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {symbol.change >= 0 ? '+' : ''}{symbol.change.toFixed(2)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </Card>

          {/* Technical Indicators */}
          <Card className="p-4 bg-gray-900 border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">Technical Indicators</h3>
            <Tabs defaultValue="all">
              <TabsList className="grid w-full grid-cols-3 mb-4">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="trend">Trend</TabsTrigger>
                <TabsTrigger value="momentum">Momentum</TabsTrigger>
              </TabsList>
              <TabsContent value="all" className="space-y-2">
                {technicalIndicators.map((indicator) => (
                  <button
                    key={indicator.id}
                    onClick={() => toggleIndicator(indicator.id)}
                    className={`w-full p-2 rounded-lg text-left text-sm transition-all ${
                      selectedIndicators.includes(indicator.id)
                        ? 'bg-blue-500/20 border border-blue-500/50 text-blue-400'
                        : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{indicator.name}</span>
                      {selectedIndicators.includes(indicator.id) && (
                        <Badge variant="outline" className="text-xs">Active</Badge>
                      )}
                    </div>
                    <span className="text-xs text-gray-500">{indicator.category}</span>
                  </button>
                ))}
              </TabsContent>
            </Tabs>
          </Card>

          {/* Drawing Tools */}
          <Card className="p-4 bg-gray-900 border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">Drawing Tools</h3>
            <div className="grid grid-cols-2 gap-2">
              {drawingTools.map((tool) => (
                <Button
                  key={tool.id}
                  variant="outline"
                  size="sm"
                  className="flex flex-col items-center gap-1 h-auto py-3"
                >
                  <tool.icon size={20} />
                  <span className="text-xs">{tool.name}</span>
                </Button>
              ))}
            </div>
          </Card>
        </div>

        {/* Main Chart Area */}
        <div className="col-span-9">
          <TradingViewChart
            symbol={selectedSymbol}
            exchange="NSE"
            interval="1D"
            height={600}
            showToolbar={true}
          />

          {/* Active Indicators Info */}
          {selectedIndicators.length > 0 && (
            <Card className="mt-4 p-4 bg-gray-900 border-gray-700">
              <h4 className="text-sm font-semibold text-white mb-3">Active Indicators</h4>
              <div className="flex flex-wrap gap-2">
                {selectedIndicators.map((indicatorId) => {
                  const indicator = technicalIndicators.find(i => i.id === indicatorId);
                  return (
                    <Badge key={indicatorId} variant="secondary" className="flex items-center gap-2">
                      {indicator?.name}
                      <button
                        onClick={() => toggleIndicator(indicatorId)}
                        className="ml-1 hover:text-red-500"
                      >
                        ×
                      </button>
                    </Badge>
                  );
                })}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
