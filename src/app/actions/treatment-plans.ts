'use server'
import { prisma } from '@/lib/prisma';

import { withPermission } from "@/lib/rbac/guard";


import { revalidatePath } from 'next/cache'
import { TreatmentPlanService } from "@/services/treatment-plan.service";


import { requireRecordAccess } from "@/lib/abac";

import { EventService } from "@/services/event.service";

import { wrapAction } from "@/lib/observability/wrap-action";

import { Prisma } from '@/generated/client';

const parseDecimalToNumber = (val: any): number => {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return val;
  if (typeof val === 'string') return Number(val) || 0;
  if (typeof val === 'object') {
    if (typeof val.toNumber === 'function') return val.toNumber();
    if (val.toString && typeof val.toString === 'function' && val.toString() !== '[object Object]') {
      return Number(val.toString()) || 0;
    }
    try {
      return Number(new Prisma.Decimal(val)) || 0;
    } catch {
      return 0;
    }
  }
  return 0;
};

const treatmentPlanService = new TreatmentPlanService();

/**
 * Server Action: Fetches all treatment plans for a patient.
 */
export async function getTreatmentPlans(patientId: string) {
  try {
    return await withPermission('clinical', 'read', async (session) => {
      const tenantId = session.tenantId;
      await requireRecordAccess('patient', patientId);
          
          const data = await treatmentPlanService.getTreatmentPlans(tenantId, patientId);
      
          return data.map((plan) => {

            const phases = (plan.items || [])
              .sort((a, b) => (a.step || 0) - (b.step || 0))
              .map((item) => ({
                id: item.id,
                step: item.step || 1,
                name: item.serviceName,
                serviceId: item.serviceId,
                doctorId: item.doctorId,
                doctorName: item.doctor?.name || null,
                toothList: item.toothList ? item.toothList.split(',') : [],
                status: item.status || 'Planned',
                date: item.scheduledDate ? new Date(item.scheduledDate).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : 'TBD',
                price: parseDecimalToNumber(item.price),
                notes: item.notes || ''
              }));
      
            const totalCost = phases.reduce((sum: number, p: any) => sum + p.price, 0);
      
            return {
              id: plan.id,
              title: plan.title,
              status: plan.status || 'Active',
              progress: 0, // Will be calculated in the component
              cost: totalCost,
              created: plan.createdAt ? new Date(plan.createdAt).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : '—',
              notes: plan.notes || '',
              invoices: (plan.invoices || []).map((inv: any) => ({
                ...inv,
                totalAmount: parseDecimalToNumber(inv.totalAmount),
                paidAmount: parseDecimalToNumber(inv.paidAmount),
                items: (inv.items || []).map((item: any) => ({
                  ...item,
                  price: parseDecimalToNumber(item.price),
                  discount: parseDecimalToNumber(item.discount),
                  total: parseDecimalToNumber(item.total),
                })),
                payments: (inv.payments || []).map((p: any) => ({
                  ...p,
                  amount: parseDecimalToNumber(p.amount),
                }))
              })),
              phases
            }
          });
    });
  } catch (error) {
    console.error('Error fetching treatment plans:', error);
        return [];
  }
}

/**
 * Server Action: Creates a new treatment plan.
 */
export const createTreatmentPlan = wrapAction(
  'TREATMENT_PLAN_CREATE',
  async (patientId: string, planData: any) => {
    return withPermission('clinical', 'create', async (session) => {
      const tenantId = session.tenantId;
      await requireRecordAccess('patient', patientId);
          
          const plan = await treatmentPlanService.createTreatmentPlan(tenantId, patientId, planData);
      
          await EventService.trackEvent({
            tenantId,
            eventType: 'TREATMENT_PLAN_CREATED',
            entityType: 'TREATMENT',
            entityId: plan.id,
            metadata: { patientId, title: plan.title }
          });
      
          revalidatePath(`/patients/${patientId}`);
          return plan;
    });
  },
  { module: 'clinical', entityType: 'TREATMENT_PLAN' }
);

/**
 * Server Action: Deletes a treatment plan.
 */
export const deleteTreatmentPlan = wrapAction(
  'TREATMENT_PLAN_DELETE',
  async (planId: string, patientId: string) => {
    return withPermission('clinical', 'delete', async (session) => {
      const tenantId = session.tenantId;
      await requireRecordAccess('patient', patientId);
          
          await treatmentPlanService.deleteTreatmentPlan(tenantId, planId);
          
          await EventService.trackEvent({
            tenantId,
            eventType: 'TREATMENT_PLAN_DELETED',
            entityType: 'TREATMENT',
            entityId: planId,
            metadata: { patientId }
          });
      
          revalidatePath(`/patients/${patientId}`);
          return { success: true, error: undefined };
    });
  },
  { module: 'clinical', entityType: 'TREATMENT_PLAN' }
);

