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
import { TreatmentPlanRepository } from "@/repositories/treatment-plan.repository";
import { SmsTemplateRepository } from "@/repositories/smsTemplate.repository";
import { ExpenseRepository } from "@/repositories/expense.repository";
import { FinanceRepository } from "@/repositories/finance.repository";
import { DashboardRepository } from "@/repositories/dashboard.repository";
import { LabOrderRepository } from "@/repositories/lab-order.repository";
import { AuditRepository } from "@/repositories/audit.repository";
import { ReportsRepository } from "@/repositories/reports.repository";

import { prisma } from "@/lib/prisma";
import { SettingsService } from "@/services/settings.service";
import { AppointmentService } from "@/services/appointment.service";
import { BillingService } from "@/services/billing.service";
import { TreasuryService } from "@/services/treasury.service";
import { NotificationService } from "@/services/notification.service";
import { InventoryService } from "@/services/inventory.service";
import { JobService } from "@/services/job.service";
import { DerivedEventsService } from "@/services/derived-events.service";
import { EventService } from "@/services/event.service";
import { AnalyticsService } from "@/services/analytics.service";
import { PatientService } from "@/services/patient.service";
import { StaffService } from "@/services/staff.service";
import { TreatmentPlanService } from "@/services/treatment-plan.service";
import { RoomService } from "@/services/room.service";
import { RoomOperationalService } from "@/services/room-operational.service";
import { SmsService } from "@/services/smsService";
import { SmsTemplateService } from "@/services/smsTemplateService";
import { SmsCampaignService } from "@/services/smsCampaignService";
import { ExpenseService } from "@/services/expense.service";
import { FinanceService } from "@/services/finance.service";
import { DashboardService } from "@/services/dashboard.service";
import { LabOrderService } from "@/services/lab-order.service";
import { ServiceService } from "@/services/service.service";
import { AuditService } from "@/services/audit.service";
import { EmailService } from "@/services/email.service";
import { AlertsService } from "@/services/alerts.service";
import { ReportsService } from "@/services/reports.service";

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
export const treatmentPlanRepository = new TreatmentPlanRepository();
export const smsTemplateRepository = new SmsTemplateRepository();
export const expenseRepository = new ExpenseRepository();
export const financeRepository = new FinanceRepository();
export const dashboardRepository = new DashboardRepository();
export const labOrderRepository = new LabOrderRepository();
export const auditRepository = new AuditRepository();
export const reportsRepository = new ReportsRepository();

// Instantiating services with dependencies injected
export const jobService = new JobService(prisma);
export const derivedEventsService = new DerivedEventsService(prisma, jobService);
export const eventService = new EventService(eventRepository, derivedEventsService);
export const analyticsService = new AnalyticsService(prisma);

// Set late binding setter on jobService to resolve circular dependency
jobService.setEventService(eventService);

// Bind static instance targets for backward-compatible delegates
JobService.instance = jobService;
EventService.instance = eventService;
AnalyticsService.instance = analyticsService;

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

export const patientService = new PatientService(patientRepository);
export const staffService = new StaffService(staffRepository);
export const treatmentPlanService = new TreatmentPlanService(treatmentPlanRepository);
export const roomService = new RoomService(prisma);
export const roomOperationalService = new RoomOperationalService(prisma);
export const smsServiceInstance = new SmsService(eventService);
export const smsTemplateService = new SmsTemplateService(smsTemplateRepository);
export const smsCampaignService = new SmsCampaignService(prisma, smsServiceInstance, eventService);
export const expenseService = new ExpenseService(expenseRepository, treasuryService);
export const financeService = new FinanceService(financeRepository, treasuryService);
export const dashboardService = new DashboardService(dashboardRepository);
export const labOrderService = new LabOrderService(labOrderRepository, notificationService);
export const serviceService = new ServiceService(serviceRepository);
export const auditService = new AuditService(auditRepository);
export const emailService = new EmailService();
export const alertsService = new AlertsService(eventRepository);
export const reportsService = new ReportsService(reportsRepository);

PatientService.instance = patientService;
StaffService.instance = staffService;
TreasuryService.instance = treasuryService;
NotificationService.instance = notificationService;
TreatmentPlanService.instance = treatmentPlanService;
RoomService.instance = roomService;
RoomOperationalService.instance = roomOperationalService;
SmsService.instance = smsServiceInstance;
SmsTemplateService.instance = smsTemplateService;
SmsCampaignService.instance = smsCampaignService;
ExpenseService.instance = expenseService;
FinanceService.instance = financeService;
DashboardService.instance = dashboardService;
LabOrderService.instance = labOrderService;
ServiceService.instance = serviceService;
AuditService.instance = auditService;
EmailService.instance = emailService;
AlertsService.instance = alertsService;
ReportsService.instance = reportsService;
