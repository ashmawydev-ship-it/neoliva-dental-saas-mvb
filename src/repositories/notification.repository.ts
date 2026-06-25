import { prisma } from "@/lib/prisma";
import { Notification, Prisma, NotificationType, NotificationPriority } from "@/generated/client";

export class NotificationRepository {
  /**
   * Create a new notification
   * Strictly enforces tenantId
   */
  async create(tenantId: string, data: Omit<Prisma.NotificationUncheckedCreateInput, 'tenantId'>): Promise<Notification> {
    return prisma.notification.create({
      data: {
        ...data,
        tenantId,
      },
    });
  }

  /**
   * Find a recent notification by deduplication key
   * Used to prevent spam within a time window
   */
  async findRecentByDeduplicationKey(tenantId: string, key: string, windowInMinutes: number = 10): Promise<Notification | null> {
    const threshold = new Date(Date.now() - windowInMinutes * 60 * 1000);
    return prisma.notification.findFirst({
      where: {
        tenantId,
        deduplicationKey: key,
        createdAt: { gte: threshold },
        archivedAt: null
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Find notifications for a specific user with filtering and pagination
   */
  async findMany(tenantId: string, userId: string, filters: {
    type?: NotificationType;
    priority?: NotificationPriority;
    isRead?: boolean;
    isArchived?: boolean;
    skip?: number;
    take?: number;
  }): Promise<Notification[]> {
    return prisma.notification.findMany({
      where: {
        tenantId,
        userId,
        archivedAt: filters.isArchived ? { not: null } : null,
        ...(filters.type && { type: filters.type }),
        ...(filters.priority && { priority: filters.priority }),
        ...(filters.isRead !== undefined && { isRead: filters.isRead }),
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip: filters.skip,
      take: filters.take,
    });
  }

  /**
   * Count unread notifications for badge updates
   */
  async countUnread(tenantId: string, userId: string): Promise<number> {
    return prisma.notification.count({
      where: {
        tenantId,
        userId,
        isRead: false,
        archivedAt: null
      },
    });
  }

  /**
   * Mark a single notification as read
   */
  async markAsRead(tenantId: string, id: string): Promise<Notification> {
    return prisma.notification.update({
      where: {
        id,
        tenantId,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  /**
   * Archive a single notification
   */
  async archive(tenantId: string, id: string): Promise<Notification> {
    return prisma.notification.update({
      where: {
        id,
        tenantId,
      },
      data: {
        archivedAt: new Date(),
      },
    });
  }

  /**
   * Mark all unread notifications for a user as read
   */
  async markAllAsRead(tenantId: string, userId: string): Promise<Prisma.BatchPayload> {
    return prisma.notification.updateMany({
      where: {
        tenantId,
        userId,
        isRead: false,
        archivedAt: null
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  /**
   * Archive notifications older than X days
   */
  async archiveOldNotifications(tenantId: string, days: number = 30): Promise<Prisma.BatchPayload> {
    const threshold = new Date();
    threshold.setDate(threshold.getDate() - days);

    return prisma.notification.updateMany({
      where: {
        tenantId,
        createdAt: { lt: threshold },
        archivedAt: null
      },
      data: {
        archivedAt: new Date()
      }
    });
  }

  /**
   * Delete a notification
   */
  async delete(tenantId: string, id: string): Promise<Notification> {
    return prisma.notification.delete({
      where: {
        id,
        tenantId,
      },
    });
  }
}
