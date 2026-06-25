import { prisma } from "@/lib/prisma";
import { NotificationRepository } from "@/repositories/notification.repository";
import { NotificationPreferenceRepository } from "@/repositories/notification-preference.repository";
import { 
  Notification, 
  NotificationType, 
  NotificationPriority, 
  NotificationChannelType 
} from "@/generated/client";

export interface NotificationPayload {
  userId: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  actionUrl?: string;
  deduplicationKey?: string;
  entityId?: string;
  metadata?: any;
}

export interface NotificationChannel {
  name: string;
  type: NotificationChannelType;
  send(tenantId: string, notification: Notification): Promise<void>;
}

// In-memory rate limiting (Replace with Redis for high-scale/multi-node)
const rateLimitMap = new Map<string, number[]>();

export class NotificationService {
  static instance?: NotificationService;
  private channels: NotificationChannel[] = [];

  constructor(
    private readonly repository = new NotificationRepository(),
    private readonly preferenceRepository = new NotificationPreferenceRepository()
  ) {
    // Registered channels (Future: Email, WhatsApp)
  }

  /**
   * Enterprise-grade notification creation with hardening layers
   */
  async createNotification(tenantId: string, payload: NotificationPayload) {
    try {
      if (!payload.userId) throw new Error("userId is required");

      // 1. Rate Limiting (Anti-Spam)
      if (!(await this.checkRateLimit(payload.userId, tenantId))) {
        console.warn(`[NotificationService] Rate limit exceeded for user: ${payload.userId}`);
        return null;
      }

      // 2. Preferences Check (Internal Channel)
      const isEnabled = await this.shouldSend(
        tenantId, 
        payload.userId, 
        payload.type, 
        NotificationChannelType.IN_APP
      );
      if (!isEnabled) return null;

      // 3. Deduplication Check
      if (payload.deduplicationKey) {
        const existing = await this.repository.findRecentByDeduplicationKey(
          tenantId, 
          payload.deduplicationKey
        );
        if (existing) {
          console.info(`[NotificationService] Deduplicated: ${payload.deduplicationKey}`);
          return existing;
        }
      }

      // 4. Persistence
      const notification = await this.repository.create(tenantId, {
        ...payload,
        isRead: false,
      });

      // 5. External Channels with individual preference checks
      await this.distributeToChannels(tenantId, notification);

      return notification;
    } catch (error) {
      console.error("[NotificationService.createNotification] Critical Error:", error);
      return null;
    }
  }

  /**
   * Helper to check if a specific channel is enabled for a notification type
   */
  private async shouldSend(
    tenantId: string, 
    userId: string, 
    type: NotificationType, 
    channel: NotificationChannelType
  ): Promise<boolean> {
    const pref = await this.preferenceRepository.findUnique(tenantId, userId, type, channel);
    return pref ? pref.enabled : true; // Default to ENABLED
  }

  /**
   * Distribute to external channels (Email, SMS, etc.)
   */
  private async distributeToChannels(tenantId: string, notification: Notification) {
    if (this.channels.length === 0) return;

    await Promise.allSettled(
      this.channels.map(async (channel) => {
        const isEnabled = await this.shouldSend(
          tenantId, 
          notification.userId!, 
          notification.type, 
          channel.type
        );
        if (isEnabled) {
          return channel.send(tenantId, notification);
        }
      })
    );
  }

  /**
   * Simple in-memory rate limiting logic
   */
  private async checkRateLimit(userId: string, tenantId: string): Promise<boolean> {
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute window

    const check = (key: string, limit: number) => {
      const timestamps = (rateLimitMap.get(key) || []).filter(t => now - t < windowMs);
      if (timestamps.length >= limit) return false;
      timestamps.push(now);
      rateLimitMap.set(key, timestamps);
      return true;
    };

    const userOk = check(`u:${userId}`, 15); // Max 15/min per user
    const tenantOk = check(`t:${tenantId}`, 100); // Max 100/min per tenant

    return userOk && tenantOk;
  }

