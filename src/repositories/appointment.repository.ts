const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/client";

export class AppointmentRepository {
  /**
   * Fetch all appointments for a specific tenant with related patient and doctor info
   */
  async findMany(tenantId: string, params?: {
    where?: Prisma.AppointmentWhereInput;
    select?: Prisma.AppointmentSelect;
    orderBy?: Prisma.AppointmentOrderByWithRelationInput | Prisma.AppointmentOrderByWithRelationInput[];
    skip?: number;
    take?: number;
  }) {
    return await prisma.appointment.findMany({
      ...params,
      where: {
        ...params?.where,
        tenantId
      },
      select: params?.select || {
        id: true,
        date: true,
        time: true,
        status: true,
        treatment: true,
        notes: true,
        patient: {
          select: {
            id: true,
            name: true,
            phone: true
          }
        },
        doctor: {
          select: {
            id: true,
            name: true,
          }
        },
        roomId: true,
        chairId: true,
        invoice: {
          select: {
            id: true,
            status: true,
            totalAmount: true
          }
        }
      },
      orderBy: params?.orderBy || [
        { date: 'asc' },
        { time: 'asc' }
      ],
        take: Math.min(params?.take ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE)
    });
  }

  /**
   * Find a specific appointment by ID within a tenant context
   */
  async findUnique(tenantId: string, id: string) {
    return await prisma.appointment.findUnique({
      where: { id, tenantId },
      select: {
        id: true,
        date: true,
        time: true,
        status: true,
        treatment: true,
        notes: true,
        serviceId: true,
        patientId: true,
        doctorId: true,
        roomId: true,
        chairId: true,
        patient: true,
        doctor: true,
        service: true,
        invoice: {
          select: {
            id: true,
            status: true,
            totalAmount: true,
            paidAmount: true
          }
        }
      }
    });
  }

  /**
   * Create a new appointment
   */
  async create(tenantId: string, data: Omit<Prisma.AppointmentUncheckedCreateInput, 'tenantId'>) {
    return await prisma.appointment.create({
      data: {
        ...data,
        tenantId
      }
    });
  }

  /**
   * Update an appointment status or details
   */
  async update(tenantId: string, id: string, data: Prisma.AppointmentUncheckedUpdateInput) {
    return await prisma.appointment.update({
      where: { id, tenantId },
      data
    });
  }

  /**
   * Delete/Cancel an appointment
   */
  async delete(tenantId: string, id: string) {
    return await prisma.appointment.delete({
      where: { id, tenantId }
    });
  }
}
