import { prisma } from "@/lib/prisma";
import { TreatmentPlan, TreatmentPlanItem, Prisma } from "@/generated/client";
import { getPagination } from "@/lib/pagination";

export class TreatmentPlanRepository {
  async findMany(tenantId: string, params?: {
    where?: Prisma.TreatmentPlanWhereInput;
    select?: Prisma.TreatmentPlanSelect;
    orderBy?: Prisma.TreatmentPlanOrderByWithRelationInput;
    take?: number;
    skip?: number;
  }): Promise<any[]> {
    const { take, skip } = getPagination(params);

    return prisma.treatmentPlan.findMany({
      ...params,
      take,
      skip,
      where: {
        ...params?.where,
        tenantId,
      },
    });
  }

  async findById(tenantId: string, id: string, select?: Prisma.TreatmentPlanSelect): Promise<any | null> {
    return prisma.treatmentPlan.findFirst({
      where: {
        id,
        tenantId,
      },
      select
    });
  }

  async create(tenantId: string, data: Omit<Prisma.TreatmentPlanCreateInput, 'tenant'>): Promise<TreatmentPlan> {
    return prisma.treatmentPlan.create({
      data: {
        ...data,
        tenant: { connect: { id: tenantId } },
      },
    });
  }

  async update(tenantId: string, id: string, data: Prisma.TreatmentPlanUpdateInput): Promise<TreatmentPlan> {
    return prisma.treatmentPlan.update({
      where: {
        id,
        tenantId,
      },
      data,
    });
  }

  async delete(tenantId: string, id: string): Promise<TreatmentPlan> {
    return prisma.treatmentPlan.delete({
      where: {
        id,
        tenantId,
      },
    });
  }

  // TreatmentPlanItem operations
  async createItem(tenantId: string, data: Omit<Prisma.TreatmentPlanItemCreateInput, 'tenant'>): Promise<TreatmentPlanItem> {
    return prisma.treatmentPlanItem.create({
      data: {
        ...data,
        tenant: { connect: { id: tenantId } },
      },
    });
  }

  async updateItem(tenantId: string, id: string, data: Prisma.TreatmentPlanItemUpdateInput): Promise<TreatmentPlanItem> {
    return prisma.treatmentPlanItem.update({
      where: {
        id,
        tenantId,
      },
      data,
    });
  }

  async deleteItem(tenantId: string, id: string): Promise<TreatmentPlanItem> {
    return prisma.treatmentPlanItem.delete({
      where: {
        id,
        tenantId,
      },
    });
  }
}
