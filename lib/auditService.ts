/**
 * Advanced Audit Logging Service
 * Tracks all user actions, admin operations, and system events
 */

export interface AuditLog {
  id: string;
  timestamp: Date;
  userId: string;
  userName?: string;
  action: AuditAction;
  category: AuditCategory;
  targetType?: string;
  targetId?: string;
  targetName?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  deviceType?: string;
  location?: {
    country?: string;
    city?: string;
    coordinates?: [number, number];
  };
  status: 'success' | 'failure' | 'pending';
  errorMessage?: string;
  metadata?: Record<string, any>;
}

export type AuditCategory = 
  | 'authentication'
  | 'user_management'
  | 'financial'
  | 'trading'
  | 'security'
  | 'configuration'
  | 'compliance'
  | 'system';

export type AuditAction =
  // Authentication
  | 'login_success'
  | 'login_failure'
  | 'logout'
  | 'password_change'
  | 'password_reset'
  | 'mfa_enabled'
  | 'mfa_disabled'
  | 'mfa_verified'
  
  // User Management
  | 'user_created'
  | 'user_updated'
  | 'user_deleted'
  | 'user_activated'
  | 'user_deactivated'
  | 'role_changed'
  | 'permissions_updated'
  
  // Financial
  | 'deposit_created'
  | 'deposit_approved'
  | 'deposit_rejected'
  | 'withdrawal_requested'
  | 'withdrawal_approved'
  | 'withdrawal_rejected'
  | 'credit_adjusted'
  | 'balance_updated'
  
  // Trading
  | 'trade_executed'
  | 'trade_modified'
  | 'trade_cancelled'
  | 'position_opened'
  | 'position_closed'
  | 'order_placed'
  | 'order_cancelled'
  | 'margin_call'
  | 'auto_square_off'
  
  // Security
  | 'suspicious_activity'
  | 'anomaly_detected'
  | 'ip_blocked'
  | 'device_blocked'
  | 'security_alert'
  
  // Configuration
  | 'settings_updated'
  | 'api_key_created'
  | 'api_key_revoked'
  | 'webhook_configured'
  
  // Compliance
  | 'kyc_submitted'
  | 'kyc_approved'
  | 'kyc_rejected'
  | 'aml_check'
  | 'compliance_report'
  
  // System
  | 'data_export'
  | 'bulk_operation'
  | 'system_config'
  | 'backup_created';

export interface AuditLogFilter {
  userId?: string;
  category?: AuditCategory;
  action?: AuditAction;
  startDate?: Date;
  endDate?: Date;
  status?: 'success' | 'failure' | 'pending';
  ipAddress?: string;
  limit?: number;
  offset?: number;
}

export interface AuditLogStats {
  totalLogs: number;
  successCount: number;
  failureCount: number;
  byCategory: Record<AuditCategory, number>;
  byAction: Record<string, number>;
  topUsers: Array<{ userId: string; userName: string; count: number }>;
  recentFailures: AuditLog[];
}

// In-memory storage for demo (use database in production)
const auditLogs: AuditLog[] = [];

/**
 * Create an audit log entry
 */
export async function createAuditLog(log: Omit<AuditLog, 'id' | 'timestamp'>): Promise<AuditLog> {
  const auditLog: AuditLog = {
    id: generateLogId(),
    timestamp: new Date(),
    ...log
  };
  
  auditLogs.push(auditLog);
  
  // In production, save to database
  // await db.auditLogs.create(auditLog);
  
  // Trigger alerts for critical actions
  if (shouldTriggerAlert(auditLog)) {
    await triggerSecurityAlert(auditLog);
  }
  
  return auditLog;
}

/**
 * Query audit logs with filters
 */
export async function queryAuditLogs(filter: AuditLogFilter = {}): Promise<{
  logs: AuditLog[];
  total: number;
}> {
  let filtered = [...auditLogs];
  
  // Apply filters
  if (filter.userId) {
    filtered = filtered.filter(log => log.userId === filter.userId);
  }
  
  if (filter.category) {
    filtered = filtered.filter(log => log.category === filter.category);
  }
  
  if (filter.action) {
    filtered = filtered.filter(log => log.action === filter.action);
  }
  
  if (filter.status) {
    filtered = filtered.filter(log => log.status === filter.status);
  }
  
  if (filter.ipAddress) {
    filtered = filtered.filter(log => log.ipAddress === filter.ipAddress);
  }
  
  if (filter.startDate) {
    filtered = filtered.filter(log => log.timestamp >= filter.startDate!);
  }
  
  if (filter.endDate) {
    filtered = filtered.filter(log => log.timestamp <= filter.endDate!);
  }
  
  // Sort by timestamp (newest first)
  filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  
  const total = filtered.length;
  
  // Apply pagination
  const offset = filter.offset || 0;
  const limit = filter.limit || 50;
  const paginated = filtered.slice(offset, offset + limit);
  
  return { logs: paginated, total };
}

/**
 * Get audit log statistics
 */
