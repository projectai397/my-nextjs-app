/**
 * Smart User Segmentation Service
 * AI-powered automatic user categorization and analysis
 */

import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export interface UserSegment {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  criteria: SegmentCriteria;
  userCount: number;
  characteristics: string[];
  recommendations: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface SegmentCriteria {
  tradingFrequency?: 'low' | 'medium' | 'high';
  tradingVolume?: 'small' | 'medium' | 'large';
  riskLevel?: 'low' | 'medium' | 'high';
  profitability?: 'negative' | 'neutral' | 'positive';
  activityStatus?: 'active' | 'inactive' | 'dormant';
  accountAge?: 'new' | 'established' | 'veteran';
  leverage?: 'conservative' | 'moderate' | 'aggressive';
}

export interface UserProfile {
  userId: string;
  userName: string;
  accountAge: number; // days
  totalTrades: number;
  tradingVolume: number;
  profitLoss: number;
  winRate: number;
  averageLeverage: number;
  lastActiveDate: Date;
  depositCount: number;
  withdrawalCount: number;
  marginCallCount: number;
  riskScore: number;
}

export interface SegmentationResult {
  segments: UserSegment[];
  userSegmentMap: Record<string, string>; // userId -> segmentId
  insights: {
    largestSegment: string;
    fastestGrowing: string;
    highestValue: string;
    needsAttention: string[];
  };
}

// Predefined segments
export const DEFAULT_SEGMENTS: Omit<UserSegment, 'userCount' | 'createdAt' | 'updatedAt'>[] = [
  {
    id: 'casual-traders',
    name: 'Casual Traders',
    description: 'Low-frequency traders with small volumes',
    color: '#3B82F6',
    icon: '🎯',
    criteria: {
      tradingFrequency: 'low',
      tradingVolume: 'small',
      riskLevel: 'low'
    },
    characteristics: [
      'Trade 1-5 times per month',
      'Average position size < $1,000',
      'Conservative leverage (1x-3x)',
      'Long-term hold strategy'
    ],
    recommendations: [
      'Educational content on trading strategies',
      'Encourage more frequent trading with incentives',
      'Offer demo account for practice',
      'Send market analysis newsletters'
    ]
  },
  {
    id: 'pro-traders',
    name: 'Pro Traders',
    description: 'High-frequency traders with consistent profitability',
    color: '#10B981',
    icon: '🏆',
    criteria: {
      tradingFrequency: 'high',
      tradingVolume: 'large',
      profitability: 'positive',
      riskLevel: 'medium'
    },
    characteristics: [
      'Trade 20+ times per month',
      'Average position size > $10,000',
      'Win rate > 60%',
      'Uses technical analysis'
    ],
    recommendations: [
      'VIP support and priority execution',
      'Advanced trading tools and APIs',
      'Lower commission rates',
      'Exclusive market insights'
    ]
  },
  {
    id: 'risky-users',
    name: 'Risky Users',
    description: 'High-risk traders with frequent margin calls',
    color: '#EF4444',
    icon: '⚠️',
    criteria: {
      riskLevel: 'high',
      leverage: 'aggressive',
      profitability: 'negative'
    },
    characteristics: [
      'High leverage usage (10x+)',
      'Multiple margin calls',
      'Negative P&L trend',
      'Impulsive trading patterns'
    ],
    recommendations: [
      'Risk management education',
      'Reduce maximum leverage',
      'Send margin call warnings',
      'Offer risk assessment tools'
    ]
  },
  {
    id: 'high-rollers',
    name: 'High Rollers',
    description: 'Large deposits and high-value trades',
    color: '#F59E0B',
    icon: '💎',
    criteria: {
      tradingVolume: 'large',
      activityStatus: 'active'
    },
    characteristics: [
      'Account balance > $50,000',
      'Average trade size > $20,000',
      'Regular large deposits',
      'Premium account features'
    ],
    recommendations: [
      'Dedicated account manager',
      'Custom trading solutions',
      'Exclusive events and networking',
      'Personalized market research'
    ]
  },
  {
    id: 'dormant-users',
    name: 'Dormant Users',
    description: 'Inactive for 30+ days',
    color: '#6B7280',
    icon: '😴',
    criteria: {
      activityStatus: 'dormant'
    },
    characteristics: [
      'No trades in 30+ days',
      'No logins in 14+ days',
      'Previous active trader',
      'Positive account balance'
    ],
    recommendations: [
      'Re-engagement campaigns',
      'Special comeback offers',
      'Survey to understand inactivity',
      'Market opportunity alerts'
    ]
  },
  {
    id: 'growth-potential',
    name: 'Growth Potential',
    description: 'Increasing activity and improving performance',
    color: '#8B5CF6',
    icon: '📈',
    criteria: {
      activityStatus: 'active',
      profitability: 'positive'
    },
    characteristics: [
      'Increasing trade frequency',
      'Growing account balance',
      'Improving win rate',
      'Engaged with platform features'
    ],
    recommendations: [
      'Upgrade to premium features',
      'Advanced trading courses',
      'Referral program incentives',
      'Community engagement opportunities'
    ]
  },
  {
    id: 'new-users',
    name: 'New Users',
    description: 'Recently joined (< 30 days)',
    color: '#06B6D4',
    icon: '🌱',
    criteria: {
      accountAge: 'new',
      activityStatus: 'active'
    },
    characteristics: [
      'Account age < 30 days',
      'First few trades',
      'Learning platform features',
      'High engagement potential'
    ],
    recommendations: [
      'Onboarding tutorial completion',
      'Welcome bonus and incentives',
      'Educational resources',
      'Community introduction'
    ]
  }
];

/**
 * Analyze user profile and assign to segment using AI
 */
export async function analyzeUserSegment(profile: UserProfile): Promise<{
  segmentId: string;
  confidence: number;
  reasoning: string;
}> {
  try {
    const prompt = `
Analyze this trading user profile and assign them to the most appropriate segment:

User Profile:
- Account Age: ${profile.accountAge} days
- Total Trades: ${profile.totalTrades}
- Trading Volume: $${profile.tradingVolume.toLocaleString()}
- Profit/Loss: $${profile.profitLoss.toLocaleString()}
- Win Rate: ${profile.winRate}%
- Average Leverage: ${profile.averageLeverage}x
- Last Active: ${profile.lastActiveDate.toISOString()}
- Deposits: ${profile.depositCount}
- Withdrawals: ${profile.withdrawalCount}
- Margin Calls: ${profile.marginCallCount}
- Risk Score: ${profile.riskScore}/100

Available Segments:
${DEFAULT_SEGMENTS.map(s => `- ${s.id}: ${s.description}`).join('\n')}

Respond with JSON:
{
  "segmentId": "segment-id",
  "confidence": 0-100,
  "reasoning": "brief explanation"
}
`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are a user segmentation expert for trading platforms. Analyze user profiles and assign them to appropriate segments.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' }
    });

    const result = JSON.parse(completion.choices[0].message.content || '{}');
    return result;
  } catch (error) {
    console.error('AI Segmentation Error:', error);
    // Fallback to rule-based segmentation
    return ruleBasedSegmentation(profile);
  }
}

