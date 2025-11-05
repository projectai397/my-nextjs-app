import { widgetRegistry } from './widgetRegistry';
import MarketDataWidget from '@/components/widgets/MarketDataWidget';
import PortfolioWidget from '@/components/widgets/PortfolioWidget';
import AIInsightsWidget from '@/components/widgets/AIInsightsWidget';
import QuickStatsWidget from '@/components/widgets/QuickStatsWidget';

// Register all available widgets
export function registerAllWidgets() {
  // Market Data Widget
  widgetRegistry.register({
    id: 'market-data',
    type: 'market-data',
    title: 'Market Data',
    description: 'Real-time market prices and trends for your watchlist',
    category: 'market',
    icon: 'trending-up',
    component: MarketDataWidget,
    defaultSize: { w: 4, h: 6 },
    minSize: { w: 3, h: 4 },
    maxSize: { w: 6, h: 12 },
  });

  // Portfolio Widget
  widgetRegistry.register({
    id: 'portfolio',
    type: 'portfolio',
    title: 'Portfolio Summary',
    description: 'Overview of your portfolio performance and asset allocation',
    category: 'portfolio',
    icon: 'wallet',
    component: PortfolioWidget,
    defaultSize: { w: 4, h: 6 },
    minSize: { w: 3, h: 5 },
    maxSize: { w: 6, h: 12 },
  });

  // AI Insights Widget
  widgetRegistry.register({
    id: 'ai-insights',
    type: 'ai-insights',
    title: 'AI Insights',
    description: 'AI-powered trading insights, predictions, and recommendations',
    category: 'ai',
    icon: 'brain',
    component: AIInsightsWidget,
    defaultSize: { w: 4, h: 6 },
    minSize: { w: 3, h: 5 },
    maxSize: { w: 6, h: 12 },
  });

  // Quick Stats Widget
  widgetRegistry.register({
    id: 'quick-stats',
    type: 'quick-stats',
    title: 'Quick Stats',
    description: 'Key performance metrics at a glance',
    category: 'analytics',
    icon: 'bar-chart',
    component: QuickStatsWidget,
    defaultSize: { w: 4, h: 3 },
    minSize: { w: 3, h: 2 },
    maxSize: { w: 6, h: 4 },
  });

  // Add more widgets here as they are created
  // Example:
  // widgetRegistry.register({
  //   id: 'news-feed',
  //   type: 'news-feed',
  //   title: 'News Feed',
  //   description: 'Latest market news and updates',
  //   category: 'news',
  //   icon: 'newspaper',
  //   component: NewsFeedWidget,
  //   defaultSize: { w: 4, h: 6 },
  //   minSize: { w: 3, h: 4 },
  // });
}

// Initialize widgets on module load
if (typeof window !== 'undefined') {
  registerAllWidgets();
}
