'use server'

import { withPermission } from "@/lib/rbac/guard";




import { revalidatePath } from "next/cache";
import { billingService, billingRepository } from "@/config/di";


import { PaymentMethod } from "@/generated/client";
import { requireRecordAccess, canAccessPatient } from "@/lib/abac";
import { EventService } from "@/services/event.service";

import { wrapAction } from "@/lib/observability/wrap-action";
import { InvoiceSchema, PaymentSchema, formatZodError } from "@/lib/validations/schemas";


/**
 * Server Action: Generates an invoice from an appointment.
 */
export const generateInvoiceFromAppointment = wrapAction(
  'INVOICE_GENERATE',
  async (appointmentId: string) => {
    return withPermission('billing', 'create', async (session) => {
      const tenantId = session.tenantId;
      await requireRecordAccess('appointment', appointmentId);
          const result = await billingService.generateInvoiceFromAppointment(tenantId, appointmentId);
          
          await EventService.trackEvent({
            tenantId,
            eventType: 'INVOICE_CREATED',
            entityType: 'INVOICE',
            entityId: result.id,
            metadata: { appointmentId, patientId: result.patientId, amount: result.totalAmount }
          });
      
          if (result && result.patientId) {
            revalidatePath(`/patients/${result.patientId}`);
            revalidatePath('/dashboard');
            revalidatePath('/billing');
            revalidatePath('/billing/invoices');
            revalidatePath('/appointments');
          }
          
          return result;
    });
  },
  { module: 'billing', entityType: 'INVOICE' }
);

/**
 * Server Action: Creates a new invoice with line items.
 */
export const createInvoice = wrapAction(
  'INVOICE_CREATE',
  async (data: { 
    patientId: string;
    appointmentId?: string;
    doctorId?: string;
    dueDate?: Date;
    items: {
      description: string;
      quantity: number;
      price: number;
      serviceId?: string;
    }[];
  }) => {
    return withPermission('billing', 'create', async (session) => {
      const tenantId = session.tenantId;
      const validation = InvoiceSchema.safeParse(data);
          if (!validation.success) {
            throw new Error(formatZodError(validation.error));
          }
          
          if (!(await canAccessPatient(data.patientId))) {
            throw new Error("ABAC Denial: You do not have access to this patient.");
          }
          
          const result = await billingService.createInvoice(tenantId, data);
          
          await EventService.trackEvent({
            tenantId,
            eventType: 'INVOICE_CREATED',
            entityType: 'INVOICE',
            entityId: result.id,
            metadata: { patientId: data.patientId, amount: result.totalAmount }
          });
      
          revalidatePath(`/patients/${data.patientId}`);
          revalidatePath('/billing');
          revalidatePath('/billing/invoices');
          
          return result;
    });
  },
  { module: 'billing', entityType: 'INVOICE' }
);

/**
 * Server Action: Records a payment for an invoice.
 */
export const recordPayment = wrapAction(
  'PAYMENT_RECORD',
  async (invoiceId: string, data: {
    amount: number;
    method: PaymentMethod;
    notes?: string;
    paidAt?: Date;
  }) => {
    return withPermission('billing', 'create', async (session) => {
      const tenantId = session.tenantId;
      await requireRecordAccess('invoice', invoiceId);
          
          const validation = PaymentSchema.safeParse(data);
          if (!validation.success) {
            throw new Error(formatZodError(validation.error));
          }
          
          const invoice = await billingRepository.findUnique(tenantId, invoiceId);
      
          if (!invoice) throw new Error("Invoice not found or unauthorized access.");
      
          const result = await billingService.recordPayment(tenantId, invoiceId, data);
      
          await EventService.trackEvent({
            tenantId,
            eventType: 'INVOICE_PAID',
            entityType: 'INVOICE',
            entityId: invoiceId,
            metadata: { amount: data.amount, method: data.method }
          });
      
          revalidatePath(`/patients/${invoice.patientId}`);
          revalidatePath(`/billing`);
          revalidatePath(`/billing/invoices`);
          revalidatePath(`/reports/commissions`);
      
          return {
            ...result,
            amount: result.amount ? Number(result.amount.toString()) : 0
          };
    });
  },
  { module: 'billing', entityType: 'PAYMENT' }
);

/**
 * Server Action: Deletes an invoice.
 */
export const deleteInvoice = wrapAction(
  'INVOICE_DELETE',
  async (patientId: string, invoiceId: string) => {
    return withPermission('billing', 'delete', async (session) => {
      const tenantId = session.tenantId;
      await requireRecordAccess('invoice', invoiceId);
          await billingService.deleteInvoice(tenantId, invoiceId);
      
          await EventService.trackEvent({
            tenantId,
            eventType: 'INVOICE_DELETED',
            entityType: 'INVOICE',
            entityId: invoiceId,
            metadata: { patientId }
          });
          revalidatePath(`/patients/${patientId}`);
          revalidatePath(`/billing`);
          revalidatePath(`/billing/invoices`);
          return { success: true, error: undefined };
    });
  },
  { module: 'billing', entityType: 'INVOICE' }
);


/**
 * Server Action: Fetches all invoices.
 */
export async function getInvoices() {
  try {
    return await withPermission('billing', 'read', async (session) => {
      const tenantId = session.tenantId;
      return await billingService.getInvoicesList(tenantId);
    });
  } catch (error) {
    console.error("[getInvoices] Action failed:", error);
        return [];
  }
}

/**
 * Server Action: Fetches billing stats.
 */
export async function getBillingStats() {
  try {
    return await withPermission('billing', 'read', async (session) => {
      const tenantId = session.tenantId;
      const stats = await billingService.getBillingStats(tenantId);
      
      // Return stats directly as they are already serialized
      return stats;
    });
  } catch (error) {
    console.error("[getBillingStats] Action failed:", error);
        return {
          totalRevenue: 0,
          pendingAmount: 0,
          overdueAmount: 0,
          overdueCount: 0
        };
  }
}

/**
 * Server Action: Fetches a single invoice by ID.
 */
export async function getInvoice(id: string) {
  return withPermission('billing', 'read', async (session) => {
    const tenantId = session.tenantId;
    if (!id) {
        console.error("[getInvoice] Error: No ID provided to action");
        return null;
      }
      try {
        
        
        await requireRecordAccess('invoice', id);
        return await billingService.getInvoiceDetails(tenantId, id);
      } catch (error) {
        console.error(`[getInvoice] Action failed for ID ${id}:`, error);
        return null;
      }
  });
}

export const generateInvoiceFromPlan = wrapAction(
  'INVOICE_GENERATE',
  async (planId: string) => {
    return withPermission('billing', 'create', async (session) => {
      const tenantId = session.tenantId;
      const result = await billingService.generateInvoiceFromPlan(tenantId, planId);
      await EventService.trackEvent({
        tenantId,
        eventType: 'INVOICE_CREATED',
        entityType: 'INVOICE',
        entityId: result.id,
        metadata: { planId, patientId: result.patientId, amount: result.totalAmount }
      });
      if (result && result.patientId) {
        revalidatePath(`/patients/${result.patientId}`);
        revalidatePath('/dashboard');
        revalidatePath('/billing');
        revalidatePath('/billing/invoices');
      }
      return result;
    });
  },
  { module: 'billing', entityType: 'INVOICE' }
);