/**
 * Server Action: Updates treatment plan status.
 */
export const updatePlanStatus = wrapAction(
  'TREATMENT_PLAN_STATUS_UPDATE',
  async (planId: string, status: string, patientId: string) => {
    return withPermission('clinical', 'update', async (session) => {
      const tenantId = session.tenantId;
      await requireRecordAccess('patient', patientId);
          
          await treatmentPlanService.updatePlanStatus(tenantId, planId, status);
      
          await EventService.trackEvent({
            tenantId,
            eventType: 'TREATMENT_PLAN_STATUS_CHANGED',
            entityType: 'TREATMENT',
            entityId: planId,
            metadata: { status, patientId }
          });
      
          revalidatePath(`/patients/${patientId}`);
          return { success: true, error: undefined };
    });
  },
  { module: 'clinical', entityType: 'TREATMENT_PLAN' }
);

/**
 * Server Action: Adds a phase to a treatment plan.
 */
export const addTreatmentPhase = wrapAction(
  'TREATMENT_PHASE_ADD',
  async (planId: string, phaseData: any, step: number, patientId: string) => {
    return withPermission('clinical', 'create', async (session) => {
      const tenantId = session.tenantId;
      await requireRecordAccess('patient', patientId);
          
          await treatmentPlanService.addTreatmentPhase(tenantId, planId, phaseData, step);
      
          await EventService.trackEvent({
            tenantId,
            eventType: 'TREATMENT_PLAN_STATUS_CHANGED',
            entityType: 'TREATMENT',
            entityId: planId,
            metadata: { patientId, action: 'PHASE_ADDED', serviceName: phaseData.serviceName }
          });
      
          revalidatePath(`/patients/${patientId}`);
          return { success: true, error: undefined };
    });
  },
  { module: 'clinical', entityType: 'TREATMENT_PHASE' }
);

/**
 * Server Action: Updates a treatment phase status.
 */
export const updatePhaseStatus = wrapAction(
  'TREATMENT_PHASE_STATUS_UPDATE',
  async (phaseId: string, status: string, patientId: string) => {
    return withPermission('clinical', 'update', async (session) => {
      const tenantId = session.tenantId;
      await requireRecordAccess('patient', patientId);
          
          await treatmentPlanService.updatePhaseStatus(tenantId, phaseId, status);
      
          let eventType: any = 'TREATMENT_UPDATED';
          if (status === 'In Progress') eventType = 'TREATMENT_STARTED';
          if (status === 'Completed') eventType = 'TREATMENT_COMPLETED';
      
          await EventService.trackEvent({
            tenantId,
            eventType,
            entityType: 'TREATMENT',
            entityId: phaseId,
            metadata: { status, patientId }
          });
      
          revalidatePath(`/patients/${patientId}`);
          return { success: true, error: undefined };
    });
  },
  { module: 'clinical', entityType: 'TREATMENT_PHASE' }
);

/**
 * Server Action: Deletes a treatment phase.
 */
export const deleteTreatmentPhase = wrapAction(
  'TREATMENT_PHASE_DELETE',
  async (phaseId: string, patientId: string) => {
    return withPermission('clinical', 'delete', async (session) => {
      const tenantId = session.tenantId;
      await requireRecordAccess('patient', patientId);
          
          await treatmentPlanService.deleteTreatmentPhase(tenantId, phaseId);
      
          await EventService.trackEvent({
            tenantId,
            eventType: 'TREATMENT_PLAN_STATUS_CHANGED',
            entityType: 'TREATMENT',
            entityId: phaseId,
            metadata: { patientId, action: 'PHASE_DELETED' }
          });
      
          revalidatePath(`/patients/${patientId}`);
          return { success: true, error: undefined };
    });
  },
  { module: 'clinical', entityType: 'TREATMENT_PHASE' }
);








/**
 * Server Action: Fetches all doctors for the UI dropdown.
 */
export async function getDoctors() {
  try {
    return await withPermission('clinical', 'read', async (session) => {
      const tenantId = session.tenantId;
      const doctors = await prisma.staff.findMany({
        where: { tenantId, role: 'DOCTOR' },
        select: { id: true, name: true }
      });
      return doctors;
    });
  } catch (error) {
    console.error('Error fetching doctors:', error);
    return [];
  }
}
