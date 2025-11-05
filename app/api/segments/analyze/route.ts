import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { segmentUsers, analyzeUserSegment, type UserProfile } from '@/lib/segmentationService';

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
    const { profiles, single } = body;

    if (!profiles || !Array.isArray(profiles)) {
      return NextResponse.json(
        { error: 'User profiles array is required' },
        { status: 400 }
      );
    }

    if (single && profiles.length === 1) {
      // Analyze single user
      const result = await analyzeUserSegment(profiles[0]);
      return NextResponse.json({
        success: true,
        data: result
      });
    }

    // Segment multiple users
    const result = await segmentUsers(profiles);

    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('Segmentation Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to segment users' },
      { status: 500 }
    );
  }
}