/**
 * Rule-based segmentation (fallback when AI is unavailable)
 */
function ruleBasedSegmentation(profile: UserProfile): {
  segmentId: string;
  confidence: number;
  reasoning: string;
} {
  const daysSinceActive = Math.floor(
    (Date.now() - profile.lastActiveDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  // New users
  if (profile.accountAge < 30) {
    return {
      segmentId: 'new-users',
      confidence: 95,
      reasoning: 'Account is less than 30 days old'
    };
  }

  // Dormant users
  if (daysSinceActive > 30) {
    return {
      segmentId: 'dormant-users',
      confidence: 90,
      reasoning: `No activity in ${daysSinceActive} days`
    };
  }

  // High rollers
  if (profile.tradingVolume > 100000) {
    return {
      segmentId: 'high-rollers',
      confidence: 85,
      reasoning: 'High trading volume and large account balance'
    };
  }

  // Risky users
  if (profile.riskScore > 75 || profile.marginCallCount > 3) {
    return {
      segmentId: 'risky-users',
      confidence: 80,
      reasoning: 'High risk score and multiple margin calls'
    };
  }

  // Pro traders
  if (profile.totalTrades > 100 && profile.winRate > 60 && profile.profitLoss > 0) {
    return {
      segmentId: 'pro-traders',
      confidence: 85,
      reasoning: 'High trade count with consistent profitability'
    };
  }

  // Growth potential
  if (profile.profitLoss > 0 && profile.totalTrades > 20 && daysSinceActive < 7) {
    return {
      segmentId: 'growth-potential',
      confidence: 75,
      reasoning: 'Positive performance with increasing activity'
    };
  }

  // Casual traders (default)
  return {
    segmentId: 'casual-traders',
    confidence: 70,
    reasoning: 'Low to medium trading frequency'
  };
}

/**
 * Segment multiple users in batch
 */
export async function segmentUsers(profiles: UserProfile[]): Promise<SegmentationResult> {
  const userSegmentMap: Record<string, string> = {};
  const segmentCounts: Record<string, number> = {};

  // Initialize segment counts
  DEFAULT_SEGMENTS.forEach(segment => {
    segmentCounts[segment.id] = 0;
  });

  // Analyze each user
  for (const profile of profiles) {
    const result = await analyzeUserSegment(profile);
    userSegmentMap[profile.userId] = result.segmentId;
    segmentCounts[result.segmentId] = (segmentCounts[result.segmentId] || 0) + 1;
  }

  // Create segments with user counts
  const segments: UserSegment[] = DEFAULT_SEGMENTS.map(segment => ({
    ...segment,
    userCount: segmentCounts[segment.id] || 0,
    createdAt: new Date(),
    updatedAt: new Date()
  }));

  // Calculate insights
  const sortedSegments = [...segments].sort((a, b) => b.userCount - a.userCount);
  
  const insights = {
    largestSegment: sortedSegments[0]?.name || 'Unknown',
    fastestGrowing: 'Growth Potential', // Would need historical data
    highestValue: 'High Rollers',
    needsAttention: segments
      .filter(s => s.id === 'risky-users' || s.id === 'dormant-users')
      .filter(s => s.userCount > 0)
      .map(s => s.name)
  };

  return {
    segments,
    userSegmentMap,
    insights
  };
}

/**
 * Get segment details by ID
 */
export function getSegmentById(segmentId: string): UserSegment | undefined {
  const segment = DEFAULT_SEGMENTS.find(s => s.id === segmentId);
  if (!segment) return undefined;

  return {
    ...segment,
    userCount: 0, // Would be fetched from database
    createdAt: new Date(),
    updatedAt: new Date()
  };
}

/**
 * Get users in a specific segment
 */
export async function getUsersInSegment(
  segmentId: string,
  allProfiles: UserProfile[]
): Promise<UserProfile[]> {
  const segmentResult = await segmentUsers(allProfiles);
  const userIds = Object.entries(segmentResult.userSegmentMap)
    .filter(([_, sid]) => sid === segmentId)
    .map(([uid, _]) => uid);

  return allProfiles.filter(p => userIds.includes(p.userId));
}

/**
 * Generate personalized recommendations for a segment
 */
export async function generateSegmentRecommendations(
  segmentId: string,
  users: UserProfile[]
): Promise<{
  marketing: string[];
  engagement: string[];
  retention: string[];
}> {
  try {
    const segment = getSegmentById(segmentId);
    if (!segment) {
      throw new Error('Segment not found');
    }

    const prompt = `
Generate personalized recommendations for this user segment:

Segment: ${segment.name}
Description: ${segment.description}
User Count: ${users.length}
Characteristics: ${segment.characteristics.join(', ')}

Provide 3 categories of recommendations:
1. Marketing campaigns
2. Engagement strategies
3. Retention tactics

Respond with JSON:
{
  "marketing": ["recommendation 1", "recommendation 2", "recommendation 3"],
  "engagement": ["recommendation 1", "recommendation 2", "recommendation 3"],
  "retention": ["recommendation 1", "recommendation 2", "recommendation 3"]
}
`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are a marketing and user engagement expert for trading platforms.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' }
    });

    const result = JSON.parse(completion.choices[0].message.content || '{}');
    return result;
  } catch (error) {
    console.error('Recommendation Generation Error:', error);
    // Return default recommendations
    return {
      marketing: ['Email campaign', 'Social media ads', 'Referral program'],
      engagement: ['In-app notifications', 'Educational content', 'Community events'],
      retention: ['Loyalty rewards', 'Personalized offers', 'Priority support']
    };
  }
}

