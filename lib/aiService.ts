/**
 * AI Service Layer for Trading Platform
 * Provides natural language query processing and AI-powered insights
 */

import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface AIQueryRequest {
  query: string;
  context?: 'dashboard' | 'users' | 'reports' | 'analytics';
  userId?: string;
  filters?: Record<string, any>;
}

export interface AIInsight {
  id: string;
  type: 'info' | 'warning' | 'success' | 'error';
  title: string;
  description: string;
  data?: any;
  confidence: number;
  timestamp: Date;
}

export interface AIQueryResponse {
  answer: string;
  insights: AIInsight[];
  suggestedActions?: string[];
  visualizations?: any[];
}

/**
 * Process natural language query and return structured response
 */
export async function processNaturalLanguageQuery(
  request: AIQueryRequest
): Promise<AIQueryResponse> {
  try {
    const { query, context = 'dashboard', userId, filters } = request;

    // Build system prompt based on context
    const systemPrompt = buildSystemPrompt(context);

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: query }
      ],
      temperature: 0.3,
      max_tokens: 1000,
      response_format: { type: 'json_object' }
    });

    const responseText = completion.choices[0].message.content || '{}';
    const parsedResponse = JSON.parse(responseText);

    return {
      answer: parsedResponse.answer || 'I couldn\'t process that query.',
      insights: parsedResponse.insights || [],
      suggestedActions: parsedResponse.suggestedActions || [],
      visualizations: parsedResponse.visualizations || []
    };
  } catch (error) {
    console.error('AI Query Error:', error);
    throw new Error('Failed to process AI query');
  }
}

/**
 * Analyze user behavior and generate insights
 */
export async function analyzeUserBehavior(userId: string): Promise<AIInsight[]> {
  try {
    // Fetch user data (placeholder - replace with actual API call)
    const userData = await fetchUserData(userId);

    const prompt = `
      Analyze the following user trading data and provide insights in JSON format:
      ${JSON.stringify(userData)}
      
      Provide a JSON response with the following structure:
      {
        "insights": [
          {
            "type": "info|warning|success|error",
            "title": "Insight title",
            "description": "Detailed description",
            "confidence": 0-100
          }
        ]
      }
    `;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: 'You are a financial trading analyst.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' }
    });

    const response = JSON.parse(completion.choices[0].message.content || '{}');
    
    return (response.insights || []).map((insight: any, index: number) => ({
      id: `insight-${Date.now()}-${index}`,
      type: insight.type,
      title: insight.title,
      description: insight.description,
      confidence: insight.confidence,
      timestamp: new Date()
    }));
  } catch (error) {
    console.error('User Analysis Error:', error);
    return [];
  }
}

/**
 * Calculate risk score for a user
 */
export async function calculateRiskScore(userId: string): Promise<{
  overallScore: number;
  breakdown: {
    leverageRisk: number;
    balanceRisk: number;
    patternRisk: number;
  };
  recommendations: string[];
}> {
  try {
    const userData = await fetchUserData(userId);

    const prompt = `
      Calculate risk score for this user and provide recommendations:
      ${JSON.stringify(userData)}
      
      Return JSON with:
      {
        "overallScore": 0-100,
        "breakdown": {
          "leverageRisk": 0-100,
          "balanceRisk": 0-100,
          "patternRisk": 0-100
        },
        "recommendations": ["recommendation 1", "recommendation 2"]
      }
    `;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: 'You are a risk assessment expert for trading platforms.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' }
    });

    return JSON.parse(completion.choices[0].message.content || '{}');
  } catch (error) {
    console.error('Risk Score Error:', error);
    return {
      overallScore: 0,
      breakdown: { leverageRisk: 0, balanceRisk: 0, patternRisk: 0 },
      recommendations: []
    };
  }
}

/**
 * Detect anomalies in user activity
 */
