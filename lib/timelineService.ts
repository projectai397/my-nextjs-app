/**
 * Activity Timeline Service
 * Visual chronological display of user activities
 */

export interface TimelineEvent {
  id: string;
  userId: string;
  userName: string;
  timestamp: Date;
  category: TimelineCategory;
  action: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  metadata?: Record<string, any>;
  importance: 'low' | 'medium' | 'high' | 'critical';
}

export type TimelineCategory =
  | 'authentication'
  | 'trading'
  | 'financial'
  | 'account'
  | 'security'
  | 'system';

export interface TimelineFilter {
  userId?: string;
  categories?: TimelineCategory[];
  startDate?: Date;
  endDate?: Date;
  importance?: ('low' | 'medium' | 'high' | 'critical')[];
  searchQuery?: string;
}

export interface TimelineStats {
  totalEvents: number;
  eventsByCategory: Record<TimelineCategory, number>;
  eventsByImportance: Record<string, number>;
  mostActiveDay: string;
  averageEventsPerDay: number;
}

// In-memory storage (use database in production)
const events = new Map<string, TimelineEvent>();

// Category configurations
const CATEGORY_CONFIG: Record<TimelineCategory, { icon: string; color: string }> = {
  authentication: { icon: '🔐', color: '#3B82F6' },
  trading: { icon: '📈', color: '#10B981' },
  financial: { icon: '💰', color: '#F59E0B' },
  account: { icon: '👤', color: '#8B5CF6' },
  security: { icon: '🛡️', color: '#EF4444' },
  system: { icon: '⚙️', color: '#6B7280' }
};

/**
 * Create a timeline event
 */
export function createTimelineEvent(
  userId: string,
  userName: string,
  category: TimelineCategory,
  action: string,
  title: string,
  description: string,
  importance: 'low' | 'medium' | 'high' | 'critical' = 'medium',
  metadata?: Record<string, any>
): TimelineEvent {
  const config = CATEGORY_CONFIG[category];
  
  const event: TimelineEvent = {
    id: generateEventId(),
    userId,
    userName,
    timestamp: new Date(),
    category,
    action,
    title,
    description,
    icon: config.icon,
    color: config.color,
    importance,
    metadata
  };

  events.set(event.id, event);
  return event;
}

/**
 * Get timeline events with filters
 */
export function getTimelineEvents(
  filter: TimelineFilter = {},
  limit: number = 100,
  offset: number = 0
): TimelineEvent[] {
  let filteredEvents = Array.from(events.values());

  // Filter by user
  if (filter.userId) {
    filteredEvents = filteredEvents.filter(e => e.userId === filter.userId);
  }

  // Filter by categories
  if (filter.categories && filter.categories.length > 0) {
    filteredEvents = filteredEvents.filter(e => filter.categories!.includes(e.category));
  }

  // Filter by date range
  if (filter.startDate) {
    filteredEvents = filteredEvents.filter(e => e.timestamp >= filter.startDate!);
  }
  if (filter.endDate) {
    filteredEvents = filteredEvents.filter(e => e.timestamp <= filter.endDate!);
  }

  // Filter by importance
  if (filter.importance && filter.importance.length > 0) {
    filteredEvents = filteredEvents.filter(e => filter.importance!.includes(e.importance));
  }

  // Filter by search query
  if (filter.searchQuery) {
    const query = filter.searchQuery.toLowerCase();
    filteredEvents = filteredEvents.filter(e =>
      e.title.toLowerCase().includes(query) ||
      e.description.toLowerCase().includes(query) ||
      e.action.toLowerCase().includes(query)
    );
  }

  // Sort by timestamp (newest first)
  filteredEvents.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  // Apply pagination
  return filteredEvents.slice(offset, offset + limit);
}

/**
 * Get timeline statistics
 */
export function getTimelineStats(filter: TimelineFilter = {}): TimelineStats {
  const filteredEvents = getTimelineEvents(filter, 10000);

  // Events by category
  const eventsByCategory: Record<TimelineCategory, number> = {
    authentication: 0,
    trading: 0,
    financial: 0,
    account: 0,
    security: 0,
    system: 0
  };

  filteredEvents.forEach(e => {
    eventsByCategory[e.category]++;
  });

  // Events by importance
  const eventsByImportance: Record<string, number> = {
    low: 0,
    medium: 0,
    high: 0,
    critical: 0
  };

  filteredEvents.forEach(e => {
    eventsByImportance[e.importance]++;
  });

  // Most active day
  const dayCount = new Map<string, number>();
  filteredEvents.forEach(e => {
    const day = e.timestamp.toISOString().split('T')[0];
    dayCount.set(day, (dayCount.get(day) || 0) + 1);
  });

  let mostActiveDay = '';
  let maxCount = 0;
  dayCount.forEach((count, day) => {
    if (count > maxCount) {
      maxCount = count;
      mostActiveDay = day;
    }
  });

  // Average events per day
  const uniqueDays = new Set(
    filteredEvents.map(e => e.timestamp.toISOString().split('T')[0])
  ).size;
  const averageEventsPerDay = uniqueDays > 0
    ? Math.round(filteredEvents.length / uniqueDays)
    : 0;

  return {
    totalEvents: filteredEvents.length,
    eventsByCategory,
    eventsByImportance,
    mostActiveDay,
    averageEventsPerDay
  };
}

