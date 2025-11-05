"use client";

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, TrendingUp, BarChart3, Brain, Wallet, Newspaper } from 'lucide-react';
import { widgetRegistry, WidgetConfig } from '@/lib/widgetRegistry';

interface WidgetSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelect: (widgetType: string) => void;
}

const categoryIcons = {
  market: TrendingUp,
  trading: BarChart3,
  analytics: BarChart3,
  ai: Brain,
  portfolio: Wallet,
  news: Newspaper,
};

export const WidgetSelector: React.FC<WidgetSelectorProps> = ({
  open,
  onClose,
  onSelect,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const allWidgets = widgetRegistry.getAll();
  
  const filteredWidgets = allWidgets.filter((widget) => {
    const matchesSearch =
      widget.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      widget.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory =
      selectedCategory === 'all' || widget.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const categories = [
    { value: 'all', label: 'All Widgets', icon: null },
    { value: 'market', label: 'Market Data', icon: TrendingUp },
    { value: 'trading', label: 'Trading', icon: BarChart3 },
    { value: 'analytics', label: 'Analytics', icon: BarChart3 },
    { value: 'ai', label: 'AI Insights', icon: Brain },
    { value: 'portfolio', label: 'Portfolio', icon: Wallet },
    { value: 'news', label: 'News', icon: Newspaper },
  ];

  const handleSelectWidget = (widgetType: string) => {
    onSelect(widgetType);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Add Widget</DialogTitle>
          <DialogDescription>
            Choose a widget to add to your dashboard
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search widgets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Categories */}
          <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
            <TabsList className="grid grid-cols-7 w-full">
              {categories.map((category) => {
                const Icon = category.icon;
                return (
                  <TabsTrigger key={category.value} value={category.value} className="text-xs">
                    {Icon && <Icon className="h-3 w-3 mr-1" />}
                    {category.label}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            <TabsContent value={selectedCategory} className="mt-4">
              <ScrollArea className="h-[400px] pr-4">
                <div className="grid grid-cols-2 gap-4">
                  {filteredWidgets.map((widget) => {
                    const CategoryIcon = categoryIcons[widget.category];
                    return (
                      <div
                        key={widget.type}
                        className="border rounded-lg p-4 hover:border-primary cursor-pointer transition-colors"
                        onClick={() => handleSelectWidget(widget.type)}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <CategoryIcon className="h-5 w-5 text-primary" />
                            <h3 className="font-semibold text-sm">{widget.title}</h3>
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {widget.category}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                          {widget.description}
                        </p>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>
                            Size: {widget.defaultSize.w}x{widget.defaultSize.h}
                          </span>
                          <Button size="sm" variant="ghost">
                            Add
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {filteredWidgets.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">No widgets found</p>
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WidgetSelector;