/**
 * Compare segments over time
 */
export interface SegmentTrend {
  segmentId: string;
  segmentName: string;
  currentCount: number;
  previousCount: number;
  change: number;
  changePercent: number;
  trend: 'up' | 'down' | 'stable';
}

export async function getSegmentTrends(
  currentProfiles: UserProfile[],
  previousProfiles: UserProfile[]
): Promise<SegmentTrend[]> {
  const currentResult = await segmentUsers(currentProfiles);
  const previousResult = await segmentUsers(previousProfiles);

  const trends: SegmentTrend[] = currentResult.segments.map(segment => {
    const prevSegment = previousResult.segments.find(s => s.id === segment.id);
    const previousCount = prevSegment?.userCount || 0;
    const change = segment.userCount - previousCount;
    const changePercent = previousCount > 0 ? (change / previousCount) * 100 : 0;

    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (changePercent > 5) trend = 'up';
    else if (changePercent < -5) trend = 'down';

    return {
      segmentId: segment.id,
      segmentName: segment.name,
      currentCount: segment.userCount,
      previousCount,
      change,
      changePercent,
      trend
    };
  });

  return trends;
}

// Export all functions
export default {
  analyzeUserSegment,
  segmentUsers,
  getSegmentById,
  getUsersInSegment,
  generateSegmentRecommendations,
  getSegmentTrends,
  DEFAULT_SEGMENTS
};
