import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { setupMFA } from '@/lib/mfaService';

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
    const { method, contactInfo } = body;

    if (!method || !['sms', 'email', 'totp'].includes(method)) {
      return NextResponse.json(
        { error: 'Invalid MFA method. Use: sms, email, or totp' },
        { status: 400 }
      );
    }

    // @ts-ignore - session.user may have custom properties
    const userId = session.user.id || session.user.email;

    const result = await setupMFA(userId, method, contactInfo);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'MFA setup failed' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        method,
        secret: result.secret,
        qrCode: result.qrCode,
        backupCodes: result.backupCodes
      }
    });
  } catch (error: any) {
    console.error('MFA Setup Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to setup MFA' },
      { status: 500 }
    );
  }
}
