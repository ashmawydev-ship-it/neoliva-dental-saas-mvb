import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/client";
import { getPagination } from "@/lib/pagination";

export class TenantRepository {
  async findMany(params?: { skip?: number; take?: number }) {
    const { take, skip } = getPagination(params, 100);
    return prisma.tenant.findMany({
      take,
      skip,
      include: {
        _count: {
          select: { staff: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async findUnique(id: string) {
    return prisma.tenant.findUnique({
      where: { id }
    });
  }

  async update(id: string, data: Prisma.TenantUpdateInput) {
    return prisma.tenant.update({
      where: { id },
      data
    });
  }
}
