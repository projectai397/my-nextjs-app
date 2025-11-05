import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { explainLikeImFive } from '@/lib/aiService';

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
    const { concept, data } = body;

    if (!concept) {
      return NextResponse.json(
        { error: 'concept is required' },
        { status: 400 }
      );
    }

    const explanation = await explainLikeImFive(concept, data);

    return NextResponse.json({
      success: true,
      data: {
        concept,
        explanation
      }
    });
  } catch (error: any) {
    console.error('ELI5 API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate explanation' },
      { status: 500 }
    );
  }
}
