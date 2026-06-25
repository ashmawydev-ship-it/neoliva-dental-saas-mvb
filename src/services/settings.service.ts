import { SettingsRepository } from '@/repositories/settings.repository';
import { TenantRepository } from '@/repositories/tenant.repository';
import { EventRepository } from '@/repositories/event.repository';
import { logger } from '@/lib/logger';
import { Prisma } from '@/generated/client';

export type NotificationsConfig = {
  emailReminders: boolean;
  smsReminders: boolean;
  invoiceReceipts: boolean;
  lowInventoryAlerts: boolean;
};

export const DEFAULT_NOTIFICATIONS: NotificationsConfig = {
  emailReminders: true,
  smsReminders: true,
  invoiceReceipts: true,
  lowInventoryAlerts: false,
};

export type UpdateClinicSettingsInput = {
  clinicName?: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  workingHours?: any;
  currency?: string;
  taxRate?: number;
  invoiceNote?: string | null;
  notificationsConfig?: NotificationsConfig;
  locale?: string;
};

export class SettingsService {
  constructor(
    private readonly settingsRepository = new SettingsRepository(),
    private readonly tenantRepository = new TenantRepository(),
    private readonly eventRepository = new EventRepository()
  ) {}

  async getClinicSettings(tenantId: string) {
    let settings = await this.settingsRepository.findUnique(tenantId);

    if (!settings) {
      const tenant = await this.tenantRepository.findUnique(tenantId);
      if (!tenant) throw new Error("Tenant not found");

      settings = await this.settingsRepository.create(
        tenantId,
        tenant.name,
        DEFAULT_NOTIFICATIONS
      );
      
      logger.info('[SettingsService] Auto-created default settings', { tenantId });
    }

    return settings;
  }

  async updateClinicSettings(tenantId: string, data: UpdateClinicSettingsInput, userId: string) {
    const previous = await this.getClinicSettings(tenantId);
    
    const updated = await this.settingsRepository.update(tenantId, {
      clinicName: data.clinicName !== undefined ? data.clinicName : undefined,
      email: data.email !== undefined ? data.email : undefined,
      phone: data.phone !== undefined ? data.phone : undefined,
      address: data.address !== undefined ? data.address : undefined,
      workingHours: data.workingHours !== undefined ? (data.workingHours as Prisma.InputJsonValue) : undefined,
      currency: data.currency !== undefined ? data.currency : undefined,
      taxRate: data.taxRate !== undefined ? data.taxRate : undefined,
      invoiceNote: data.invoiceNote !== undefined ? data.invoiceNote : undefined,
      notificationsConfig: data.notificationsConfig !== undefined ? (data.notificationsConfig as unknown as Prisma.InputJsonValue) : undefined,
      locale: data.locale !== undefined ? data.locale : undefined,
    });

    logger.info('[SettingsService] Clinic settings updated', {
      tenantId,
      userId,
      updatedFields: Object.keys(data),
    });

    await this.eventRepository.create(tenantId, {
      userId,
      eventType: 'SETTINGS_UPDATED',
      entityType: 'SETTINGS',
      entityId: updated.id,
      metadata: {
        userId,
        changedFields: Object.keys(data),
        previous: {
          currency: previous.currency,
          taxRate: previous.taxRate,
          notificationsConfig: previous.notificationsConfig,
        }
      }
    });

    return updated;
  }
}
