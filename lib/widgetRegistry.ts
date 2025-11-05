import { ComponentType } from 'react';

export interface WidgetConfig {
  id: string;
  type: string;
  title: string;
  description: string;
  category: 'market' | 'trading' | 'analytics' | 'ai' | 'portfolio' | 'news';
  icon: string;
  component: ComponentType<any>;
  defaultSize: { w: number; h: number };
  minSize: { w: number; h: number };
  maxSize?: { w: number; h: number };
  settings?: {
    [key: string]: any;
  };
}

export interface WidgetInstance {
  id: string;
  type: string;
  title: string;
  settings?: {
    [key: string]: any;
  };
}

export interface DashboardLayout {
  id: string;
  name: string;
  isDefault: boolean;
  widgets: WidgetInstance[];
  layouts: {
    [breakpoint: string]: Array<{
      i: string;
      x: number;
      y: number;
      w: number;
      h: number;
      minW?: number;
      minH?: number;
      maxW?: number;
      maxH?: number;
    }>;
  };
}

// Widget Registry - Central registry for all available widgets
class WidgetRegistry {
  private widgets: Map<string, WidgetConfig> = new Map();

  register(config: WidgetConfig) {
    this.widgets.set(config.type, config);
  }

  get(type: string): WidgetConfig | undefined {
    return this.widgets.get(type);
  }

  getAll(): WidgetConfig[] {
    return Array.from(this.widgets.values());
  }

  getByCategory(category: WidgetConfig['category']): WidgetConfig[] {
    return Array.from(this.widgets.values()).filter(
      (widget) => widget.category === category
    );
  }

  unregister(type: string) {
    this.widgets.delete(type);
  }
}

export const widgetRegistry = new WidgetRegistry();

// Helper functions
export function generateWidgetId(type: string): string {
  return `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function createWidgetInstance(
  type: string,
  customTitle?: string,
  settings?: any
): WidgetInstance | null {
  const config = widgetRegistry.get(type);
  if (!config) return null;

  return {
    id: generateWidgetId(type),
    type,
    title: customTitle || config.title,
    settings: settings || config.settings,
  };
}

// Default dashboard layouts
export const defaultLayouts: DashboardLayout[] = [
  {
    id: 'default',
    name: 'Default Layout',
    isDefault: true,
    widgets: [],
    layouts: {
      lg: [],
      md: [],
      sm: [],
      xs: [],
      xxs: [],
    },
  },
  {
    id: 'trader',
    name: 'Trader Layout',
    isDefault: false,
    widgets: [],
    layouts: {
      lg: [],
      md: [],
      sm: [],
      xs: [],
      xxs: [],
    },
  },
  {
    id: 'analyst',
    name: 'Analyst Layout',
    isDefault: false,
    widgets: [],
    layouts: {
      lg: [],
      md: [],
      sm: [],
      xs: [],
      xxs: [],
    },
  },
];

// Layout persistence service
export class LayoutService {
  private storageKey = 'dashboard-layouts';

  saveLayout(layout: DashboardLayout): void {
    const layouts = this.getLayouts();
    const index = layouts.findIndex((l) => l.id === layout.id);
    
    if (index >= 0) {
      layouts[index] = layout;
    } else {
      layouts.push(layout);
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem(this.storageKey, JSON.stringify(layouts));
    }
  }

  getLayouts(): DashboardLayout[] {
    if (typeof window === 'undefined') return defaultLayouts;
    
    const stored = localStorage.getItem(this.storageKey);
    if (!stored) return defaultLayouts;

    try {
      return JSON.parse(stored);
    } catch {
      return defaultLayouts;
    }
  }

  getLayout(id: string): DashboardLayout | undefined {
    return this.getLayouts().find((l) => l.id === id);
  }

  getDefaultLayout(): DashboardLayout {
    const layouts = this.getLayouts();
    return layouts.find((l) => l.isDefault) || layouts[0] || defaultLayouts[0];
  }

  deleteLayout(id: string): void {
    const layouts = this.getLayouts().filter((l) => l.id !== id);
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.storageKey, JSON.stringify(layouts));
    }
  }

  setDefaultLayout(id: string): void {
    const layouts = this.getLayouts().map((l) => ({
      ...l,
      isDefault: l.id === id,
    }));
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.storageKey, JSON.stringify(layouts));
    }
  }
}

export const layoutService = new LayoutService();
