import { SettingsRepository } from "@/repositories/settings.repository";
import { TenantRepository } from "@/repositories/tenant.repository";
import { EventRepository } from "@/repositories/event.repository";
import { AppointmentRepository } from "@/repositories/appointment.repository";
import { PatientRepository } from "@/repositories/patient.repository";
import { StaffRepository } from "@/repositories/staff.repository";
import { ServiceRepository } from "@/repositories/service.repository";
import { BillingRepository } from "@/repositories/billing.repository";
import { TreasuryRepository } from "@/repositories/treasury.repository";
import { NotificationRepository } from "@/repositories/notification.repository";
import { NotificationPreferenceRepository } from "@/repositories/notification-preference.repository";
import { InventoryRepository } from "@/repositories/inventory.repository";

import { SettingsService } from "@/services/settings.service";
import { AppointmentService } from "@/services/appointment.service";
import { BillingService } from "@/services/billing.service";
import { TreasuryService } from "@/services/treasury.service";
import { NotificationService } from "@/services/notification.service";
import { InventoryService } from "@/services/inventory.service";

// Instantiating repositories
export const settingsRepository = new SettingsRepository();
export const tenantRepository = new TenantRepository();
export const eventRepository = new EventRepository();
export const appointmentRepository = new AppointmentRepository();
export const patientRepository = new PatientRepository();
export const staffRepository = new StaffRepository();
export const serviceRepository = new ServiceRepository();
export const billingRepository = new BillingRepository();
export const treasuryRepository = new TreasuryRepository();
export const notificationRepository = new NotificationRepository();
export const notificationPreferenceRepository = new NotificationPreferenceRepository();
export const inventoryRepository = new InventoryRepository();

// Instantiating services with dependencies injected
export const settingsService = new SettingsService(
  settingsRepository,
  tenantRepository,
  eventRepository
);

export const notificationService = new NotificationService(
  notificationRepository,
  notificationPreferenceRepository
);

export const treasuryService = new TreasuryService(
  treasuryRepository
);

export const inventoryService = new InventoryService(
  inventoryRepository,
  notificationService
);

export const appointmentService = new AppointmentService(
  appointmentRepository,
  inventoryService,
  notificationService,
  patientRepository,
  staffRepository,
  serviceRepository
);

export const billingService = new BillingService(
  billingRepository,
  appointmentRepository,
  notificationService,
  treasuryService,
  settingsService
);
