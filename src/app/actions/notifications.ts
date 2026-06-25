"use server";

import { resolveTenantContext as getTenantContext } from "@/lib/auth/resolve-tenant-context";
import { NotificationService } from "@/services/notification.service";
import { revalidatePath } from "next/cache";
import { NotificationType, NotificationPriority, NotificationChannelType } from "@/generated/client";
import { EventService } from "@/services/event.service";

const notificationService = new NotificationService();

/**
 * Fetch notifications for the current authenticated user
 */
export async function getNotifications(params: {
  type?: NotificationType;
  priority?: NotificationPriority;
  isRead?: boolean;
  isArchived?: boolean;
  skip?: number;
  take?: number;
} = {}) {
  try {
    const context = await getTenantContext();
    if (!context) return { success: false, error: "Unauthorized" };

    const notifications = await notificationService.getNotifications(
      context.tenantId,
      context.user.id,
      params
    );

    return { success: true, data: notifications };
  } catch (error) {
    console.error("[Actions] getNotifications failed:", error);
    return { success: false, error: "Internal Server Error" };
  }
}

/**
 * Get count of unread notifications for badge indicators
 */
export async function getUnreadCount() {
  try {
    const context = await getTenantContext();
    if (!context) return 0;

    return await notificationService.getUnreadCount(context.tenantId, context.user.id);
  } catch (error) {
    console.error("[Actions] getUnreadCount failed:", error);
    return 0;
  }
}

/**
 * Mark a specific notification as read
 */
export async function markAsRead(id: string) {
  try {
    const context = await getTenantContext();
    if (!context) return { success: false, error: "Unauthorized" };

    const result = await notificationService.markAsRead(context.tenantId, id);
    
    await EventService.trackEvent({
      tenantId: context.tenantId,
      eventType: 'NOTIFICATION_READ',
      entityType: 'NOTIFICATION',
      entityId: id,
      metadata: { notificationId: id }
    });

    // We revalidate the entire dashboard layout to sync bell count
    revalidatePath("/dashboard", "layout");
    
    return { success: !!result };
  } catch (error) {
    console.error("[Actions] markAsRead failed:", error);
    return { success: false, error: "Internal Server Error" };
  }
}

/**
 * Bulk mark all as read for the current user
 */
export async function markAllAsRead() {
  try {
    const context = await getTenantContext();
    if (!context) return { success: false, error: "Unauthorized" };

    await notificationService.markAllAsRead(context.tenantId, context.user.id);
    
    await EventService.trackEvent({
      tenantId: context.tenantId,
      eventType: 'NOTIFICATION_READ',
      entityType: 'NOTIFICATION',
      entityId: context.user.id,
      metadata: { action: 'ALL_READ' }
    });

    revalidatePath("/dashboard", "layout");
    
    return { success: true };
  } catch (error) {
    console.error("[Actions] markAllAsRead failed:", error);
    return { success: false, error: "Internal Server Error" };
  }
}

/**
 * Update user notification preferences
 */
export async function updateNotificationPreference(
  type: NotificationType, 
  channel: NotificationChannelType, 
  enabled: boolean
) {
  try {
    const context = await getTenantContext();
    if (!context) return { success: false, error: "Unauthorized" };

    await notificationService.updatePreference(
      context.tenantId, 
      context.user.id, 
      type, 
      channel, 
      enabled
    );

    await EventService.trackEvent({
      tenantId: context.tenantId,
      eventType: 'NOTIFICATION_PREFERENCE_UPDATED',
      entityType: 'NOTIFICATION',
      entityId: context.user.id,
      metadata: { type, channel, enabled }
    });
    
    return { success: true };
  } catch (error) {
    console.error("[Actions] updatePreference failed:", error);
    return { success: false, error: "Internal Server Error" };
  }
}

/**
 * Fetch all preferences for the current user
 */
export async function getNotificationPreferences() {
  try {
    const context = await getTenantContext();
    if (!context) return [];

    return await notificationService.getPreferences(context.tenantId, context.user.id);
  } catch (error) {
    console.error("[Actions] getPreferences failed:", error);
    return [];
  }
}

/**
 * Manual archival trigger (Can be called by Admin or Cron)
 */
export async function archiveNotifications() {
  try {
    const context = await getTenantContext();
    if (!context) return { success: false, error: "Unauthorized" };

    await notificationService.archiveOldNotifications(context.tenantId);
    
    await EventService.trackEvent({
      tenantId: context.tenantId,
      eventType: 'NOTIFICATIONS_ARCHIVED',
      entityType: 'NOTIFICATION',
      metadata: { action: 'CLEANUP' }
    });

    revalidatePath("/notifications");
    
    return { success: true };
  } catch (error) {
    console.error("[Actions] archiveNotifications failed:", error);
    return { success: false, error: "Internal Server Error" };
  }
}

/**
 * Archive a specific notification
 */
export async function archiveNotification(id: string) {
  try {
    const context = await getTenantContext();
    if (!context) return { success: false, error: "Unauthorized" };

    const result = await notificationService.archive(context.tenantId, id);

    revalidatePath("/notifications");
    
    return { success: !!result };
  } catch (error) {
    console.error("[Actions] archiveNotification failed:", error);
    return { success: false, error: "Internal Server Error" };
  }
}

/**
 * Delete a specific notification
 */
export async function deleteNotification(id: string) {
  try {
    const context = await getTenantContext();
    if (!context) return { success: false, error: "Unauthorized" };

    const result = await notificationService.delete(context.tenantId, id);

    revalidatePath("/notifications");
    
    return { success: !!result };
  } catch (error) {
    console.error("[Actions] deleteNotification failed:", error);
    return { success: false, error: "Internal Server Error" };
  }
}