/**
 * Group events by date
 */
export function groupEventsByDate(
  events: TimelineEvent[]
): Map<string, TimelineEvent[]> {
  const grouped = new Map<string, TimelineEvent[]>();

  events.forEach(event => {
    const date = event.timestamp.toISOString().split('T')[0];
    const existing = grouped.get(date) || [];
    existing.push(event);
    grouped.set(date, existing);
  });

  return grouped;
}

/**
 * Export timeline to CSV
 */
export function exportTimelineToCSV(events: TimelineEvent[]): string {
  const headers = [
    'Timestamp',
    'User ID',
    'User Name',
    'Category',
    'Action',
    'Title',
    'Description',
    'Importance'
  ];

  const rows = events.map(e => [
    e.timestamp.toISOString(),
    e.userId,
    e.userName,
    e.category,
    e.action,
    e.title,
    e.description,
    e.importance
  ]);

  return [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');
}

/**
 * Get event by ID
 */
export function getEventById(eventId: string): TimelineEvent | null {
  return events.get(eventId) || null;
}

/**
 * Delete event
 */
export function deleteEvent(eventId: string): boolean {
  return events.delete(eventId);
}

/**
 * Helper: Generate event ID
 */
function generateEventId(): string {
  return `EVT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Helper: Create events from audit logs
 */
export function createEventsFromAuditLogs(auditLogs: any[]): TimelineEvent[] {
  return auditLogs.map(log => {
    const category = mapAuditCategoryToTimeline(log.category);
    const importance = determineImportance(log.action, log.category);

    return createTimelineEvent(
      log.userId,
      log.userName,
      category,
      log.action,
      formatTitle(log.action),
      formatDescription(log),
      importance,
      log.details
    );
  });
}

/**
 * Helper: Map audit category to timeline category
 */
function mapAuditCategoryToTimeline(auditCategory: string): TimelineCategory {
  const mapping: Record<string, TimelineCategory> = {
    authentication: 'authentication',
    user_management: 'account',
    financial: 'financial',
    trading: 'trading',
    security: 'security',
    configuration: 'system',
    compliance: 'security',
    system: 'system'
  };

  return mapping[auditCategory] || 'system';
}

/**
 * Helper: Determine importance based on action
 */
function determineImportance(
  action: string,
  category: string
): 'low' | 'medium' | 'high' | 'critical' {
  // Critical actions
  const criticalActions = [
    'account_deleted',
    'security_breach',
    'margin_call',
    'large_withdrawal',
    'suspicious_activity'
  ];

  // High importance actions
  const highActions = [
    'password_changed',
    'mfa_enabled',
    'mfa_disabled',
    'withdrawal_requested',
    'large_trade'
  ];

  // Low importance actions
  const lowActions = [
    'login',
    'logout',
    'profile_viewed',
    'settings_viewed'
  ];

  if (criticalActions.some(a => action.includes(a))) return 'critical';
  if (highActions.some(a => action.includes(a))) return 'high';
  if (lowActions.some(a => action.includes(a))) return 'low';

  return 'medium';
}

/**
 * Helper: Format action title
 */
function formatTitle(action: string): string {
  return action
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Helper: Format description
 */
function formatDescription(log: any): string {
  const details = log.details || {};
  const parts: string[] = [];

  if (details.amount) {
    parts.push(`Amount: $${details.amount.toLocaleString()}`);
  }
  if (details.symbol) {
    parts.push(`Symbol: ${details.symbol}`);
  }
  if (details.reason) {
    parts.push(`Reason: ${details.reason}`);
  }

  return parts.length > 0 ? parts.join(' | ') : log.action;
}

// Export all functions
export default {
  createTimelineEvent,
  getTimelineEvents,
  getTimelineStats,
  groupEventsByDate,
  exportTimelineToCSV,
  getEventById,
  deleteEvent,
  createEventsFromAuditLogs
};
