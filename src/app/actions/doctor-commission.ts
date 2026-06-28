'use server'

import { withPermission } from "@/lib/rbac/guard";
import { revalidatePath } from "next/cache";
import { DoctorCommissionService } from "@/services/doctor-commission.service";
import { StaffService } from "@/services/staff.service";
import { EventService } from "@/services/event.service";
import { wrapAction } from "@/lib/observability/wrap-action";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/client";

const commissionService = new DoctorCommissionService();
const staffService = new StaffService();

/**
 * Server Action: Get commission summary for a specific doctor.
 */
export async function getDoctorCommissionSummaryAction(doctorId: string) {
  try {
    return await withPermission('billing', 'read', async (session) => {
      const tenantId = session.tenantId;
      return await commissionService.getDoctorCommissionSummary(tenantId, doctorId);
    });
  } catch (error) {
    console.error('[getDoctorCommissionSummary] Action failed:', error);
    return {
      doctorId,
      doctorName: 'Unknown',
      commissionRate: 0,
      earned: 0,
      paid: 0,
      pending: 0,
      commissions: [],
    };
  }
}

/**
 * Server Action: Get commission summaries for all doctors.
 */
export async function getAllDoctorsCommissionAction() {
  try {
    return await withPermission('billing', 'read', async (session) => {
      const tenantId = session.tenantId;
      return await commissionService.getAllDoctorsCommissionSummary(tenantId);
    });
  } catch (error) {
    console.error('[getAllDoctorsCommission] Action failed:', error);
    return [];
  }
}

/**
 * Server Action: Pay selected doctor commissions.
 * Creates an expense record and marks commissions as paid.
 */
export const payDoctorCommissionsAction = wrapAction(
  'COMMISSION_PAY',
  async (doctorId: string, commissionIds: string[]) => {
    return withPermission('billing', 'create', async (session) => {
      const tenantId = session.tenantId;
      const result = await commissionService.payCommissions(tenantId, doctorId, commissionIds);

      await EventService.trackEvent({
        tenantId,
        eventType: 'COMMISSION_PAID',
        entityType: 'DOCTOR_COMMISSION',
        entityId: doctorId,
        metadata: {
          paidAmount: result.paidAmount,
          paidCount: result.paidCount,
          expenseId: result.expenseId,
        },
      });

      revalidatePath('/billing');
      revalidatePath('/expenses');
      revalidatePath('/staff');

      return result;
    });
  },
  { module: 'billing', entityType: 'DOCTOR_COMMISSION' }
);

/**
 * Server Action: Update a doctor's commission rate.
 */
export const updateDoctorCommissionRateAction = wrapAction(
  'COMMISSION_RATE_UPDATE',
  async (doctorId: string, rate: number) => {
    return withPermission('staff', 'update', async (session) => {
      const tenantId = session.tenantId;

      if (rate < 0 || rate > 100) {
        throw new Error("Commission rate must be between 0 and 100");
      }

      const updated = await prisma.staff.update({
        where: { id: doctorId, tenantId },
        data: { commissionRate: new Prisma.Decimal(rate) },
        select: { id: true, name: true, commissionRate: true },
      });

      await EventService.trackEvent({
        tenantId,
        eventType: 'COMMISSION_RATE_UPDATED',
        entityType: 'STAFF',
        entityId: doctorId,
        metadata: { newRate: rate },
      });

      revalidatePath('/staff');
      revalidatePath('/billing');

      return JSON.parse(JSON.stringify({
        id: updated.id,
        name: updated.name,
        commissionRate: Number(updated.commissionRate),
      }));
    });
  },
  { module: 'staff', entityType: 'STAFF' }
);
