import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { startImpersonation } from '@/lib/impersonationService';

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

    // TODO: Check if user has admin role
    // @ts-ignore
    const adminId = session.user.id || session.user.email;
    // @ts-ignore
    const adminName = session.user.name || session.user.email;

    const body = await request.json();
    const { targetUserId, targetUserName, reason, duration, mfaCode } = body;

    if (!targetUserId || !targetUserName || !reason) {
      return NextResponse.json(
        { error: 'targetUserId, targetUserName, and reason are required' },
        { status: 400 }
      );
    }

    // Get IP and User Agent
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    const result = await startImpersonation(
      {
        adminId,
        adminName,
        targetUserId,
        targetUserName,
        reason,
        duration,
        mfaCode
      },
      ipAddress,
      userAgent
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.session
    });
  } catch (error: any) {
    console.error('Start Impersonation Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to start impersonation' },
      { status: 500 }
    );
  }
}
