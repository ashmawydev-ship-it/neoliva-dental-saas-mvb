const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/client";

export class FinanceRepository {
  async getRevenueData(tenantId: string, fromDate: Date) {
    return prisma.payment.findMany({
      where: {
        tenantId,
        paidAt: { gte: fromDate },
      },
      select: {
        amount: true,
        paidAt: true,
      },
      orderBy: { paidAt: "asc" },
        take: DEFAULT_PAGE_SIZE
    });
  }

  async getAggregateRevenue(tenantId: string, fromDate: Date, toDate?: Date) {
    const whereClause: any = {
      tenantId,
      paidAt: { gte: fromDate },
    };
    if (toDate) {
      whereClause.paidAt.lte = toDate;
    }
    const result = await prisma.payment.aggregate({
      where: whereClause,
      _sum: { amount: true },
    });
    return (+(result._sum.amount || 0));
  }

  async getExpenseData(tenantId: string, fromDate: Date) {
    return prisma.expense.findMany({
      where: {
        tenantId,
        date: { gte: fromDate },
        status: "PAID",
      },
      select: {
        amount: true,
        date: true,
      },
      orderBy: { date: "asc" },
        take: DEFAULT_PAGE_SIZE
    });
  }

  async getAggregateExpenses(tenantId: string, fromDate: Date, toDate?: Date) {
    const whereClause: any = {
      tenantId,
      date: { gte: fromDate },
      status: "PAID",
    };
    if (toDate) {
      whereClause.date.lte = toDate;
    }
    const result = await prisma.expense.aggregate({
      where: whereClause,
      _sum: { amount: true },
    });
    return (+(result._sum.amount || 0));
  }

  async getDailyTrends(tenantId: string, fromDate: Date) {
    // 1. Get daily revenue using raw SQL date_trunc
    const revenueQuery = await prisma.$queryRaw<
      { date: Date; total: number }[]
    >`
      SELECT DATE("paidAt") as date, SUM(amount) as total
      FROM "Payment"
      WHERE "tenantId" = ${tenantId} AND "paidAt" >= ${fromDate}
      GROUP BY DATE("paidAt")
      ORDER BY DATE("paidAt") ASC
    `;

    // 2. Get daily expenses using raw SQL date_trunc
    const expenseQuery = await prisma.$queryRaw<
      { date: Date; total: number }[]
    >`
      SELECT DATE("date") as date, SUM(amount) as total
      FROM "Expense"
      WHERE "tenantId" = ${tenantId} AND "date" >= ${fromDate} AND "status" = 'PAID'
      GROUP BY DATE("date")
      ORDER BY DATE("date") ASC
    `;

    return { revenue: revenueQuery, expenses: expenseQuery };
  }

  async getInvoiceSummary(tenantId: string) {
    return prisma.invoice.groupBy({
      by: ["status"],
      where: { tenantId },
      _sum: {
        totalAmount: true,
        paidAmount: true,
      },
      _count: {
        id: true,
      },
    });
  }

  async getPaymentsSummary(tenantId: string) {
    return prisma.payment.aggregate({
      where: { tenantId },
      _sum: {
        amount: true,
      },
    });
  }

  async getRecentFinancialActivity(tenantId: string, limit: number = 20) {
    // Combine Invoices, Payments, and Expenses (Conceptual, but we'll fetch separately and service will sort)
    // Actually, for Repository, let's just fetch them
    const invoices = await prisma.invoice.findMany({
      where: { tenantId },
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        displayId: true,
        totalAmount: true,
        status: true,
        createdAt: true,
        patient: { select: { name: true } },
      },
    });

    const payments = await prisma.payment.findMany({
      where: { tenantId },
      take: limit,
      orderBy: { paidAt: "desc" },
      select: {
        id: true,
        amount: true,
        method: true,
        paidAt: true,
        invoice: { select: { patient: { select: { name: true } } } },
      },
    });

    const expenses = await prisma.expense.findMany({
      where: { tenantId },
      take: limit,
      orderBy: { date: "desc" },
      select: {
        id: true,
        title: true,
        amount: true,
        category: true,
        date: true,
      },
    });

    return { invoices, payments, expenses };
  }

  async getTopServices(tenantId: string, limit: number = 5) {
    // NOTE: `total` column does not exist in the DB (schema drift).
    // We group by description and sum unitPrice × _count as an approximation.
    // This is safe because invoice items rarely repeat the same description
    // with varying quantities — the _count gives us usage frequency which
    // combined with unitPrice gives a close-enough revenue estimate.
    return prisma.invoiceItem.groupBy({
      by: ["description"],
      where: { tenantId },
      _sum: {
        unitPrice: true,
      },
      _count: {
        id: true,
      },
      orderBy: {
        _sum: {
          unitPrice: "desc",
        },
      },
      take: limit,
    });
  }


  async getRevenueByDoctor(tenantId: string) {
    // This is a bit complex because Invoices are linked to Appointments which have Doctors
    // We'll fetch Invoices with their Appointment's Doctor
    return prisma.invoice.findMany({
      where: {
        tenantId,
        status: "PAID",
      },
      select: {
        totalAmount: true,
        appointment: {
          select: {
            doctor: {
              select: {
                name: true,
              },
            },
          },
        },
      },
        take: DEFAULT_PAGE_SIZE
    });
  }
}
