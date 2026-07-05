import "server-only";
import { Prisma } from "@prisma/client";
import { BillingRepository } from "@/repositories/billing.repository";
import { AppointmentRepository } from "@/repositories/appointment.repository";
import { PaymentMethod } from "@/generated/client";
import { NotificationService } from "./notification.service";
import { TreasuryService } from "./treasury.service";
import { SettingsService } from "./settings.service";
import { prisma } from "@/lib/prisma";
import type { DoctorCommissionService } from "./doctor-commission.service";

export class BillingService {
  constructor(
    private readonly billingRepository = new BillingRepository(),
    private readonly appointmentRepository = new AppointmentRepository(),
    private readonly notificationService = new NotificationService(),
    private readonly treasuryService = new TreasuryService(),
    private readonly settingsService = new SettingsService()
  ) {}

  // Late-binding setter to avoid circular dependency (same pattern as JobService)
  private doctorCommissionService?: DoctorCommissionService;
  setDoctorCommissionService(service: DoctorCommissionService) {
    this.doctorCommissionService = service;
  }

  private normalizeString(val: string | null | undefined, fallback: string = "-"): string {
    if (!val || typeof val !== 'string') return fallback;
    const trimmed = val.trim();
    return trimmed.length > 0 ? trimmed : fallback;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private getSafeInvoiceFallback(id?: string, settings?: any) {
    const fallback = {
      id: id || "unknown",
      displayId: "INV-0000",
      patientName: "Unknown Patient",
      totalAmount: 0,
      paidAmount: 0,
      status: "DRAFT",
      createdAt: new Date(),
      dueDate: new Date(),
      items: [],
      payments: [],
      settings: settings || {
        currency: "USD",
        taxRate: 0,
        clinicName: "Neoliva Dental",
        address: "123 Clinic Street, Cairo, Egypt",
        email: "contact@neoliva.com"
      }
    };
    return fallback;
  }

  private validateTenant(tenantId: string) {
    if (!tenantId) {
      throw new Error("[BillingService] Missing tenantId");
    }
  }

  /**
   * Generates an invoice from an appointment's data
   */
  async generateInvoiceFromAppointment(tenantId: string, appointmentId: string) {
    try {
      this.validateTenant(tenantId);
      const settings = await this.settingsService.getClinicSettings(tenantId);
      if (!appointmentId) return this.getSafeInvoiceFallback(undefined, settings);

      // Check if invoice already exists for this appointment
      const existing = await this.billingRepository.findByAppointmentId(tenantId, appointmentId);
      if (existing) {
        return this.serializeInvoice(existing, settings);
      }

      // Get appointment details
      const apt = await this.appointmentRepository.findUnique(tenantId, appointmentId);
      if (!apt) {
        console.warn(`[BillingService] Appointment ${appointmentId} not found for invoice generation`);
        return this.getSafeInvoiceFallback(undefined, settings);
      }

      // Prepare items
      const items: {
        description: string;
        quantity: number;
        price: number;
        serviceId?: string;
      }[] = [];
      if (apt.service) {
        items.push({
          description: apt.service.name,
          quantity: 1,
          price: (+(apt.service.price)),
          serviceId: apt.serviceId || undefined
        });
      } else if (apt.treatment) {
        items.push({
          description: apt.treatment,
          quantity: 1,
          price: 0 
        });
      } else {
        items.push({
          description: "Dental Treatment",
          quantity: 1,
          price: 0
        });
      }

      // Create the invoice
      return await this.createInvoice(tenantId, {
        patientId: apt.patientId,
        appointmentId: apt.id,
        items
      });
    } catch (error) {
      console.error("[BillingService] Failed to generate invoice from appointment:", error);
      return this.getSafeInvoiceFallback();
    }
  }

  /**
   * Generates an invoice from a treatment plan's data
   */
  async generateInvoiceFromPlan(tenantId: string, planId: string) {
    try {
      this.validateTenant(tenantId);
      const settings = await this.settingsService.getClinicSettings(tenantId);
      if (!planId) return this.getSafeInvoiceFallback(undefined, settings);

      // Check if invoice already exists for this plan
      const existing = await prisma.invoice.findFirst({
        where: { tenantId, planId }
      });
      if (existing) {
        return this.serializeInvoice(existing, settings);
      }

      // Get plan details
      const plan = await prisma.treatmentPlan.findUnique({
        where: { id: planId, tenantId },
        include: { items: { include: { service: true } } }
      });
      
      if (!plan) {
        console.warn(`[BillingService] Plan ${planId} not found for invoice generation`);
        return this.getSafeInvoiceFallback(undefined, settings);
      }

      // Prepare items
      const items = plan.items.map(item => ({
        description: item.serviceName,
        quantity: 1,
        price: (+(item.price)),
        serviceId: item.serviceId || undefined
      }));

      // Create the invoice
      return await this.createInvoice(tenantId, {
        patientId: plan.patientId,
        planId: plan.id,
        items
      });
    } catch (error) {
      console.error("[BillingService] Failed to generate invoice from plan:", error);
      return this.getSafeInvoiceFallback();
    }
  }

  /**
   * Get formatted invoices for the list view
   */
  async getInvoicesList(tenantId: string) {
    try {
      this.validateTenant(tenantId);
      const invoices = await this.billingRepository.findMany(tenantId);
      const rawSettings = await this.settingsService.getClinicSettings(tenantId);
      const settings = rawSettings ? { ...rawSettings, taxRate: (+(rawSettings.taxRate || 0)) } : null;
      const now = new Date();

      return (invoices || []).map(inv => {
        try {
          // Logic to determine if PENDING is actually OVERDUE
          let currentStatus = inv.status || 'PENDING';
          if (currentStatus === 'PENDING' && inv.dueDate && new Date(inv.dueDate) < now) {
            currentStatus = 'OVERDUE';
          }

          return {
            id: inv.id,
            patientName: this.normalizeString(inv.patient?.name, "Unknown Patient"),
            totalAmount: (+(inv.totalAmount || 0)),
            paidAmount: (+(inv.paidAmount || 0)),
            status: currentStatus,
            createdAt: inv.createdAt || new Date(),
            dueDate: inv.dueDate || null,
            displayId: inv.displayId || `INV-${inv.id.slice(0, 8).toUpperCase()}`,
            settings
          };
        } catch (innerError) {
          console.error("Error mapping individual invoice:", innerError);
          return this.getSafeInvoiceFallback(inv.id, settings);
        }
      });
    } catch (error) {
      console.error("[BillingService] Failed to get invoices list:", error);
      return [];
    }
  }

  /**
   * Get overall billing stats
   */
  async getBillingStats(tenantId: string) {
    try {
      this.validateTenant(tenantId);
      const stats = await this.billingRepository.getFinancialStats(tenantId);
      return stats || { 
        totalRevenue: new Prisma.Decimal(0), 
        pendingAmount: new Prisma.Decimal(0), 
        overdueAmount: new Prisma.Decimal(0), 
        overdueCount: 0 
      };
    } catch (error) {
      console.error("[BillingService.getStats] Error:", error);
      return { 
        totalRevenue: new Prisma.Decimal(0), 
        pendingAmount: new Prisma.Decimal(0), 
        overdueAmount: new Prisma.Decimal(0), 
        overdueCount: 0 
      };
    }
  }

  /**
   * Get specific invoice details
   */
  async getInvoiceDetails(tenantId: string, id: string) {
    try {
      this.validateTenant(tenantId);
      const settings = await this.settingsService.getClinicSettings(tenantId);
      if (!id) return this.getSafeInvoiceFallback(undefined, settings);
      const invoice = await this.billingRepository.findUnique(tenantId, id);
      if (!invoice) return this.getSafeInvoiceFallback(id, settings);
      return this.serializeInvoice(invoice, settings);
    } catch (error) {
      console.error(`[BillingService] Failed to fetch invoice ${id}:`, error);
      return this.getSafeInvoiceFallback(id);
    }
  }

  /**
   * Create new invoice with items
   */
  async createInvoice(tenantId: string, data: {
    patientId: string;
    appointmentId?: string;
    planId?: string;
    dueDate?: Date;
    items: {
      description: string;
      quantity: number;
      price: number;
      serviceId?: string;
    }[];
  }) {
    try {
      this.validateTenant(tenantId);
      const settings = await this.settingsService.getClinicSettings(tenantId);
      
      // Generate a simple display ID
      const displayId = `INV-${Math.floor(1000 + Math.random() * 9000)}`;

      // Calculate total with tax
      const subtotal = data.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const taxRate = (+(settings.taxRate || 0));
      const totalAmount = subtotal + (subtotal * (taxRate / 100));

      const { result, serialized } = await prisma.$transaction(async (tx) => {
        const createResult = await this.billingRepository.create(tenantId, {
          patientId: data.patientId,
          appointmentId: data.appointmentId,
          planId: data.planId,
          displayId,
          dueDate: data.dueDate,
          totalAmount,
          items: {
            create: data.items.map(item => {
              const unitPrice = item.price;
              const quantity = item.quantity || 1;
              return {
                description: item.description,
                quantity,
                unitPrice,
                total: unitPrice * quantity,
                serviceId: item.serviceId || null,
                tenantId
              };
            })
          }
        }, tx);

        const ser = this.serializeInvoice(createResult, settings);

        // Record in Treasury (Double-Entry) - MUST succeed inside transaction!
        await this.treasuryService.recordInvoiceCreation(tenantId, {
          id: createResult.id,
          displayId: ser.displayId,
          totalAmount: ser.totalAmount,
          patientName: ser.patientName,
        }, tx);

        return { result: createResult, serialized: ser };
      });

      // Trigger Notification
      await this.notificationService.notifyEvent(tenantId, 'INVOICE_UNPAID', {
          invoiceId: serialized.displayId,
          patientName: serialized.patientName,
          metadata: { invoiceId: result.id }
      }).catch(err => console.error("[BillingService] Notification event failed:", err));

      return serialized;
    } catch (error) {
      console.error("[BillingService] Failed to create invoice:", error);
      throw error;
    }
  }

  /**
   * Records a payment
   */
  async recordPayment(tenantId: string, invoiceId: string, data: {
    amount: number;
    method: PaymentMethod;
    notes?: string;
    paidAt?: Date;
  }) {
    try {
      this.validateTenant(tenantId);

      const result = await prisma.$transaction(async (tx) => {
        const paymentResult = await this.billingRepository.recordPayment(tenantId, invoiceId, data, tx);
        
        // Record in Treasury (Double-Entry) - MUST succeed inside transaction!
        await this.treasuryService.recordPayment(tenantId, {
          amount: data.amount,
          method: data.method,
          invoiceId: invoiceId,
        }, tx);

        return paymentResult;
      });

      // Calculate doctor commission (fire-and-forget, should not block payment)
      if (this.doctorCommissionService) {
        await this.doctorCommissionService
          .calculateOnPayment(tenantId, invoiceId, data.amount)
          .catch((err) => console.error("[BillingService] Commission calculation failed:", err));
      }

      return result;
    } catch (error) {
      console.error(`[BillingService] Failed to record payment for invoice ${invoiceId}:`, error);
      throw error;
    }
  }

  /**
   * Deletes an invoice
   */
  async deleteInvoice(tenantId: string, invoiceId: string) {
    try {
      this.validateTenant(tenantId);
      return await this.billingRepository.delete(tenantId, invoiceId);
    } catch (error) {
      console.error(`[BillingService] Failed to delete invoice ${invoiceId}:`, error);
      throw error;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private serializeInvoice(inv: any, settings: any) {
    if (!inv) return this.getSafeInvoiceFallback(undefined, settings);
    
    try {
      const result = {
        ...inv,
        patientName: this.normalizeString(inv.patient?.name, "Unknown Patient"),
        totalAmount: inv.totalAmount ? (+(inv.totalAmount)) : 0,
        paidAmount: inv.paidAmount ? (+(inv.paidAmount)) : 0,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        items: (inv.items || []).map((item: any) => ({
          ...item,
          price: (+(item.unitPrice || item.price || 0))
        })),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        payments: (inv.payments || []).map((p: any) => ({
          ...p,
          amount: (+(p.amount || 0))
        })),
        settings
      };

      return result;
    } catch (error) {
      console.error("[BillingService] Serialization failed:", error);
      return this.getSafeInvoiceFallback(inv.id, settings);
    }
  }
}
