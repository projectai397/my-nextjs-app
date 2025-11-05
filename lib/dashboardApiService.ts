/**
 * Dashboard API Service
 * Handles API calls for dashboard components and statistics
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
// PORTFOLIO API
// ============================================================================

export interface PortfolioAsset {
  symbol: string;
  name: string;
  amount: number;
  value: number;
  change24h: number;
  changePercent24h: number;
  allocation: number;
}

export interface PortfolioSummary {
  totalValue: number;
  totalChange24h: number;
  totalChangePercent24h: number;
  assets: PortfolioAsset[];
}

export async function fetchPortfolio(userId?: string): Promise<PortfolioSummary> {
  try {
    // Fetch from position list API
    const response = await apiRequest('position/list');
    
    if (response && response.data && response.data.length > 0) {
      const positions = response.data;
      
      // Calculate portfolio from positions
      let totalValue = 0;
      let totalChange = 0;
      
      const assets: PortfolioAsset[] = positions.map((position: any) => {
        const value = parseFloat(position.netQty || 0) * parseFloat(position.lastPrice || 0);
        const change = parseFloat(position.profitLoss || 0);
        const changePercent = value > 0 ? (change / value) * 100 : 0;
        
        totalValue += value;
        totalChange += change;
        
        return {
          symbol: position.symbolName || position.symbol || 'Unknown',
          name: position.name || position.symbolName || 'Unknown',
          amount: parseFloat(position.netQty || 0),
          value,
          change24h: change,
          changePercent24h: changePercent,
          allocation: 0 // Will calculate after
        };
      });
      
      // Calculate allocations
      assets.forEach(asset => {
        asset.allocation = totalValue > 0 ? (asset.value / totalValue) * 100 : 0;
      });
      
      const totalChangePercent = totalValue > 0 ? (totalChange / totalValue) * 100 : 0;
      
      return {
        totalValue,
        totalChange24h: totalChange,
        totalChangePercent24h: totalChangePercent,
        assets: assets.slice(0, 5) // Top 5 assets
      };
    }
  } catch (error) {
    console.error('Failed to fetch portfolio:', error);
  }

  // Return mock data as fallback
  return getMockPortfolio();
}

function getMockPortfolio(): PortfolioSummary {
  return {
    totalValue: 125430.50,
    totalChange24h: 3250.75,
    totalChangePercent24h: 2.66,
    assets: [
      {
        symbol: 'BTC/USD',
        name: 'Bitcoin',
        amount: 1.5,
        value: 64875.75,
        change24h: 1875.25,
        changePercent24h: 2.98,
        allocation: 51.7
      },
      {
        symbol: 'ETH/USD',
        name: 'Ethereum',
        amount: 15.2,
        value: 34738.40,
        change24h: 875.50,
        changePercent24h: 2.58,
        allocation: 27.7
      },
      {
        symbol: 'SOL/USD',
        name: 'Solana',
        amount: 150,
        value: 14767.50,
        change24h: 450.00,
        changePercent24h: 3.14,
        allocation: 11.8
      },
      {
        symbol: 'ADA/USD',
        name: 'Cardano',
        amount: 10000,
        value: 5234.00,
        change24h: 50.00,
        changePercent24h: 0.96,
        allocation: 4.2
      },
      {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        amount: 50,
        value: 5814.85,
        change24h: -0.00,
        changePercent24h: 0.00,
        allocation: 4.6
      }
    ]
  };
}

// ============================================================================
// QUICK STATS API
// ============================================================================

export interface QuickStats {
  totalUsers: number;
  activeUsers: number;
  totalTrades: number;
  totalVolume: number;
  totalRevenue: number;
  pendingWithdrawals: number;
}

export async function fetchQuickStats(): Promise<QuickStats> {
  try {
    // Fetch from multiple endpoints
    const [usersResponse, tradesResponse, transactionsResponse] = await Promise.all([
      apiRequest('user/list').catch(() => null),
      apiRequest('trade/list').catch(() => null),
      apiRequest('transactions').catch(() => null),
    ]);
    
    let totalUsers = 0;
    let activeUsers = 0;
    let totalTrades = 0;
    let totalVolume = 0;
    let totalRevenue = 0;
    let pendingWithdrawals = 0;
    
    // Process users data
    if (usersResponse && usersResponse.data) {
      totalUsers = usersResponse.totalCount || usersResponse.data.length || 0;
      activeUsers = usersResponse.data.filter((u: any) => u.status === 1 || u.isActive).length || 0;
    }
    
    // Process trades data
    if (tradesResponse && tradesResponse.data) {
      totalTrades = tradesResponse.totalCount || tradesResponse.data.length || 0;
      totalVolume = tradesResponse.data.reduce((sum: number, trade: any) => {
        return sum + (parseFloat(trade.price || 0) * parseFloat(trade.quantity || 0));
      }, 0);
    }
    
    // Process transactions data
    if (transactionsResponse && transactionsResponse.data) {
      totalRevenue = transactionsResponse.data
        .filter((t: any) => t.type === 'credit')
        .reduce((sum: number, t: any) => sum + parseFloat(t.amount || 0), 0);
        
      pendingWithdrawals = transactionsResponse.data
        .filter((t: any) => t.type === 'debit' && t.status === 'pending')
        .length || 0;
    }
    
    // Return real data if we got something
    if (totalUsers > 0 || totalTrades > 0) {
      return {
        totalUsers,
        activeUsers,
        totalTrades,
        totalVolume,
        totalRevenue,
        pendingWithdrawals
      };
    }
  } catch (error) {
    console.error('Failed to fetch quick stats:', error);
  }

  // Return mock data as fallback
  return getMockQuickStats();
}

function getMockQuickStats(): QuickStats {
  return {
    totalUsers: 12543,
    activeUsers: 8234,
    totalTrades: 45678,
    totalVolume: 2850000000,
    totalRevenue: 1250000,
    pendingWithdrawals: 23
  };
}

// ============================================================================
// DASHBOARD OVERVIEW API
// ============================================================================

export interface DashboardOverview {
  stats: QuickStats;
  portfolio: PortfolioSummary;
  recentActivity: ActivityItem[];
}

export interface ActivityItem {
  id: string;
  type: 'trade' | 'deposit' | 'withdrawal' | 'login';
  description: string;
  amount?: number;
  timestamp: Date;
  status: 'completed' | 'pending' | 'failed';
}

export async function fetchDashboardOverview(): Promise<DashboardOverview> {
  try {
    const [stats, portfolio, activityResponse] = await Promise.all([
      fetchQuickStats(),
      fetchPortfolio(),
      apiRequest('trade/list?limit=10').catch(() => null),
    ]);
    
    let recentActivity: ActivityItem[] = [];
    
    if (activityResponse && activityResponse.data) {
      recentActivity = activityResponse.data.map((trade: any) => ({
        id: trade._id || trade.id,
        type: 'trade' as const,
        description: `${trade.tradeType || 'Trade'} ${trade.quantity || 0} ${trade.symbolName || 'Unknown'}`,
        amount: parseFloat(trade.price || 0) * parseFloat(trade.quantity || 0),
        timestamp: new Date(trade.createdAt || Date.now()),
        status: trade.status === 'executed' ? 'completed' : trade.status || 'pending'
      }));
    }
    
    return {
      stats,
      portfolio,
      recentActivity: recentActivity.slice(0, 10)
    };
  } catch (error) {
    console.error('Failed to fetch dashboard overview:', error);
    return {
      stats: getMockQuickStats(),
      portfolio: getMockPortfolio(),
      recentActivity: []
    };
  }
}
