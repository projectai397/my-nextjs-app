import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getTimelineStats, type TimelineFilter } from '@/lib/timelineService';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    
    // Parse filters
    const filter: TimelineFilter = {};
    
    if (searchParams.get('userId')) {
      filter.userId = searchParams.get('userId')!;
    }
    
    if (searchParams.get('startDate')) {
      filter.startDate = new Date(searchParams.get('startDate')!);
    }
    
    if (searchParams.get('endDate')) {
      filter.endDate = new Date(searchParams.get('endDate')!);
    }

    // Get statistics
    const stats = getTimelineStats(filter);

    return NextResponse.json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    console.error('Get Timeline Stats Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get timeline statistics' },
      { status: 500 }
    );
  }
}
