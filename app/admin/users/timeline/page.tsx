"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Clock,
  Download,
  Search,
  Filter,
  Calendar,
  TrendingUp,
  Activity,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

interface TimelineEvent {
  id: string;
  userId: string;
  userName: string;
  timestamp: string;
  category: string;
  action: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  importance: 'low' | 'medium' | 'high' | 'critical';
}

interface TimelineStats {
  totalEvents: number;
  eventsByCategory: Record<string, number>;
  eventsByImportance: Record<string, number>;
  mostActiveDay: string;
  averageEventsPerDay: number;
}

export default function ActivityTimelinePage() {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [stats, setStats] = useState<TimelineStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedImportance, setSelectedImportance] = useState<string[]>([]);

  useEffect(() => {
    document.title = 'Activity Timeline | Admin Panel';
    loadEvents();
    loadStats();
  }, []);

  const loadEvents = async () => {
    setIsLoading(true);
    try {
      // Build query params
      const params = new URLSearchParams();
      if (searchQuery) params.append('searchQuery', searchQuery);
      if (selectedCategories.length > 0) {
        params.append('categories', selectedCategories.join(','));
      }
      if (selectedImportance.length > 0) {
        params.append('importance', selectedImportance.join(','));
      }

      const response = await fetch(`/api/timeline/events?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to load events');

      const data = await response.json();
      setEvents(data.data || []);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load timeline events');
      // Mock data for demo
      setEvents(generateMockEvents());
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch('/api/timeline/stats');
      if (!response.ok) throw new Error('Failed to load stats');

      const data = await response.json();
      setStats(data.data);
    } catch (error: any) {
      // Mock stats for demo
      setStats({
        totalEvents: 156,
        eventsByCategory: {
          authentication: 45,
          trading: 32,
          financial: 28,
          account: 24,
          security: 18,
          system: 9
        },
        eventsByImportance: {
          low: 62,
          medium: 58,
          high: 28,
          critical: 8
        },
        mostActiveDay: new Date().toISOString().split('T')[0],
        averageEventsPerDay: 22
      });
    }
  };

  const exportToCSV = async () => {
    try {
      const params = new URLSearchParams();
      params.append('format', 'csv');
      if (searchQuery) params.append('searchQuery', searchQuery);

      const response = await fetch(`/api/timeline/events?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to export');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `timeline-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success('Timeline exported successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to export timeline');
    }
  };

  const getImportanceBadge = (importance: string) => {
    const variants: Record<string, any> = {
      low: { variant: 'secondary', label: 'Low' },
      medium: { variant: 'default', label: 'Medium' },
      high: { variant: 'destructive', label: 'High' },
      critical: { variant: 'destructive', label: 'Critical' }
    };

    const config = variants[importance] || variants.medium;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const groupByDate = (events: TimelineEvent[]) => {
    const grouped = new Map<string, TimelineEvent[]>();
    
    events.forEach(event => {
      const date = new Date(event.timestamp).toLocaleDateString();
      const existing = grouped.get(date) || [];
      existing.push(event);
      grouped.set(date, existing);
    });

    return grouped;
  };

  const groupedEvents = groupByDate(events);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Clock className="h-8 w-8 text-blue-500" />
            Activity Timeline
          </h1>
          <p className="text-muted-foreground mt-2">
            Visual chronological display of all user activities
          </p>
        </div>
        <Button onClick={exportToCSV} variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Events</p>
                  <p className="text-2xl font-bold">{stats.totalEvents}</p>
                </div>
                <Activity className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Per Day</p>
                  <p className="text-2xl font-bold">{stats.averageEventsPerDay}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Critical Events</p>
                  <p className="text-2xl font-bold">{stats.eventsByImportance.critical || 0}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Most Active</p>
                  <p className="text-lg font-bold">{new Date(stats.mostActiveDay).toLocaleDateString()}</p>
                </div>
                <Calendar className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>
            <Button onClick={loadEvents} disabled={isLoading}>
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </div>

          <div className="flex gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground">Categories:</span>
            {['authentication', 'trading', 'financial', 'account', 'security', 'system'].map(cat => (
              <Badge
                key={cat}
                variant={selectedCategories.includes(cat) ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => {
                  setSelectedCategories(prev =>
                    prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
                  );
                }}
              >
                {cat}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Timeline Events</CardTitle>
          <CardDescription>
            {events.length} events found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
            {Array.from(groupedEvents.entries()).map(([date, dateEvents]) => (
              <div key={date}>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-blue-500" />
                  {date}
                </h3>
                
                <div className="relative border-l-2 border-gray-200 dark:border-gray-700 ml-4 space-y-6">
                  {dateEvents.map((event, idx) => (
                    <div key={event.id} className="relative pl-8 pb-6">
                      {/* Timeline dot */}
                      <div
                        className="absolute left-0 top-0 w-4 h-4 rounded-full -translate-x-[9px]"
                        style={{ backgroundColor: event.color }}
                      />

                      {/* Event card */}
                      <Card className="hover:shadow-lg transition-shadow">
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <span className="text-2xl">{event.icon}</span>
                                <div>
                                  <h4 className="font-semibold">{event.title}</h4>
                                  <p className="text-sm text-muted-foreground">
                                    {new Date(event.timestamp).toLocaleTimeString()} • {event.userName}
                                  </p>
                                </div>
                              </div>
                              <p className="text-sm mt-2">{event.description}</p>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              {getImportanceBadge(event.importance)}
                              <Badge variant="outline">{event.category}</Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {events.length === 0 && !isLoading && (
              <div className="text-center py-12 text-muted-foreground">
                <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No events found</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Mock data generator for demo
function generateMockEvents(): TimelineEvent[] {
  const categories = ['authentication', 'trading', 'financial', 'account', 'security', 'system'];
  const icons = ['🔐', '📈', '💰', '👤', '🛡️', '⚙️'];
  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#6B7280'];
  const importance = ['low', 'medium', 'high', 'critical'];

  const events: TimelineEvent[] = [];
  const now = new Date();

  for (let i = 0; i < 20; i++) {
    const catIndex = Math.floor(Math.random() * categories.length);
    const timestamp = new Date(now.getTime() - i * 3600000);

    events.push({
      id: `evt-${i}`,
      userId: `USR-${Math.floor(Math.random() * 100)}`,
      userName: `User ${Math.floor(Math.random() * 100)}`,
      timestamp: timestamp.toISOString(),
      category: categories[catIndex],
      action: 'action_performed',
      title: `${categories[catIndex]} Event ${i + 1}`,
      description: `This is a sample ${categories[catIndex]} event for demonstration purposes.`,
      icon: icons[catIndex],
      color: colors[catIndex],
      importance: importance[Math.floor(Math.random() * importance.length)] as any
    });
  }

  return events;
}
