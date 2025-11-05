import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { verifyMFA } from '@/lib/mfaService';

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
    const { code, method, secret } = body;

    if (!code || !method) {
      return NextResponse.json(
        { error: 'Code and method are required' },
        { status: 400 }
      );
    }

    if (!['sms', 'email', 'totp'].includes(method)) {
      return NextResponse.json(
        { error: 'Invalid MFA method' },
        { status: 400 }
      );
    }

    // @ts-ignore
    const userId = session.user.id || session.user.email;

    const result = await verifyMFA(userId, code, method, secret);

    if (!result.valid) {
      return NextResponse.json(
        { 
          success: false,
          error: result.error || 'Invalid verification code'
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'MFA verification successful'
    });
  } catch (error: any) {
    console.error('MFA Verification Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to verify MFA' },
      { status: 500 }
    );
  }
}
