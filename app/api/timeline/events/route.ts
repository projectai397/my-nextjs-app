import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getTimelineEvents, getTimelineStats, exportTimelineToCSV, type TimelineFilter } from '@/lib/timelineService';

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
    
    if (searchParams.get('categories')) {
      filter.categories = searchParams.get('categories')!.split(',') as any[];
    }
    
    if (searchParams.get('startDate')) {
      filter.startDate = new Date(searchParams.get('startDate')!);
    }
    
    if (searchParams.get('endDate')) {
      filter.endDate = new Date(searchParams.get('endDate')!);
    }
    
    if (searchParams.get('importance')) {
      filter.importance = searchParams.get('importance')!.split(',') as any[];
    }
    
    if (searchParams.get('searchQuery')) {
      filter.searchQuery = searchParams.get('searchQuery')!;
    }

    // Parse pagination
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get export format
    const format = searchParams.get('format');

    if (format === 'csv') {
      const events = getTimelineEvents(filter, 10000);
      const csv = exportTimelineToCSV(events);
      
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="timeline.csv"'
        }
      });
    }

    // Get events
    const events = getTimelineEvents(filter, limit, offset);

    return NextResponse.json({
      success: true,
      data: events,
      pagination: {
        limit,
        offset,
        total: events.length
      }
    });
  } catch (error: any) {
    console.error('Get Timeline Events Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get timeline events' },
      { status: 500 }
    );
  }
}
