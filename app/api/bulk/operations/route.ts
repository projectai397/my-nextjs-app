import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import {
  bulkUpdateStatus,
  bulkAdjustCredits,
  bulkSendEmails,
  bulkSendSMS,
  getOperationStatus,
  type BulkCreditAdjustment
} from '@/lib/bulkOperationsService';

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
    const { operation, data } = body;

    if (!operation) {
      return NextResponse.json(
        { error: 'Operation type is required' },
        { status: 400 }
      );
    }

    // @ts-ignore
    const userId = session.user.id || session.user.email;

    let result;

    switch (operation) {
      case 'update_status':
        if (!data.userIds || !data.status) {
          return NextResponse.json(
            { error: 'userIds and status are required' },
            { status: 400 }
          );
        }
        result = await bulkUpdateStatus(data.userIds, data.status, userId);
        break;

      case 'adjust_credits':
        if (!data.adjustments) {
          return NextResponse.json(
            { error: 'adjustments array is required' },
            { status: 400 }
          );
        }
        result = await bulkAdjustCredits(data.adjustments, userId);
        break;

      case 'send_email':
        if (!data.userIds || !data.subject || !data.body) {
          return NextResponse.json(
            { error: 'userIds, subject, and body are required' },
            { status: 400 }
          );
        }
        result = await bulkSendEmails(data.userIds, data.subject, data.body, userId);
        break;

      case 'send_sms':
        if (!data.userIds || !data.message) {
          return NextResponse.json(
            { error: 'userIds and message are required' },
            { status: 400 }
          );
        }
        result = await bulkSendSMS(data.userIds, data.message, userId);
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid operation type' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('Bulk Operation Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to execute bulk operation' },
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

    const { searchParams } = new URL(request.url);
    const operationId = searchParams.get('id');

    if (!operationId) {
      return NextResponse.json(
        { error: 'Operation ID is required' },
        { status: 400 }
      );
    }

    const operation = getOperationStatus(operationId);

    if (!operation) {
      return NextResponse.json(
        { error: 'Operation not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: operation
    });
  } catch (error: any) {
    console.error('Get Operation Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get operation status' },
      { status: 500 }
    );
  }
}
