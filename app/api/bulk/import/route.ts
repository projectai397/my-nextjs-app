import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { importUsersFromCSV, parseCSV } from '@/lib/bulkOperationsService';

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
    const { csvContent, validateOnly } = body;

    if (!csvContent) {
      return NextResponse.json(
        { error: 'CSV content is required' },
        { status: 400 }
      );
    }

    // @ts-ignore
    const userId = session.user.id || session.user.email;

    if (validateOnly) {
      // Just validate, don't import
      const parseResult = parseCSV(csvContent);
      return NextResponse.json({
        success: true,
        data: parseResult
      });
    }

    // Import users
    const operation = await importUsersFromCSV(csvContent, userId);

    return NextResponse.json({
      success: true,
      data: operation
    });
  } catch (error: any) {
    console.error('Bulk Import Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to import users' },
      { status: 500 }
    );
  }
}
