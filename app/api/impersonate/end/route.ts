import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { endImpersonation, getActiveSession } from '@/lib/impersonationService';

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

    // @ts-ignore
    const adminId = session.user.id || session.user.email;

    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId is required' },
        { status: 400 }
      );
    }

    const result = await endImpersonation(sessionId, adminId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Impersonation session ended successfully'
    });
  } catch (error: any) {
    console.error('End Impersonation Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to end impersonation' },
      { status: 500 }
    );
  }
}

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

    // @ts-ignore
    const adminId = session.user.id || session.user.email;

    // Get active session for this admin
    const activeSession = getActiveSession(adminId);

    return NextResponse.json({
      success: true,
      data: activeSession
    });
  } catch (error: any) {
    console.error('Get Active Session Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get active session' },
      { status: 500 }
    );
  }
}
