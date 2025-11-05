export interface Notification {
  id: string;
  userId: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'trade' | 'security' | 'system';
  category: 'trading' | 'account' | 'security' | 'system' | 'marketing' | 'compliance';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  channels: ('in-app' | 'email' | 'sms' | 'push')[];
  read: boolean;
  actionUrl?: string;
  actionLabel?: string;
  metadata?: {
    [key: string]: any;
  };
  createdAt: Date;
  expiresAt?: Date;
}

export interface NotificationPreferences {
  userId: string;
  channels: {
    inApp: boolean;
    email: boolean;
    sms: boolean;
    push: boolean;
  };
  categories: {
    trading: boolean;
    account: boolean;
    security: boolean;
    system: boolean;
    marketing: boolean;
    compliance: boolean;
  };
  quietHours: {
    enabled: boolean;
    start: string; // HH:MM format
    end: string; // HH:MM format
  };
  frequency: {
    realTime: boolean;
    digest: 'none' | 'daily' | 'weekly';
  };
}

export class NotificationService {
  private storageKey = 'notifications';
  private preferencesKey = 'notification-preferences';

  // Create notification
  async createNotification(notification: Omit<Notification, 'id' | 'createdAt'>): Promise<Notification> {
    const newNotification: Notification = {
      ...notification,
      id: this.generateId(),
      createdAt: new Date(),
    };

    // Check user preferences
    const preferences = this.getPreferences(notification.userId);
    if (!this.shouldSendNotification(newNotification, preferences)) {
      return newNotification;
    }

    // Save to storage
    this.saveNotification(newNotification);

    // Send through enabled channels
    await this.sendThroughChannels(newNotification, preferences);

    return newNotification;
  }

  // Get notifications for user
  getNotifications(userId: string, filters?: {
    unreadOnly?: boolean;
    category?: Notification['category'];
    type?: Notification['type'];
    limit?: number;
  }): Notification[] {
    const allNotifications = this.getAllNotifications();
    let userNotifications = allNotifications.filter(n => n.userId === userId);

    // Apply filters
    if (filters?.unreadOnly) {
      userNotifications = userNotifications.filter(n => !n.read);
    }
    if (filters?.category) {
      userNotifications = userNotifications.filter(n => n.category === filters.category);
    }
    if (filters?.type) {
      userNotifications = userNotifications.filter(n => n.type === filters.type);
    }

    // Sort by date (newest first)
    userNotifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Apply limit
    if (filters?.limit) {
      userNotifications = userNotifications.slice(0, filters.limit);
    }

    return userNotifications;
  }