export async function getAuditLogStats(filter: AuditLogFilter = {}): Promise<AuditLogStats> {
  const { logs, total } = await queryAuditLogs(filter);
  
  const successCount = logs.filter(log => log.status === 'success').length;
  const failureCount = logs.filter(log => log.status === 'failure').length;
  
  // Count by category
  const byCategory: Record<AuditCategory, number> = {
    authentication: 0,
    user_management: 0,
    financial: 0,
    trading: 0,
    security: 0,
    configuration: 0,
    compliance: 0,
    system: 0
  };
  
  logs.forEach(log => {
    byCategory[log.category] = (byCategory[log.category] || 0) + 1;
  });
  
  // Count by action
  const byAction: Record<string, number> = {};
  logs.forEach(log => {
    byAction[log.action] = (byAction[log.action] || 0) + 1;
  });
  
  // Top users
  const userCounts: Record<string, { userName: string; count: number }> = {};
  logs.forEach(log => {
    if (!userCounts[log.userId]) {
      userCounts[log.userId] = { userName: log.userName || log.userId, count: 0 };
    }
    userCounts[log.userId].count++;
  });
  
  const topUsers = Object.entries(userCounts)
    .map(([userId, data]) => ({ userId, ...data }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  
  // Recent failures
  const recentFailures = logs
    .filter(log => log.status === 'failure')
    .slice(0, 10);
  
  return {
    totalLogs: total,
    successCount,
    failureCount,
    byCategory,
    byAction,
    topUsers,
    recentFailures
  };
}

/**
 * Get user activity timeline
 */
export async function getUserActivityTimeline(userId: string, limit: number = 50): Promise<AuditLog[]> {
  const { logs } = await queryAuditLogs({ userId, limit });
  return logs;
}

/**
 * Export audit logs to CSV
 */
export async function exportAuditLogs(filter: AuditLogFilter = {}): Promise<string> {
  const { logs } = await queryAuditLogs(filter);
  
  const headers = [
    'Timestamp',
    'User ID',
    'User Name',
    'Action',
    'Category',
    'Status',
    'IP Address',
    'Device Type',
    'Target Type',
    'Target ID',
    'Details'
  ];
  
  const rows = logs.map(log => [
    log.timestamp.toISOString(),
    log.userId,
    log.userName || '',
    log.action,
    log.category,
    log.status,
    log.ipAddress || '',
    log.deviceType || '',
    log.targetType || '',
    log.targetId || '',
    JSON.stringify(log.details || {})
  ]);
  
  const csv = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');
  
  return csv;
}

/**
 * Detect suspicious patterns in audit logs
 */
export async function detectSuspiciousPatterns(userId?: string): Promise<{
  patterns: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    logs: AuditLog[];
  }>;
}> {
  const filter: AuditLogFilter = userId ? { userId } : {};
  const { logs } = await queryAuditLogs(filter);
  
  const patterns: any[] = [];
  
  // Pattern 1: Multiple failed login attempts
  const failedLogins = logs.filter(log => log.action === 'login_failure');
  if (failedLogins.length >= 5) {
    patterns.push({
      type: 'multiple_failed_logins',
      severity: 'high',
      description: `${failedLogins.length} failed login attempts detected`,
      logs: failedLogins.slice(0, 5)
    });
  }
  
  // Pattern 2: Unusual login locations
  const logins = logs.filter(log => log.action === 'login_success');
  const countries = new Set(logins.map(log => log.location?.country).filter(Boolean));
  if (countries.size > 3) {
    patterns.push({
      type: 'multiple_locations',
      severity: 'medium',
      description: `Logins from ${countries.size} different countries`,
      logs: logins.slice(0, 5)
    });
  }
  
  // Pattern 3: Rapid succession of actions
  const recentLogs = logs.slice(0, 10);
  const timeSpan = recentLogs.length > 1
    ? recentLogs[0].timestamp.getTime() - recentLogs[recentLogs.length - 1].timestamp.getTime()
    : 0;
  
  if (timeSpan < 60000 && recentLogs.length >= 10) { // 10 actions in less than 1 minute
    patterns.push({
      type: 'rapid_actions',
      severity: 'medium',
      description: '10+ actions in less than 1 minute',
      logs: recentLogs
    });
  }
  
  // Pattern 4: Large withdrawals
  const withdrawals = logs.filter(log => 
    log.action === 'withdrawal_requested' && 
    log.details?.amount && 
    log.details.amount > 10000
  );
  
  if (withdrawals.length > 0) {
    patterns.push({
      type: 'large_withdrawals',
      severity: 'high',
      description: `${withdrawals.length} large withdrawal(s) detected`,
      logs: withdrawals
    });
  }
  
  return { patterns };
}

// Helper functions

function generateLogId(): string {
  return `LOG-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function shouldTriggerAlert(log: AuditLog): boolean {
  const criticalActions: AuditAction[] = [
    'login_failure',
    'suspicious_activity',
    'anomaly_detected',
    'margin_call',
    'withdrawal_requested',
    'user_deleted',
    'mfa_disabled'
  ];
  
  return criticalActions.includes(log.action) || log.status === 'failure';
}

async function triggerSecurityAlert(log: AuditLog): Promise<void> {
  // TODO: Send alert via email, SMS, or notification system
  console.log('Security Alert:', log.action, log.userId);
  
  // In production, integrate with notification service
  // await sendEmail({
  //   to: 'security@platform.com',
  //   subject: `Security Alert: ${log.action}`,
  //   body: JSON.stringify(log, null, 2)
  // });
}

/**
 * Middleware helper to log actions
 */
export function createAuditMiddleware() {
  return async (req: any, action: AuditAction, category: AuditCategory, details?: any) => {
    const userId = req.user?.id || req.session?.user?.id || 'anonymous';
    const userName = req.user?.name || req.session?.user?.name;
    const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];
    
    await createAuditLog({
      userId,
      userName,
      action,
      category,
      details,
      ipAddress,
      userAgent,
      status: 'success'
    });
  };
}

// Export all functions
export default {
  createAuditLog,
  queryAuditLogs,
  getAuditLogStats,
  getUserActivityTimeline,
  exportAuditLogs,
  detectSuspiciousPatterns,
  createAuditMiddleware
};
