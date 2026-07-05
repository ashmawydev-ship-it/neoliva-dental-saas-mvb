import { prisma } from "@/lib/prisma";
import { Service, Prisma } from "@/generated/client";
import { getPagination } from "@/lib/pagination";

export class ServiceRepository {
  async findMany(tenantId: string, params?: {
    skip?: number;
    take?: number;
    orderBy?: Prisma.ServiceOrderByWithRelationInput;
    select?: Prisma.ServiceSelect;
  }): Promise<any[]> {
    const { take, skip } = getPagination(params);

    return prisma.service.findMany({
      ...params,
      take,
      skip,
      where: {
        tenantId,
        isActive: true,
      },
    });
  }

  async findById(tenantId: string, id: string): Promise<Service | null> {
    return prisma.service.findFirst({
      where: {
        id,
        tenantId,
      },
    });
  }

  async create(tenantId: string, data: Omit<Prisma.ServiceCreateInput, 'tenant'>): Promise<Service> {
    return prisma.service.create({
      data: {
        ...data,
        tenant: { connect: { id: tenantId } },
      },
    });
  }

  async update(tenantId: string, id: string, data: Prisma.ServiceUpdateInput): Promise<Service> {
    return prisma.service.update({
      where: {
        id,
        tenantId,
      },
      data,
    });
  }

  async softDelete(tenantId: string, id: string): Promise<Service> {
    return prisma.service.update({
      where: {
        id,
        tenantId,
      },
      data: {
        isActive: false,
      },
    });
  }
}
