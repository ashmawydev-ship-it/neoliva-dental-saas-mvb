const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/client";

export class PrescriptionRepository {
  async findMany(tenantId: string, patientId: string) {
    return prisma.prescription.findMany({
      where: {
        tenantId,
        patientId,
      },
      include: {
        items: true,
        doctor: { select: { id: true, name: true } },
      },
      orderBy: {
        createdAt: 'desc',
      },
        take: DEFAULT_PAGE_SIZE
    });
  }

  async findUnique(tenantId: string, id: string) {
    return prisma.prescription.findUnique({
      where: {
        id,
        tenantId,
      },
      include: {
        items: true,
      },
    });
  }

  async create(tenantId: string, patientId: string, data: {
    notes?: string;
    doctorName?: string;
    doctorId?: string;
    items: {
      medicationName: string;
      dosage?: string;
      frequency?: string;
      duration?: string;
    }[];
  }) {
    return prisma.prescription.create({
      data: {
        tenantId,
        patientId,
        notes: data.notes,
        doctorName: data.doctorName,
        doctorId: data.doctorId,
        items: {
          create: data.items.map(item => ({
            ...item,
            tenantId,
          })),
        },
      },
      include: {
        items: true,
      },
    });
  }

  async delete(tenantId: string, id: string) {
    return prisma.$transaction(async (tx) => {
      await tx.prescriptionItem.deleteMany({
        where: {
          prescriptionId: id,
          tenantId,
        },
      });

      return tx.prescription.delete({
        where: {
          id,
          tenantId,
        },
      });
    });
  }
}
