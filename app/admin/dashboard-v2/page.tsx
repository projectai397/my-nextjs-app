"use client";

import React, { useState, useEffect, useCallback } from 'react';
import FlexibleGrid, { Widget, GridLayout } from '@/components/layout/FlexibleGrid';
import WidgetSelector from '@/components/widgets/WidgetSelector';
import {
  widgetRegistry,
  createWidgetInstance,
  layoutService,
  DashboardLayout,
  WidgetInstance,
} from '@/lib/widgetRegistry';
import { registerAllWidgets } from '@/lib/registerWidgets';
import { Button } from '@/components/ui/button';
import { LayoutGrid, Save, RotateCcw, Download } from 'lucide-react';
import { toast } from 'sonner';

export default function DashboardV2Page() {
  const [isWidgetSelectorOpen, setIsWidgetSelectorOpen] = useState(false);
  const [currentLayout, setCurrentLayout] = useState<DashboardLayout | null>(null);
  const [widgets, setWidgets] = useState<Widget[]>([]);

  // Initialize widgets registry
  useEffect(() => {
    registerAllWidgets();
    
    // Load saved layout or use default
    const savedLayout = layoutService.getDefaultLayout();
    setCurrentLayout(savedLayout);

    // If no widgets in saved layout, add default widgets
    if (!savedLayout.widgets || savedLayout.widgets.length === 0) {
      const defaultWidgets = [
        createWidgetInstance('quick-stats'),
        createWidgetInstance('market-data'),
        createWidgetInstance('portfolio'),
        createWidgetInstance('ai-insights'),
      ].filter((w): w is WidgetInstance => w !== null);

      const updatedLayout: DashboardLayout = {
        ...savedLayout,
        widgets: defaultWidgets,
      };
      setCurrentLayout(updatedLayout);
      layoutService.saveLayout(updatedLayout);
    }
  }, []);

  // Convert widget instances to Widget components
  useEffect(() => {
    if (!currentLayout) return;

    const widgetComponents: Widget[] = currentLayout.widgets
      .map((widgetInstance) => {
        const config = widgetRegistry.get(widgetInstance.type);
        if (!config) return null;

        return {
          id: widgetInstance.id,
          type: widgetInstance.type,
          title: widgetInstance.title,
          component: config.component,
          defaultSize: config.defaultSize,
          minSize: config.minSize,
          maxSize: config.maxSize,
        };
      })
      .filter((w): w is Widget => w !== null);

    setWidgets(widgetComponents);
  }, [currentLayout]);

  const handleLayoutChange = useCallback(
    (layouts: { [key: string]: GridLayout[] }) => {
      if (!currentLayout) return;

      const updatedLayout: DashboardLayout = {
        ...currentLayout,
        layouts,
      };

      setCurrentLayout(updatedLayout);
    },
    [currentLayout]
  );

  const handleSaveLayout = () => {
    if (!currentLayout) return;

    layoutService.saveLayout(currentLayout);
    toast.success('Layout saved successfully!');
  };

  const handleResetLayout = () => {
    const defaultWidgets = [
      createWidgetInstance('quick-stats'),
      createWidgetInstance('market-data'),
      createWidgetInstance('portfolio'),
      createWidgetInstance('ai-insights'),
    ].filter((w): w is WidgetInstance => w !== null);

    const resetLayout: DashboardLayout = {
      id: 'default',
      name: 'Default Layout',
      isDefault: true,
      widgets: defaultWidgets,
      layouts: {
        lg: [],
        md: [],
        sm: [],
        xs: [],
        xxs: [],
      },
    };

    setCurrentLayout(resetLayout);
    layoutService.saveLayout(resetLayout);
    toast.success('Layout reset to default!');
  };

  const handleAddWidget = (widgetType: string) => {
    if (!currentLayout) return;

    const newWidget = createWidgetInstance(widgetType);
    if (!newWidget) {
      toast.error('Failed to add widget');
      return;
    }

    const updatedLayout: DashboardLayout = {
      ...currentLayout,
      widgets: [...currentLayout.widgets, newWidget],
    };

    setCurrentLayout(updatedLayout);
    layoutService.saveLayout(updatedLayout);
    toast.success('Widget added successfully!');
  };

  const handleRemoveWidget = (widgetId: string) => {
    if (!currentLayout) return;

    const updatedLayout: DashboardLayout = {
      ...currentLayout,
      widgets: currentLayout.widgets.filter((w) => w.id !== widgetId),
    };

    setCurrentLayout(updatedLayout);
    layoutService.saveLayout(updatedLayout);
    toast.success('Widget removed!');
  };

  const handleExportLayout = () => {
    if (!currentLayout) return;

    const dataStr = JSON.stringify(currentLayout, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `dashboard-layout-${currentLayout.id}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Layout exported!');
  };

  if (!currentLayout) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <LayoutGrid className="h-12 w-12 mx-auto mb-4 text-muted-foreground animate-pulse" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col p-6 bg-background">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard V2</h1>
          <p className="text-muted-foreground">
            Flexible, customizable trading dashboard
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleResetLayout}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportLayout}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button size="sm" onClick={handleSaveLayout}>
            <Save className="h-4 w-4 mr-2" />
            Save Layout
          </Button>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto">
        <FlexibleGrid
          widgets={widgets}
          initialLayouts={currentLayout.layouts}
          onLayoutChange={handleLayoutChange}
          onWidgetAdd={() => setIsWidgetSelectorOpen(true)}
          onWidgetRemove={handleRemoveWidget}
        />
      </div>

      {/* Widget Selector */}
      <WidgetSelector
        open={isWidgetSelectorOpen}
        onClose={() => setIsWidgetSelectorOpen(false)}
        onSelect={handleAddWidget}
      />
    </div>
  );
}
