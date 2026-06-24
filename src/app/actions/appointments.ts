'use server'

import { withPermission } from "@/lib/rbac/guard";


import { revalidatePath } from 'next/cache'
import { appointmentService } from "@/config/di";


import { requireRecordAccess } from "@/lib/abac";

import { EventService } from "@/services/event.service";

import { wrapAction } from "@/lib/observability/wrap-action";
import { AppointmentSchema, formatZodError } from "@/lib/validations/schemas";


export async function getAppointmentsData() {
  try {
    return await withPermission('appointments', 'read', async (session) => {
      const tenantId = session.tenantId;
      return await appointmentService.getAppointmentsData(tenantId);
    });
  } catch (error) {
    console.error('Error fetching appointments data:', error);
        return { list: [], stats: { totalToday: 0, completed: 0, inProgress: 0, cancelled: 0 } };
  }
}

export async function getAppointmentFormData() {
  try {
    return await withPermission('appointments', 'read', async (session) => {
      const tenantId = session.tenantId;
      return await appointmentService.getAppointmentFormData(tenantId);
    });
  } catch (error) {
    console.error('Error fetching appointment form data:', error);
        return { doctors: [], services: [] };
  }
}

export const createAppointment = wrapAction(
  'APPOINTMENT_CREATE',
  async (data: any) => {
    return withPermission('appointments', 'create', async (session) => {
      const tenantId = session.tenantId;
      const validation = AppointmentSchema.safeParse(data);
          if (!validation.success) {
            throw new Error(formatZodError(validation.error));
          }
          
          const created = await appointmentService.createAppointment(tenantId, data);
      
          await EventService.trackEvent({
            tenantId,
            eventType: 'APPOINTMENT_SCHEDULED',
            entityType: 'APPOINTMENT',
            entityId: created.id,
            metadata: { 
              patientId: created.patientId, 
              doctorId: created.doctorId,
              serviceId: created.serviceId,
              date: created.date 
            }
          });
      
          revalidatePath('/appointments');
          revalidatePath('/dashboard');
          return created;
    });
  },
  { module: 'appointments', entityType: 'APPOINTMENT' }
);

export const updateAppointmentStatus = wrapAction(
  'APPOINTMENT_STATUS_UPDATE',
  async (id: string, status: any) => {
    return withPermission('appointments', 'update', async (session) => {
      const tenantId = session.tenantId;
      await requireRecordAccess('appointment', id);
          const updated = await appointmentService.updateStatus(tenantId, id, status);
          
          await EventService.trackEvent({
            tenantId,
            eventType: status === 'COMPLETED' ? 'APPOINTMENT_COMPLETED' : 'APPOINTMENT_STATUS_CHANGED',
            entityType: 'APPOINTMENT',
            entityId: id,
            metadata: { status }
          });
      
          revalidatePath('/appointments');
          revalidatePath('/dashboard');
          return updated;
    });
  },
  { module: 'appointments', entityType: 'APPOINTMENT' }
);

export const cancelAppointment = wrapAction(
  'APPOINTMENT_CANCEL',
  async (id: string) => {
    return withPermission('appointments', 'update', async (session) => {
      const tenantId = session.tenantId;
      await requireRecordAccess('appointment', id);
          const result = await appointmentService.cancelAppointment(tenantId, id);
          
          await EventService.trackEvent({
            tenantId,
            eventType: 'APPOINTMENT_CANCELLED',
            entityType: 'APPOINTMENT',
            entityId: id,
          });
      
          revalidatePath('/appointments');
          revalidatePath('/dashboard');
          return result;
    });
  },
  { module: 'appointments', entityType: 'APPOINTMENT' }
);

