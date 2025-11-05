"use client";

import React, { useState, useCallback } from 'react';
import { Responsive, WidthProvider, Layout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { Button } from '@/components/ui/button';
import { Settings, Lock, Unlock, Plus, LayoutGrid } from 'lucide-react';

const ResponsiveGridLayout = WidthProvider(Responsive);

export interface Widget {
  id: string;
  type: string;
  title: string;
  component: React.ComponentType<any>;
  defaultSize?: { w: number; h: number };
  minSize?: { w: number; h: number };
  maxSize?: { w: number; h: number };
}

export interface GridLayout extends Layout {
  i: string;
}

interface FlexibleGridProps {
  widgets: Widget[];
  initialLayouts?: { [key: string]: GridLayout[] };
  onLayoutChange?: (layouts: { [key: string]: GridLayout[] }) => void;
  onWidgetAdd?: (widgetType: string) => void;
  onWidgetRemove?: (widgetId: string) => void;
}

export const FlexibleGrid: React.FC<FlexibleGridProps> = ({
  widgets,
  initialLayouts,
  onLayoutChange,
  onWidgetAdd,
  onWidgetRemove,
}) => {
  const [layouts, setLayouts] = useState<{ [key: string]: GridLayout[] }>(
    initialLayouts || {
      lg: widgets.map((widget, index) => ({
        i: widget.id,
        x: (index % 3) * 4,
        y: Math.floor(index / 3) * 4,
        w: widget.defaultSize?.w || 4,
        h: widget.defaultSize?.h || 4,
        minW: widget.minSize?.w || 2,
        minH: widget.minSize?.h || 2,
        maxW: widget.maxSize?.w || 12,
        maxH: widget.maxSize?.h || 12,
      })),
    }
  );

  const [isLocked, setIsLocked] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  const handleLayoutChange = useCallback(
    (currentLayout: Layout[], allLayouts: { [key: string]: Layout[] }) => {
      const typedLayouts = Object.entries(allLayouts).reduce(
        (acc, [key, value]) => {
          acc[key] = value as GridLayout[];
          return acc;
        },
        {} as { [key: string]: GridLayout[] }
      );
      setLayouts(typedLayouts);
      onLayoutChange?.(typedLayouts);
    },
    [onLayoutChange]
  );

  const handleRemoveWidget = useCallback(
    (widgetId: string) => {
      onWidgetRemove?.(widgetId);
    },
    [onWidgetRemove]
  );

  const toggleLock = () => setIsLocked(!isLocked);
  const toggleEditMode = () => setIsEditMode(!isEditMode);

  return (
    <div className="relative w-full h-full">
      {/* Control Bar */}
      <div className="flex items-center justify-between mb-4 p-4 bg-card border rounded-lg">
        <div className="flex items-center gap-2">
          <LayoutGrid className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Dashboard</h2>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant={isEditMode ? "default" : "outline"}
            size="sm"
            onClick={toggleEditMode}
          >
            <Settings className="h-4 w-4 mr-2" />
            {isEditMode ? "Done" : "Customize"}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={toggleLock}
          >
            {isLocked ? (
              <>
                <Lock className="h-4 w-4 mr-2" />
                Locked
              </>
            ) : (
              <>
                <Unlock className="h-4 w-4 mr-2" />
                Unlocked
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Grid Layout */}
      <ResponsiveGridLayout
        className="layout"
        layouts={layouts}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
        rowHeight={60}
        isDraggable={!isLocked && isEditMode}
        isResizable={!isLocked && isEditMode}
        onLayoutChange={handleLayoutChange}
        draggableHandle=".drag-handle"
        compactType="vertical"
        preventCollision={false}
      >
        {widgets.map((widget) => (
          <div
            key={widget.id}
            className="bg-card border rounded-lg shadow-sm overflow-hidden"
          >
            {/* Widget Header */}
            <div className="flex items-center justify-between p-3 border-b bg-muted/50">
              <div className="flex items-center gap-2">
                {isEditMode && !isLocked && (
                  <div className="drag-handle cursor-move">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      className="text-muted-foreground"
                    >
                      <circle cx="4" cy="4" r="1.5" fill="currentColor" />
                      <circle cx="12" cy="4" r="1.5" fill="currentColor" />
                      <circle cx="4" cy="8" r="1.5" fill="currentColor" />
                      <circle cx="12" cy="8" r="1.5" fill="currentColor" />
                      <circle cx="4" cy="12" r="1.5" fill="currentColor" />
                      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
                    </svg>
                  </div>
                )}
                <h3 className="text-sm font-semibold">{widget.title}</h3>
              </div>
              
              {isEditMode && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveWidget(widget.id)}
                  className="h-6 w-6 p-0"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <line x1="4" y1="4" x2="12" y2="12" />
                    <line x1="12" y1="4" x2="4" y2="12" />
                  </svg>
                </Button>
              )}
            </div>

            {/* Widget Content */}
            <div className="p-4 h-[calc(100%-52px)] overflow-auto">
              <widget.component />
            </div>
          </div>
        ))}
      </ResponsiveGridLayout>

      {/* Add Widget Button (Edit Mode) */}
      {isEditMode && (
        <div className="fixed bottom-8 right-8">
          <Button
            size="lg"
            className="rounded-full shadow-lg"
            onClick={() => {
              // This will be handled by parent component
              console.log('Add widget clicked');
            }}
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Widget
          </Button>
        </div>
      )}
    </div>
  );
};

export default FlexibleGrid;
