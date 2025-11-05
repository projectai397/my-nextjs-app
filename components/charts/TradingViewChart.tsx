"use client";

import React, { useEffect, useRef, useState } from 'react';
import { createChart, IChartApi, ISeriesApi, CandlestickData, LineData } from 'lightweight-charts';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, TrendingDown, Activity, BarChart3, Maximize2, Settings } from 'lucide-react';

interface TradingViewChartProps {
  symbol: string;
  exchange?: string;
  interval?: string;
  height?: number;
  showToolbar?: boolean;
}

export default function TradingViewChart({
  symbol,
  exchange = 'NSE',
  interval = '1D',
  height = 500,
  showToolbar = true
}: TradingViewChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  
  const [chartType, setChartType] = useState<'candlestick' | 'line' | 'area'>('candlestick');
  const [timeframe, setTimeframe] = useState(interval);
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [priceChange, setPriceChange] = useState<number>(0);
  const [priceChangePercent, setPriceChangePercent] = useState<number>(0);

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Create chart
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: height,
      layout: {
        background: { color: '#1a1a2e' },
        textColor: '#d1d4dc',
      },
      grid: {
        vertLines: { color: '#2B2B43' },
        horzLines: { color: '#2B2B43' },
      },
      crosshair: {
        mode: 1,
      },
      rightPriceScale: {
        borderColor: '#2B2B43',
      },
      timeScale: {
        borderColor: '#2B2B43',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    chartRef.current = chart;

    // Add candlestick series
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });

    candlestickSeriesRef.current = candlestickSeries;

    // Generate sample data (replace with real API data)
    const generateSampleData = (): CandlestickData[] => {
      const data: CandlestickData[] = [];
      const basePrice = 1000 + Math.random() * 1000;
      let currentTime = Math.floor(Date.now() / 1000) - (100 * 86400); // 100 days ago

      for (let i = 0; i < 100; i++) {
        const open = basePrice + (Math.random() - 0.5) * 50;
        const close = open + (Math.random() - 0.5) * 30;
        const high = Math.max(open, close) + Math.random() * 20;
        const low = Math.min(open, close) - Math.random() * 20;

        data.push({
          time: currentTime as any,
          open,
          high,
          low,
          close,
        });

        currentTime += 86400; // Add 1 day
      }

      return data;
    };

    const sampleData = generateSampleData();
    candlestickSeries.setData(sampleData);

    // Set current price and changes
    if (sampleData.length > 0) {
      const lastCandle = sampleData[sampleData.length - 1];
      const firstCandle = sampleData[0];
      setCurrentPrice(lastCandle.close);
      const change = lastCandle.close - firstCandle.close;
      setPriceChange(change);
      setPriceChangePercent((change / firstCandle.close) * 100);
    }

    // Fit content
    chart.timeScale().fitContent();

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [height, symbol, exchange, timeframe]);

  // Handle chart type change
  const handleChartTypeChange = (type: 'candlestick' | 'line' | 'area') => {
    setChartType(type);
    // In a real implementation, you would switch between different series types
  };

  return (
    <Card className="p-4 bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
      {/* Toolbar */}
      {showToolbar && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div>
              <h3 className="text-xl font-bold text-white">{symbol}</h3>
              <p className="text-sm text-gray-400">{exchange}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-white">
                ₹{currentPrice.toFixed(2)}
              </span>
              <div className={`flex items-center gap-1 ${priceChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {priceChange >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                <span className="font-semibold">
                  {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)} ({priceChangePercent.toFixed(2)}%)
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Timeframe Selector */}
            <Select value={timeframe} onValueChange={setTimeframe}>
              <SelectTrigger className="w-24 bg-gray-800 border-gray-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1m">1m</SelectItem>
                <SelectItem value="5m">5m</SelectItem>
                <SelectItem value="15m">15m</SelectItem>
                <SelectItem value="1H">1H</SelectItem>
                <SelectItem value="1D">1D</SelectItem>
                <SelectItem value="1W">1W</SelectItem>
                <SelectItem value="1M">1M</SelectItem>
              </SelectContent>
            </Select>

            {/* Chart Type Buttons */}
            <div className="flex gap-1 bg-gray-800 rounded-lg p-1">
              <Button
                size="sm"
                variant={chartType === 'candlestick' ? 'default' : 'ghost'}
                onClick={() => handleChartTypeChange('candlestick')}
                className="h-8"
              >
                <BarChart3 size={16} />
              </Button>
              <Button
                size="sm"
                variant={chartType === 'line' ? 'default' : 'ghost'}
                onClick={() => handleChartTypeChange('line')}
                className="h-8"
              >
                <Activity size={16} />
              </Button>
            </div>

            {/* Settings Button */}
            <Button size="sm" variant="ghost" className="h-8">
              <Settings size={16} />
            </Button>

            {/* Fullscreen Button */}
            <Button size="sm" variant="ghost" className="h-8">
              <Maximize2 size={16} />
            </Button>
          </div>
        </div>
      )}

      {/* Chart Container */}
      <div ref={chartContainerRef} className="rounded-lg overflow-hidden" />

      {/* Chart Footer with Quick Stats */}
      <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-700">
        <div>
          <p className="text-xs text-gray-400">Open</p>
          <p className="text-sm font-semibold text-white">₹{(currentPrice * 0.98).toFixed(2)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">High</p>
          <p className="text-sm font-semibold text-green-500">₹{(currentPrice * 1.02).toFixed(2)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Low</p>
          <p className="text-sm font-semibold text-red-500">₹{(currentPrice * 0.96).toFixed(2)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Volume</p>
          <p className="text-sm font-semibold text-white">{(Math.random() * 1000000).toFixed(0)}</p>
        </div>
      </div>
    </Card>
  );
}
