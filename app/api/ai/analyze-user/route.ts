import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { analyzeUserBehavior, calculateRiskScore, detectAnomalies } from '@/lib/aiService';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { userId, analysisType } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    let result;

    switch (analysisType) {
      case 'behavior':
        result = await analyzeUserBehavior(userId);
        break;
      case 'risk':
        result = await calculateRiskScore(userId);
        break;
      case 'anomalies':
        result = await detectAnomalies(userId);
        break;
      case 'all':
        result = {
          behavior: await analyzeUserBehavior(userId),
          risk: await calculateRiskScore(userId),
          anomalies: await detectAnomalies(userId)
        };
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid analysisType. Use: behavior, risk, anomalies, or all' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('User Analysis API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to analyze user' },
      { status: 500 }
    );
  }
}
