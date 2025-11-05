/**
 * User Impersonation Service
 * Secure admin capability to view platform as a specific user
 */

import { createAuditLog } from './auditService';

export interface ImpersonationSession {
  id: string;
  adminId: string;
  adminName: string;
  targetUserId: string;
  targetUserName: string;
  startedAt: Date;
  expiresAt: Date;
  reason: string;
  ipAddress: string;
  userAgent: string;
  isActive: boolean;
  endedAt?: Date;
  actions: ImpersonationAction[];
}

export interface ImpersonationAction {
  timestamp: Date;
  action: string;
  details: any;
  route: string;
}

export interface ImpersonationRequest {
  adminId: string;
  adminName: string;
  targetUserId: string;
  targetUserName: string;
  reason: string;
  duration?: number; // minutes, default 30
  mfaCode?: string; // Required for MFA-enabled admins
}

// In-memory storage (use database in production)
const activeSessions = new Map<string, ImpersonationSession>();
const sessionHistory = new Map<string, ImpersonationSession[]>();

// Configuration
const MAX_SESSION_DURATION = 30; // minutes
const REQUIRE_MFA = true;
const ALLOWED_ADMIN_ROLES = ['super_admin', 'admin'];

/**
 * Start impersonation session
 */
export async function startImpersonation(
  request: ImpersonationRequest,
  ipAddress: string,
  userAgent: string
): Promise<{ success: boolean; session?: ImpersonationSession; error?: string }> {
  try {
    // Validate admin permissions
    // TODO: Check admin role from database
    // const admin = await getUser(request.adminId);
    // if (!ALLOWED_ADMIN_ROLES.includes(admin.role)) {
    //   throw new Error('Insufficient permissions');
    // }

    // Validate MFA if required
    if (REQUIRE_MFA && !request.mfaCode) {
      return {
        success: false,
        error: 'MFA verification required'
      };
    }

    // TODO: Verify MFA code
    // if (request.mfaCode) {
    //   const isValid = await verifyMFACode(request.adminId, request.mfaCode);
    //   if (!isValid) {
    //     return { success: false, error: 'Invalid MFA code' };
    //   }
    // }

    // Check if admin already has an active session
    const existingSession = Array.from(activeSessions.values()).find(
      s => s.adminId === request.adminId && s.isActive
    );

    if (existingSession) {
      return {
        success: false,
        error: 'You already have an active impersonation session. Please end it first.'
      };
    }

    // Validate reason
    if (!request.reason || request.reason.trim().length < 10) {
      return {
        success: false,
        error: 'Please provide a detailed reason (minimum 10 characters)'
      };
    }

    // Create session
    const duration = Math.min(request.duration || MAX_SESSION_DURATION, MAX_SESSION_DURATION);
    const session: ImpersonationSession = {
      id: generateSessionId(),
      adminId: request.adminId,
      adminName: request.adminName,
      targetUserId: request.targetUserId,
      targetUserName: request.targetUserName,
      startedAt: new Date(),
      expiresAt: new Date(Date.now() + duration * 60 * 1000),
      reason: request.reason,
      ipAddress,
      userAgent,
      isActive: true,
      actions: []
    };

    // Store session
    activeSessions.set(session.id, session);

    // Add to history
    const history = sessionHistory.get(request.adminId) || [];
    history.push(session);
    sessionHistory.set(request.adminId, history);

    // Create audit log
    await createAuditLog({
      userId: request.adminId,
      userName: request.adminName,
      action: 'impersonation_started',
      category: 'security',
      details: {
        targetUserId: request.targetUserId,
        targetUserName: request.targetUserName,
        reason: request.reason,
        duration,
        sessionId: session.id
      },
      ipAddress,
      userAgent,
      status: 'success'
    });

    // TODO: Send notification to user (optional)
    // await notifyUser(request.targetUserId, 'Admin is viewing your account for support');

    return {
      success: true,
      session
    };
  } catch (error: any) {
    console.error('Start Impersonation Error:', error);
    return {
      success: false,
      error: error.message || 'Failed to start impersonation'
    };
  }
}

/**
 * End impersonation session
 */
export async function endImpersonation(
  sessionId: string,
  adminId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = activeSessions.get(sessionId);

    if (!session) {
      return {
        success: false,
        error: 'Session not found'
      };
    }

    if (session.adminId !== adminId) {
      return {
        success: false,
        error: 'Unauthorized: You can only end your own sessions'
      };
    }

    if (!session.isActive) {
      return {
        success: false,
        error: 'Session is already ended'
      };
    }

    // End session
    session.isActive = false;
    session.endedAt = new Date();

    // Create audit log
    await createAuditLog({
      userId: adminId,
      userName: session.adminName,
      action: 'impersonation_ended',
      category: 'security',
      details: {
        targetUserId: session.targetUserId,
        targetUserName: session.targetUserName,
        sessionId: session.id,
        duration: Math.floor((session.endedAt.getTime() - session.startedAt.getTime()) / 60000),
        actionsPerformed: session.actions.length
      },
      status: 'success'
    });

    return { success: true };
  } catch (error: any) {
    console.error('End Impersonation Error:', error);
    return {
      success: false,
      error: error.message || 'Failed to end impersonation'
    };
  }
}

/**
 * Get active session for admin
 */
