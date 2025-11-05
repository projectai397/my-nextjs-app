import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { processNaturalLanguageQuery } from '@/lib/aiService';

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
    const { query, context, userId, filters } = body;

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query is required and must be a string' },
        { status: 400 }
      );
    }

    // Process the query using AI service
    const response = await processNaturalLanguageQuery({
      query,
      context: context || 'dashboard',
      userId,
      filters
    });

    return NextResponse.json({
      success: true,
      data: response
    });
  } catch (error: any) {
    console.error('AI Query API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process query' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'AI Query API is running',
    endpoints: {
      POST: '/api/ai/query - Process natural language queries'
    }
  });
}
