"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Bot,
  Send,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Info,
  Loader2,
  Lightbulb,
  BarChart3,
  Users,
  DollarSign
} from 'lucide-react';
import { toast } from 'sonner';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  insights?: AIInsight[];
  suggestedActions?: string[];
}

interface AIInsight {
  id: string;
  type: 'info' | 'warning' | 'success' | 'error';
  title: string;
  description: string;
  confidence: number;
}

interface AICoPilotProps {
  context?: 'dashboard' | 'users' | 'reports' | 'analytics';
  userId?: string;
}

const AICoPilot: React.FC<AICoPilotProps> = ({ context = 'dashboard', userId }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I\'m your AI Co-Pilot. Ask me anything about your users, trading data, or platform analytics. Try asking: "Show me high-risk users" or "What\'s the total trading volume today?"',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Suggested queries based on context
  const suggestedQueries: Record<string, string[]> = {
    dashboard: [
      'Show me today\'s key metrics',
      'Which users have the highest profit?',
      'Are there any unusual activities?',
      'What\'s the total trading volume?'
    ],
    users: [
      'Show me high-risk users',
      'Who are the most active traders?',
      'List users with negative balance',
      'Find inactive users from last 30 days'
    ],
    reports: [
      'Generate profit/loss summary',
      'Show top 10 profitable users',
      'What\'s the total brokerage earned?',
      'Compare this month vs last month'
    ],
    analytics: [
      'Predict churn risk for users',
      'Segment users by behavior',
      'Forecast next month\'s volume',
      'Identify growth opportunities'
    ]
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: input,
          context,
          userId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const data = await response.json();
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.data.answer,
        timestamp: new Date(),
        insights: data.data.insights,
        suggestedActions: data.data.suggestedActions
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('AI Query Error:', error);
      toast.error('Failed to process your query. Please try again.');
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'I apologize, but I encountered an error processing your request. Please try rephrasing your question or contact support if the issue persists.',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestedQuery = (query: string) => {
    setInput(query);
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <Card className="w-full h-[600px] flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg">AI Co-Pilot</CardTitle>
              <CardDescription>Ask me anything about your platform</CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="gap-1">
            <Sparkles className="h-3 w-3" />
            Powered by AI
          </Badge>
        </div>
      </CardHeader>

      <Separator />

      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        {/* Messages Area */}
        <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  
                  {/* Insights */}
                  {message.insights && message.insights.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {message.insights.map((insight) => (
                        <div
                          key={insight.id}
                          className="flex items-start gap-2 p-2 bg-background rounded border"
                        >
                          {getInsightIcon(insight.type)}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium">{insight.title}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {insight.description}
                            </p>
                            <Badge variant="outline" className="mt-1 text-xs">
                              {insight.confidence}% confidence
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Suggested Actions */}
                  {message.suggestedActions && message.suggestedActions.length > 0 && (
                    <div className="mt-3 space-y-1">
                      <p className="text-xs font-medium flex items-center gap-1">
                        <Lightbulb className="h-3 w-3" />
                        Suggested Actions:
                      </p>
                      <ul className="text-xs space-y-1 ml-4">
                        {message.suggestedActions.map((action, idx) => (
                          <li key={idx} className="list-disc">{action}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <p className="text-xs opacity-60 mt-2">
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg p-3 flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Thinking...</span>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Suggested Queries */}
        {messages.length === 1 && (
          <div className="p-4 border-t">
            <p className="text-xs font-medium mb-2">Try asking:</p>
            <div className="flex flex-wrap gap-2">
              {suggestedQueries[context].map((query, idx) => (
                <Button
                  key={idx}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => handleSuggestedQuery(query)}
                >
                  {query}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Ask me anything..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!input.trim() || isLoading}
              size="icon"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AICoPilot;