  // Mark as read
  markAsRead(notificationId: string): void {
    const notifications = this.getAllNotifications();
    const notification = notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
      this.saveAllNotifications(notifications);
    }
  }

  // Mark all as read
  markAllAsRead(userId: string): void {
    const notifications = this.getAllNotifications();
    notifications.forEach(n => {
      if (n.userId === userId) {
        n.read = true;
      }
    });
    this.saveAllNotifications(notifications);
  }

  // Delete notification
  deleteNotification(notificationId: string): void {
    const notifications = this.getAllNotifications();
    const filtered = notifications.filter(n => n.id !== notificationId);
    this.saveAllNotifications(filtered);
  }

  // Get unread count
  getUnreadCount(userId: string): number {
    return this.getNotifications(userId, { unreadOnly: true }).length;
  }

  // Get/Set preferences
  getPreferences(userId: string): NotificationPreferences {
    if (typeof window === 'undefined') return this.getDefaultPreferences(userId);
    
    const stored = localStorage.getItem(`${this.preferencesKey}-${userId}`);
    if (!stored) return this.getDefaultPreferences(userId);

    try {
      return JSON.parse(stored);
    } catch {
      return this.getDefaultPreferences(userId);
    }
  }

  savePreferences(preferences: NotificationPreferences): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(
      `${this.preferencesKey}-${preferences.userId}`,
      JSON.stringify(preferences)
    );
  }

  // Helper methods
  private generateId(): string {
    return `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private getAllNotifications(): Notification[] {
    if (typeof window === 'undefined') return [];
    
    const stored = localStorage.getItem(this.storageKey);
    if (!stored) return [];

    try {
      const parsed = JSON.parse(stored);
      // Convert date strings back to Date objects
      return parsed.map((n: any) => ({
        ...n,
        createdAt: new Date(n.createdAt),
        expiresAt: n.expiresAt ? new Date(n.expiresAt) : undefined,
      }));
    } catch {
      return [];
    }
  }

  private saveNotification(notification: Notification): void {
    const notifications = this.getAllNotifications();
    notifications.push(notification);
    this.saveAllNotifications(notifications);
  }

  private saveAllNotifications(notifications: Notification[]): void {
    if (typeof window === 'undefined') return;
    
    // Remove expired notifications
    const now = new Date();
    const active = notifications.filter(n => !n.expiresAt || n.expiresAt > now);
    
    // Keep only last 1000 notifications
    const limited = active.slice(-1000);
    
    localStorage.setItem(this.storageKey, JSON.stringify(limited));
  }

  private getDefaultPreferences(userId: string): NotificationPreferences {
    return {
      userId,
      channels: {
        inApp: true,
        email: true,
        sms: false,
        push: true,
      },
      categories: {
        trading: true,
        account: true,
        security: true,
        system: true,
        marketing: false,
        compliance: true,
      },
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '08:00',
      },
      frequency: {
        realTime: true,
        digest: 'none',
      },
    };
  }

  private shouldSendNotification(
    notification: Notification,
    preferences: NotificationPreferences
  ): boolean {
    // Check if category is enabled
    if (!preferences.categories[notification.category]) {
      return false;
    }

    // Check quiet hours
    if (preferences.quietHours.enabled && notification.priority !== 'critical') {
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      
      if (this.isInQuietHours(currentTime, preferences.quietHours.start, preferences.quietHours.end)) {
        return false;
      }
    }

    return true;
  }

  private isInQuietHours(current: string, start: string, end: string): boolean {
    const [currentH, currentM] = current.split(':').map(Number);
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);

    const currentMinutes = currentH * 60 + currentM;
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    if (startMinutes <= endMinutes) {
      return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    } else {
      // Quiet hours span midnight
      return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
    }
  }

  private async sendThroughChannels(
    notification: Notification,
    preferences: NotificationPreferences
  ): Promise<void> {
    const promises: Promise<void>[] = [];

    // In-app (always sent if enabled)
    if (preferences.channels.inApp && notification.channels.includes('in-app')) {
      promises.push(this.sendInApp(notification));
    }

    // Email
    if (preferences.channels.email && notification.channels.includes('email')) {
      promises.push(this.sendEmail(notification));
    }

    // SMS
    if (preferences.channels.sms && notification.channels.includes('sms')) {
      promises.push(this.sendSMS(notification));
    }

    // Push
    if (preferences.channels.push && notification.channels.includes('push')) {
      promises.push(this.sendPush(notification));
    }

    await Promise.all(promises);
  }

  private async sendInApp(notification: Notification): Promise<void> {
    // In-app notifications are handled by the UI component
    console.log('In-app notification sent:', notification.title);
  }

  private async sendEmail(notification: Notification): Promise<void> {
    // TODO: Integrate with email service (SendGrid, AWS SES, etc.)
    console.log('Email notification sent:', notification.title);
  }

  private async sendSMS(notification: Notification): Promise<void> {
    // TODO: Integrate with SMS service (Twilio, AWS SNS, etc.)
    console.log('SMS notification sent:', notification.title);
  }

  private async sendPush(notification: Notification): Promise<void> {
    // TODO: Integrate with push notification service (Firebase, OneSignal, etc.)
    console.log('Push notification sent:', notification.title);
  }
}

export const notificationService = new NotificationService();
