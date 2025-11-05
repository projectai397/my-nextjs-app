"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Newspaper, TrendingUp, TrendingDown, Clock, ExternalLink, RefreshCw } from 'lucide-react';

interface NewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  category: 'market' | 'crypto' | 'forex' | 'stocks' | 'economy';
  sentiment: 'positive' | 'negative' | 'neutral';
  timestamp: Date;
  url: string;
  impact: 'high' | 'medium' | 'low';
}

export default function NewsFeedWidget() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<string>('all');

  // Mock news data
  const mockNews: NewsItem[] = [
    {
      id: '1',
      title: 'Bitcoin Surges Past $45,000 on ETF Approval Hopes',
      summary: 'Bitcoin rallied 8% today as investors anticipate SEC approval of spot Bitcoin ETFs...',
      source: 'CoinDesk',
      category: 'crypto',
      sentiment: 'positive',
      timestamp: new Date(Date.now() - 1000 * 60 * 15),
      url: '#',
      impact: 'high'
    },
    {
      id: '2',
      title: 'Federal Reserve Holds Interest Rates Steady',
      summary: 'The Fed maintained its benchmark rate at 5.25%-5.50%, signaling a pause in rate hikes...',
      source: 'Bloomberg',
      category: 'economy',
      sentiment: 'neutral',
      timestamp: new Date(Date.now() - 1000 * 60 * 45),
      url: '#',
      impact: 'high'
    },
    {
      id: '3',
      title: 'Tech Stocks Rally on Strong Earnings Reports',
      summary: 'Major tech companies exceeded Q3 expectations, driving NASDAQ up 2.5%...',
      source: 'Reuters',
      category: 'stocks',
      sentiment: 'positive',
      timestamp: new Date(Date.now() - 1000 * 60 * 90),
      url: '#',
      impact: 'medium'
    },
    {
      id: '4',
      title: 'EUR/USD Drops on ECB Dovish Comments',
      summary: 'Euro weakened against the dollar after ECB President signaled potential rate cuts...',
      source: 'ForexLive',
      category: 'forex',
      sentiment: 'negative',
      timestamp: new Date(Date.now() - 1000 * 60 * 120),
      url: '#',
      impact: 'medium'
    },
    {
      id: '5',
      title: 'Gold Prices Reach 6-Month High Amid Uncertainty',
      summary: 'Safe-haven demand pushes gold above $2,050 per ounce...',
      source: 'Kitco',
      category: 'market',
      sentiment: 'positive',
      timestamp: new Date(Date.now() - 1000 * 60 * 180),
      url: '#',
      impact: 'low'
    },
    {
      id: '6',
      title: 'Oil Prices Decline on Supply Concerns',
      summary: 'Crude oil fell 3% as OPEC+ production cuts fail to support prices...',
      source: 'MarketWatch',
      category: 'market',
      sentiment: 'negative',
      timestamp: new Date(Date.now() - 1000 * 60 * 240),
      url: '#',
      impact: 'medium'
    }
  ];

  useEffect(() => {
    loadNews();
  }, []);

  const loadNews = () => {
    setLoading(true);
    setTimeout(() => {
      setNews(mockNews);
      setLoading(false);
    }, 500);
  };

  const getTimeAgo = (date: Date) => {
    const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'negative':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return <div className="w-4 h-4 bg-gray-400 rounded-full" />;
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'negative':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      default:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
    }
  };

  const filteredNews = filter === 'all' 
    ? news 
    : news.filter(item => item.category === filter);

  const categories = [
    { value: 'all', label: 'All News' },
    { value: 'crypto', label: 'Crypto' },
    { value: 'stocks', label: 'Stocks' },
    { value: 'forex', label: 'Forex' },
    { value: 'market', label: 'Market' },
    { value: 'economy', label: 'Economy' }
  ];

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Newspaper className="w-5 h-5" />
            <CardTitle>Market News</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={loadNews}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        
        {/* Category Filter */}
        <div className="flex gap-2 mt-4 flex-wrap">
          {categories.map(cat => (
            <Button
              key={cat.value}
              variant={filter === cat.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(cat.value)}
            >
              {cat.label}
            </Button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="space-y-4">
            {filteredNews.map((item) => (
              <div
                key={item.id}
                className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    {getSentimentIcon(item.sentiment)}
                    <Badge variant="outline" className={getImpactColor(item.impact)}>
                      {item.impact.toUpperCase()}
                    </Badge>
                    <Badge variant="outline">
                      {item.category}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Clock className="w-3 h-3" />
                    {getTimeAgo(item.timestamp)}
                  </div>
                </div>

                {/* Title */}
                <h3 className="font-semibold text-sm mb-2 line-clamp-2">
                  {item.title}
                </h3>

                {/* Summary */}
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                  {item.summary}
                </p>

                {/* Footer */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">{item.source}</span>
                  <Button variant="ghost" size="sm" className="h-6 text-xs">
                    <ExternalLink className="w-3 h-3 mr-1" />
                    Read More
                  </Button>
                </div>
              </div>
            ))}

            {filteredNews.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                No news available for this category
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