export async function detectAnomalies(userId: string): Promise<AIInsight[]> {
  try {
    const userData = await fetchUserData(userId);
    const activityLog = await fetchUserActivityLog(userId);

    const prompt = `
      Analyze this user's activity for anomalies:
      User Data: ${JSON.stringify(userData)}
      Activity Log: ${JSON.stringify(activityLog)}
      
      Return JSON with detected anomalies:
      {
        "anomalies": [
          {
            "type": "warning|error",
            "title": "Anomaly title",
            "description": "What's unusual",
            "confidence": 0-100
          }
        ]
      }
    `;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: 'You are a fraud detection specialist.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' }
    });

    const response = JSON.parse(completion.choices[0].message.content || '{}');
    
    return (response.anomalies || []).map((anomaly: any, index: number) => ({
      id: `anomaly-${Date.now()}-${index}`,
      type: anomaly.type,
      title: anomaly.title,
      description: anomaly.description,
      confidence: anomaly.confidence,
      timestamp: new Date()
    }));
  } catch (error) {
    console.error('Anomaly Detection Error:', error);
    return [];
  }
}

/**
 * Generate ELI5 (Explain Like I'm 5) explanation
 */
export async function explainLikeImFive(concept: string, data?: any): Promise<string> {
  try {
    const prompt = `
      Explain this trading concept in simple language (like explaining to a 5-year-old):
      Concept: ${concept}
      ${data ? `Context: ${JSON.stringify(data)}` : ''}
      
      Use simple words, short sentences, and relatable examples.
    `;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: 'You are a teacher who explains complex concepts simply.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 300
    });

    return completion.choices[0].message.content || 'Unable to explain at this time.';
  } catch (error) {
    console.error('ELI5 Error:', error);
    return 'Unable to explain at this time.';
  }
}

/**
 * Segment users using AI
 */
export async function segmentUsers(users: any[]): Promise<{
  segments: {
    name: string;
    users: string[];
    characteristics: string[];
  }[];
}> {
  try {
    const prompt = `
      Segment these users into meaningful categories:
      ${JSON.stringify(users.slice(0, 100))} // Limit to prevent token overflow
      
      Return JSON with segments:
      {
        "segments": [
          {
            "name": "Segment name",
            "users": ["userId1", "userId2"],
            "characteristics": ["trait 1", "trait 2"]
          }
        ]
      }
    `;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: 'You are a user segmentation expert.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' }
    });

    return JSON.parse(completion.choices[0].message.content || '{"segments":[]}');
  } catch (error) {
    console.error('Segmentation Error:', error);
    return { segments: [] };
  }
}

// Helper functions

function buildSystemPrompt(context: string): string {
  const basePrompt = `You are an AI assistant for a trading platform admin panel. 
  You help admins understand their data, make decisions, and take actions.
  Always respond in JSON format with structured data.`;

  const contextPrompts: Record<string, string> = {
    dashboard: `${basePrompt} Focus on high-level metrics, trends, and alerts.`,
    users: `${basePrompt} Focus on user management, behavior analysis, and segmentation.`,
    reports: `${basePrompt} Focus on financial reports, profit/loss, and trading activity.`,
    analytics: `${basePrompt} Focus on predictive analytics, forecasting, and insights.`
  };

  return contextPrompts[context] || basePrompt;
}

async function fetchUserData(userId: string): Promise<any> {
  // Placeholder - replace with actual API call
  // In production, this would call your user API endpoint
  return {
    userId,
    userName: 'demo_user',
    role: 'Client',
    balance: 10000,
    tradingVolume: 50000,
    profitLoss: 2500,
    lastLogin: new Date().toISOString()
  };
}

async function fetchUserActivityLog(userId: string): Promise<any[]> {
  // Placeholder - replace with actual API call
  return [
    { action: 'login', timestamp: new Date().toISOString() },
    { action: 'trade', amount: 1000, timestamp: new Date().toISOString() }
  ];
}

// Export all functions
export default {
  processNaturalLanguageQuery,
  analyzeUserBehavior,
  calculateRiskScore,
  detectAnomalies,
  explainLikeImFive,
  segmentUsers
};
