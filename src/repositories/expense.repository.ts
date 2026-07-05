import { prisma } from "@/lib/prisma";
import { Expense, Prisma } from "@/generated/client";
import { getPagination } from "@/lib/pagination";

export class ExpenseRepository {
  async findMany(tenantId: string, params?: {
    skip?: number;
    take?: number;
    orderBy?: Prisma.ExpenseOrderByWithRelationInput;
    where?: Prisma.ExpenseWhereInput;
  }): Promise<Expense[]> {
    const { take, skip } = getPagination(params);

    return prisma.expense.findMany({
      ...params,
      take,
      skip,
      where: {
        ...params?.where,
        tenantId,
      },
      orderBy: params?.orderBy || { date: 'desc' }
    });
  }

  async findUnique(tenantId: string, id: string): Promise<Expense | null> {
    return prisma.expense.findFirst({
      where: {
        id,
        tenantId,
      },
    });
  }

  async create(tenantId: string, data: Omit<Prisma.ExpenseUncheckedCreateInput, 'tenantId'>): Promise<Expense> {
    return prisma.expense.create({
      data: {
        ...data,
        tenantId
      },
    });
  }

  async update(tenantId: string, id: string, data: Prisma.ExpenseUpdateInput): Promise<Expense> {
    return prisma.expense.update({
      where: {
        id,
        tenantId,
      },
      data,
    });
  }

  async getExpensesStats(tenantId: string) {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalThisMonth, pending, categories] = await Promise.all([
      // Total this month
      prisma.expense.aggregate({
        where: {
          tenantId,
          date: { gte: firstDayOfMonth },
          status: 'PAID'
        },
        _sum: { amount: true }
      }),
      // Pending expenses
      prisma.expense.aggregate({
        where: {
          tenantId,
          status: 'PENDING'
        },
        _sum: { amount: true }
      }),
      // Expenses by category
      prisma.expense.groupBy({
        by: ['category'],
        where: { tenantId },
        _sum: { amount: true },
        orderBy: { _sum: { amount: 'desc' } },
        take: 1
      })
    ]);

    return {
      totalThisMonth: totalThisMonth._sum.amount || 0,
      pendingAmount: pending._sum.amount || 0,
      largestCategory: categories[0]?.category || 'None',
      largestCategoryAmount: categories[0]?._sum.amount || 0
    };
  }

  async delete(tenantId: string, id: string): Promise<Expense> {
    return prisma.expense.delete({
      where: {
        id,
        tenantId,
      },
    });
  }
}
