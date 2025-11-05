import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { generateSegmentRecommendations, type UserProfile } from '@/lib/segmentationService';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { segmentId, users } = body;

    if (!segmentId) {
      return NextResponse.json(
        { error: 'Segment ID is required' },
        { status: 400 }
      );
    }

    if (!users || !Array.isArray(users)) {
      return NextResponse.json(
        { error: 'Users array is required' },
        { status: 400 }
      );
    }

    const recommendations = await generateSegmentRecommendations(segmentId, users);

    return NextResponse.json({
      success: true,
      data: recommendations
    });
  } catch (error: any) {
    console.error('Recommendations Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate recommendations' },
      { status: 500 }
    );
  }
}
