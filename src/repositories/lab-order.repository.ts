import { prisma } from "@/lib/prisma";
import { LabOrder, LabOrderStatus, Prisma } from "@/generated/client";
import { getPagination } from "@/lib/pagination";

export class LabOrderRepository {
  async findMany(tenantId: string, params?: {
    skip?: number;
    take?: number;
    select?: Prisma.LabOrderSelect;
    orderBy?: Prisma.LabOrderOrderByWithRelationInput;
    where?: Prisma.LabOrderWhereInput;
  }): Promise<any[]> {
    const { take, skip } = getPagination(params);

    return prisma.labOrder.findMany({
      ...params,
      take,
      skip,
      where: {
        ...params?.where,
        tenantId,
      },
      select: params?.select || {
        id: true,
        displayId: true,
        labName: true,
        itemType: true,
        toothNumber: true,
        status: true,
        cost: true,
        dueDate: true,
        patient: {
          select: {
            name: true,
            displayId: true
          }
        },
      }
    });
  }

  async findUnique(tenantId: string, id: string): Promise<any | null> {
    return prisma.labOrder.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        patient: { select: { name: true, displayId: true } },
        appointment: { select: { id: true, date: true } }
      }
    });
  }

  async create(tenantId: string, data: Omit<Prisma.LabOrderUncheckedCreateInput, 'tenantId'>): Promise<LabOrder> {
    return prisma.labOrder.create({
      data: {
        ...data,
        tenantId
      },
    });
  }

  async update(tenantId: string, id: string, data: Prisma.LabOrderUpdateInput): Promise<LabOrder> {
    return prisma.labOrder.update({
      where: {
        id,
        tenantId,
      },
      data,
    });
  }

  async updateStatus(tenantId: string, id: string, status: LabOrderStatus): Promise<LabOrder> {
    const updateData: any = { status };
    
    if (status === 'SENT') {
      updateData.sentAt = new Date();
    } else if (status === 'RECEIVED') {
      updateData.receivedAt = new Date();
    }

    return prisma.labOrder.update({
      where: {
        id,
        tenantId,
      },
      data: updateData,
    });
  }

  async delete(tenantId: string, id: string): Promise<LabOrder> {
    return prisma.labOrder.delete({
      where: {
        id,
        tenantId,
      },
    });
  }

  async getStats(tenantId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfWeek = new Date();
    endOfWeek.setDate(now.getDate() + 7);

    const [activeCount, dueThisWeekCount, receivedCount, costSum] = await Promise.all([
      prisma.labOrder.count({
        where: {
          tenantId,
          status: { in: ['SENT', 'IN_PROGRESS'] }
        }
      }),
      prisma.labOrder.count({
        where: {
          tenantId,
          dueDate: {
            gte: now,
            lte: endOfWeek
          }
        }
      }),
      prisma.labOrder.count({
        where: {
          tenantId,
          status: 'RECEIVED'
        }
      }),
      prisma.labOrder.aggregate({
        where: {
          tenantId,
          createdAt: { gte: startOfMonth }
        },
        _sum: {
          cost: true
        }
      })
    ]);

    return {
      activeCases: activeCount,
      dueThisWeek: dueThisWeekCount,
      received: receivedCount,
      monthlyCost: (+(costSum._sum.cost || 0))
    };
  }
}
