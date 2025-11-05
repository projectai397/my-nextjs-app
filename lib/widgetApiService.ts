/**
 * Widget API Service
 * Handles API calls for all trading widgets
 */

import { ADMIN_API_ENDPOINT } from '@/constant';

// Base API configuration
const API_BASE = ADMIN_API_ENDPOINT || '';

// Helper function to make API requests
async function apiRequest(endpoint: string, options: RequestInit = {}) {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API Request Failed:', error);
    throw error;
  }
}

// ============================================================================
// NEWS FEED API
// ============================================================================

export interface NewsItem {
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

export async function fetchMarketNews(category?: string): Promise<NewsItem[]> {
  try {
    // Try to fetch from announcement API
    const response = await apiRequest('announcement/list');
    
    if (response && response.data) {
      // Transform announcement data to news format
      return response.data.map((item: any) => ({
        id: item._id || item.id,
        title: item.title || 'Market Update',
        summary: item.description || item.message || '',
        source: 'Platform News',
        category: 'market' as const,
        sentiment: 'neutral' as const,
        timestamp: new Date(item.createdAt || Date.now()),
        url: '#',
        impact: 'medium' as const,
      }));
    }
  } catch (error) {
    console.error('Failed to fetch news:', error);
  }

  // Return mock data as fallback
  return getMockNews();
}

function getMockNews(): NewsItem[] {
  return [
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
  ];
}

// ============================================================================
// ORDER BOOK API
// ============================================================================

export interface OrderBookEntry {
  price: number;
  amount: number;
  total: number;
}

export interface OrderBookData {
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
  spread: number;
  symbol: string;
}

export async function fetchOrderBook(symbol: string = 'BTC/USD'): Promise<OrderBookData> {
  try {
    // Try to fetch from position or trade API
    const response = await apiRequest('position/list');
    
    if (response && response.data) {
      // Transform position data to order book format
      const basePrice = 45000; // Default base price
      const bids: OrderBookEntry[] = [];
      const asks: OrderBookEntry[] = [];

      // Generate order book from position data
      for (let i = 0; i < 10; i++) {
        const bidPrice = basePrice - (i * 10) - Math.random() * 5;
        const askPrice = basePrice + (i * 10) + Math.random() * 5;
        const amount = Math.random() * 2;

        bids.push({
          price: bidPrice,
          amount,
          total: bidPrice * amount
        });

        asks.push({
          price: askPrice,
          amount,
          total: askPrice * amount
        });
      }

      return {
        bids,
        asks,
        spread: asks[0].price - bids[0].price,
        symbol
      };
    }
  } catch (error) {
    console.error('Failed to fetch order book:', error);
  }

  // Return mock data as fallback
  return getMockOrderBook(symbol);
}

function getMockOrderBook(symbol: string): OrderBookData {
  const basePrice = 45000;
  const bids: OrderBookEntry[] = [];
  const asks: OrderBookEntry[] = [];

  for (let i = 0; i < 10; i++) {
    const bidPrice = basePrice - (i * 10) - Math.random() * 5;
    const askPrice = basePrice + (i * 10) + Math.random() * 5;
    const amount = Math.random() * 2;

    bids.push({
      price: bidPrice,
      amount,
      total: bidPrice * amount
    });

    asks.push({
      price: askPrice,
      amount,
      total: askPrice * amount
    });
  }

  return {
    bids,
    asks,
    spread: asks[0].price - bids[0].price,
    symbol
  };
}

// ============================================================================
// TRADE HISTORY API
// ============================================================================

export interface Trade {
  id: string;
  symbol: string;
  type: 'buy' | 'sell';
  price: number;
  amount: number;
  total: number;
  timestamp: Date;
  status: 'completed' | 'pending' | 'cancelled';
}

export async function fetchTradeHistory(userId?: string): Promise<Trade[]> {
  try {
    // Fetch from trade list API
    const response = await apiRequest('trade/list');
    
    if (response && response.data) {
      // Transform trade data
      return response.data.map((trade: any) => ({
        id: trade._id || trade.id,
        symbol: trade.symbolName || trade.symbol || 'BTC/USD',
        type: trade.tradeType === 'buy' || trade.type === 'buy' ? 'buy' : 'sell',
        price: parseFloat(trade.price || trade.tradePrice || 0),
        amount: parseFloat(trade.quantity || trade.lot || 0),
        total: parseFloat(trade.price || 0) * parseFloat(trade.quantity || 0),
        timestamp: new Date(trade.createdAt || trade.tradeDate || Date.now()),
        status: trade.status === 'executed' ? 'completed' : trade.status || 'pending'
      }));
    }
  } catch (error) {
    console.error('Failed to fetch trade history:', error);
  }

  // Return mock data as fallback
  return getMockTrades();
}

function getMockTrades(): Trade[] {
  const symbols = ['BTC/USD', 'ETH/USD', 'SOL/USD', 'ADA/USD'];
  const trades: Trade[] = [];

  for (let i = 0; i < 20; i++) {
    const type = Math.random() > 0.5 ? 'buy' : 'sell';
    const symbol = symbols[Math.floor(Math.random() * symbols.length)];
    const price = Math.random() * 50000 + 1000;
    const amount = Math.random() * 2;
    
    trades.push({
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

  return trades.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

// ============================================================================
// WATCHLIST API
// ============================================================================

export interface WatchlistItem {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  changePercent24h: number;
  volume24h: number;
  marketCap: number;
}

export async function fetchWatchlist(userId?: string): Promise<WatchlistItem[]> {
  try {
    // Fetch from user watchlist API
    const response = await apiRequest('user/get-user-tab-list-with-symbol');
    
    if (response && response.data) {
      // Transform watchlist data
      return response.data.map((item: any) => ({
        symbol: item.symbolName || item.symbol || 'BTC/USD',
        name: item.name || item.symbolName || 'Bitcoin',
        price: parseFloat(item.lastPrice || item.price || 0),
        change24h: parseFloat(item.change || 0),
        changePercent24h: parseFloat(item.changePercent || 0),
        volume24h: parseFloat(item.volume || 0),
        marketCap: parseFloat(item.marketCap || 0)
      }));
    }
  } catch (error) {
    console.error('Failed to fetch watchlist:', error);
  }

  // Return mock data as fallback
  return getMockWatchlist();
}

function getMockWatchlist(): WatchlistItem[] {
  return [
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
  ];
}

// ============================================================================
// MARKET DATA API (for existing Market Data Widget)
// ============================================================================

export interface MarketDataItem {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  high24h: number;
  low24h: number;
  volume24h: number;
}

export async function fetchMarketData(): Promise<MarketDataItem[]> {
  try {
    // Fetch from symbol list API
    const response = await apiRequest('symbol/list');
    
    if (response && response.data) {
      return response.data.map((item: any) => ({
        symbol: item.symbolName || item.symbol,
        name: item.name || item.symbolName,
        price: parseFloat(item.lastPrice || item.price || 0),
        change: parseFloat(item.change || 0),
        changePercent: parseFloat(item.changePercent || 0),
        high24h: parseFloat(item.high || 0),
        low24h: parseFloat(item.low || 0),
        volume24h: parseFloat(item.volume || 0)
      }));
    }
  } catch (error) {
    console.error('Failed to fetch market data:', error);
  }

  return [];
}