export function getActiveSession(adminId: string): ImpersonationSession | null {
  const session = Array.from(activeSessions.values()).find(
    s => s.adminId === adminId && s.isActive
  );

  if (!session) return null;

  // Check if expired
  if (new Date() > session.expiresAt) {
    session.isActive = false;
    session.endedAt = new Date();
    return null;
  }

  return session;
}

/**
 * Get session by ID
 */
export function getSession(sessionId: string): ImpersonationSession | null {
  return activeSessions.get(sessionId) || null;
}

/**
 * Log action during impersonation
 */
export async function logImpersonationAction(
  sessionId: string,
  action: string,
  details: any,
  route: string
): Promise<void> {
  const session = activeSessions.get(sessionId);
  if (!session || !session.isActive) return;

  session.actions.push({
    timestamp: new Date(),
    action,
    details,
    route
  });

  // Also create audit log
  await createAuditLog({
    userId: session.adminId,
    userName: session.adminName,
    action: 'impersonation_action',
    category: 'security',
    details: {
      targetUserId: session.targetUserId,
      targetUserName: session.targetUserName,
      sessionId,
      action,
      actionDetails: details,
      route
    },
    status: 'success'
  });
}

/**
 * Get impersonation history for admin
 */
export function getImpersonationHistory(
  adminId: string,
  limit: number = 50
): ImpersonationSession[] {
  const history = sessionHistory.get(adminId) || [];
  return history
    .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
    .slice(0, limit);
}

/**
 * Get all active sessions (for monitoring)
 */
export function getAllActiveSessions(): ImpersonationSession[] {
  return Array.from(activeSessions.values())
    .filter(s => s.isActive && new Date() <= s.expiresAt)
    .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
}

/**
 * Force end session (admin override)
 */
export async function forceEndSession(
  sessionId: string,
  adminId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = activeSessions.get(sessionId);

    if (!session) {
      return {
        success: false,
        error: 'Session not found'
      };
    }

    if (!session.isActive) {
      return {
        success: false,
        error: 'Session is already ended'
      };
    }

    // End session
    session.isActive = false;
    session.endedAt = new Date();

    // Create audit log
    await createAuditLog({
      userId: adminId,
      userName: 'System Admin',
      action: 'impersonation_force_ended',
      category: 'security',
      details: {
        sessionId: session.id,
        originalAdmin: session.adminName,
        targetUser: session.targetUserName,
        reason
      },
      status: 'success'
    });

    return { success: true };
  } catch (error: any) {
    console.error('Force End Session Error:', error);
    return {
      success: false,
      error: error.message || 'Failed to force end session'
    };
  }
}

/**
 * Check if user is being impersonated
 */
export function isUserBeingImpersonated(userId: string): {
  isImpersonated: boolean;
  session?: ImpersonationSession;
} {
  const session = Array.from(activeSessions.values()).find(
    s => s.targetUserId === userId && s.isActive && new Date() <= s.expiresAt
  );

  return {
    isImpersonated: !!session,
    session
  };
}

/**
 * Get impersonation statistics
 */
export function getImpersonationStats(): {
  activeSessions: number;
  totalSessionsToday: number;
  averageDuration: number;
  topAdmins: Array<{ adminId: string; adminName: string; count: number }>;
} {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const allSessions = Array.from(activeSessions.values());
  const todaySessions = allSessions.filter(s => s.startedAt >= today);

  // Calculate average duration
  const completedSessions = allSessions.filter(s => s.endedAt);
  const totalDuration = completedSessions.reduce((sum, s) => {
    const duration = s.endedAt!.getTime() - s.startedAt.getTime();
    return sum + duration;
  }, 0);
  const averageDuration = completedSessions.length > 0
    ? Math.floor(totalDuration / completedSessions.length / 60000)
    : 0;

  // Top admins
  const adminCounts = new Map<string, { name: string; count: number }>();
  allSessions.forEach(s => {
    const current = adminCounts.get(s.adminId) || { name: s.adminName, count: 0 };
    current.count++;
    adminCounts.set(s.adminId, current);
  });

  const topAdmins = Array.from(adminCounts.entries())
    .map(([adminId, data]) => ({
      adminId,
      adminName: data.name,
      count: data.count
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    activeSessions: allSessions.filter(s => s.isActive).length,
    totalSessionsToday: todaySessions.length,
    averageDuration,
    topAdmins
  };
}

// Helper functions

function generateSessionId(): string {
  return `IMP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Auto-cleanup expired sessions (run periodically)
export function cleanupExpiredSessions(): number {
  let cleaned = 0;
  const now = new Date();

  activeSessions.forEach((session, id) => {
    if (session.isActive && now > session.expiresAt) {
      session.isActive = false;
      session.endedAt = now;
      cleaned++;

      // Create audit log
      createAuditLog({
        userId: session.adminId,
        userName: session.adminName,
        action: 'impersonation_expired',
        category: 'security',
        details: {
          sessionId: session.id,
          targetUserId: session.targetUserId,
          targetUserName: session.targetUserName
        },
        status: 'success'
      });
    }
  });

  return cleaned;
}

// Export all functions
export default {
  startImpersonation,
  endImpersonation,
  getActiveSession,
  getSession,
  logImpersonationAction,
  getImpersonationHistory,
  getAllActiveSessions,
  forceEndSession,
  isUserBeingImpersonated,
  getImpersonationStats,
  cleanupExpiredSessions
};