  /**
   * ARCHIVAL: Mark old notifications as archived
   */
  async archiveOldNotifications(tenantId: string, days: number = 30) {
    return this.repository.archiveOldNotifications(tenantId, days);
  }

  /**
   * PREFERENCES: Update user settings
   */
  async updatePreference(tenantId: string, userId: string, type: NotificationType, channel: NotificationChannelType, enabled: boolean) {
    return this.preferenceRepository.upsert(tenantId, userId, type, channel, enabled);
  }

  async getPreferences(tenantId: string, userId: string) {
    return this.preferenceRepository.findMany(tenantId, userId);
  }

  // --- Wrapper Methods ---

  async getNotifications(tenantId: string, userId: string, filters: any) {
    return this.repository.findMany(tenantId, userId, filters);
  }

  async getUnreadCount(tenantId: string, userId: string) {
    return this.repository.countUnread(tenantId, userId);
  }

  async markAsRead(tenantId: string, id: string) {
    return this.repository.markAsRead(tenantId, id);
  }

  async archive(tenantId: string, id: string) {
    return this.repository.archive(tenantId, id);
  }

  async delete(tenantId: string, id: string) {
    return this.repository.delete(tenantId, id);
  }

  async markAllAsRead(tenantId: string, userId: string) {
    return this.repository.markAllAsRead(tenantId, userId);
  }

  /**
   * High-level event dispatcher — now calls createNotification directly
   * (was previously async via BullMQ; behaviour is identical)
   */
  async notifyEvent(tenantId: string, eventType: string, data: any) {
    const eventMap: Record<string, Partial<NotificationPayload>> = {
      LOW_STOCK_ALERT: {
        type: NotificationType.INVENTORY,
        priority: NotificationPriority.HIGH,
        title: "Low Stock Alert",
        message: `Item "${data.itemName}" is below minimum level (${data.currentStock} ${data.unit} left).`,
        actionUrl: `/dashboard/inventory?search=${encodeURIComponent(data.itemName)}`,
        deduplicationKey: `LOW_STOCK:${data.itemId}`,
      },
      APPOINTMENT_REMINDER: {
        type: NotificationType.APPOINTMENT,
        priority: NotificationPriority.MEDIUM,
        title: "Upcoming Appointment",
        message: `Appointment with ${data.patientName} at ${data.time}.`,
        actionUrl: `/dashboard/appointments`,
        deduplicationKey: `APP_REMIND:${data.appointmentId}`,
      },
      INVOICE_UNPAID: {
        type: NotificationType.BILLING,
        priority: NotificationPriority.HIGH,
        title: "Unpaid Invoice",
        message: `Invoice ${data.invoiceId} for ${data.patientName} is overdue.`,
        actionUrl: `/dashboard/billing`,
        deduplicationKey: `INV_UNPAID:${data.invoiceId}`,
      },
      LAB_READY: {
        type: NotificationType.LAB,
        priority: NotificationPriority.HIGH,
        title: "Lab Order Ready",
        message: `Lab order for ${data.patientName} (${data.itemType}) is ready.`,
        actionUrl: `/dashboard/lab-orders`,
        deduplicationKey: `LAB_READY:${data.orderId}`,
      },
    };

    const config = eventMap[eventType];
    if (!config) return;

    let userId = data.userId;
    if (!userId) {
      const admins = await prisma.tenantMembership.findMany({
        where: { 
          tenantId, 
          role: { in: ['OWNER', 'ADMIN'] },
          isActive: true,
          status: 'ACTIVE'
        },
        select: { userId: true },
        take: 1
      });
      userId = admins[0]?.userId;
    }

    if (!userId) return;

    // Direct call — no queue needed
    return this.createNotification(tenantId, {
      userId,
      type:             config.type             ?? NotificationType.SYSTEM,
      priority:         config.priority         ?? NotificationPriority.LOW,
      title:            config.title            ?? "System Alert",
      message:          config.message          ?? "",
      actionUrl:        config.actionUrl,
      deduplicationKey: config.deduplicationKey,
      entityId: data.itemId ?? data.appointmentId ?? data.invoiceId ?? data.orderId,
      metadata: data.metadata,
    });
  }
}
