import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

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
    const { password } = body;

    if (!password) {
      return NextResponse.json(
        { error: 'Password required to disable MFA' },
        { status: 400 }
      );
    }

    // TODO: Verify password before disabling MFA
    // const isPasswordValid = await verifyPassword(userId, password);
    // if (!isPasswordValid) {
    //   return NextResponse.json(
    //     { error: 'Invalid password' },
    //     { status: 401 }
    //   );
    // }

    // TODO: Update user MFA settings in database
    // await updateUserMFA(userId, { enabled: false });

    return NextResponse.json({
      success: true,
      message: 'MFA has been disabled'
    });
  } catch (error: any) {
    console.error('MFA Disable Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to disable MFA' },
      { status: 500 }
    );
  }
}
