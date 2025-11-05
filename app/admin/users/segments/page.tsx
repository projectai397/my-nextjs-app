"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Users,
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  Sparkles,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import { DEFAULT_SEGMENTS } from '@/lib/segmentationService';
import { toast } from 'sonner';

interface SegmentData {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  userCount: number;
  characteristics: string[];
  recommendations: string[];
  trend?: 'up' | 'down' | 'stable';
  changePercent?: number;
}

export default function UserSegmentsPage() {
  const [segments, setSegments] = useState<SegmentData[]>([]);
  const [selectedSegment, setSelectedSegment] = useState<SegmentData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [aiRecommendations, setAiRecommendations] = useState<any>(null);

  useEffect(() => {
    document.title = 'User Segments | Admin Panel';
    loadSegments();
  }, []);

  const loadSegments = async () => {
    setIsLoading(true);
    try {
      // TODO: Fetch from API
      // For now, use default segments with mock data
      const mockSegments: SegmentData[] = DEFAULT_SEGMENTS.map((segment, idx) => ({
        ...segment,
        userCount: Math.floor(Math.random() * 500) + 50,
        trend: ['up', 'down', 'stable'][idx % 3] as any,
        changePercent: Math.floor(Math.random() * 30) - 10
      }));

      setSegments(mockSegments);
    } catch (error: any) {
      toast.error('Failed to load segments');
    } finally {
      setIsLoading(false);
    }
  };

  const loadAIRecommendations = async (segment: SegmentData) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/segments/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          segmentId: segment.id,
          users: [] // Would include actual user data
        })
      });

      if (!response.ok) throw new Error('Failed to load recommendations');

      const data = await response.json();
      setAiRecommendations(data.data);
    } catch (error: any) {
      toast.error('Failed to load AI recommendations');
    } finally {
      setIsLoading(false);
    }
  };

  const getTrendIcon = (trend?: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const totalUsers = segments.reduce((sum, s) => sum + s.userCount, 0);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Target className="h-8 w-8 text-blue-500" />
            User Segments
          </h1>
          <p className="text-muted-foreground mt-2">
            AI-powered automatic user categorization and insights
          </p>
        </div>
        <Button onClick={loadSegments} disabled={isLoading} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold">{totalUsers.toLocaleString()}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Segments</p>
                <p className="text-2xl font-bold">{segments.length}</p>
              </div>
              <Target className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Largest Segment</p>
                <p className="text-lg font-bold">
                  {segments.sort((a, b) => b.userCount - a.userCount)[0]?.name || 'N/A'}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">AI Powered</p>
                <p className="text-lg font-bold flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-yellow-500" />
                  Active
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Segments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {segments.map((segment) => (
          <Card
            key={segment.id}
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => setSelectedSegment(segment)}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{segment.icon}</span>
                  <CardTitle className="text-lg">{segment.name}</CardTitle>
                </div>
                {getTrendIcon(segment.trend)}
              </div>
              <CardDescription>{segment.description}</CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold">{segment.userCount}</p>
                  <p className="text-sm text-muted-foreground">users</p>
                </div>
                {segment.changePercent !== undefined && (
                  <Badge
                    variant={segment.trend === 'up' ? 'default' : segment.trend === 'down' ? 'destructive' : 'secondary'}
                  >
                    {segment.changePercent > 0 ? '+' : ''}{segment.changePercent}%
                  </Badge>
                )}
              </div>

              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full transition-all"
                  style={{
                    width: `${(segment.userCount / totalUsers) * 100}%`,
                    backgroundColor: segment.color
                  }}
                />
              </div>

              <Button variant="outline" size="sm" className="w-full gap-2">
                View Details
                <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Segment Details Modal/Sidebar */}
      {selectedSegment && (
        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{selectedSegment.icon}</span>
                <div>
                  <CardTitle>{selectedSegment.name}</CardTitle>
                  <CardDescription>{selectedSegment.description}</CardDescription>
                </div>
              </div>
              <Button variant="ghost" onClick={() => setSelectedSegment(null)}>
                Close
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            <Tabs defaultValue="characteristics">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="characteristics">Characteristics</TabsTrigger>
                <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
                <TabsTrigger value="ai-insights">AI Insights</TabsTrigger>
              </TabsList>

              <TabsContent value="characteristics" className="space-y-4 mt-4">
                <div>
                  <h4 className="font-semibold mb-3">Key Characteristics</h4>
                  <ul className="space-y-2">
                    {selectedSegment.characteristics.map((char, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-blue-500 mt-1">•</span>
                        <span className="text-sm">{char}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-4 border-t">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Users</p>
                      <p className="text-2xl font-bold">{selectedSegment.userCount}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Percentage</p>
                      <p className="text-2xl font-bold">
                        {((selectedSegment.userCount / totalUsers) * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="recommendations" className="space-y-4 mt-4">
                <div>
                  <h4 className="font-semibold mb-3">Action Recommendations</h4>
                  <ul className="space-y-2">
                    {selectedSegment.recommendations.map((rec, idx) => (
                      <li key={idx} className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                        <span className="text-blue-500 mt-1">→</span>
                        <span className="text-sm">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </TabsContent>

              <TabsContent value="ai-insights" className="space-y-4 mt-4">
                {!aiRecommendations ? (
                  <div className="text-center py-8">
                    <Button
                      onClick={() => loadAIRecommendations(selectedSegment)}
                      disabled={isLoading}
                      className="gap-2"
                    >
                      <Sparkles className="h-4 w-4" />
                      Generate AI Recommendations
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div>
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-yellow-500" />
                        Marketing Campaigns
                      </h4>
                      <ul className="space-y-2">
                        {aiRecommendations.marketing?.map((item: string, idx: number) => (
                          <li key={idx} className="flex items-start gap-2 p-3 bg-purple-50 dark:bg-purple-950 rounded-lg">
                            <span className="text-purple-500">📧</span>
                            <span className="text-sm">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-3">Engagement Strategies</h4>
                      <ul className="space-y-2">
                        {aiRecommendations.engagement?.map((item: string, idx: number) => (
                          <li key={idx} className="flex items-start gap-2 p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                            <span className="text-green-500">🎯</span>
                            <span className="text-sm">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-3">Retention Tactics</h4>
                      <ul className="space-y-2">
                        {aiRecommendations.retention?.map((item: string, idx: number) => (
                          <li key={idx} className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                            <span className="text-blue-500">🔄</span>
                            <span className="text-sm">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
